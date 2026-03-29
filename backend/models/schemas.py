from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class CareerInput(BaseModel):
    cgpa: float
    skills: List[str]
    projects: List[str]
    interest: str


class FinanceInput(BaseModel):
    income: float
    loan: float
    credit_score: float


class StartupInput(BaseModel):
    funding: float
    team_size: int
    market: str
    experience: float


class PolicyInput(BaseModel):
    sector: str
    budget: float
    population: float


class ChatbotInput(BaseModel):
    message: str


class DecisionResponse(BaseModel):
    decision: str
    probability: float
    score_label: str
    score_band: str
    summary: str
    next_step: str
    target_score: float
    key_factors: List[str]
    explanation: str
    suggestions: List[str]


class SimpleResponse(BaseModel):
    decision: str
    probability: float
    key_factors: List[str]
    explanation: str
    suggestions: List[str]
    details: Optional[Dict[str, Any]] = None
