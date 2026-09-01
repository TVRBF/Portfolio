from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RiskObservation(BaseModel):
    emotion: str
    confidence: float = Field(ge=0, le=1)
    timestamp: Optional[datetime] = None
    source: str = "unknown"


class RiskAnalyzeRequest(BaseModel):
    observations: list[RiskObservation] = Field(default_factory=list, max_length=100)
    text: Optional[str] = Field(default=None, max_length=5000)
    temporal_window_minutes: int = Field(default=30, ge=1, le=1440)


class RiskFactor(BaseModel):
    type: str
    label: str
    contribution: float


class RiskResponse(BaseModel):
    risk_score: float
    risk_level: str
    confidence: float
    observations_considered: int
    temporal_window_minutes: int
    distress_indicators: list[str]
    persistence_score: float
    emotion_score: float
    text_distress_score: float
    factors: list[RiskFactor]
    timestamp: datetime


class RiskHistoryItem(RiskResponse):
    id: str
