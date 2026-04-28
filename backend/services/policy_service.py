from __future__ import annotations

import math

import pandas as pd

from services.model_service import build_runtime_frame, predict_with_model
from services.policy_rag_service import retrieve_policy_sources
from services.llm_action_plan_service import generate_action_plan


POLICY_PROFILES = {
    # Removed hardcoded profiles - using model predictions only
}

_SCALE_ALIASES = {
    "low": {"low", "poor", "weak", "limited", "minimal"},
    "medium": {"medium", "moderate", "ok", "average"},
    "high": {"high", "strong", "good", "robust"},
}


def _clean_text(value) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _normalize_scale(value: str, default: str = "medium") -> str:
    text = _clean_text(value)
    if not text:
        return default
    for label, variants in _SCALE_ALIASES.items():
        if any(token in text for token in variants):
            return label
    if text in {"weak"}:
        return "low"
    if text in {"strong"}:
        return "high"
    return default


def _normalize_urgency(value: str) -> str:
    text = _clean_text(value)
    if not text:
        return "medium"
    if any(token in text for token in ("high", "urgent", "immediate", "asap")):
        return "high"
    if any(token in text for token in ("low", "later", "non urgent", "non-urgent")):
        return "low"
    return "medium"


def _governance_adjustment_points(
    *,
    political_support: str,
    infrastructure_readiness: str,
    risk_level: str,
    urgency: str,
    budget: float,
    population: float,
) -> tuple[float, list[dict]]:
    """
    Convert governance + execution signals into score-point adjustments.
    Returns (delta_points, contributions).
    """
    contributions: list[dict] = []
    delta = 0.0

    support = _normalize_scale(political_support, default="medium")
    infra = _normalize_scale(infrastructure_readiness, default="medium")
    risk = _normalize_scale(risk_level, default="medium")
    urg = _normalize_urgency(urgency)

    # Governance penalties must be strong enough to counter budget dominance,
    # but not so strong that every high-risk scenario collapses to ~0.
    support_points = {"high": 5.0, "medium": 0.0, "low": -4.0}[support]
    infra_points = {"high": 4.0, "medium": 0.0, "low": -4.0}[infra]
    # Risk is enforced mainly via the mandatory constraint layer to avoid double-penalizing.
    risk_points = {"high": 0.0, "medium": -1.0, "low": 1.0}[risk]
    urgency_points = {"high": 2.0, "medium": 0.0, "low": -2.0}[urg]

    for name, points, value in (
        ("political_support", support_points, support),
        ("infrastructure_readiness", infra_points, infra),
        ("risk_level", risk_points, risk),
        ("urgency", urgency_points, urg),
    ):
        if points != 0.0:
            contributions.append({"factor": name, "value": value, "points": points})
        delta += points

    # Small-population + high urgency tends to be easier to execute quickly.
    if urg == "high" and population > 0:
        pop_boost = 0.0
        if population <= 250_000:
            pop_boost = 4.0
        elif population <= 600_000:
            pop_boost = 2.0
        if pop_boost:
            delta += pop_boost
            contributions.append({"factor": "delivery_scale", "value": f"population={int(population)}", "points": pop_boost})

    # Avoid unnecessary optimism: low urgency + very high budget can indicate overspend or poor prioritization.
    if urg == "low" and budget >= 10_000_000:
        delta -= 4.0
        contributions.append({"factor": "urgency_budget_alignment", "value": "low_urgency_high_budget", "points": -4.0})

    return delta, contributions


def _apply_policy_constraints(
    score: float,
    *,
    political_support: str,
    infrastructure_readiness: str,
    risk_level: str,
) -> tuple[float, list[str]]:
    """
    Hard feasibility constraints that override the ML score when governance is weak.
    Returns (score, constraint_notes).
    """
    notes: list[str] = []
    support = _normalize_scale(political_support, default="medium")
    infra = _normalize_scale(infrastructure_readiness, default="medium")
    risk = _normalize_scale(risk_level, default="medium")

    capped = float(score)
    if support == "low" and infra == "low":
        capped = min(capped, 50.0)
        notes.append("Capped score because political support is weak and infrastructure readiness is low.")

    if risk == "high":
        # Reduce by at least 10% for high-risk scenarios.
        capped = max(0.0, capped * 0.90)
        notes.append("Reduced score due to high risk level.")

    return capped, notes


def _policy_band(score: float) -> tuple[str, str]:
    if score < 40:
        return "Not Feasible", "0-40"
    if score < 60:
        return "Risky", "40-60"
    if score < 75:
        return "Conditional", "60-75"
    return "Strong", "75+"


def _unique_lines(items: list[str]) -> list[str]:
    unique: list[str] = []
    seen: set[str] = set()
    for item in items:
        text = " ".join(str(item or "").split())
        key = text.lower()
        if text and key not in seen:
            seen.add(key)
            unique.append(text)
    return unique


def _confidence(score: float, contributions: list[dict], missing_fields: list[str]) -> float:
    # Lower confidence when key governance fields are missing.
    base = 70.0
    base -= 10.0 * len(missing_fields)
    # More constraints/adjustments means we are overriding the base score more.
    base -= min(15.0, 2.5 * len(contributions))
    # Extreme scores tend to be more confident if inputs are complete.
    if score >= 80 or score <= 25:
        base += 5.0
    return max(10.0, min(base, 90.0))


def _policy_insights(
    *,
    base_score: float,
    final_score: float,
    contributions: list[dict],
    constraint_notes: list[str],
    sector: str,
    per_capita_budget: float,
) -> list[str]:
    insights: list[str] = []
    if abs(final_score - base_score) >= 6:
        direction = "down" if final_score < base_score else "up"
        insights.append(f"Governance constraints adjusted the score {direction} from {round(base_score, 1)} to {round(final_score, 1)}.")

    # Explain the biggest positive/negative governance drivers.
    ranked = sorted(contributions, key=lambda x: abs(float(x.get("points", 0.0))), reverse=True)
    for item in ranked[:4]:
        points = float(item.get("points", 0.0))
        factor = str(item.get("factor") or "").replace("_", " ")
        value = str(item.get("value") or "")
        if points > 0:
            insights.append(f"{factor.title()} ({value}) supports feasibility (+{int(round(points))} points).")
        else:
            insights.append(f"{factor.title()} ({value}) increases execution risk ({int(round(points))} points).")

    for note in constraint_notes:
        insights.append(note)

    if per_capita_budget > 0:
        insights.append(f"Per-capita budget is about {round(per_capita_budget, 2)} for sector '{sector}'.")
    return _unique_lines(insights)[:6]


def _budget_signal(per_capita_budget: float, sector: str) -> tuple[str, str]:
    if sector == "education":
        if per_capita_budget < 10:
            return "thin", "the budget is very thin per person, so a universal rollout would likely underdeliver unless you narrow the target group"
        if per_capita_budget < 50:
            return "tight", "the budget is usable but still tight per person, so phasing and targeting matter"
        return "strong", "the per-person budget is strong enough to support broader delivery"
    if per_capita_budget < 20:
        return "tight", "the budget is tight per person, so the policy needs tight targeting and cost control"
    if per_capita_budget < 100:
        return "moderate", "the budget is moderate per person, so execution quality will determine outcomes"
    return "strong", "the per-person budget is strong enough to support wider coverage"


def _policy_priority_label(
    *,
    band_label: str,
    risk_level: str,
    infrastructure_readiness: str,
    political_support: str,
    per_capita_budget: float,
    sector: str,
) -> str:
    risk = _normalize_scale(risk_level, default="medium")
    infra = _normalize_scale(infrastructure_readiness, default="medium")
    support = _normalize_scale(political_support, default="medium")
    budget_signal, _ = _budget_signal(per_capita_budget, sector)

    if band_label == "Strong" and risk != "high" and infra == "high" and support == "high":
        return "Proceed with guarded rollout"
    if band_label == "Strong" and budget_signal in {"thin", "tight"}:
        return "Pilot before scaling"
    if band_label == "Conditional":
        return "Fix delivery gaps first"
    if risk == "high":
        return "Reduce risk before rollout"
    return "Run a controlled pilot"


def _policy_summary(
    *,
    final_score: float,
    band_label: str,
    sector: str,
    per_capita_budget: float,
    political_support: str,
    infrastructure_readiness: str,
    risk_level: str,
) -> str:
    support = _normalize_scale(political_support, default="medium")
    infra = _normalize_scale(infrastructure_readiness, default="medium")
    risk = _normalize_scale(risk_level, default="medium")
    budget_signal, budget_meaning = _budget_signal(per_capita_budget, sector)

    if band_label == "Strong":
        opening = "This policy looks feasible enough to move forward"
    elif band_label == "Conditional":
        opening = "This policy looks workable, but only with tighter execution controls"
    elif band_label == "Risky":
        opening = "This policy is risky in its current form"
    else:
        opening = "This policy is not ready to move forward in its current form"

    summary = f"{opening}. The score is {round(final_score, 1)}/100 and the current stance should be to "
    if band_label == "Strong" and budget_signal in {"thin", "tight"}:
        summary += "pilot first rather than scale immediately. "
    elif band_label == "Strong":
        summary += "proceed in phases with clear review checkpoints. "
    elif band_label == "Conditional":
        summary += "fix the main bottlenecks before approving rollout. "
    else:
        summary += "pause expansion until the weak signals improve. "

    summary += f"For {sector}, per-person funding is about {round(per_capita_budget, 2)}, which means {budget_meaning}. "
    summary += f"Political support is {support}, infrastructure readiness is {infra}, and risk is {risk}."
    return summary


def _policy_action_plan(
    *,
    political_support: str,
    infrastructure_readiness: str,
    risk_level: str,
    urgency: str,
) -> list[str]:
    steps: list[str] = []
    support = _normalize_scale(political_support, default="medium")
    infra = _normalize_scale(infrastructure_readiness, default="medium")
    risk = _normalize_scale(risk_level, default="medium")
    urg = _normalize_urgency(urgency)

    if support == "low":
        steps.append("Secure political backing: identify champions, align incentives, and lock governance ownership.")
    if infra == "low":
        steps.append("Run a readiness-first pilot: fix infrastructure bottlenecks before scaling beneficiaries.")
    if risk == "high":
        steps.append("Add strong risk controls: monitoring, audit trails, and clear eligibility/verification checks.")
    if urg == "high":
        steps.append("Phase delivery: ship a minimal viable rollout in 6-8 weeks, then expand based on adoption data.")

    if not steps:
        steps.append("Run a phased pilot first instead of a full rollout.")
    steps.append("Track three KPIs from day one: adoption, cost per beneficiary, and outcome improvement.")
    steps.append("Set a stop-go review after the first implementation cycle before expanding coverage.")

    return _unique_lines(steps)[:3]


def _normalize_policy_option(text):
    lowered = str(text or '').strip().lower()
    if 'laptop' in lowered:
        return 'free laptops for students'
    if any(term in lowered for term in ['digital infrastructure', 'internet access', 'smart classroom', 'smart classrooms']):
        return 'digital infrastructure like internet access and smart classrooms'
    return lowered or 'generic policy'


def _build_policy_frame(data):
    sector = _clean_text(data.get('sector', 'infrastructure')).strip("=, ")
    budget = float(data.get('budget', 1000000))
    population = max(float(data.get('population', 500000)), 1.0)
    return build_runtime_frame('policy', {
        'sector': sector,
        'budget': budget,
        'population': population,
        'per_capita_budget': budget / population,
        'budget_log': math.log10(max(budget, 1.0)),
        'population_log': math.log10(max(population, 1.0)),
        'coverage_pressure': population / max(budget, 1.0),
    })


def get_policy_decision(data):
    model_frame = _build_policy_frame(data)
    model_result = predict_with_model('policy', model_frame)
    sector = str(model_frame.iloc[0]["sector"])
    budget = float(model_frame.iloc[0]["budget"])
    population = float(model_frame.iloc[0]["population"])
    per_capita_budget = float(model_frame.iloc[0]["per_capita_budget"])

    # Pull governance features (structured inputs or parsed text payloads).
    political_support = data.get("political_support") or data.get("political") or ""
    infrastructure_readiness = data.get("infrastructure_readiness") or data.get("infrastructure") or ""
    risk_level = data.get("risk_level") or data.get("risk") or ""
    urgency = data.get("urgency") or data.get("priority") or ""

    missing_fields = [name for name, value in (
        ("political_support", political_support),
        ("infrastructure_readiness", infrastructure_readiness),
        ("risk_level", risk_level),
        ("urgency", urgency),
    ) if not str(value or "").strip()]

    # Hybrid base: blend ML score with a small per-capita heuristic so the baseline is stable,
    # but governance constraints still dominate final feasibility.
    per_capita_norm = min(max(per_capita_budget / 12000.0, 0.0), 1.0)
    budget_norm = 0.0
    if budget > 0:
        # Log scale keeps large budgets from dominating.
        budget_norm = min(max(math.log10(budget + 1.0) / 8.0, 0.0), 1.0)

    heuristic_base = 0.35 + (0.22 * budget_norm) + (0.22 * per_capita_norm)
    if sector in {"education", "healthcare"}:
        heuristic_base += 0.03
    heuristic_base = max(0.05, min(0.95, heuristic_base))

    ml_base = float(model_result["probability"]) if model_result is not None else heuristic_base
    base_probability = (0.6 * ml_base) + (0.4 * heuristic_base)
    base_probability = max(0.05, min(0.95, base_probability))
    base_score = base_probability * 100.0

    delta_points, contributions = _governance_adjustment_points(
        political_support=political_support,
        infrastructure_readiness=infrastructure_readiness,
        risk_level=risk_level,
        urgency=urgency,
        budget=budget,
        population=population,
    )

    pre_constraint_score = max(0.0, min(base_score + delta_points, 100.0))
    final_score, constraint_notes = _apply_policy_constraints(
        pre_constraint_score,
        political_support=political_support,
        infrastructure_readiness=infrastructure_readiness,
        risk_level=risk_level,
    )
    final_score = max(0.0, min(final_score, 100.0))

    band_label, band = _policy_band(final_score)
    action_plan_steps = _policy_action_plan(
        political_support=political_support,
        infrastructure_readiness=infrastructure_readiness,
        risk_level=risk_level,
        urgency=urgency,
    )

    # RAG grounding (optional, but makes explanations more trustworthy).
    retrieved = retrieve_policy_sources(str(data.get('raw_prompt') or data.get('policy') or data.get('option') or ''), k=3)

    insights = _policy_insights(
        base_score=base_score,
        final_score=final_score,
        contributions=contributions,
        constraint_notes=constraint_notes,
        sector=sector,
        per_capita_budget=per_capita_budget,
    )
    if retrieved:
        titles = ", ".join(item["title"] for item in retrieved[:3] if item.get("title"))
        if titles:
            insights.append(f"Related schemes from the dataset: {titles}.")

    confidence = _confidence(final_score, contributions, missing_fields)

    llm_plan = generate_action_plan(
        domain="policy",
        user_input={
            "sector": sector,
            "budget": budget,
            "population": population,
            "per_capita_budget": per_capita_budget,
            "urgency": urgency,
            "political_support": political_support,
            "infrastructure_readiness": infrastructure_readiness,
            "risk_level": risk_level,
        },
        decision=band_label,
        score=final_score,
        risks=[line for line in insights if "risk" in line.lower()][:4],
        insights=insights[:6],
    )
    if llm_plan:
        action_plan_steps = _unique_lines(llm_plan[:3])

    priority_label = _policy_priority_label(
        band_label=band_label,
        risk_level=risk_level,
        infrastructure_readiness=infrastructure_readiness,
        political_support=political_support,
        per_capita_budget=per_capita_budget,
        sector=sector,
    )
    summary = _policy_summary(
        final_score=final_score,
        band_label=band_label,
        sector=sector,
        per_capita_budget=per_capita_budget,
        political_support=political_support,
        infrastructure_readiness=infrastructure_readiness,
        risk_level=risk_level,
    )
    focus = action_plan_steps[1] if len(action_plan_steps) > 1 else "Improve delivery assumptions before scaling"

    # Keep legacy keys for compatibility, while adding a cleaner structured output.
    return {
        "score": round(final_score, 1),
        "decision": band_label,
        "confidence": round(confidence, 1),
        "insights": insights[:6],
        "action_plan": action_plan_steps,
        "probability": round(final_score / 100.0, 4),
        "score_label": band_label,
        "score_band": band,
        "summary": summary,
        "next_step": priority_label,
        "priority_detail": action_plan_steps[0] if action_plan_steps else "",
        "focus": focus,
        "target_score": 70.0,
        "key_factors": [item.get("factor") for item in sorted(contributions, key=lambda x: abs(float(x.get("points", 0.0))), reverse=True)[:4]],
        "explanation": " ".join(insights[:4]),
        "suggestions": action_plan_steps[:3],
        "risks": [line for line in insights if "risk" in line.lower() or "capped" in line.lower()][:3],
        "meta": {
            "base_model_probability": round(base_probability, 4),
            "governance_delta_points": round(delta_points, 2),
            "constraints": constraint_notes,
            "missing_fields": missing_fields,
            "retrieved_sources": retrieved,
            "action_plan_source": "ollama" if llm_plan else "backend",
        },
    }


def _option_probability(option_name, base_budget, base_population):
    # Use generic profile since hardcoded removed
    profile = {
        'sector': 'education' if 'education' in option_name.lower() else 'infrastructure',
        'budget_factor': 1.0,
        'cost_efficiency': 0.6,
        'long_term_impact': 0.6,
        'accessibility': 0.6,
        'implementation_readiness': 0.6,
        'misuse_risk': 0.3,
        'maintenance_risk': 0.3,
    }
    payload = {
        'sector': profile['sector'],
        'budget': base_budget * profile['budget_factor'],
        'population': base_population,
    }
    base_result = get_policy_decision(payload)
    base_probability = base_result['probability']

    # Use model probability directly, no arbitrary adjustments
    return base_probability, profile, base_result


def get_policy_comparison(data):
    primary_option = _normalize_policy_option(data.get('primary_option'))
    alternative_option = _normalize_policy_option(data.get('alternative_option'))
    if not alternative_option or alternative_option == 'generic policy':
        alternative_option = 'digital infrastructure like internet access and smart classrooms'
    if primary_option == 'generic policy':
        primary_option = 'free laptops for students'

    base_budget = float(data.get('budget', 5000000))
    base_population = float(data.get('population', 200000))
    retrieved_primary = retrieve_policy_sources(primary_option, k=2)
    retrieved_alternative = retrieve_policy_sources(alternative_option, k=2)

    primary_probability, primary_profile, primary_base = _option_probability(primary_option, base_budget, base_population)
    alternative_probability, alternative_profile, alternative_base = _option_probability(alternative_option, base_budget, base_population)

    options = [
        {'label': 'Free Laptop Policy' if 'laptop' in primary_option else primary_option.title(), 'probability': round(primary_probability, 4), 'profile': primary_profile, 'base': primary_base},
        {'label': 'Digital Infrastructure Policy' if 'digital infrastructure' in alternative_option else alternative_option.title(), 'probability': round(alternative_probability, 4), 'profile': alternative_profile, 'base': alternative_base},
    ]
    options.sort(key=lambda item: item['probability'], reverse=True)
    recommended = options[0]
    alternative = options[1]

    explanation_points = [
        f'{options[1]["label"] if options[1]["label"] == recommended["label"] else recommended["label"]} scores better on long-term impact and shared educational reach.' if recommended['profile']['long_term_impact'] > alternative['profile']['long_term_impact'] else f'{recommended["label"]} scores better on immediate accessibility and implementation simplicity.',
        f'Budget efficiency is stronger for {recommended["label"]} in this scenario.',
        f'{recommended["label"]} creates a more durable education outcome profile, while {alternative["label"]} carries more operational friction or misuse risk.',
    ]

    risk_analysis = [
        {
            'path': item['label'],
            'risk': (
                'Misuse or uneven usage risk is meaningful, along with maintenance and replacement overhead.'
                if item['profile']['misuse_risk'] >= 0.35
                else 'Initial setup and rollout complexity are the main risks, especially in slower regions.'
            ),
        }
        for item in options
    ]

    what_if_probability = min(primary_probability + 0.09, 0.92)
    what_if_text = (
        f'If budget increases by 30% and strict monitoring is added, the success probability of {options[1]["label"] if "Laptop" not in options[0]["label"] else options[0]["label"]} could rise to about {round(what_if_probability * 100)}%.'
        if 'Laptop' in options[0]['label']
        else f'If budget increases by 30% and strict monitoring is added, the success probability of {options[1]["label"]} could rise to about {round(what_if_probability * 100)}%.'
    )

    factor_impacts = [
        {'factor': 'Budget efficiency', 'impact': 'High impact'},
        {'factor': 'Population coverage', 'impact': 'High impact'},
        {'factor': 'Infrastructure readiness', 'impact': 'Very high impact' if recommended['label'] == 'Digital Infrastructure Policy' else 'Medium impact'},
        {'factor': 'Risk of misuse', 'impact': 'Medium impact'},
    ]

    action_plan = [
        'Build digital infrastructure first in the weakest institutions.',
        'Provide laptops only to economically weaker students or high-need cohorts.',
        'Add a tracking and maintenance system for device usage.',
        'Partner with telecom providers for affordable internet access.',
    ]

    return {
        'mode': 'comparison',
        'decision': f'Recommended Policy: {recommended["label"]}',
        'probability': recommended['probability'],
        'score_label': f'{round(recommended["probability"] * 100)}% policy fit',
        'score_band': 'policy-comparison',
        'summary': f'Policy success probabilities: {options[0]["label"]}: {round(options[0]["probability"] * 100)}%, {options[1]["label"]}: {round(options[1]["probability"] * 100)}%.',
        'next_step': action_plan[0],
        'target_score': 80.0,
        'key_factors': recommended['base']['key_factors'],
        'explanation': ' '.join(explanation_points),
        'suggestions': action_plan[:3],
        'details': {
            'probabilities': [{'label': item['label'], 'probability': item['probability']} for item in options],
            'recommendation': recommended['label'],
            'explanations': explanation_points,
            'risks': risk_analysis,
            'what_if': what_if_text,
            'action_plan': action_plan,
            'factor_impacts': factor_impacts,
            'actionable_suggestions': {
                recommended['label']: action_plan[:3],
                alternative['label']: [
                    'Use it selectively rather than universally.',
                    'Add monitoring, maintenance, and beneficiary verification.',
                    'Pair it with infrastructure so the benefit does not remain one-time only.',
                ],
            },
            'meta': {
                'retrieved_sources': {
                    options[0]['label']: retrieved_primary,
                    options[1]['label']: retrieved_alternative,
                },
            },
        },
    }
