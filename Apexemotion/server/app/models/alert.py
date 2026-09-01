from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


class TrustedContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    enabled: bool = True


class TrustedContactUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None
    enabled: bool | None = None


class AlertSettingsUpdate(BaseModel):
    enabled: bool | None = None
    threshold: str | None = None
    cooldown_minutes: int | None = Field(default=None, ge=1, le=10080)


class AlertTestRequest(BaseModel):
    risk_level: str = "HIGH"
    risk_score: float = Field(default=75.0, ge=0, le=100)


class AlertResponse(BaseModel):
    id: str
    user_id: str
    contact_email: str
    contact_name: str
    risk_level: str
    risk_score: float
    status: str
    provider: str
    provider_message: str | None = None
    created_at: datetime
    sent_at: datetime | None = None
