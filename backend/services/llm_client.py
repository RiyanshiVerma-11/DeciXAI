"""
Resilient LLM Client for DeciXAI.

Implements primary-to-secondary multi-provider failover:
1. Primary Provider: Gemini API (Google AI Studio) using GEMINI_API_KEY_SECONDARY (gemini-2.5-flash-lite).
   - If unavailable or non-quota issue, fallback to GEMINI_API_KEY.
2. Failover Provider: Groq Cloud API using GROQ_API_KEY_SECONDARY (openai/gpt-oss-120b).
   - Triggered on Gemini HTTP 429 (Rate Limit / Quota Exceeded), 403, 503, or service errors.
   - If secondary Groq fails or is unavailable, fallback to GROQ_API_KEY.
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Generator
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

logger = logging.getLogger("DeciXAI.LLMClient")

# ── API Keys & Configuration ───────────────────────────────────────────────
GEMINI_KEY_SECONDARY = os.getenv("GEMINI_API_KEY_SECONDARY")
GEMINI_KEY_PRIMARY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
GEMINI_API_URL = os.getenv("GEMINI_API_URL", "https://generativelanguage.googleapis.com/v1beta/models")

GROQ_KEY_SECONDARY = os.getenv("GROQ_API_KEY_SECONDARY")
GROQ_KEY_PRIMARY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")


def _extract_json_object(content: str) -> dict[str, Any] | None:
    """Extract and parse first valid JSON object or array from LLM output."""
    if not content:
        return None
    # Strip markdown code fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE).strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except Exception:
            pass
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return None


def _format_messages_for_gemini(messages: list[dict[str, str]], system_prompt: str | None = None) -> list[dict[str, Any]]:
    """Convert standard chat messages format to Gemini contents array."""
    contents: list[dict[str, Any]] = []
    accumulated_parts: list[str] = []

    if system_prompt:
        accumulated_parts.append(f"[System Instruction]\n{system_prompt}")

    for msg in messages:
        role = msg.get("role", "user").lower()
        text = msg.get("content", "")
        if role == "system":
            accumulated_parts.append(f"[System Instruction]\n{text}")
        elif role == "user":
            if accumulated_parts:
                accumulated_parts.append(f"[User Message]\n{text}")
                contents.append({"role": "user", "parts": [{"text": "\n\n".join(accumulated_parts)}]})
                accumulated_parts = []
            else:
                contents.append({"role": "user", "parts": [{"text": text}]})
        elif role in {"assistant", "model"}:
            contents.append({"role": "model", "parts": [{"text": text}]})

    if accumulated_parts:
        contents.append({"role": "user", "parts": [{"text": "\n\n".join(accumulated_parts)}]})

    return contents


def _call_gemini_raw(
    contents: list[dict[str, Any]],
    api_key: str,
    temperature: float = 0.3,
    max_tokens: int = 1500,
    timeout_seconds: int = 20,
    response_mime_type: str | None = None,
) -> tuple[str, bool]:
    """
    Execute raw HTTP call to Gemini.
    Returns (response_text, is_rate_limited_boolean).
    """
    if not api_key:
        return "", False

    url = f"{GEMINI_API_URL}/{GEMINI_MODEL}:generateContent?key={api_key}"
    generation_config: dict[str, Any] = {
        "temperature": temperature,
        "maxOutputTokens": max_tokens,
    }
    if response_mime_type:
        generation_config["responseMimeType"] = response_mime_type

    payload = {
        "contents": contents,
        "generationConfig": generation_config,
    }

    req = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "DeciXAI/2.0"},
    )

    try:
        with urlopen(req, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw)
            candidates = data.get("candidates") or []
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", ""), False
            return "", False
    except HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8")
        except Exception:
            pass
        is_rate_limited = e.code in (429, 503) or "RESOURCE_EXHAUSTED" in body or "quota" in body.lower()
        logger.warning("Gemini HTTP Error %s (Rate limited: %s): %s", e.code, is_rate_limited, body[:200])
        return "", is_rate_limited
    except Exception as e:
        logger.warning("Gemini call exception: %s", str(e))
        return "", False


def _call_groq_raw(
    messages: list[dict[str, str]],
    api_key: str,
    temperature: float = 0.3,
    max_tokens: int = 1500,
    json_mode: bool = False,
    timeout_seconds: int = 20,
) -> tuple[str, bool]:
    """
    Execute raw HTTP call to Groq Cloud.
    Returns (response_text, is_rate_limited_boolean).
    """
    if not api_key:
        return "", False

    payload: dict[str, Any] = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "DeciXAI/2.0",
    }

    req = Request(
        GROQ_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
    )

    try:
        with urlopen(req, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw)
            choices = data.get("choices") or []
            if choices:
                return (choices[0].get("message") or {}).get("content", ""), False
            return data.get("response", ""), False
    except HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8")
        except Exception:
            pass
        is_rate_limited = e.code in (429, 503) or "rate_limit_exceeded" in body.lower()
        logger.warning("Groq HTTP Error %s (Rate limited: %s): %s", e.code, is_rate_limited, body[:200])
        return "", is_rate_limited
    except Exception as e:
        logger.warning("Groq call exception: %s", str(e))
        return "", False


def call_llm_json(
    prompt_or_messages: str | list[dict[str, str]],
    system_prompt: str | None = None,
    timeout_seconds: int = 20,
) -> dict[str, Any] | None:
    """
    Primary: Gemini Secondary API Key -> Failover on 429/Error to Groq Secondary API Key.
    Returns parsed JSON object or None.
    """
    if isinstance(prompt_or_messages, str):
        messages = [{"role": "user", "content": prompt_or_messages}]
    else:
        messages = prompt_or_messages

    if system_prompt and not any(m.get("role") == "system" for m in messages):
        messages = [{"role": "system", "content": system_prompt}] + messages

    gemini_contents = _format_messages_for_gemini(messages)

    # 1. Try Gemini Secondary (Primary target)
    keys_to_try_gemini = [k for k in [GEMINI_KEY_SECONDARY, GEMINI_KEY_PRIMARY] if k]
    for g_key in keys_to_try_gemini:
        text, is_rate_limit = _call_gemini_raw(
            gemini_contents,
            api_key=g_key,
            temperature=0.2,
            max_tokens=1500,
            timeout_seconds=timeout_seconds,
            response_mime_type="application/json",
        )
        if text:
            parsed = _extract_json_object(text)
            if parsed is not None:
                return parsed
        if is_rate_limit:
            logger.info("Gemini hit rate limits. Immediately pivoting to Groq Secondary.")
            break  # Break out to Groq immediately

    # 2. Failover to Groq Secondary (and Primary fallback if needed)
    keys_to_try_groq = [k for k in [GROQ_KEY_SECONDARY, GROQ_KEY_PRIMARY] if k]
    for q_key in keys_to_try_groq:
        text, _ = _call_groq_raw(
            messages,
            api_key=q_key,
            temperature=0.2,
            max_tokens=1500,
            json_mode=True,
            timeout_seconds=timeout_seconds,
        )
        if text:
            parsed = _extract_json_object(text)
            if parsed is not None:
                return parsed

    return None


def call_llm_text(
    messages: list[dict[str, str]],
    temperature: float = 0.5,
    max_tokens: int = 1000,
    timeout_seconds: int = 25,
) -> str:
    """
    Primary: Gemini Secondary API Key -> Failover on 429/Error to Groq Secondary API Key.
    Returns plain text completion.
    """
    gemini_contents = _format_messages_for_gemini(messages)

    # 1. Try Gemini Secondary first
    keys_to_try_gemini = [k for k in [GEMINI_KEY_SECONDARY, GEMINI_KEY_PRIMARY] if k]
    for g_key in keys_to_try_gemini:
        text, is_rate_limit = _call_gemini_raw(
            gemini_contents,
            api_key=g_key,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout_seconds=timeout_seconds,
        )
        if text:
            return text.strip()
        if is_rate_limit:
            logger.info("Gemini rate limit encountered. Falling back to Groq Secondary.")
            break

    # 2. Failover to Groq Secondary
    keys_to_try_groq = [k for k in [GROQ_KEY_SECONDARY, GROQ_KEY_PRIMARY] if k]
    for q_key in keys_to_try_groq:
        text, _ = _call_groq_raw(
            messages,
            api_key=q_key,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=False,
            timeout_seconds=timeout_seconds,
        )
        if text:
            return text.strip()

    return ""
