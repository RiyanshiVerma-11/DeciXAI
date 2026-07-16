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
    """Create the users table if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
                name        TEXT    NOT NULL,
                password_hash TEXT  NOT NULL,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.commit()
    finally:
        conn.close()


def close_db() -> None:
    """No-op cleanup since context manager automatically closes connections."""
    pass
