from fastapi import APIRouter
from models.schemas import PolicyInput, DecisionResponse
from services.policy_service import get_policy_decision

router = APIRouter()


@router.post('/', response_model=DecisionResponse)
def evaluate_policy(input: PolicyInput):
    return get_policy_decision(input.model_dump())
