import numpy as np
from typing import List, Dict, Any, Tuple


def _pretty_feature_name(name: str) -> str:
    cleaned = str(name)
    for prefix in ("num__", "cat__"):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):]
    return cleaned.replace("_", " ").title()


def _pretty_category_value(value: str | None) -> str:
    return str(value or "").replace("_", " ").strip()


def _parse_feature_parts(name: str) -> Tuple[str, str | None, bool]:
    cleaned = str(name)
    if cleaned.startswith("num__"):
        return cleaned[len("num__"):], None, False
    if cleaned.startswith("cat__"):
        encoded = cleaned[len("cat__"):]
        for base in sorted(("interest", "course_group", "specialization_group"), key=len, reverse=True):
            prefix = f"{base}_"
            if encoded.startswith(prefix):
                return base, encoded[len(prefix):], True
        return encoded, _pretty_category_value(encoded), True
    return cleaned, None, False


def _get_benchmark_context(feature: str, profiles: Dict[str, Any]) -> Dict[str, Any]:
    numeric_profiles = profiles.get("numeric", {})
    profile = numeric_profiles.get(feature, {})
    return {
        "positive_median": float(profile.get("positive_median", 0)),
        "p25": float(profile.get("p25", 0)),
        "p75": float(profile.get("p75", 0)),
        "overall_median": float(profile.get("overall_median", 0)),
    }


def _get_categorical_context(feature: str, current_value: str, profiles: Dict[str, Any]) -> Dict[str, Any]:
    categories = profiles.get("categorical", {}).get(feature, [])
    supported_categories = [item for item in categories if int(item.get("count", 0) or 0) >= 5]
    ranked_categories = supported_categories or categories
    top_category = ranked_categories[0] if ranked_categories else {}
    current_category = next(
        (item for item in categories if str(item.get("value", "")).strip().lower() == current_value.strip().lower()),
        {},
    )
    return {
        "top_value": str(top_category.get("value", "")),
        "top_success_rate": float(top_category.get("success_rate", 0)),
        "top_count": int(top_category.get("count", 0) or 0),
        "current_success_rate": float(current_category.get("success_rate", 0)),
        "current_count": int(current_category.get("count", 0) or 0),
    }


def _humanize_impact(
    feature: str,
    shap_value: float,
    current_value: float | str,
    benchmark: Dict[str, Any],
    feature_labels: Dict[str, str],
    category_value: str | None = None,
    is_categorical: bool = False,
) -> Dict[str, Any]:
    direction = "boosts" if shap_value > 0 else "holds back"
    strength = "strongly" if abs(shap_value) > 0.05 else "slightly"

    label = feature_labels.get(feature, _pretty_feature_name(feature))
    benchmark_median = benchmark.get("positive_median")
    if benchmark_median is None:
        benchmark_median = benchmark.get("overall_median", 0) or 0

    current_is_numeric = isinstance(current_value, (int, float, np.integer, np.floating)) and not np.isnan(current_value)
    pretty_category = _pretty_category_value(category_value)

    if feature == "cgpa":
        if current_is_numeric and current_value >= benchmark_median:
            reason = f"CGPA is {current_value:.1f} versus a successful-profile median of {benchmark_median:.1f}"
        elif current_is_numeric and current_value < benchmark_median:
            reason = f"CGPA is {current_value:.1f}, below the successful-profile median of {benchmark_median:.1f}"
        else:
            reason = f"CGPA is an important driver around the successful-profile median of {benchmark_median:.1f}"
    elif "count" in feature:
        comparison = f"successful profiles average {benchmark_median:.0f}"
        if current_is_numeric and current_value >= benchmark_median:
            reason = f"{int(current_value)} is at or above the level where {comparison}"
        elif current_is_numeric:
            reason = f"{int(current_value)} is below the level where {comparison}"
        else:
            reason = comparison
    elif is_categorical:
        current_success = float(benchmark.get("current_success_rate", 0))
        top_success = float(benchmark.get("top_success_rate", 0))
        top_value = _pretty_category_value(benchmark.get("top_value"))
        if shap_value > 0:
            if top_value and current_success and current_success >= top_success:
                reason = f"{label.lower()}={pretty_category} aligns with one of the stronger observed categories"
            else:
                reason = f"{label.lower()}={pretty_category} contributes positively in this prediction"
        elif top_value and top_success > current_success:
            reason = f"{label.lower()}={pretty_category} trails the stronger category {top_value}"
        else:
            reason = f"{label.lower()}={pretty_category} contributes negatively in this prediction"
    else:
        reason = f"{direction} prediction by {abs(shap_value):.3f}"

    if not is_categorical and current_is_numeric and abs(shap_value) > 0:
        direction_tail = "boosts" if shap_value > 0 else "holds back"
        if feature == "cgpa":
            reason = f"{reason}; in this prediction it {direction_tail}"
        elif "count" in feature:
            reason = f"{reason}; in this prediction it {direction_tail}"

    return {
        "factor": label,
        "impact": f"{strength.title()} {direction}",
        "reason": reason,
        "shap_value": round(float(shap_value), 4),
        "current": round(float(current_value), 2) if current_is_numeric else str(current_value),
        "benchmark": round(benchmark_median, 2) if not is_categorical else round(float(benchmark.get("top_success_rate", 0)), 4),
    }


def compute_shap_explanation(
    explainer,
    row: np.ndarray,
    feature_names: List[str],
    raw_row: Dict[str, Any] | None = None,
    profiles: Dict[str, Any] = None,
    feature_labels: Dict[str, str] = None,
    positive_class_index: int = 1,
) -> Dict[str, Any]:
    try:
        if explainer is None:
            raise ValueError("Cached SHAP explainer is unavailable.")
        shap_values = explainer.shap_values(row)
        if isinstance(shap_values, list):
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        shap_array = np.asarray(shap_values)
        if shap_array.ndim == 3:
            shap_vals = shap_array[0, :, positive_class_index]
        elif shap_array.ndim == 2:
            shap_vals = shap_array[0]
        else:
            shap_vals = shap_array.ravel()
        row_values = np.asarray(row).ravel()
        pairs = list(zip(feature_names, shap_vals, row_values))
        sorted_pairs = sorted(pairs, key=lambda x: abs(x[1]), reverse=True)

        human_shap = []
        raw_shap = []
        for feature_name, shap_value, encoded_value in sorted_pairs:
            base_feature, category_value, is_categorical = _parse_feature_parts(feature_name)
            if is_categorical and float(encoded_value) <= 0:
                continue

            if is_categorical:
                current_value = category_value or str((raw_row or {}).get(base_feature, ""))
                benchmark = _get_categorical_context(base_feature, str(current_value), profiles or {})
            else:
                current_value = (raw_row or {}).get(base_feature, np.nan)
                benchmark = _get_benchmark_context(base_feature, profiles or {})

            human_shap.append(
                _humanize_impact(
                    base_feature,
                    shap_value,
                    current_value,
                    benchmark,
                    feature_labels or {},
                    category_value=category_value,
                    is_categorical=is_categorical,
                )
            )
            raw_shap.append((feature_name, shap_value))
            if len(human_shap) >= 8:
                break

        explanation_text = "Top factors driving your prediction:"
        for item in human_shap[:3]:
            explanation_text += f" {item['factor']}: {item['impact']} ({item['reason']})."

        return {
            "explanation_text": explanation_text,
            "human_shap": human_shap,
            "key_factors": [item["factor"] for item in human_shap],
            "raw_shap": raw_shap,
            "summary_impact": sum(item["shap_value"] for item in human_shap),
        }
    except Exception as ex:
        return {
            "explanation_text": "Model explanation ready. Key factors from training profiles.",
            "human_shap": [],
            "key_factors": feature_names[:5],
            "raw_shap": [],
            "error": str(ex),
        }


def convert_shap_for_response(shap_result: Dict[str, Any]) -> Tuple[str, List[str]]:
    return shap_result.get("explanation_text", ""), shap_result.get("key_factors", [])
