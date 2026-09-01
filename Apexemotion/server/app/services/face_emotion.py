
import logging
import os
from typing import Any

import aiohttp
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

PIXICULAR_API_KEY = os.getenv("PIXICULAR_API_KEY", "").strip()
PIXICULAR_API_URL = os.getenv("PIXICULAR_API_URL", "https://api.pixicular.com/v1/detect").strip()
FACE_EMOTION_TIMEOUT_SECONDS = float(os.getenv("FACE_EMOTION_TIMEOUT_SECONDS", "12"))
FACE_EMOTION_MAX_BYTES = int(os.getenv("FACE_EMOTION_MAX_BYTES", str(4 * 1024 * 1024)))

APEX_EMOTIONS = (
    "anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"
)

LABEL_MAP = {
    "happy": "joy",
    "sad": "sadness",
    "angry": "anger",
    "surprised": "surprise",
    "neutral": "neutral",
    "disgusted": "disgust",
    "fearful": "fear",
        "calm": "neutral",
    "fear": "fear",
    "joy": "joy",
    "sadness": "sadness",
    "anger": "anger",
    "disgust": "disgust",
    "surprise": "surprise",
}

class FaceEmotionError(Exception):
    pass

class FaceEmotionConfigurationError(FaceEmotionError):
    pass

class FaceEmotionUnavailable(FaceEmotionError):
    pass

class FaceImageValidationError(FaceEmotionError):
    pass

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

def validate_image(image: bytes, content_type: str | None, filename: str | None) -> None:
    if not image:
        raise FaceImageValidationError("No camera frame received.")
    if len(image) > FACE_EMOTION_MAX_BYTES:
        raise FaceImageValidationError("Camera frame is too large.")
    ct = (content_type or "").split(";")[0].strip().lower()
    suffix = (filename or "").lower().rsplit(".", 1)[-1] if "." in (filename or "") else ""
    if ct not in ALLOWED_TYPES and suffix not in {"jpg", "jpeg", "png", "webp"}:
        raise FaceImageValidationError("Unsupported image format.")

def _normalise_scores(raw_scores: Any) -> dict[str, float]:
    scores = {emotion: 0.0 for emotion in APEX_EMOTIONS}
    if not isinstance(raw_scores, dict):
        return scores
    for label, value in raw_scores.items():
        if not isinstance(value, (int, float)):
            continue
        normalized = LABEL_MAP.get(str(label).strip().lower())
        if normalized:
            scores[normalized] = max(scores[normalized], max(0.0, min(1.0, float(value))))
    total = sum(scores.values())
    if total > 0 and abs(total - 1.0) > 0.03:
        scores = {k: v / total for k, v in scores.items()}
    return scores

async def detect_face_emotion(image: bytes, content_type: str | None, filename: str | None) -> dict[str, Any]:
    validate_image(image, content_type, filename)
    if not PIXICULAR_API_KEY:
        raise FaceEmotionConfigurationError("Facial emotion API key is not configured.")

    ct = (content_type or "image/jpeg").split(";")[0].strip().lower()
    upload_name = filename or "face-frame.jpg"
    form = aiohttp.FormData()
    form.add_field("file", image, filename=upload_name, content_type=ct)
    form.add_field("services", "detect-face-emotions")

    timeout = aiohttp.ClientTimeout(total=FACE_EMOTION_TIMEOUT_SECONDS)
    headers = {"Authorization": f"Bearer {PIXICULAR_API_KEY}"}

    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(PIXICULAR_API_URL, headers=headers, data=form) as response:
                try:
                    payload = await response.json(content_type=None)
                except Exception:
                    payload = {"message": (await response.text())[:500]}

                if response.status == 401:
                    raise FaceEmotionConfigurationError("Facial emotion API authentication failed.")
                if response.status == 429:
                    raise FaceEmotionUnavailable("Facial emotion API quota or rate limit reached.")
                if response.status >= 500:
                    raise FaceEmotionUnavailable("Facial emotion provider is temporarily unavailable.")
                if response.status >= 400:
                    message = payload.get("message", "Facial emotion provider rejected the frame.")
                    raise FaceEmotionUnavailable(str(message))

    except FaceEmotionError:
        raise
    except (aiohttp.ClientError, TimeoutError) as exc:
        raise FaceEmotionUnavailable("Facial emotion provider request failed or timed out.") from exc

    service = payload.get("services", {}).get("detect-face-emotions", {})
    faces = service.get("faces", []) if isinstance(service, dict) else []
    if not isinstance(faces, list):
        raise FaceEmotionUnavailable("Invalid facial emotion provider response.")

    if len(faces) == 0:
        return {"face_count": 0, "emotion": None, "confidence": None, "scores": {}, "provider": "pixicular"}

    if len(faces) > 1:
        return {
            "face_count": len(faces),
            "emotion": None,
            "confidence": None,
            "scores": {},
            "provider": "pixicular",
            "multiple_faces": True,
        }

    face = faces[0]
    if not isinstance(face, dict):
        raise FaceEmotionUnavailable("Facial emotion provider returned an invalid face result.")

    # Current Pixicular v1 response uses an emotions array:
    # [{"type": "HAPPY", "confidence": 97.2}, ...]
    raw_emotions = face.get("emotions", [])
    if not isinstance(raw_emotions, list):
        raw_emotions = []

    raw_scores = {}
    top_label = None
    top_confidence = None
    for item in raw_emotions:
        if not isinstance(item, dict):
            continue
        label = str(item.get("type", "")).strip().lower()
        value = item.get("confidence")
        if not label or not isinstance(value, (int, float)):
            continue
        # Pixicular documents confidence as a percentage (e.g. 97.2).
        score = max(0.0, min(1.0, float(value) / 100.0))
        raw_scores[label] = score
        if top_confidence is None or score > top_confidence:
            top_confidence = score
            top_label = label

    if not raw_scores or not top_label:
        # Also tolerate the alternate face schema documented on the
        # face-emotion product page.
        top_label = str(face.get("emotion", "")).strip().lower()
        if top_label:
            raw_scores = face.get("scores", {}) if isinstance(face.get("scores"), dict) else {}
            top_confidence = face.get("confidence")
            if isinstance(top_confidence, (int, float)) and float(top_confidence) > 1:
                top_confidence = float(top_confidence) / 100.0

    emotion = LABEL_MAP.get(top_label)
    if not emotion:
        raise FaceEmotionUnavailable(f"Unsupported facial emotion label: {top_label}")

    scores = _normalise_scores(raw_scores)
    confidence = top_confidence if isinstance(top_confidence, (int, float)) else scores.get(emotion, 0.0)
    confidence = max(0.0, min(1.0, float(confidence)))

    bbox = face.get("boundingBox")

    return {
        "face_count": 1,
        "emotion": emotion,
        "confidence": confidence,
        "scores": scores,
        "provider": "pixicular",
        "bounding_box": bbox if isinstance(bbox, dict) else None,
        "multiple_faces": False,
    }
