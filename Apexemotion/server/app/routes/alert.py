from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from app.auth.utils import decode_token
from app.db import db
from app.models.alert import (
    AlertSettingsUpdate, AlertTestRequest, TrustedContactCreate, TrustedContactUpdate
)
from app.services.alert_engine import (
    get_contact, get_settings, evaluate_and_alert, DEFAULT_COOLDOWN_MINUTES, DEFAULT_THRESHOLD
)
from app.services.risk_engine import calculate_risk

router = APIRouter(prefix="/alert", tags=["alerts"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

contacts = db.trusted_contacts
settings = db.alert_settings
alert_logs = db.alert_logs


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def serialize(doc):
    result = dict(doc)
    result["id"] = str(result.pop("_id"))
    return result


@router.get("/contact")
async def read_contact(user=Depends(get_current_user)):
    doc = await get_contact(user["sub"])
    return {"contact": serialize(doc) if doc else None}


@router.post("/contact")
async def create_contact(payload: TrustedContactCreate, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    existing = await get_contact(user["sub"])
    data = {
        "user_id": user["sub"],
        "name": payload.name.strip(),
        "email": str(payload.email),
        "enabled": payload.enabled,
        "created_at": now,
        "updated_at": now,
    }
    if existing:
        await contacts.update_one({"_id": existing["_id"]}, {"$set": data})
        doc = await contacts.find_one({"_id": existing["_id"]})
    else:
        result = await contacts.insert_one(data)
        doc = await contacts.find_one({"_id": result.inserted_id})
    return {"contact": serialize(doc)}


@router.patch("/contact")
async def update_contact(payload: TrustedContactUpdate, user=Depends(get_current_user)):
    existing = await get_contact(user["sub"])
    if not existing:
        raise HTTPException(status_code=404, detail="Trusted contact not found")
    updates = payload.model_dump(exclude_none=True)
    if "name" in updates:
        updates["name"] = updates["name"].strip()
    if "email" in updates:
        updates["email"] = str(updates["email"])
    updates["updated_at"] = datetime.now(timezone.utc)
    await contacts.update_one({"_id": existing["_id"]}, {"$set": updates})
    return {"contact": serialize(await contacts.find_one({"_id": existing["_id"]}))}


@router.delete("/contact")
async def delete_contact(user=Depends(get_current_user)):
    await contacts.delete_one({"user_id": user["sub"]})
    return {"message": "Trusted contact removed"}


@router.get("/settings")
async def read_settings(user=Depends(get_current_user)):
    value = await get_settings(user["sub"])
    value = serialize(value)
    return {
        "enabled": value.get("enabled", False),
        "threshold": value.get("threshold", DEFAULT_THRESHOLD),
        "cooldown_minutes": value.get("cooldown_minutes", DEFAULT_COOLDOWN_MINUTES),
    }


@router.patch("/settings")
async def update_settings(payload: AlertSettingsUpdate, user=Depends(get_current_user)):
    updates = payload.model_dump(exclude_none=True)
    if "threshold" in updates:
        threshold = updates["threshold"].upper()
        if threshold not in {"HIGH", "CRITICAL"}:
            raise HTTPException(status_code=400, detail="Threshold must be HIGH or CRITICAL")
        updates["threshold"] = threshold
    updates["updated_at"] = datetime.now(timezone.utc)
    await settings.update_one(
        {"user_id": user["sub"]},
        {"$set": updates},
        upsert=True,
    )
    return await read_settings(user)


@router.post("/test")
async def test_alert(payload: AlertTestRequest, user=Depends(get_current_user)):
    """Deliberately generate a high/critical condition for Phase 9 delivery testing."""
    level = payload.risk_level.upper()
    if level not in {"HIGH", "CRITICAL"}:
        raise HTTPException(status_code=400, detail="Test risk level must be HIGH or CRITICAL")

    result = calculate_risk([], "test", 30)
    result["risk_level"] = level
    result["risk_score"] = payload.risk_score
    result["factors"] = [{"type": "test", "label": "Deliberate Phase 9 test condition", "contribution": payload.risk_score}]

    return await evaluate_and_alert(user["sub"], result, force=True)


@router.get("/history")
async def alert_history(limit: int = 50, user=Depends(get_current_user)):
    limit = max(1, min(limit, 100))
    cursor = alert_logs.find({"user_id": user["sub"]}).sort("created_at", -1).limit(limit)
    items = []
    async for doc in cursor:
        items.append(serialize(doc))
    return {"alerts": items}


@router.delete("/history/{alert_id}")
async def delete_alert(alert_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(alert_id):
        raise HTTPException(status_code=400, detail="Invalid alert id")
    result = await alert_logs.delete_one({"_id": ObjectId(alert_id), "user_id": user["sub"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert history item deleted"}
