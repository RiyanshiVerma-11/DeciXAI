from fastapi import APIRouter
from models.schemas import StartupInput, DecisionResponse
from services.startup_service import get_startup_decision

router = APIRouter()


@router.post('/', response_model=DecisionResponse)
def evaluate_startup(input: StartupInput):
    return get_startup_decision(input.dict())
