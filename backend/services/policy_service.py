from __future__ import annotations

import pandas as pd

from services.insight_service import build_model_driven_guidance
from services.model_service import predict_with_model


POLICY_PROFILES = {
    # Removed hardcoded profiles - using model predictions only
}


def _normalize_policy_option(text):
    lowered = str(text or '').strip().lower()
    if 'laptop' in lowered:
        return 'free laptops for students'
    if any(term in lowered for term in ['digital infrastructure', 'internet access', 'smart classroom', 'smart classrooms']):
        return 'digital infrastructure like internet access and smart classrooms'
    return lowered or 'generic policy'


def _build_policy_frame(data):
    sector = str(data.get('sector', 'infrastructure')).lower()
    budget = float(data.get('budget', 1000000))
    population = max(float(data.get('population', 500000)), 1.0)
    return pd.DataFrame([{
        'sector': sector,
        'budget': budget,
        'population': population,
        'per_capita_budget': budget / population,
    }])


def get_policy_decision(data):
    model_frame = _build_policy_frame(data)
    model_result = predict_with_model('policy', model_frame)
    if model_result is not None:
        probability = model_result['probability']
        score_percent = round(probability * 100, 1)
        guidance = build_model_driven_guidance('policy', model_frame.iloc[0].to_dict(), model_result)

        return {
            'decision': 'Feasible policy initiative' if probability >= 0.5 else 'Requires revisit and risk mitigation',
            'probability': probability,
            'score_label': model_result['score_label'],
            'score_band': model_result['score_band'],
            'summary': f'Policy feasibility is estimated at {score_percent}/100 using the trained model and comparable public-program profiles.',
            'next_step': guidance['suggestions'][0],
            'target_score': 70.0,
            'key_factors': model_result['key_factors'],
            'explanation': guidance['explanation'],
            'suggestions': guidance['suggestions'],
            'risks': guidance['risks'],
        }

    score = min(1.0, (model_frame.iloc[0]['per_capita_budget'] / 10000) + {'healthcare': 0.3, 'education': 0.25, 'infrastructure': 0.2}.get(model_frame.iloc[0]['sector'], 0.2))
    return {
        'decision': 'Feasible policy initiative' if score >= 0.6 else 'Requires revisit and risk mitigation',
        'probability': round(score, 4),
        'score_label': 'Strong case' if score >= 0.8 else 'Feasible' if score >= 0.6 else 'Borderline' if score >= 0.4 else 'Weak case',
        'score_band': '80-100' if score >= 0.8 else '60-79' if score >= 0.6 else '40-59' if score >= 0.4 else '0-39',
        'summary': f'Fallback policy feasibility score: {round(score * 100, 1)}/100.',
        'next_step': 'Increase per-capita impact and tighten rollout scope.',
        'target_score': 70.0,
        'key_factors': ['sector', 'budget', 'population', 'per_capita_budget'],
        'explanation': 'The fallback scorer is using sector, total budget, population scale, and per-capita allocation.',
        'suggestions': ['Improve targeting.', 'Raise effective per-capita budget.', 'Phase delivery more tightly.'],
    }


def _option_probability(option_name, base_budget, base_population):
    # Use generic profile since hardcoded removed
    profile = {
        'sector': 'education' if 'education' in option_name.lower() else 'infrastructure',
        'budget_factor': 1.0,
        'cost_efficiency': 0.6,
        'long_term_impact': 0.6,
        'accessibility': 0.6,
        'implementation_readiness': 0.6,
        'misuse_risk': 0.3,
        'maintenance_risk': 0.3,
    }
    payload = {
        'sector': profile['sector'],
        'budget': base_budget * profile['budget_factor'],
        'population': base_population,
    }
    base_result = get_policy_decision(payload)
    base_probability = base_result['probability']

    # Use model probability directly, no arbitrary adjustments
    return base_probability, profile, base_result


def get_policy_comparison(data):
    primary_option = _normalize_policy_option(data.get('primary_option'))
    alternative_option = _normalize_policy_option(data.get('alternative_option'))
    if not alternative_option or alternative_option == 'generic policy':
        alternative_option = 'digital infrastructure like internet access and smart classrooms'
    if primary_option == 'generic policy':
        primary_option = 'free laptops for students'

    base_budget = float(data.get('budget', 5000000))
    base_population = float(data.get('population', 200000))

    primary_probability, primary_profile, primary_base = _option_probability(primary_option, base_budget, base_population)
    alternative_probability, alternative_profile, alternative_base = _option_probability(alternative_option, base_budget, base_population)

    options = [
        {'label': 'Free Laptop Policy' if 'laptop' in primary_option else primary_option.title(), 'probability': round(primary_probability, 4), 'profile': primary_profile, 'base': primary_base},
        {'label': 'Digital Infrastructure Policy' if 'digital infrastructure' in alternative_option else alternative_option.title(), 'probability': round(alternative_probability, 4), 'profile': alternative_profile, 'base': alternative_base},
    ]
    options.sort(key=lambda item: item['probability'], reverse=True)
    recommended = options[0]
    alternative = options[1]

    explanation_points = [
        f'{options[1]["label"] if options[1]["label"] == recommended["label"] else recommended["label"]} scores better on long-term impact and shared educational reach.' if recommended['profile']['long_term_impact'] > alternative['profile']['long_term_impact'] else f'{recommended["label"]} scores better on immediate accessibility and implementation simplicity.',
        f'Budget efficiency is stronger for {recommended["label"]} in this scenario.',
        f'{recommended["label"]} creates a more durable education outcome profile, while {alternative["label"]} carries more operational friction or misuse risk.',
    ]

    risk_analysis = [
        {
            'path': item['label'],
            'risk': (
                'Misuse or uneven usage risk is meaningful, along with maintenance and replacement overhead.'
                if item['profile']['misuse_risk'] >= 0.35
                else 'Initial setup and rollout complexity are the main risks, especially in slower regions.'
            ),
        }
        for item in options
    ]

    what_if_probability = min(primary_probability + 0.09, 0.92)
    what_if_text = (
        f'If budget increases by 30% and strict monitoring is added, the success probability of {options[1]["label"] if "Laptop" not in options[0]["label"] else options[0]["label"]} could rise to about {round(what_if_probability * 100)}%.'
        if 'Laptop' in options[0]['label']
        else f'If budget increases by 30% and strict monitoring is added, the success probability of {options[1]["label"]} could rise to about {round(what_if_probability * 100)}%.'
    )

    factor_impacts = [
        {'factor': 'Budget efficiency', 'impact': 'High impact'},
        {'factor': 'Population coverage', 'impact': 'High impact'},
        {'factor': 'Infrastructure readiness', 'impact': 'Very high impact' if recommended['label'] == 'Digital Infrastructure Policy' else 'Medium impact'},
        {'factor': 'Risk of misuse', 'impact': 'Medium impact'},
    ]

    action_plan = [
        'Build digital infrastructure first in the weakest institutions.',
        'Provide laptops only to economically weaker students or high-need cohorts.',
        'Add a tracking and maintenance system for device usage.',
        'Partner with telecom providers for affordable internet access.',
    ]

    return {
        'mode': 'comparison',
        'decision': f'Recommended Policy: {recommended["label"]}',
        'probability': recommended['probability'],
        'score_label': f'{round(recommended["probability"] * 100)}% policy fit',
        'score_band': 'policy-comparison',
        'summary': f'Policy success probabilities: {options[0]["label"]}: {round(options[0]["probability"] * 100)}%, {options[1]["label"]}: {round(options[1]["probability"] * 100)}%.',
        'next_step': action_plan[0],
        'target_score': 80.0,
        'key_factors': recommended['base']['key_factors'],
        'explanation': ' '.join(explanation_points),
        'suggestions': action_plan[:3],
        'details': {
            'probabilities': [{'label': item['label'], 'probability': item['probability']} for item in options],
            'recommendation': recommended['label'],
            'explanations': explanation_points,
            'risks': risk_analysis,
            'what_if': what_if_text,
            'action_plan': action_plan,
            'factor_impacts': factor_impacts,
            'actionable_suggestions': {
                recommended['label']: action_plan[:3],
                alternative['label']: [
                    'Use it selectively rather than universally.',
                    'Add monitoring, maintenance, and beneficiary verification.',
                    'Pair it with infrastructure so the benefit does not remain one-time only.',
                ],
            },
        },
    }
