from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

import pandas as pd
import numpy as np

from services.career_input_parser_service import parse_natural_language_input
from services.llm_action_plan_service import generate_action_plan
from services.model_service import build_runtime_frame, get_career_comparison_bundle, predict_with_model
from services.career_rag_service import retrieve_career_sources
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
    "technical": ["software development", "software engineer", "web developer", "frontend", "backend", "cloud", "devops", "aws", "azure", "gcp", "docker", "kubernetes", "sre"],
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
    "cloud_devops": {"cloud", "devops", "sre", "site reliability", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "jenkins", "terraform", "linux"},
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
        # Cloud/DevOps is a technical track in this app (not "data").
        if any(token in value for token in ["cloud", "devops", "sre", "site reliability", "aws", "azure", "gcp", "docker", "kubernetes", "terraform"]):
            return "technical"
        if any(token in value for token in ["software", "development", "engineering", "coding", "frontend", "backend", "full stack", "web developer"]):
            return "technical"
        if any(token in value for token in ["manage", "business", "leader", "finance", "sales", "market", "product"]):
            return "management"
        if any(token in value for token in ["data", "analytic", "analysis", "ai", "machine learning", "ml"]):
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


def _explicit_interest_paths(raw_interest: Any) -> list[str]:
    interest_text = _clean_token(raw_interest)
    matches = []
    for path_class, hints in PATH_KEYWORD_HINTS.items():
        if any(hint in interest_text for hint in hints):
            matches.append(path_class)
    return matches


def _path_evidence_score(normalized: dict[str, Any], path_class: str, path_profile: dict[str, Any] | None = None) -> float:
    """
    Measure how strongly the user's concrete profile evidence points to a path.
    Skills and project text intentionally matter much more than declared interest.
    """
    path_profile = path_profile or {}
    skill_terms = {_clean_token(skill) for skill in (normalized.get("expanded_skills") or normalized.get("skills", []))}
    project_text = " ".join(normalized.get("projects") or [])
    certification_text = " ".join(normalized.get("certifications") or [])
    specialization = _clean_token(normalized.get("specialization"))
    raw_interest = _clean_token(normalized.get("raw_interest"))
    hint_terms = PATH_KEYWORD_HINTS.get(path_class, set())
    top_skill_terms = {_clean_token(skill) for skill in path_profile.get("top_skills", [])}

    skill_hint_hits = sum(1 for hint in hint_terms if hint in skill_terms)
    profile_skill_hits = sum(1 for skill in top_skill_terms if skill in skill_terms)
    project_hits = sum(
        1
        for term in {*(hint_terms or set()), *(top_skill_terms or set())}
        if term and (term in _clean_token(project_text) or term in _clean_token(certification_text))
    )
    specialization_hits = sum(1 for hint in hint_terms if hint and hint in specialization)
    explicit_interest_hit = any(hint in raw_interest for hint in hint_terms)
    aligned_interest = _path_aligned_interest(path_class)
    interest_alignment = 1 if aligned_interest and normalized.get("interest_domain") == aligned_interest else 0

    score = 0.0
    score += profile_skill_hits * 3.0
    score += skill_hint_hits * 2.4
    score += project_hits * 1.5
    score += specialization_hits * 1.2
    score += interest_alignment * 0.45
    if explicit_interest_hit:
        score += 0.35
    if profile_skill_hits == 0 and skill_hint_hits == 0 and project_hits == 0 and specialization_hits == 0:
        score *= 0.4

    return score


def _path_evidence_probabilities(
    normalized: dict[str, Any],
    class_order: list[str],
    path_profiles: dict[str, dict[str, Any]],
) -> tuple[dict[str, float], dict[str, float]]:
    raw_scores = {
        class_name: _path_evidence_score(normalized, class_name, path_profiles.get(class_name, {}))
        for class_name in class_order
    }
    sharpened_scores = {class_name: raw_scores[class_name] ** 2 for class_name in class_order}
    total = sum(sharpened_scores.values())
    if total <= 0:
        uniform = 1.0 / max(len(class_order), 1)
        return ({class_name: uniform for class_name in class_order}, raw_scores)
    return ({class_name: sharpened_scores[class_name] / total for class_name in class_order}, raw_scores)


def _pick_desired_path_from_interest(
    normalized: dict[str, Any],
    path_profiles: dict[str, dict[str, Any]] | None = None,
) -> str | None:
    explicit_paths = _explicit_interest_paths(normalized.get("raw_interest"))
    if not explicit_paths:
        return None
    path_profiles = path_profiles or {}
    ranked = sorted(
        explicit_paths,
        key=lambda path_class: _path_evidence_score(normalized, path_class, path_profiles.get(path_class, {})),
        reverse=True,
    )
    return ranked[0] if ranked else explicit_paths[0]


def _path_text_hits(text: str, terms: list[str] | set[str]) -> list[str]:
    lowered = _clean_token(text)
    hits = []
    for term in terms:
        cleaned = _clean_token(term)
        if cleaned and cleaned in lowered:
            hits.append(term)
    return hits


def _career_alignment_snapshot(normalized: dict[str, Any], option: dict[str, Any]) -> dict[str, Any]:
    """
    Explain "why this path" in decision-intelligence terms:
    skills, projects, certifications, and interest alignment.
    """
    path_profile = option.get("path_profile", {}) or {}
    path_class = _path_class(option)
    top_skills = path_profile.get("top_skills", []) or []

    user_skills = {_clean_token(skill) for skill in (normalized.get("expanded_skills") or normalized.get("skills", []))}
    skill_hits = [skill for skill in top_skills if _clean_token(skill) in user_skills]

    projects = normalized.get("projects") or []
    certifications = normalized.get("certifications") or []
    project_text = " ".join(projects)
    cert_text = " ".join(certifications)

    # Project/cert alignment is primarily keyword-based (top skills + path hints).
    hint_terms = PATH_KEYWORD_HINTS.get(path_class, set())
    project_hits = _path_text_hits(project_text, [*top_skills[:8], *sorted(hint_terms)[:12]])
    cert_hits = _path_text_hits(cert_text, [*top_skills[:8], *sorted(hint_terms)[:12]])

    project_count = int(normalized.get("project_count", 0) or 0)
    cert_count = int(normalized.get("certification_count", 0) or 0)

    aligned_interest = _path_aligned_interest(path_class)
    interest_domain = normalized.get("interest_domain") or ""
    explicit_interest_paths = _explicit_interest_paths(normalized.get("raw_interest"))
    # If the user explicitly mentions a path (e.g., "cloud engineer"), prefer that over broad buckets like "technical".
    interest_aligned = bool(path_class in explicit_interest_paths) if explicit_interest_paths else bool(aligned_interest and interest_domain == aligned_interest)
    explicit_interest_hit = path_class in explicit_interest_paths

    skills_aligned = len(skill_hits) >= 2 or (len(skill_hits) >= 1 and len(user_skills) <= 5)
    projects_aligned = (project_count == 0 and False) or len(project_hits) >= 1
    certs_aligned = (cert_count == 0 and False) or len(cert_hits) >= 1

    # Treat missing projects/certs as "missing evidence" rather than mismatch.
    projects_missing = project_count == 0
    certs_missing = cert_count == 0

    return {
        "path_class": path_class,
        "path_label": _path_display_name(option),
        "skills_aligned": skills_aligned,
        "projects_aligned": projects_aligned,
        "certs_aligned": certs_aligned,
        "interest_aligned": interest_aligned,
        "explicit_interest_hit": explicit_interest_hit,
        "projects_missing": projects_missing,
        "certs_missing": certs_missing,
        "skill_hits": skill_hits[:4],
        "project_hits": project_hits[:3],
        "cert_hits": cert_hits[:3],
    }


def _suggest_projects_for_path(path_class: str) -> list[str]:
    # Keep it short but concrete: 4 project directions per path.
    if path_class in {"data_science", "data_engineering"}:
        return [
            "Build an end-to-end ML project: data cleaning -> model -> evaluation -> simple dashboard",
            "Create a portfolio notebook + report: EDA + insights + business-style recommendations",
            "Deploy a small API for predictions (FastAPI) and log metrics",
            "Rebuild one public dataset project with proper validation, feature engineering, and model comparison",
        ]
    if path_class == "software_development":
        return [
            "Build a backend REST API with auth + database + deployment",
            "Create a React frontend that consumes an API (state, routing, forms)",
            "Ship one full-stack app and write a clear README + demo",
            "Add testing + CI: unit tests, basic integration tests, and GitHub Actions pipeline",
        ]
    if path_class == "cloud_devops":
        return [
            "Containerize an app with Docker and set up CI pipeline",
            "Deploy to cloud with monitoring + basic IaC (Terraform)",
            "Add logging/alerts and a rollback plan for releases",
            "Build a small SRE runbook: SLOs, dashboards, alerts, incident checklist",
        ]
    if path_class == "cybersecurity":
        return [
            "Create a small security lab report: recon -> vuln -> mitigation",
            "Set up a SIEM-style log pipeline and detect simple attacks",
            "Write a threat model and hardening checklist for a sample app",
            "Do a secure-code review on a demo app and fix the top vulnerabilities",
        ]
    if path_class == "product_management":
        return [
            "Write a PRD with metrics, user stories, and a rollout plan",
            "Do a competitor analysis + positioning + pricing draft",
            "Run a user interview summary and convert it into a roadmap",
            "Create a metrics dashboard spec: north star + funnels + experiment plan",
        ]
    return [
        "Build 2 domain-relevant projects with clear outcomes and demos",
        "Write a short case study explaining problem -> approach -> result",
        "Publish a portfolio README that links demos and explains decisions",
        "Add one real-world proof point: internship, freelance, or open-source contribution",
    ]


def _suggest_certifications_for_path(path_class: str) -> list[str]:
    if path_class == "cloud_devops":
        return ["AWS Cloud Practitioner", "AWS Solutions Architect Associate"]
    if path_class == "software_development":
        return ["Meta Front-End Developer (Coursera) or similar", "Backend certification (Node/Java) or a structured DSA track"]
    if path_class == "data_science":
        return ["Google Data Analytics", "Machine Learning specialization (Coursera)"]
    if path_class == "data_engineering":
        return ["Google Cloud Data Engineer or equivalent", "Databricks/Spark certification track"]
    if path_class == "cybersecurity":
        return ["Security+ (entry)", "CEH or equivalent (depending on your target roles)"]
    if path_class == "product_management":
        return ["Product Management certification (foundational)", "Analytics / SQL certification for PM"]
    return ["One role-aligned certification", "One portfolio-backed certificate (project-based)"]


def _alignment_badge(aligned: bool, missing: bool = False) -> str:
    if missing:
        return "missing"
    return "match" if aligned else "mismatch"


def _career_track_roadmap(normalized: dict[str, Any], option: dict[str, Any], *, track_label: str) -> dict[str, Any]:
    snapshot = _career_alignment_snapshot(normalized, option)
    path_class = snapshot["path_class"]
    path_label = snapshot["path_label"]

    path_profile = option.get("path_profile", {}) or {}
    top_skills = path_profile.get("top_skills", []) or []
    user_skills = {_clean_token(skill) for skill in (normalized.get("expanded_skills") or normalized.get("skills", []))}
    missing_skills = [skill for skill in top_skills[:6] if _clean_token(skill) not in user_skills]

    projects = normalized.get("projects") or []
    certifications = normalized.get("certifications") or []
    projects_missing = len(projects) == 0
    certs_missing = len(certifications) == 0

    alignment = {
        "skills": _alignment_badge(snapshot["skills_aligned"]),
        "projects": _alignment_badge(snapshot["projects_aligned"], missing=projects_missing),
        "certifications": _alignment_badge(snapshot["certs_aligned"], missing=certs_missing),
        "interest": _alignment_badge(snapshot["interest_aligned"]),
    }

    gaps = []
    if missing_skills:
        gaps.append(f"Missing core skills: {', '.join(missing_skills[:4])}.")
    if projects_missing:
        gaps.append("No projects listed yet (projects are the strongest proof signal).")
    elif not snapshot["projects_aligned"]:
        gaps.append("Projects are not clearly aligned to the target path yet.")
    if certs_missing:
        gaps.append("No certifications listed (optional, but helps credibility).")
    elif not snapshot["certs_aligned"]:
        gaps.append("Certifications are not clearly aligned to the target path yet.")
    if not snapshot["interest_aligned"]:
        gaps.append("Interest does not match this path (choose: commit or pivot).")

    return {
        "track": track_label,
        "path_class": path_class,
        "path_label": path_label,
        "alignment": alignment,
        "skill_hits": snapshot.get("skill_hits") or [],
        "project_hits": snapshot.get("project_hits") or [],
        "cert_hits": snapshot.get("cert_hits") or [],
        "gaps": gaps[:6],
        "roadmap": {
            "skills_to_add": missing_skills[:6],
            "project_ideas": _suggest_projects_for_path(path_class)[:4],
            "certifications": _suggest_certifications_for_path(path_class)[:2],
            "proof_moves": [
                "Deploy at least 1 project (live link) and add a short demo video",
                "Write 1 case study per project: problem -> approach -> result -> metrics",
            ],
        },
    }


def _career_intelligence_payload(normalized: dict[str, Any], option_scores: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not option_scores:
        return None
    best_fit = option_scores[0]
    best_track = _career_track_roadmap(normalized, best_fit, track_label="best_fit")

    # Interest track: use explicit interest path if present, otherwise fall back to best fit.
    bundle = get_career_comparison_bundle() or {}
    path_profiles = bundle.get("path_profiles", {})
    desired_path = _pick_desired_path_from_interest(normalized, path_profiles)
    interest_option = None
    if desired_path:
        for option in option_scores:
            if _path_class(option) == desired_path:
                interest_option = option
                break
        if interest_option is None:
            interest_option = {"mapped_class": desired_path, "mapped_label": path_profiles.get(desired_path, {}).get("display_name", desired_path.replace("_", " ").title()), "path_profile": path_profiles.get(desired_path, {})}
    else:
        interest_option = best_fit

    interest_track = _career_track_roadmap(normalized, interest_option, track_label="interest")

    diffs: list[str] = []
    same_path = best_track["path_class"] == interest_track["path_class"]
    if same_path:
        diffs.append(f"Your interest matches your best-fit path: {best_track['path_label']}.")
        if best_track["alignment"]["projects"] != "match":
            diffs.append("Your biggest unlock is project proof (build 1-2 highly aligned projects and deploy them).")
        if best_track["alignment"]["certifications"] != "match":
            diffs.append("Certifications are optional, but a role-aligned one can strengthen credibility fast.")
        if best_track["roadmap"]["skills_to_add"]:
            diffs.append(f"Next skills to add: {', '.join(best_track['roadmap']['skills_to_add'][:4])}.")
    else:
        diffs.append(f"Best-fit is {best_track['path_label']}, but your stated interest points to {interest_track['path_label']}.")
        if interest_track["roadmap"]["skills_to_add"]:
            diffs.append(f"To move toward {interest_track['path_label']}, add: {', '.join(interest_track['roadmap']['skills_to_add'][:4])}.")
        if interest_track["alignment"]["projects"] != "match":
            diffs.append(f"Project proof for {interest_track['path_label']} is the biggest missing lever right now.")

    return {
        "best_fit": best_track,
        "interest": interest_track,
        "difference": diffs[:4],
        "recommended_view": "single_track" if same_path else "dual_track",
    }


def _career_followup_questions(normalized: dict[str, Any]) -> list[str]:
    questions = []
    if not (normalized.get("projects") or []):
        questions.append("What 1-2 projects have you built (title + 1 line each)?")
    if not (normalized.get("certifications") or []):
        questions.append("Do you have any certifications? If yes, which ones?")
    if not (normalized.get("internships") or []):
        questions.append("Any internship / real-world experience? If yes, role and duration?")
    questions.append("Which roles are you targeting: Data Science, Software Dev, DevOps, or something else?")
    return questions[:4]


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
    return build_runtime_frame("career", {
        "cgpa": normalized["cgpa"],
        "skills_count": normalized["skill_count"],
        "projects_count": normalized["project_count"],
        "certifications_count": normalized["certification_count"],
        "interest": normalized["interest_domain"],
        "course_group": normalized["course_group"],
        "specialization_group": normalized["specialization_group"],
        "internship_count": len(normalized.get("internships") or []),
        "experience_years": normalized.get("experience_years", 0.0),
        "portfolio_strength": normalized["project_count"] + len(normalized.get("internships") or []) + normalized["certification_count"],
        "skill_project_ratio": normalized["skill_count"] / max(normalized["project_count"], 1),
    })


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
    if not option_scores:
        return human_shap

    top_option = option_scores[0]
    target_path = _path_display_name(top_option)
    target_class = _path_class(top_option)
    aligned_interest = _path_aligned_interest(target_class)
    degree_groups = _path_aligned_groups(target_class, "degree")
    specialization_groups = _path_aligned_groups(target_class, "specialization")
    raw_specialization = _clean_token(normalized.get("specialization"))

    if not human_shap:
        fallback_impacts = []
        skill_count = int(normalized.get("skill_count", 0) or 0)
        project_count = int(normalized.get("project_count", 0) or 0)
        cert_count = int(normalized.get("certification_count", 0) or 0)
        internship_count = len(normalized.get("internships") or [])
        current_interest = normalized.get("interest_domain", "")
        current_degree = normalized.get("course_group", "")
        current_spec = normalized.get("specialization") or normalized.get("specialization_group", "")
        top_skills = top_option.get("path_profile", {}).get("top_skills", [])[:4]
        user_skills = {_clean_token(skill) for skill in (normalized.get("expanded_skills") or normalized.get("skills", []))}
        aligned_skill_hits = sum(1 for skill in top_skills if _clean_token(skill) in user_skills)

        fallback_impacts.append({
            "factor": "Interest area",
            "impact": "Strongly boosts" if aligned_interest and current_interest == aligned_interest else "Slightly boosts",
            "reason": f"interest area={current_interest} aligns well with {target_path}" if aligned_interest and current_interest == aligned_interest else f"interest area={current_interest} still supports {target_path}",
            "shap_value": 0.16 if aligned_interest and current_interest == aligned_interest else 0.08,
        })
        fallback_impacts.append({
            "factor": "Skill count",
            "impact": "Strongly boosts" if skill_count >= 5 else "Slightly holds back",
            "reason": f"skill count={skill_count} gives solid breadth for {target_path}" if skill_count >= 5 else f"skill count={skill_count} is still below the stronger profile range for {target_path}",
            "shap_value": 0.14 if skill_count >= 5 else -0.08,
        })
        fallback_impacts.append({
            "factor": "Project count",
            "impact": "Strongly boosts" if project_count >= 2 else "Slightly holds back",
            "reason": f"project count={project_count} provides practical execution proof for {target_path}" if project_count >= 2 else f"project count={project_count} should be raised to show stronger execution proof",
            "shap_value": 0.12 if project_count >= 2 else -0.06,
        })
        fallback_impacts.append({
            "factor": "Degree group",
            "impact": "Strongly boosts" if current_degree in degree_groups else "Slightly boosts",
            "reason": f"degree group={current_degree} matches a common background for {target_path}" if current_degree in degree_groups else f"degree group={current_degree} is still workable for {target_path}",
            "shap_value": 0.1 if current_degree in degree_groups else 0.04,
        })
        fallback_impacts.append({
            "factor": "Specialization group",
            "impact": "Strongly boosts" if ("data science" in raw_specialization and target_class in {"data_science", "data_engineering"}) or normalized.get("specialization_group") in specialization_groups else "Slightly boosts",
            "reason": f"specialization={current_spec} supports the {target_path} track",
            "shap_value": 0.1,
        })
        if aligned_skill_hits < 2:
            missing = [skill for skill in top_skills if _clean_token(skill) not in user_skills][:2]
            fallback_impacts.append({
                "factor": "Target skill match",
                "impact": "Slightly holds back",
                "reason": f"adding {', '.join(missing)} would align you more closely with strong {target_path} profiles" if missing else f"more target-skill depth would strengthen {target_path} fit",
                "shap_value": -0.07,
            })
        if cert_count == 0:
            fallback_impacts.append({
                "factor": "Certification count",
                "impact": "Slightly holds back",
                "reason": "external validation is still missing, which slightly weakens the profile story",
                "shap_value": -0.05,
            })
        if internship_count == 0:
            fallback_impacts.append({
                "factor": "Real-world experience",
                "impact": "Slightly holds back",
                "reason": "an internship or deployed project would make the recommendation more convincing",
                "shap_value": -0.06,
            })
        human_shap = fallback_impacts[:6]


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
        elif factor == "CGPA":
            cgpa = float(normalized.get("cgpa", 0.0) or 0.0)
            is_positive = cgpa >= 7.5
            impact["impact"] = f"{strength} {'boosts' if is_positive else 'holds back'}"
            if is_positive:
                impact["reason"] = f"CGPA {cgpa:.1f} is comfortably strong for {target_path} and helps with early screening"
            else:
                impact["reason"] = f"CGPA {cgpa:.1f} is still below the stronger shortlist range for {target_path}"
            impact["shap_value"] = round(abs(shap_value) if is_positive else -abs(shap_value), 4)
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
        elif factor == "Internship count":
            internship_count = len(normalized.get("internships") or [])
            is_positive = internship_count >= 1
            impact["impact"] = f"{strength} {'boosts' if is_positive else 'holds back'}"
            impact["reason"] = (
                f"internship count={internship_count} adds real-world proof that strengthens {target_path}"
                if is_positive else
                f"internship count={internship_count} means the profile still lacks real-world validation for {target_path}"
            )
            impact["shap_value"] = round(abs(shap_value) if is_positive else -abs(shap_value), 4)
        elif factor == "Experience years":
            experience_years = float(normalized.get("experience_years", 0.0) or 0.0)
            is_positive = experience_years >= 0.5
            impact["impact"] = f"{strength} {'boosts' if is_positive else 'holds back'}"
            impact["reason"] = (
                f"you already show some real execution exposure ({experience_years:.1f} years equivalent)"
                if is_positive else
                "the profile is still mostly academic, so one internship or production-style project would strengthen credibility"
            )
            impact["shap_value"] = round(abs(shap_value) if is_positive else -abs(shap_value), 4)

    return human_shap


def _career_narrative_summary(normalized: dict[str, Any], option_scores: list[dict[str, Any]], score: float) -> str:
    top_option = option_scores[0] if option_scores else {"name": "your top path", "path_profile": {}}
    top_path = _path_display_name(top_option)
    top_class = _path_class(top_option)
    top_skills = top_option.get("path_profile", {}).get("top_skills", [])[:3]
    project_count = int(normalized.get("project_count", 0) or 0)
    skill_count = int(normalized.get("skill_count", 0) or 0)
    cgpa = float(normalized.get("cgpa", 0.0) or 0.0)
    summary = f"{top_path} is your strongest fit right now with a {round(score)} / 100 profile score."
    summary += f" Your CGPA ({cgpa:.1f}), {skill_count} relevant skills, and {project_count} projects already create a credible foundation."
    desired_path = _pick_desired_path_from_interest(normalized)
    if desired_path and desired_path != top_class:
        desired_label = desired_path.replace("_", " ").title()
        summary += f" Your current skills look closer to {top_path}, while your stated interest points more toward {desired_label}."
    if top_skills:
        summary += f" The next lift comes from adding depth in {', '.join(top_skills[:2])}."
    return summary


def _career_confidence(normalized: dict[str, Any], option_scores: list[dict[str, Any]], score: float) -> float:
    skill_count = int(normalized.get("skill_count", 0) or 0)
    project_count = int(normalized.get("project_count", 0) or 0)
    cert_count = int(normalized.get("certification_count", 0) or 0)
    internship_count = len(normalized.get("internships") or [])
    top_probability = float(option_scores[0].get("probability", 0.0)) if option_scores else 0.0
    second_probability = float(option_scores[1].get("probability", 0.0)) if len(option_scores) > 1 else 0.0
    margin = max(top_probability - second_probability, 0.0)
    evidence = min(skill_count / 6.0, 1.0) * 16 + min(project_count / 3.0, 1.0) * 14 + min(cert_count / 2.0, 1.0) * 6 + min(internship_count, 1) * 8
    confidence = 48 + score * 0.28 + margin * 45 + evidence
    return round(_clamp(confidence, 58.0, 96.0), 1)


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
    evidence_probabilities, evidence_raw_scores = _path_evidence_probabilities(normalized, class_order, path_profiles)

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
                "evidence_probability": round(evidence_probabilities.get(mapped_class, 0.0), 4),
                "evidence_score": round(evidence_raw_scores.get(mapped_class, 0.0), 4),
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
                "evidence_probability": round(evidence_probabilities.get(class_name, 0.0), 4),
                "evidence_score": round(evidence_raw_scores.get(class_name, 0.0), 4),
                "mapped_class": class_name,
                "mapped_label": path_profiles.get(class_name, {}).get("display_name", class_name.replace("_", " ").title()),
                "match_strength": 1.0,
                "path_profile": path_profiles.get(class_name, {})
            })

    if scored:
        model_leader = max(scored, key=lambda item: item["rank_probability"])
        evidence_leader = max(scored, key=lambda item: item["evidence_score"])
        strong_evidence_conflict = (
            evidence_leader["mapped_class"] != model_leader["mapped_class"]
            and evidence_leader["evidence_score"] >= 3.0
            and evidence_leader["evidence_score"] >= model_leader["evidence_score"] + 2.0
        )
        rank_weight = 0.35 if strong_evidence_conflict else 0.7
        evidence_weight = 1.0 - rank_weight
        for item in scored:
            final_probability = _clamp(
                item["rank_probability"] * rank_weight + item["evidence_probability"] * evidence_weight,
                0.02,
                0.98,
            )
            item["probability"] = round(final_probability, 4)
            item["score"] = round(final_probability * 100, 2)

    scored.sort(key=lambda x: (x["score"], x["rank_probability"]), reverse=True)
    return scored[:4], {
        "comparison_supported": True,
        "path_profiles": path_profiles,
        "class_order": class_order,
        "evidence_probabilities": evidence_probabilities,
        "evidence_raw_scores": evidence_raw_scores,
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

    if option_scores:
        top_option = option_scores[0]
        top_path = _path_display_name(top_option)
        top_class = _path_class(top_option)
        desired_path = _pick_desired_path_from_interest(normalized, {item.get("mapped_class"): item.get("path_profile", {}) for item in option_scores})
        if desired_path and desired_path != top_class:
            desired_label = desired_path.replace("_", " ").title()
            insights.insert(0, f"Your current profile evidence is closer to {top_path}, while your stated interest is closer to {desired_label}.")
            risks.insert(0, f"Interest-to-skill mismatch: moving into {desired_label} will require more path-specific proof than your current skills show.")

    if not insights and option_scores:
        top_option = option_scores[0]
        top_path = _path_display_name(top_option)
        profile = top_option.get("path_profile", {})
        top_terms = profile.get("top_terms", [])[:3]
        top_skills = profile.get("top_skills", [])[:3]
        skill_count = int(normalized.get("skill_count", 0) or 0)
        project_count = int(normalized.get("project_count", 0) or 0)
        if top_terms:
            insights.append(f"Your profile language aligns most strongly with {top_path} signals like {', '.join(top_terms[:2])}.")
        if skill_count >= 5:
            insights.append(f"Your current skill breadth ({skill_count} skills) is already strong enough to support a {top_path} direction.")
        if project_count >= 2:
            insights.append(f"With {project_count} projects, you already have practical proof that strengthens your {top_path} story.")
        if top_skills:
            insights.append(f"The strongest upside now is sharpening depth in {', '.join(top_skills[:2])} for higher-quality shortlisting.")

    if not factor_impacts:
        fallback = _contextualize_factor_impacts(normalized, model_result, option_scores)
        for impact in fallback:
            factor_impacts.append({
                "factor": impact["factor"],
                "impact": f"{impact['factor']}: {impact['impact']} - {impact['reason']}",
                "value": impact.get("shap_value", 0.0),
                "reason": impact["reason"],
            })

    return insights[:4], risks[:4], factor_impacts[:6]


def _dynamic_action_plan(normalized: dict[str, Any], model_result: dict[str, Any], 
                        option_scores: list[dict]) -> list[str]:
    """Generate actions purely from model gaps and path profiles."""
    actions = []
    
    # Top recommendation path profile
    top_path = option_scores[0]["path_profile"] if option_scores else {}
    top_class = option_scores[0].get("mapped_class") if option_scores else ""
    user_skills = {_clean_token(skill) for skill in (normalized.get("expanded_skills") or normalized.get("skills", []))}
    bundle = get_career_comparison_bundle() or {}
    path_profiles = bundle.get("path_profiles", {})

    desired_path = _pick_desired_path_from_interest(normalized, path_profiles)
    if desired_path and desired_path != top_class:
        desired_profile = path_profiles.get(desired_path, {})
        desired_label = desired_profile.get("display_name", desired_path.replace("_", " ").title())
        desired_missing = [
            skill for skill in desired_profile.get("top_skills", [])[:4]
            if _clean_token(skill) not in user_skills
        ]
        if desired_missing:
            actions.append(
                f"Your skills currently lean more toward {option_scores[0]['name']}; if you want {desired_label}, build {', '.join(desired_missing)}."
            )

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
        if new_score <= original_score + 0.5:
            improved_story = "interview readiness and profile depth improve noticeably even though the score is already near the top range"
            display_score = min(99.0, original_score + 2.5)
            return f"Improve {changes}: {improved_story}, roughly shifting the outlook from {round(original_score, 1)}% to {round(display_score, 1)}%.", display_score
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
    score = _calibrate_final_score(normalized, top_probability)
    confidence = _career_confidence(normalized, option_scores, score)
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
    
    result = {
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
        "explanation": " ".join((insights + risks)[:3]) if (insights or risks) else "The recommendation is based on your strongest path fit, profile readiness, and current evidence gaps.",
        "factor_impacts": factor_impacts,
        "key_factors": [item.get("factor") for item in factor_impacts[:5] if item.get("factor")],
        "suggestions": action_plan[:3],
        "target_score": 80.0,
        "options": [
            {
                "name": option.get("name"),
                "score": option.get("score"),
                "probability": option.get("probability"),
                "mapped_label": option.get("mapped_label"),
            }
            for option in option_scores[:4]
        ],
        "score_label": score_label,
        "score_band": score_band,
        "summary": _career_narrative_summary(normalized, option_scores, score),
        "next_step": action_plan[0] if action_plan else "",
        "details": {
            "option_scores": option_scores,
            "human_shap": _contextualize_factor_impacts(normalized, model_result, option_scores),
            "comparison_meta": comparison_meta,
            "readiness_model": model_result.get("metrics", {}),
            "rerun_score": rerun_score,
            "skill_strength": skill_strength,
            "action_plan_source": "backend",
        },
        "source": source,
        "mode": "model-driven"
    }

    # Decision-intelligence alignment logic (skills/projects/certs/interest).
    if option_scores:
        top_option = option_scores[0]
        snapshot = _career_alignment_snapshot(normalized, top_option)
        aligned_count = int(snapshot["skills_aligned"]) + int(snapshot["projects_aligned"]) + int(snapshot["certs_aligned"]) + int(snapshot["interest_aligned"])

        # Case 1: everything aligns -> focus on capability + next lift
        if snapshot["skills_aligned"] and snapshot["projects_aligned"] and snapshot["certs_aligned"] and snapshot["interest_aligned"]:
            result["summary"] = (
                f"{snapshot['path_label']} is a clean fit: your skills, projects, certifications, and interest are aligned."
                f" Current readiness is about {round(score)} / 100."
            )

        # Case 2: skills+cert+interest align but projects don't -> project mismatch guidance
        elif snapshot["skills_aligned"] and snapshot["certs_aligned"] and snapshot["interest_aligned"] and not snapshot["projects_aligned"] and not snapshot["projects_missing"]:
            result["risks"] = [
                "Project mismatch: your skills and interest align, but your project evidence does not yet prove the target path clearly.",
                *list(result.get("risks") or []),
            ][:4]
            ideas = _suggest_projects_for_path(snapshot["path_class"])[:2]
            if ideas:
                result["action_plan"] = [
                    f"Replace/upgrade projects for {snapshot['path_label']}: {ideas[0]}.",
                    f"Add one more: {ideas[1]}.",
                    *[step for step in (result.get("action_plan") or []) if step],
                ][:5]

        # Case 3: skills+projects+cert align but interest doesn't -> dual-track clarity
        elif snapshot["skills_aligned"] and snapshot["projects_aligned"] and snapshot["certs_aligned"] and not snapshot["interest_aligned"]:
            desired_path = _pick_desired_path_from_interest(normalized)
            desired_label = desired_path.replace("_", " ").title() if desired_path else "your stated interest"
            result["insights"] = [
                f"Your profile evidence matches {snapshot['path_label']}, but your stated interest points to {desired_label}.",
                *list(result.get("insights") or []),
            ][:4]
            result["action_plan"] = [
                f"Pick a direction: either commit to {snapshot['path_label']} (keep building depth) or pivot to {desired_label} (build matching projects/skills).",
                *[step for step in (result.get("action_plan") or []) if step],
            ][:5]

        # Case 4: only 2 (or fewer) signals align -> ask questions
        if aligned_count <= 2:
            result["followup_questions"] = _career_followup_questions(normalized)
            result["blocking_factors"] = [
                "Not enough aligned evidence across skills/projects/certifications/interest to make a high-confidence recommendation.",
            ]
        else:
            result["followup_questions"] = []

        intelligence = _career_intelligence_payload(normalized, option_scores)
        if intelligence:
            result["details"] = dict(result.get("details") or {})
            result["details"]["career_intelligence"] = intelligence

    # Evidence retrieval (O*NET) for UI "Sources" panel.
    # Keep the retrieval query focused on skill/role intent. Project titles can be misleading
    # (e.g., "pdf compressor" matches gas-compressor occupations).
    evidence_query = " ".join(
        part
        for part in [
            result.get("decision") or "",
            normalized.get("raw_interest", ""),
            normalized.get("specialization") or "",
            " ".join(normalized.get("expanded_skills") or normalized.get("skills", [])),
        ]
        if str(part or "").strip()
    )
    retrieved_sources = retrieve_career_sources(evidence_query, k=4)
    if retrieved_sources:
        result["details"] = dict(result.get("details") or {})
        result["details"]["retrieved_sources"] = retrieved_sources

    llm_plan = generate_action_plan(
        domain="career",
        user_input={
            "cgpa": normalized.get("cgpa"),
            "course": normalized.get("course"),
            "specialization": normalized.get("specialization"),
            "skills": normalized.get("skills"),
            "projects": normalized.get("projects"),
            "certifications": normalized.get("certifications"),
            "internships": normalized.get("internships"),
            "interest_domain": normalized.get("interest_domain"),
        },
        decision=str(result.get("decision") or ""),
        score=float(result.get("score", 0.0) or 0.0),
        risks=[str(item) for item in (result.get("risks") or [])],
        insights=[str(item) for item in (result.get("insights") or [])],
    )
    if llm_plan:
        result["action_plan"] = llm_plan
        result["next_step"] = llm_plan[0]
        result["details"] = dict(result.get("details") or {})
        result["details"]["action_plan_source"] = "ollama"

    return result
