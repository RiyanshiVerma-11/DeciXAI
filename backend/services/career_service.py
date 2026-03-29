from services.finance_service import safe_float
import pandas as pd

from services.model_service import predict_with_model


def _prepare_features(data):
    interest_map = {'data': 0.18, 'technical': 0.22, 'management': 0.12}
    skills_value = len(data.get('skills', [])) if isinstance(data.get('skills'), list) else safe_float(data.get('skills', 1))
    projects_value = len(data.get('projects', [])) if isinstance(data.get('projects'), list) else safe_float(data.get('projects', 1))
    return {
        'cgpa': min(max(safe_float(data.get('cgpa', 7.0)), 0.0), 10.0),
        'skills': max(skills_value, 0.0),
        'projects': max(projects_value, 0.0),
        'interest_bonus': interest_map.get(str(data.get('interest', 'data')).lower(), 0.18),
    }


def get_career_decision(data):
    model_frame = pd.DataFrame([{
        'cgpa': min(max(safe_float(data.get('cgpa', 7.0)), 0.0), 10.0),
        'skills_count': len(data.get('skills', [])) if isinstance(data.get('skills'), list) else max(safe_float(data.get('skills', 1)), 0.0),
        'projects_count': len(data.get('projects', [])) if isinstance(data.get('projects'), list) else max(safe_float(data.get('projects', 1)), 0.0),
        'interest': str(data.get('interest', 'data')).lower(),
    }])
    model_result = predict_with_model('career', model_frame)
    if model_result is not None:
        probability = model_result['probability']
        decision = 'High potential career path' if probability >= 0.5 else 'Needs improvement in portfolio'
        score_percent = round(probability * 100, 1)
        suggestions = []
        if model_frame.iloc[0]['cgpa'] < 7.0:
            suggestions.append('Improve CGPA with targeted courses.')
        if model_frame.iloc[0]['skills_count'] < 4:
            suggestions.append('Add more job-relevant technical skills.')
        if model_frame.iloc[0]['projects_count'] < 2:
            suggestions.append('Build 2-3 strong projects to strengthen your profile.')
        if not suggestions:
            suggestions.append('Keep improving your portfolio with internships and visible work.')

        return {
            'decision': decision,
            'probability': probability,
            'score_label': model_result['score_label'],
            'score_band': model_result['score_band'],
            'summary': f'Career readiness is estimated at {score_percent}/100 using the trained model.',
            'next_step': suggestions[0],
            'target_score': 80.0,
            'key_factors': model_result['key_factors'],
            'explanation': model_result['explanation'],
            'suggestions': suggestions,
        }

    prepared = _prepare_features(data)
    contribution_map = {
        'cgpa': (prepared['cgpa'] / 10.0) * 0.4,
        'skills': min(prepared['skills'] / 8.0, 1.0) * 0.3,
        'projects': min(prepared['projects'] / 5.0, 1.0) * 0.2,
        'interest': prepared['interest_bonus'],
    }

    score = min(1.0, sum(contribution_map.values()))
    decision = 'High potential career path' if score >= 0.55 else 'Needs improvement in portfolio'
    score_percent = round(score * 100, 1)
    if score >= 0.8:
        score_label = 'Strong'
        score_band = '80-100'
    elif score >= 0.6:
        score_label = 'Promising'
        score_band = '60-79'
    elif score >= 0.4:
        score_label = 'Average'
        score_band = '40-59'
    else:
        score_label = 'Needs work'
        score_band = '0-39'

    sorted_factors = sorted(contribution_map.items(), key=lambda item: abs(item[1]), reverse=True)
    key_factors = [f'{name} ({value:.4f})' for name, value in sorted_factors]
    top_strength = sorted_factors[0][0]
    top_gap = min(sorted_factors, key=lambda item: item[1])[0]
    explanation = (
        f'Career fit score is {score_percent}/100, which falls in the {score_label.lower()} band. '
        f'{top_strength} is helping the most right now, while {top_gap} is the clearest area to improve next.'
    )

    suggestions = []
    if prepared['cgpa'] < 7.0:
        suggestions.append('Improve CGPA with targeted courses.')
    if prepared['skills'] < 4:
        suggestions.append('Learn complementary technical skills.')
    if prepared['projects'] < 2:
        suggestions.append('Work on real-world projects for experience.')
    if not suggestions:
        suggestions.append('Continue building domain expertise and networking.')

    return {
        'decision': decision,
        'probability': round(score, 4),
        'score_label': score_label,
        'score_band': score_band,
        'summary': f'You are currently in the {score_label.lower()} range for career readiness with a score of {score_percent}/100.',
        'next_step': suggestions[0],
        'target_score': 80.0,
        'key_factors': key_factors,
        'explanation': explanation,
        'suggestions': suggestions,
    }
