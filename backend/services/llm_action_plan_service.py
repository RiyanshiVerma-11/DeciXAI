from __future__ import annotations

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


RAW_OLLAMA_URL = os.getenv("OLLAMA_API_URL", "http://127.0.0.1:11434/v1/chat/completions")
OLLAMA_URL = (
    RAW_OLLAMA_URL
    if urlparse(RAW_OLLAMA_URL).path not in {"", "/"}
    else urljoin(RAW_OLLAMA_URL.rstrip("/") + "/", "v1/chat/completions")
)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")


def _ollama_request(messages: list[dict[str, str]], *, temperature: float = 0.4, num_predict: int = 220) -> Request:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "temperature": temperature,
        "num_predict": num_predict,
    }
    return Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )


def _extract_content(data: dict[str, Any]) -> str:
    choices = data.get("choices") or []
    if choices:
        first = choices[0] or {}
        message = first.get("message") or {}
        content = message.get("content")
        if isinstance(content, str):
            return content
    content = data.get("response")
    return content if isinstance(content, str) else ""


def generate_action_plan(
    *,
    domain: str,
    user_input: dict[str, Any],
    decision: str,
    score: float | None = None,
    risks: list[str] | None = None,
    insights: list[str] | None = None,
    timeout_seconds: int = 6,
) -> list[str] | None:
    """
    Returns a short list of 3-5 actionable steps grounded in the given input and outputs.
    Returns None if the LLM is unavailable or fails.
    """
    domain = str(domain or "").strip().lower()
    if domain not in {"career", "finance", "startup", "policy"}:
        return None

    # Keep prompts compact and deterministic.
    system = (
        "You are a senior domain advisor. Generate a short action plan only. "
        "Do not mention being an AI. Do not ask questions. Do not include disclaimers. "
        "Output ONLY JSON with shape: {\"action_plan\": [\"...\"]}. "
        "Each step must be a single sentence, concrete and measurable."
    )
    user = {
        "domain": domain,
        "input": user_input,
        "decision": decision,
        "score": score,
        "risks": risks or [],
        "insights": insights or [],
    }
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user, ensure_ascii=True)},
    ]

    request = _ollama_request(messages)
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw)
            content = _extract_content(data).strip()
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, ValueError):
        return None

    if not content:
        return None

    # Parse JSON response safely.
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        # Some models wrap JSON in text. Try to recover a JSON object substring.
        start = content.find("{")
        end = content.rfind("}")
        if start < 0 or end < 0 or end <= start:
            return None
        try:
            parsed = json.loads(content[start : end + 1])
        except Exception:
            return None

    plan = parsed.get("action_plan")
    if not isinstance(plan, list):
        return None

    cleaned: list[str] = []
    seen = set()
    for item in plan:
        if not isinstance(item, str):
            continue
        step = " ".join(item.strip().split()).strip(" -\t")
        if not step:
            continue
        key = step.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(step)
        if len(cleaned) >= 5:
            break
    return cleaned if cleaned else None

