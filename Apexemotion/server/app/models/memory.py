from datetime import datetime
from pydantic import BaseModel, Field


class MemoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    fact: str = Field(min_length=1, max_length=500)
    importance: int = Field(default=3, ge=1, le=5)


class MemoryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    fact: str | None = Field(default=None, min_length=1, max_length=500)
    importance: int | None = Field(default=None, ge=1, le=5)


class MemoryResponse(BaseModel):
    id: str
    title: str
    fact: str
    importance: int
    source: str
    created_at: datetime
    updated_at: datetime | None = None
