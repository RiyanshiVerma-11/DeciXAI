from fastapi import APIRouter
from models.schemas import CareerInput, DecisionResponse
from services.career_service import get_career_decision

router = APIRouter()


@router.post('/', response_model=DecisionResponse)
def evaluate_career(input: CareerInput):
    return get_career_decision(input.dict())
