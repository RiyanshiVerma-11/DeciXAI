"""
Simple in-memory rate limiter for DecisionAI Engine.

Uses a sliding-window counter per client IP.
For production at scale, replace with Redis-backed limiting.
"""
from __future__ import annotations

import os
import time
from collections import defaultdict

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

# Maximum requests per window per IP.
RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", 60))
WINDOW_SECONDS = 60


class _SlidingWindowCounter:
    """Per-IP sliding window counter."""

    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        cutoff = now - WINDOW_SECONDS
        # Prune old entries.
        self._hits[key] = [ts for ts in self._hits[key] if ts > cutoff]
        if len(self._hits[key]) >= RATE_LIMIT:
            return False
        self._hits[key].append(now)
        return True

    def remaining(self, key: str) -> int:
        now = time.time()
        cutoff = now - WINDOW_SECONDS
        self._hits[key] = [ts for ts in self._hits[key] if ts > cutoff]
        return max(0, RATE_LIMIT - len(self._hits[key]))


_counter = _SlidingWindowCounter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate-limits requests by client IP using a sliding window.
    Returns 429 when the limit is exceeded.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if RATE_LIMIT <= 0:
            # Rate limiting disabled.
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        if not _counter.is_allowed(client_ip):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT)
        response.headers["X-RateLimit-Remaining"] = str(_counter.remaining(client_ip))
        return response
