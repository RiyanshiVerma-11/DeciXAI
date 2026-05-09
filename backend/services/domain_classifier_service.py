from __future__ import annotations

from functools import lru_cache
import math
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


DOMAIN_EXAMPLES = {
    "career": [
        "career advice for software engineer",
        "job recommendation based on cgpa and skills",
        "resume shortlist chances for data science student",
        "which career path fits my projects and internship",
        "placement prep for btech cse student",
        "meri skills python sql hain career kya choose karun",
        "job ke liye cgpa aur projects kaise improve karun",
    ],
    "finance": [
        "should i take this loan with my income and credit score",
        "personal finance risk for debt and salary",
        "can i afford this emi",
        "investment and loan decision support",
        "mera credit score aur income dekh kar loan safe hai kya",
        "debt risk analyze karo",
    ],
    "startup": [
        "startup funding and team readiness",
        "founder experience and market fit analysis",
        "is my b2b saas startup investor ready",
        "how strong is my runway and team size",
        "meri startup funding aur team se success chance batao",
        "founder experience kam hai startup risky hai kya",
    ],
    "policy": [
        "government policy feasibility for education budget",
        "public policy impact for population and budget",
        "scheme rollout analysis with implementation risk",
        "compare digital infrastructure policy versus free laptops",
        "sarkari yojana ka impact aur budget feasibility",
        "policy implementation risk for large population",
    ],
}

KEYWORD_PRIORS = {
    "career": {
        "career": 1.0, "job": 1.0, "resume": 1.0, "cgpa": 1.2, "student": 0.8,
        "placement": 1.0, "internship": 0.8, "skills": 0.5, "career path": 1.2,
    },
    "finance": {
        "loan": 1.2, "credit": 1.0, "income": 0.9, "debt": 1.0, "emi": 1.1,
        "finance": 0.9, "investment": 0.6, "afford": 0.8,
    },
    "startup": {
        "startup": 1.2, "founder": 1.0, "funding": 1.1, "runway": 1.0, "team": 0.7,
        "saas": 0.9, "b2b": 0.9, "b2c": 0.8, "market fit": 1.0, "traction": 0.8,
    },
    "policy": {
        "policy": 1.2, "government": 1.0, "scheme": 1.0, "budget": 0.8, "population": 0.7,
        "public policy": 1.1, "infrastructure": 0.8, "yojana": 1.0,
    },
}

HINDI_SIGNAL_WORDS = {
    "hindi", "hinglish", "mera", "meri", "mere", "kya", "kaise", "karun", "batao", "hai", "hain", "aur", "ke", "ki"
}


def _clean_text(text: str) -> str:
    lowered = str(text or "").strip().lower()
    return re.sub(r"\s+", " ", lowered)


def detect_language(text: str) -> str:
    cleaned = _clean_text(text)
    if re.search(r"[\u0900-\u097f]", cleaned):
        return "hindi"
    tokens = set(re.findall(r"[a-z]+", cleaned))
    if tokens & HINDI_SIGNAL_WORDS:
        return "hinglish"
    return "english"


@lru_cache(maxsize=1)
def get_domain_classifier() -> Pipeline:
    samples: list[str] = []
    labels: list[str] = []
    for domain, domain_samples in DOMAIN_EXAMPLES.items():
        for sample in domain_samples:
            samples.append(sample)
            labels.append(domain)

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)),
        ("model", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
    ])
    pipeline.fit(samples, labels)
    return pipeline


def classify_domain(text: str) -> dict:
    cleaned = _clean_text(text)
    classifier = get_domain_classifier()
    probabilities = classifier.predict_proba([cleaned])[0]
    classes = list(classifier.named_steps["model"].classes_)
    scores = {str(label): float(prob) for label, prob in zip(classes, probabilities)}

    for domain, weights in KEYWORD_PRIORS.items():
        for phrase, weight in weights.items():
            if phrase in cleaned:
                scores[domain] = scores.get(domain, 0.0) + (0.045 * weight)

    total = sum(scores.values()) or 1.0
    normalized_scores = {key: value / total for key, value in scores.items()}
    ranked = sorted(normalized_scores.items(), key=lambda item: item[1], reverse=True)
    top_domain, top_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0.0
    margin = max(top_score - second_score, 0.0)
    confidence = max(0.0, min(0.99, top_score * 0.7 + margin * 0.9))

    return {
        "domain": top_domain,
        "confidence": round(confidence, 4),
        "scores": {str(key): round(value, 4) for key, value in sorted(normalized_scores.items())},
        "ambiguous": margin < 0.08 or top_score < 0.4,
        "language": detect_language(cleaned),
        "margin": round(margin, 4),
    }


def build_chat_language_instruction(language: str) -> str:
    if language == "hindi":
        return "Reply in simple Hindi. Keep key product terms in English when needed."
    if language == "hinglish":
        return "Reply in natural Hinglish with short, clear sentences."
    return "Reply in concise English."
