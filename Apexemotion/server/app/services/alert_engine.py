import logging
import os
from datetime import datetime, timedelta, timezone

from app.db import db
from app.services.email_service import send_wellbeing_alert

logger = logging.getLogger(__name__)

contacts = db.trusted_contacts
settings = db.alert_settings
alert_logs = db.alert_logs

DEFAULT_THRESHOLD = os.getenv("ALERT_THRESHOLD", "HIGH").upper()
DEFAULT_COOLDOWN_MINUTES = int(os.getenv("ALERT_COOLDOWN_MINUTES", "60"))


LEVELS = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "CRITICAL": 3}


async def get_contact(user_id: str):
    return await contacts.find_one({"user_id": user_id})


async def get_settings(user_id: str) -> dict:
    value = await settings.find_one({"user_id": user_id})
    if value:
        return value
    default = {
        "user_id": user_id,
        "enabled": False,
        "threshold": DEFAULT_THRESHOLD if DEFAULT_THRESHOLD in LEVELS else "HIGH",
        "cooldown_minutes": DEFAULT_COOLDOWN_MINUTES,
    }
    await settings.insert_one(default)
    return default


def qualifies(risk_level: str, threshold: str) -> bool:
    return LEVELS.get(risk_level.upper(), -1) >= LEVELS.get(threshold.upper(), 2)


async def recent_duplicate(user_id: str, risk_level: str, now: datetime, cooldown_minutes: int) -> bool:
    cutoff = now - timedelta(minutes=cooldown_minutes)
    doc = await alert_logs.find_one({
        "user_id": user_id,
        "risk_level": risk_level,
        "created_at": {"$gte": cutoff},
        "status": {"$in": ["sent", "pending"]},
    })
    return doc is not None


async def evaluate_and_alert(user_id: str, risk_result: dict, force: bool = False) -> dict:
    risk_level = str(risk_result.get("risk_level", "LOW")).upper()
    risk_score = float(risk_result.get("risk_score", 0))
    cfg = await get_settings(user_id)
    contact = await get_contact(user_id)

    base = {
        "triggered": False,
        "sent": False,
        "reason": None,
        "alert_id": None,
    }

    if not cfg.get("enabled"):
        base["reason"] = "Alerts are disabled"
        return base

    if not contact or not contact.get("enabled"):
        base["reason"] = "No enabled trusted contact"
        return base

    if not qualifies(risk_level, cfg.get("threshold", "HIGH")):
        base["reason"] = "Risk level is below configured threshold"
        return base

    now = datetime.now(timezone.utc)
    if not force and await recent_duplicate(user_id, risk_level, now, int(cfg.get("cooldown_minutes", 60))):
        base["reason"] = "Alert cooldown / duplicate prevention"
        return base

    doc = {
        "user_id": user_id,
        "contact_id": str(contact["_id"]),
        "contact_email": contact["email"],
        "contact_name": contact["name"],
        "risk_level": risk_level,
        "risk_score": risk_score,
        "status": "pending",
        "provider": "resend",
        "provider_message": None,
        "created_at": now,
        "sent_at": None,
    }
    inserted = await alert_logs.insert_one(doc)
    alert_id = str(inserted.inserted_id)
    base.update({"triggered": True, "alert_id": alert_id})

    result = await send_wellbeing_alert(
        contact["name"], contact["email"], risk_level, risk_score
    )

    if result["success"]:
        await alert_logs.update_one(
            {"_id": inserted.inserted_id},
            {"$set": {
                "status": "sent",
                "provider_message": result.get("message"),
                "sent_at": datetime.now(timezone.utc),
            }},
        )
        base["sent"] = True
        base["reason"] = "Email sent"
    else:
        await alert_logs.update_one(
            {"_id": inserted.inserted_id},
            {"$set": {
                "status": "failed",
                "provider_message": result.get("message"),
            }},
        )
        base["reason"] = result.get("message", "Email failed")

    return base
