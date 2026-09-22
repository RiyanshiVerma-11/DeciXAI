import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from services.hybrid_decision_service import (
    _normalize_cgpa,
    _normalize_interest,
    _split_items,
    _path_evidence_score,
    _calibrate_final_score,
    _rule_based_risks,
    _comparison_frame,
    _contextualize_factor_impacts,
    _dynamic_option_scores,
    analyze_career_profile,
    normalize_career_input,
    parse_career_prompt,
    PATH_KEYWORD_HINTS,
)
from train_models import classify_career_path, split_items as train_split_items
from services.career_input_parser_service import _extract_cgpa, _split_section_items


def test_1_probability_not_deflated():
    normalized = normalize_career_input({
        "cgpa": 8.5,
        "skills": ["python", "machine learning", "deep learning", "pandas", "numpy", "statistics"],
        "projects": ["Deep Learning CNN Classifier", "NLP Sentiment Analyzer", "Predictive Analytics Engine"],
        "certifications": ["Deep Learning Specialization", "TensorFlow Developer"],
        "interest": "data science",
        "experience_years": 1.0,
    })
    scored, meta = _dynamic_option_scores(normalized, readiness=0.85)
    ds_item = next((item for item in scored if item["mapped_class"] == "data_science"), None)
    assert ds_item is not None, "data_science should be in scored options"
    # Should not be deflated by 30% (i.e. should not drop down to ~0.56)
    assert ds_item["probability"] >= 0.75, f"Expected probability >= 0.75, got {ds_item['probability']}"
    assert ds_item["score"] >= 75.0, f"Expected score >= 75.0, got {ds_item['score']}"


def test_2_missing_career_paths_hints():
    for path in ["ui_ux_design", "marketing", "finance", "consulting"]:
        assert path in PATH_KEYWORD_HINTS, f"{path} should be in PATH_KEYWORD_HINTS"
        assert len(PATH_KEYWORD_HINTS[path]) > 5, f"{path} hints should have rich terms"

    # Test that valid UI/UX profile gets a strong evidence score without 60% penalty
    ui_profile = normalize_career_input({
        "skills": ["figma", "wireframing", "prototyping", "user research", "ui/ux", "design system"],
        "projects": ["Mobile Banking App Redesign", "SaaS Dashboard UX"],
        "interest": "ui ux design",
    })
    score_ui = _path_evidence_score(ui_profile, "ui_ux_design")
    # With 5+ matching hints and projects, evidence score should be >= 10
    assert score_ui >= 10.0, f"Expected UI/UX evidence score >= 10.0, got {score_ui}"

    # Test Finance profile evidence score
    fin_profile = normalize_career_input({
        "skills": ["financial modeling", "excel", "valuation", "accounting", "portfolio"],
        "projects": ["M&A Valuation Model", "DCF Equity Analysis"],
        "interest": "finance",
    })
    score_fin = _path_evidence_score(fin_profile, "finance")
    assert score_fin >= 10.0, f"Expected Finance evidence score >= 10.0, got {score_fin}"


def test_3_cgpa_4_scale_conversion():
    # 3.8 on 4.0 scale should convert to 9.5
    assert _normalize_cgpa(3.8) == 9.5
    assert _normalize_cgpa(3.8, score_type="gpa_4") == 9.5
    assert _normalize_cgpa(4.0) == 10.0
    assert _normalize_cgpa(8.5) == 8.5

    # Parser auto-conversion
    assert _extract_cgpa("My GPA is 3.8 in CS") == 9.5
    assert _extract_cgpa("GPA: 3.6/4.0") == 9.0

    # Risk engine should not flag low CGPA for 3.8 on 4.0 scale
    norm = normalize_career_input({"cgpa": 3.8, "skills": ["python", "java", "sql", "react", "docker"]})
    assert norm["cgpa"] == 9.5
    risks = _rule_based_risks(norm)
    assert not any("Low CGPA" in r for r in risks)


def test_4_unbiased_tie_breaking():
    # Role with specific Data Engineering terms should classify as data_engineering, not data_science
    de_text = "Senior Data Engineer with strong Spark, ETL developer, Data Pipeline, and Big Data experience"
    classified = classify_career_path(de_text)
    assert classified == "data_engineering", f"Expected data_engineering, got {classified}"

    # SDE role with Java, Full Stack, SDE should classify as software_development
    sde_text = "Software Engineer SDE Full Stack developer with Java and React"
    classified_sde = classify_career_path(sde_text)
    assert classified_sde == "software_development", f"Expected software_development, got {classified_sde}"


def test_5_out_of_scope_roles():
    normalized = normalize_career_input({
        "cgpa": 8.0,
        "skills": ["autocad", "structural analysis", "concrete design"],
        "projects": ["Bridge Structural Analysis"],
        "options": "Civil Engineering, Mechanical Engineering",
    })
    scored, meta = _dynamic_option_scores(normalized, readiness=0.70)
    assert len(scored) >= 1
    first_opt = scored[0]
    assert first_opt.get("is_out_of_scope") is True
    assert first_opt.get("mapped_class") == "out_of_scope"
    assert "Civil Engineering" in first_opt.get("name")
    assert "software_development" != first_opt.get("mapped_class")


def test_6_shap_fidelity():
    normalized = normalize_career_input({
        "cgpa": 7.2,
        "certification_count": 2,
        "skill_count": 4,
        "skills": ["python", "sql", "git", "docker"],
        "projects": ["Project 1", "Project 2"],
    })
    # Mock model result with true positive SHAP for CGPA (say +0.06) and cert (+0.04)
    model_result = {
        "human_shap": [
            {"factor": "CGPA", "shap_value": 0.06, "impact": "Positive", "reason": "Good academic performance"},
            {"factor": "Certification count", "shap_value": 0.04, "impact": "Positive", "reason": "Certifications"},
        ]
    }
    impacts = _contextualize_factor_impacts(normalized, model_result, [])
    cgpa_impact = next(i for i in impacts if i["factor"] == "CGPA")
    cert_impact = next(i for i in impacts if i["factor"] == "Certification count")

    # Math fidelity: shap_value must remain positive, not flipped to negative or zeroed out
    assert cgpa_impact["shap_value"] == 0.06, f"Expected 0.06, got {cgpa_impact['shap_value']}"
    assert "boosts" in cgpa_impact["impact"].lower()

    assert cert_impact["shap_value"] == 0.04, f"Expected 0.04, got {cert_impact['shap_value']}"
    assert cert_impact["impact"] != "Neutral"


def test_7_readiness_vs_path_match():
    # Strong student evaluating an unaligned path (e.g. evaluating Cybersecurity when skills are React/Full-Stack)
    normalized = normalize_career_input({
        "degree": "B.Tech",
        "course": "B.Tech",
        "specialization": "Computer Science",
        "interest": "software development",
        "cgpa": 9.2,
        "skills": ["python", "sql", "react", "docker", "wireshark"],
        "projects": ["Web App", "Backend API", "Data Viz", "ML Classifier", "Tool"],
        "internships": ["Software Engineering Intern at Google", "Dev Intern at Startup"],
        "certifications": ["AWS Certified", "Cert 2"],
        "experience_years": 1.0,
    })
    # Analyze for an option with lower specific match (Cybersecurity)
    res = analyze_career_profile(normalized, options=["Cybersecurity"])
    # Overall score represents student's general readiness, NOT crushed to the cybersecurity path match (~37.6)
    assert res["score"] == res["readiness_score"], f"Expected overall score to match readiness score, got {res['score']}"
    assert res["score"] >= 65.0, f"Expected overall readiness score >= 65.0, got {res['score']}"
    assert res["top_path_score"] <= 45.0, f"Expected cybersecurity path match to be lower (~37.6), got {res['top_path_score']}"
    # Verify both metrics are preserved and decoupled
    assert res["score"] > res["top_path_score"] + 15.0, "Readiness score must not be overwritten by path match score"
    assert "top_path_score" in res
    assert "readiness_score" in res


def test_8_interest_normalization():
    assert _normalize_interest("consulting", "") == "management"
    assert _normalize_interest("management consulting", "") == "management"
    assert _normalize_interest("finance", "") == "finance"
    assert _normalize_interest("investment banking", "") == "finance"
    assert _normalize_interest("digital marketing", "") == "management"
    assert _normalize_interest("ui/ux design", "") == "design"
    assert _normalize_interest("data science", "") == "data"
    assert _normalize_interest("software engineering", "") == "technical"


def test_9_experienced_candidates():
    # 5-year experienced developer with 6.0 college CGPA
    normalized = normalize_career_input({
        "cgpa": 6.0,
        "skills": ["python", "fastapi", "docker", "kubernetes", "postgres", "aws", "system design", "redis"],
        "projects": ["Production Microservices Architecture", "High Throughput Payment Engine"],
        "certifications": ["AWS Solutions Architect"],
        "experience_years": 5.0,
        "interest": "software development",
    })
    # Comparison frame should retain experience_years = 5.0
    frame = _comparison_frame(normalized)
    assert frame.iloc[0]["experience_years"] == 5.0

    # Calibrated score should not be penalized -10 for 6.0 CGPA
    score = _calibrate_final_score(normalized, 0.80)
    assert score >= 80.0, f"Expected score >= 80.0 for senior dev, got {score}"

    # Risks should not flag low CGPA screening risk for 5-year experienced senior
    risks = _rule_based_risks(normalized)
    assert not any("CGPA is below" in r or "Low CGPA" in r for r in risks)
    assert not any("Lack of real-world experience" in r for r in risks)


def test_10_delimiter_and_token_parsing():
    # hybrid_decision_service parsing
    raw_input = "CI/CD, UI/UX, C++, PL/SQL, React, Python"
    items = _split_items(raw_input)
    assert "ci/cd" in [i.lower() for i in items]
    assert "ui/ux" in [i.lower() for i in items]
    assert "c++" in [i.lower() for i in items]
    assert "pl/sql" in [i.lower() for i in items]
    assert "ci" not in [i.lower() for i in items]
    assert "cd" not in [i.lower() for i in items]

    # career_input_parser_service parsing
    section_items = _split_section_items("CI/CD, UI/UX, C++, PL/SQL")
    lowered = [i.lower() for i in section_items]
    assert "ci/cd" in lowered
    assert "ui/ux" in lowered
    assert "c++" in lowered
    assert "pl/sql" in lowered

    # train_models parsing
    train_items = train_split_items("CI/CD; UI/UX; PL/SQL")
    assert "ci/cd" in train_items
    assert "ui/ux" in train_items
    assert "pl/sql" in train_items


def test_11_cyber_law_course_group_legal():
    from services.hybrid_decision_service import _normalize_course_group
    assert _normalize_course_group("BA LLB") == "legal"
    assert _normalize_course_group("Cyber Law") == "legal"
    assert _normalize_course_group("Corporate Law") == "legal"

    # Legal input normalization
    norm = normalize_career_input({
        "course": "BA LLB",
        "specialization": "Cyber Law",
        "interest": "Cyber Law & Compliance",
        "skills": ["GDPR", "Contract Drafting", "Legal Research"],
        "projects": ["Data Privacy Regulatory Compliance Framework"],
        "cgpa": 7.9,
    })
    assert norm["course_group"] == "legal"
    assert norm["specialization_group"] == "legal"


def test_12_desired_label_raw_interest_fallback():
    # User with software skills but specialized interest "Niche Quantum Security"
    normalized = normalize_career_input({
        "cgpa": 8.5,
        "skills": ["python", "react", "sql", "docker", "fastapi"],
        "projects": ["Web App", "Backend API"],
        "certifications": ["AWS Developer"],
        "interest": "Niche Quantum Security",
    })
    res = analyze_career_profile(normalized)
    insights_str = " ".join(res.get("insights") or [])
    summary_str = res.get("summary") or ""
    
    # Should NOT contain bug 2 literal fallback "points to your stated interest"
    assert "points to your stated interest" not in insights_str
    assert "points to your stated interest" not in summary_str


def test_13_interest_aligned_summary_consistency():
    from services.hybrid_decision_service import _career_alignment_snapshot
    normalized = normalize_career_input({
        "cgpa": 8.0,
        "skills": ["python", "react", "sql"],
        "projects": ["Portfolio Website"],
        "interest": "Software Development",
    })
    top_option = {
        "mapped_class": "software_development",
        "name": "Software Development",
        "path_profile": {"top_skills": ["python", "react", "javascript"]},
    }
    snapshot = _career_alignment_snapshot(normalized, top_option)
    assert snapshot["interest_aligned"] is True


def test_14_non_tech_role_skill_gaps():
    normalized = normalize_career_input({
        "course": "BA LLB",
        "specialization": "Cyber Law",
        "skills": ["GDPR", "Legal Research"],
        "projects": ["SaaS GDPR Compliance Audit"],
        "interest": "Legal & Compliance",
    })
    res = analyze_career_profile(normalized, options=["In-House Legal Counsel & Compliance"])
    actions_str = " ".join(res.get("action_plan") or [])
    # Should NOT recommend Flask, Django, or pure software dev stacks for legal roles
    assert "flask" not in actions_str.lower()
    assert "django" not in actions_str.lower()


if __name__ == "__main__":
    test_1_probability_not_deflated()
    print("[PASS] Test 1: Probability not artificially deflated")
    test_2_missing_career_paths_hints()
    print("[PASS] Test 2: 10 career paths hints complete without false penalty")
    test_3_cgpa_4_scale_conversion()
    print("[PASS] Test 3: 4.0 scale CGPA conversion and risk suppression")
    test_4_unbiased_tie_breaking()
    print("[PASS] Test 4: Unbiased tie-breaking by match specificity")
    test_5_out_of_scope_roles()
    print("[PASS] Test 5: Out-of-scope roles correctly marked without force-fit")
    test_6_shap_fidelity()
    print("[PASS] Test 6: Mathematical SHAP value fidelity preserved")
    test_7_readiness_vs_path_match()
    print("[PASS] Test 7: Overall readiness score decoupled from path match overwrite")
    test_8_interest_normalization()
    print("[PASS] Test 8: Interest normalized without false technical default")
    test_9_experienced_candidates()
    print("[PASS] Test 9: Experienced candidates evaluated fairly without campus CGPA penalty")
    test_10_delimiter_and_token_parsing()
    print("[PASS] Test 10: Delimiters preserve CI/CD, UI/UX, C++, PL/SQL")
    test_11_cyber_law_course_group_legal()
    print("[PASS] Test 11: Cyber law & BA LLB mapped to legal course group")
    test_12_desired_label_raw_interest_fallback()
    print("[PASS] Test 12: desired_label falls back to raw_interest string")
    test_13_interest_aligned_summary_consistency()
    print("[PASS] Test 13: interest_aligned snapshot consistency")
    test_14_non_tech_role_skill_gaps()
    print("[PASS] Test 14: Non-tech role skill gaps are domain-aware (no Flask/Django)")
    print("\nALL 14 ANOMALY VERIFICATION TESTS PASSED SUCCESSFULLY!")

