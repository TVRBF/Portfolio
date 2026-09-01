import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient

from app.auth.utils import decode_token
from app.models.chat import ChatMessage, TranslateRequest
from app.services.emotion_text import detect_text_emotion, EmotionProviderError
from app.services.gemini import gemini_chat, gemini_translate
from app.services.memory import build_memory_context, extract_memory, select_relevant_memories

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGO_URL")
client = AsyncIOMotorClient(MONGO_URI)
db = client.ksm
history = db.history
memories = db.memories

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


@router.post("/send")
async def send_message(msg: ChatMessage, user=Depends(get_current_user)):
    text = msg.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    emotion = None
    confidence = None
    scores = None
    memory_context = ""

    # Memory extraction is best-effort. A failure must never break chat.
    try:
        extracted = await extract_memory(text)
        if extracted:
            now = datetime.now(timezone.utc)
            # Avoid storing the exact same fact repeatedly.
            duplicate = await memories.find_one({
                "user_id": user["sub"],
                "fact": extracted["fact"],
            })
            if duplicate:
                await memories.update_one(
                    {"_id": duplicate["_id"]},
                    {"$set": {
                        "title": extracted["title"],
                        "importance": extracted["importance"],
                        "keywords": extracted["keywords"],
                        "updated_at": now,
                    }},
                )
            else:
                await memories.insert_one({
                    "user_id": user["sub"],
                    **extracted,
                    "created_at": now,
                    "updated_at": now,
                })
            logger.info("Persistent memory extracted/updated")
    except Exception:
        logger.exception("Memory extraction failed; continuing chat")

    try:
        candidate_memories = []
        cursor = memories.find({"user_id": user["sub"]}).sort(
            [("importance", -1), ("created_at", -1)]
        ).limit(30)
        async for memory in cursor:
            candidate_memories.append(memory)
        relevant = select_relevant_memories(candidate_memories, text)
        memory_context = build_memory_context(relevant)
    except Exception:
        logger.exception("Memory retrieval failed; continuing chat without memory context")

    # Emotion is an enhancement, never a hard dependency for chat.
    try:
        emotion_result = await detect_text_emotion(text)
        emotion = emotion_result["emotion"]
        confidence = emotion_result["confidence"]
        scores = emotion_result.get("scores")
        logger.info(
            "Chat emotion: %s (%.2f)",
            emotion,
            confidence,
        )
    except EmotionProviderError as exc:
        logger.warning("Continuing chat without emotion analysis: %s", exc)

    try:
        reply = await gemini_chat(
            text,
            emotion=emotion,
            confidence=confidence,
            memory_context=memory_context,
        )
    except Exception as exc:
        logger.exception("Gemini chat failed")
        raise HTTPException(
            status_code=502,
            detail="AI response is temporarily unavailable.",
        ) from exc

    entry = {
        "user_id": user["sub"],
        "message": text,
        "reply": reply,
        "timestamp": datetime.now(timezone.utc),
    }

    if emotion is not None:
        entry["emotion"] = emotion
        entry["emotion_confidence"] = confidence
        if scores is not None:
            entry["emotion_scores"] = scores

    await history.insert_one(entry)
    logger.info("Chat history saved")

    return {
        "reply": reply,
        "emotion": emotion,
        "confidence": confidence,
        "scores": scores,
        "emotion_available": emotion is not None,
        "memory_used": bool(memory_context),
    }


@router.get("/history")
async def get_history(user=Depends(get_current_user)):
    cursor = history.find({"user_id": user["sub"]}).sort("timestamp", 1)
    chats = []
    async for doc in cursor:
        chats.append(
            {
                "message": doc.get("message", ""),
                "reply": doc.get("reply", ""),
                "timestamp": doc.get("timestamp"),
                "emotion": doc.get("emotion"),
                "confidence": doc.get("emotion_confidence"),
                "scores": doc.get("emotion_scores"),
            }
        )
    return {"history": chats}


@router.post("/translate")
async def translate(req: TranslateRequest, user=Depends(get_current_user)):
    translation = await gemini_translate(req.text, req.target_lang)
    return {"translation": translation}
