from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class CareerInput(BaseModel):
    cgpa: float
    skills: List[str]
    projects: List[str]
    interest: str
    certifications: Optional[List[str]] = None
    internships: Optional[List[str]] = None
    course: Optional[str] = None
    specialization: Optional[str] = None
    education_level: Optional[str] = None
    year_of_study: Optional[float] = None
    experience_years: Optional[float] = None


class FinanceInput(BaseModel):
    income: float
    loan: float
    credit_score: float


class StartupInput(BaseModel):
    funding: float
    team_size: int
    market: str
    experience: float


class StartupPromptInput(BaseModel):
    message: str


class CareerPromptInput(BaseModel):
    message: str


class PolicyInput(BaseModel):
    sector: str
    budget: float
    population: float


class ChatbotInput(BaseModel):
    messages: Optional[List[Dict[str, Any]]] = None
    message: Optional[str] = None
    stream: Optional[bool] = True


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


class StartupDecisionResponse(BaseModel):
    score: float
    decision: str
    band: str
    confidence: float
    summary: str
    key_factors: List[str]
    risks: List[str]
    action_plan: List[str]
    blocking_factors: List[str]


class SimpleResponse(BaseModel):
    decision: str
    probability: float
    key_factors: List[str]
    explanation: str
    suggestions: List[str]
    details: Optional[Dict[str, Any]] = None
