import pandas as pd

from services.model_service import predict_with_model


def get_policy_decision(data):
    model_frame = pd.DataFrame([{
        'sector': str(data.get('sector', 'infrastructure')).lower(),
        'budget': float(data.get('budget', 1000000)),
        'population': float(data.get('population', 500000)),
    }])
    model_result = predict_with_model('policy', model_frame)
    if model_result is not None:
        probability = model_result['probability']
        score_percent = round(probability * 100, 1)
        decision = 'Feasible policy initiative' if probability >= 0.5 else 'Requires revisit and risk mitigation'

        suggestions = []
        if model_frame.iloc[0]['budget'] / max(model_frame.iloc[0]['population'], 1.0) < 1.0:
            suggestions.append('Increase per-capita allocation or narrow the rollout scope.')
        if model_frame.iloc[0]['sector'] == 'healthcare':
            suggestions.append('Prioritize preventive care and measurable public health outcomes.')
        if model_frame.iloc[0]['sector'] == 'education':
            suggestions.append('Tie the program to teacher capacity and access outcomes.')
        if model_frame.iloc[0]['sector'] == 'infrastructure':
            suggestions.append('Stage delivery through high-impact, easy-to-monitor projects.')
        if not suggestions:
            suggestions.append('Define clear beneficiary targeting and implementation milestones.')

        return {
            'decision': decision,
            'probability': probability,
            'score_label': model_result['score_label'],
            'score_band': model_result['score_band'],
            'summary': f'Policy feasibility is estimated at {score_percent}/100 using the trained model.',
            'next_step': suggestions[0],
            'target_score': 70.0,
            'key_factors': model_result['key_factors'],
            'explanation': model_result['explanation'],
            'suggestions': suggestions,
        }

    sector = str(data.get('sector', 'infrastructure')).lower()
    budget = float(data.get('budget', 1000000))
    population = float(data.get('population', 500000))

    per_capita = budget / max(population, 1)
    sector_bonus = {'healthcare': 0.3, 'education': 0.25, 'infrastructure': 0.2}.get(sector, 0.2)
    score = min(1.0, (per_capita / 10_000) + sector_bonus)
    decision = 'Feasible policy initiative' if score >= 0.6 else 'Requires revisit and risk mitigation'
    score_percent = round(score * 100, 1)
    if score >= 0.8:
        score_label = 'Strong case'
        score_band = '80-100'
    elif score >= 0.6:
        score_label = 'Feasible'
        score_band = '60-79'
    elif score >= 0.4:
        score_label = 'Borderline'
        score_band = '40-59'
    else:
        score_label = 'Weak case'
        score_band = '0-39'

    key_factors = [
        f'sector ({sector})',
        f'budget ({budget})',
        f'population ({population})',
        f'per_capita ({per_capita:.2f})',
    ]
    explanation = (
        f'Policy feasibility is {score_percent}/100, which is in the {score_label.lower()} band. '
        f'Per-capita allocation is {per_capita:.2f}, and the sector priority contributes an additional policy bonus.'
    )
    suggestions = []
    if score < 0.6:
        suggestions.append('Increase budget or optimize population reach with prioritization.')
    if sector == 'healthcare':
        suggestions.append('Allocate funds to preventive care and essential infrastructure.')
    if sector == 'education':
        suggestions.append('Invest in teacher training and digital learning resources.')
    if sector == 'infrastructure':
        suggestions.append('Prioritize high-impact projects and transparent monitoring.')

    return {
        'decision': decision,
        'probability': round(score, 4),
        'score_label': score_label,
        'score_band': score_band,
        'summary': f'This proposal looks {score_label.lower()} right now with a feasibility score of {score_percent}/100.',
        'next_step': suggestions[0],
        'target_score': 70.0,
        'key_factors': key_factors,
        'explanation': explanation,
        'suggestions': suggestions,
    }
