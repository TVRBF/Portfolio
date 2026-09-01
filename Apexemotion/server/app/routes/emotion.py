import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordBearer

from app.auth.utils import decode_token
from app.models.emotion import TextEmotionRequest, TextEmotionResponse, VoiceEmotionResponse, FaceEmotionResponse, VideoEmotionResponse, FusionRequest, FusionResponse
from app.services.emotion_text import detect_text_emotion, EmotionProviderError
from app.services.face_emotion import (
    FaceEmotionConfigurationError,
    FaceEmotionUnavailable,
    FaceImageValidationError,
    detect_face_emotion,
)
from app.services.video_emotion import (
    VideoValidationError,
    VideoProcessingError,
    analyze_video,
)
from app.services.emotion_fusion import FusionValidationError, fuse_modalities
from app.services.emotion_observations import record_observation
from app.services.voice_emotion import (
    AudioValidationError,
    ProviderConfigurationError,
    ProviderUnavailable,
    detect_voice_emotion,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/emotion", tags=["emotion"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload

@router.post("/text", response_model=TextEmotionResponse)
async def emotion_text(req: TextEmotionRequest, user=Depends(get_current_user)):
    try:
        result = await detect_text_emotion(req.text)
        logger.info("Text emotion detected: %s (%.2f)", result["emotion"], result["confidence"])
        await record_observation(user["sub"], "text", result.get("emotion"), result.get("confidence"), result.get("provider"), result.get("scores"))
        return result
    except EmotionProviderError as exc:
        logger.warning("Text emotion provider unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Text emotion analysis is temporarily unavailable.") from exc
    except Exception as exc:
        logger.exception("Unexpected text emotion error")
        raise HTTPException(status_code=500, detail="Text emotion analysis failed.") from exc

@router.post("/face")
async def emotion_face(file: UploadFile = File(...), user=Depends(get_current_user)):
    try:
        contents = await file.read()
        result = await detect_face_emotion(contents, file.content_type, file.filename)
        return result
    except FaceImageValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FaceEmotionConfigurationError as exc:
        logger.error("Facial emotion provider configuration error: %s", exc)
        raise HTTPException(status_code=503, detail="Facial emotion service is not configured correctly.") from exc
    except FaceEmotionUnavailable as exc:
        logger.warning("Facial emotion provider unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Facial emotion service is temporarily unavailable. Please try again.") from exc
    except Exception as exc:
        logger.exception("Unexpected facial emotion error")
        raise HTTPException(status_code=500, detail="Facial emotion analysis failed.") from exc




@router.post("/face", response_model=FaceEmotionResponse)
async def emotion_face(file: UploadFile = File(...), user=Depends(get_current_user)):
    try:
        contents = await file.read()
        result = await detect_face_emotion(contents, file.content_type, file.filename)
        logger.info(
            "Face emotion frame processed: faces=%s emotion=%s confidence=%s",
            result.get("face_count"),
            result.get("emotion"),
            result.get("confidence"),
        )
        await record_observation(user["sub"], "face", result.get("emotion"), result.get("confidence"), result.get("provider"), result.get("scores"))
        return result
    except FaceImageValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FaceEmotionConfigurationError as exc:
        logger.error("Face emotion provider configuration error: %s", exc)
        raise HTTPException(status_code=503, detail="Facial emotion service is not configured correctly.") from exc
    except FaceEmotionUnavailable as exc:
        logger.warning("Facial emotion provider unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Facial emotion service is temporarily unavailable. Please try again.") from exc
    except Exception as exc:
        logger.exception("Unexpected facial emotion error")
        raise HTTPException(status_code=500, detail="Facial emotion analysis failed.") from exc

@router.post("/voice", response_model=VoiceEmotionResponse)
async def emotion_voice(file: UploadFile = File(...), user=Depends(get_current_user)):
    try:
        contents = await file.read()
        result = await detect_voice_emotion(contents, file.content_type, file.filename)
        await record_observation(user["sub"], "voice", result.get("emotion"), result.get("confidence"), result.get("provider"), result.get("scores"))
        return result
    except AudioValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ProviderConfigurationError as exc:
        logger.error("Voice emotion provider configuration error: %s", exc)
        raise HTTPException(status_code=503, detail="Voice emotion service is not configured correctly.") from exc
    except ProviderUnavailable as exc:
        logger.warning("All voice emotion providers unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Voice emotion service is temporarily unavailable. Please try again.") from exc
    except Exception as exc:
        logger.exception("Unexpected voice emotion error")
        raise HTTPException(status_code=500, detail="Voice emotion analysis failed.") from exc


@router.post("/video", response_model=VideoEmotionResponse)
async def emotion_video(file: UploadFile = File(...), user=Depends(get_current_user)):
    try:
        contents = await file.read()
        result = await analyze_video(contents, file.content_type, file.filename)
        logger.info(
            "Video emotion complete: duration=%s analyzed=%s dominant=%s",
            result["duration"], result["frames_analyzed"], result["dominant_emotion"]
        )
        await record_observation(user["sub"], "video", result.get("dominant_emotion"), result.get("confidence"), result.get("provider"), None, metadata={"frames_analyzed": result.get("frames_analyzed")})
        return result
    except VideoValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except VideoProcessingError as exc:
        logger.warning("Video emotion processing failed: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected video emotion error")
        raise HTTPException(status_code=500, detail="Video emotion analysis failed.") from exc


@router.post("/fusion", response_model=FusionResponse)
async def emotion_fusion(req: FusionRequest, user=Depends(get_current_user)):
    try:
        inputs = {
            "text": req.text.model_dump() if req.text else None,
            "voice": req.voice.model_dump() if req.voice else None,
            "face": req.face.model_dump() if req.face else None,
        }
        result = fuse_modalities(inputs)
        logger.info(
            "Emotion fusion: emotion=%s confidence=%.3f modalities=%s agreement=%s",
            result["emotion"],
            result["confidence"],
            ",".join(result["modalities_used"]),
            result["agreement"]["type"],
        )
        await record_observation(user["sub"], "fusion", result.get("emotion"), result.get("confidence"), "fusion", result.get("fusion_scores"))
        return result
    except FusionValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected emotion fusion error")
        raise HTTPException(status_code=500, detail="Emotion fusion failed.") from exc
