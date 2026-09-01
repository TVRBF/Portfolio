from pydantic import BaseModel

class ChatMessage(BaseModel):
    message: str

class TranslateRequest(BaseModel):
    text: str
    target_lang: str
