from datetime import datetime, timedelta, timezone
from app.db import db

observations = db.emotion_observations
risk_history = db.risk_history
alert_logs = db.alert_logs

MODALITIES = ("text", "voice", "face", "video", "fusion")
EMOTIONS = ("joy", "neutral", "sadness", "fear", "anger", "disgust", "surprise")

def _dt(value):
    if isinstance(value, datetime):
        return value
    return datetime.now(timezone.utc)

async def build_dashboard(user_id: str, hours: int = 24, limit: int = 500):
    hours = max(1, min(hours, 168))
    limit = max(1, min(limit, 2000))
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    docs = []
    cursor = observations.find({
        "user_id": user_id,
        "timestamp": {"$gte": cutoff},
    }).sort("timestamp", -1).limit(limit)
    async for d in cursor:
        docs.append(d)

    # Latest valid observation is the current state.
    latest = docs[0] if docs else None
    current = {
        "emotion": latest.get("emotion") if latest else "unknown",
        "confidence": latest.get("confidence", 0.0) if latest else 0.0,
        "modality": latest.get("modality") if latest else None,
        "provider": latest.get("provider") if latest else None,
        "timestamp": latest.get("timestamp") if latest else None,
    }

    # Average confidence by modality from actual stored observations.
    modalities = {}
    for modality in MODALITIES:
        vals = [d["confidence"] for d in docs if d.get("modality") == modality]
        modalities[modality] = {
            "confidence": round(sum(vals) / len(vals), 4) if vals else 0.0,
            "observations": len(vals),
        }

    distribution = {emotion: 0 for emotion in EMOTIONS}
    for d in docs:
        emotion = str(d.get("emotion", "")).lower()
        if emotion in distribution:
            distribution[emotion] += 1

    timeline = []
    for d in reversed(docs[:300]):
        timeline.append({
            "timestamp": d.get("timestamp"),
            "emotion": d.get("emotion"),
            "confidence": d.get("confidence", 0.0),
            "modality": d.get("modality"),
        })

    # Risk and alert histories are independently stored by Phase 8/9.
    risk_docs = []
    cursor = risk_history.find({
        "user_id": user_id,
        "created_at": {"$gte": cutoff},
    }).sort("created_at", 1).limit(300)
    async for d in cursor:
        risk_docs.append(d)

    risk_trend = [{
        "timestamp": d.get("created_at"),
        "risk_score": d.get("risk_score", 0),
        "risk_level": d.get("risk_level", "LOW"),
    } for d in risk_docs]

    alert_docs = []
    cursor = alert_logs.find({
        "user_id": user_id,
        "created_at": {"$gte": cutoff},
    }).sort("created_at", 1).limit(100)
    async for d in cursor:
        alert_docs.append(d)

    alert_history = [{
        "timestamp": d.get("created_at"),
        "risk_level": d.get("risk_level"),
        "risk_score": d.get("risk_score", 0),
        "status": d.get("status"),
        "contact_email": d.get("contact_email"),
    } for d in alert_docs]

    return {
        "current_emotion": current,
        "modalities": modalities,
        "emotion_distribution": distribution,
        "timeline": timeline,
        "risk_trend": risk_trend,
        "alert_history": alert_history,
        "observation_count": len(docs),
        "generated_at": datetime.now(timezone.utc),
    }
