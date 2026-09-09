"""
Developer API Keys service for DeciXAI.

Allows users to generate, manage, and revoke programmatic API access tokens
for integrating DeciXAI evaluation models into external applications.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone

from utils.database import get_db


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def generate_api_key(user_id: int, name: str, rate_limit: int = 100) -> dict:
    """Generate a new developer API key for the user."""
    raw_secret = f"dx_live_{secrets.token_hex(16)}"
    key_hash = _hash_key(raw_secret)
    prefix = f"{raw_secret[:12]}...{raw_secret[-4:]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO api_keys (user_id, name, key_hash, prefix, rate_limit, created_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            """,
            (user_id, name.strip(), key_hash, prefix, rate_limit, now_iso),
        )
        db.commit()
        key_id = cursor.lastrowid

    return {
        "id": key_id,
        "name": name.strip(),
        "prefix": prefix,
        "secret_key": raw_secret,  # Only shown once
        "rate_limit": rate_limit,
        "created_at": now_iso,
        "last_used_at": None,
        "is_active": True,
    }


def list_api_keys(user_id: int) -> list[dict]:
    """List all API keys belonging to the user."""
    keys = []
    with get_db() as db:
        cursor = db.execute(
            """
            SELECT id, name, prefix, rate_limit, created_at, last_used_at, is_active
            FROM api_keys
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user_id,),
        )
        for row in cursor.fetchall():
            keys.append({
                "id": row["id"],
                "name": row["name"],
                "prefix": row["prefix"],
                "rate_limit": row["rate_limit"],
                "created_at": row["created_at"],
                "last_used_at": row["last_used_at"],
                "is_active": bool(row["is_active"]),
            })
    return keys


def revoke_api_key(user_id: int, key_id: int) -> bool:
    """Permanently deactivate or delete an API key."""
    with get_db() as db:
        cursor = db.execute(
            "DELETE FROM api_keys WHERE id = ? AND user_id = ?",
            (key_id, user_id),
        )
        db.commit()
        return cursor.rowcount > 0


def verify_developer_api_key(key_str: str) -> dict | None:
    """Verify an incoming API key against stored active hashes."""
    key_hash = _hash_key(key_str)
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as db:
        cursor = db.execute(
            """
            SELECT id, user_id, name, rate_limit
            FROM api_keys
            WHERE key_hash = ? AND is_active = 1
            """,
            (key_hash,),
        )
        row = cursor.fetchone()

        if not row:
            return None

        # Update last_used_at
        db.execute("UPDATE api_keys SET last_used_at = ? WHERE id = ?", (now_iso, row["id"]))
        db.commit()

        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "name": row["name"],
            "rate_limit": row["rate_limit"],
        }
