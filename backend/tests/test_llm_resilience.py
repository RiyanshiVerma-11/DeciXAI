import os
import sys
from unittest.mock import patch
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from services.llm_client import call_llm_json, call_llm_text



def test_llm_call_gemini_secondary():
    """Verify primary call executes successfully via Gemini Secondary."""
    prompt = "Respond strictly with JSON: {\"status\": \"ok\", \"agent\": \"DeciXAI\"}"
    result = call_llm_json(prompt)
    assert result is not None
    assert isinstance(result, dict)
    assert "status" in result or "agent" in result


def test_llm_failover_to_groq_on_gemini_rate_limit():
    """Verify that when Gemini triggers rate limit (429), it immediately falls back to Groq Secondary."""
    with patch("services.llm_client._call_gemini_raw", return_value=("", True)):
        result = call_llm_json("Respond with JSON: {\"rate_limit_failover\": \"success\"}")
        assert result is not None
        assert isinstance(result, dict)


def test_llm_text_completion():
    """Verify plain text generation."""
    messages = [{"role": "user", "content": "Reply with only the word: PHOENIX"}]
    reply = call_llm_text(messages)
    assert len(reply) > 0
    assert "PHOENIX" in reply.upper()
