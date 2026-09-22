from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class CareerInput(BaseModel):
    cgpa: float = Field(..., ge=0.0, le=100.0, description="Academic score (CGPA bounded between 0.0 and 10.0, or Percentage up to 100)")
    score_type: str | None = Field("cgpa_10", description="cgpa_10, gpa_4, or percentage")
    raw_score: float | None = Field(None, description="Original user entered score before normalization")
    skills: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    interest: str
    certifications: list[str] = Field(default_factory=list)
    internships: list[str] = Field(default_factory=list)
    course: str | None = None
    specialization: str | None = None
    education_level: str | None = None
    year_of_study: float | None = Field(None, ge=1.0, le=5.0, description="Year of study, usually between 1.0 and 5.0")
    experience_years: float | None = Field(None, ge=0.0, le=50.0, description="Years of professional experience")


class FinanceInput(BaseModel):
    income: float = Field(..., ge=1.0, description="Annual income must be positive")
    loan: float = Field(..., ge=0.0, description="Loan amount cannot be negative")
    credit_score: float = Field(..., ge=300.0, le=850.0, description="Credit score must be between 300 and 850")


class StartupInput(BaseModel):
    funding: float = Field(..., ge=0.0, description="Funding amount cannot be negative")
    team_size: int = Field(..., ge=1, description="Team size must be at least 1")
    market: str
    experience: float = Field(..., ge=0.0, le=60.0, description="Founder years of experience, bounded up to 60")


class StartupPromptInput(BaseModel):
    message: str


class CareerPromptInput(BaseModel):
    message: str


class PolicyInput(BaseModel):
    sector: str
    budget: float = Field(..., ge=0.0, description="Policy budget cannot be negative")
    population: float = Field(..., ge=0.0, description="Target population size cannot be negative")
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


# ---------------------------------------------------------------------------
# Authentication schemas
# ---------------------------------------------------------------------------


class RegisterInput(BaseModel):
    email: str = Field(..., description="User email address")
    name: str = Field(..., min_length=2, max_length=100, description="User display name")
    password: str = Field(..., min_length=6, max_length=128, description="Account password (min 6 chars)")


class LoginInput(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Account password")


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    tier: str = "free"
    credits_used: int = 0
    created_at: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ---------------------------------------------------------------------------
# Workspace & Decision Dossier schemas
# ---------------------------------------------------------------------------


class SaveDecisionInput(BaseModel):
    domain: str = Field(..., description="Decision domain: career, finance, startup, policy")
    title: str = Field(default="Decision Dossier", min_length=2, max_length=120, description="Title for this decision run")
    notes: str = Field(default="", description="Optional user notes")
    tags: str = Field(default="", description="Comma separated tags")
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    score: float = Field(default=0.0)
    verdict: str = Field(default="")

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Normalize domain
            if not data.get("domain") or not str(data.get("domain")).strip():
                data["domain"] = "general"

            # Normalize tags
            if isinstance(data.get("tags"), list):
                data["tags"] = ", ".join(str(t) for t in data["tags"])
            elif data.get("tags") is None:
                data["tags"] = ""
            else:
                data["tags"] = str(data.get("tags", ""))

            # Normalize title
            raw_title = str(data.get("title", "")).strip()
            if not raw_title:
                dom = str(data.get("domain", "General")).capitalize()
                raw_title = f"{dom} Decision Analysis"
            if len(raw_title) < 2:
                raw_title = f"{raw_title} Analysis"
            if len(raw_title) > 120:
                raw_title = raw_title[:120]
            data["title"] = raw_title

            # Normalize input_payload
            if not data.get("input_payload"):
                if "input" in data and isinstance(data["input"], dict):
                    data["input_payload"] = data["input"]
                else:
                    data["input_payload"] = {}

            # Normalize output_payload
            if not data.get("output_payload"):
                if "result" in data and isinstance(data["result"], dict):
                    data["output_payload"] = data["result"]
                else:
                    data["output_payload"] = {}

            # Normalize notes from summary
            if not data.get("notes") and data.get("summary"):
                data["notes"] = str(data.get("summary"))

            # Normalize score
            if "score" not in data or data["score"] is None:
                output = data.get("output_payload") or data.get("result") or {}
                extracted_score = 0.0
                if "score" in output and isinstance(output["score"], (int, float)):
                    extracted_score = float(output["score"])
                elif "fit_score" in output and isinstance(output["fit_score"], (int, float)):
                    extracted_score = float(output["fit_score"])
                elif "probability" in output and isinstance(output["probability"], (int, float)):
                    val = float(output["probability"])
                    extracted_score = val * 100.0 if val <= 1.0 else val
                elif "confidence" in output and isinstance(output["confidence"], (int, float)):
                    val = float(output["confidence"])
                    extracted_score = val * 100.0 if val <= 1.0 else val
                elif "overall_score" in output and isinstance(output["overall_score"], (int, float)):
                    val = float(output["overall_score"])
                    extracted_score = val * 10.0 if val <= 10.0 else val
                elif isinstance(output.get("metrics"), dict):
                    metrics = output["metrics"]
                    if "fit_score" in metrics and isinstance(metrics["fit_score"], (int, float)):
                        extracted_score = float(metrics["fit_score"])
                    elif "score" in metrics and isinstance(metrics["score"], (int, float)):
                        extracted_score = float(metrics["score"])
                data["score"] = round(extracted_score, 1)

            # Normalize verdict
            if not data.get("verdict"):
                output = data.get("output_payload") or data.get("result") or {}
                verdict = (
                    output.get("verdict")
                    or output.get("decision")
                    or output.get("prediction")
                    or output.get("recommendation")
                    or output.get("outcome")
                    or "Decision Analyzed"
                )
                data["verdict"] = str(verdict)

        return data


class UpdateDecisionInput(BaseModel):
    title: str | None = None
    notes: str | None = None
    tags: str | None = None
    is_public: bool | None = None


class SavedDecisionResponse(BaseModel):
    id: int
    user_id: int
    domain: str
    title: str
    notes: str = ""
    tags: str = ""
    input_payload: dict[str, Any]
    output_payload: dict[str, Any]
    score: float
    verdict: str = ""
    share_token: str | None = None
    is_public: bool = False
    created_at: str


class PublicDecisionResponse(BaseModel):
    domain: str
    title: str
    input_payload: dict[str, Any]
    output_payload: dict[str, Any]
    score: float
    verdict: str = ""
    created_at: str
    verified: bool = True
    audit_hash: str


# ---------------------------------------------------------------------------
# Developer API Key schemas
# ---------------------------------------------------------------------------


class CreateApiKeyInput(BaseModel):
    name: str = Field(..., min_length=2, max_length=60, description="Friendly label for the API key")


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    prefix: str
    rate_limit: int
    created_at: str
    last_used_at: str | None = None
    is_active: bool


class CreatedApiKeyResponse(ApiKeyResponse):
    secret_key: str


