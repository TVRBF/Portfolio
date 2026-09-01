import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

import aiohttp

from app.services.gemini import GEMINI_API_KEY, GEMINI_API_URL

logger = logging.getLogger(__name__)

MEMORY_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

MEMORY_EXTRACTION_ENABLED = (
    os.getenv("MEMORY_EXTRACTION_ENABLED", "true").lower() == "true"
)

MEMORY_EXTRACTION_TIMEOUT_SECONDS = float(
    os.getenv("MEMORY_EXTRACTION_TIMEOUT_SECONDS", "12")
)

MAX_MEMORY_CONTEXT = int(
    os.getenv("MAX_MEMORY_CONTEXT", "5")
)

STOPWORDS = {
    "about", "after", "again", "also", "because", "been", "being", "could",
    "from", "have", "into", "just", "like", "more", "that", "than", "their",
    "there", "these", "they", "this", "today", "very", "what", "when", "where",
    "which", "while", "with", "would", "your", "you", "and", "the", "for",
    "are", "was", "were", "will", "shall", "then", "them", "only", "really",
}

PERSONAL_HINTS = (
    "i ", "i'm", "i am", "my ", "me ", "we ", "our ", "mine ",
    "i live", "i work", "i study", "i like", "i love", "i hate",
    "my exams", "my college", "my job", "my family", "my friend",
    "my birthday", "my name", "i have", "i've got", "i need",
    "next week", "tomorrow", "next month", "this month",
)


def _tokens(text: str) -> set[str]:
    words = re.findall(
        r"[a-zA-Z0-9']+",
        text.lower()
    )

    return {
        w.strip("'")
        for w in words
        if len(w) >= 3 and w not in STOPWORDS
    }


def looks_like_memory_candidate(text: str) -> bool:
    lowered = f" {text.lower().strip()} "

    if len(text.strip()) < 8:
        return False

    return any(
        hint in lowered
        for hint in PERSONAL_HINTS
    )


async def extract_memory(
    text: str,
) -> dict[str, Any] | None:
    """Ask the existing Gemini service to identify one durable, useful fact."""

    if (
        not MEMORY_EXTRACTION_ENABLED
        or not GEMINI_API_KEY
        or not looks_like_memory_candidate(text)
    ):
        return None

    prompt = f"""
You are ApexEmotion's personal-memory extractor.

Analyze the user's message below and decide whether it contains a useful,
non-sensitive, durable personal fact that would help a conversational
assistant remember the user in a future conversation.

Only store ordinary preference, profile, goal, schedule, study/work, hobby,
or other practical context. Do NOT store health diagnoses, mental-health
conditions, passwords, API keys, financial credentials, exact addresses,
or other highly sensitive information.

Return ONLY valid JSON with this exact shape:

{{
  "remember": true,
  "title": "short human-readable label",
  "fact": "one concise factual sentence",
  "importance": 1
}}

If there is no useful durable fact, return:

{{"remember": false}}

Importance must be an integer from 1 to 5.

Do not invent facts.

User message:

{text}
""".strip()

    headers = {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    }

    try:
        timeout = aiohttp.ClientTimeout(
            total=MEMORY_EXTRACTION_TIMEOUT_SECONDS
        )

        async with aiohttp.ClientSession(
            timeout=timeout
        ) as session:

            async with session.post(
                GEMINI_API_URL,
                json=payload,
                headers=headers,
            ) as resp:

                if resp.status >= 400:
                    logger.warning(
                        "Memory extraction Gemini status: %s",
                        resp.status,
                    )
                    return None

                data = await resp.json()

        parts = (
            data
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )

        raw = "".join(
            part.get("text", "")
            for part in parts
        ).strip()

        # Remove ```json ... ``` if Gemini returns Markdown fences.
        raw = re.sub(
            r"^```json\s*|\s*```$",
            "",
            raw,
            flags=re.IGNORECASE,
        ).strip()

        result = json.loads(raw)

        if not result.get("remember"):
            return None

        title = str(
            result.get("title", "")
        ).strip()

        fact = str(
            result.get("fact", "")
        ).strip()

        importance = int(
            result.get("importance", 3)
        )

        if not title or not fact:
            return None

        return {
            "title": title[:120],
            "fact": fact[:500],
            "importance": max(
                1,
                min(5, importance),
            ),
            "keywords": sorted(
                _tokens(
                    f"{title} {fact}"
                )
            ),
            "source": "conversation",
        }

    except Exception:
        logger.exception(
            "Memory extraction failed; continuing chat without memory extraction"
        )
        return None


def select_relevant_memories(
    memories: list[dict],
    query: str,
    limit: int = MAX_MEMORY_CONTEXT,
) -> list[dict]:

    query_tokens = _tokens(query)

    scored = []

    for memory in memories:
        memory_tokens = set(
            memory.get("keywords")
            or _tokens(
                f"{memory.get('title', '')} "
                f"{memory.get('fact', '')}"
            )
        )

        overlap = len(
            query_tokens & memory_tokens
        )

        importance = int(
            memory.get("importance", 3)
        )

        # Importance provides a small tie-breaker;
        # relevance remains primary.
        score = overlap * 10 + importance

        scored.append(
            (score, memory)
        )

    scored.sort(
        key=lambda item: item[0],
        reverse=True,
    )

    # Prefer directly relevant memories.
    # If there are none, use the most important
    # recent memories as lightweight context.
    relevant = [
        memory
        for score, memory in scored
        if score >= 10
    ][:limit]

    if relevant:
        return relevant

    return [
        memory
        for _, memory in scored[:limit]
    ]


def build_memory_context(
    memories: list[dict],
) -> str:

    if not memories:
        return ""

    lines = [
        "Relevant saved user memories:"
    ]

    for memory in memories:
        lines.append(
            f"- {memory.get('title')}: "
            f"{memory.get('fact')}"
        )

    return "\n".join(lines)