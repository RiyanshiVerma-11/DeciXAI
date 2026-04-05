from __future__ import annotations

import math
import re

import pandas as pd

from services.model_service import predict_with_model


DEFAULT_STARTUP_INPUT = {
    'funding': float('nan'),
    'team_size': float('nan'),
    'market': '',
    'experience': float('nan'),
}


def _json_safe_number(value: float):
    try:
        numeric = float(value)
    except Exception:
        return value
    if math.isnan(numeric) or math.isinf(numeric):
        return None
    return numeric


def _sanitize_startup_payload(payload: dict | None) -> dict:
    data = dict(payload or {})
    for key in ('funding', 'team_size', 'experience'):
        data[key] = _json_safe_number(data.get(key))
    return data


def _clamp(value: float, minimum: float, maximum: float) -> float:
    if value != value:
        return value
    return max(minimum, min(value, maximum))


def _round_currency(value: float, step: int = 10000) -> int:
    return int(round(value / step) * step)


def _safe_divisor(value: float) -> float:
    try:
        numeric = float(value)
    except Exception:
        return 1.0
    if numeric != numeric or numeric <= 0:
        return 1.0
    return numeric


def _startup_decision_label(score: float, experience: float) -> str:
    if score > 65 and experience < 2:
        return 'Promising but high execution risk'
    if score >= 85:
        return 'Investor-ready startup potential'
    if score > 65:
        return 'Promising'
    if score >= 50:
        return 'Average potential'
    return 'Needs stronger execution fundamentals'


def _calculate_startup_confidence(score: float, experience: float, funding: float, team_size: int, market_segment: str) -> int:
    base_confidence = 50.0 + (score - 50.0) * 0.3
    if experience == 0:
        base_confidence -= 15.0
    if funding != funding or team_size <= 0 or experience != experience:
        base_confidence -= 10.0
    if market_segment not in {'enterprise', 'consumer'}:
        base_confidence -= 5.0
    return int(round(_clamp(base_confidence, 5.0, 95.0)))


def _clean_sentence(text: str) -> str:
    cleaned = re.sub(r'\s+', ' ', str(text or '')).strip()
    cleaned = re.sub(r'([.?!]){2,}', r'\1', cleaned)
    cleaned = re.sub(r'\s+([.?!,])', r'\1', cleaned)
    return cleaned.strip()


def _dedupe_texts(items: list[str], limit: int | None = None) -> list[str]:
    unique = []
    seen = set()
    for item in items:
        cleaned = _clean_sentence(item)
        normalized = cleaned.rstrip('.').lower()
        if cleaned and normalized not in seen:
            seen.add(normalized)
            unique.append(cleaned)
    return unique if limit is None else unique[:limit]


def _normalize_market(text: str) -> dict[str, str]:
    lowered = str(text or '').strip().lower()

    market_segment = ''
    if any(re.search(rf'\b{re.escape(token)}\b', lowered) for token in ['enterprise', 'b2b']):
        market_segment = 'enterprise'
    elif any(re.search(rf'\b{re.escape(token)}\b', lowered) for token in ['consumer', 'b2c', 'd2c']):
        market_segment = 'consumer'

    market_type = ''
    for token in ['fintech', 'edtech', 'health', 'climate', 'ecommerce', 'crypto', 'saas', 'education', 'food', 'logistics', 'energy']:
        if re.search(rf'\b{re.escape(token)}\b', lowered):
            market_type = token
            break

    cleaned = re.sub(r'[^a-z\s-]', ' ', lowered)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    if not market_type and cleaned and cleaned not in {'enterprise', 'b2b', 'consumer', 'b2c', 'd2c'}:
        market_type = cleaned

    market_value = market_segment or market_type or ''
    return {
        'market': market_value,
        'market_type': market_type or 'general',
        'market_segment': market_segment or 'general',
    }


def _parse_number_with_suffix(number_text: str, suffix_text: str = '') -> float:
    cleaned_number = str(number_text or '').replace(',', '').strip()
    value = float(cleaned_number)
    suffix = str(suffix_text or '').strip().lower()

    if suffix == 'k':
        value *= 1_000
    elif suffix in {'m', 'mn'}:
        value *= 1_000_000
    elif suffix == 'b':
        value *= 1_000_000_000
    elif suffix in {'million', 'millions'}:
        value *= 1_000_000

    return value


def _closest_contextual_match(text: str, patterns: list[str]) -> re.Match | None:
    closest_match = None
    closest_span = None

    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            span = match.end() - match.start()
            if closest_match is None or span < closest_span:
                closest_match = match
                closest_span = span

    return closest_match


def parse_startup_input(text: str) -> dict:
    message = str(text or '')
    lowered = message.lower()

    funding_match = _closest_contextual_match(
        message,
        [
            r'\b(?:funding|raised|capital|investment)\b[^\d]{0,20}([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m|mn|b|million|millions)?\b',
            r'([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m|mn|b|million|millions)?\b[^\w]{0,10}\b(?:in funding|raised|capital|investment)\b',
        ],
    )
    team_match = _closest_contextual_match(
        message,
        [
            r'\bteam\b[^\d]{0,12}(?:of\s+)?([0-9]{1,3})\b',
            r'\b([0-9]{1,3})\b[^\w]{0,6}\b(?:team members|members|people)\b',
            r'\b(?:members|people)\b[^\d]{0,12}(?:of\s+)?([0-9]{1,3})\b',
        ],
    )
    experience_match = _closest_contextual_match(
        message,
        [
            r'\b([0-9]+(?:\.[0-9]+)?)\b[^\w]{0,6}\b(?:years|yrs)\b(?:[^\w]{0,10}\bexperience\b)?',
            r'\bexperience\b[^\d]{0,12}([0-9]+(?:\.[0-9]+)?)\b[^\w]{0,6}\b(?:years|yrs)?',
        ],
    )

    market_type = ''
    market_segment = ''

    if any(re.search(rf'\b{re.escape(token)}\b', lowered) for token in ['enterprise', 'b2b']):
        market_segment = 'enterprise'
    elif any(re.search(rf'\b{re.escape(token)}\b', lowered) for token in ['consumer', 'b2c', 'd2c']):
        market_segment = 'consumer'

    for token in ['fintech', 'edtech', 'health', 'climate', 'ecommerce', 'crypto', 'saas', 'education', 'food', 'logistics', 'energy']:
        if re.search(rf'\b{re.escape(token)}\b', lowered):
            market_type = token
            break

    market = market_segment or market_type or ''

    funding = float('nan')
    if funding_match:
        funding = _parse_number_with_suffix(funding_match.group(1), funding_match.group(2) if funding_match.lastindex and funding_match.lastindex >= 2 else '')

    team_size = float('nan')
    if team_match:
        team_size = max(1, int(team_match.group(1)))

    experience = float('nan')
    if experience_match:
        experience = float(experience_match.group(1))

    normalized_market = _normalize_market(market)
    return {
        'funding': float(funding),
        'team_size': team_size,
        'market': normalized_market['market'],
        'market_type': normalized_market['market_type'],
        'market_segment': normalized_market['market_segment'],
        'experience': float(experience),
    }


def _coerce_startup_input(data: dict | None) -> dict:
    payload = data or {}

    def _numeric_or_nan(value):
        try:
            return float(value)
        except Exception:
            return float('nan')

    normalized_market = _normalize_market(payload.get('market', DEFAULT_STARTUP_INPUT['market']))
    return {
        'funding': _numeric_or_nan(payload.get('funding', DEFAULT_STARTUP_INPUT['funding'])),
        'team_size': _numeric_or_nan(payload.get('team_size', DEFAULT_STARTUP_INPUT['team_size'])),
        'market': normalized_market['market'],
        'market_type': normalized_market['market_type'],
        'market_segment': normalized_market['market_segment'],
        'experience': _numeric_or_nan(payload.get('experience', DEFAULT_STARTUP_INPUT['experience'])),
    }


def _score_band(score: float) -> tuple[str, str]:
    if score >= 85:
        return 'Investor-ready startup potential', 'Investor Ready'
    if score >= 70:
        return 'Strong startup potential', 'Strong'
    if score >= 50:
        return 'Promising startup potential', 'Promising'
    return 'Needs stronger execution fundamentals', 'Early Stage'



def _fallback_probability(funding: float, team_size: int, market: str, experience: float) -> float:
    # Simple fallback: average of normalized factors
    funding_norm = min(funding / 100000, 1.0)  # Normalize to 0-1
    team_norm = min(team_size / 10, 1.0)      # Normalize to 0-1
    exp_norm = min(experience / 5, 1.0)       # Normalize to 0-1
    market_bonus = 1.1 if market == 'enterprise' else 1.0
    return (funding_norm * 0.4 + team_norm * 0.3 + exp_norm * 0.3) * market_bonus


def _build_key_factors(funding: float, team_size: int, market: str, experience: float) -> list[str]:
    factors = []
    if experience > 5:
        factors.append(f'Founder experience is strong at {experience:.1f} years.')
    elif experience >= 3:
        factors.append(f'Founder experience is moderate at {experience:.1f} years.')
    else:
        factors.append(f'Founder experience is early at {experience:.1f} years.')

    if funding > 100000:
        factors.append(f'Funding of ${funding:,.0f} gives the company healthier operating runway.')
    elif funding >= 50000:
        factors.append(f'Funding of ${funding:,.0f} supports basic early execution but remains tight.')
    else:
        factors.append(f'Funding of ${funding:,.0f} is lean for product, hiring, and distribution needs.')

    if 4 <= team_size <= 10:
        factors.append(f'Team size of {team_size} is in the practical early-stage operating range.')
    elif team_size < 4:
        factors.append(f'Team size of {team_size} may limit shipping speed and go-to-market capacity.')
    else:
        factors.append(f'Team size of {team_size} may introduce coordination overhead for the current stage.')

    if market == 'enterprise':
        factors.append('Enterprise positioning can support larger contract value with strong sales execution.')
    else:
        factors.append(f'{market.title()} positioning will require clear evidence of repeatable demand.')

    return _dedupe_texts(factors, limit=4)


def _build_blocking_factors(funding: float, team_size: int, experience: float) -> list[str]:
    blocking_factors = []
    if funding < 50000:
        blocking_factors.append('Low funding limits execution speed')
    if team_size < 4:
        blocking_factors.append('Small team limits product and growth execution')
    if experience < 3:
        blocking_factors.append('Low founder experience increases execution risk')
    return _dedupe_texts(blocking_factors, limit=3)


def _build_risks(funding: float, team_size: int, market: str, experience: float) -> list[str]:
    risks = []
    if funding < 100000:
        risks.append('Limited runway can slow hiring, experimentation, and customer acquisition.')
    if team_size < 4:
        risks.append('A very small team may struggle to cover product, sales, and operations at once.')
    if team_size > 10:
        risks.append('A larger early-stage team can create coordination drag before strong traction is established.')
    if experience < 3:
        risks.append('Execution quality may depend on learning speed, advisors, and process discipline.')
    if market != 'enterprise':
        risks.append('Consumer-oriented growth usually needs stronger proof of retention and efficient acquisition.')
    return _dedupe_texts(risks, limit=3)


def _build_action_plan(funding: float, team_size: int, market: str, experience: float) -> list[str]:
    suggestions = []
    max_team_target = min(12, max(team_size, math.ceil(team_size * 1.5)))

    if team_size < 4:
        suggested_team = min(4, max_team_target)
        if suggested_team > team_size:
            suggestions.append(
                f'Expand the core team from {team_size} to about {suggested_team} people, focused on product and go-to-market execution.'
            )
    elif team_size > 10:
        suggestions.append('Stabilize ownership and productivity before adding more headcount.')

    if funding < 100000:
        funding_target = _round_currency(max(funding, min(funding * 1.8, 200000.0)))
        if funding_target > funding:
            suggestions.append(
                f'Plan the next raise around ${funding_target:,.0f} to improve runway without overshooting realistic early-stage needs.'
            )

    if experience <= 5:
        suggestions.append('Add experienced operators or advisors to reduce execution risk and sharpen decision quality.')

    if market == 'enterprise':
        suggestions.append('Focus on pilots, conversion milestones, and a repeatable enterprise sales motion.')
    else:
        suggestions.append('Strengthen proof of demand with repeat usage, customer feedback, and a narrower market wedge.')

    if 4 <= team_size <= 10 and funding >= 100000 and experience > 5:
        suggestions.insert(0, 'Prioritize traction milestones and capital efficiency rather than major structural changes.')

    return _dedupe_texts(suggestions, limit=3)


def _build_startup_response(score: float, funding: float, team_size: int, market: str, experience: float, market_segment: str | None = None) -> dict:
    label = _startup_decision_label(score, experience)
    confidence = _calculate_startup_confidence(score, experience, funding, team_size, market_segment or market)
    score_label = 'Fallback Estimate' if confidence < 40 else label
    key_factors = _build_key_factors(funding, team_size, market, experience)
    blocking_factors = _build_blocking_factors(funding, team_size, experience)
    risks = _build_risks(funding, team_size, market, experience)
    action_plan = _build_action_plan(funding, team_size, market, experience)

    summary_parts = [
        f'The startup scores {score:.1f}/100 based on capital, team shape, founder experience, and market context.'
    ]
    if key_factors:
        summary_parts.append(key_factors[0])
    if blocking_factors:
        summary_parts.append(blocking_factors[0] + '.')

    summary = _clean_sentence(' '.join(summary_parts))
    what_if_score = min(100, int(round(score + 10)))
    insights = [
        f'Funding ({"+8%" if funding >= 100000 else "-8%"}) {"improves" if funding >= 100000 else "reduces"} operating runway.',
        f'Team size ({"+6%" if 4 <= team_size <= 10 else "-6%"}) {"supports" if 4 <= team_size <= 10 else "limits"} execution capacity.',
        f'Founder experience ({"+7%" if experience >= 3 else "-7%"}) {"reduces" if experience >= 3 else "increases"} execution risk.',
    ]

    return {
        'score': round(score, 1),
        'decision': label,
        'decision_band': score_label,
        'band': score_label,
        'confidence': confidence,
        'confidence_ratio': round(confidence / 100.0, 4),
        'summary': summary,
        'insights': insights,
        'key_factors': key_factors,
        'risks': risks,
        'options': [{'name': market.title() if market else 'Startup', 'score': round(score, 1), 'reason': summary}],
        'action_plan': action_plan,
        'what_if': f'Adding stronger traction evidence or extending runway can improve the score from {int(round(score))} to {what_if_score}.',
        'blocking_factors': blocking_factors,
        'probability': round(score / 100.0, 4),
        'score_label': score_label,
        'score_band': score_label,
        'next_step': action_plan[0] if action_plan else '',
        'explanation': ' '.join(insights),
        'suggestions': action_plan[:3],
    }


def get_startup_decision(data: dict | None):
    startup = _coerce_startup_input(data)
    funding = startup['funding']
    team_size = startup['team_size']
    market = startup['market']
    experience = startup['experience']

    market_type = startup.get('market_type', '')
    market_segment = startup.get('market_segment', market)
    model_frame = pd.DataFrame([{
        'funding': funding,
        'team_size': team_size,
        'market': market,
        'experience': experience,
        'funding_per_team': funding / _safe_divisor(team_size),
    }])

    model_result = predict_with_model('startup', model_frame)
    if model_result is None:
        fallback_prob = _fallback_probability(funding, team_size, market, experience)
        response = _build_startup_response(fallback_prob * 100, funding, team_size, market, experience, market_segment)
        response['insights'] = []
        response['risks'] = []
        response['action_plan'] = []
        response['what_if'] = ''
        response['confidence'] = _calculate_startup_confidence(fallback_prob * 100, experience, funding, team_size, market_segment)
        response['probability'] = fallback_prob
        response['score'] = fallback_prob * 100
        response['score_label'] = response['score_label']
        response['score_band'] = response['score_label']
        response['decision_band'] = response['score_label']
    else:
        row = {
            'funding': funding,
            'team_size': team_size,
            'market': market,
            'experience': experience,
            'funding_per_team': funding / _safe_divisor(team_size),
        }
        positive = []
        negative = []
        factor_impacts = []
        for raw_feature, shap_value in model_result.get('raw_shap', [])[:8]:
            feature = raw_feature.replace('num__', '').replace('cat__', '')
            statement = f"{feature}: SHAP={float(shap_value):+.4f}; current={row.get(feature, feature)}"
            factor_impacts.append({'factor': feature, 'impact': statement, 'value': round(float(shap_value), 4)})
            if float(shap_value) > 0:
                positive.append(statement)
            elif float(shap_value) < 0:
                negative.append(statement)

        updated = dict(row)
        profiles = model_result.get('profiles', {}) or {}
        numeric_profiles = profiles.get('numeric', {}) or {}
        changed = []
        action_plan = []
        ranked_gaps = []
        for feature in ['funding', 'team_size', 'experience']:
            profile = numeric_profiles.get(feature, {})
            target = profile.get('positive_p25') or profile.get('positive_median')
            if target is None:
                continue
            target_value = float(target)
            if updated[feature] != updated[feature]:
                continue
            if target_value > updated[feature]:
                updated[feature] = target_value
                changed.append(feature)
                ranked_gaps.append((target_value - row[feature], feature, row[feature], target_value))
        updated['funding_per_team'] = updated['funding'] / _safe_divisor(updated['team_size'])
        rerun = predict_with_model('startup', pd.DataFrame([updated]))
        what_if = ''
        if rerun is not None:
            what_if = (
                f"Re-running the startup model after improving {', '.join(changed) or 'top gap features'} "
                f"changes the score from {round(model_result['probability'] * 100, 2)} to {round(rerun['probability'] * 100, 2)}."
            )

        ranked_gaps.sort(reverse=True)
        for _, feature, current, target in ranked_gaps[:4]:
            action_plan.append(
                f"Improve {feature}; current value {round(float(current), 2)} is below the stronger model profile range near {round(float(target), 2)}."
            )

        score = round(model_result['probability'] * 100, 2)
        label = _startup_decision_label(score, experience)
        confidence = _calculate_startup_confidence(score, experience, funding, team_size, market_segment)
        score_label = 'Fallback Estimate' if confidence < 40 else label
        option_name = (
            market_type.title() if market_type and market_type != 'general' else
            market.title() if market else
            market_segment.title() if market_segment and market_segment != 'general' else
            'Startup'
        )
        response = {
            'score': score,
            'decision': label,
            'decision_band': score_label,
            'band': score_label,
            'confidence': confidence,
            'confidence_ratio': round(confidence / 100.0, 4),
            'summary': f"Startup score returned directly from the trained model: {score}.",
            'insights': positive[:4],
            'key_factors': [f"{item['factor']} ({item['value']:+.4f})" for item in factor_impacts],
            'risks': negative[:4],
            'options': [{'name': option_name, 'score': score}],
            'action_plan': action_plan,
            'what_if': what_if,
            'blocking_factors': negative[:3],
            'probability': model_result['probability'],
            'score_label': score_label,
            'score_band': score_label,
            'next_step': action_plan[0] if action_plan else '',
            'explanation': ' '.join(positive + negative),
            'suggestions': action_plan[:3],
        }
    return response | {
        'intent': 'startup',
        'mode': 'single',
        'parsed_input': _sanitize_startup_payload(startup),
    }


def get_startup_decision_from_text(text: str) -> dict:
    parsed = parse_startup_input(text)
    response = get_startup_decision(parsed)
    response['parsed_input'] = _sanitize_startup_payload(parsed)
    return response
