from __future__ import annotations

import pandas as pd

from services.insight_service import build_model_driven_guidance
from services.model_service import predict_with_model


def safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


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
        probability = model_result['probability']
        score_percent = round(probability * 100, 1)
        guidance = build_model_driven_guidance('finance', model_frame.iloc[0].to_dict(), model_result)

        return {
            'decision': 'Low risk profile' if probability >= 0.5 else 'Moderate-to-high risk profile',
            'probability': probability,
            'score_label': model_result['score_label'],
            'score_band': model_result['score_band'],
            'summary': f'Financial safety is estimated at {score_percent}/100 using the trained model and successful-risk benchmarks.',
            'next_step': guidance['suggestions'][0],
            'target_score': 75.0,
            'key_factors': model_result['key_factors'],
            'explanation': guidance['explanation'],
            'suggestions': guidance['suggestions'],
            'risks': guidance['risks'],
        }

    risk_score = min(1.0, loan_to_income * 0.5 + max(0.0, (700.0 - credit_score) / 400.0) * 0.3 + max(0.0, (60000.0 - income) / 120000.0) * 0.2)
    safety_score = 1.0 - risk_score
    return {
        'decision': 'Low risk profile' if safety_score >= 0.5 else 'Moderate-to-high risk profile',
        'probability': round(safety_score, 4),
        'score_label': 'Healthy' if safety_score >= 0.8 else 'Watch closely' if safety_score >= 0.6 else 'Risky',
        'score_band': 'Low risk' if safety_score >= 0.8 else 'Moderate risk' if safety_score >= 0.6 else 'High risk',
        'summary': f'Fallback finance score: {round(safety_score * 100, 1)}/100.',
        'next_step': 'Reduce debt pressure and improve repayment consistency.',
        'target_score': 75.0,
        'key_factors': ['income', 'loan', 'credit_score', 'loan_to_income'],
        'explanation': 'The fallback scorer is using income, loan burden, credit score, and the loan-to-income ratio.',
        'suggestions': ['Lower the debt burden.', 'Improve credit score.', 'Increase income stability.'],
    }
