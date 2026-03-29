from __future__ import annotations

import pandas as pd

from services.finance_service import safe_float
from services.insight_service import build_model_driven_guidance
from services.model_service import get_career_comparison_bundle, predict_with_model


PATH_ALIASES = {
    'data science': 'data_science',
    'data scientist': 'data_science',
    'machine learning': 'data_science',
    'ml': 'data_science',
    'software development': 'software_development',
    'software developer': 'software_development',
    'software engineering': 'software_development',
    'software engineer': 'software_development',
    'web development': 'software_development',
    'web developer': 'software_development',
    'cloud': 'cloud_devops',
    'devops': 'cloud_devops',
    'cybersecurity': 'cybersecurity',
    'security': 'cybersecurity',
    'product management': 'product_management',
    'product manager': 'product_management',
}

DISPLAY_NAMES = {
    'data_science': 'Data Science',
    'software_development': 'Software Development',
    'cloud_devops': 'Cloud / DevOps',
    'cybersecurity': 'Cybersecurity',
    'product_management': 'Product Management',
}

PATH_HINTS = {
    'data_science': ['python', 'machine learning', 'statistics', 'sql', 'pandas'],
    'software_development': ['python', 'web development', 'frontend', 'backend', 'dsa'],
    'cloud_devops': ['cloud', 'devops', 'docker', 'kubernetes', 'aws'],
    'cybersecurity': ['security', 'cybersecurity', 'networking', 'soc'],
    'product_management': ['product', 'stakeholder', 'market research', 'roadmap'],
}


def _normalize_interest(value):
    text = str(value or '').strip().lower()
    if any(word in text for word in ['data', 'analytics', 'machine learning', 'ai']):
        return 'data'
    if any(word in text for word in ['management', 'business', 'product']):
        return 'management'
    return 'technical'


def _normalize_course(value):
    text = str(value or '').strip().lower()
    if any(word in text for word in ['computer', 'b.tech', 'b.e', 'engineering', 'software', 'it']):
        return 'engineering'
    if any(word in text for word in ['science', 'mathematics', 'physics']):
        return 'science'
    if any(word in text for word in ['bca', 'mca', 'application']):
        return 'computer_applications'
    if any(word in text for word in ['business', 'commerce', 'management']):
        return 'business'
    return 'general'


def _as_list(value):
    if isinstance(value, list):
        return [str(item).strip().lower() for item in value if str(item).strip()]
    if not value:
        return []
    return [part.strip().lower() for part in str(value).split(',') if part.strip()]


def build_career_frame(data):
    skills = _as_list(data.get('skills'))
    projects = _as_list(data.get('projects'))
    certifications = _as_list(data.get('certifications'))
    masters_flag = 1 if str(data.get('education_level', '')).lower().startswith('master') else int(bool(data.get('masters_flag', 0)))
    course_value = data.get('course') or data.get('degree') or data.get('specialization') or ''

    row = {
        'cgpa': min(max(safe_float(data.get('cgpa', 7.0), 7.0), 0.0), 10.0),
        'skills_count': float(len(skills)),
        'projects_count': float(max(len(projects), safe_float(data.get('projects_count', 0), 0.0))),
        'certifications_count': float(max(len(certifications), safe_float(data.get('certifications_count', 0), 0.0))),
        'masters_flag': float(masters_flag),
        'interest': _normalize_interest(data.get('interest', 'technical')),
        'course_group': _normalize_course(course_value),
        'specialization_group': _normalize_course(data.get('specialization', course_value)),
    }
    return pd.DataFrame([row]), row


def _clamp_probability(value):
    return round(min(max(float(value), 0.02), 0.98), 4)


def _normalize_path_name(value):
    text = str(value or '').strip().lower()
    return PATH_ALIASES.get(text)


def _collect_requested_paths(data):
    explicit = data.get('paths') or []
    normalized = []
    for item in explicit:
        label = _normalize_path_name(item)
        if label and label not in normalized:
            normalized.append(label)
    return normalized or ['data_science', 'software_development']


def _path_input_frame(data):
    skills = _as_list(data.get('skills'))
    projects = _as_list(data.get('projects'))
    certifications = _as_list(data.get('certifications'))
    text = ' '.join([
        ' '.join(skills),
        ' '.join(projects),
        str(data.get('interest', 'technical')),
        str(data.get('specialization', 'computer science')),
    ]).strip()
    student_year = safe_float(data.get('year_of_study', 2), 2.0)
    return pd.DataFrame([{
        'text': text,
        'experience_years': max(student_year - 1, 0),
        'skills_count': len(skills),
        'certifications': max(len(certifications), safe_float(data.get('certifications_count', 0), 0)),
        'salary': 0.0,
    }])


def _salary_scores(path_profiles, requested_paths):
    salaries = [path_profiles[path]['salary_median'] for path in requested_paths if path in path_profiles]
    if not salaries:
        return {}
    low, high = min(salaries), max(salaries)
    denominator = max(high - low, 1.0)
    return {
        path: (path_profiles[path]['salary_median'] - low) / denominator
        for path in requested_paths
        if path in path_profiles
    }


def _path_suggestions(path_profile, user_skills):
    missing = [skill for skill in path_profile.get('top_skills', []) if skill.lower() not in user_skills]
    return missing[:4]


def _path_overlap_score(path, user_skills):
    normalized_user = ' '.join(sorted(user_skills))
    hints = PATH_HINTS.get(path, [])
    if not hints:
        return 0.0
    matches = sum(1 for hint in hints if hint in normalized_user)
    return matches / len(hints)


def get_career_decision(data):
    model_frame, row = build_career_frame(data)
    model_result = predict_with_model('career', model_frame)
    if model_result is None:
        score = min(1.0, row['cgpa'] / 10.0 * 0.45 + min(row['skills_count'] / 8.0, 1.0) * 0.35 + min(row['projects_count'] / 4.0, 1.0) * 0.20)
        label = 'Strong' if score >= 0.8 else 'Promising' if score >= 0.6 else 'Average' if score >= 0.4 else 'Needs work'
        return {
            'decision': 'High potential career path' if score >= 0.5 else 'Needs improvement in portfolio',
            'probability': round(score, 4),
            'score_label': label,
            'score_band': '80-100' if score >= 0.8 else '60-79' if score >= 0.6 else '40-59' if score >= 0.4 else '0-39',
            'summary': f'Career readiness is estimated at {round(score * 100, 1)}/100.',
            'next_step': 'Build stronger proof of work through projects and internships.',
            'target_score': 80.0,
            'key_factors': ['cgpa', 'skills_count', 'projects_count'],
            'explanation': 'The fallback scorer is using academics, skill depth, and project work because the trained model is unavailable.',
            'suggestions': ['Build real projects.', 'Grow job-relevant skills.', 'Seek internship experience.'],
        }

    guidance = build_model_driven_guidance('career', row, model_result)
    probability = model_result['probability']
    score_percent = round(probability * 100, 1)

    return {
        'decision': 'High potential career path' if probability >= 0.5 else 'Needs improvement in portfolio',
        'probability': probability,
        'score_label': model_result['score_label'],
        'score_band': model_result['score_band'],
        'summary': f'Career readiness is estimated at {score_percent}/100 using the trained model and successful-profile benchmarks.',
        'next_step': guidance['suggestions'][0],
        'target_score': 80.0,
        'key_factors': model_result['key_factors'],
        'explanation': guidance['explanation'],
        'suggestions': guidance['suggestions'],
        'risks': guidance['risks'],
    }


def get_career_comparison(data):
    model_frame, readiness_row = build_career_frame(data)
    readiness_result = predict_with_model('career', model_frame)
    readiness_probability = readiness_result['probability'] if readiness_result else 0.55

    comparison_bundle = get_career_comparison_bundle()
    if comparison_bundle is None:
        return None

    path_frame = _path_input_frame(data)
    path_pipeline = comparison_bundle['pipeline']
    class_order = path_pipeline.named_steps['model'].classes_.tolist()
    class_probabilities = path_pipeline.predict_proba(path_frame)[0]
    raw_probabilities = dict(zip(class_order, class_probabilities))
    path_profiles = comparison_bundle.get('path_profiles', {})
    requested_paths = [path for path in _collect_requested_paths(data) if path in path_profiles]
    if len(requested_paths) < 2:
        requested_paths = [path for path in ['data_science', 'software_development'] if path in path_profiles]

    user_skills = set(_as_list(data.get('skills')))
    salary_scores = _salary_scores(path_profiles, requested_paths)

    options = []
    for path in requested_paths:
        profile = path_profiles[path]
        match_probability = raw_probabilities.get(path, 0.0)
        overlap_score = _path_overlap_score(path, user_skills)
        demand_score = profile.get('market_score', 0.0)
        salary_score = salary_scores.get(path, 0.0)
        missing_skills = _path_suggestions(profile, user_skills)
        learning_curve_penalty = min(len(missing_skills) / max(len(profile.get('top_skills', [])), 1), 0.6)

        final_probability = (
            match_probability * 0.18
            + overlap_score * 0.42
            + readiness_probability * 0.20
            + demand_score * 0.10
            + salary_score * 0.10
            - learning_curve_penalty * 0.07
        )

        options.append({
            'path': path,
            'label': DISPLAY_NAMES.get(path, path.replace('_', ' ').title()),
            'probability': _clamp_probability(final_probability),
            'match_probability': round(float(match_probability), 4),
            'overlap_score': round(float(overlap_score), 4),
            'demand_score': round(float(demand_score), 4),
            'salary_median': profile.get('salary_median', 0.0),
            'missing_skills': missing_skills[:3],
            'top_skills': profile.get('top_skills', [])[:5],
            'top_terms': profile.get('top_terms', [])[:5],
        })

    options.sort(key=lambda item: item['probability'], reverse=True)
    recommended = options[0]
    alternative = options[1] if len(options) > 1 else options[0]

    explanation_points = []
    if recommended['missing_skills']:
        explanation_points.append(
            f'Your current profile aligns more strongly with {recommended["label"]} because it requires fewer missing core skills right now.'
        )
    explanation_points.append(
        f'{recommended["label"]} has a stronger combined fit signal right now: market model {round(recommended["match_probability"] * 100)}% and direct skill overlap {round(recommended["overlap_score"] * 100)}%.'
    )
    explanation_points.append(
        f'Readiness from the career model is {round(readiness_probability * 100)}%, and that baseline lifts both paths, but market-fit is currently stronger for {recommended["label"]}.'
    )
    if alternative['missing_skills']:
        explanation_points.append(
            f'{alternative["label"]} currently asks for more missing signals such as {", ".join(alternative["missing_skills"][:2])}.'
        )

    risk_analysis = [
        {
            'path': item['label'],
            'risk': (
                f'Main risk: missing or weaker signals in {", ".join(item["missing_skills"][:2])}.'
                if item['missing_skills']
                else 'Main risk: you still need stronger execution proof through projects and internships.'
            ),
        }
        for item in options
    ]

    what_if_option = alternative
    simulated_missing = what_if_option['missing_skills'][:3]
    what_if_gain = min(0.14, 0.04 * max(len(simulated_missing), 1))
    what_if_probability = _clamp_probability(what_if_option['probability'] + what_if_gain)
    what_if_text = (
        f'If you spend 6-8 months building skills in {", ".join(simulated_missing) or "the missing core areas"} '
        f'and add 2 focused portfolio projects, your {what_if_option["label"]} success probability could rise to about {round(what_if_probability * 100)}%.'
    )

    recommended_actions = [
        f'Build projects that show {recommended["label"].lower()} strengths in real use cases.',
        *[f'Prioritize {skill} next because it appears often in stronger {recommended["label"].lower()} profiles.' for skill in recommended['missing_skills'][:2]],
        'Add internships, hackathons, or open-source work so the model sees stronger execution signals.',
    ]
    alternative_actions = [
        f'Close the biggest gaps for {alternative["label"]}: {", ".join(alternative["missing_skills"][:3]) or "core path skills"}.',
        f'Study the top recurring market signals for {alternative["label"]}: {", ".join(alternative["top_skills"][:3]) or "path-specific tools"}.',
    ]

    comparison_summary = ', '.join(f'{item["label"]}: {round(item["probability"] * 100)}%' for item in options)

    return {
        'mode': 'comparison',
        'decision': f'Recommended Path: {recommended["label"]}',
        'probability': recommended['probability'],
        'score_label': f'{round(recommended["probability"] * 100)}% best-fit',
        'score_band': 'career-comparison',
        'summary': f'Estimated success probabilities based on current readiness, market-fit, demand, and salary signals: {comparison_summary}.',
        'next_step': recommended_actions[0],
        'target_score': 80.0,
        'key_factors': readiness_result['key_factors'] if readiness_result else recommended['top_skills'],
        'explanation': ' '.join(explanation_points[:3]),
        'suggestions': recommended_actions[:3],
        'details': {
            'probabilities': [{'label': item['label'], 'probability': item['probability']} for item in options],
            'recommendation': recommended['label'],
            'explanations': explanation_points,
            'risks': risk_analysis,
            'what_if': what_if_text,
            'actionable_suggestions': {
                recommended['label']: recommended_actions[:3],
                alternative['label']: alternative_actions[:3],
            },
            'comparison_metrics': {
                'career_readiness': round(readiness_probability, 4),
                'path_model_accuracy': comparison_bundle.get('metrics', {}).get('accuracy'),
                'path_model_f1_macro': comparison_bundle.get('metrics', {}).get('f1_macro'),
            },
        },
    }
