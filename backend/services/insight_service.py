from __future__ import annotations

from typing import Any


DOMAIN_FEATURE_RULES = {
    'career': {
        'cgpa': {'label': 'CGPA', 'preferred': 'higher'},
        'skills_count': {'label': 'skill depth', 'preferred': 'higher'},
        'projects_count': {'label': 'project depth', 'preferred': 'higher'},
        'certifications_count': {'label': 'applied certification count', 'preferred': 'higher'},
        'masters_flag': {'label': 'advanced specialization', 'preferred': 'higher'},
        'interest': {'label': 'interest alignment'},
        'course_group': {'label': 'degree alignment'},
        'specialization_group': {'label': 'specialization alignment'},
    },
    'finance': {
        'income': {'label': 'income stability', 'preferred': 'higher'},
        'loan': {'label': 'debt load', 'preferred': 'lower'},
        'credit_score': {'label': 'credit strength', 'preferred': 'higher'},
        'loan_to_income': {'label': 'loan-to-income ratio', 'preferred': 'lower'},
    },
    'startup': {
        'funding': {'label': 'available capital', 'preferred': 'higher'},
        'team_size': {'label': 'team depth', 'preferred': 'higher'},
        'experience': {'label': 'founder experience', 'preferred': 'higher'},
        'funding_per_team': {'label': 'capital efficiency', 'preferred': 'higher'},
        'market': {'label': 'market profile'},
    },
    'policy': {
        'budget': {'label': 'budget commitment', 'preferred': 'higher'},
        'population': {'label': 'delivery scale', 'preferred': 'lower'},
        'per_capita_budget': {'label': 'per-capita allocation', 'preferred': 'higher'},
        'sector': {'label': 'sector fit'},
    },
}


def _feature_label(domain: str, feature: str, model_result: dict[str, Any]) -> str:
    labels = model_result.get('feature_labels', {}) or {}
    if feature in labels:
        return labels[feature]
    return DOMAIN_FEATURE_RULES.get(domain, {}).get(feature, {}).get('label', feature.replace('_', ' '))


def _preferred_direction(domain: str, feature: str, profile: dict[str, Any]) -> str:
    configured = DOMAIN_FEATURE_RULES.get(domain, {}).get(feature, {}).get('preferred')
    if configured:
        return configured
    positive = profile.get('positive_median')
    negative = profile.get('negative_median')
    if positive is None or negative is None:
        return 'higher'
    return 'higher' if positive >= negative else 'lower'


def build_model_driven_guidance(domain: str, input_row: dict[str, Any], model_result: dict[str, Any]) -> dict[str, Any]:
    profiles = model_result.get('profiles', {}) or {}
    numeric_profiles = profiles.get('numeric', {}) or {}
    categorical_profiles = profiles.get('categorical', {}) or {}

    gaps = []
    risks = []
    suggestions = []

    for feature, profile in numeric_profiles.items():
        current = input_row.get(feature)
        if current is None:
            continue

        try:
            current_value = float(current)
        except Exception:
            continue

        direction = _preferred_direction(domain, feature, profile)
        label = _feature_label(domain, feature, model_result)
        target = profile.get('positive_p25') if direction == 'higher' else profile.get('positive_p75')
        if target is None:
            target = profile.get('positive_median')
        if target is None:
            continue
        target_value = float(target)
        denominator = max(abs(target_value), 1.0)
        if direction == 'higher':
            gap_ratio = (target_value - current_value) / denominator
            if gap_ratio > 0.08:
                gaps.append((gap_ratio, feature, label, current_value, target_value, direction))
        else:
            gap_ratio = (current_value - target_value) / denominator
            if gap_ratio > 0.08:
                gaps.append((gap_ratio, feature, label, current_value, target_value, direction))

    gaps.sort(reverse=True)
    for _, feature, label, current_value, target_value, direction in gaps[:3]:
        if direction == 'higher':
            suggestions.append(f'Increase {label.lower()} toward {target_value:.2f}; the model sees stronger outcomes around that level than your current {current_value:.2f}.')
            risks.append(f'{label} is below the successful-profile median ({current_value:.2f} vs {target_value:.2f}).')
        else:
            suggestions.append(f'Reduce {label.lower()} closer to {target_value:.2f}; stronger outcomes in the training data usually stayed below your current {current_value:.2f}.')
            risks.append(f'{label} is above the successful-profile median ({current_value:.2f} vs {target_value:.2f}).')

    for feature, ranked_categories in categorical_profiles.items():
        if not ranked_categories:
            continue
        current = str(input_row.get(feature, '')).strip().lower()
        top_option = ranked_categories[0]
        current_option = next((item for item in ranked_categories if str(item.get('value', '')).strip().lower() == current), None)
        if current and current_option and top_option['value'] and current_option['success_rate'] + 0.12 < top_option['success_rate']:
            label = _feature_label(domain, feature, model_result)
            suggestions.append(
                f'{label} currently aligns with a lower-success segment than "{top_option["value"]}". Consider building signals that move you closer to that stronger segment.'
            )
            risks.append(
                f'{label} is currently closer to a weaker-performing segment than the strongest segment seen in training.'
            )

    if not suggestions:
        suggestions.append('Your current inputs already sit close to the stronger training profile. Focus on maintaining consistency and improving the top positive factor.')

    explanation = model_result.get('explanation', '')
    if gaps:
        top_gap = gaps[0][2]
        explanation = f'{explanation} The biggest improvement gap versus successful examples is {top_gap.lower()}.'.strip()

    return {
        'suggestions': suggestions[:3],
        'risks': risks[:3],
        'explanation': explanation,
    }
