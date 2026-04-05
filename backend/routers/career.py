from fastapi import APIRouter
from models.schemas import CareerInput, CareerPromptInput
from services.career_service import get_career_analysis_from_text, get_career_comparison, get_career_decision

router = APIRouter()


@router.post('/', response_model=dict)
def evaluate_career(input: CareerInput):
    return get_career_comparison(input.dict()) or get_career_decision(input.dict())


@router.post('/parse', response_model=dict)
def evaluate_career_from_prompt(input: CareerPromptInput):
    return get_career_analysis_from_text(input.message)
