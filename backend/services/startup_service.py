from __future__ import annotations

import pandas as pd

from services.insight_service import build_model_driven_guidance
from services.model_service import predict_with_model


def get_startup_decision(data):
    funding = float(data.get('funding', 100000))
    team_size = max(int(data.get('team_size', 5)), 1)
    market = str(data.get('market', 'consumer')).lower()
    experience = float(data.get('experience', 2))
    funding_per_team = funding / team_size

    model_frame = pd.DataFrame([{
        'funding': funding,
        'team_size': team_size,
        'market': market,
        'experience': experience,
        'funding_per_team': funding_per_team,
    }])
    model_result = predict_with_model('startup', model_frame)
    if model_result is not None:
        probability = model_result['probability']
        score_percent = round(probability * 100, 1)
        guidance = build_model_driven_guidance('startup', model_frame.iloc[0].to_dict(), model_result)

        return {
            'decision': 'Strong startup potential' if probability >= 0.5 else 'Needs improved execution and metrics',
            'probability': probability,
            'score_label': model_result['score_label'],
            'score_band': model_result['score_band'],
            'summary': f'Startup readiness is estimated at {score_percent}/100 using the trained model and stronger historical profiles.',
            'next_step': guidance['suggestions'][0],
            'target_score': 80.0,
            'key_factors': model_result['key_factors'],
            'explanation': guidance['explanation'],
            'suggestions': guidance['suggestions'],
            'risks': guidance['risks'],
        }

    score = min(1.0, (funding / 100000) * 0.35 + (team_size / 20) * 0.25 + (experience / 10) * 0.2 + (1.2 if market == 'enterprise' else 1.0) * 0.2)
    return {
        'decision': 'Strong startup potential' if score >= 0.55 else 'Needs improved execution and metrics',
        'probability': round(score, 4),
        'score_label': 'Investor ready' if score >= 0.8 else 'Promising' if score >= 0.6 else 'Early stage' if score >= 0.4 else 'Fragile',
        'score_band': '80-100' if score >= 0.8 else '60-79' if score >= 0.6 else '40-59' if score >= 0.4 else '0-39',
        'summary': f'Fallback startup readiness score: {round(score * 100, 1)}/100.',
        'next_step': 'Improve traction proof and capital planning.',
        'target_score': 80.0,
        'key_factors': ['funding', 'team_size', 'experience', 'market'],
        'explanation': 'The fallback scorer is using capital, team depth, founder experience, and market type.',
        'suggestions': ['Strengthen the team.', 'Improve capital efficiency.', 'Validate demand with traction.'],
    }
