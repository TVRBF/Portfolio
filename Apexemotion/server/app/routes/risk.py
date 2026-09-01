from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from app.auth.utils import decode_token
from app.db import db
from app.models.risk import RiskAnalyzeRequest
from app.services.risk_engine import calculate_risk
from app.services.alert_engine import evaluate_and_alert

router = APIRouter(prefix="/risk", tags=["risk"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
risk_history = db.risk_history


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def serialize(doc):
    result = dict(doc)
    result["id"] = str(result.pop("_id"))
    return result


@router.post("/analyze")
async def analyze_risk(req: RiskAnalyzeRequest, user=Depends(get_current_user)):
    observations = [item.model_dump() for item in req.observations]
    result = calculate_risk(observations, req.text, req.temporal_window_minutes)

    history_doc = {
        "user_id": user["sub"],
        **result,
        "created_at": datetime.now(timezone.utc),
    }
    await risk_history.insert_one(history_doc)

    # Alerting is a separate best-effort stage. Risk analysis remains successful
    # even if email delivery fails.
    alert_result = await evaluate_and_alert(user["sub"], result)
    result["alert"] = alert_result

    return result


@router.get("/history")
async def get_risk_history(limit: int = 50, user=Depends(get_current_user)):
    limit = max(1, min(limit, 100))
    cursor = risk_history.find({"user_id": user["sub"]}).sort("created_at", -1).limit(limit)
    items = []
    async for doc in cursor:
        items.append(serialize(doc))
    return {"history": items}


@router.delete("/history/{risk_id}")
async def delete_risk_history(risk_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(risk_id):
        raise HTTPException(status_code=400, detail="Invalid risk history id")

    result = await risk_history.delete_one({
        "_id": ObjectId(risk_id),
        "user_id": user["sub"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Risk history item not found")
    return {"message": "Risk history item deleted"}
