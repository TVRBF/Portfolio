import io
import numpy as np
import librosa

def detect_voice_emotion(audio_bytes: bytes, content_type: str):
    # Load audio from bytes using librosa
    # Supports wav/mp3 if ffmpeg/ffprobe are set up; wav is simplest
    with io.BytesIO(audio_bytes) as buffer:
        y, sr = librosa.load(buffer, sr=16000, mono=True)

    if y.size == 0:
        return ("neutral", 0.5)

    # Features
    rms = librosa.feature.rms(y=y).mean()
    zcr = librosa.feature.zero_crossing_rate(y).mean()
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13).mean()

    # Simple heuristic rules:
    # - High energy + high ZCR -> angry
    # - Low energy + low ZCR -> sad
    # - Otherwise -> neutral
    # Normalize some thresholds empirically
    energy = float(rms)
    crossings = float(zcr)
    tone = float(mfcc)

    if energy > 0.08 and crossings > 0.08:
        return ("anger", min(0.9, 0.5 + energy))
    if energy < 0.03 and crossings < 0.05:
        return ("sadness", 0.7)
    return ("neutral", 0.6)
