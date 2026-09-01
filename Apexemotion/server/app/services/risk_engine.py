import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

# Engineering weights, deliberately conservative: a single sad/fearful
# observation cannot by itself produce HIGH or CRITICAL risk.
EMOTION_WEIGHTS = {
    "neutral": 0.0,
    "joy": 0.0,
    "surprise": 1.0,
    "disgust": 2.0,
    "anger": 3.0,
    "sadness": 5.0,
    "fear": 6.0,
}

# These are indicators, not diagnoses. Stronger phrases carry more weight.
DISTRESS_INDICATORS = [
    (r"\b(can'?t|cannot) cope\b", "can't cope", 18),
    (r"\b(no|not) hope\b|\bhopeless\b", "hopelessness", 20),
    (r"\bwant to disappear\b", "want to disappear", 28),
    (r"\bfeel (?:like )?a burden\b", "burden language", 22),
    (r"\b(?:nothing matters|no point)\b", "loss of hope", 22),
    (r"\b(?:kill myself|suicide|end my life)\b", "self-harm language", 45),
    (r"\b(?:hurt myself|harm myself)\b", "self-harm language", 40),
    (r"\b(?:i'?m|i am) (?:done|finished)\b", "severe distress wording", 18),
    (r"\b(?:extremely|very) (?:distressed|overwhelmed)\b", "severe distress wording", 12),
    (r"\b(?:panic|terrified|scared)\b", "fear/distress wording", 8),
]

def normalize_emotion(value: str) -> str:
    aliases = {
        "happy": "joy",
        "happiness": "joy",
        "sad": "sadness",
        "fearful": "fear",
        "scared": "fear",
        "calm": "neutral",
        "angry": "anger",
    }
    return aliases.get(value.strip().lower(), value.strip().lower())


def level_for_score(score: float) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 40:
        return "MODERATE"
    return "LOW"


def detect_distress_indicators(text: str | None) -> list[dict[str, Any]]:
    if not text:
        return []
    found = []
    lowered = text.lower()
    for pattern, label, weight in DISTRESS_INDICATORS:
        if re.search(pattern, lowered):
            found.append({"label": label, "weight": weight})
    return found


def _temporal_filter(observations: list[dict], window_minutes: int) -> list[dict]:
    if not observations:
        return []

    now = datetime.now(timezone.utc)
    normalized = []
    for item in observations:
        ts = item.get("timestamp")
        if ts is None:
            ts = now
        elif ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        normalized.append({**item, "timestamp": ts})

    latest = max(item["timestamp"] for item in normalized)
    cutoff = latest - timedelta(minutes=window_minutes)
    return [item for item in normalized if item["timestamp"] >= cutoff]


def calculate_risk(
    observations: list[dict],
    text: str | None,
    window_minutes: int = 30,
) -> dict:
    obs = _temporal_filter(observations, window_minutes)
    indicators = detect_distress_indicators(text)

    factors = []
    if not obs and not indicators:
        now = datetime.now(timezone.utc)
        return {
            "risk_score": 0.0,
            "risk_level": "LOW",
            "confidence": 0.35,
            "observations_considered": 0,
            "temporal_window_minutes": window_minutes,
            "distress_indicators": [],
            "persistence_score": 0.0,
            "emotion_score": 0.0,
            "text_distress_score": 0.0,
            "factors": [],
            "timestamp": now,
        }

    # Confidence-weighted average emotion contribution.
    weighted_sum = 0.0
    confidence_sum = 0.0
    distress_count = 0
    for item in obs:
        emotion = normalize_emotion(item.get("emotion", "neutral"))
        confidence = max(0.0, min(1.0, float(item.get("confidence", 0.0))))
        weighted_sum += EMOTION_WEIGHTS.get(emotion, 0.0) * confidence
        confidence_sum += confidence
        if EMOTION_WEIGHTS.get(emotion, 0.0) >= 5:
            distress_count += 1

    # Emotion score: repeated distressing emotions can reach ~50,
    # but one sad/fear observation stays well below HIGH.
    avg_emotion = weighted_sum / confidence_sum if confidence_sum else 0.0
    emotion_score = min(50.0, avg_emotion * 7.0)
    if obs:
        factors.append({
            "type": "emotion",
            "label": f"{distress_count} distress-weighted emotion observation(s)",
            "contribution": round(emotion_score, 2),
        })

    # Persistence rewards repeated distress, especially consecutive runs.
    if obs:
        ordered = sorted(obs, key=lambda x: x["timestamp"])
        distress_flags = [
            EMOTION_WEIGHTS.get(normalize_emotion(x.get("emotion", "")), 0.0) >= 4
            for x in ordered
        ]
        longest_run = 0
        current_run = 0
        for flag in distress_flags:
            current_run = current_run + 1 if flag else 0
            longest_run = max(longest_run, current_run)

        persistence_base = min(1.0, len([x for x in distress_flags if x]) / 8.0)
        run_bonus = min(1.0, longest_run / 6.0)
        persistence_score = round(35.0 * (0.65 * persistence_base + 0.35 * run_bonus), 2)
        factors.append({
            "type": "persistence",
            "label": f"Repeated distress over {window_minutes} minute window",
            "contribution": persistence_score,
        })
    else:
        persistence_score = 0.0

    # Text contribution is capped; strong language can move the result quickly,
    # but the engine remains explainable and does not create alerts.
    raw_text_score = sum(item["weight"] for item in indicators)
    text_distress_score = min(55.0, float(raw_text_score))
    if indicators:
        factors.append({
            "type": "text",
            "label": f"{len(indicators)} distress indicator(s)",
            "contribution": round(text_distress_score, 2),
        })

    # Combine with a cap. Text alone may indicate serious distress, while
    # emotion persistence supplies corroborating context.
    score = min(
        100.0,
        0.50 * emotion_score +
        0.30 * persistence_score +
        0.20 * text_distress_score
    )

    # Strong explicit distress language gets a floor so it is not diluted
    # completely by unrelated neutral observations.
    if any(i["weight"] >= 40 for i in indicators):
        score = max(score, 70.0)
    elif any(i["weight"] >= 28 for i in indicators):
        score = max(score, 55.0)

    score = round(score, 2)
    level = level_for_score(score)

    # Confidence reflects amount/consistency of evidence, not clinical certainty.
    observation_conf = min(1.0, len(obs) / 6.0)
    indicator_conf = min(1.0, len(indicators) / 2.0)
    consistency = min(1.0, (distress_count / len(obs)) if obs else 0.0)
    confidence = round(
        min(0.99, 0.30 + 0.35 * observation_conf + 0.20 * consistency + 0.15 * indicator_conf),
        2,
    )

    return {
        "risk_score": score,
        "risk_level": level,
        "confidence": confidence,
        "observations_considered": len(obs),
        "temporal_window_minutes": window_minutes,
        "distress_indicators": [item["label"] for item in indicators],
        "persistence_score": persistence_score,
        "emotion_score": round(emotion_score, 2),
        "text_distress_score": round(text_distress_score, 2),
        "factors": [
            {
                "type": f["type"],
                "label": f["label"],
                "contribution": round(float(f["contribution"]), 2),
            }
            for f in factors
        ],
        "timestamp": max(
            (item["timestamp"] for item in obs),
            default=datetime.now(timezone.utc),
        ),
    }
