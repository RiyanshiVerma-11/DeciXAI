"""
Authentication API router for DeciXAI.

Provides register, login, and user profile endpoints
with JWT-based authentication.
"""
from __future__ import annotations

import re

from fastapi import APIRouter, Header, HTTPException

from models.schemas import RegisterInput, LoginInput, TokenResponse, UserResponse
from services.auth_service import (
    create_user,
    authenticate_user,
    create_token,
    decode_token,
    get_user_by_id,
)

router = APIRouter()

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def _get_current_user_id(authorization: str | None) -> int:
    """Extract user ID from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return int(payload["sub"])


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterInput):
    """Register a new user account."""
    # Validate email format
    if not EMAIL_REGEX.match(body.email):
        raise HTTPException(status_code=422, detail="Invalid email format")

    # Validate password strength
    if len(body.password) < 6:
        raise HTTPException(
            status_code=422, detail="Password must be at least 6 characters"
        )

    # Validate name
    if not body.name or len(body.name.strip()) < 2:
        raise HTTPException(
            status_code=422, detail="Name must be at least 2 characters"
        )

    user = create_user(body.email, body.name, body.password)

    if user is None:
        raise HTTPException(
            status_code=409, detail="An account with this email already exists"
        )

    token = create_token(user["id"], user["email"])

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(**user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginInput):
    """Authenticate and get a JWT token."""
    user = authenticate_user(body.email, body.password)

    if user is None:
        raise HTTPException(
            status_code=401, detail="Invalid email or password"
        )

    token = create_token(user["id"], user["email"])

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(**user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(authorization: str | None = Header(None)):
    """Get the current authenticated user's profile."""
    user_id = _get_current_user_id(authorization)
    user = get_user_by_id(user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(**user)
