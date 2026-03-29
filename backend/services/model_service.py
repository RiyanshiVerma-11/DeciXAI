from functools import lru_cache
from pathlib import Path

import joblib

from utils.shap_utils import compute_shap_explanation, convert_shap_for_response


MODELS_DIR = Path(__file__).resolve().parents[1] / 'models'


@lru_cache(maxsize=8)
def load_domain_bundle(domain):
    model_path = MODELS_DIR / f'{domain}_model.joblib'
    if not model_path.exists():
        return None
    return joblib.load(model_path)


def get_domain_profiles(domain):
    bundle = load_domain_bundle(domain)
    if bundle is None:
        return {}
    return bundle.get('profiles', {})


def get_feature_labels(domain):
    bundle = load_domain_bundle(domain)
    if bundle is None:
        return {}
    return bundle.get('feature_labels', {})


def get_career_comparison_bundle():
    bundle = load_domain_bundle('career')
    if bundle is None:
        return None
    return bundle.get('comparison')


def _score_label(probability):
    if probability >= 0.8:
        return 'Strong', '80-100'
    if probability >= 0.6:
        return 'Promising', '60-79'
    if probability >= 0.4:
        return 'Average', '40-59'
    return 'Needs work', '0-39'


def predict_with_model(domain, frame):
    bundle = load_domain_bundle(domain)
    if bundle is None:
        return None

    pipeline = bundle['pipeline']
    positive_class = bundle.get('positive_class', 1)
    probabilities = pipeline.predict_proba(frame)[0]
    classes = list(pipeline.classes_)
    positive_index = classes.index(positive_class) if positive_class in classes else 0
    probability = float(probabilities[positive_index])
    predicted_class = pipeline.predict(frame)[0]

    explanation = 'Model prediction generated successfully.'
    key_factors = list(frame.columns)
    if 'preprocessor' in pipeline.named_steps and 'model' in pipeline.named_steps:
        transformed_row = pipeline.named_steps['preprocessor'].transform(frame)
        if hasattr(transformed_row, 'toarray'):
            transformed_row = transformed_row.toarray()
        feature_names = pipeline.named_steps['preprocessor'].get_feature_names_out().tolist()
        shap_result = compute_shap_explanation(pipeline.named_steps['model'], transformed_row, feature_names)
        explanation, key_factors = convert_shap_for_response(shap_result)

    score_label, score_band = _score_label(probability)
    return {
        'probability': round(probability, 4),
        'predicted_class': int(predicted_class) if isinstance(predicted_class, (int, bool)) else predicted_class,
        'score_label': score_label,
        'score_band': score_band,
        'explanation': explanation,
        'key_factors': key_factors,
        'metrics': bundle.get('metrics', {}),
        'samples': bundle.get('samples', 0),
        'profiles': bundle.get('profiles', {}),
        'feature_labels': bundle.get('feature_labels', {}),
    }
