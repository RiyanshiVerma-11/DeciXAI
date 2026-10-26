import pytest
from services.resume_parser_service import (
    extract_achievements_from_resume,
    extract_skills_from_resume,
    extract_projects_from_resume,
)
from services.hybrid_decision_service import (
    _career_alignment_snapshot,
    _contextualize_factor_impacts,
    normalize_career_input,
    analyze_career_profile,
)


def test_achievement_ordinal_numbers_preserved():
    raw_sample = """
    ACHIEVEMENTS & HONORS
    * 2nd Place Winner at STARTUPATHON Hackathon 2024
    * Rank 8 in HACKDAY National AI Challenge
    * Top 0.11% in PromptWars LLM Prompt Engineering
    * 1st Runner-Up in Inter-College CodeSprint
    """
    achievements = extract_achievements_from_resume(raw_sample)
    assert len(achievements) >= 3
    # Verify ordinal numbers like 2nd, 1st are preserved and not stripped to "nd"
    assert any("2nd" in ach for ach in achievements), f"Ordinal '2nd' corrupted: {achievements}"
    assert any("Top 0.11%" in ach or "PromptWars" in ach for ach in achievements), f"PromptWars missing: {achievements}"


def test_portfolio_proof_offsets_certifications_alignment():
    # Candidate with 2 solid projects and 0 certifications
    normalized = normalize_career_input({
        "cgpa": 8.5,
        "skills": ["Python", "FastAPI", "React", "Docker", "PyTorch", "LangChain"],
        "projects": ["HospiSynAI: Multi-Agent Clinical Diagnosis System", "VoteWise AI: Fact-Checking LLM Platform"],
        "project_descriptions": [
            "Autonomous multi-agent system coordinating triage, FHIR EHR integration, and differential diagnosis",
            "Real-time election claim fact-checking pipeline using RAG and vector embeddings"
        ],
        "certifications": [],
        "achievements": ["2nd Place Winner at STARTUPATHON Hackathon"],
        "target_role": "AI Engineer (Agentic & LLM Systems)",
        "interest": "AI Engineer (Agentic & LLM Systems)",
    })

    top_option = {
        "mapped_class": "ai_engineer",
        "name": "AI Engineer (Agentic & LLM Systems)",
        "path_profile": {"top_skills": ["python", "pytorch", "langchain", "docker", "fastapi"]},
    }

    snapshot = _career_alignment_snapshot(normalized, top_option)

    # Certs should be aligned (due to strong project + hackathon proof) and NOT marked missing
    assert snapshot["certs_aligned"] is True, "Certs must be marked aligned via portfolio offset"
    assert snapshot["certs_missing"] is False, "Certs must not be marked missing when projects/awards exist"
    assert snapshot["projects_aligned"] is True


def test_shap_factors_do_not_penalize_portfolio_strong_candidate():
    model_result = {
        "human_shap": [
            {"factor": "Certification count", "impact": "Slightly holds back", "shap_value": -0.05, "user_value": 0},
            {"factor": "Project count", "impact": "Strongly boosts", "shap_value": 0.08, "user_value": 2},
        ]
    }
    normalized = normalize_career_input({
        "cgpa": 8.5,
        "skills": ["Python", "FastAPI", "Docker", "PyTorch"],
        "projects": ["HospiSynAI", "VoteWise AI"],
        "achievements": ["2nd Place Winner at STARTUPATHON Hackathon"],
        "certifications": [],
        "interest": "AI Engineer",
    })
    option_scores = [
        {"name": "AI Engineer (Agentic & LLM Systems)", "mapped_class": "ai_engineer", "mapped_label": "AI Engineer"}
    ]

    contextualized = _contextualize_factor_impacts(normalized, model_result, option_scores)

    cert_impact = next((f for f in contextualized if f["factor"] == "Certification count"), None)
    assert cert_impact is not None
    # Impact should be neutral or positive, NEVER a negative deduction like -45%
    assert cert_impact["shap_value"] >= 0.0, f"Cert shap_value was negative: {cert_impact['shap_value']}"
    assert "Neutral" in cert_impact.get("impact", "") or "Project-Verified" in cert_impact.get("impact", "")
    assert "project" in cert_impact.get("reason", "").lower() or "hackathon" in cert_impact.get("reason", "").lower()


if __name__ == "__main__":
    pytest.main([__file__])
