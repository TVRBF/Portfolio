from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import (
    auth,
    chat,
    emotion,
    stt,
    memory,
    risk,
    alert,
    analytics,
)

app = FastAPI(
    title="KSM Chatbot API",
    version="0.1.0",
)

# ============================================================
# CORS CONFIGURATION
# ============================================================
# Local development + deployed Render frontend
origins = [
    # Production frontend
    "https://apexfrontend-1ysv.onrender.com",

    # Local development
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# ROUTES
# ============================================================

# Speech-to-text
app.include_router(stt.router)

# Authentication
app.include_router(auth.router)

# Chat
app.include_router(chat.router)

# Emotion detection
app.include_router(emotion.router)

# Personal memory
app.include_router(memory.router)

# Risk engine
app.include_router(risk.router)

# Trusted contact / alerts
app.include_router(alert.router)

# Analytics dashboard
app.include_router(analytics.router)


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def read_root():
    return {
        "message": "KSM Chatbot API is running",
        "status": "ok",
    }
