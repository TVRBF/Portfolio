from datetime import datetime, timezone
from app.db import db

observations = db.emotion_observations

async def record_observation(
    user_id: str,
    modality: str,
    emotion: str | None,
    confidence: float | None,
    provider: str | None = None,
    scores: dict | None = None,
    timestamp: datetime | None = None,
    metadata: dict | None = None,
):
    if not emotion:
        return
    ts = timestamp or datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "modality": modality,
        "emotion": str(emotion).lower(),
        "confidence": max(0.0, min(1.0, float(confidence or 0.0))),
        "provider": provider,
        "scores": scores or {},
        "timestamp": ts,
        "metadata": metadata or {},
    }
    await observations.insert_one(doc)
