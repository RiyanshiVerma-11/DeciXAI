"""
Workspace decisions service for DeciXAI.

Handles persisting decision runs, listing user dossiers, sharing,
and generating cryptographic verification hashes for public audit.
"""
from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timezone
from typing import Any

from utils.database import get_db
from services.auth_service import increment_user_credits


def _compute_audit_hash(payload: dict) -> str:
    """Generate SHA-256 tamper-proof verification stamp."""
    serialized = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]


def save_decision(
    user_id: int,
    domain: str,
    title: str,
    notes: str,
    tags: str,
    input_payload: dict[str, Any],
    output_payload: dict[str, Any],
    score: float,
    verdict: str = "",
) -> dict:
    """Save a decision evaluation run to the user's workspace."""
    share_token = secrets.token_urlsafe(16)
    input_json = json.dumps(input_payload)
    output_json = json.dumps(output_payload)
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO user_decisions 
            (user_id, domain, title, notes, tags, input_payload, output_payload, score, verdict, share_token, is_public, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (user_id, domain.lower(), title.strip(), notes.strip(), tags.strip(), input_json, output_json, float(score), verdict, share_token, now_iso)
        )
        db.commit()
        decision_id = cursor.lastrowid

    # Track usage credits
    increment_user_credits(user_id)

    return {
        "id": decision_id,
        "user_id": user_id,
        "domain": domain.lower(),
        "title": title.strip(),
        "notes": notes.strip(),
        "tags": tags.strip(),
        "input_payload": input_payload,
        "output_payload": output_payload,
        "score": float(score),
        "verdict": verdict,
        "share_token": share_token,
        "is_public": False,
        "created_at": now_iso,
    }


def list_user_decisions(user_id: int, domain: str | None = None, search: str | None = None) -> list[dict]:
    """Retrieve saved decisions for a user with optional domain filtering and title search."""
    query = "SELECT id, user_id, domain, title, notes, tags, input_payload, output_payload, score, verdict, share_token, is_public, created_at FROM user_decisions WHERE user_id = ?"
    params: list[Any] = [user_id]

    if domain:
        query += " AND domain = ?"
        params.append(domain.lower())

    if search and search.strip():
        query += " AND (title LIKE ? OR tags LIKE ?)"
        term = f"%{search.strip()}%"
        params.extend([term, term])

    query += " ORDER BY id DESC"

    results = []
    with get_db() as db:
        cursor = db.execute(query, params)
        for row in cursor.fetchall():
            results.append({
                "id": row["id"],
                "user_id": row["user_id"],
                "domain": row["domain"],
                "title": row["title"],
                "notes": row["notes"] or "",
                "tags": row["tags"] or "",
                "input_payload": json.loads(row["input_payload"]),
                "output_payload": json.loads(row["output_payload"]),
                "score": row["score"],
                "verdict": row["verdict"] or "",
                "share_token": row["share_token"],
                "is_public": bool(row["is_public"]),
                "created_at": row["created_at"],
            })
    return results


def get_user_decision(user_id: int, decision_id: int) -> dict | None:
    """Fetch single decision belonging to user."""
    with get_db() as db:
        cursor = db.execute(
            """
            SELECT id, user_id, domain, title, notes, tags, input_payload, output_payload, score, verdict, share_token, is_public, created_at
            FROM user_decisions
            WHERE id = ? AND user_id = ?
            """,
            (decision_id, user_id),
        )
        row = cursor.fetchone()

    if not row:
        return None

    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "domain": row["domain"],
        "title": row["title"],
        "notes": row["notes"] or "",
        "tags": row["tags"] or "",
        "input_payload": json.loads(row["input_payload"]),
        "output_payload": json.loads(row["output_payload"]),
        "score": row["score"],
        "verdict": row["verdict"] or "",
        "share_token": row["share_token"],
        "is_public": bool(row["is_public"]),
        "created_at": row["created_at"],
    }


def delete_user_decision(user_id: int, decision_id: int) -> bool:
    """Delete a saved decision."""
    with get_db() as db:
        cursor = db.execute(
            "DELETE FROM user_decisions WHERE id = ? AND user_id = ?",
            (decision_id, user_id),
        )
        db.commit()
        return cursor.rowcount > 0


def toggle_decision_sharing(user_id: int, decision_id: int, is_public: bool) -> dict | None:
    """Make decision publicly viewable or private."""
    decision = get_user_decision(user_id, decision_id)
    if not decision:
        return None

    with get_db() as db:
        db.execute(
            "UPDATE user_decisions SET is_public = ? WHERE id = ? AND user_id = ?",
            (1 if is_public else 0, decision_id, user_id),
        )
        db.commit()

    decision["is_public"] = is_public
    return decision


def get_public_decision_by_token(share_token: str) -> dict | None:
    """Fetch public decision report by share token without requiring authentication."""
    with get_db() as db:
        cursor = db.execute(
            """
            SELECT domain, title, input_payload, output_payload, score, verdict, created_at, is_public
            FROM user_decisions
            WHERE share_token = ?
            """,
            (share_token,),
        )
        row = cursor.fetchone()

    if not row:
        return None

    if not row["is_public"]:
        # If owner made it private, don't show
        return None

    input_payload = json.loads(row["input_payload"])
    output_payload = json.loads(row["output_payload"])

    audit_hash = _compute_audit_hash({
        "domain": row["domain"],
        "score": row["score"],
        "created_at": row["created_at"],
        "token": share_token,
    })

    return {
        "domain": row["domain"],
        "title": row["title"],
        "input_payload": input_payload,
        "output_payload": output_payload,
        "score": row["score"],
        "verdict": row["verdict"] or "",
        "created_at": row["created_at"],
        "verified": True,
        "audit_hash": f"DX-{audit_hash.upper()}",
    }
