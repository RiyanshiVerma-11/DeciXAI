from __future__ import annotations

from copy import deepcopy
import re

import pandas as pd

from services.input_parser_service import parse_natural_language_input
from services.model_service import predict_with_model


DOMAIN_MODEL_MAP = {
    'finance': 'finance',
    'startup': 'startup',
    'business': 'startup',
    'policy': 'policy',
}

POLICY_OPTION_PROFILES = {
    'free laptop policy': {'budget_multiplier': 1.0, 'impact_score': 0.62, 'risk_score': 0.48, 'accessibility_score': 0.74, 'sector': 'education'},
    'digital infrastructure policy': {'budget_multiplier': 1.25, 'impact_score': 0.84, 'risk_score': 0.28, 'accessibility_score': 0.82, 'sector': 'education'},
}

STARTUP_OPTION_PROFILES = {
    'consumer': {'market': 'consumer', 'risk_score': 0.46, 'impact_score': 0.64},
    'enterprise': {'market': 'enterprise', 'risk_score': 0.34, 'impact_score': 0.77},
}


def _clean_option_name(option: str) -> str:
    return re.sub(r'\s+', ' ', str(option or '').strip()).lower()


def _parse_key_factor_value(raw: str) -> tuple[str, float] | None:
    match = re.match(r'^(.*?)\s*\((-?\d+(?:\.\d+)?)\)\s*$', str(raw).strip())
    if not match:
        return None
    return match.group(1).strip(), float(match.group(2))


def _build_model_frame(domain: str, features: dict) -> pd.DataFrame:
    if domain == 'career':
        return pd.DataFrame([{
            'cgpa': features['cgpa'],
            'skills_count': features['skills_count'],
            'projects_count': features['projects_count'],
            'certifications_count': features['certifications_count'],
            'interest': features['interest'],
            'course_group': features['course_group'],
            'specialization_group': features['specialization_group'],
        }])
    if domain == 'finance':
        return pd.DataFrame([{
            'income': features['income'],
            'loan': features['loan'],
            'credit_score': features['credit_score'],
            'loan_to_income': features['loan_to_income'],
        }])
    if domain in {'startup', 'business'}:
        return pd.DataFrame([{
            'funding': features['funding'],
            'team_size': features['team_size'],
            'market': features['market'],
            'experience': features['experience'],
            'funding_per_team': features['funding_per_team'],
        }])
    return pd.DataFrame([{
        'sector': features['sector'],
        'budget': features['budget'],
        'population': features['population'],
        'per_capita_budget': features['per_capita_budget'],
    }])


def map_option_to_features(domain: str, option: str, factors: dict) -> dict:
    option_key = _clean_option_name(option)
    base = deepcopy(factors)

    if domain == 'finance':
        caution_penalty = 0.08 if 'loan' in option_key or 'debt' in option_key else -0.02
        income = float(factors.get('income', 60000))
        loan = float(factors.get('loan', 15000)) * (1.15 if 'take' in option_key else 0.75 if 'delay' in option_key or 'wait' in option_key else 1.0)
        credit_score = float(factors.get('credit_score', 680))
        return {
            'income': income,
            'loan': max(0.0, loan),
            'credit_score': credit_score,
            'loan_to_income': min(max(loan / max(income, 1.0), 0.0), 5.0),
            'impact_score': 0.68,
            'risk_score': 0.42 + caution_penalty,
        }

    if domain in {'startup', 'business'}:
        requested_market = str(factors.get('market_type', 'consumer')).lower()
        if 'enterprise' in option_key or 'b2b' in option_key or 'saas' in option_key or (option_key == 'startup' and requested_market == 'enterprise'):
            profile = STARTUP_OPTION_PROFILES['enterprise']
        else:
            profile = STARTUP_OPTION_PROFILES['consumer']
        team_size = max(int(float(factors.get('team_size', 6))), 1)
        funding = float(factors.get('funding', 250000))
        experience = float(factors.get('experience', 3))
        return {
            'funding': funding,
            'team_size': team_size,
            'market': profile['market'],
            'experience': experience,
            'funding_per_team': funding / team_size,
            'impact_score': profile['impact_score'],
            'risk_score': profile['risk_score'],
        }

    if 'digital infrastructure' in option_key or 'internet access' in option_key or 'smart classroom' in option_key:
        profile = POLICY_OPTION_PROFILES['digital infrastructure policy']
    elif 'laptop' in option_key:
        profile = POLICY_OPTION_PROFILES['free laptop policy']
    else:
        profile = {'budget_multiplier': 1.0, 'impact_score': 0.7, 'risk_score': 0.35, 'accessibility_score': 0.7, 'sector': factors.get('sector', 'education')}
    budget = float(factors.get('budget', 5_000_000)) * profile['budget_multiplier']
    population = max(float(factors.get('population', 200_000)), 1.0)
    return {
        'sector': profile['sector'],
        'budget': budget,
        'population': population,
        'per_capita_budget': budget / population,
        'impact_score': profile['impact_score'],
        'risk_score': profile['risk_score'],
        'accessibility_score': profile['accessibility_score'],
    }


def evaluate_option(domain: str, option: str, features: dict) -> dict:
    frame = _build_model_frame(domain, features)
    model_result = predict_with_model(DOMAIN_MODEL_MAP[domain], frame)
    model_probability = model_result['probability'] if model_result else 0.5

    if domain == 'career':
        final_score = model_probability * 0.55 + features['fit_score'] * 0.30 + features['impact_score'] * 0.15 - features['risk_score'] * 0.08
    elif domain == 'finance':
        final_score = model_probability * 0.75 + features['impact_score'] * 0.10 - features['risk_score'] * 0.12
    elif domain in {'startup', 'business'}:
        final_score = model_probability * 0.70 + features['impact_score'] * 0.18 - features['risk_score'] * 0.12
    else:
        final_score = (
            model_probability * 0.50
            + features['impact_score'] * 0.20
            + features['accessibility_score'] * 0.15
            - features['risk_score'] * 0.15
        )

    return {
        'option': option,
        'features': features,
        'model_result': model_result or {'key_factors': [], 'metrics': {}},
        'score': max(0.05, min(0.95, final_score)),
    }


def _calibrate_startup_single_score(raw_score: float, features: dict) -> float:
    funding = float(features.get('funding', 0.0))
    team_size = max(int(features.get('team_size', 1)), 1)
    experience = float(features.get('experience', 0.0))
    market = str(features.get('market', 'consumer')).lower()

    quality_score = (
        min(funding / 400000.0, 1.0) * 0.35
        + min(team_size / 8.0, 1.0) * 0.25
        + min(experience / 6.0, 1.0) * 0.20
        + (0.20 if market == 'enterprise' else 0.14)
    )

    if funding < 80000 and team_size <= 2 and experience < 2:
        return max(0.18, min(0.45, 0.18 + raw_score * 0.22))

    blended = raw_score * 0.45 + quality_score * 0.55
    return max(0.40, min(0.82, 0.40 + blended * 0.40))


def calibrate_scores(domain: str, ranked_results: list[dict]) -> list[dict]:
    calibrated = []
    single_option = len(ranked_results) == 1
    for item in ranked_results:
        updated = deepcopy(item)
        if single_option and domain in {'startup', 'business'}:
            updated['score'] = round(_calibrate_startup_single_score(item['score'], item['features']), 4)
        else:
            updated['score'] = round(float(item['score']), 4)
        calibrated.append(updated)
    return sorted(calibrated, key=lambda entry: entry['score'], reverse=True)


def evaluate_options(structured_input: dict) -> dict[str, dict]:
    domain = structured_input['domain']
    factors = structured_input['factors']
    options = structured_input['options'] or [domain.title()]
    results = {}
    for option in options:
        mapped = map_option_to_features(domain, option, factors)
        results[option] = evaluate_option(domain, option, mapped)
    return results


def apply_constraints(domain: str, base_features: dict, candidate_features: dict) -> dict:
    constrained = deepcopy(candidate_features)
    if domain in {'startup', 'business'}:
        original_team = max(int(base_features.get('team_size', constrained['team_size'])), 1)
        constrained['team_size'] = min(constrained['team_size'], max(original_team * 2, original_team + 2))
        constrained['funding'] = min(constrained['funding'], max(base_features.get('funding', constrained['funding']) * 1.4, base_features.get('funding', constrained['funding']) + 100000))
        constrained['funding_per_team'] = constrained['funding'] / max(constrained['team_size'], 1)
    if domain == 'policy':
        constrained['budget'] = min(constrained['budget'], base_features.get('budget', constrained['budget']) * 1.3)
        constrained['per_capita_budget'] = constrained['budget'] / max(constrained['population'], 1.0)
    if domain == 'career':
        constrained['skills_count'] = min(constrained['skills_count'], base_features.get('skills_count', constrained['skills_count']) + 3)
        constrained['projects_count'] = min(constrained['projects_count'], base_features.get('projects_count', constrained['projects_count']) + 2)
    if domain == 'finance':
        constrained['loan'] = max(constrained['loan'], 0.0)
        constrained['loan_to_income'] = min(constrained['loan_to_income'], 1.2)
    return constrained


def _meaningful_factor_sentences(domain: str, option: str, model_result: dict) -> list[str]:
    sentences = []
    for raw in model_result.get('key_factors', []):
        parsed = _parse_key_factor_value(raw)
        if not parsed:
            continue
        label, value = parsed
        if abs(value) < 0.015:
            continue
        direction = 'supports' if value > 0 else 'holds back'
        label_text = label.replace('_', ' ')
        if direction == 'supports':
            sentences.append(f'{label_text.title()} supports {option} in the current scenario.')
        else:
            sentences.append(f'{label_text.title()} is a weaker signal for {option} right now.')
    return sentences[:3]


def generate_explanations(domain: str, ranked_results: list[dict]) -> list[str]:
    best = ranked_results[0]
    other = ranked_results[1] if len(ranked_results) > 1 else None

    if not other and domain in {'startup', 'business'}:
        funding = float(best['features'].get('funding', 0.0))
        team_size = int(best['features'].get('team_size', 1))
        experience = float(best['features'].get('experience', 0.0))
        market = str(best['features'].get('market', 'consumer')).lower()
        return [
            f'Current funding provides {"solid early runway" if funding >= 250000 else "initial runway"} but {"still limits rapid scaling" if funding < 400000 else "supports measured execution"}.' ,
            f'A team of {team_size} gives {"enough coverage for an early product stage" if team_size >= 4 else "a workable start, but execution bandwidth is still tight"}.' ,
            f'Founder experience at about {experience:.0f} years {"helps reduce execution risk" if experience >= 3 else "suggests the venture will benefit from stronger advisors or operators"} and the {market} market choice shapes how quickly traction must be proven.',
        ]

    if other and domain == 'policy':
        return [
            f'{best["option"]} scores better than {other["option"]} after comparing both options with the existing policy model.',
            f'{best["option"]} has the stronger long-term impact and wider shared educational reach.',
            f'{other["option"]} carries more misuse, maintenance, or rollout friction in the current scenario.',
            f'Budget efficiency and accessibility together make {best["option"]} the more durable public decision.',
        ]

    if other and domain in {'startup', 'business'}:
        return [
            f'{best["option"]} scores better than {other["option"]} after separate evaluation with the same startup model.',
            f'{best["option"]} shows the better balance of market fit, execution risk, and capital efficiency.',
            f'{other["option"]} needs stronger evidence that the current team and funding plan can support delivery.',
        ]

    if other and domain == 'finance':
        return [
            f'{best["option"]} scores better than {other["option"]} after the options were scored separately with the same finance model.',
            f'{best["option"]} keeps a healthier balance between affordability, debt pressure, and score stability.',
            f'{other["option"]} looks weaker because repayment risk is more exposed in the current profile.',
        ]

    explanation = _meaningful_factor_sentences(domain, best['option'], best['model_result'])
    if other:
        explanation.insert(0, f'{best["option"]} scores better than {other["option"]} after comparing each option separately with the same model pipeline.')
        if domain == 'policy':
            explanation.append(f'{best["option"]} looks stronger on long-term impact and implementation quality, while {other["option"]} carries more operational risk.')
        elif domain in {'startup', 'business'}:
            explanation.append(f'{best["option"]} shows a better balance of market fit, capital readiness, and execution risk.')
        else:
            explanation.append(f'{best["option"]} has the safer balance of affordability, risk, and score stability.')
    return list(dict.fromkeys(explanation))[:4]


def generate_risks(domain: str, evaluated_result: dict) -> list[str]:
    option = _clean_option_name(evaluated_result['option'])
    features = evaluated_result['features']
    risks = []
    if domain == 'finance':
        risks = [
            'Debt pressure can rise quickly if income stability weakens.',
            'A lower credit score can make the current option more expensive over time.',
            'Short-term affordability may hide longer-term repayment stress.',
        ]
    elif domain in {'startup', 'business'}:
        features = evaluated_result['features']
        funding = float(features.get('funding', 0.0))
        team_size = int(features.get('team_size', 1))
        experience = float(features.get('experience', 0.0))
        risks = [
            'Execution risk remains meaningful if the current team has to cover product, growth, and operations at the same time.' if team_size < 6 else 'Coordination risk can grow as the team expands and operating complexity increases.',
            'The current funding level may be enough for validation, but it could become tight if growth or hiring moves faster than revenue.' if funding < 500000 else 'Larger funding can create pressure to scale before retention and unit economics are fully stable.',
            'Go-to-market risk stays elevated until traction is backed by sharper customer validation.' if experience < 4 else 'Experienced leadership helps, but traction still needs to prove that the market pull is real.',
        ]
    else:
        risks = [
            'Implementation can slow down across regions with weak operational capacity.',
            'Misuse, leakage, or uneven adoption can reduce the actual public benefit.',
            'Initial rollout costs may exceed expectations if monitoring is weak.',
        ]
    return risks[:3]


def run_what_if_analysis(domain: str, ranked_results: list[dict]) -> str:
    target = ranked_results[1] if len(ranked_results) > 1 else ranked_results[0]
    updated = deepcopy(target['features'])

    if domain == 'finance':
        updated['loan'] *= 0.85
        updated['loan_to_income'] = updated['loan'] / max(updated['income'], 1.0)
        changed_factor = '15% lower debt load'
    elif domain in {'startup', 'business'}:
        updated['team_size'] += 2
        updated['funding'] *= 1.25
        updated['funding_per_team'] = updated['funding'] / max(updated['team_size'], 1)
        changed_factor = '25% more funding and a modest team expansion'
    else:
        updated['budget'] *= 1.2
        updated['risk_score'] = max(updated['risk_score'] - 0.1, 0.1)
        updated['per_capita_budget'] = updated['budget'] / max(updated['population'], 1.0)
        changed_factor = '20% higher budget with tighter implementation controls'

    updated = apply_constraints(domain, target['features'], updated)
    what_if_result = evaluate_option(domain, target['option'], updated)
    if len(ranked_results) == 1 and domain in {'startup', 'business'}:
        calibrated_after = _calibrate_startup_single_score(what_if_result['score'], what_if_result['features'])
    else:
        calibrated_after = what_if_result['score']
    before = round(target['score'] * 100)
    after = round(calibrated_after * 100)
    return f'If {target["option"]} gets {changed_factor}, its success probability could move from about {before}% to {after}%.'


def build_action_plan(domain: str, ranked_results: list[dict]) -> list[str]:
    best = ranked_results[0]
    option = _clean_option_name(best['option'])
    if domain == 'finance':
        return [
            'Reduce repayment pressure before taking on optional risk.',
            'Stabilize income and keep utilization lower over the next few months.',
            'Re-evaluate the decision after improving the strongest negative factor.',
        ]
    if domain in {'startup', 'business'}:
        best_features = best['features']
        market = str(best_features.get('market', 'consumer')).lower()
        return [
            'Expand the team only where it directly improves product delivery, sales, or customer support.',
            f'Tie the next funding step to traction milestones that fit the {market} market instead of broad growth assumptions.',
            'Strengthen customer validation and repeatable adoption before the next major scale decision.',
        ]
    if 'digital infrastructure' in option:
        return [
            'Build infrastructure first in the weakest institutions.',
            'Target devices only to high-need students after core access is in place.',
            'Add monitoring, maintenance, and telecom partnerships to improve adoption.',
        ]
    return [
        'Narrow the rollout to the highest-need beneficiaries first.',
        'Add usage tracking and accountability mechanisms before full expansion.',
        'Pair the policy with supporting infrastructure so impact lasts beyond rollout.',
    ]


def _confidence_label(best: dict, second: dict | None) -> str:
    metrics = best['model_result'].get('metrics', {})
    gap = best['score'] - (second['score'] if second else 0.0)
    roc_auc = float(metrics.get('roc_auc', 0.7) or 0.7)
    if gap >= 0.15 and roc_auc >= 0.8:
        return 'high'
    if gap >= 0.07 and roc_auc >= 0.65:
        return 'medium'
    return 'low'


def format_structured_input_for_ui(structured: dict) -> dict:
    factors = structured.get('factors', {}) or {}
    formatted = {
        'domain': structured.get('domain'),
    }
    if structured.get('options'):
        formatted['options'] = ', '.join(structured['options'])

    for key, value in factors.items():
        if value is None or key in {'raw_prompt'}:
            continue
        if isinstance(value, (str, int, float, bool)):
            formatted[key] = value
        elif isinstance(value, list):
            formatted[key] = ', '.join(str(item) for item in value)
    return formatted


def validate_report(report: dict, compare_requested: bool) -> dict:
    probabilities = report.get('probabilities', {})
    explanations = [item for item in report.get('explanation', []) if item and not re.fullmatch(r'[\d.\s]+', item)]
    cleaned = []
    for item in explanations:
        if item not in cleaned and 'impact 0' not in item and not re.search(r'\b0{3,}\b', item):
            cleaned.append(item)
    report['explanation'] = cleaned[:4]

    if compare_requested and len(probabilities) < 2:
        report['recommendation'] = 'Need more distinct options to compare'
    if not report['explanation']:
        report['explanation'] = ['The system compared the options using the existing trained model and selected the option with the stronger overall score.']
    if not report.get('action_plan'):
        report['action_plan'] = ['Refine the key assumptions and run the comparison again with clearer option details.']
    return report


def generate_decision_report(message: str) -> dict:
    structured = parse_natural_language_input(message)
    domain = structured['domain']
    if domain == 'career':
        raise ValueError('Career prompts are handled by the hybrid career service.')
    if structured['factors'].get('compare_requested') and len(structured['options']) < 2:
        report = {
            'probabilities': {},
            'recommendation': 'Could not detect multiple options',
            'explanation': ['The parser could not confidently identify two distinct options from the prompt.'],
            'risks': {},
            'what_if': 'Add clearer option phrasing such as "between X and Y" or numbered options.',
            'action_plan': [
                'Rewrite the prompt with two explicit options.',
                'Use patterns like "1. ... 2. ..." or "between X and Y".',
            ],
            'confidence': 'low',
        }
        return {
            'structured_input': structured,
            'report': report,
            'details': {
                'probabilities': [],
                'recommendation': report['recommendation'],
                'explanations': report['explanation'],
                'risks': [],
                'what_if': report['what_if'],
                'action_plan': report['action_plan'],
                'factor_impacts': [],
                'actionable_suggestions': {'How to fix the prompt': report['action_plan']},
                'confidence': 'low',
                'error': 'Could not detect multiple options',
            },
            'domain': domain,
            'best_score': 0.0,
            'best_result': {'model_result': {'key_factors': []}},
        }

    evaluated = evaluate_options(structured)
    ranked = sorted(evaluated.values(), key=lambda item: item['score'], reverse=True)
    ranked = calibrate_scores(domain, ranked)
    best = ranked[0]
    second = ranked[1] if len(ranked) > 1 else None

    report = {
        'probabilities': {item['option']: f'{round(item["score"] * 100)}%' for item in ranked},
        'recommendation': best['option'],
        'explanation': generate_explanations(domain, ranked),
        'risks': {item['option']: generate_risks(domain, item)[:2] for item in ranked},
        'what_if': run_what_if_analysis(domain, ranked),
        'action_plan': build_action_plan(domain, ranked),
        'confidence': _confidence_label(best, second),
    }
    report = validate_report(report, structured['factors'].get('compare_requested', False))

    details = {
        'probabilities': [{'label': item['option'], 'probability': round(item['score'], 4)} for item in ranked],
        'recommendation': report['recommendation'],
        'explanations': report['explanation'],
        'risks': [{'path': name, 'risk': '; '.join(values)} for name, values in report['risks'].items()],
        'what_if': report['what_if'],
        'action_plan': report['action_plan'],
        'factor_impacts': [
            {'factor': 'Model score', 'impact': 'High impact'},
            {'factor': 'Risk level', 'impact': 'High impact'},
            {'factor': 'Implementation readiness', 'impact': 'Medium impact'},
        ],
        'actionable_suggestions': {report['recommendation']: report['action_plan'][:3]},
        'confidence': report['confidence'],
    }

    return {
        'structured_input': structured,
        'report': report,
        'details': details,
        'domain': domain,
        'best_score': round(best['score'], 4),
        'best_result': best,
        'ui_input': format_structured_input_for_ui(structured),
    }
