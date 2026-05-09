from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "datasets" / "policy" / "Indian Government Schemes.csv"


def _clean_text(value: Any) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text


def _ascii_safe(text: str) -> str:
    # Keep API/log output safe across Windows consoles and JSON consumers.
    return (text or "").encode("ascii", "ignore").decode("ascii").strip()


def _row_to_document(row: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    name = _clean_text(row.get("Scheme Name") or row.get("scheme_name") or row.get("name"))
    objective = _clean_text(row.get("Objective") or row.get("objective"))
    benefits = _clean_text(row.get("Benefits") or row.get("benefits"))
    eligibility = _clean_text(row.get("Eligibility") or row.get("eligibility"))
    how_to_apply = _clean_text(row.get("How to Apply") or row.get("how_to_apply"))
    sector = _clean_text(row.get("Sector") or row.get("sector"))
    ministry = _clean_text(row.get("Ministry") or row.get("ministry"))
    level = _clean_text(row.get("Level") or row.get("level"))

    parts = [name, sector, ministry, level, objective, benefits, eligibility, how_to_apply]
    doc_text = " ".join(part for part in parts if part)
    meta = {
        "title": name or "Government Scheme",
        "sector": _ascii_safe(sector),
        "ministry": _ascii_safe(ministry),
        "level": _ascii_safe(level),
        "objective": _ascii_safe(objective),
        "benefits": _ascii_safe(benefits),
        "eligibility": _ascii_safe(eligibility),
        "how_to_apply": _ascii_safe(how_to_apply),
    }
    return doc_text, meta


@lru_cache(maxsize=1)
def _load_policy_corpus() -> tuple[list[str], list[dict[str, Any]]]:
    if not DATASET_PATH.exists():
        return [], []

    df = pd.read_csv(DATASET_PATH, low_memory=False)
    documents: list[str] = []
    metas: list[dict[str, Any]] = []

    for _, row in df.iterrows():
        doc_text, meta = _row_to_document(row.to_dict())
        if doc_text.strip():
            documents.append(doc_text)
            metas.append(meta)

    return documents, metas


@lru_cache(maxsize=1)
def _build_index() -> tuple[TfidfVectorizer, Any, list[dict[str, Any]]]:
    documents, metas = _load_policy_corpus()
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=20000, stop_words="english")
    if not documents:
        return vectorizer, None, []
    matrix = vectorizer.fit_transform(documents)
    return vectorizer, matrix, metas


def retrieve_policy_sources(query: str, *, k: int = 4) -> list[dict[str, Any]]:
    """
    Lightweight retrieval over the policy schemes dataset.
    Returns top-k sources with a compact snippet so downstream responses can be grounded.
    """
    query = _clean_text(query)
    if not query:
        return []

    vectorizer, matrix, metas = _build_index()
    if matrix is None or not metas:
        return []

    query_vec = vectorizer.transform([query])
    scores = cosine_similarity(query_vec, matrix).ravel()
    if scores.size == 0:
        return []

    top_idx = scores.argsort()[::-1][: max(1, int(k))]
    sources: list[dict[str, Any]] = []
    for idx in top_idx:
        score = float(scores[idx])
        if score <= 0.0:
            continue
        meta = metas[int(idx)]
        snippet_parts = [meta.get("objective"), meta.get("benefits"), meta.get("eligibility")]
        snippet = _clean_text(" ".join(part for part in snippet_parts if part))
        if len(snippet) > 280:
            snippet = snippet[:277].rstrip() + "..."

        sources.append(
            {
                "title": meta.get("title") or "Government Scheme",
                "score": round(score, 4),
                "sector": meta.get("sector") or "",
                "level": meta.get("level") or "",
                "snippet": snippet,
            }
        )

    # Deduplicate by title
    unique: list[dict[str, Any]] = []
    seen = set()
    for item in sources:
        key = str(item.get("title") or "").strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(item)
    return unique[:k]
