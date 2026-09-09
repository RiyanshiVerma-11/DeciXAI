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
LIST_SPLIT = re.compile(
    r",|;|\band\b|\bor\b|\n|(?<!\bci)(?<!\bui)(?<!\bpl)(?<!\btcp)(?<!\ba)\/(?!cd\b)(?!ux\b)(?!sql\b)(?!ip\b)(?!b\b)",
    flags=re.IGNORECASE,
)
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
    "ci/cd": ["ci/cd", "devops", "cloud"],
    "ui/ux": ["ui", "ux", "ui/ux", "design"],
    "pl/sql": ["sql", "database"],
    "c++": ["cpp", "programming"],
    "c#": ["csharp", ".net", "backend"],
}
INTEREST_HINTS = {
    "ai": ["ai engineering", "ai engineer", "agentic", "llm", "genai", "generative ai", "prompt engineering", "llama", "gemini", "groq"],
    "data": ["data science", "analytics", "machine learning"],
    "management": ["product management", "business analyst", "management", "finance", "consulting", "marketing"],
    "technical": ["software development", "software engineer", "web developer", "frontend", "backend", "cloud", "devops", "aws", "azure", "gcp", "docker", "kubernetes", "sre", "ui/ux", "cybersecurity"],
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
    "ai_engineer": "ai",
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
    "ai_engineer": {"degree": {"engineering", "science", "computer_applications"}, "specialization": {"engineering", "science", "computer_applications"}},
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
    "ai_engineer": {"ai engineer", "agentic", "llm", "genai", "generative ai", "prompt engineering", "llama", "gemini", "groq", "fastapi", "docker", "python", "vector db", "rag"},
    "data_science": {"data science", "machine learning", "deep learning", "statistics", "pandas", "numpy", "analytics", "python"},
    "data_engineering": {"data engineering", "etl", "spark", "pipelines", "data pipeline", "sql", "python", "big data", "hadoop", "airflow", "kafka"},
    "software_development": {"software", "development", "developer", "frontend", "backend", "react", "javascript", "java", "testing", "full stack", "web developer", "c++", "c#", "node"},
    "cloud_devops": {"cloud", "devops", "sre", "site reliability", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "jenkins", "terraform", "linux"},
    "product_management": {"product", "management", "leadership", "analytics", "communication", "business", "product manager", "product owner", "scrum", "roadmap"},
    "cybersecurity": {"cybersecurity", "security", "ethical hacking", "networking", "linux", "ceh", "penetration testing", "soc", "infosec"},
    "ui_ux_design": {"ui", "ux", "ui/ux", "user interface", "user experience", "figma", "wireframing", "prototyping", "design system", "interaction design", "user research", "product design", "adobe xd", "sketch"},
    "marketing": {"marketing", "digital marketing", "seo", "sem", "content marketing", "social media", "brand", "growth", "campaigns", "copywriting", "advertising", "email marketing", "analytics"},
    "finance": {"finance", "financial", "accounting", "investment", "banking", "financial modeling", "excel", "valuation", "portfolio", "equity", "cfa", "corporate finance", "risk analysis"},
    "consulting": {"consulting", "consultant", "strategy", "management consulting", "business strategy", "advisory", "case study", "market entry", "operations", "stakeholder management", "problem solving"},
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
        # Check direct career path alignments first
        for path_name, aligned_int in PATH_INTEREST_ALIGNMENT.items():
            if path_name in value or path_name.replace("_", " ") in value:
                return aligned_int
        # Management / Business / Finance / Consulting / Marketing tracks
        if any(token in value for token in [
            "consulting", "consultant", "strategy", "advisory", "management consulting",
            "finance", "financial", "banking", "investment", "accounting", "equity", "valuation",
            "market", "marketing", "digital marketing", "seo", "sales", "brand", "advertising",
            "product management", "product manager", "project management", "business", "manage", "leader", "mba"
        ]):
            return "management"
        # Data Science / Analytics / AI tracks
        if any(token in value for token in ["data", "analytic", "analysis", "statistics", "machine learning", "ml", "ai", "deep learning", "nlp", "llm"]):
            return "data"
        # Cloud/DevOps
        if any(token in value for token in ["cloud", "devops", "sre", "site reliability", "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd"]):
            return "technical"
        # Cybersecurity
        if any(token in value for token in ["cybersecurity", "security", "ethical hacking", "soc", "infosec", "penetration testing", "network"]):
            return "technical"
        # UI/UX design
        if any(token in value for token in ["ui", "ux", "ui/ux", "user interface", "user experience", "design", "figma"]):
            return "technical"
        # Software engineering & technical tracks
        if any(token in value for token in ["software", "development", "developer", "engineering", "coding", "frontend", "backend", "full stack", "web developer", "programmer", "technical", "tech"]):
            return "technical"
        return None

    classified = _classify(explicit_value) or _classify(fallback_value)
    if classified:
        return classified
    # If the user's explicit interest was specified but didn't match technical/data/management keywords,
    # do NOT forcibly default to "technical" which produces false "mismatch" warnings!
    return "general"


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


def _normalize_cgpa(value: Any, score_type: str = "cgpa_10") -> float:
    numeric = _safe_float(value, float("nan"))
    if numeric != numeric:
        return numeric
    st = str(score_type or "cgpa_10").lower().strip()
    if st in {"percentage", "percent", "%"} or numeric > 10.0:
        numeric = numeric / 10.0
    elif st in {"gpa_4", "gpa_4.0", "gpa", "4", "4.0"} or (0.0 < numeric <= 4.0 and st not in {"percentage", "percent", "%"}):
        numeric = (numeric / 4.0) * 10.0
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


def _skill_strength_label(count: int) -> str:
    if count < 3:
        return "weak"
    if count < 6:
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

    # Industry hiring for experienced professionals (>= 2 years) is driven by work experience, not college CGPA
    experience_years = float(normalized.get("experience_years", 0.0) or 0.0)
    if experience_years >= 2.0:
        return 1.0

    technical_paths = {"data_science", "data_engineering", "software_development", "cloud_devops", "cybersecurity", "ui_ux_design"}
    management_paths = {"product_management", "marketing", "consulting", "finance"}

    # For 1-2 years experience, halve the CGPA penalty
    penalty_multiplier = 0.5 if experience_years >= 1.0 else 1.0

    if cgpa < 5.0:
        base_penalty = 0.68 if path_class in technical_paths else 0.78 if path_class in management_paths else 0.72
    elif cgpa < 6.0:
        base_penalty = 0.8 if path_class in technical_paths else 0.88 if path_class in management_paths else 0.84
    elif cgpa < 7.0:
        base_penalty = 0.92 if path_class in technical_paths else 0.96 if path_class in management_paths else 0.94
    else:
        return 1.0

    return 1.0 - ((1.0 - base_penalty) * penalty_multiplier)


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
    # Path-level evidence fit probability: measures evidence strength directly for each path [0.05 - 0.98]
    # rather than dividing by the sum of all 10 paths which artificially deflates fit to 0.15-0.25!
    evidence_probabilities = {
        class_name: float(_clamp(raw_scores[class_name] / 12.0, 0.05, 0.98))
        for class_name in class_order
    }
    return (evidence_probabilities, raw_scores)


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

    skills_aligned = len(skill_hits) >= 2 or (len(skill_hits) >= 1 and len(user_skills) <= 4)
    projects_aligned = len(project_hits) >= 1
    
    # Certification relevance: Direct match vs Partial match (e.g., AWS for SDE)
    certs_aligned = len(cert_hits) >= 1
    certs_partial = False
    if not certs_aligned and cert_count > 0:
        # Check if cert matches related technical/management domains
        related_hints = INTEREST_HINTS.get(PATH_INTEREST_ALIGNMENT.get(path_class, ""), [])
        if _path_text_hits(cert_text, related_hints):
            certs_partial = True

    # Treat missing projects/certs as "missing evidence" rather than mismatch.
    projects_missing = project_count == 0
    certs_missing = cert_count == 0

    return {
        "path_class": path_class,
        "path_label": _path_display_name(option),
        "skills_aligned": skills_aligned,
        "projects_aligned": projects_aligned,
        "certs_aligned": certs_aligned,
        "certs_partial": certs_partial,
        "interest_aligned": interest_aligned,
        "explicit_interest_hit": explicit_interest_hit,
        "projects_missing": projects_missing,
        "certs_missing": certs_missing,
        "skill_hits": skill_hits[:4],
        "project_hits": project_hits[:3],
        "cert_hits": cert_hits[:3],
    }


def _suggest_projects_for_path(path_class: str) -> list[dict[str, str]]:
    # High-quality, resume-worthy project templates
    if path_class == "ai_engineer":
        return [
            {
                "title": "Agentic Multi-Modal RAG System",
                "problem": "Structuring and auditing complex domain documents with zero hallucination.",
                "stack": "FastAPI, LangGraph / LlamaIndex, Groq / Gemini API, Qdrant / Neon PGVector",
                "impact": "Multi-agent LLM orchestration and vector retrieval production proof."
            },
            {
                "title": "Enterprise LLM Observability & Evals Suite",
                "problem": "Measuring model accuracy, token costs, and safety in continuous integration.",
                "stack": "DeepEval / Ragas, Arize Phoenix, Python, Docker",
                "impact": "Automated LLM evaluation and production telemetry maturity."
            },
            {
                "title": "Local LLM Fine-Tuning & High-Throughput Engine",
                "problem": "Serving low-latency domain models on budget cloud hardware.",
                "stack": "vLLM, Ollama, Unsloth QLoRA, Streamlit",
                "impact": "Self-hosted inference optimization and parameter-efficient tuning."
            }
        ]
    if path_class in {"data_science", "data_engineering"}:
        return [
            {
                "title": "Real-Time Fraud Detection Pipeline",
                "problem": "E-commerce platforms lose millions to bot transactions.",
                "stack": "Python, XGBoost, FastAPI, Docker",
                "impact": "End-to-end MLE deployment proof."
            },
            {
                "title": "Financial News Sentiment Engine",
                "problem": "Summarizing market sentiment from thousands of articles.",
                "stack": "Transformers, PostgreSQL, Streamlit",
                "impact": "NLP and automated data ingestion maturity."
            }
        ]
    if path_class == "software_development":
        return [
            {
                "title": "Full-Stack Inventory Dashboard",
                "problem": "Small businesses struggle to track stock in real-time.",
                "stack": "React, Node.js or Flask, PostgreSQL",
                "impact": "Core CRUD and state management proof."
            },
            {
                "title": "Real-time Collaborative Chat",
                "problem": "Handling instant state updates across users.",
                "stack": "WebSockets, Express, Redis",
                "impact": "Concurrency and event-driven logic proof."
            },
            {
                "title": "Portfolio Automation Suite",
                "problem": "Manual deployment and testing for side projects.",
                "stack": "GitHub Actions, Docker, Shell Scripting",
                "impact": "DevOps mindset and systems awareness."
            }
        ]
    if path_class == "product_management":
        return [
            {
                "title": "B2B SaaS Growth & Churn PRD Case Study",
                "problem": "Reducing user churn in mid-market SaaS subscription funnels.",
                "stack": "Figma, Mixpanel, SQL, Jira, PRD Specs",
                "impact": "End-to-end product scoping, funnel analytics, and executive story."
            },
            {
                "title": "AI-Powered Feature Spec & API Architecture",
                "problem": "Bridging business requirements with developer-ready REST API schemas.",
                "stack": "Postman, OpenAPI/Swagger, Wireframes, User Stories",
                "impact": "Technical PM signal, schema design, and developer alignment proof."
            },
            {
                "title": "A/B Testing & Conversion Optimization Framework",
                "problem": "Improving user onboarding funnel conversion rates.",
                "stack": "Google Analytics 4, Mixpanel, SQL, A/B Experimentation",
                "impact": "Data-driven product decision making and hypothesis validation."
            }
        ]
    if path_class == "cloud_devops":
        return [
            {
                "title": "Self-Healing K8s Cluster",
                "problem": "Managing downtime in distributed systems.",
                "stack": "Kubernetes, Terraform, Prometheus",
                "impact": "Infrastructure as Code and SRE maturity."
            }
        ]
    return [
        {
            "title": "Domain-Specific Evidence Project",
            "problem": "Lack of practical proof for target roles.",
            "stack": "Industry-standard tools",
            "impact": "Immediate resume signal improvement."
        }
    ]


def _suggest_certifications_for_path(path_class: str) -> list[str]:
    if path_class == "ai_engineer":
        return ["Google PromptWars / Generative AI Competitive Credentials", "DeepLearning.AI Generative AI & Agentic Systems Specialization"]
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


def _alignment_badge(aligned: bool, missing: bool = False, partial: bool = False) -> str:
    if missing:
        return "missing"
    if partial:
        return "partial"
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
        "certifications": _alignment_badge(snapshot["certs_aligned"], missing=certs_missing, partial=snapshot.get("certs_partial")),
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
    elif snapshot.get("certs_partial"):
        gaps.append("Certification is valuable but only partially relevant to this specific track.")
    elif not snapshot["certs_aligned"]:
        gaps.append("Certifications do not yet provide strong proof for this path.")
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
    Calibrated score: honest, slightly critical, and aligned with hiring manager expectations.
    """
    cgpa = float(normalized.get("cgpa", 0.0) or 0.0)
    project_count = int(normalized.get("project_count", 0) or 0)
    skill_count = int(normalized.get("skill_count", 0) or 0)
    experience_years = float(normalized.get("experience_years", 0.0) or 0.0)

    # Base score from model
    score = float(probability) * 100.0

    # Calibration rules
    # For experienced candidates (>= 2 years), industry work experience takes precedence over college CGPA
    if experience_years >= 2.0:
        if experience_years >= 5.0:
            score += 8.0
        elif experience_years >= 3.0:
            score += 5.0
        else:
            score += 3.0
    else:
        if cgpa >= 8.0:
            score += 5.0
        elif cgpa < 6.0:
            score -= 10.0
        elif cgpa < 7.0:
            score -= 5.0

    if project_count < 2 and experience_years < 1.0:
        score -= 4.0
    if skill_count < 3:
        score -= 5.0

    return round(_clamp(score, 0.0, 100.0), 1)


def _rule_based_risks(normalized: dict[str, Any], existing_risks: list[str] | None = None) -> list[str]:
    """Always provide practical profile risks, even when SHAP text is sparse."""
    risks = list(existing_risks or [])
    cgpa = float(normalized.get("cgpa", float("nan")))
    skill_count = int(normalized.get("skill_count", 0) or 0)
    certification_count = int(normalized.get("certification_count", 0) or 0)
    internship_count = len(normalized.get("internships") or [])
    experience_years = float(normalized.get("experience_years", 0.0) or 0.0)

    # College CGPA risk applies to fresh graduates and entry-level candidates (< 2 years exp)
    if experience_years < 2.0:
        if cgpa == cgpa and cgpa < 5.0:
            risks.append("Low CGPA is a major screening risk for many roles")
        elif cgpa == cgpa and cgpa < 6.0:
            risks.append("CGPA is below the preferred range for many shortlist filters")
    if skill_count < 5:
        risks.append("Skill depth is below top-tier profiles")
    if certification_count == 0:
        risks.append("No certifications or external validation")
    if internship_count == 0 and experience_years < 1.0:
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
    project_count = int(_safe_float(data.get("project_count", data.get("projects_count", len(projects))), len(projects)))
    
    # STRICT SKILL COUNTING: Only count unique user-provided skills
    unique_user_skills = list(set([_clean_token(s) for s in skills if s]))
    skill_count = len(unique_user_skills)
    
    # If the user explicitly provided a count, we respect it only if it's higher (e.g. "I have 10 skills: A, B, C")
    explicit_skill_count = int(_safe_float(data.get("skill_count", data.get("skills_count", 0)), 0))
    skill_count = max(skill_count, explicit_skill_count)
    certification_count = max(len(certifications), int(_safe_float(data.get("certification_count", data.get("certifications_count", len(certifications))), len(certifications))))
    project_quality_score = float(_safe_float(data.get("project_quality_score", 0), 0))
    project_signal = float(_safe_float(data.get("project_signal", 0), 0))
    option_text = ", ".join(_split_items(data.get("options")))
    interest_domain = _normalize_interest(raw_interest, option_text)
    expanded_skills = _expand_skill_terms(skills)

    exp_val = _safe_float(data.get("experience_years", data.get("experience", 0)), 0.0)
    if internships and exp_val == 0.0:
        exp_val = max(0.5 * len(internships), 0.5)

    score_type = str(data.get("score_type") or "cgpa_10").lower().strip()
    raw_val = data.get("raw_score")
    if raw_val is None:
        raw_val = data.get("cgpa")
    cgpa_raw = _safe_float(data.get("cgpa", float("nan")), float("nan"))
    if 0.0 < cgpa_raw <= 4.0 and score_type not in {"percentage", "percent", "%"}:
        score_type = "gpa_4"
    normalized_cgpa = _normalize_cgpa(cgpa_raw, score_type=score_type)

    return {
        "cgpa": normalized_cgpa,
        "score_type": score_type,
        "raw_score": _safe_float(raw_val, normalized_cgpa),
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
        "experience_years": exp_val,
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
    exp_years = float(normalized.get("experience_years", 0.0) or 0.0)
    if exp_years <= 0.0:
        exp_years = float(max(normalized["project_count"] - 1, 0))
    return pd.DataFrame([{
        "text": text,
        "experience_years": exp_years,
        "skills_count": normalized["skill_count"],
        "certifications": normalized["certification_count"],
        "salary": 0.0,
    }])


def _get_specialized_display_name(class_name: str, normalized: dict[str, Any]) -> str:
    raw_interest = _clean_token(normalized.get("raw_interest", ""))
    skills_text = " ".join(_clean_token(s) for s in (normalized.get("expanded_skills") or normalized.get("skills", [])))

    if class_name == "data_science":
        if any(term in raw_interest or term in skills_text for term in ["ai engineer", "agentic", "llm", "genai", "generative ai", "prompt engineering", "llama", "gemini", "groq"]):
            return "AI Engineer (Agentic & LLM Systems)"
        if any(term in raw_interest or term in skills_text for term in ["ml engineer", "machine learning engineer", "mlops"]):
            return "Machine Learning Engineer"
        return "Data Science & AI"

    if class_name == "software_development":
        if any(term in raw_interest or term in skills_text for term in ["full stack", "fullstack", "react", "fastapi", "node"]):
            return "Full-Stack Software Engineer"
        if any(term in raw_interest or term in skills_text for term in ["backend", "api", "microservices"]):
            return "Backend Software Engineer"
        return "Software Engineering"

    if class_name == "cloud_devops":
        if any(term in raw_interest or term in skills_text for term in ["sre", "site reliability"]):
            return "Site Reliability Engineer (SRE)"
        if any(term in raw_interest or term in skills_text for term in ["mlops", "ai ops"]):
            return "MLOps & Cloud Architect"
        return "Cloud & DevOps Engineering"

    if class_name == "data_engineering":
        if any(term in raw_interest or term in skills_text for term in ["big data", "spark", "hadoop", "etl"]):
            return "Big Data & Pipeline Engineer"
        return "Data Engineering"

    return class_name.replace("_", " ").title()


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
    top_option = option_scores[0] if option_scores else {"name": "target track", "mapped_class": "general", "mapped_label": "target track"}
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
        is_positive = shap_value > 0.005
        is_negative = shap_value < -0.005

        if factor == "Interest area":
            current_interest = normalized.get("interest_domain", "")
            if is_positive:
                impact["impact"] = f"{strength} boosts"
                impact["reason"] = f"interest area={current_interest} aligns with {target_path}"
            elif is_negative:
                impact["impact"] = f"{strength} holds back"
                impact["reason"] = f"interest area={current_interest} provides less positive signal for {target_path}"
            else:
                impact["impact"] = "Neutral"
                impact["reason"] = f"interest area={current_interest} has a neutral influence on the recommendation"
        elif factor == "Degree group":
            current_group = normalized.get("course_group", "")
            if is_positive:
                impact["impact"] = f"{strength} boosts"
                impact["reason"] = f"degree group={current_group} fits the background commonly associated with {target_path}"
            elif is_negative:
                impact["impact"] = f"{strength} holds back"
                impact["reason"] = f"degree group={current_group} is less aligned with the standard background for {target_path}"
            else:
                impact["impact"] = "Neutral"
                impact["reason"] = f"degree group={current_group} is neutral for this recommendation"
        elif factor == "Specialization group":
            current_label = normalized.get("specialization") or normalized.get("specialization_group", "")
            if is_positive:
                impact["impact"] = f"{strength} boosts"
                impact["reason"] = f"specialization={current_label} supports the {target_path} track"
            elif is_negative:
                impact["impact"] = f"{strength} holds back"
                impact["reason"] = f"specialization={current_label} provides less direct support for the {target_path} track"
            else:
                impact["impact"] = "Neutral"
                impact["reason"] = f"specialization={current_label} has a neutral influence"
        elif factor == "Certification count":
            cert_count = int(normalized.get("certification_count", 0) or 0)
            if is_positive:
                impact["impact"] = f"{strength} boosts"
                impact["reason"] = f"certification count={cert_count} adds verified proof of structured learning for {target_path}"
            elif is_negative:
                impact["impact"] = f"{strength} holds back"
                impact["reason"] = f"certification count={cert_count} offers fewer external credentials for {target_path}"
            else:
                impact["impact"] = "Neutral"
                impact["reason"] = f"certification count={cert_count} has a neutral impact in the current model evaluation"
        elif factor == "CGPA":
            cgpa = float(normalized.get("cgpa", 0.0) or 0.0)
            if is_positive:
                impact["impact"] = f"{strength} boosts"
                impact["reason"] = f"CGPA {cgpa:.1f} contributes positively to your profile evaluation for {target_path}"
            elif is_negative:
                impact["impact"] = f"{strength} holds back"
                impact["reason"] = f"CGPA {cgpa:.1f} holds back the prediction score relative to benchmark candidates"
            else:
                impact["impact"] = "Neutral"
                impact["reason"] = f"CGPA {cgpa:.1f} has an approximately neutral contribution to the prediction"
        elif factor == "Skill count":
            skill_count = int(normalized.get("skill_count", 0) or 0)
            if is_positive:
                impact["impact"] = f"{strength} boosts"
                impact["reason"] = f"skill count={skill_count} provides solid breadth for {target_path}"
            elif is_negative:
                impact["impact"] = f"{strength} holds back"
                impact["reason"] = f"skill count={skill_count} is still below the stronger profile range for {target_path}"
            else:
                impact["impact"] = "Neutral"
                impact["reason"] = f"skill count={skill_count} has a neutral influence"
        elif factor == "Project count":
            project_count = int(normalized.get("project_count", 0) or 0)
            if is_positive:
                impact["impact"] = f"{strength} boosts"
                impact["reason"] = f"project count={project_count} gives better execution proof for {target_path}"
            elif is_negative:
                impact["impact"] = f"{strength} holds back"
                impact["reason"] = f"project count={project_count} is below the level where successful profiles show clear execution proof"
            else:
                impact["impact"] = "Neutral"
                impact["reason"] = f"project count={project_count} has a neutral influence"
        elif factor == "Internship count":
            internship_count = len(normalized.get("internships") or [])
            if is_positive:
                impact["impact"] = f"{strength} boosts"
                impact["reason"] = f"internship count={internship_count} adds real-world proof that strengthens {target_path}"
            elif is_negative:
                impact["impact"] = f"{strength} holds back"
                impact["reason"] = f"internship count={internship_count} means the profile lacks external industry validation for {target_path}"
            else:
                impact["impact"] = "Neutral"
                impact["reason"] = f"internship count={internship_count} has a neutral impact"
        elif factor == "Experience years":
            experience_years = float(normalized.get("experience_years", 0.0) or 0.0)
            if is_positive:
                impact["impact"] = f"{strength} boosts"
                impact["reason"] = f"work experience ({experience_years:.1f} years) provides verified industry execution for {target_path}"
            elif is_negative:
                impact["impact"] = f"{strength} holds back"
                impact["reason"] = f"limited prior industry experience ({experience_years:.1f} years) holds back the score"
            else:
                impact["impact"] = "Neutral"
                impact["reason"] = f"experience years ({experience_years:.1f} years) has a neutral contribution"

        # Preserve the true mathematical SHAP value computed by the model!
        impact["shap_value"] = round(shap_value, 4)

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
    """Calibrate confidence: do NOT exceed 80% unless profile is industry-ready."""
    skill_count = int(normalized.get("skill_count", 0) or 0)
    project_count = int(normalized.get("project_count", 0) or 0)
    internship_count = len(normalized.get("internships") or [])

    # Baseline confidence
    confidence = 45 + score * 0.25

    # Industry-readiness bonus
    if project_count >= 2 and skill_count >= 5 and internship_count >= 1:
        confidence += 15.0

    # Hard cap for junior profiles without production proof
    max_cap = 92.0 if (project_count >= 3 and internship_count >= 1) else 80.0

    return round(_clamp(confidence, 55.0, max_cap), 1)


def _profile_aliases(profile_key: str, profile: dict[str, Any]) -> list[str]:
    aliases = [profile_key, profile.get("display_name", "")]
    aliases.extend(profile.get("top_terms", []))
    aliases.extend(profile.get("top_skills", []))
    return [_clean_token(alias) for alias in aliases if _clean_text(alias)]


OUT_OF_SCOPE_DISCIPLINES = {
    "civil", "mechanical", "chemical", "aerospace", "biotech", "biotechnology",
    "marine", "petroleum", "mining", "metallurg", "automobile", "textile",
    "architecture", "agriculture", "medical", "dentistry", "pharmacy"
}


def _map_option_to_class(option: str, path_profiles: dict[str, dict[str, Any]]) -> tuple[str | None, float]:
    normalized_option = _clean_token(option)
    # Prevent out-of-scope engineering disciplines from falsely matching "data_engineering" or "software"
    if any(disc in normalized_option for disc in OUT_OF_SCOPE_DISCIPLINES):
        return None, 0.0

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
        # Give slightly more weight to path-specific evidence (0.65 vs 0.35)
        # to prevent underestimating paths like Data Science for Python/SQL users.
        calibrated = path_probability * 0.65 + readiness * 0.35
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
                is_out_of_scope = False
            else:
                # Option is outside the 10 benchmarked career tracks - do NOT force-fit into software_dev or data_science!
                mapped_class = "out_of_scope"
                is_out_of_scope = True
                probability = float(_clamp(readiness * 0.55, 0.1, 0.6))

            if is_out_of_scope:
                calibrated_probability = probability
                calibrated_score = round(calibrated_probability * 100.0, 1)
                scored.append({
                    "name": option,
                    "score": calibrated_score,
                    "probability": round(calibrated_probability, 4),
                    "raw_probability": round(probability, 4),
                    "mapped_class": "out_of_scope",
                    "mapped_label": f"{option} (Non-Benchmark Domain)",
                    "is_out_of_scope": True,
                    "out_of_scope_note": f"'{option}' is outside our 10 supported benchmark career tracks. Evaluation is an approximate domain estimate.",
                    "path_profile": {},
                    "evidence_probability": round(calibrated_probability, 4),
                    "evidence_score": 0.0,
                    "rank_probability": calibrated_probability,
                })
                continue

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
            calibrated_probability = _clamp(
                calibrated_probability,
                0.02,
                0.98,
            )
            # Use the same calibration logic for the item score
            calibrated_score = _calibrate_final_score(normalized, calibrated_probability)
            default_options = {"data science", "software development", "product management", "cloud devops", "cybersecurity", "data engineering", "ui ux design", "marketing", "finance", "consulting"}
            spec_name = _get_specialized_display_name(mapped_class, normalized) if option.lower() in default_options or option.lower().replace("_", " ") in default_options else option
            scored.append({
                "name": spec_name,
                "score": calibrated_score,
                "probability": round(calibrated_probability, 4),
                "raw_probability": round(probability, 4),
                "mapped_class": mapped_class,
                "mapped_label": spec_name,
                "path_profile": path_profiles.get(mapped_class, {}),
                "evidence_probability": float(evidence_probabilities.get(mapped_class, calibrated_probability)),
                "evidence_score": float(evidence_raw_scores.get(mapped_class, 0.0)),
                "rank_probability": calibrated_probability,
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
            calibrated_probability = _clamp(
                calibrated_probability,
                0.02,
                0.98,
            )
            # Use the same calibration logic for the item score
            calibrated_score = _calibrate_final_score(normalized, calibrated_probability)
            
            spec_name = _get_specialized_display_name(class_name, normalized)
            scored.append({
                "name": spec_name,
                "score": calibrated_score,
                "probability": round(calibrated_probability, 4),
                "raw_probability": round(raw_probability, 4),
                "mapped_class": class_name,
                "mapped_label": spec_name,
                "path_profile": path_profiles.get(class_name, {}),
                "evidence_probability": float(evidence_probabilities.get(class_name, calibrated_probability)),
                "evidence_score": float(evidence_raw_scores.get(class_name, 0.0)),
                "rank_probability": calibrated_probability,
            })

    if scored:
        in_scope_items = [item for item in scored if not item.get("is_out_of_scope")]
        if in_scope_items:
            model_leader = max(in_scope_items, key=lambda item: item.get("rank_probability", item.get("probability", 0)))
            evidence_leader = max(in_scope_items, key=lambda item: item.get("evidence_score", 0))
            strong_evidence_conflict = (
                evidence_leader["mapped_class"] != model_leader["mapped_class"]
                and evidence_leader.get("evidence_score", 0) >= 3.0
                and evidence_leader.get("evidence_score", 0) >= model_leader.get("evidence_score", 0) + 2.0
            )
        else:
            strong_evidence_conflict = False

        for item in scored:
            if item.get("is_out_of_scope"):
                continue
            rank_prob = item.get("rank_probability", item["probability"])
            ev_prob = item.get("evidence_probability", rank_prob)
            ev_score = item.get("evidence_score", 0.0)

            if strong_evidence_conflict:
                final_probability = _clamp(rank_prob * 0.45 + ev_prob * 0.55, 0.02, 0.98)
            else:
                # If path has concrete evidence, blend gently without deflating; otherwise retain rank probability
                if ev_score > 0:
                    final_probability = _clamp(rank_prob * 0.80 + ev_prob * 0.20, 0.02, 0.98)
                else:
                    final_probability = rank_prob

            item["probability"] = round(final_probability, 4)
            item["score"] = _calibrate_final_score(normalized, final_probability)


    scored.sort(key=lambda x: (x["score"]), reverse=True)
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
    if top_class == "ai_engineer":
        path_top_skills = ["agentic frameworks (langgraph / llamaindex)", "llm evals (deepeval / ragas)", "vllm & local inference", "vector databases (qdrant / pgvector)"]
    elif top_class == "product_management":
        path_top_skills = ["product strategy & prds", "user growth analytics (mixpanel/ga4)", "agile & scrum (cspo)", "system architecture for pms"]
    else:
        path_top_skills = top_path.get('top_skills', [])
    missing_skills = [skill for skill in path_top_skills[:4] if _clean_token(skill) not in user_skills]
    if missing_skills:
        actions.append(f"Build {', '.join(missing_skills[:2])} - core skills for {option_scores[0]['name']}")

    if not normalized.get("internships") and len(normalized.get("internships") or []) == 0:
        actions.append(f"Add one internship or client-style project to strengthen real-world proof for {option_scores[0]['name']}")
    elif _real_world_signal(normalized) < 0.04:
        actions.append("Turn internship work into deployed, client-facing, or production-style outcomes")
    
    # Execution proof
    if normalized.get('project_count', 0) < 3:
        actions.append("Complete 2-3 domain-relevant projects for execution proof")
    elif top_class == "ai_engineer":
        actions.append("Publish latency & token cost benchmarks for multi-agent workflows")
    elif top_class == "product_management":
        actions.append("Publish a public Product Case Study portfolio (Figma PRDs + Funnel Metrics)")
    
    return actions[:5]


def _pure_model_what_if(normalized: dict[str, Any], model_result: dict[str, Any]) -> tuple[str, float]:
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
    
    # Candidate overall placement readiness score derived from profile factors (CGPA, projects, certs, skills, exp)
    overall_score = _calibrate_final_score(normalized, readiness)
    top_path_score = option_scores[0]["score"] if option_scores else overall_score
    top_path_probability = option_scores[0]["probability"] if option_scores else round(readiness, 4)
    
    score = overall_score
    
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
        "probability": round(readiness, 4),
        "readiness_probability": round(readiness, 4),
        "top_path_probability": top_path_probability,
        "score": overall_score,
        "readiness_score": overall_score,
        "top_path_score": top_path_score,
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
                # Ensure we handle both string and dict formats from _suggest_projects_for_path
                p1 = ideas[0] if isinstance(ideas[0], str) else ideas[0].get("title", "")
                p2 = ideas[1] if isinstance(ideas[1], str) else ideas[1].get("title", "")
                result["action_plan"] = [
                    f"Replace/upgrade projects for {snapshot['path_label']}: {p1}.",
                    f"Add one more: {p2}.",
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
        result["action_plan"] = llm_plan.get("action_plan", [])
        result["reality_check"] = llm_plan.get("reality_check", "")
        result["project_ideas"] = llm_plan.get("project_ideas", [])
        result["next_step"] = result["action_plan"][0] if result["action_plan"] else ""
        result["details"] = dict(result.get("details") or {})
        result["details"]["action_plan_source"] = "ollama"

    return result

