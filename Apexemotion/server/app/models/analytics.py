from datetime import datetime
from pydantic import BaseModel

class AnalyticsResponse(BaseModel):
    current_emotion: dict
    modalities: dict
    emotion_distribution: dict[str, int]
    timeline: list[dict]
    risk_trend: list[dict]
    alert_history: list[dict]
    observation_count: int
    generated_at: datetime
