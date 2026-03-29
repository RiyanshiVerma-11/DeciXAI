from utils.chatbot_intent import detect_intent
from utils.parse_prompt import parse_prompt
from services.career_service import get_career_comparison, get_career_decision
from services.finance_service import get_finance_decision
from services.startup_service import get_startup_decision
from services.policy_service import get_policy_decision


def _is_career_comparison(features, message):
    paths = features.get('paths') or []
    lowered = message.lower()
    return len(paths) >= 2 or ('between' in lowered and (' or ' in lowered or ' vs ' in lowered))


def get_chatbot_response(message):
    domain = detect_intent(message)
    features = parse_prompt(domain, message)

    if domain == 'career':
        result = get_career_comparison(features) if _is_career_comparison(features, message) else get_career_decision(features)
    elif domain == 'finance':
        result = get_finance_decision(features)
    elif domain == 'startup':
        result = get_startup_decision(features)
    else:
        result = get_policy_decision(features)

    return {
        'decision': result['decision'],
        'probability': result['probability'],
        'key_factors': result['key_factors'],
        'explanation': f"[Chatbot {domain}] {result['explanation']}",
        'suggestions': result['suggestions'],
        'intent': domain,
        'mode': result.get('mode', 'single'),
        'parsed_input': features,
        'details': result.get('details'),
        'summary': result.get('summary'),
        'score_label': result.get('score_label'),
        'score_band': result.get('score_band'),
        'next_step': result.get('next_step'),
        'target_score': result.get('target_score'),
    }
