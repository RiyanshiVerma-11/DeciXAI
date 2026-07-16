"""
Security middleware for DecisionAI Engine.

Provides:
- Request ID tracking (X-Request-ID header)
- Request/response timing
- Optional API key authentication
- Input size limiting
"""
from __future__ import annotations

import os
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from utils.app_logging import get_logger

logger = get_logger(__name__)

# Optional API key — if set, every request must include it in the X-API-Key header.
# Leave blank in .env to disable authentication (development mode).
API_KEY = os.getenv("DECIXAI_API_KEY", "").strip()

# Maximum request body size (bytes). Default: 1 MB.
MAX_BODY_SIZE = int(os.getenv("MAX_REQUEST_BODY_BYTES", 1_048_576))

# Paths that bypass authentication.
PUBLIC_PATHS = {"/", "/docs", "/redoc", "/openapi.json", "/api/v1/health"}


class RequestTrackingMiddleware(BaseHTTPMiddleware):
    """
    Adds a unique X-Request-ID to every request/response and logs timing.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        start = time.perf_counter()

        # Attach request_id to request state so services can use it.
        request.state.request_id = request_id

        response = await call_next(request)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-Ms"] = str(elapsed_ms)

        logger.info(
            "request_completed method=%s path=%s status=%s time_ms=%s request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            request_id,
        )
        return response


class APIKeyMiddleware(BaseHTTPMiddleware):
    """
    Optional API key gate. Disabled when DECIXAI_API_KEY is not set.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not API_KEY:
            return await call_next(request)

        if request.url.path in PUBLIC_PATHS or request.method == "OPTIONS":
            return await call_next(request)

        provided_key = (request.headers.get("X-API-Key") or "").strip()
        if provided_key != API_KEY:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API key."},
            )
        return await call_next(request)


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Reject requests with bodies larger than MAX_BODY_SIZE.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=413,
                content={"detail": f"Request body too large. Maximum allowed: {MAX_BODY_SIZE} bytes."},
            )
        return await call_next(request)
