from __future__ import annotations

import pandas as pd

from services.insight_service import build_model_driven_guidance
from services.model_service import predict_with_model


def safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


def _clamp(value, minimum, maximum):
    return max(minimum, min(value, maximum))


def _credit_score_signal(credit_score: float) -> float:
    return _clamp((credit_score - 300.0) / 550.0, 0.0, 1.0)


def _income_signal(income: float) -> float:
    # Saturate the benefit of higher income so very large values do not inflate the score unrealistically.
    return _clamp(income / 150000.0, 0.0, 1.0)


def _loan_to_income_signal(loan_to_income: float) -> float:
    if loan_to_income <= 0.15:
        return 1.0
    if loan_to_income <= 0.30:
        return 1.0 - ((loan_to_income - 0.15) / 0.15) * 0.12
    if loan_to_income <= 0.50:
        return 0.88 - ((loan_to_income - 0.30) / 0.20) * 0.23
    if loan_to_income <= 0.80:
        return 0.65 - ((loan_to_income - 0.50) / 0.30) * 0.30
    if loan_to_income <= 1.00:
        return 0.35 - ((loan_to_income - 0.80) / 0.20) * 0.20
    return max(0.05, 0.15 - min((loan_to_income - 1.0) * 0.08, 0.10))


def _practical_finance_probability(income: float, loan: float, credit_score: float, loan_to_income: float) -> float:
    credit_signal = _credit_score_signal(credit_score)
    income_signal = _income_signal(income)
    affordability_signal = _loan_to_income_signal(loan_to_income)

    probability = (
        0.42 * credit_signal
        + 0.43 * affordability_signal
        + 0.15 * income_signal
    )

    # Absolute debt size still matters a bit even with good income.
    if loan >= 750000:
        probability -= 0.08
    elif loan >= 400000:
        probability -= 0.04

    return _clamp(probability, 0.05, 0.95)


def get_finance_decision(data):
    income = max(safe_float(data.get('income', 50000)), 1.0)
    loan = max(safe_float(data.get('loan', 15000)), 0.0)
    credit_score = min(max(safe_float(data.get('credit_score', 650)), 300.0), 850.0)
    loan_to_income = min(loan / max(income, 1.0), 5.0)

    model_frame = pd.DataFrame([{
        'income': income,
        'loan': loan,
        'credit_score': credit_score,
        'loan_to_income': loan_to_income,
    }])
    model_result = predict_with_model('finance', model_frame)
    if model_result is not None:
        raw_probability = float(model_result['probability'])
        heuristic_probability = _practical_finance_probability(income, loan, credit_score, loan_to_income)
        probability = (raw_probability * 0.45) + (heuristic_probability * 0.55)
        sanity_risks = []

        # Guardrails so obviously stretched debt profiles do not appear "low risk"
        if loan_to_income >= 1.0:
            probability = min(probability, 0.32)
            sanity_risks.append('Your loan is at or above your annual income, which is a high-risk affordability signal.')
        elif loan_to_income >= 0.8:
            probability = min(probability, 0.45)
            sanity_risks.append('Your loan is very high relative to income, which materially increases repayment risk.')
        elif loan_to_income >= 0.6:
            probability = min(probability, 0.58)
            sanity_risks.append('Your loan-to-income ratio is stretched and should be reduced before this looks comfortably safe.')

        if credit_score > 820:
            probability = min(probability, 0.90)

        if credit_score < 600:
            probability = min(probability, 0.4)
            sanity_risks.append('Credit score is in a weaker range, which raises approval and repayment risk.')

        score_percent = round(probability * 100, 1)
        guidance = build_model_driven_guidance('finance', model_frame.iloc[0].to_dict(), model_result)
        score_label = model_result['score_label']
        score_band = model_result['score_band']
        if probability >= 0.8:
            score_label, score_band = 'Strong', '80-100'
        elif probability >= 0.6:
            score_label, score_band = 'Promising', '60-79'
        elif probability >= 0.4:
            score_label, score_band = 'Average', '40-59'
        else:
            score_label, score_band = 'Needs work', '0-39'

        risks = sanity_risks + list(guidance['risks'])
        suggestions = list(guidance['suggestions'])
        if sanity_risks and loan_to_income >= 0.8:
            urgent_step = (
                f'Reduce loan amount to below {income * 0.5:.2f} first; that would bring your loan-to-income ratio closer to a safer range.'
            )
            if urgent_step not in suggestions:
                suggestions.insert(0, urgent_step)

        return {
            'decision': 'Low risk profile' if probability >= 0.5 else 'Moderate-to-high risk profile',
            'probability': probability,
            'score_label': score_label,
            'score_band': score_band,
            'summary': f'Financial safety is estimated at {score_percent}/100 using the trained model plus affordability checks.',
            'next_step': suggestions[0],
            'target_score': 75.0,
            'key_factors': model_result['key_factors'],
            'explanation': guidance['explanation'],
            'suggestions': suggestions[:3],
            'risks': risks[:3],
        }

    # If model fails, return error instead of hardcoded fallback
    return {
        'decision': 'Unable to assess financial risk - model unavailable',
        'probability': 0.5,  # Neutral
        'score_label': 'Unknown',
        'score_band': 'Unknown',
        'summary': 'Financial risk assessment model is not available. Please try again later.',
        'next_step': 'Contact support for manual assessment.',
        'target_score': 75.0,
        'key_factors': ['model_unavailable'],
        'explanation': 'The trained model could not be loaded or used for prediction.',
        'suggestions': ['Retry the request.', 'Check system status.'],
        'risks': ['Unable to provide accurate risk assessment.'],
    }
