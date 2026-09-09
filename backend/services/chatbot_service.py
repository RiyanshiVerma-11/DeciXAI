from __future__ import annotations

import json
import os
import re
from datetime import datetime
from difflib import SequenceMatcher
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from dotenv import find_dotenv, load_dotenv
load_dotenv(find_dotenv())

from services.career_service import get_career_analysis_from_text
from services.domain_classifier_service import build_chat_language_instruction, classify_domain
from services.finance_service import get_finance_decision
from services.policy_service import get_policy_comparison, get_policy_decision
from services.startup_service import get_startup_decision_from_text
from utils.parse_prompt import parse_prompt

GROQ_API_KEY = os.getenv('GROQ_API_KEY')
raw_llm_url = (
    os.getenv('GROQ_API_URL')
    or os.getenv('LLM_API_URL')
    or os.getenv('OLLAMA_API_URL', 'https://api.groq.com/openai/v1/chat/completions' if GROQ_API_KEY else 'http://127.0.0.1:11434/v1/chat/completions')
)
OLLAMA_URL = (
    raw_llm_url
    if urlparse(raw_llm_url).path not in {'', '/'}
    else urljoin(raw_llm_url.rstrip('/') + '/', 'v1/chat/completions')
)
OLLAMA_MODEL = os.getenv('GROQ_MODEL') or os.getenv('LLM_MODEL') or os.getenv('OLLAMA_MODEL', 'openai/gpt-oss-20b' if GROQ_API_KEY else 'llama3.1:8b')
SERVICE_NAME = 'Groq' if (GROQ_API_KEY or 'groq' in OLLAMA_URL.lower()) else 'LLM'
MAX_HISTORY = 10
TIMEOUT_SECONDS = int(os.getenv('GROQ_TIMEOUT_SECONDS') or os.getenv('OLLAMA_TIMEOUT_SECONDS', '60'))
RETRY_ATTEMPTS = 2
PROJECT_DOMAINS = ('career', 'finance', 'startup', 'policy')


def _build_system_prompt(language_instruction: str = 'Reply in concise English.') -> str:
    return (
        'You are DeciXAI, an AI Decision Intelligence assistant. '
        'You help users explore career, finance, startup, and policy decisions through natural conversation. '
        'STRICT ANTI-HALLUCINATION RULES: '
        '1. Ground every claim strictly in the user\'s stated profile, model outputs, or explicit context. Never invent unmentioned skills, projects, certifications, or fictional metrics. '
        '2. If requested details are missing, state what is known and ask directly for the missing input instead of assuming. '
        '3. Maintain exact alignment with XAI (SHAP) feature impacts and path match scores. '
        'When a user asks for guidance, answer directly first, then ask at most one clarifying question only if it is truly needed. '
        'Avoid generic motivational filler. Give practical next steps, stay concise, and do not use tables. '
        + language_instruction
    )


def _prepare_messages(payload: dict[str, Any], language_instruction: str) -> list[dict[str, str]]:
    raw_messages = payload.get('messages')
    if isinstance(raw_messages, list):
        filtered = []
        for item in raw_messages:
            role = str(item.get('role', 'user')).strip()
            content = str(item.get('content', '')).strip()
            if role not in {'user', 'assistant'} or not content:
                continue
            filtered.append({'role': role, 'content': content})
        trimmed = filtered[-MAX_HISTORY:]
        return [{'role': 'system', 'content': _build_system_prompt(language_instruction)}] + trimmed

    message = str(payload.get('message', '')).strip()
    return [
        {'role': 'system', 'content': _build_system_prompt(language_instruction)},
        {'role': 'user', 'content': message},
    ]


def _current_date_label() -> str:
    return datetime.now().astimezone().strftime('%B %d, %Y')


def _smalltalk_reply(message: str) -> str | None:
    text = str(message or '').strip().lower()
    if not text:
        return None

    greetings = {'hi', 'hii', 'hello', 'hey', 'hey there'}
    if text in greetings:
        return (
            'Hi! I can help with career, finance, startup, or policy decisions. '
            "If you want, tell me your goal and a little context, and I'll give you a direct next-step answer."
        )

    return None


def _project_scope_reply(message: str) -> str | None:
    text = str(message or '').strip().lower()
    if not text:
        return None

    date_triggers = (
        'what is the date',
        "what's the date",
        'today date',
        "today's date",
        'date today',
        'what date is it',
    )
    domain_count_triggers = (
        'how many domains',
        'number of domains',
        'how many domain',
        'project scope',
        'what domains',
        'which domains',
        'domain names',
    )

    if any(trigger in text for trigger in date_triggers):
        return f"Today's date is {_current_date_label()}."

    if any(trigger in text for trigger in domain_count_triggers):
        domain_list = ', '.join(PROJECT_DOMAINS[:-1]) + f', and {PROJECT_DOMAINS[-1]}'
        return f'This project has 4 domains: {domain_list}.'

    if 'is policy a domain' in text or 'policy domain' in text:
        return 'Yes. Policy is one of the 4 domains in this project.'

    return None


def _extract_latest_user_message(payload: dict[str, Any]) -> str:
    raw_message = str(payload.get('message') or '').strip()
    if raw_message:
        return raw_message

    raw_messages = payload.get('messages') or []
    for item in reversed(raw_messages):
        if str(item.get('role', '')).strip() == 'user':
            content = str(item.get('content', '')).strip()
            if content:
                return content
    return ''


def _general_scope_reply(message: str) -> str | None:
    text = str(message or '').strip().lower()
    if not text:
        return None

    current_affairs_triggers = (
        'prime minister',
        'president',
        'chief minister',
        'governor',
        'who is the',
        'current minister',
    )
    if any(trigger in text for trigger in current_affairs_triggers):
        return (
            "I am most reliable for this app's 4 domains: career, finance, startup, and policy. "
            'For general current-affairs questions like political officeholders, use a web-connected assistant.'
        )

    return None


def _tokenize(text: str) -> list[str]:
    return [token for token in ''.join(ch.lower() if ch.isalnum() else ' ' for ch in str(text or '')).split() if token]


def _is_close_phrase(text: str, phrases: tuple[str, ...], threshold: float = 0.84) -> bool:
    lowered = str(text or '').lower()
    if any(phrase in lowered for phrase in phrases):
        return True

    tokens = _tokenize(lowered)
    if not tokens:
        return False

    joined = ' '.join(tokens)
    for phrase in phrases:
        phrase_tokens = phrase.split()
        if not phrase_tokens:
            continue
        window = len(phrase_tokens)
        for index in range(max(1, len(tokens) - window + 1)):
            segment = ' '.join(tokens[index:index + window])
            if SequenceMatcher(None, segment, phrase).ratio() >= threshold:
                return True
        if SequenceMatcher(None, joined, phrase).ratio() >= 0.9:
            return True
    return False


def _infer_domain(message: str) -> str | None:
    detection = classify_domain(message)
    if detection.get('domain') and detection.get('confidence', 0) >= 0.34:
        return detection['domain']

    text = str(message or '').strip().lower()
    if not text:
        return None

    if _is_close_phrase(text, (
        'data scientist',
        'data science',
        'software engineer',
        'software development',
        'career',
        'job',
        'placement',
        'internship',
        'resume',
        'machine learning',
    )):
        return 'career'
    if _is_close_phrase(text, ('startup', 'founder', 'funding', 'saas', 'b2b', 'b2c', 'market fit')):
        return 'startup'
    if _is_close_phrase(text, ('loan', 'credit score', 'income', 'debt', 'finance', 'investment')):
        return 'finance'
    if _is_close_phrase(text, ('policy', 'government scheme', 'budget', 'public policy', 'population')):
        return 'policy'
    return None


def _format_grounded_reply(domain: str, result: dict[str, Any]) -> str:
    decision = str(result.get('decision') or '').strip()
    summary = str(result.get('summary') or '').strip()
    explanation = str(result.get('explanation') or '').strip()
    suggestions = [str(item).strip().rstrip('.') for item in (result.get('suggestions') or []) if str(item).strip()]
    action_plan = [str(item).strip().rstrip('.') for item in (result.get('action_plan') or []) if str(item).strip()]
    risks = [str(item).strip().rstrip('.') for item in (result.get('risks') or []) if str(item).strip()]

    if domain == 'career':
        option_scores = (((result.get('details') or {}).get('option_scores')) or [])
        top_option = option_scores[0] if option_scores else {}
        top_label = str(top_option.get('mapped_label') or decision or 'this path').strip()
        top_skills = (((top_option.get('path_profile') or {}).get('top_skills')) or [])[:4]
        top_steps = action_plan[:3] or suggestions[:3]
        risk_text = ''
        if risks:
            cleaned_risks = []
            for item in risks:
                cleaned = item.split(' - ', 1)[-1].strip()
                if cleaned and cleaned not in cleaned_risks:
                    cleaned_risks.append(cleaned)
            if cleaned_risks:
                risk_text = 'Right now, the biggest gaps are ' + '; '.join(cleaned_risks[:3]) + '.'

        parts = [f'To move toward {top_label.lower()}, focus on building proof, not just interest.']
        if top_skills:
            parts.append('Start with core skills like ' + ', '.join(top_skills[:-1]) + f', and {top_skills[-1]}.')
        if risk_text:
            parts.append(risk_text)
        if top_steps:
            parts.append('A strong next plan is: ' + '; '.join(top_steps) + '.')
        return ' '.join(parts)

    if domain == 'startup':
        top_steps = action_plan[:3] or suggestions[:3]
        parts = ["Here's a grounded startup view based on the app's scoring logic."]
        if decision:
            parts.append(decision + '.')
        if summary:
            parts.append(summary)
        if top_steps:
            parts.append('Priority moves: ' + '; '.join(top_steps) + '.')
        return ' '.join(parts)

    if domain == 'finance':
        top_steps = suggestions[:3] or action_plan[:3]
        parts = ["Here's a grounded finance view based on the app's risk model."]
        if decision:
            parts.append(decision + '.')
        if summary:
            parts.append(summary)
        elif explanation:
            parts.append(explanation)
        if top_steps:
            parts.append('Recommended next steps: ' + '; '.join(top_steps) + '.')
        return ' '.join(parts)

    if domain == 'policy':
        top_steps = suggestions[:3] or action_plan[:3]
        parts = ["Here's a grounded policy view based on the app's feasibility logic."]
        if decision:
            parts.append(decision + '.')
        if summary:
            parts.append(summary)
        elif explanation:
            parts.append(explanation)
        if top_steps:
            parts.append('Best next steps: ' + '; '.join(top_steps) + '.')
        return ' '.join(parts)

    return summary or explanation or decision or "Here's a grounded answer from the app."


def _has_grounding_parameters(domain: str, message: str) -> bool:
    import math
    lowered = str(message or '').lower()
    if domain == 'career':
        return _looks_like_career_profile(message)

    if domain == 'startup':
        from services.startup_service import parse_startup_input
        parsed = parse_startup_input(message)
        # Verify that we actually extracted at least one valid, non-NaN numerical feature
        return (
            (parsed.get('funding') == parsed.get('funding') and not math.isnan(parsed.get('funding', float('nan')))) or
            (parsed.get('team_size') == parsed.get('team_size') and not math.isnan(parsed.get('team_size', float('nan')))) or
            (parsed.get('experience') == parsed.get('experience') and not math.isnan(parsed.get('experience', float('nan'))))
        )

    if domain == 'finance':
        from utils.parse_prompt import parse_prompt
        parsed = parse_prompt('finance', message).get('features', {})
        return (
            parsed.get('income') is not None or
            parsed.get('loan') is not None or
            parsed.get('credit_score') is not None
        )

    if domain == 'policy':
        from utils.parse_prompt import parse_prompt
        parsed = parse_prompt('policy', message)
        features = parsed.get('features', {})
        options = parsed.get('options', [])
        has_numeric = features.get('budget') is not None or features.get('population') is not None
        has_options = len(options) >= 2 or any(token in lowered for token in ('compare', 'between', 'vs', 'versus', 'alternative'))
        return has_numeric or has_options

    return False


def _grounded_domain_reply(message: str) -> str | None:
    domain = _infer_domain(message)
    if not domain:
        return None

    if not _has_grounding_parameters(domain, message):
        return None

    lowered = str(message or '').strip().lower()
    if lowered in {'hi', 'hii', 'hello', 'hey', 'hola'}:
        return None

    try:
        if domain == 'career':
            result = get_career_analysis_from_text(message)
        elif domain == 'startup':
            result = get_startup_decision_from_text(message)
        elif domain == 'finance':
            features = parse_prompt('finance', message).get('features', {})
            result = get_finance_decision(features)
        elif domain == 'policy':
            if any(token in lowered for token in ('compare', 'between', 'vs', 'versus', 'alternative')):
                parsed = parse_prompt('policy', message)
                options = parsed.get('options') or []
                result = get_policy_comparison({
                    'primary_option': options[0] if len(options) > 0 else '',
                    'alternative_option': options[1] if len(options) > 1 else '',
                    **parsed.get('features', {}),
                })
            else:
                features = parse_prompt('policy', message).get('features', {})
                result = get_policy_decision(features)
        else:
            return None
    except Exception:
        return None

    if not isinstance(result, dict):
        return None

    return _format_grounded_reply(domain, result)


def _extract_chat_content(payload: dict[str, Any]) -> str:
    choices = payload.get('choices', [])
    if choices:
        first_choice = choices[0] or {}
        delta = first_choice.get('delta', {}) or {}
        message = first_choice.get('message', {}) or {}
        content = delta.get('content') or message.get('content')
        if isinstance(content, str) and content:
            return content

    message = payload.get('message', {}) or {}
    if isinstance(message, dict):
        content = message.get('content')
        if isinstance(content, str) and content:
            return content

    response_text = payload.get('response')
    if isinstance(response_text, str) and response_text:
        return response_text

    return ''


def _looks_like_career_profile(text: str) -> bool:
    lowered = str(text or "").lower()
    # Treat as a profile only when we see multiple strong signals, not just a generic word like "projects".
    strong = 0
    if re.search(r"\b(?:cgpa|gpa)\b[^\d]{0,10}\d+(?:\.\d+)?", lowered) or re.search(r"\b\d+(?:\.\d+)?\b[^\n]{0,10}\b(?:cgpa|gpa)\b", lowered):
        strong += 2
    if any(token in lowered for token in ("btech", "b.tech", "bba", "mba", "bca", "mca", "be", "degree", "course")):
        strong += 1
    if any(token in lowered for token in ("skills", "certifications", "certification", "projects", "specialization", "year", "interest")):
        strong += 1
    return strong >= 2


def _looks_like_career_followup(text: str) -> bool:
    lowered = str(text or "").lower()
    # Follow-ups typically ask for examples/roadmap without repeating the profile.
    return any(token in lowered for token in (
        "give example", "examples", "project ideas", "projects ideas", "projects i should make", "what projects", "roadmap",
        "how can i", "what should i do", "improve", "top companies", "google", "microsoft", "amazon",
        "faang", "resume", "portfolio", "project", "projects",
    ))


def _find_last_user_profile_message(payload: dict[str, Any]) -> str:
    messages = payload.get("messages") or []
    if not isinstance(messages, list):
        return ""

    # Find the latest user message that looks like it contains structured profile info.
    for entry in reversed(messages):
        if not isinstance(entry, dict):
            continue
        if (entry.get("role") or "").lower() != "user":
            continue
        content = entry.get("content")
        if isinstance(content, str) and _looks_like_career_profile(content):
            return content
    return ""


def _augment_career_followup_with_context(payload: dict[str, Any], latest_message: str) -> str:
    """
    Users naturally ask follow-ups without repeating their profile.
    If this looks like a career follow-up, prepend the last profile-bearing user message.
    """
    if not latest_message:
        return latest_message
    if _looks_like_career_profile(latest_message):
        return latest_message
    if not _looks_like_career_followup(latest_message):
        return latest_message

    prior_profile = _find_last_user_profile_message(payload)
    if not prior_profile:
        return latest_message

    # Keep it simple: prepend the profile context so the career parser sees the full info.
    return f"{prior_profile}\n\nFollow-up: {latest_message}"


def _read_streamed_response(response):
    buffer = ''
    while True:
        chunk = response.read(1024)
        if not chunk:
            break
        buffer += chunk.decode('utf-8')
        while '\n' in buffer:
            line, buffer = buffer.split('\n', 1)
            line = line.strip()
            if not line or line == '[DONE]':
                continue
            if line.startswith('data:'):
                data_text = line[5:].strip()
                if not data_text or data_text == '[DONE]':
                    continue
                try:
                    parsed = json.loads(data_text)
                except json.JSONDecodeError:
                    continue
                delta = _extract_chat_content(parsed)
                if delta:
                    yield delta
    if buffer.strip().startswith('data:'):
        data_text = buffer.strip()[5:].strip()
        if data_text and data_text != '[DONE]':
            try:
                parsed = json.loads(data_text)
                delta = _extract_chat_content(parsed)
                if delta:
                    yield delta
            except json.JSONDecodeError:
                pass


def _build_ollama_request(messages: list[dict[str, str]], stream: bool = False, model_override: str | None = None) -> Request:
    active_model = model_override or OLLAMA_MODEL
    payload = {
        'model': active_model,
        'messages': messages,
        'temperature': 0.7,
    }
    if stream:
        payload['stream'] = True

    if GROQ_API_KEY:
        payload['max_tokens'] = 768
    else:
        payload['num_predict'] = 512

    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    if GROQ_API_KEY:
        headers['Authorization'] = f'Bearer {GROQ_API_KEY}'

    return Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
    )


def _ollama_fallback_reply() -> str:
    return (
        "AI response service is currently initializing or rate-limited. "
        "You can still ask career, finance, startup, or policy questions here and I'll evaluate them using our XAI decision engine."
    )


def _friendly_ollama_error(error: RuntimeError) -> str:
    lowered = str(error).lower()
    unstable_markers = (
        'cannot reach ollama',
        'timed out',
        'runner process has terminated',
        'empty response',
        'connection refused',
        'http 500',
        'http 403',
        'http 400',
        'http 404',
        'http 401',
        '1010',
        'model_decommissioned',
    )
    if any(marker in lowered for marker in unstable_markers):
        return _ollama_fallback_reply()
    return str(error)


def _call_ollama_chat_once(
    messages: list[dict[str, str]],
    timeout_seconds: int | None = None,
    max_attempts: int | None = None,
) -> str:
    request = _build_ollama_request(messages, stream=False)

    attempt = 0
    limit = int(max_attempts) if max_attempts is not None else RETRY_ATTEMPTS
    while attempt < limit:
        try:
            with urlopen(request, timeout=timeout_seconds or TIMEOUT_SECONDS) as response:
                raw = response.read().decode('utf-8')
                data = json.loads(raw)
                content = _extract_chat_content(data).strip()
                if not content:
                    raise ValueError(f'No response returned from {SERVICE_NAME}.')
                return content
        except HTTPError as exc:
            attempt += 1
            try:
                error_body = exc.read().decode('utf-8')
                error_msg = f'{SERVICE_NAME} HTTP {exc.code}: {error_body}'
            except Exception:
                error_msg = f'{SERVICE_NAME} HTTP {exc.code}: {exc.reason}'

            if attempt >= RETRY_ATTEMPTS:
                raise RuntimeError(error_msg) from exc
        except URLError as exc:
            attempt += 1
            if attempt >= RETRY_ATTEMPTS:
                raise RuntimeError(f'Cannot reach {SERVICE_NAME} at {OLLAMA_URL}. Is the service running?') from exc
        except TimeoutError as exc:
            attempt += 1
            if attempt >= RETRY_ATTEMPTS:
                raise RuntimeError(
                    f'{SERVICE_NAME} timed out after {TIMEOUT_SECONDS} seconds at {OLLAMA_URL}. '
                    'The model may still be loading or responding too slowly.'
                ) from exc
        except (ValueError, json.JSONDecodeError) as exc:
            raise RuntimeError(f'{SERVICE_NAME} request failed: {exc}') from exc


def _stream_ollama_chat(messages: list[dict[str, str]]):
    request = _build_ollama_request(messages, stream=True)

    attempt = 0
    while attempt < RETRY_ATTEMPTS:
        try:
            with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                yielded = False
                for delta in _read_streamed_response(response):
                    yielded = True
                    yield delta
                if not yielded:
                    yield f'I received an empty response from {SERVICE_NAME}.'
                return
        except HTTPError as exc:
            attempt += 1
            try:
                error_body = exc.read().decode('utf-8')
                error_msg = f'{SERVICE_NAME} HTTP {exc.code}: {error_body}'
            except Exception:
                error_msg = f'{SERVICE_NAME} HTTP {exc.code}: {exc.reason}'

            if attempt >= RETRY_ATTEMPTS:
                raise RuntimeError(error_msg) from exc
        except URLError as exc:
            attempt += 1
            if attempt >= RETRY_ATTEMPTS:
                raise RuntimeError(f'Cannot reach {SERVICE_NAME} at {OLLAMA_URL}. Is the service running?') from exc
        except TimeoutError as exc:
            attempt += 1
            if attempt >= RETRY_ATTEMPTS:
                raise RuntimeError(
                    f'{SERVICE_NAME} timed out after {TIMEOUT_SECONDS} seconds at {OLLAMA_URL}. '
                    'The model may still be loading or responding too slowly.'
                ) from exc
        except (ValueError, json.JSONDecodeError) as exc:
            raise RuntimeError(f'{SERVICE_NAME} request failed: {exc}') from exc


def _error_stream(message: str):
    yield message


def _stream_chat_response(messages: list[dict[str, str]]):
    try:
        yield from _stream_ollama_chat(messages)
    except RuntimeError as error:
        yield _friendly_ollama_error(error)


def get_chatbot_response(payload: dict[str, Any], stream: bool = True):
    latest_message = _extract_latest_user_message(payload)
    latest_message = _augment_career_followup_with_context(payload, latest_message)
    detection = classify_domain(latest_message)
    language_instruction = build_chat_language_instruction(detection.get('language', 'english'))

    # For open-ended follow-ups like "project ideas", prefer generation over fixed app templates.
    # We still attach the user's last profile context via `_augment_career_followup_with_context`.
    if _looks_like_career_followup(latest_message) and 'project' in latest_message.lower():
        messages = _prepare_messages({'message': latest_message, 'messages': payload.get('messages')}, language_instruction)
        if stream:
            return _stream_chat_response(messages)
        try:
            text = _call_ollama_chat_once(messages, timeout_seconds=5, max_attempts=1)
            return {
                'role': 'assistant',
                'content': text,
                'intent': 'career',
                'mode': 'chat',
                'detection': detection,
            }
        except RuntimeError as error:
            # Fallback to grounded reply if the chat model is unavailable.
            grounded = _grounded_domain_reply(latest_message)
            return {
                'role': 'assistant',
                'content': grounded or _friendly_ollama_error(error),
                'intent': 'career',
                'mode': 'chat',
                'detection': detection,
            }

    direct_reply = (
        _smalltalk_reply(latest_message)
        or _project_scope_reply(latest_message)
        or _general_scope_reply(latest_message)
        or _grounded_domain_reply(latest_message)
    )
    if direct_reply:
        if stream:
            return _error_stream(direct_reply)
        return {
            'role': 'assistant',
            'content': direct_reply,
            'intent': detection.get('domain', 'general'),
            'mode': 'chat',
            'detection': detection,
        }

    messages = _prepare_messages({'message': latest_message, 'messages': payload.get('messages')}, language_instruction)
    if stream:
        return _stream_chat_response(messages)

    try:
        text = _call_ollama_chat_once(messages)
        return {
            'role': 'assistant',
            'content': text,
            'intent': detection.get('domain', 'general'),
            'mode': 'chat',
            'detection': detection,
        }
    except RuntimeError as error:
        return {
            'role': 'assistant',
            'content': _friendly_ollama_error(error),
            'intent': detection.get('domain', 'general'),
            'mode': 'chat',
            'detection': detection,
        }
