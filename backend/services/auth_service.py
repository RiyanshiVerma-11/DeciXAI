"""
Authentication service for DeciXAI.

Handles password hashing with bcrypt, JWT token management,
and user CRUD operations against the SQLite database.
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timezone

import bcrypt
import jwt

from utils.database import get_db

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "decixai-jwt-secret-change-in-production-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72  # 3 days


# ---------------------------------------------------------------------------
# Password utilities
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# ---------------------------------------------------------------------------
# JWT utilities
# ---------------------------------------------------------------------------

def create_token(user_id: int, email: str) -> str:
    """Create a JWT access token for a user."""
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + (JWT_EXPIRY_HOURS * 3600),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Decode and validate a JWT token. Returns payload or None."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ---------------------------------------------------------------------------
# User CRUD (synchronous sqlite3 — fast enough for auth)
# ---------------------------------------------------------------------------

import sqlite3

def create_user(email: str, name: str, password: str) -> dict | None:
    """
    Create a new user. Returns user dict on success, None if email exists.
    """
    password_hashed = hash_password(password)

    try:
        with get_db() as db:
            cursor = db.execute(
                "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
                (email.strip().lower(), name.strip(), password_hashed),
            )
            db.commit()
            user_id = cursor.lastrowid

            return {
                "id": user_id,
                "email": email.strip().lower(),
                "name": name.strip(),
                "tier": "free",
                "credits_used": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
    except sqlite3.IntegrityError:
        # Unique constraint violation — email already exists
        return None


def authenticate_user(email: str, password: str) -> dict | None:
    """
    Authenticate a user by email and password.
    Returns user dict on success, None on failure.
    """
    with get_db() as db:
        cursor = db.execute(
            "SELECT id, email, name, password_hash, created_at, tier, credits_used FROM users WHERE email = ?",
            (email.strip().lower(),),
        )
        row = cursor.fetchone()

    if row is None:
        return None

    if not verify_password(password, row[3]):  # row[3] = password_hash
        return None

    return {
        "id": row[0],
        "email": row[1],
        "name": row[2],
        "created_at": row[4],
        "tier": row[5] if len(row) > 5 and row[5] else "free",
        "credits_used": row[6] if len(row) > 6 and row[6] is not None else 0,
    }


def get_user_by_email(email: str) -> dict | None:
    """Fetch a user by their email address."""
    with get_db() as db:
        cursor = db.execute(
            "SELECT id, email, name, created_at, tier, credits_used FROM users WHERE email = ?",
            (email.strip().lower(),),
        )
        row = cursor.fetchone()

    if row is None:
        return None

    return {
        "id": row[0],
        "email": row[1],
        "name": row[2],
        "created_at": row[3],
        "tier": row[4] if len(row) > 4 and row[4] else "free",
        "credits_used": row[5] if len(row) > 5 and row[5] is not None else 0,
    }


def get_user_by_id(user_id: int) -> dict | None:

    """Fetch a user by their ID."""
    with get_db() as db:
        cursor = db.execute(
            "SELECT id, email, name, created_at, tier, credits_used FROM users WHERE id = ?",
            (user_id,),
        )
        row = cursor.fetchone()

    if row is None:
        return None

    return {
        "id": row[0],
        "email": row[1],
        "name": row[2],
        "created_at": row[3],
        "tier": row[4] if len(row) > 4 and row[4] else "free",
        "credits_used": row[5] if len(row) > 5 and row[5] is not None else 0,
    }


def update_user_tier(user_id: int, tier: str) -> bool:
    """Upgrade or switch user tier (free, pro, enterprise)."""
    with get_db() as db:
        cursor = db.execute("UPDATE users SET tier = ? WHERE id = ?", (tier.lower(), user_id))
        db.commit()
        return cursor.rowcount > 0


def increment_user_credits(user_id: int) -> int:
    """Increment decision analysis credits used for user."""
    with get_db() as db:
        db.execute("UPDATE users SET credits_used = credits_used + 1 WHERE id = ?", (user_id,))
        db.commit()
        cursor = db.execute("SELECT credits_used FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return row[0] if row else 0

