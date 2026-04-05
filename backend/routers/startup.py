from fastapi import APIRouter
from models.schemas import StartupInput, StartupPromptInput
from services.startup_service import get_startup_decision, get_startup_decision_from_text

router = APIRouter()


@router.post('/', response_model=dict)
def evaluate_startup(input: StartupInput):
    return get_startup_decision(input.dict())


@router.post('/parse', response_model=dict)
def evaluate_startup_from_prompt(input: StartupPromptInput):
    return get_startup_decision_from_text(input.message)
