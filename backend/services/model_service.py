from functools import lru_cache
from pathlib import Path
import threading

import joblib
import pandas as pd
import shap

from utils.shap_utils import compute_shap_explanation, convert_shap_for_response

MODELS_DIR = Path(__file__).resolve().parents[1] / 'models'

# Global Thread-Safe Cache for SHAP Explainers
_EXPLAINER_CACHE = {}
_CACHE_LOCK = threading.Lock()


def get_shap_explainer(domain: str):
    """Retrieve or cache the TreeExplainer for the domain model thread-safely."""
    if domain not in _EXPLAINER_CACHE:
        with _CACHE_LOCK:
            if domain not in _EXPLAINER_CACHE:
                bundle = load_domain_bundle(domain)
                if bundle is None:
                    return None
                pipeline = bundle.get('pipeline')
                if pipeline is not None and 'model' in pipeline.named_steps:
                    model_step = pipeline.named_steps['model']
                    # Initialize the TreeExplainer once
                    _EXPLAINER_CACHE[domain] = shap.TreeExplainer(model_step)
                else:
                    return None
    return _EXPLAINER_CACHE[domain]


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


def get_domain_feature_schema(domain):
    bundle = load_domain_bundle(domain)
    if bundle is None:
        return {'numeric': [], 'categorical': []}
    return bundle.get('features', {'numeric': [], 'categorical': []})


def build_runtime_frame(domain, feature_values: dict):
    schema = get_domain_feature_schema(domain)
    ordered_features = list(schema.get('numeric', [])) + list(schema.get('categorical', []))
    if not ordered_features:
        ordered_features = list(feature_values.keys())
    payload = {feature: feature_values.get(feature) for feature in ordered_features}
    return pd.DataFrame([payload])


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


def get_model_status() -> dict[str, bool]:
    """Return a dict of domain -> is_loaded for the health endpoint."""
    domains = ["career", "finance", "startup", "policy"]
    status = {}
    for domain in domains:
        try:
            bundle = load_domain_bundle(domain)
            status[domain] = bundle is not None and "pipeline" in (bundle or {})
        except Exception:
            status[domain] = False
    return status


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
    shap_result = {'raw_shap': []}
    
    if 'preprocessor' in pipeline.named_steps and 'model' in pipeline.named_steps:
        transformed_row = pipeline.named_steps['preprocessor'].transform(frame)
        if hasattr(transformed_row, 'toarray'):
            transformed_row = transformed_row.toarray()
        feature_names = pipeline.named_steps['preprocessor'].get_feature_names_out().tolist()
        
        # Pass profiles and labels for human-readable SHAP
        profiles = bundle.get('profiles', {})
        feature_labels = bundle.get('feature_labels', {})
        explainer = get_shap_explainer(domain)
        shap_result = compute_shap_explanation(
            explainer, 
            transformed_row, 
            feature_names, 
            raw_row=frame.iloc[0].to_dict(),
            profiles=profiles,
            feature_labels=feature_labels,
            positive_class_index=positive_index,
        )
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
        'human_shap': shap_result.get('human_shap', []),
        'raw_shap': shap_result.get('raw_shap', []),
    }
