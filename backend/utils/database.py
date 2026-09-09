"""
SQLite database setup for DeciXAI authentication.

Uses standard synchronous sqlite3 to avoid aiosqlite thread-locking
issues on Windows. Auth queries are fast (< 5ms) so async provides
no real benefit here.
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager

import sys

# Dynamic DB Path to isolate test runs from dev/prod database
IS_TESTING = "pytest" in sys.modules or any("pytest" in arg for arg in sys.argv)
DB_FILENAME = "decixai_auth_test.db" if IS_TESTING else "decixai_auth.db"
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), DB_FILENAME)


@contextmanager
def get_db():
    """Context manager that yields a database connection and closes it when done."""
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    """Create tables if they don't exist and run non-destructive migrations."""
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
                name          TEXT    NOT NULL,
                password_hash TEXT    NOT NULL,
                tier          TEXT    NOT NULL DEFAULT 'free',
                credits_used  INTEGER NOT NULL DEFAULT 0,
                created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # Migration helper for existing users table
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        existing_cols = [row[1] for row in cursor.fetchall()]
        if "tier" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN tier TEXT NOT NULL DEFAULT 'free'")
        if "credits_used" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN credits_used INTEGER NOT NULL DEFAULT 0")

        # Table for saved decisions (Workspaces/Dossiers)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_decisions (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id        INTEGER NOT NULL,
                domain         TEXT    NOT NULL,
                title          TEXT    NOT NULL,
                notes          TEXT    DEFAULT '',
                tags           TEXT    DEFAULT '',
                input_payload  TEXT    NOT NULL,
                output_payload TEXT    NOT NULL,
                score          REAL    NOT NULL,
                verdict        TEXT    DEFAULT '',
                share_token    TEXT    UNIQUE,
                is_public      INTEGER DEFAULT 0,
                created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # Table for user-generated developer API keys
        conn.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL,
                name         TEXT    NOT NULL,
                key_hash     TEXT    NOT NULL UNIQUE,
                prefix       TEXT    NOT NULL,
                rate_limit   INTEGER NOT NULL DEFAULT 100,
                last_used_at TEXT,
                created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
                is_active    INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        conn.execute("PRAGMA journal_mode=WAL;")
        conn.commit()
    finally:
        conn.close()


def close_db() -> None:
    """No-op cleanup since context manager automatically closes connections."""
    pass
