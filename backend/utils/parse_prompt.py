import re


SECTION_BREAKS = r"(?=\b(?:cgpa|gpa|skills?|expertise|projects?|interest|income|salary|loan|debt|credit score|credit|funding|capital|team size|team|market|experience|years|sector|budget|funds|population|people)\b|$)"
CAREER_PATH_ALIASES = {
    'data science': 'data_science',
    'data scientist': 'data_science',
    'machine learning': 'data_science',
    'software development': 'software_development',
    'software developer': 'software_development',
    'software engineering': 'software_development',
    'software engineer': 'software_development',
    'web development': 'software_development',
    'cloud': 'cloud_devops',
    'devops': 'cloud_devops',
    'cybersecurity': 'cybersecurity',
    'product management': 'product_management',
}


def _extract_number(text, keys, allow_fallback=True):
    text_lower = text.lower()
    for key in keys:
      m = re.search(rf"\b{re.escape(key)}\b\D*([0-9]+(?:\.[0-9]+)?)", text_lower)
      if m:
          return float(m.group(1))

    if not allow_fallback:
        return None

    fallback = re.search(r"([0-9]+(?:\.[0-9]+)?)", text_lower)
    return float(fallback.group(1)) if fallback else None


def _split_items(value):
    items = re.split(r",|;|\band\b|\bor\b|/|\n", value)
    cleaned = []
    for item in items:
        candidate = item.strip(" .:-")
        if candidate:
            cleaned.append(candidate)
    return cleaned


def _extract_section(text, keys):
    for key in keys:
        pattern = rf"\b{re.escape(key)}\b[:\s-]*(.*?){SECTION_BREAKS}"
        match = re.search(pattern, text.lower(), flags=re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip(" .:-")
    return ""


def _extract_list(text, keys, fallback=None):
    section = _extract_section(text, keys)
    if section:
        items = _split_items(section)
        if items:
            return items
    return fallback or []


def _extract_paths(text):
    lowered = text.lower()
    paths = []
    for phrase, normalized in CAREER_PATH_ALIASES.items():
        if phrase in lowered and normalized not in paths:
            paths.append(normalized)
    return paths


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
        if not skills:
            skills = ['communication', 'teamwork']
        projects = _extract_list(prompt_text, ['projects', 'project'], ['capstone'])
        year_match = re.search(r'([1-5](?:st|nd|rd|th)?)[-\s]?year', prompt_text.lower())
        year_of_study = float(re.search(r'[1-5]', year_match.group(1)).group()) if year_match else 2.0
        specialization_match = re.search(r'(computer science|information technology|electronics|mechanical|civil|business|mathematics)', prompt_text, flags=re.IGNORECASE)
        specialization = specialization_match.group(1) if specialization_match else 'computer science'
        paths = _extract_paths(prompt_text)
        if len(paths) >= 2:
            interest = 'technical'
        else:
            interest = 'technical' if 'technical' in prompt_lower else 'management' if 'management' in prompt_lower else 'data'
        return {
            'cgpa': _extract_number(prompt_text, ['cgpa', 'gpa'], allow_fallback=False) or 7.0,
            'skills': skills,
            'projects': projects,
            'interest': interest,
            'paths': paths,
            'year_of_study': year_of_study,
            'specialization': specialization,
            'goal': prompt_text,
        }

    if domain == 'finance':
        return {
            'income': _extract_number(prompt_text, ['income', 'salary']) or 50000,
            'loan': _extract_number(prompt_text, ['loan', 'debt']) or 15000,
            'credit_score': _extract_number(prompt_text, ['credit score', 'credit']) or 650,
        }

    if domain == 'startup':
        market = _extract_section(prompt_text, ['market']) or ('enterprise' if 'enterprise' in prompt_lower else 'consumer')
        return {
            'funding': _extract_number(prompt_text, ['funding', 'capital']) or 100000,
            'team_size': _extract_number(prompt_text, ['team size', 'team']) or 5,
            'market': 'enterprise' if 'enterprise' in market else 'consumer' if 'consumer' in market else market or 'consumer',
            'experience': _extract_number(prompt_text, ['experience', 'years']) or 2,
        }

    if domain == 'policy':
        sector = _extract_section(prompt_text, ['sector'])
        if not sector:
            sector = 'healthcare' if 'health' in prompt_lower else 'education' if 'education' in prompt_lower else 'infrastructure'
        return {
            'sector': sector,
            'budget': _extract_number(prompt_text, ['budget', 'funds']) or 1000000,
            'population': _extract_number(prompt_text, ['population', 'people']) or 500000,
        }

    return {}
