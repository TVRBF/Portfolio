import logging
import os

import aiohttp
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
GEMINI_API_URL = os.getenv(
    "GEMINI_API_URL",
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent",
)


def _emotion_instructions(emotion: str) -> str:
    rules = {
        "sadness": "Respond with empathy, support, and a non-judgmental conversational tone.",
        "anger": "Acknowledge the frustration, remain calm, and do not escalate the user's anger.",
        "fear": "Be reassuring and take the concern seriously without dismissing it.",
        "joy": "Use a naturally positive tone and share the user's enthusiasm.",
        "neutral": "Respond naturally and conversationally without forcing an emotional tone.",
        "surprise": "Acknowledge that the situation is unexpected and respond naturally.",
        "disgust": "Remain calm, neutral, and supportive without exaggerating the reaction.",
    }
    return rules.get(emotion, rules["neutral"])


async def gemini_chat(
    message: str,
    emotion: str | None = None,
    confidence: float | None = None,
    memory_context: str | None = None,
) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    if emotion:
        confidence_text = (
            f"{confidence:.2f}" if confidence is not None else "unknown"
        )
        system_context = (
            "You are ApexEmotion, an emotionally aware conversational assistant. "
            "The emotion classifier detected the following state in the user's "
            f"message: {emotion} (confidence {confidence_text}). "
            "Treat this as contextual signal, not a medical diagnosis. "
            f"{_emotion_instructions(emotion)} "
            "Do not claim that the classifier proves how the user feels. "
            "Do not diagnose mental-health conditions."
        )
        prompt = (
            f"{system_context}\n\n"
            f"{memory_context + chr(10) + chr(10) if memory_context else ''}"
            f"User message:\n{message}"
        )
    else:
        prompt = (
            f"{memory_context + chr(10) + chr(10) if memory_context else ''}"
            f"User message:\n{message}"
        )

    headers = {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    timeout = aiohttp.ClientTimeout(total=20)

    logger.info("Gemini request started")
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(
            GEMINI_API_URL,
            json=payload,
            headers=headers,
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()

    candidates = data.get("candidates", [])
    if not candidates:
        return "Sorry, I didn't understand that."

    parts = candidates[0].get("content", {}).get("parts", [])
    reply = "".join(part.get("text", "") for part in parts)
    logger.info("Gemini response received")
    return reply or "Sorry, I couldn't generate a response."


async def gemini_translate(text: str, target_lang: str) -> str:
    # Existing Phase 0 placeholder; Phase 1 does not expand translation scope.
    return f"Translated({target_lang}): {text}"
