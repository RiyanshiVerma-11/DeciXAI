import pandas as pd

from services.model_service import predict_with_model


def get_startup_decision(data):
    model_frame = pd.DataFrame([{
        'funding': float(data.get('funding', 100000)),
        'team_size': int(data.get('team_size', 5)),
        'market': str(data.get('market', 'consumer')).lower(),
        'experience': float(data.get('experience', 2)),
    }])
    model_result = predict_with_model('startup', model_frame)
    if model_result is not None:
        probability = model_result['probability']
        score_percent = round(probability * 100, 1)
        decision = 'Strong startup potential' if probability >= 0.5 else 'Needs improved execution and metrics'

        suggestions = []
        if model_frame.iloc[0]['funding'] < 150000:
            suggestions.append('Raise more capital or tighten the operating plan.')
        if model_frame.iloc[0]['team_size'] < 4:
            suggestions.append('Broaden the founding team with execution and product depth.')
        if model_frame.iloc[0]['experience'] < 3:
            suggestions.append('Add experienced mentors or operators around the team.')
        if model_frame.iloc[0]['market'] == 'consumer':
            suggestions.append('Validate product-market fit with repeatable customer traction.')
        if not suggestions:
            suggestions.append('Focus on traction, retention, and efficient execution.')

        return {
            'decision': decision,
            'probability': probability,
            'score_label': model_result['score_label'],
            'score_band': model_result['score_band'],
            'summary': f'Startup readiness is estimated at {score_percent}/100 using the trained model.',
            'next_step': suggestions[0],
            'target_score': 80.0,
            'key_factors': model_result['key_factors'],
            'explanation': model_result['explanation'],
            'suggestions': suggestions,
        }

    funding = float(data.get('funding', 100000))
    team_size = int(data.get('team_size', 5))
    market = str(data.get('market', 'consumer')).lower()
    experience = float(data.get('experience', 2))

    market_factor = 1.2 if market == 'enterprise' else 1.0
    score = (funding / 100000) * 0.35 + (team_size / 20) * 0.25 + (experience / 10) * 0.2 + market_factor * 0.2
    probability = min(1.0, score)
    decision = 'Strong startup potential' if probability >= 0.55 else 'Needs improved execution and metrics'
    score_percent = round(probability * 100, 1)
    if probability >= 0.8:
        score_label = 'Investor ready'
        score_band = '80-100'
    elif probability >= 0.6:
        score_label = 'Promising'
        score_band = '60-79'
    elif probability >= 0.4:
        score_label = 'Early stage'
        score_band = '40-59'
    else:
        score_label = 'Fragile'
        score_band = '0-39'

    key_factors = [
        f'funding ({funding})',
        f'team_size ({team_size})',
        f'market ({market})',
        f'experience ({experience})',
    ]
    explanation = (
        f'Startup readiness is {score_percent}/100, placing this idea in the {score_label.lower()} band. '
        f'The score reflects current funding, team depth, founder experience, and market direction.'
    )
    suggestions = []
    if funding < 150000:
        suggestions.append('Seek additional funding or strategic partnerships.')
    if team_size < 4:
        suggestions.append('Expand the founding team with domain experts.')
    if experience < 3:
        suggestions.append('Add experienced mentors or advisors.')
    if market == 'consumer':
        suggestions.append('Validate product-market fit with pilot customers.')

    return {
        'decision': decision,
        'probability': round(probability, 4),
        'score_label': score_label,
        'score_band': score_band,
        'summary': f'This startup currently looks {score_label.lower()} with a readiness score of {score_percent}/100.',
        'next_step': suggestions[0],
        'target_score': 80.0,
        'key_factors': key_factors,
        'explanation': explanation,
        'suggestions': suggestions,
    }
