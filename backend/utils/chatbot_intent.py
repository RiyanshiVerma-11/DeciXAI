def detect_intent(message):
    m = message.lower()
    if any(k in m for k in ['career', 'job', 'cgpa', 'skills', 'resume']):
        return 'career'
    if any(k in m for k in ['loan', 'credit', 'finance', 'investment', 'income']):
        return 'finance'
    if any(k in m for k in ['startup', 'funding', 'team', 'market', 'pitch']):
        return 'startup'
    if any(k in m for k in ['policy', 'government', 'budget', 'population', 'sector']):
        return 'policy'
    return 'career'
