import logging
import os
import tempfile
from pathlib import Path
from typing import Any

import cv2

from app.services.face_emotion import detect_face_emotion, FaceEmotionError

logger = logging.getLogger(__name__)

MAX_VIDEO_BYTES = int(os.getenv("VIDEO_EMOTION_MAX_BYTES", str(50 * 1024 * 1024)))
MAX_VIDEO_DURATION_SECONDS = float(os.getenv("VIDEO_EMOTION_MAX_DURATION_SECONDS", "60"))
VIDEO_SAMPLE_INTERVAL_SECONDS = float(os.getenv("VIDEO_EMOTION_SAMPLE_INTERVAL_SECONDS", "2"))
MAX_VIDEO_ANALYSIS_FRAMES = int(os.getenv("MAX_VIDEO_ANALYSIS_FRAMES", "30"))
MIN_VALID_EMOTION_FRAMES = int(os.getenv("MIN_VALID_EMOTION_FRAMES", "2"))
VIDEO_MAX_RESOLUTION = int(os.getenv("VIDEO_EMOTION_MAX_RESOLUTION", "1280"))

ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/webm", "video/quicktime",
    "video/x-matroska", "video/ogg",
}
ALLOWED_EXTENSIONS = {"mp4", "webm", "mov", "mkv", "ogv"}

class VideoEmotionError(Exception): pass
class VideoValidationError(VideoEmotionError): pass
class VideoProcessingError(VideoEmotionError): pass

def _validate_video(data: bytes, content_type: str | None, filename: str | None):
    if not data:
        raise VideoValidationError("No video file received.")
    if len(data) > MAX_VIDEO_BYTES:
        raise VideoValidationError("Video exceeds the maximum allowed size of 50 MB.")
    ct=(content_type or "").split(";")[0].strip().lower()
    ext=(filename or "").lower().rsplit(".",1)[-1] if "." in (filename or "") else ""
    if ct not in ALLOWED_VIDEO_TYPES and ext not in ALLOWED_EXTENSIONS:
        raise VideoValidationError("Unsupported video format. Use MP4, WebM, MOV, MKV, or OGV.")

def _aggregate(results):
    """Aggregate actual frame-level predictions using confidence-weighted voting."""
    if not results:
        return None, 0.0

    totals = {}
    for item in results:
        label = str(item.get("emotion") or "").strip().lower()
        confidence = float(item.get("confidence") or 0.0)
        if not label:
            continue
        totals[label] = totals.get(label, 0.0) + confidence

    if not totals:
        return None, 0.0

    dominant = max(totals, key=totals.get)

    # Overall confidence is the mean confidence of frames supporting
    # the selected dominant emotion. It is never the last-frame confidence.
    supporting = [
        float(r.get("confidence") or 0.0)
        for r in results
        if r.get("emotion") == dominant
    ]
    confidence = sum(supporting) / len(supporting) if supporting else 0.0
    return dominant, confidence

async def analyze_video(data: bytes, content_type: str | None, filename: str | None) -> dict[str, Any]:
    _validate_video(data, content_type, filename)
    suffix=Path(filename or "upload.mp4").suffix.lower() or ".mp4"
    temp_path=None
    cap=None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(data)
            temp_path=f.name

        cap=cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            raise VideoProcessingError("Unable to read this video.")

        fps=float(cap.get(cv2.CAP_PROP_FPS) or 0)
        frame_count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        width=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        duration=(frame_count/fps) if fps > 0 and frame_count > 0 else 0.0
        if duration <= 0:
            duration=float(cap.get(cv2.CAP_PROP_POS_MSEC) or 0)/1000.0
        if duration <= 0:
            raise VideoProcessingError("Could not determine video duration.")
        if duration > MAX_VIDEO_DURATION_SECONDS:
            raise VideoValidationError("Video exceeds the maximum supported duration of 60 seconds.")
        if width <= 0 or height <= 0:
            raise VideoProcessingError("Video has invalid dimensions.")

        # Sequential sampling is more reliable than CAP_PROP_POS_MSEC seeking,
        # especially for WebM/MOV codecs and browser-recorded videos.
        interval = max(0.25, VIDEO_SAMPLE_INTERVAL_SECONDS)
        sample_times = []
        t = 0.0
        while t < duration and len(sample_times) < MAX_VIDEO_ANALYSIS_FRAMES:
            sample_times.append(t)
            t += interval
        if not sample_times:
            sample_times = [0.0]

        target_frames = []
        for ts in sample_times:
            target_frames.append(min(frame_count - 1, max(0, int(round(ts * fps)))))
        target_frames = sorted(set(target_frames))

        results = []
        skipped = 0
        no_face = 0
        multiple_faces = 0
        decode_failures = 0
        provider_failures = 0
        next_target_index = 0
        current_frame = 0

        while next_target_index < len(target_frames):
            ok, frame = cap.read()
            if not ok or frame is None:
                decode_failures += 1
                break

            target = target_frames[next_target_index]
            if current_frame < target:
                current_frame += 1
                continue

            ts = current_frame / fps if fps > 0 else sample_times[next_target_index]

            # Keep payloads modest while preserving enough facial detail.
            h, w = frame.shape[:2]
            scale = min(1.0, VIDEO_MAX_RESOLUTION / max(w, h))
            if scale < 1.0:
                frame = cv2.resize(
                    frame,
                    (max(1, int(w * scale)), max(1, int(h * scale))),
                    interpolation=cv2.INTER_AREA,
                )

            ok, encoded = cv2.imencode(
                ".jpg",
                frame,
                [int(cv2.IMWRITE_JPEG_QUALITY), 85],
            )
            if not ok:
                skipped += 1
                next_target_index += 1
                current_frame += 1
                continue

            try:
                result = await detect_face_emotion(
                    encoded.tobytes(),
                    "image/jpeg",
                    "video-frame.jpg",
                )
            except FaceEmotionError as exc:
                provider_failures += 1
                logger.warning(
                    "Video frame provider failure at %.2fs: %s",
                    ts,
                    exc,
                )
                next_target_index += 1
                current_frame += 1
                continue

            face_count = int(result.get("face_count") or 0)
            if face_count == 0:
                no_face += 1
                skipped += 1
            elif result.get("multiple_faces") or face_count > 1:
                multiple_faces += 1
                skipped += 1
            elif not result.get("emotion"):
                skipped += 1
            else:
                results.append(
                    {
                        "timestamp": round(ts, 2),
                        "emotion": result["emotion"],
                        "confidence": float(result["confidence"]),
                    }
                )

            next_target_index += 1
            current_frame += 1

        logger.info(
            "Video sampling complete: sampled=%d analyzed=%d skipped=%d "
            "no_face=%d multiple_faces=%d decode_failures=%d provider_failures=%d",
            len(sample_times),
            len(results),
            skipped,
            no_face,
            multiple_faces,
            decode_failures,
            provider_failures,
        )

        if len(results) < MIN_VALID_EMOTION_FRAMES:
            if provider_failures == len(sample_times):
                raise VideoProcessingError(
                    "Facial emotion service could not analyze the sampled video frames."
                )
            if no_face == len(sample_times):
                raise VideoProcessingError(
                    "No face was detected in the sampled video frames."
                )
            raise VideoProcessingError(
                "Not enough valid facial data to determine an overall emotion."
            )

        dominant, confidence=_aggregate(results)
        return {
            "status":"completed",
            "duration":round(duration,2),
            "frames_sampled":len(sample_times),
            "frames_analyzed":len(results),
            "frames_skipped":skipped,
            "dominant_emotion":dominant,
            "confidence":round(confidence,4),
            "timeline":results,
            "provider":"pixicular",
            "sampling_interval_seconds":interval,
        }
    finally:
        if cap is not None:
            cap.release()
        if temp_path:
            try: os.remove(temp_path)
            except OSError: pass
