from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class CareerInput(BaseModel):
    cgpa: float
    skills: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    interest: str
    certifications: list[str] = Field(default_factory=list)
    internships: list[str] = Field(default_factory=list)
    course: str | None = None
    specialization: str | None = None
    education_level: str | None = None
    year_of_study: float | None = None
    experience_years: float | None = None


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
    political_support: str | None = None
    infrastructure_readiness: str | None = None
    risk_level: str | None = None
    urgency: str | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatbotInput(BaseModel):
    messages: list[ChatMessage] | None = None
    message: str | None = None
    stream: bool = True

    @model_validator(mode="after")
    def validate_payload(self) -> "ChatbotInput":
        if not self.message and not self.messages:
            raise ValueError("Either 'message' or 'messages' is required.")
        return self


class FactorImpact(BaseModel):
    factor: str
    impact: str
    value: float | None = None
    reason: str | None = None


class OptionScore(BaseModel):
    name: str
    score: float | None = None
    probability: float | None = None
    reason: str | None = None
    mapped_label: str | None = None


class DomainDetectionResponse(BaseModel):
    domain: str
    confidence: float
    scores: dict[str, float]
    ambiguous: bool = False
    language: str = "english"
    margin: float | None = None


class DecisionResponse(BaseModel):
    decision: str
    probability: float
    score_label: str
    score_band: str
    summary: str
    next_step: str
    target_score: float | None = None
    key_factors: list[str] = Field(default_factory=list)
    explanation: str
    suggestions: list[str] = Field(default_factory=list)
    score: float | None = None
    confidence: float | None = None
    insights: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    action_plan: list[str] = Field(default_factory=list)
    what_if: str | None = None
    factor_impacts: list[FactorImpact] = Field(default_factory=list)
    options: list[OptionScore] = Field(default_factory=list)
    details: dict[str, Any] | None = None
    parsed_input: dict[str, Any] | None = None
    intent: str | None = None
    mode: str | None = None
    blocking_factors: list[str] = Field(default_factory=list)
    followup_questions: list[str] = Field(default_factory=list)
    meta: dict[str, Any] | None = None


class ChatbotResponse(BaseModel):
    role: str = "assistant"
    content: str
    intent: str = "general"
    mode: str = "chat"
    detection: DomainDetectionResponse | None = None
    meta: dict[str, Any] | None = None
