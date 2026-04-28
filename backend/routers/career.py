from fastapi import APIRouter
from models.schemas import CareerInput, CareerPromptInput, DecisionResponse
from services.career_service import get_career_analysis_from_text, get_career_comparison, get_career_decision

router = APIRouter()


@router.post('/', response_model=DecisionResponse)
def evaluate_career(input: CareerInput):
    return get_career_comparison(input.model_dump()) or get_career_decision(input.model_dump())


@router.post('/parse', response_model=DecisionResponse)
def evaluate_career_from_prompt(input: CareerPromptInput):
    return get_career_analysis_from_text(input.message)
