def safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


def get_finance_decision(data):
    import pandas as pd

    from services.model_service import predict_with_model

    model_frame = pd.DataFrame([{
        'income': max(safe_float(data.get('income', 50000)), 1.0),
        'loan': max(safe_float(data.get('loan', 15000)), 0.0),
        'credit_score': min(max(safe_float(data.get('credit_score', 650)), 300.0), 850.0),
    }])
    model_result = predict_with_model('finance', model_frame)
    if model_result is not None:
        probability = model_result['probability']
        score_percent = round(probability * 100, 1)
        decision = 'Low risk profile' if probability >= 0.5 else 'Moderate-to-high risk profile'

        suggestions = []
        if model_frame.iloc[0]['credit_score'] < 700:
            suggestions.append('Improve credit score with on-time payments and lower utilization.')
        if model_frame.iloc[0]['loan'] / max(model_frame.iloc[0]['income'], 1.0) > 0.4:
            suggestions.append('Reduce current debt exposure before taking on more risk.')
        if model_frame.iloc[0]['income'] < 50000:
            suggestions.append('Increase income stability to improve the finance profile.')
        if not suggestions:
            suggestions.append('Maintain low debt and consistent credit behavior.')

        return {
            'decision': decision,
            'probability': probability,
            'score_label': model_result['score_label'],
            'score_band': model_result['score_band'],
            'summary': f'Financial safety is estimated at {score_percent}/100 using the trained model.',
            'next_step': suggestions[0],
            'target_score': 75.0,
            'key_factors': model_result['key_factors'],
            'explanation': model_result['explanation'],
            'suggestions': suggestions,
        }

    income = max(safe_float(data.get('income', 50000)), 1.0)
    loan = max(safe_float(data.get('loan', 15000)), 0.0)
    credit_score = min(max(safe_float(data.get('credit_score', 650)), 300.0), 850.0)

    loan_ratio = min(loan / income, 1.5)
    credit_risk = max(0.0, (700.0 - credit_score) / 400.0)
    contribution_map = {
        'income': max(0.0, (60000.0 - income) / 120000.0) * 0.2,
        'loan': loan_ratio * 0.5,
        'credit_score': credit_risk * 0.3,
    }

    risk_score = min(1.0, sum(contribution_map.values()))
    safety_score = 1 - risk_score
    decision = 'Low risk profile' if risk_score < 0.5 else 'Moderate-to-high risk profile'
    score_percent = round(safety_score * 100, 1)
    if risk_score <= 0.25:
        score_label = 'Healthy'
        score_band = 'Low risk'
    elif risk_score <= 0.45:
        score_label = 'Watch closely'
        score_band = 'Moderate risk'
    else:
        score_label = 'Risky'
        score_band = 'High risk'

    sorted_factors = sorted(contribution_map.items(), key=lambda item: abs(item[1]), reverse=True)
    key_factors = [f'{name} ({value:.4f})' for name, value in sorted_factors]
    top_risk = sorted_factors[0][0]
    explanation = (
        f'Financial safety score is {score_percent}/100. This sits in the {score_band.lower()} band, '
        f'with {top_risk} contributing the most pressure to the current result.'
    )

    suggestions = []
    if credit_score < 700:
        suggestions.append('Improve credit score by timely payments.')
    if loan_ratio > 0.4:
        suggestions.append('Reduce loan burden by refinancing or paying down debt.')
    if income < 50000:
        suggestions.append('Increase income stability before taking on new obligations.')
    if not suggestions:
        suggestions.append('Maintain stable income and low debt levels.')

    return {
        'decision': decision,
        'probability': round(safety_score, 4),
        'score_label': score_label,
        'score_band': score_band,
        'summary': f'Your current financial position reads as {score_label.lower()} with a safety score of {score_percent}/100.',
        'next_step': suggestions[0],
        'target_score': 75.0,
        'key_factors': key_factors,
        'explanation': explanation,
        'suggestions': suggestions,
    }
