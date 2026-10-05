import logging

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from models.schemas import CareerInput, CareerPromptInput, DecisionResponse
from services.career_service import get_career_analysis_from_text, get_career_comparison, get_career_decision
from services.resume_parser_service import parse_and_analyze_resume

logger = logging.getLogger("DeciXAI.CareerRouter")

router = APIRouter()


@router.post('/', response_model=DecisionResponse)
def evaluate_career(input: CareerInput):
    return get_career_comparison(input.model_dump()) or get_career_decision(input.model_dump())


@router.post('/parse', response_model=DecisionResponse)
def evaluate_career_from_prompt(input: CareerPromptInput):
    return get_career_analysis_from_text(input.message)


@router.post('/upload-resume')
async def upload_and_evaluate_resume(
    file: UploadFile = File(...),
    target_role: str | None = Form(None),
):
    """
    Upload a candidate resume (PDF or DOCX) with an optional target role.
    Extracts structured credentials, computes an ATS Compatibility Audit,
    and runs the full Decision XAI explainability engine.
    """
    filename = file.filename or "resume.pdf"
    if not (filename.lower().endswith('.pdf') or filename.lower().endswith('.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    file_bytes = await file.read()
    if not file_bytes or len(file_bytes) < 100:
        raise HTTPException(status_code=400, detail="Uploaded file is empty or corrupted.")

    try:
        result = parse_and_analyze_resume(file_bytes, filename, target_role=target_role)
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=str(val_err))
    except Exception as exc:
        logger.exception("Resume analysis failed unexpectedly: %s", exc)
        raise HTTPException(status_code=500, detail="Resume analysis failed due to an internal error.")


# ---------------------------------------------------------------------------
# Career Accelerator Endpoints
# ---------------------------------------------------------------------------

from services.career_accelerator_service import (
    simulate_career_what_if,
    match_job_description,
    generate_mock_interview_questions,
    evaluate_interview_response,
    generate_90_day_sprint_roadmap,
    estimate_career_compensation,
    fetch_project_context_from_url,
)


@router.post('/what-if')
async def what_if_simulation(payload: dict):
    """Simulate profile adjustments and calculate counterfactual probability shifts."""
    baseline = payload.get('baseline_input') or {}
    modifications = payload.get('modifications') or {}
    return simulate_career_what_if(baseline, modifications)


@router.post('/jd-match')
async def job_description_matching(payload: dict):
    """Match candidate against target Job Description and generate Google XYZ bullets strictly grounded in verified project context."""
    candidate_profile = payload.get('candidate_profile') or {}
    jd_text = payload.get('job_description') or ''
    project_url = payload.get('project_url') or candidate_profile.get('project_url') or candidate_profile.get('github_url') or ''
    project_name = payload.get('project_name') or candidate_profile.get('project_name') or ''
    project_details = payload.get('project_details') or candidate_profile.get('project_details') or ''

    res = match_job_description(
        candidate_profile=candidate_profile,
        jd_text=jd_text,
        project_url=project_url,
        project_name=project_name,
        project_details=project_details,
    )
    if not res.get('success'):
        raise HTTPException(status_code=400, detail=res.get('error', 'Job description analysis failed.'))
    return res


@router.post('/inspect-project-url')
async def inspect_project_url(payload: dict):
    """Safely inspects a GitHub or live project repository URL to extract architecture and stack details for true grounding."""
    url = (payload.get('url') or '').strip()
    if not url:
        raise HTTPException(status_code=400, detail="Project URL is required.")
    return fetch_project_context_from_url(url)


@router.post('/mock-interview/questions')
async def mock_interview_questions(payload: dict):
    """Generate role-specific mock interview questions supporting resume, best-fit, and JD modes."""
    role = payload.get('role') or 'Software Engineer'
    skill_gaps = payload.get('skill_gaps')
    mode = payload.get('mode') or 'best_fit'
    candidate_profile = payload.get('candidate_profile') or {}
    job_description = payload.get('job_description') or ''
    focus_project = payload.get('focus_project') or None
    questions = generate_mock_interview_questions(
        role=role,
        skill_gaps=skill_gaps,
        mode=mode,
        candidate_profile=candidate_profile,
        job_description=job_description,
        focus_project=focus_project,
    )
    return {'success': True, 'role': role, 'mode': mode, 'questions': questions}



@router.post('/mock-interview/evaluate')
async def mock_interview_evaluate(payload: dict):
    """Evaluate candidate's interview response with STAR method and technical criteria."""
    question = payload.get('question') or ''
    answer = payload.get('user_answer') or ''
    role = payload.get('role') or 'Software Engineer'
    res = evaluate_interview_response(question, answer, role)
    if not res.get('success'):
        raise HTTPException(status_code=400, detail=res.get('error', 'Evaluation failed.'))
    return res


@router.post('/sprint-roadmap')
async def sprint_roadmap(payload: dict):
    """Generate 12-week (90-day) career sprint roadmap with learning links."""
    role = payload.get('target_role') or 'Software Engineer'
    skill_gaps = payload.get('skill_gaps')
    return generate_90_day_sprint_roadmap(role, skill_gaps)


@router.post('/compensation-estimate')
async def compensation_estimate(payload: dict):
    """Estimate market compensation brackets and skill ROI premiums."""
    role = payload.get('target_role') or 'Software Engineer'
    exp = payload.get('experience_years', 1.0)
    skills = payload.get('skills')
    academic_score = payload.get('academic_score', 8.5)
    country = payload.get('country', 'in')
    return estimate_career_compensation(
        target_role=role,
        experience_years=exp,
        skills=skills,
        academic_score=academic_score,
        country=country,
    )

