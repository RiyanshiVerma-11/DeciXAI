from __future__ import annotations

import pandas as pd

from services.insight_service import build_model_driven_guidance
from services.model_service import predict_with_model


def get_policy_decision(data):
    sector = str(data.get('sector', 'infrastructure')).lower()
    budget = float(data.get('budget', 1000000))
    population = max(float(data.get('population', 500000)), 1.0)
    per_capita_budget = budget / population

    model_frame = pd.DataFrame([{
        'sector': sector,
        'budget': budget,
        'population': population,
        'per_capita_budget': per_capita_budget,
    }])
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

    score = min(1.0, (per_capita_budget / 10000) + {'healthcare': 0.3, 'education': 0.25, 'infrastructure': 0.2}.get(sector, 0.2))
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
