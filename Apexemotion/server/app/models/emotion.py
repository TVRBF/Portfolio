from typing import Dict, Optional

from pydantic import BaseModel


class TextEmotionRequest(BaseModel):
    text: str


class TextEmotionResponse(BaseModel):
    emotion: str
    confidence: float
    scores: Dict[str, float]
    provider: str
    model: Optional[str] = None


class VoiceEmotionResponse(BaseModel):
    emotion: str
    confidence: float
    scores: Dict[str, float]
    provider: str
    fallback_used: bool


class FaceEmotionResponse(BaseModel):
    face_count: int
    emotion: Optional[str] = None
    confidence: Optional[float] = None
    scores: Dict[str, float]
    provider: str
    multiple_faces: bool = False
    bounding_box: Optional[dict] = None


class VideoEmotionTimelinePoint(BaseModel):
    timestamp: float
    emotion: str
    confidence: float

class VideoEmotionResponse(BaseModel):
    status: str
    duration: float
    frames_sampled: int
    frames_analyzed: int
    frames_skipped: int
    dominant_emotion: str
    confidence: float
    timeline: list[VideoEmotionTimelinePoint]
    provider: str
    sampling_interval_seconds: float


class FusionModalityInput(BaseModel):
    emotion: str
    confidence: float


class FusionRequest(BaseModel):
    text: Optional[FusionModalityInput] = None
    voice: Optional[FusionModalityInput] = None
    face: Optional[FusionModalityInput] = None


class FusionModalityOutput(BaseModel):
    emotion: str
    confidence: float
    configured_weight: float
    effective_weight: float


class FusionAgreement(BaseModel):
    type: str
    count: int


class FusionResponse(BaseModel):
    emotion: str
    confidence: float
    modalities_used: list[str]
    modalities: Dict[str, FusionModalityOutput]
    agreement: FusionAgreement
    fusion_scores: Dict[str, float]
    weights: Dict[str, float]
