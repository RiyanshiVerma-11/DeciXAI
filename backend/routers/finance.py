from fastapi import APIRouter
from models.schemas import FinanceInput, DecisionResponse
from services.finance_service import get_finance_decision

router = APIRouter()


@router.post('/', response_model=DecisionResponse)
def evaluate_finance(input: FinanceInput):
    return get_finance_decision(input.model_dump())
