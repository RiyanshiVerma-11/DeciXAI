import sys
from pathlib import Path
import pytest

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from services.career_accelerator_service import (
    simulate_career_what_if,
    match_job_description,
    generate_mock_interview_questions,
    evaluate_interview_response,
    generate_90_day_sprint_roadmap,
    estimate_career_compensation,
)


@pytest.fixture
def sample_profile():
    return {
        "cgpa": 8.5,
        "score_type": "cgpa_10",
        "raw_score": 8.5,
        "course": "B.Tech",
        "specialization": "Computer Science",
        "education_level": "Undergraduate",
        "year_of_study": 4,
        "skills": ["Python", "SQL", "React", "PyTorch"],
        "certifications": ["AWS Cloud Practitioner"],
        "projects": ["Decentralized Ledger System", "Semantic Search Engine"],
        "interest": "Artificial Intelligence",
    }


def test_what_if_simulation(sample_profile):
    modifications = {
        "added_skills": ["Docker", "Kubernetes", "FastAPI"],
        "added_projects": ["High-Throughput Microservice"],
        "added_certs": ["AWS Solutions Architect"],
        "cgpa_delta": 0.5,
    }
    result = simulate_career_what_if(sample_profile, modifications)
    assert result["success"] is True
    assert result["baseline_probability"] > 0
    assert result["simulated_probability"] >= result["baseline_probability"]
    assert len(result["waterfall"]) > 0
    assert "delta_probability" in result


def test_job_description_matching(sample_profile):
    jd_text = """
    We are seeking a Senior AI Engineer with strong Python and PyTorch expertise.
    You will design scalable machine learning microservices with Docker, Kubernetes, and FastAPI.
    Requirements:
    - Bachelor's degree in Computer Science or related engineering field.
    - Experience building and deploying production machine learning models.
    - Strong SQL and database optimization skills.
    """
    result = match_job_description(sample_profile, jd_text)
    assert result["success"] is True
    assert 0 <= result["fit_score"] <= 100
    assert len(result["matched_keywords"]) > 0
    assert len(result["rewritten_bullets"]) >= 2
    assert "optimized_xyz" in result["rewritten_bullets"][0]


def test_mock_interview_questions():
    # 1. Best fit mode
    questions_best_fit = generate_mock_interview_questions(
        role="AI Engineer",
        skill_gaps=["Kubernetes", "Transformers"],
        mode="best_fit",
    )
    assert len(questions_best_fit) >= 3
    assert all("question" in q and "hints" in q for q in questions_best_fit)

    # 2. Resume mode with candidate projects and skills
    questions_resume = generate_mock_interview_questions(
        role="Software Engineer",
        mode="resume",
        candidate_profile={
            "projects": ["HospiSynAI", "VoteWise AI"],
            "skills": ["Python", "FastAPI", "React", "PostgreSQL"],
            "course": "B.Tech Computer Science",
        },
        focus_project="HospiSynAI",
    )
    assert len(questions_resume) >= 3
    assert any("HospiSynAI" in q["question"] or "HospiSynAI" in q.get("category", "") for q in questions_resume)

    # 3. JD mode with custom job description
    jd = "Staff AI/ML Engineer to build LLM agents and vector retrieval pipelines with Python and Docker."
    questions_jd = generate_mock_interview_questions(
        role="Staff AI Engineer",
        mode="jd",
        job_description=jd,
    )
    assert len(questions_jd) >= 3
    assert all("question" in q and "hints" in q for q in questions_jd)


def test_evaluate_interview_response():
    question = "How do you diagnose and resolve memory leaks in a Python service?"
    answer = (
        "In our production system, we noticed memory usage spike by 40% every 24 hours. "
        "I used tracemalloc and memory_profiler to pinpoint unclosed circular references. "
        "I refactored the caching dictionary with weakref and implemented a Redis TTL cache, "
        "which reduced memory usage by 65% and eliminated all timeout incidents."
    )
    res = evaluate_interview_response(question, answer, "Software Engineer")
    assert res["success"] is True
    assert 1 <= res["overall_score"] <= 10
    assert "star_breakdown" in res
    assert len(res["strengths"]) > 0


def test_90_day_sprint_roadmap():
    roadmap = generate_90_day_sprint_roadmap("AI Engineer", ["Docker", "Kubernetes", "FastAPI"])
    assert roadmap["success"] is True
    assert roadmap["total_weeks"] == 12
    assert len(roadmap["sprints"]) == 3
    assert len(roadmap["all_weeks"]) == 12
    assert "resources" in roadmap["all_weeks"][0]
    assert len(roadmap["all_weeks"][0]["resources"]) > 0


def test_estimate_career_compensation():
    res = estimate_career_compensation("AI Engineer", experience_years=2.0, skills=["Python", "PyTorch", "AWS"])
    assert res["success"] is True
    assert "predicted_range_inr" in res
    assert "predicted_range_usd" in res
    assert len(res["skill_roi_premiums"]) > 0
    assert len(res["career_ladder"]) == 4
