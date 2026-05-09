import re


SECTION_BREAKS = r"(?=\b(?:cgpa|gpa|skills?|expertise|projects?|interest|income|salary|loan|debt|credit score|credit|funding|capital|team size|team|market|experience|years|sector|budget|funds|population|people|urgency|priority|political support|political|infrastructure readiness|infrastructure|risk level|risk)\b|$)"
VALID_CAREER_CLASSES = [
    'cloud_devops',
    'cybersecurity',
    'data_science',
    'product_management',
    'software_development',
]

CAREER_OPTION_NORMALIZATION = {
    'hr': 'product_management',
    'human resources': 'product_management',
    'management': 'product_management',
    'managerial': 'product_management',
    'mba': 'product_management',
    'product management': 'product_management',
    'business analyst': 'product_management',
    'technical': 'software_development',
    'developer': 'software_development',
    'development': 'software_development',
    'coding': 'software_development',
    'software': 'software_development',
    'software development': 'software_development',
    'software engineering': 'software_development',
    'technical jobs': 'software_development',
    'cybersecurity': 'cybersecurity',
    'security': 'cybersecurity',
    'cloud': 'cloud_devops',
    'devops': 'cloud_devops',
    'cloud devops': 'cloud_devops',
    'cloud / devops': 'cloud_devops',
    'data science': 'data_science',
    'data scientist': 'data_science',
    'ai': 'data_science',
    'ml': 'data_science',
    'machine learning': 'data_science',
}

FILLER_PATTERNS = [
    r'\bplease compare\b',
    r'\btell me\b',
    r'\bwhat should i do\b',
    r'\bwhat are my chances\b',
    r'\bwhat is my chance\b',
    r'\bmy chances of success\b',
    r'\btell me my chances of success\b',
    r'\bwhat i should focus on\b',
    r'\bwhat should i focus on\b',
    r'\bsuggest me\b',
    r'\bsuggest\b',
    r'\bcan you\b',
    r'\bhelp me decide\b',
    r'\bi am confused\b',
]

GENERIC_OPTION_PATTERNS = [
    r'chances? of success',
    r'focus on',
    r'should i do',
    r'tell me',
    r'suggest me',
    r'what should',
    r'which is better',
    r'better for me',
]


def clean_prompt_text(text):
    cleaned = str(text or '').lower()
    cleaned = re.sub(r'[\?\!]+', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    for pattern in FILLER_PATTERNS:
        cleaned = re.sub(pattern, ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned.strip(' ,.-')


def _extract_number(text, keys, allow_fallback=True):
    text_lower = text.lower()
    for key in keys:
        m = re.search(rf"\b{re.escape(key)}\b\D*([0-9]+(?:\.[0-9]+)?)", text_lower)
        if m:
            return float(m.group(1))
        m = re.search(rf"\b([0-9]+(?:\.[0-9]+)?)\b\D{{0,10}}\b{re.escape(key)}\b", text_lower)
        if m:
            return float(m.group(1))

    if not allow_fallback:
        return None

    fallback = re.search(r"([0-9]+(?:\.[0-9]+)?)", text_lower)
    return float(fallback.group(1)) if fallback else None


def _split_items(value):
    items = re.split(r",|;|\band\b|\bor\b|/|\n", value)
    cleaned = []
    seen = set()
    for item in items:
        candidate = item.strip(" .:-")
        candidate_key = candidate.lower()
        if candidate and candidate_key not in seen:
            seen.add(candidate_key)
            cleaned.append(candidate)
    return cleaned


def _extract_section(text, keys):
    for key in keys:
        pattern = rf"\b{re.escape(key)}\b[:\s=\-]*(.*?){SECTION_BREAKS}"
        match = re.search(pattern, text.lower(), flags=re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip(" .:-,=")
    return ""


def _extract_list(text, keys, fallback=None):
    section = _extract_section(text, keys)
    if section:
        items = _split_items(section)
        if items:
            return items
    return fallback or []


def _normalize_candidate_option(option_text):
    candidate = re.sub(r'^(?:a|an|the)\s+', '', str(option_text or '').strip().lower())
    candidate = re.sub(r'\s+', ' ', candidate).strip(' .,:;-')
    if not candidate:
        return None
    if len(candidate.split()) > 5:
        return None
    if any(re.search(pattern, candidate) for pattern in GENERIC_OPTION_PATTERNS):
        return None
    for phrase, normalized in sorted(CAREER_OPTION_NORMALIZATION.items(), key=lambda item: len(item[0]), reverse=True):
        if re.search(rf'\b{re.escape(phrase)}\b', candidate):
            return normalized
    return None


def _extract_career_option_segments(cleaned_text):
    segments = []
    patterns = [
        r'whether i should\s+(.+?)(?:$|\b(?:based on|for my|with my|considering)\b)',
        r'choose between\s+(.+?)(?:$|\b(?:based on|for my|with my|considering)\b)',
        r'confused between\s+(.+?)(?:$|\b(?:based on|for my|with my|considering)\b)',
        r'between\s+(.+?)(?:$|\b(?:based on|for my|with my|considering)\b)',
    ]
    for pattern in patterns:
        match = re.search(pattern, cleaned_text, flags=re.IGNORECASE)
        if match:
            segments.append(match.group(1))
    return segments


def extract_career_options(text, interest=None):
    cleaned = clean_prompt_text(text)
    segments = _extract_career_option_segments(cleaned)
    candidates = []
    for segment in segments:
        candidates.extend(re.split(r'\s*(?:,|/|\bvs\b|\bversus\b|\bor\b|\band\b)\s*', segment, flags=re.IGNORECASE))

    normalized = []
    for candidate in candidates:
        mapped = _normalize_candidate_option(candidate)
        if mapped and mapped in VALID_CAREER_CLASSES and mapped not in normalized:
            normalized.append(mapped)

    if not normalized and interest:
        fallback = _normalize_candidate_option(interest)
        if fallback and fallback in VALID_CAREER_CLASSES:
            normalized.append(fallback)

    return normalized


def _extract_interest(prompt_lower):
    if any(token in prompt_lower for token in ['hr', 'human resources', 'management', 'mba', 'product']):
        return 'management'
    if any(token in prompt_lower for token in ['technical', 'developer', 'coding', 'software']):
        return 'technical'
    if any(token in prompt_lower for token in ['data science', 'machine learning', 'ml', 'ai']):
        return 'data'
    return ''


def _extract_policy_options(text):
    lowered = text.lower()
    primary = ''
    alternative = ''

    if 'free laptop' in lowered or 'free laptops' in lowered:
        primary = 'free laptops for students'
    if 'digital infrastructure' in lowered or 'smart classrooms' in lowered or 'internet access' in lowered:
        alternative = 'digital infrastructure like internet access and smart classrooms'

    alt_match = re.search(r'alternative policy\s*\((.*?)\)', text, flags=re.IGNORECASE)
    if alt_match:
        alternative = alt_match.group(1).strip()

    return primary, alternative


def _extract_skills_from_sentence(text):
    match = re.search(r"skills?\s+in\s+(.+?)(?:\.|;| but | and i | between | considering | confused )", text, flags=re.IGNORECASE)
    if not match:
        return []
    skills_text = match.group(1)
    cleaned = re.sub(r'\bi am\b.*$', '', skills_text, flags=re.IGNORECASE).strip(' ,.')
    return [re.sub(r'^\s*in\s+', '', item, flags=re.IGNORECASE).strip() for item in _split_items(cleaned)]


def parse_prompt(domain, prompt_text):
    prompt_lower = prompt_text.lower()

    if domain == 'career':
        skills = _extract_skills_from_sentence(prompt_text)
        if not skills:
            skills = _extract_list(prompt_text, ['skills', 'skill', 'expertise'], None)
        projects = _extract_list(prompt_text, ['projects', 'project'], [])
        interest = _extract_interest(prompt_lower)
        options = extract_career_options(prompt_text, interest=interest)
        return {
            'options': options,
            'features': {
                'cgpa': _extract_number(prompt_text, ['cgpa', 'gpa'], allow_fallback=False),
                'skills': skills,
                'projects': projects,
                'interest': interest,
                'experience': _extract_number(prompt_text, ['experience', 'years'], allow_fallback=False),
            },
        }

    if domain == 'finance':
        return {
            'options': [],
            'features': {
                'income': _extract_number(prompt_text, ['income', 'salary'], allow_fallback=False),
                'loan': _extract_number(prompt_text, ['loan', 'debt'], allow_fallback=False),
                'credit_score': _extract_number(prompt_text, ['credit score', 'credit'], allow_fallback=False),
            },
        }

    if domain == 'startup':
        market = _extract_section(prompt_text, ['market']) or ('enterprise' if 'enterprise' in prompt_lower else 'consumer' if 'consumer' in prompt_lower else '')
        return {
            'options': [],
            'features': {
                'funding': _extract_number(prompt_text, ['funding', 'capital'], allow_fallback=False),
                'team_size': _extract_number(prompt_text, ['team size', 'team'], allow_fallback=False),
                'market': 'enterprise' if 'enterprise' in market else 'consumer' if 'consumer' in market else market,
                'experience': _extract_number(prompt_text, ['experience', 'years'], allow_fallback=False),
            },
        }

    if domain == 'policy':
        sector = _extract_section(prompt_text, ['sector'])
        primary_option, alternative_option = _extract_policy_options(prompt_text)
        urgency = _extract_section(prompt_text, ['urgency', 'priority'])
        political_support = _extract_section(prompt_text, ['political_support', 'political support', 'political'])
        infrastructure = _extract_section(prompt_text, ['infrastructure_readiness', 'infrastructure readiness', 'infrastructure', 'infra'])
        risk_level = _extract_section(prompt_text, ['risk_level', 'risk level', 'risk'])

        # Many real prompts are comma-separated key/value pairs. If section parsing
        # still captures trailing fields, trim at the first comma.
        def _trim(value: str) -> str:
            value = (value or "").strip()
            if "," in value:
                value = value.split(",", 1)[0].strip()
            return value

        return {
            'options': [item for item in [primary_option, alternative_option] if item],
            'features': {
                'sector': _trim(sector),
                'budget': _extract_number(prompt_text, ['budget', 'funds'], allow_fallback=False),
                'population': _extract_number(prompt_text, ['population', 'people'], allow_fallback=False),
                'urgency': _trim(urgency),
                'political_support': _trim(political_support),
                'infrastructure_readiness': _trim(infrastructure),
                'risk_level': _trim(risk_level),
            },
        }

    return {'options': [], 'features': {}}
