from __future__ import annotations

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from dotenv import find_dotenv, load_dotenv
load_dotenv(find_dotenv())


GROQ_API_KEY = os.getenv("GROQ_API_KEY")
RAW_OLLAMA_URL = (
    os.getenv("GROQ_API_URL")
    or os.getenv("LLM_API_URL")
    or os.getenv("OLLAMA_API_URL", "https://api.groq.com/openai/v1/chat/completions" if GROQ_API_KEY else "http://127.0.0.1:11434/v1/chat/completions")
)
OLLAMA_URL = (
    RAW_OLLAMA_URL
    if urlparse(RAW_OLLAMA_URL).path not in {"", "/"}
    else urljoin(RAW_OLLAMA_URL.rstrip("/") + "/", "v1/chat/completions")
)
OLLAMA_MODEL = (
    os.getenv("GROQ_MODEL")
    or os.getenv("LLM_MODEL")
    or os.getenv("OLLAMA_MODEL", "openai/gpt-oss-20b" if GROQ_API_KEY else "llama3.1:8b")
)


def _ollama_request(messages: list[dict[str, str]], *, temperature: float = 0.4, num_predict: int = 220) -> Request:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if GROQ_API_KEY:
        payload["max_tokens"] = num_predict
    else:
        payload["num_predict"] = num_predict

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    if GROQ_API_KEY:
        headers["Authorization"] = f"Bearer {GROQ_API_KEY}"

    return Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
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
    timeout_seconds: int = 15,
) -> dict[str, Any] | None:
    """
    Returns a structured audit report from a hiring manager's perspective.
    Returns None if the LLM is unavailable or fails.
    """
    domain = str(domain or "").strip().lower()
    if domain not in {"career", "finance", "startup", "policy"}:
        return None

    # persona: Senior Hiring Manager & Auditor
    system = (
        "You are a Senior Hiring Manager and Career Auditor. Audit the user's career profile bluntly.\n\n"
        "Constraints:\n"
        "1. Confidence Calibration: Do not exceed 80% unless they have production/internship proof.\n"
        "2. Score Consistency: Ensure your reasoning matches the provided scores.\n"
        "3. Action Plan: Be specific and realistic. If Python is a core skill, prioritize suggesting Flask/Django for backend pivots. Avoid suggesting Node.js unless it fits their existing JS expertise.\n"
        "4. 🔥 REALISTIC PROJECT IDEAS (ACHIEVABLE):\n"
        "   Suggest 3-4 resume-worthy projects. Avoid overkill like 'Microservices' for beginners. Focus on robust CRUD, data pipelines, or automated tools.\n"
        "   Each MUST include:\n"
        "   - Title: Professional project name\n"
        "   - Problem: Real-world scenario\n"
        "   - Stack: Realistic tools (e.g. Flask/React, not Kafka/K8s for starters)\n"
        "   - Features: 2-3 core tasks\n"
        "   - Impact: Recruiter signal\n"
        "   - Deployment: Hosting strategy\n\n"
        "Return ONLY JSON in this exact format:\n"
        "{\n"
        "  \"reality_check\": \"Blunt 1-sentence assessment\",\n"
        "  \"project_ideas\": [\n"
        "    {\"title\": \"...\", \"problem\": \"...\", \"stack\": \"...\", \"features\": \"...\", \"impact\": \"...\", \"deployment\": \"...\"}\n"
        "  ],\n"
        "  \"action_plan\": [\"Step 1\", \"Step 2\"]\n"
        "}"
    )
    user = {
        "domain": domain,
        "input": user_input,
        "decision": decision,
        "score": f"{score}/100",
        "risks": risks or [],
        "insights": insights or [],
    }
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user, ensure_ascii=True)},
    ]

    from services.llm_client import call_llm_json
    parsed = call_llm_json(messages, timeout_seconds=timeout_seconds)
    if not parsed or not isinstance(parsed, dict):
        return None

    return {
        "action_plan": parsed.get("action_plan", [])[:5],
        "reality_check": parsed.get("reality_check", "Profile is promising but needs more production-ready evidence."),
        "project_ideas": parsed.get("project_ideas", [])[:3]
    }


