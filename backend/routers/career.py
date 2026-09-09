from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from models.schemas import CareerInput, CareerPromptInput, DecisionResponse
from services.career_service import get_career_analysis_from_text, get_career_comparison, get_career_decision
from services.resume_parser_service import parse_and_analyze_resume

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
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {str(exc)}")
