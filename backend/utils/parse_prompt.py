import re


SECTION_BREAKS = r"(?=\b(?:cgpa|gpa|skills?|expertise|projects?|interest|income|salary|loan|debt|credit score|credit|funding|capital|team size|team|market|experience|years|sector|budget|funds|population|people)\b|$)"


def _extract_number(text, keys):
    text_lower = text.lower()
    for key in keys:
      m = re.search(rf"\b{re.escape(key)}\b\D*([0-9]+(?:\.[0-9]+)?)", text_lower)
      if m:
          return float(m.group(1))

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


def parse_prompt(domain, prompt_text):
    prompt_lower = prompt_text.lower()

    if domain == 'career':
        skills = _extract_list(prompt_text, ['skills', 'skill', 'expertise'], ['communication', 'teamwork'])
        projects = _extract_list(prompt_text, ['projects', 'project'], ['capstone'])
        return {
            'cgpa': _extract_number(prompt_text, ['cgpa', 'gpa']) or 7.0,
            'skills': skills,
            'projects': projects,
            'interest': 'technical' if 'technical' in prompt_lower else 'management' if 'management' in prompt_lower else 'data',
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
