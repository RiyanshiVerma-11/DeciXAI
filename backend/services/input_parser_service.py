from __future__ import annotations

import re

from services.domain_classifier_service import classify_domain
from utils.parse_prompt import clean_prompt_text, parse_prompt


DOMAIN_KEYWORDS = {
    'career': [
        'career', 'job', 'student', 'experience', 'cgpa', 'gpa', 'skills', 'projects', 'internship',
        'resume', 'placement', 'machine learning', 'data science', 'dsa', 'software development',
    ],
    'finance': ['finance', 'loan', 'credit', 'income', 'investment', 'debt'],
    'startup': [
        'startup', 'business', 'funding', 'raised', 'venture', 'founder', 'team size',
        'runway', 'b2b', 'b2c', 'saas', 'market fit', 'traction',
    ],
    'policy': ['policy', 'government', 'students', 'education policy', 'infrastructure', 'budget'],
}

DOMAIN_PRIORITY = ['startup', 'career', 'finance', 'policy']

POLICY_OPTIONS = {
    'free laptop': 'Free Laptop Policy',
    'free laptops': 'Free Laptop Policy',
    'digital infrastructure': 'Digital Infrastructure Policy',
    'internet access': 'Digital Infrastructure Policy',
    'smart classrooms': 'Digital Infrastructure Policy',
}

OPTION_STOP_TOKENS = [
    'consider factors',
    'predict the probability',
    'recommend the better',
    'recommend the best',
    'explain the reasoning',
    'suggest improvements',
    'to maximize impact',
    'to maximize my chances',
    'which is better',
    'tell me my chances of success',
    'what i should focus on',
    'what should i focus on',
]

ACTION_LEADERS = [
    'build', 'building', 'expand', 'expanding', 'invest', 'investing', 'launch', 'launching',
    'pursue', 'pursuing', 'choose', 'choosing', 'take', 'taking', 'delay', 'delaying',
    'create', 'creating', 'open', 'opening', 'provide', 'providing',
]


def _canonicalize_option(domain: str, option: str) -> str:
    cleaned = re.sub(r'^\s*(?:a|an|the)\s+', '', str(option or '').strip(), flags=re.IGNORECASE)
    lowered = cleaned.lower()

    if domain == 'policy':
        for phrase, label in POLICY_OPTIONS.items():
            if phrase in lowered:
                return label
    if domain in {'startup', 'business'}:
        if 'enterprise' in lowered or 'b2b' in lowered or 'saas' in lowered:
            return 'Enterprise Startup'
        if 'consumer' in lowered or 'b2c' in lowered:
            return 'Consumer Startup'
    if domain == 'finance':
        if 'loan' in lowered or 'borrow' in lowered:
            return 'Take the Loan'
        if 'wait' in lowered or 'delay' in lowered:
            return 'Delay the Loan'

    return cleaned.strip()


def _trim_option_tail(option: str) -> str:
    cleaned = re.sub(r'\s+', ' ', str(option or '')).strip(' .;:-')
    lowered = cleaned.lower()
    cut_positions = [len(cleaned)]
    for token in OPTION_STOP_TOKENS:
        idx = lowered.find(token)
        if idx > 0:
            cut_positions.append(idx)
    return cleaned[:min(cut_positions)].strip(' .;:-')


def _clean_option(domain: str, option: str) -> str:
    trimmed = _trim_option_tail(option)
    return _canonicalize_option(domain, trimmed)


def _dedupe_options(options: list[str]) -> list[str]:
    unique = []
    seen = set()
    for option in options:
        normalized = re.sub(r'\s+', ' ', option.strip()).lower()
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique.append(option.strip())
    return unique


def _extract_numbered_or_bulleted_options(text: str, domain: str) -> list[str]:
    pattern = r'(?:^|\n)\s*(?:[-*•]\s+|\d+[\).\:-]\s+|option\s+[a-z0-9]+[:\).-]\s+)(.+)'
    matches = re.findall(pattern, text, flags=re.IGNORECASE)
    return [_clean_option(domain, match) for match in matches if _clean_option(domain, match)]


def _extract_between_or_vs_options(text: str, domain: str) -> list[str]:
    patterns = [
        r'between\s+(.+?)\s+and\s+(.+?)(?:[.;,\n]|$)',
        r'considering\s+(.+?)\s+(?:vs|versus)\s+(.+?)(?:[.;,\n]|$)',
        r'considering\s+(.+?)\s+or\s+(.+?)(?:[.;,\n]|$)',
        r'(.+?)\s+(?:vs|versus)\s+(.+?)(?:[.;,\n]|$)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return [cleaned for cleaned in (_clean_option(domain, part) for part in match.groups()) if cleaned]
    return []


def _extract_or_and_sentence_options(text: str, domain: str) -> list[str]:
    lowered = text.lower()
    verb_match = re.search(
        rf'(?:{"|".join(ACTION_LEADERS)})\s+(.+?)\s+(?:or|and)\s+(.+?)(?:[.;,\n]|$)',
        lowered,
        flags=re.IGNORECASE,
    )
    if not verb_match:
        return []

    left, right = verb_match.groups()
    left_clean = _clean_option(domain, left)
    right_clean = _clean_option(domain, right)
    return [option for option in [left_clean, right_clean] if option]


def _domain_specific_fallbacks(text: str, domain: str) -> list[str]:
    lowered = text.lower()
    options = []
    if domain == 'policy':
        for phrase, label in POLICY_OPTIONS.items():
            if phrase in lowered:
                options.append(label)
    elif domain in {'startup', 'business'}:
        if 'consumer' in lowered:
            options.append('Consumer Startup')
        if any(word in lowered for word in ['enterprise', 'b2b', 'saas']):
            options.append('Enterprise Startup')
    return _dedupe_options(options)


def _first_number(text: str, keys: list[str], default: float | None = None) -> float | None:
    lowered = text.lower()
    for key in keys:
        match = re.search(rf'\b{re.escape(key)}\b\D*([0-9]+(?:\.[0-9]+)?)', lowered)
        if match:
            return float(match.group(1))
    return default


def _extract_list_after(text: str, labels: list[str]) -> list[str]:
    for label in labels:
        match = re.search(rf'{re.escape(label)}\s+(?:in|:)?\s*(.+?)(?:\.|;|$)', text, flags=re.IGNORECASE)
        if match:
            return [
                item.strip(' .:-')
                for item in re.split(r',|;|\band\b|\bor\b|/|\n', match.group(1), flags=re.IGNORECASE)
                if item.strip(' .:-')
            ]
    return []


def detect_domain(message: str) -> str:
    classified = classify_domain(message)
    if classified.get('domain'):
        return classified['domain']

    lowered = message.lower()
    for domain in DOMAIN_PRIORITY:
        if any(keyword in lowered for keyword in DOMAIN_KEYWORDS[domain]):
            return domain
    return 'career'


def extract_options(text: str, domain: str | None = None) -> list[str]:
    domain = domain or detect_domain(text)

    primary_pass = _dedupe_options([
        *_extract_numbered_or_bulleted_options(text, domain),
        *_extract_between_or_vs_options(text, domain),
    ])
    if len(primary_pass) >= 2:
        return primary_pass[:4]

    fallback_pass = _dedupe_options([
        *primary_pass,
        *_extract_or_and_sentence_options(text, domain),
        *_domain_specific_fallbacks(text, domain),
    ])
    if len(fallback_pass) >= 2:
        return fallback_pass[:4]

    raise ValueError('Could not detect multiple options')


def extract_factors(message: str, domain: str) -> dict:
    lowered = message.lower()
    cleaned = clean_prompt_text(message)
    parsed = parse_prompt(domain, message)
    parsed_features = parsed.get('features', {})
    factors = {
        'raw_prompt': message,
        'budget': _first_number(message, ['budget', 'cost', 'funds'], 1_000_000),
        'population': _first_number(message, ['population', 'students', 'people'], 500_000),
        'income': _first_number(message, ['income', 'salary'], 60_000),
        'loan': _first_number(message, ['loan', 'debt'], 15_000),
        'credit_score': _first_number(message, ['credit score', 'credit'], 680),
        'funding': _first_number(message, ['funding', 'capital'], 250_000),
        'team_size': _first_number(message, ['team size', 'team'], 6),
        'experience': _first_number(message, ['experience', 'years'], 3),
        'cgpa': parsed_features.get('cgpa', _first_number(message, ['cgpa', 'gpa'], 7.0)),
        'skills': parsed_features.get('skills') or _extract_list_after(message, ['skills', 'skill set']) or [],
        'projects': parsed_features.get('projects') or _extract_list_after(message, ['projects', 'project']) or [],
        'interest': parsed_features.get('interest') or '',
        'market_type': 'enterprise' if any(word in lowered for word in ['enterprise', 'b2b', 'saas']) else 'consumer',
        # Prefer structured sector extraction for policy prompts.
        'sector': parsed_features.get('sector') or ('education' if 'education' in lowered or 'college' in lowered or 'student' in lowered else 'infrastructure'),
        'risk_focus': 'high' if any(word in lowered for word in ['risk', 'misuse', 'challenge']) else 'medium',
        'impact_focus': 'high' if any(word in lowered for word in ['long-term impact', 'future scope', 'growth']) else 'medium',
        'compare_requested': len(parsed.get('options', [])) > 1 or any(word in lowered for word in ['compare', 'between', 'alternative', 'vs', 'versus', 'confused']),
    }

    # Policy governance fields (used by the hybrid policy scorer).
    if domain == 'policy':
        for key in ('urgency', 'political_support', 'infrastructure_readiness', 'risk_level'):
            if parsed_features.get(key):
                factors[key] = parsed_features.get(key)

    if domain == 'policy' and factors['population'] == 500_000 and 'college' in lowered:
        factors['population'] = 200_000

    return factors


def parse_natural_language_input(message: str) -> dict:
    detection = classify_domain(message)
    domain = detection['domain']
    factors = extract_factors(message, domain)
    try:
        options = extract_options(message, domain)
    except ValueError:
        options = []
        factors['option_error'] = 'Could not detect multiple options'
    return {
        'domain': domain,
        'options': options,
        'factors': factors,
        'detection': detection,
    }
