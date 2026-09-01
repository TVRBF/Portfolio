import logging
import os
import re
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from app.auth.utils import decode_token
from app.db import db
from app.models.memory import MemoryCreate, MemoryUpdate
from app.services.memory import _tokens

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memory", tags=["memory"])

memories = db.memories
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def _serialize(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "fact": doc.get("fact", ""),
        "importance": int(doc.get("importance", 3)),
        "source": doc.get("source", "manual"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


@router.get("")
async def list_memories(user=Depends(get_current_user)):
    cursor = memories.find({"user_id": user["sub"]}).sort(
        [("importance", -1), ("created_at", -1)]
    )
    items = []
    async for doc in cursor:
        items.append(_serialize(doc))
    return {"memories": items}


@router.post("")
async def add_memory(payload: MemoryCreate, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user["sub"],
        "title": payload.title.strip(),
        "fact": payload.fact.strip(),
        "importance": payload.importance,
        "source": "manual",
        "keywords": sorted(_tokens(f"{payload.title} {payload.fact}")),
        "created_at": now,
        "updated_at": now,
    }
    result = await memories.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.patch("/{memory_id}")
async def update_memory(memory_id: str, payload: MemoryUpdate, user=Depends(get_current_user)):
    if not ObjectId.is_valid(memory_id):
        raise HTTPException(status_code=400, detail="Invalid memory id")

    existing = await memories.find_one({"_id": ObjectId(memory_id), "user_id": user["sub"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Memory not found")

    updates = payload.model_dump(exclude_none=True)
    if "title" in updates:
        updates["title"] = updates["title"].strip()
    if "fact" in updates:
        updates["fact"] = updates["fact"].strip()
    if "title" in updates or "fact" in updates:
        title = updates.get("title", existing.get("title", ""))
        fact = updates.get("fact", existing.get("fact", ""))
        updates["keywords"] = sorted(_tokens(f"{title} {fact}"))
    updates["updated_at"] = datetime.now(timezone.utc)

    await memories.update_one({"_id": existing["_id"]}, {"$set": updates})
    updated = await memories.find_one({"_id": existing["_id"]})
    return _serialize(updated)


@router.delete("/{memory_id}")
async def delete_memory(memory_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(memory_id):
        raise HTTPException(status_code=400, detail="Invalid memory id")

    result = await memories.delete_one({"_id": ObjectId(memory_id), "user_id": user["sub"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"message": "Memory deleted successfully"}
