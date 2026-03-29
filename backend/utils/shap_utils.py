import numpy as np
import shap


def _pretty_feature_name(name):
    cleaned = str(name)
    for prefix in ('num__', 'cat__'):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):]
    cleaned = cleaned.replace('_', ' ')
    return cleaned


def compute_shap_explanation(model, row, feature_names):
    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(row)
        if isinstance(shap_values, list):
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        shap_vals = np.asarray(shap_values).ravel()
        pairs = list(zip(feature_names, shap_vals))
        sorted_pairs = sorted(pairs, key=lambda x: abs(x[1]), reverse=True)
        top = sorted_pairs[:5]

        explanation_sentences = []
        for name, val in top:
            display_name = _pretty_feature_name(name)
            direction = 'increases' if val > 0 else 'decreases'
            explanation_sentences.append(f"{display_name} {direction} the score by {abs(float(val)):.4f}.")

        explanation = " ".join(explanation_sentences)
        key_factors = [f"{_pretty_feature_name(name)} ({val:.4f})" for name, val in top]
        return {
            'explanation_text': explanation,
            'key_factors': key_factors,
            'raw_shap': top,
        }
    except Exception as ex:
        fallback = 'Unable to compute SHAP explanation, using model feature importance.'
        return {
            'explanation_text': fallback,
            'key_factors': feature_names[:3],
            'raw_shap': [],
        }


def convert_shap_for_response(shap_result):
    return shap_result.get('explanation_text', ''), shap_result.get('key_factors', [])
