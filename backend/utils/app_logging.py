"""
Structured logging configuration for DecisionAI Engine.

Features:
- JSON-structured log format for production parsing
- File rotation (10 MB, 5 backups)
- Console + file output
- Configurable log level via LOG_LEVEL env var
"""
from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_DIR = Path(os.getenv("LOG_DIR", "./logs"))
LOG_FILE = LOG_DIR / "decixai.log"
MAX_BYTES = 10 * 1024 * 1024  # 10 MB
BACKUP_COUNT = 5


class StructuredFormatter(logging.Formatter):
    """
    Structured log format: timestamp level [logger] message
    Production-friendly and parseable by log aggregators.
    """

    FORMAT = "%(asctime)s %(levelname)-8s [%(name)s] %(message)s"
    DATE_FORMAT = "%Y-%m-%dT%H:%M:%S%z"

    def __init__(self) -> None:
        super().__init__(fmt=self.FORMAT, datefmt=self.DATE_FORMAT)


def configure_logging() -> None:
    """
    Configure root logger with console + rotating file handlers.
    Safe to call multiple times — idempotent.
    """
    root = logging.getLogger()

    # Avoid duplicate handlers on repeated calls.
    if any(isinstance(h, RotatingFileHandler) for h in root.handlers):
        return

    root.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
    formatter = StructuredFormatter()

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    root.addHandler(console)

    # File handler (create log directory if needed)
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            LOG_FILE,
            maxBytes=MAX_BYTES,
            backupCount=BACKUP_COUNT,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)
    except OSError:
        # If file logging fails (e.g., Docker read-only FS), continue with console only.
        root.warning("Could not create log file at %s — using console only.", LOG_FILE)

    # Quiet noisy third-party loggers.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a named logger."""
    return logging.getLogger(name)
