"""LLM-based translation for product copy.

Picks a provider at runtime based on which API key is present:
- ANTHROPIC_API_KEY → Claude (preferred for copywriting quality)
- OPENAI_API_KEY    → GPT-4o mini fallback

Falls back to the free Google Translate helper in routers.translate if no
LLM key is configured, so the feature still works without extra setup.
"""
from __future__ import annotations

import json
import os
from typing import Optional

import httpx


LOCALE_NAMES = {
    "pt": "Portuguese",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "nl": "Dutch",
    "pl": "Polish",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    "ar": "Arabic",
    "hi": "Hindi",
    "tr": "Turkish",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish",
    "th": "Thai",
    "vi": "Vietnamese",
    "id": "Indonesian",
    "ro": "Romanian",
    "cs": "Czech",
    "el": "Greek",
    "he": "Hebrew",
    "uk": "Ukrainian",
}


def _locale_label(code: str) -> str:
    return LOCALE_NAMES.get(code, code)


def _build_prompt(title: str, description: str, tags: list[str], target: str) -> str:
    return (
        f"Translate this ecommerce product listing into {_locale_label(target)} ({target}). "
        "Preserve brand names and proper nouns. Keep the description HTML-safe. "
        "Adapt tone so it sounds native, not machine-translated. "
        'Respond with ONLY a JSON object: {"title": "...", "description": "...", "tags": ["..."]} '
        "— no markdown fences, no prose around it.\n\n"
        f"TITLE:\n{title}\n\n"
        f"DESCRIPTION:\n{description}\n\n"
        f"TAGS:\n{json.dumps(tags or [])}"
    )


async def _call_anthropic(prompt: str) -> str:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
    async with httpx.AsyncClient(timeout=45) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 1500,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        r.raise_for_status()
        data = r.json()
        return data["content"][0]["text"]


async def _call_openai(prompt: str) -> str:
    key = os.getenv("OPENAI_API_KEY", "")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    async with httpx.AsyncClient(timeout=45) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "content-type": "application/json"},
            json={
                "model": model,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]


def _parse_json(raw: str) -> dict:
    s = raw.strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s.startswith("json"):
            s = s[4:]
    # clip to outer braces
    start = s.find("{")
    end = s.rfind("}")
    if start >= 0 and end >= 0:
        s = s[start : end + 1]
    return json.loads(s)


async def translate_product_copy(
    title: str,
    description: str,
    tags: list[str],
    target_locale: str,
) -> dict:
    """Translate a full listing. Returns {title, description, tags[]}.

    On any LLM failure, raises — the worker catches and falls back to the
    Google Translate path in routers.translate.
    """
    prompt = _build_prompt(title, description, tags or [], target_locale)
    if os.getenv("ANTHROPIC_API_KEY"):
        raw = await _call_anthropic(prompt)
    elif os.getenv("OPENAI_API_KEY"):
        raw = await _call_openai(prompt)
    else:
        raise RuntimeError("No LLM API key configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)")

    parsed = _parse_json(raw)
    return {
        "title": parsed.get("title", title),
        "description": parsed.get("description", description),
        "tags": parsed.get("tags", tags or []),
    }


def llm_available() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY"))
