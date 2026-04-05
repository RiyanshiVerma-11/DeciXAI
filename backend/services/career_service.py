from __future__ import annotations

from services.hybrid_decision_service import analyze_career_profile, normalize_career_input, parse_career_prompt


def get_career_decision(data: dict) -> dict:
    """
    Pure model-driven career decision - delegates to hybrid service.
    No hardcoded logic, templates, or constants.
    """
    normalized = normalize_career_input(data)
    return analyze_career_profile(normalized, source='api')


def get_career_comparison(data: dict) -> dict:
    """
    Career path comparison - pure model-driven via hybrid service.
    """
    normalized = normalize_career_input(data)
    return analyze_career_profile(normalized, source='comparison')


def get_career_analysis_from_text(prompt: str) -> dict:
    """
    Text-based career analysis - pure parsing + model.
    """
    parsed = parse_career_prompt(prompt)
    response = analyze_career_profile(parsed, source='text')
    response['intent'] = 'career'
    response['parsed_input'] = parsed
    return response
