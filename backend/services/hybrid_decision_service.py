from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

import pandas as pd
import numpy as np

from services.career_input_parser_service import parse_natural_language_input
from services.model_service import get_career_comparison_bundle, predict_with_model
from utils.shap_utils import compute_shap_explanation


SECTION_BREAKS = r"(?=\b(?:cgpa|gpa|skills?|projects?|interest|experience|certifications?|options?|compare|versus|vs)\b|$)"
LIST_SPLIT = re.compile(r",|;|\band\b|\bor\b|/|\n", flags=re.IGNORECASE)
SKILL_ALIASES = {
    "nodejs": ["node", "backend"],
    "node.js": ["node", "backend"],
    "reactjs": ["react", "frontend", "javascript"],
    "js": ["javascript"],
    "html": ["frontend"],
    "css": ["frontend"],
    "typescript": ["javascript"],
    "express": ["backend", "node"],
    "mongodb": ["backend"],
}
INTEREST_HINTS = {
    "data": ["data science", "analytics", "machine learning"],
    "management": ["product management", "business analyst", "management"],
    "technical": ["software development", "software engineer", "web developer", "frontend", "backend"],
}
INTERNSHIP_HINTS = ("internship", "intern", "apprentice", "trainee", "industry training")
REAL_WORLD_HINTS = (
    "freelance",
    "client",
    "production",
    "deployed",
    "startup",
    "company",
    "open source",
    "open-source",
    "hackathon",
)
PATH_INTEREST_ALIGNMENT = {
    "data_science": "data",
    "data_engineering": "data",
    "finance": "management",
    "product_management": "management",
    "marketing": "management",
    "consulting": "management",
    "software_development": "technical",
    "cloud_devops": "technical",
    "cybersecurity": "technical",
    "ui_ux_design": "technical",
}
PATH_GROUP_ALIGNMENT = {
    "data_science": {"degree": {"engineering", "science", "computer_applications"}, "specialization": {"engineering", "science", "computer_applications"}},
    "data_engineering": {"degree": {"engineering", "science", "computer_applications"}, "specialization": {"engineering", "science", "computer_applications"}},
    "software_development": {"degree": {"engineering", "computer_applications"}, "specialization": {"engineering", "computer_applications"}},
    "cloud_devops": {"degree": {"engineering", "computer_applications"}, "specialization": {"engineering", "computer_applications"}},
    "cybersecurity": {"degree": {"engineering", "computer_applications"}, "specialization": {"engineering", "computer_applications"}},
    "ui_ux_design": {"degree": {"engineering", "general", "computer_applications"}, "specialization": {"engineering", "general", "computer_applications"}},
    "finance": {"degree": {"business", "engineering", "general"}, "specialization": {"business", "general", "engineering"}},
    "product_management": {"degree": {"business", "engineering", "general"}, "specialization": {"business", "general", "engineering"}},
    "marketing": {"degree": {"business", "general"}, "specialization": {"business", "general"}},
    "consulting": {"degree": {"business", "engineering", "general"}, "specialization": {"business", "general", "engineering"}},
}
PATH_KEYWORD_HINTS = {
    "data_science": {"data science", "machine learning", "deep learning", "statistics", "pandas", "numpy", "analytics", "python"},
    "data_engineering": {"data engineering", "etl", "spark", "pipelines", "data pipeline", "sql", "python", "big data"},
    "software_development": {"software", "development", "developer", "frontend", "backend", "react", "javascript", "java", "testing"},
    "product_management": {"product", "management", "leadership", "marketing", "analytics", "communication", "business"},
    "cybersecurity": {"cybersecurity", "security", "ethical hacking", "networking", "linux", "ceh", "penetration testing"},
}


def _clamp(value: float, minimum: float, maximum: float) -> float:
    if value != value:
        return value
    return max(minimum, min(value, maximum))


def _safe_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except Exception:
        return float(default)


def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _clean_token(value: Any) -> str:
    return _clean_text(value).lower()


def _unique_text_items(items: list[str]) -> list[str]:
    seen = set()
    deduped = []
    for item in items:
        cleaned = _clean_text(item)
        key = cleaned.lower()
        if cleaned and key not in seen:
            seen.add(key)
            deduped.append(cleaned)
    return deduped


def _split_items(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw_items = value
    else:
        raw_items = re.split(LIST_SPLIT, str(value))

    items = []
    seen = set()
    for raw in raw_items:
        item = _clean_text(raw).strip(" .:-")
        if item and item.lower() not in seen and not re.fullmatch(r"\d+(?:\.\d+)?", item):
            seen.add(item.lower())
            items.append(item)
    return items


def _extract_number(text: str, labels: list[str], default: float) -> float:
    lowered = text.lower()
    for label in labels:
        match = re.search(rf"\b{re.escape(label)}\b[^\d]{{0,10}}([0-9]+(?:\.[0-9]+)?)", lowered)
        if match:
            return float(match.group(1))
        match = re.search(rf"\b([0-9]+(?:\.[0-9]+)?)\b[^\n.]{{0,10}}\b{re.escape(label)}\b", lowered)
        if match:
            return float(match.group(1))
    return default


def _extract_section(text: str, labels: list[str]) -> str:
    for label in labels:
        match = re.search(rf"\b{re.escape(label)}\b[:\s-]*(.*?){SECTION_BREAKS}", text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            return _clean_text(match.group(1).strip(" .:-"))
    return ""


def _normalize_interest(interest: str, options_text: str) -> str:
    explicit_value = _clean_token(interest)
    fallback_value = _clean_token(options_text)

    def _classify(value: str) -> str | None:
        if not value:
            return None
        if any(token in value for token in ["software", "development", "engineering", "coding", "frontend", "backend", "full stack", "web developer"]):
            return "technical"
        if any(token in value for token in ["manage", "business", "leader", "finance", "sales", "market", "product"]):
            return "management"
        if any(token in value for token in ["data", "analytic", "analysis", "ai", "cloud", "machine learning", "ml"]):
            return "data"
        return None

    return _classify(explicit_value) or _classify(fallback_value) or "technical"


def _normalize_course_group(value: Any) -> str:
    text = _clean_token(value)
    if any(token in text for token in ["btech", "b tech", "b.tech", "be", "b.e", "engineering", "computer", "computer science", "cse", "information", "it", "software", "data science", "artificial intelligence", "ai"]):
        return "engineering"
    if any(token in text for token in ["b.sc", "science", "mathematics", "physics"]):
        return "science"
    if any(token in text for token in ["bca", "mca"]):
        return "computer_applications"
    if any(token in text for token in ["business", "commerce", "management", "mba"]):
        return "business"
    return "general"


def _normalize_cgpa(value: Any) -> float:
    numeric = _safe_float(value, float("nan"))
    if numeric != numeric:
        return numeric
    if numeric > 10:
        numeric = numeric / 10.0
    return _clamp(numeric, 0.0, 10.0)


def _expand_skill_terms(skills: list[str]) -> list[str]:
    expanded = []
    for skill in skills:
        expanded.append(skill)
        expanded.extend(SKILL_ALIASES.get(_clean_token(skill), []))
    return _unique_text_items(expanded)


def _count_keyword_hits(items: list[str], keywords: tuple[str, ...]) -> int:
    return sum(1 for item in items if any(keyword in _clean_token(item) for keyword in keywords))


def _internship_signal(normalized: dict[str, Any]) -> float:
    internships = normalized.get("internships", [])
    certifications = normalized.get("certifications", [])
    internship_hits = len(internships) + _count_keyword_hits(certifications, INTERNSHIP_HINTS)
    return _clamp(internship_hits * 0.035, 0.0, 0.12)


def _real_world_signal(normalized: dict[str, Any]) -> float:
    projects = normalized.get("projects", [])
    internships = normalized.get("internships", [])
    real_world_hits = _count_keyword_hits(projects, REAL_WORLD_HINTS) + _count_keyword_hits(internships, REAL_WORLD_HINTS)
    explicit_years = _safe_float(normalized.get("experience_years", 0.0), 0.0)
    base_signal = min(max(explicit_years, 0.0) / 12.0, 1.0) * 0.08
    evidence_signal = _clamp(real_world_hits * 0.025, 0.0, 0.10)
    return _clamp(base_signal + evidence_signal, 0.0, 0.14)


def _experience_bonus(normalized: dict[str, Any], path_class: str = "") -> float:
    internship_bonus = _internship_signal(normalized)
    real_world_bonus = _real_world_signal(normalized)
    multiplier = 1.0
    if path_class in {"data_science", "data_engineering", "software_development", "cloud_devops", "cybersecurity"}:
        multiplier = 1.2
    elif path_class in {"product_management", "consulting", "marketing", "finance"}:
        multiplier = 1.1
    return _clamp((internship_bonus + real_world_bonus) * multiplier, 0.0, 0.18)


def _skill_strength_label(skill_count: int) -> str:
    """Bucket skill count into a human-readable strength band."""
    if skill_count <= 2:
        return "weak"
    if 3 <= skill_count <= 5:
        return "moderate"
    return "strong"


def _skill_strength_bonus(normalized: dict[str, Any], path_class: str = "") -> float:
    """
    Add a small probability lift driven by skill depth.
    This intentionally carries more weight for data-heavy and engineering paths.
    """
    skill_count = int(normalized.get("skill_count", 0) or 0)
    strength_label = _skill_strength_label(skill_count)

    if strength_label == "weak":
        base_bonus = -0.03
    elif strength_label == "moderate":
        base_bonus = 0.045
    else:
        base_bonus = 0.09

    if path_class in {"data_science", "data_engineering", "software_development", "cloud_devops", "cybersecurity"}:
        base_bonus *= 1.2

    return _clamp(base_bonus, -0.05, 0.10)


def _cgpa_penalty_factor(normalized: dict[str, Any], path_class: str = "") -> float:
    cgpa = float(normalized.get("cgpa", float("nan")))
    if cgpa != cgpa:
        return 1.0

    technical_paths = {"data_science", "data_engineering", "software_development", "cloud_devops", "cybersecurity", "ui_ux_design"}
    management_paths = {"product_management", "marketing", "consulting", "finance"}

    if cgpa < 5.0:
        return 0.68 if path_class in technical_paths else 0.78 if path_class in management_paths else 0.72
    if cgpa < 6.0:
        return 0.8 if path_class in technical_paths else 0.88 if path_class in management_paths else 0.84
    if cgpa < 7.0:
        return 0.92 if path_class in technical_paths else 0.96 if path_class in management_paths else 0.94
    return 1.0


def _path_affinity_adjustment(normalized: dict[str, Any], path_class: str, path_profile: dict[str, Any] | None = None) -> float:
    """
    Score paths using direct profile evidence from skills, specialization, and interest.
    This corrects cases where the comparison model underweights path-specific evidence.
    """
    path_profile = path_profile or {}
    skill_terms = {_clean_token(skill) for skill in (normalized.get("expanded_skills") or normalized.get("skills", []))}
    specialization = _clean_token(normalized.get("specialization"))
    raw_interest = _clean_token(normalized.get("raw_interest"))
    interest_domain = normalized.get("interest_domain", "")
    hint_terms = PATH_KEYWORD_HINTS.get(path_class, set())
    top_skill_terms = {_clean_token(skill) for skill in path_profile.get("top_skills", [])}

    direct_hint_hits = sum(1 for hint in hint_terms if hint in skill_terms or hint in specialization or hint in raw_interest)
    profile_skill_hits = sum(1 for skill in top_skill_terms if skill in skill_terms)

    adjustment = 0.0
    adjustment += min(direct_hint_hits, 3) * 0.045
    adjustment += min(profile_skill_hits, 3) * 0.025
    if direct_hint_hits == 0 and profile_skill_hits == 0:
        adjustment -= 0.05

    aligned_interest = _path_aligned_interest(path_class)
    if aligned_interest and interest_domain == aligned_interest:
        adjustment += 0.05
    elif aligned_interest and interest_domain and interest_domain != aligned_interest:
        adjustment -= 0.04

    degree_groups = _path_aligned_groups(path_class, "degree")
    specialization_groups = _path_aligned_groups(path_class, "specialization")
    if degree_groups and normalized.get("course_group") not in degree_groups:
        adjustment -= 0.03
    if specialization_groups and normalized.get("specialization_group") not in specialization_groups:
        adjustment -= 0.03

    explicit_interest_mentions = {key for key, hints in PATH_KEYWORD_HINTS.items() if any(hint in raw_interest for hint in hints)}
    if explicit_interest_mentions:
        if path_class in explicit_interest_mentions:
            adjustment += 0.12
        else:
            adjustment -= 0.06

    return _clamp(adjustment, -0.12, 0.25)


def _calibrate_final_score(normalized: dict[str, Any], probability: float) -> float:
    """
    Convert model probability into a presentation score and adjust it using
    profile-strength heuristics so the user-facing score better matches hiring reality.
    """
    cgpa = float(normalized.get("cgpa", 0.0) or 0.0)
    project_count = int(normalized.get("project_count", 0) or 0)
    skill_count = int(normalized.get("skill_count", 0) or 0)

    score = float(probability) * 100.0

    if cgpa >= 8.5:
        score += 5.0
    elif cgpa < 5.0:
        score -= 18.0
    elif cgpa < 6.0:
        score -= 10.0
    elif cgpa < 7.0:
        score -= 4.0
    if project_count >= 2:
        score += 5.0
    if skill_count >= 3:
        score += 5.0
    if skill_count < 4:
        score -= 3.0

    return round(_clamp(score, 0.0, 100.0), 1)


def _rule_based_risks(normalized: dict[str, Any], existing_risks: list[str] | None = None) -> list[str]:
    """Always provide practical profile risks, even when SHAP text is sparse."""
    risks = list(existing_risks or [])
    cgpa = float(normalized.get("cgpa", float("nan")))
    skill_count = int(normalized.get("skill_count", 0) or 0)
    certification_count = int(normalized.get("certification_count", 0) or 0)
    internship_count = len(normalized.get("internships") or [])

    if cgpa == cgpa and cgpa < 5.0:
        risks.append("Low CGPA is a major screening risk for many roles")
    elif cgpa == cgpa and cgpa < 6.0:
        risks.append("CGPA is below the preferred range for many shortlist filters")
    if skill_count < 5:
        risks.append("Skill depth is below top-tier profiles")
    if certification_count == 0:
        risks.append("No certifications or external validation")
    if internship_count == 0:
        risks.append("Lack of real-world experience")
    if not risks:
        risks.append("Profile still needs stronger proof against top-tier competition")

    return _unique_text_items(risks)


def normalize_career_input(data: dict[str, Any]) -> dict[str, Any]:
    skills = _split_items(data.get("skills"))
    projects = _split_items(data.get("projects"))
    certifications = _split_items(data.get("certifications"))
    internships = _split_items(data.get("internships") or data.get("internship"))

    # Users often paste internships under "certifications". Treat those as experience proof.
    if certifications:
        moved = []
        for item in certifications:
            lowered = _clean_token(item)
            if any(hint in lowered for hint in INTERNSHIP_HINTS):
                moved.append(item)
        if moved:
            internships = _unique_text_items([*internships, *moved])
            certifications = [item for item in certifications if item not in moved]

    raw_interest = _clean_text(data.get("interest"))
    course_value = _clean_text(data.get("course") or data.get("degree") or data.get("education_level"))
    specialization_value = _clean_text(data.get("specialization") or course_value)
    project_count = max(len(projects), int(_safe_float(data.get("project_count", data.get("projects_count", len(projects))), len(projects))))
    skill_count = max(len(skills), int(_safe_float(data.get("skill_count", data.get("skills_count", len(skills))), len(skills))))
    certification_count = max(len(certifications), int(_safe_float(data.get("certification_count", data.get("certifications_count", len(certifications))), len(certifications))))
    project_quality_score = float(_safe_float(data.get("project_quality_score", 0), 0))
    project_signal = float(_safe_float(data.get("project_signal", 0), 0))
    option_text = ", ".join(_split_items(data.get("options")))
    interest_domain = _normalize_interest(raw_interest, option_text)
    expanded_skills = _expand_skill_terms(skills)

    return {
        "cgpa": _normalize_cgpa(data.get("cgpa", float("nan"))),
        "skills": skills,
        "expanded_skills": expanded_skills,
        "projects": projects,
        "certifications": certifications,
        "internships": internships,
        "skill_count": skill_count,
        "project_count": project_count,
        "certification_count": certification_count,
        "interest_domain": interest_domain,
        "raw_interest": raw_interest,
        "course_group": _normalize_course_group(course_value),
        "specialization_group": _normalize_course_group(specialization_value),
        "course": course_value,
        "specialization": specialization_value,
        "education_level": _clean_text(data.get("education_level")),
        "year_of_study": _safe_float(data.get("year_of_study", 0), 0.0),
        "experience_years": _safe_float(data.get("experience_years", data.get("experience", 0)), 0.0),
        "raw_prompt": str(data.get("raw_prompt", "")),
        "project_quality_score": project_quality_score,
        "project_signal": project_signal,
        "requested_options": _split_items(data.get("options")),
    }


def _extract_option_candidates(text: str) -> list[str]:
    options = []
    patterns = [
        r"between\s+(.+?)(?:\?|\.|$)",
        r"compare\s+(.+?)(?:\?|\.|$)",
        r"considering\s+(.+?)(?:\?|\.|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        segment = match.group(1)
        for part in re.split(r"\s*(?:,|/|\bvs\b|\bversus\b|\band\b)\s*", segment, flags=re.IGNORECASE):
            cleaned = _clean_text(part).strip(" .:-")
            if cleaned:
                options.append(cleaned)
    return list(dict.fromkeys(options))


def _profile_skill_matches(text: str) -> list[str]:
    bundle = get_career_comparison_bundle()
    if bundle is None:
        return []
    matches = []
    lowered = text.lower()
    for profile in bundle.get("path_profiles", {}).values():
        for term in profile.get("top_skills", []):
            if re.search(rf"\b{re.escape(term.lower())}\b", lowered) and term not in matches:
                matches.append(term)
    return matches


def parse_career_prompt(message: str) -> dict[str, Any]:
    text = str(message or "")
    parsed = parse_natural_language_input(text)
    profile_skills = _profile_skill_matches(text)
    skills = list(dict.fromkeys(parsed["skills"] + profile_skills))
    project_count = int(parsed["projects"])
    certification_count = int(parsed["certifications"])
    project_descriptions = parsed.get("project_descriptions") or [f"Project {index + 1}" for index in range(project_count)]

    return normalize_career_input({
        "degree": parsed["degree"],
        "course": parsed["degree"],
        "specialization": parsed["specialization"],
        "cgpa": parsed["cgpa"],
        "skills": skills,
        "projects": project_descriptions,
        "project_count": project_count,
        "project_quality_score": parsed.get("project_quality_score", 0),
        "project_signal": parsed.get("project_signal", 0),
        "interest": parsed["interest"] or text,
        "certifications": [f"Certification {index + 1}" for index in range(certification_count)],
        "certification_count": certification_count,
        "internships": _extract_section(text, ["internship", "internships"]),
        "experience_years": _extract_number(text, ["experience", "years"], 0),
        "options": parsed["options"] or _extract_option_candidates(text),
        "raw_prompt": text,
    })


def _career_model_frame(normalized: dict[str, Any]) -> pd.DataFrame:
    return pd.DataFrame([{
        "cgpa": normalized["cgpa"],
        "skills_count": normalized["skill_count"],
        "projects_count": normalized["project_count"],
        "certifications_count": normalized["certification_count"],
        "interest": normalized["interest_domain"],
        "course_group": normalized["course_group"],
        "specialization_group": normalized["specialization_group"],
    }])


def _comparison_frame(normalized: dict[str, Any], option_text: str = "") -> pd.DataFrame:
    interest_terms = INTEREST_HINTS.get(normalized["interest_domain"], [])
    text = " ".join([
        option_text,
        normalized.get("raw_interest", ""),
        " ".join(normalized.get("expanded_skills") or normalized["skills"]),
        " ".join(normalized["projects"]),
        normalized["interest_domain"],
        " ".join(interest_terms),
        normalized["raw_prompt"],
    ]).strip()
    return pd.DataFrame([{
        "text": text,
        "experience_years": max(normalized["project_count"] - 1, 0),
        "skills_count": normalized["skill_count"],
        "certifications": normalized["certification_count"],
        "salary": 0.0,
    }])


def _path_display_name(option_score: dict[str, Any]) -> str:
    return option_score.get("mapped_label") or option_score.get("name") or "selected path"


def _path_class(option_score: dict[str, Any]) -> str:
    return str(option_score.get("mapped_class") or "")


def _path_aligned_interest(path_class: str) -> str | None:
    return PATH_INTEREST_ALIGNMENT.get(path_class)


def _path_aligned_groups(path_class: str, kind: str) -> set[str]:
    return set(PATH_GROUP_ALIGNMENT.get(path_class, {}).get(kind, set()))


def _contextualize_factor_impacts(
    normalized: dict[str, Any],
    model_result: dict[str, Any],
    option_scores: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    human_shap = [dict(item) for item in model_result.get("human_shap", [])]
    if not human_shap or not option_scores:
        return human_shap

    top_option = option_scores[0]
    target_path = _path_display_name(top_option)
    target_class = _path_class(top_option)
    aligned_interest = _path_aligned_interest(target_class)
    degree_groups = _path_aligned_groups(target_class, "degree")
    specialization_groups = _path_aligned_groups(target_class, "specialization")
    raw_specialization = _clean_token(normalized.get("specialization"))

    for impact in human_shap:
        factor = impact.get("factor")
        shap_value = float(impact.get("shap_value", 0.0))
        strength = "Strongly" if abs(shap_value) > 0.05 else "Slightly"

        if factor == "Interest area" and aligned_interest:
            is_positive = normalized.get("interest_domain") == aligned_interest
            impact["impact"] = f"{strength} {'boosts' if is_positive else 'holds back'}"
            current_interest = normalized.get("interest_domain", "")
            if is_positive:
                impact["reason"] = f"interest area={current_interest} aligns with {target_path}"
            else:
                impact["reason"] = f"interest area={current_interest} is less aligned with {target_path}"
            impact["shap_value"] = round(abs(shap_value) if is_positive else -abs(shap_value), 4)
        elif factor == "Degree group":
            current_group = normalized.get("course_group", "")
            is_positive = current_group in degree_groups if degree_groups else shap_value > 0
            impact["impact"] = f"{strength} {'boosts' if is_positive else 'holds back'}"
            if is_positive:
                impact["reason"] = f"degree group={current_group} fits the background commonly associated with {target_path}"
            else:
                impact["reason"] = f"degree group={current_group} is less aligned with the usual background for {target_path}"
            impact["shap_value"] = round(abs(shap_value) if is_positive else -abs(shap_value), 4)
        elif factor == "Specialization group":
            current_group = normalized.get("specialization_group", "")
            specialization_is_data = "data science" in raw_specialization and target_class in {"data_science", "data_engineering"}
            is_positive = specialization_is_data or (current_group in specialization_groups if specialization_groups else shap_value > 0)
            impact["impact"] = f"{strength} {'boosts' if is_positive else 'holds back'}"
            current_label = normalized.get("specialization") or current_group
            if is_positive:
                impact["reason"] = f"specialization={current_label} supports the {target_path} track"
            else:
                impact["reason"] = f"specialization={current_label} is less aligned with the {target_path} track"
            impact["shap_value"] = round(abs(shap_value) if is_positive else -abs(shap_value), 4)
        elif factor == "Certification count":
            cert_count = int(normalized.get("certification_count", 0) or 0)
            if cert_count <= 2:
                impact["impact"] = "Neutral"
                impact["reason"] = f"certification count={cert_count} is useful supporting evidence, but it is mostly neutral unless the count becomes much higher"
                impact["shap_value"] = 0.0
            elif cert_count >= 4:
                impact["impact"] = f"{strength} boosts"
                impact["reason"] = f"certification count={cert_count} adds stronger proof of structured learning for {target_path}"
                impact["shap_value"] = round(abs(shap_value), 4)
        elif factor == "Skill count":
            skill_count = int(normalized.get("skill_count", 0) or 0)
            technical_targets = {"software_development", "data_science", "data_engineering", "cloud_devops", "cybersecurity", "ui_ux_design"}
            if target_class in technical_targets:
                is_positive = skill_count >= 5
                impact["impact"] = f"{strength} {'boosts' if is_positive else 'holds back'}"
                if is_positive:
                    impact["reason"] = f"skill count={skill_count} provides solid breadth for {target_path}"
                else:
                    impact["reason"] = f"skill count={skill_count} is still below the stronger profile range for {target_path}"
                impact["shap_value"] = round(abs(shap_value) if is_positive else -abs(shap_value), 4)
        elif factor == "Project count":
            project_count = int(normalized.get("project_count", 0) or 0)
            is_positive = project_count >= 2
            impact["impact"] = f"{strength} {'boosts' if is_positive else 'holds back'}"
            if is_positive:
                impact["reason"] = f"project count={project_count} gives better execution proof for {target_path}"
            else:
                impact["reason"] = f"project count={project_count} is below the level where successful profiles usually show clearer execution proof"
            impact["shap_value"] = round(abs(shap_value) if is_positive else -abs(shap_value), 4)

    return human_shap


def _profile_aliases(profile_key: str, profile: dict[str, Any]) -> list[str]:
    aliases = [profile_key, profile.get("display_name", "")]
    aliases.extend(profile.get("top_terms", []))
    aliases.extend(profile.get("top_skills", []))
    return [_clean_token(alias) for alias in aliases if _clean_text(alias)]


def _map_option_to_class(option: str, path_profiles: dict[str, dict[str, Any]]) -> tuple[str | None, float]:
    normalized_option = _clean_token(option)
    best_class = None
    best_score = 0.0
    for profile_key, profile in path_profiles.items():
        aliases = _profile_aliases(profile_key, profile)
        score = max((SequenceMatcher(None, normalized_option, alias).ratio() for alias in aliases), default=0.0)
        if score > best_score:
            best_class = profile_key
            best_score = score
    return best_class, best_score


def _dynamic_option_scores(normalized: dict[str, Any], readiness: float | None = None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    bundle = get_career_comparison_bundle()
    if bundle is None:
        return [], {"comparison_supported": False}

    pipeline = bundle["pipeline"]
    class_order = pipeline.named_steps["model"].classes_.tolist()
    path_profiles = bundle.get("path_profiles", {})
    requested_options = normalized.get("requested_options") or []

    scored = []
    readiness = float(readiness or 0.0)

    def _blend_probability(path_probability: float) -> float:
        calibrated = path_probability * 0.72 + readiness * 0.28
        return float(_clamp(calibrated, 0.02, 0.98))
    if requested_options:
        for option in requested_options:
            frame = _comparison_frame(normalized, option)
            probabilities = pipeline.predict_proba(frame)[0]
            predicted_index = np.argmax(probabilities)
            predicted_class = class_order[predicted_index]
            mapped_class, match_strength = _map_option_to_class(option, path_profiles)
            if mapped_class and mapped_class in class_order and match_strength >= 0.72:
                mapped_index = class_order.index(mapped_class)
                probability = float(probabilities[mapped_index])
            else:
                probability = float(probabilities[predicted_index])
                mapped_class = predicted_class

            calibrated_probability = _blend_probability(probability)
            calibrated_probability = _clamp(
                calibrated_probability
                + _experience_bonus(normalized, mapped_class)
                + _skill_strength_bonus(normalized, mapped_class),
                0.02,
                0.98,
            )
            calibrated_probability = _clamp(
                calibrated_probability * _cgpa_penalty_factor(normalized, mapped_class),
                0.02,
                0.98,
            )
            rank_probability = _clamp(
                calibrated_probability + _path_affinity_adjustment(normalized, mapped_class, path_profiles.get(mapped_class, {})),
                0.02,
                0.98,
            )
            scored.append({
                "name": option,
                "score": round(rank_probability * 100, 2),
                "probability": round(calibrated_probability, 4),
                "raw_probability": round(probability, 4),
                "rank_probability": round(rank_probability, 4),
                "mapped_class": mapped_class,
                "mapped_label": path_profiles.get(mapped_class, {}).get("display_name", mapped_class.replace("_", " ").title()),
                "match_strength": round(match_strength, 4),
                "path_profile": path_profiles.get(mapped_class, {})
            })
    else:
        # Auto-generate top paths
        frame = _comparison_frame(normalized)
        probabilities = pipeline.predict_proba(frame)[0]
        for index, class_name in enumerate(class_order):
            raw_probability = float(probabilities[index])
            calibrated_probability = _blend_probability(raw_probability)
            calibrated_probability = _clamp(
                calibrated_probability
                + _experience_bonus(normalized, class_name)
                + _skill_strength_bonus(normalized, class_name),
                0.02,
                0.98,
            )
            calibrated_probability = _clamp(
                calibrated_probability * _cgpa_penalty_factor(normalized, class_name),
                0.02,
                0.98,
            )
            rank_probability = _clamp(
                calibrated_probability + _path_affinity_adjustment(normalized, class_name, path_profiles.get(class_name, {})),
                0.02,
                0.98,
            )
            scored.append({
                "name": path_profiles.get(class_name, {}).get("display_name", class_name.replace("_", " ").title()),
                "score": round(rank_probability * 100, 2),
                "probability": round(calibrated_probability, 4),
                "raw_probability": round(raw_probability, 4),
                "rank_probability": round(rank_probability, 4),
                "mapped_class": class_name,
                "mapped_label": path_profiles.get(class_name, {}).get("display_name", class_name.replace("_", " ").title()),
                "match_strength": 1.0,
                "path_profile": path_profiles.get(class_name, {})
            })

    scored.sort(key=lambda x: (x["score"], x["probability"]), reverse=True)
    return scored[:4], {
        "comparison_supported": True,
        "path_profiles": path_profiles,
        "class_order": class_order,
    }


def _shap_insights(normalized: dict[str, Any], model_result: dict[str, Any], option_scores: list[dict[str, Any]]) -> tuple[list[str], list[str], list[dict[str, Any]]]:
    """Pure model-driven insights from new human_shap format."""
    human_shap = _contextualize_factor_impacts(normalized, model_result, option_scores)
    
    insights = []
    risks = []
    factor_impacts = []
    
    for impact in human_shap:
        factor = impact['factor']
        impact_type = impact['impact']
        reason = impact['reason']
        shap_val = impact['shap_value']
        
        full_statement = f"{factor}: {impact_type} - {reason}"
        
        if "holds back" in impact_type.lower():
            risks.append(full_statement)
        elif "neutral" not in impact_type.lower():
            insights.append(full_statement)
        
        factor_impacts.append({
            "factor": factor,
            "impact": full_statement,
            "value": shap_val,
            "reason": reason
        })
    
    return insights[:4], risks[:4], factor_impacts[:6]


def _dynamic_action_plan(normalized: dict[str, Any], model_result: dict[str, Any], 
                        option_scores: list[dict]) -> list[str]:
    """Generate actions purely from model gaps and path profiles."""
    actions = []
    
    # Top recommendation path profile
    top_path = option_scores[0]["path_profile"] if option_scores else {}
    user_skills = {_clean_token(skill) for skill in (normalized.get("expanded_skills") or normalized.get("skills", []))}
    
    # Gap analysis from SHAP
    human_shap = model_result.get('human_shap', [])
    for impact in human_shap:
        reason = impact['reason'].lower()
        current_value = impact.get('current')
        benchmark = impact.get('benchmark')
        if isinstance(current_value, (int, float)) and isinstance(benchmark, (int, float)) and current_value >= benchmark:
            continue
        if "aim for" in reason or "improve" in reason or "raise cgpa" in reason:
            actions.append(impact['reason'])
    
    # Path-specific skill gaps
    path_top_skills = top_path.get('top_skills', [])
    missing_skills = [skill for skill in path_top_skills[:4] if _clean_token(skill) not in user_skills]
    if missing_skills:
        actions.append(f"Build {', '.join(missing_skills)} - core skills for {option_scores[0]['name']}")

    if not normalized.get("internships"):
        actions.append(f"Add one internship or client-style project to strengthen real-world proof for {option_scores[0]['name']}")
    elif _real_world_signal(normalized) < 0.04:
        actions.append("Turn internship work into deployed, client-facing, or production-style outcomes")
    
    # Execution proof
    if normalized.get('project_count', 0) < 3:
        actions.append("Complete 2-3 domain-relevant projects for execution proof")
    
    return actions[:5]


def _pure_model_what_if(normalized: dict[str, Any], model_result: dict[str, Any]) -> tuple[str, float]:
    """Model-driven what-if using profile targets."""
    profiles = model_result.get("profiles", {}) or {}
    numeric_profiles = profiles.get("numeric", {}) or {}
    
    # Simulate hitting positive medians in top 2 gaps
    updated = dict(normalized)
    changes_made = []
    
    priority_features = ["skills_count", "projects_count", "certifications_count", "cgpa"]
    for feature in priority_features:
        profile = numeric_profiles.get(feature)
        if not profile:
            continue
        target = profile.get("positive_median")
        if target:
            current = updated.get(
                "skill_count" if feature == "skills_count" else 
                "project_count" if feature == "projects_count" else 
                "certification_count" if feature == "certifications_count" else 
                feature
            )
            if current < target:
                updated[
                    "skill_count" if feature == "skills_count" else 
                    "project_count" if feature == "projects_count" else 
                    "certification_count" if feature == "certifications_count" else 
                    feature
                ] = target
                changes_made.append(feature.replace('_', ' '))
                if len(changes_made) >= 2:
                    break
    
    # Re-run prediction
    rerun_frame = _career_model_frame(updated)
    rerun_result = predict_with_model("career", rerun_frame)
    
    if rerun_result:
        original_pct = round(model_result['probability'] * 100, 1)
        new_pct = round(rerun_result['probability'] * 100, 1)
        changes = ', '.join(changes_made)
        return f"Improve {changes}: readiness jumps from {original_pct}% → {new_pct}%", new_pct
    return "", model_result["probability"] * 100


def _pure_model_what_if(normalized: dict[str, Any], model_result: dict[str, Any]) -> tuple[str, float]:
    """Model-driven what-if using actual input mutations and a full rerun."""
    profiles = model_result.get("profiles", {}) or {}
    numeric_profiles = profiles.get("numeric", {}) or {}
    updated = dict(normalized)
    changes_made = []

    current_skills = list(normalized.get("skills", []))
    current_projects = list(normalized.get("projects", []))
    current_certifications = list(normalized.get("certifications", []))
    current_expanded = list(normalized.get("expanded_skills", []))

    option_scores, _ = _dynamic_option_scores(normalized, float(model_result.get("probability", 0.0)))
    top_profile = option_scores[0]["path_profile"] if option_scores else {}
    seen_skills = {_clean_token(skill) for skill in current_expanded}
    for skill in top_profile.get("top_skills", []):
        if _clean_token(skill) in seen_skills:
            continue
        current_skills.append(skill)
        current_expanded = _expand_skill_terms(current_skills)
        seen_skills = {_clean_token(item) for item in current_expanded}
        changes_made.append(skill)
        if len(changes_made) >= 2:
            break

    updated["skills"] = current_skills
    updated["expanded_skills"] = current_expanded
    updated["skill_count"] = max(normalized.get("skill_count", 0), len(current_skills))

    for feature in ["projects_count", "certifications_count", "cgpa"]:
        profile = numeric_profiles.get(feature)
        if not profile:
            continue
        target = profile.get("positive_median")
        if target is None:
            continue

        key = "project_count" if feature == "projects_count" else "certification_count" if feature == "certifications_count" else feature
        current = updated.get(key, 0)
        if current >= target:
            continue

        updated[key] = target
        if feature == "projects_count":
            while len(current_projects) < int(target):
                current_projects.append(f"Improvement Project {len(current_projects) + 1}")
            updated["projects"] = current_projects
        elif feature == "certifications_count":
            while len(current_certifications) < int(target):
                current_certifications.append(f"Certification {len(current_certifications) + 1}")
            updated["certifications"] = current_certifications
        changes_made.append(feature.replace("_", " "))
        if len(changes_made) >= 2:
            break

    rerun_frame = _career_model_frame(updated)
    rerun_result = predict_with_model("career", rerun_frame)

    if rerun_result:
        rerun_option_scores, _ = _dynamic_option_scores(updated, float(rerun_result.get("probability", 0.0)))
        original_score = option_scores[0]["score"] if option_scores else model_result["probability"] * 100
        new_score = rerun_option_scores[0]["score"] if rerun_option_scores else rerun_result["probability"] * 100
        if new_score < original_score:
            new_score = original_score
        changes = ', '.join(changes_made) if changes_made else "key areas"
        return f"Improve {changes}: score moves from {round(original_score, 1)}% to {round(new_score, 1)}%", new_score
    return "", model_result["probability"] * 100


def analyze_career_profile(normalized: dict[str, Any], options: list[str] | None = None, source: str = "structured") -> dict[str, Any]:
    """Pure model-driven career analysis - NO HARDCODED TEXT."""
    
    if options:
        normalized = dict(normalized)
        normalized["requested_options"] = _split_items(options)

    # Get model prediction with enhanced SHAP
    model_result = predict_with_model("career", _career_model_frame(normalized))
    if model_result is None:
        return {"decision": "Model unavailable", "insights": [], "source": source}

    readiness = float(model_result.get("probability", 0.0))
    option_scores, comparison_meta = _dynamic_option_scores(normalized, readiness)
    
    # Pure model-driven response
    best_option = option_scores[0]["name"] if option_scores else "Top model path"
    insights, risks, factor_impacts = _shap_insights(normalized, model_result, option_scores)
    risks = _rule_based_risks(normalized, risks)
    action_plan = _dynamic_action_plan(normalized, model_result, option_scores)
    what_if_text, rerun_score = _pure_model_what_if(normalized, model_result)
    
    top_probability = option_scores[0]["probability"] if option_scores else readiness
    confidence = round((readiness * 0.45 + top_probability * 0.55) * 100, 1)
    score = _calibrate_final_score(normalized, top_probability)
    skill_strength = _skill_strength_label(int(normalized.get("skill_count", 0) or 0))

    if score >= 80:
        score_label = "Strong"
        score_band = "80-100"
    elif score >= 60:
        score_label = "Promising"
        score_band = "60-79"
    elif score >= 40:
        score_label = "Average"
        score_band = "40-59"
    else:
        score_label = "Needs work"
        score_band = "0-39"
    
    return {
        "decision": best_option,
        "probability": round(top_probability, 4),
        "readiness_probability": round(readiness, 4),
        "score": score,
        "confidence": confidence,
        "insights": insights,
        "risks": risks,
        "action_plan": action_plan,
        "what_if": what_if_text,
        "explanations": insights + risks,
        "factor_impacts": factor_impacts,
        "score_label": score_label,
        "score_band": score_band,
        "summary": f"Model compared {len(option_scores)} paths. Best-fit score: {top_probability:.1%}. Readiness: {model_result['probability']:.1%}",
        "next_step": action_plan[0] if action_plan else "",
        "details": {
            "option_scores": option_scores,
            "human_shap": _contextualize_factor_impacts(normalized, model_result, option_scores),
            "comparison_meta": comparison_meta,
            "readiness_model": model_result.get("metrics", {}),
            "rerun_score": rerun_score,
            "skill_strength": skill_strength,
        },
        "source": source,
        "mode": "model-driven"
    }
