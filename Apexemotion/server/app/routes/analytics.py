from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from app.auth.utils import decode_token
from app.services.analytics import build_dashboard

router = APIRouter(prefix="/analytics", tags=["analytics"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload

@router.get("/dashboard")
async def dashboard(hours: int = 24, limit: int = 500, user=Depends(get_current_user)):
    return await build_dashboard(user["sub"], hours=hours, limit=limit)
