from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


ROOT = Path(__file__).resolve().parents[1]
ONET_DIR = ROOT / "datasets" / "career" / "db_29_0_text"


def _clean_text(value: Any) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text


def _ascii_safe(text: str) -> str:
    return (text or "").encode("ascii", "ignore").decode("ascii").strip()


def _read_table(filename: str, usecols: list[str] | None = None) -> pd.DataFrame:
    path = ONET_DIR / filename
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path, sep="\t", low_memory=False, usecols=usecols)


def _group_top_strings(df: pd.DataFrame, *, code_col: str, value_col: str, k: int) -> dict[str, list[str]]:
    if df.empty or code_col not in df.columns or value_col not in df.columns:
        return {}
    trimmed = df[[code_col, value_col]].dropna()
    trimmed[value_col] = trimmed[value_col].astype(str).str.strip()
    trimmed = trimmed[trimmed[value_col].astype(str).str.len() > 0]
    grouped: dict[str, list[str]] = {}
    for code, group in trimmed.groupby(code_col):
        values = group[value_col].astype(str).tolist()
        seen = set()
        unique: list[str] = []
        for item in values:
            key = item.lower()
            if key in seen:
                continue
            seen.add(key)
            unique.append(item)
            if len(unique) >= k:
                break
        grouped[str(code)] = unique
    return grouped


@lru_cache(maxsize=1)
def _load_onet_corpus() -> tuple[list[str], list[dict[str, Any]]]:
    if not ONET_DIR.exists():
        return [], []

    occupations = _read_table("Occupation Data.txt", usecols=["O*NET-SOC Code", "Title", "Description"])
    if occupations.empty:
        return [], []

    alt_titles = _read_table("Alternate Titles.txt", usecols=["O*NET-SOC Code", "Alternate Title"])
    skills = _read_table("Skills.txt", usecols=["O*NET-SOC Code", "Element Name", "Scale ID", "Data Value"])
    tech = _read_table("Technology Skills.txt", usecols=["O*NET-SOC Code", "Example"])
    tools = _read_table("Tools Used.txt", usecols=["O*NET-SOC Code", "Example"])

    alt_map = _group_top_strings(alt_titles, code_col="O*NET-SOC Code", value_col="Alternate Title", k=6)
    tech_map = _group_top_strings(tech, code_col="O*NET-SOC Code", value_col="Example", k=12)
    tool_map = _group_top_strings(tools, code_col="O*NET-SOC Code", value_col="Example", k=10)

    skills_map: dict[str, list[str]] = {}
    if not skills.empty:
        skills = skills.copy()
        skills["Scale ID"] = skills["Scale ID"].fillna("").astype(str)
        skills = skills[skills["Scale ID"].str.upper().eq("IM")].copy()
        skills["Data Value"] = pd.to_numeric(skills["Data Value"], errors="coerce").fillna(0.0)
        skills = skills.sort_values(["O*NET-SOC Code", "Data Value"], ascending=[True, False])
        for code, group in skills.groupby("O*NET-SOC Code"):
            names = group["Element Name"].astype(str).tolist()
            seen = set()
            top: list[str] = []
            for name in names:
                key = name.lower().strip()
                if not key or key in seen:
                    continue
                seen.add(key)
                top.append(name.strip())
                if len(top) >= 12:
                    break
            skills_map[str(code)] = top

    documents: list[str] = []
    metas: list[dict[str, Any]] = []
    for record in occupations.to_dict(orient="records"):
        code = _clean_text(record.get("O*NET-SOC Code"))
        title = _clean_text(record.get("Title"))
        description = _clean_text(record.get("Description"))
        if not code or not title:
            continue

        alt = alt_map.get(code, [])
        top_skills = skills_map.get(code, [])
        tech_skills = tech_map.get(code, [])
        tool_list = tool_map.get(code, [])

        doc_text = " ".join(
            part
            for part in [
                title,
                " ".join(alt),
                " ".join(top_skills),
                " ".join(tech_skills),
                " ".join(tool_list),
                description,
            ]
            if part
        ).strip()
        if not doc_text:
            continue

        metas.append(
            {
                "code": _ascii_safe(code),
                "title": _ascii_safe(title),
                "description": _ascii_safe(description),
                "alternate_titles": [_ascii_safe(item) for item in alt],
                "top_skills": [_ascii_safe(item) for item in top_skills],
                "technology_skills": [_ascii_safe(item) for item in tech_skills],
                "tools": [_ascii_safe(item) for item in tool_list],
            }
        )
        documents.append(doc_text)

    return documents, metas


@lru_cache(maxsize=1)
def _build_index() -> tuple[TfidfVectorizer, Any, list[dict[str, Any]]]:
    documents, metas = _load_onet_corpus()
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=30000, stop_words="english")
    if not documents:
        return vectorizer, None, []
    matrix = vectorizer.fit_transform(documents)
    return vectorizer, matrix, metas


def retrieve_career_sources(query: str, *, k: int = 4) -> list[dict[str, Any]]:
    """
    Retrieve O*NET occupations relevant to a user's profile text.
    Returns compact metadata for UI evidence cards.
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
        description = meta.get("description") or ""
        snippet = description.strip()
        if len(snippet) > 240:
            snippet = snippet[:237].rstrip() + "..."

        sources.append(
            {
                "title": meta.get("title") or "O*NET Occupation",
                "code": meta.get("code") or "",
                "score": round(score, 4),
                "snippet": snippet,
                "top_skills": (meta.get("top_skills") or [])[:6],
                "technology_skills": (meta.get("technology_skills") or [])[:6],
            }
        )

    # Deduplicate by code/title
    unique: list[dict[str, Any]] = []
    seen = set()
    for item in sources:
        key = (str(item.get("code") or "").strip().lower(), str(item.get("title") or "").strip().lower())
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique[:k]

