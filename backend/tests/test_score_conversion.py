import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from services.hybrid_decision_service import _normalize_cgpa, normalize_career_input, parse_career_prompt
from models.schemas import CareerInput


def test_normalize_cgpa_direct():
    # Percentage -> 10 scale
    assert _normalize_cgpa(80, score_type="percentage") == 8.0
    assert _normalize_cgpa(85.5, score_type="percentage") == 8.55
    # GPA 4 -> 10 scale
    assert _normalize_cgpa(3.6, score_type="gpa_4") == 9.0
    assert _normalize_cgpa(4.0, score_type="gpa_4") == 10.0
    # CGPA 10 scale
    assert _normalize_cgpa(8.5, score_type="cgpa_10") == 8.5
    assert _normalize_cgpa(9.2, score_type="cgpa_10") == 9.2


def test_normalize_career_input():
    pct_input = {
        "cgpa": 82,
        "score_type": "percentage",
        "skills": ["Python", "SQL"],
        "projects": ["Web App"],
        "interest": "software development",
    }
    res_pct = normalize_career_input(pct_input)
    assert res_pct["cgpa"] == 8.2
    assert res_pct["score_type"] == "percentage"
    assert res_pct["raw_score"] == 82.0

    gpa_input = {
        "cgpa": 3.8,
        "score_type": "gpa_4",
        "skills": ["Python", "ML"],
        "projects": ["Data Pipeline"],
        "interest": "data science",
    }
    res_gpa = normalize_career_input(gpa_input)
    assert res_gpa["cgpa"] == 9.5
    assert res_gpa["score_type"] == "gpa_4"
    assert res_gpa["raw_score"] == 3.8


def test_career_input_schema():
    # Schema should now accept percentage up to 100 without 422 error
    item = CareerInput(
        cgpa=85.0,
        score_type="percentage",
        raw_score=85.0,
        skills=["Python", "SQL"],
        projects=["NLP App"],
        interest="data science",
    )
    assert item.cgpa == 85.0
    assert item.score_type == "percentage"


def test_prompt_parsing():
    p1 = parse_career_prompt("I have 82% in BTech CSE with Python, SQL, ML and 2 data projects")
    assert p1["cgpa"] == 8.2

    p2 = parse_career_prompt("GPA 3.6/4 in Computer Science with Python, React and 2 projects")
    assert p2["cgpa"] == 9.0


if __name__ == "__main__":
    test_normalize_cgpa_direct()
    test_normalize_career_input()
    test_career_input_schema()
    test_prompt_parsing()
    print("ALL TESTS IN test_score_conversion.py PASSED!")
