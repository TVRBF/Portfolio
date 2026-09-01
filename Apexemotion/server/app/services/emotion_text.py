import os
from typing import Any

from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

DEFAULT_MODEL = "j-hartmann/emotion-english-distilroberta-base"

APEX_EMOTIONS = (
    "anger",
    "disgust",
    "fear",
    "joy",
    "neutral",
    "sadness",
    "surprise",
)

LABEL_MAP = {
    "anger": "anger",
    "disgust": "disgust",
    "fear": "fear",
    "joy": "joy",
    "neutral": "neutral",
    "sadness": "sadness",
    "surprise": "surprise",
}

HF_TOKEN = os.getenv("HF_TOKEN", "").strip()
TEXT_EMOTION_MODEL = os.getenv(
    "TEXT_EMOTION_MODEL",
    DEFAULT_MODEL
).strip()


class EmotionProviderError(Exception):
    """Raised when the hosted emotion provider cannot produce a result."""


def _normalize_results(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, list):
        raise EmotionProviderError(
            "Unexpected emotion provider response."
        )

    scores = {emotion: 0.0 for emotion in APEX_EMOTIONS}

    for item in raw:
        if not isinstance(item, dict):
            continue

        provider_label = str(
            item.get("label", "")
        ).strip().lower()

        score = item.get("score")

        normalized = LABEL_MAP.get(provider_label)

        if normalized is None:
            continue

        if not isinstance(score, (int, float)):
            continue

        scores[normalized] = max(
            0.0,
            min(1.0, float(score))
        )

    if not any(scores.values()):
        raise EmotionProviderError(
            "Provider returned no recognized emotion labels."
        )

    total = sum(scores.values())

    if total > 0 and abs(total - 1.0) > 0.02:
        scores = {
            label: value / total
            for label, value in scores.items()
        }

    emotion = max(scores, key=scores.get)
    confidence = scores[emotion]

    return {
        "emotion": emotion,
        "confidence": confidence,
        "scores": scores,
        "provider": "huggingface-inference",
        "model": TEXT_EMOTION_MODEL,
    }


async def detect_text_emotion(text: str) -> dict[str, Any]:

    if not text or not text.strip():
        return {
            "emotion": "neutral",
            "confidence": 1.0,
            "scores": {"neutral": 1.0},
            "provider": "local-validation",
            "model": None,
        }

    if not HF_TOKEN:
        raise EmotionProviderError(
            "HF_TOKEN is not configured."
        )

    try:
        client = InferenceClient(
            token=HF_TOKEN
        )

        results = client.text_classification(
            text.strip(),
            model=TEXT_EMOTION_MODEL,
            top_k=7,
        )

        return _normalize_results(results)

    except Exception as exc:
        error_text = str(exc)

        print(
            f"Hugging Face emotion error: {error_text}"
        )

        if "401" in error_text or "Unauthorized" in error_text:
            raise EmotionProviderError(
                "Hugging Face authentication failed."
            ) from exc

        if "403" in error_text or "Forbidden" in error_text:
            raise EmotionProviderError(
                "Hugging Face access forbidden."
            ) from exc

        raise EmotionProviderError(
            f"Emotion provider failed: {error_text}"
        ) from exc