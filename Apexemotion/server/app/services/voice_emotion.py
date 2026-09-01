import logging
import os
import uuid
from typing import Any

import aiohttp

logger = logging.getLogger(__name__)

PRIMARY_PROVIDER = os.getenv("VOICE_PRIMARY_PROVIDER", "gender_recognition").strip().lower()
FALLBACK_PROVIDER = os.getenv("VOICE_FALLBACK_PROVIDER", "oruk").strip().lower()

GENDER_API_URL = os.getenv(
    "GENDER_RECOGNITION_API_URL",
    "https://api.genderrecognition.com/v1/speech-emotion/api",
).strip()
GENDER_API_KEY = os.getenv("GENDER_RECOGNITION_API_KEY", "").strip()

ORUK_API_URL = os.getenv(
    "ORUK_API_URL",
    "https://speech-api.oruk.ai/v1/audio/emotions",
).strip()
ORUK_API_KEY = os.getenv("ORUK_API_KEY", "").strip()
ORUK_MODEL = os.getenv("ORUK_MODEL", "oruk-spectra-1").strip()

TIMEOUT_SECONDS = float(os.getenv("VOICE_EMOTION_TIMEOUT_SECONDS", "10"))
MAX_BYTES = int(os.getenv("VOICE_EMOTION_MAX_BYTES", str(10 * 1024 * 1024)))
MAX_DURATION_SECONDS = float(os.getenv("VOICE_EMOTION_MAX_DURATION_SECONDS", "15"))

LABEL_MAP = {
    "happy": "joy",
    "excited": "joy",
    "hopeful": "joy",
    "proud": "joy",
    "relieved": "joy",
    "sad": "sadness",
    "disappointed": "sadness",
    "worried": "fear",
    "scared": "fear",
    "angry": "anger",
    "frustrated": "anger",
    "disgusted": "disgust",
    "surprised": "surprise",
    "neutral": "neutral",
}

ALLOWED_CONTENT_TYPES = {
    "audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg",
    "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/ogg",
    "audio/webm", "audio/flac", "audio/aac", "audio/opus",
    "audio/x-aiff", "audio/aiff", "audio/amr", "audio/3gpp",
}

class VoiceEmotionError(Exception):
    pass

class ProviderUnavailable(VoiceEmotionError):
    pass

class ProviderConfigurationError(VoiceEmotionError):
    pass

class AudioValidationError(VoiceEmotionError):
    pass


def validate_audio(audio: bytes, content_type: str | None, filename: str | None) -> None:
    if not audio:
        raise AudioValidationError("No audio recorded.")
    if len(audio) > MAX_BYTES:
        raise AudioValidationError("Audio recording is too large.")
    normalized_type = (content_type or "").split(";")[0].strip().lower()
    suffix = (filename or "").lower()
    known_suffix = any(suffix.endswith(ext) for ext in (
        ".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac", ".aac", ".opus", ".aiff", ".amr", ".3gp"
    ))
    if normalized_type and normalized_type not in ALLOWED_CONTENT_TYPES and not known_suffix:
        raise AudioValidationError("Unsupported audio format.")


def _normalized_result(label: str, confidence: float, scores: dict[str, float], provider: str, fallback_used: bool) -> dict[str, Any]:
    label = LABEL_MAP.get(label.strip().lower(), label.strip().lower() or "neutral")
    confidence = max(0.0, min(1.0, float(confidence)))
    clean_scores = {k: max(0.0, min(1.0, float(v))) for k, v in scores.items() if isinstance(v, (int, float))}
    if label not in clean_scores:
        clean_scores[label] = confidence
    return {
        "emotion": label,
        "confidence": confidence,
        "scores": clean_scores,
        "provider": provider,
        "fallback_used": fallback_used,
    }

async def _post_multipart(url: str, headers: dict[str, str], audio: bytes, content_type: str, filename: str, fields: dict[str, str] | None = None) -> tuple[int, dict[str, Any]]:
    timeout = aiohttp.ClientTimeout(total=TIMEOUT_SECONDS)
    form = aiohttp.FormData()
    form.add_field("file", audio, filename=filename, content_type=content_type or "application/octet-stream")
    for key, value in (fields or {}).items():
        form.add_field(key, value)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, headers=headers, data=form) as response:
                try:
                    payload = await response.json(content_type=None)
                except Exception:
                    payload = {"message": (await response.text())[:500]}
                return response.status, payload
    except (aiohttp.ClientError, TimeoutError) as exc:
        raise ProviderUnavailable("Voice emotion provider request failed or timed out.") from exc

async def _gender_recognition(audio: bytes, content_type: str, filename: str) -> dict[str, Any]:
    if not GENDER_API_KEY:
        raise ProviderConfigurationError("Gender Recognition API key is not configured.")
    status, payload = await _post_multipart(
        GENDER_API_URL, {"apiKey": GENDER_API_KEY}, audio, content_type, filename
    )
    if status in {429, 500, 502, 503, 504}:
        raise ProviderUnavailable(f"Gender Recognition API returned HTTP {status}.")
    if status in {401, 403}:
        raise ProviderConfigurationError("Gender Recognition API authentication failed.")
    if status >= 400:
        raise ProviderUnavailable(f"Gender Recognition API returned HTTP {status}.")
    if payload.get("success") is False or not payload.get("predicted_emotion"):
        raise ProviderUnavailable("Gender Recognition API returned an invalid response.")
    expressions = payload.get("expressions") or {}
    scores = {str(k).lower(): float(v) / 100.0 for k, v in expressions.items() if isinstance(v, (int, float))}
    confidence = float(payload.get("confidence", 0)) / 100.0
    return _normalized_result(str(payload["predicted_emotion"]), confidence, scores, "gender_recognition", False)

async def _oruk(audio: bytes, content_type: str, filename: str) -> dict[str, Any]:
    if not ORUK_API_KEY:
        raise ProviderConfigurationError("Oruk API key is not configured.")
    request_id = str(uuid.uuid4())
    status, payload = await _post_multipart(
        ORUK_API_URL,
        {"Authorization": f"Bearer {ORUK_API_KEY}", "X-Request-ID": request_id},
        audio, content_type, filename, {"model": ORUK_MODEL},
    )
    if status in {429, 500, 502, 503, 504}:
        raise ProviderUnavailable(f"Oruk API returned HTTP {status}.")
    if status in {401, 403}:
        raise ProviderConfigurationError("Oruk API authentication failed.")
    if status >= 400:
        raise ProviderUnavailable(f"Oruk API returned HTTP {status}.")
    emotions = payload.get("emotions")
    if not isinstance(emotions, list) or not emotions:
        raise ProviderUnavailable("Oruk API returned no emotion result.")
    scores: dict[str, float] = {}
    raw_top_label = None
    raw_top_score = -1.0
    for item in emotions:
        if not isinstance(item, dict) or not item.get("label"):
            continue
        raw_label = str(item["label"]).lower()
        score = float(item.get("score", 0))
        normalized = LABEL_MAP.get(raw_label, raw_label)
        scores[normalized] = max(scores.get(normalized, 0.0), score)
        if score > raw_top_score:
            raw_top_label, raw_top_score = raw_label, score
    if not raw_top_label:
        raise ProviderUnavailable("Oruk API returned an invalid emotion response.")
    return _normalized_result(raw_top_label, raw_top_score, scores, "oruk", False)

PROVIDERS = {"gender_recognition": _gender_recognition, "oruk": _oruk}

async def detect_voice_emotion(audio: bytes, content_type: str | None, filename: str | None) -> dict[str, Any]:
    validate_audio(audio, content_type, filename)
    ct = (content_type or "application/octet-stream").split(";")[0].strip().lower()
    name = filename or "recording.webm"
    order = [PRIMARY_PROVIDER]
    if FALLBACK_PROVIDER and FALLBACK_PROVIDER not in order:
        order.append(FALLBACK_PROVIDER)
    last_error: Exception | None = None
    for index, provider_name in enumerate(order):
        provider = PROVIDERS.get(provider_name)
        if provider is None:
            last_error = ProviderConfigurationError(f"Unknown voice emotion provider: {provider_name}")
            continue
        try:
            logger.info("Voice emotion provider attempt: %s", provider_name)
            result = await provider(audio, ct, name)
            result["fallback_used"] = index > 0
            logger.info("Voice emotion detected: %s (%.2f) via %s", result["emotion"], result["confidence"], provider_name)
            return result
        except ProviderConfigurationError as exc:
            last_error = exc
            logger.warning("Voice provider configuration error for %s", provider_name)
            continue
        except ProviderUnavailable as exc:
            last_error = exc
            logger.warning("Voice provider unavailable: %s", provider_name)
            continue
    raise last_error or ProviderUnavailable("Voice emotion service is unavailable.")
