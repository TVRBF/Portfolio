import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

SUPPORTED_EMOTIONS = {
    "anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"
}

# Provider/model-specific aliases observed in earlier phases.
EMOTION_ALIASES = {
    "happy": "joy",
    "happiness": "joy",
    "excited": "joy",
    "sad": "sadness",
    "unhappy": "sadness",
    "angry": "anger",
    "mad": "anger",
    "fearful": "fear",
    "scared": "fear",
    "disgusted": "disgust",
    "surprised": "surprise",
    "calm": "neutral",
}

DEFAULT_WEIGHTS = {
    "text": 0.40,
    "voice": 0.30,
    "face": 0.30,
}


class FusionValidationError(ValueError):
    pass


@dataclass(frozen=True)
class ModalityResult:
    modality: str
    emotion: str
    confidence: float


def _env_weight(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = float(raw)
    except ValueError as exc:
        raise FusionValidationError(f"Invalid fusion weight: {name}") from exc
    if value < 0:
        raise FusionValidationError(f"Fusion weight cannot be negative: {name}")
    return value


def get_weights() -> Dict[str, float]:
    weights = {
        "text": _env_weight("FUSION_TEXT_WEIGHT", DEFAULT_WEIGHTS["text"]),
        "voice": _env_weight("FUSION_VOICE_WEIGHT", DEFAULT_WEIGHTS["voice"]),
        "face": _env_weight("FUSION_FACE_WEIGHT", DEFAULT_WEIGHTS["face"]),
    }
    if sum(weights.values()) <= 0:
        raise FusionValidationError("At least one fusion weight must be greater than zero.")
    return weights


def normalize_emotion(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise FusionValidationError("Emotion must be a non-empty string.")
    label = value.strip().lower()
    label = EMOTION_ALIASES.get(label, label)
    if label not in SUPPORTED_EMOTIONS:
        raise FusionValidationError(f"Unsupported emotion label: {value}")
    return label


def normalize_confidence(value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise FusionValidationError("Confidence must be numeric.")
    confidence = float(value)
    if confidence < 0.0 or confidence > 1.0:
        raise FusionValidationError("Confidence must be between 0.0 and 1.0.")
    return confidence


def _parse_modality(modality: str, payload: Optional[Dict[str, Any]]) -> Optional[ModalityResult]:
    if payload is None:
        return None
    if not isinstance(payload, dict):
        raise FusionValidationError(f"{modality} result must be an object.")
    emotion = normalize_emotion(payload.get("emotion"))
    confidence = normalize_confidence(payload.get("confidence"))
    return ModalityResult(modality, emotion, confidence)


def fuse_modalities(inputs: Dict[str, Optional[Dict[str, Any]]]) -> Dict[str, Any]:
    weights = get_weights()

    parsed = []
    for modality in ("text", "voice", "face"):
        result = _parse_modality(modality, inputs.get(modality))
        if result is not None:
            parsed.append(result)

    if not parsed:
        raise FusionValidationError("No emotion data available for fusion.")

    active_weight_total = sum(weights[item.modality] for item in parsed)
    if active_weight_total <= 0:
        raise FusionValidationError("The configured weights for the supplied modalities sum to zero.")

    # Dynamic renormalization: active weights sum to 1.0.
    normalized_weights = {
        item.modality: weights[item.modality] / active_weight_total
        for item in parsed
    }

    # Confidence-weighted support for each emotion.
    support = {emotion: 0.0 for emotion in sorted(SUPPORTED_EMOTIONS)}
    for item in parsed:
        support[item.emotion] += normalized_weights[item.modality] * item.confidence

    dominant = max(support, key=support.get)
    total_active_weight = sum(normalized_weights.values())  # exactly 1.0
    fusion_confidence = support[dominant] / total_active_weight

    labels = [item.emotion for item in parsed]
    if len(set(labels)) == 1:
        agreement_type = "full"
    elif labels.count(dominant) >= 2:
        agreement_type = "majority"
    else:
        agreement_type = "disagreement"

    modality_breakdown = {}
    for item in parsed:
        modality_breakdown[item.modality] = {
            "emotion": item.emotion,
            "confidence": item.confidence,
            "configured_weight": weights[item.modality],
            "effective_weight": normalized_weights[item.modality],
        }

    # Include scores as engineering support scores, not calibrated probabilities.
    return {
        "emotion": dominant,
        "confidence": round(fusion_confidence, 6),
        "modalities_used": [item.modality for item in parsed],
        "modalities": modality_breakdown,
        "agreement": {
            "type": agreement_type,
            "count": len(set(labels)) if labels else 0,
        },
        "fusion_scores": {label: round(score, 6) for label, score in support.items() if score > 0},
        "weights": weights,
    }
