"""
Authentication API router for DeciXAI.

Provides register, login, OTP-based passwordless login, and user profile endpoints
with JWT-based authentication.
"""
from __future__ import annotations

import re
import time
import uuid

from fastapi import APIRouter, Header, HTTPException

from models.schemas import RegisterInput, LoginInput, TokenResponse, UserResponse
from services.auth_service import (
    create_user,
    authenticate_user,
    create_token,
    decode_token,
    get_user_by_id,
    get_user_by_email,
)
from routers.loan_application import _send_otp_email

router = APIRouter()

# In-memory OTP store: { email: { otp, expires_at } }
# Keyed by lowercase email. TTL = 10 minutes.
_LOGIN_OTP_STORE: dict[str, dict] = {}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def _get_current_user_id(authorization: str | None, allow_guest: bool = False) -> int:
    """Extract user ID from Authorization header, with optional guest fallback."""
    if not authorization or not authorization.startswith("Bearer "):
        if allow_guest:
            from services.auth_service import get_or_create_guest_user
            return get_or_create_guest_user()
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)

    if payload is None:
        if allow_guest:
            from services.auth_service import get_or_create_guest_user
            return get_or_create_guest_user()
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


@router.post("/tier", response_model=UserResponse)
async def change_tier(body: dict, authorization: str | None = Header(None)):
    """Switch user subscription tier (simulated for product demo)."""
    user_id = _get_current_user_id(authorization)
    tier = body.get("tier", "pro").lower()
    if tier not in ("free", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="Invalid tier")

    from services.auth_service import update_user_tier
    update_user_tier(user_id, tier)
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)


# ---------------------------------------------------------------------------
# OTP-based passwordless login (Forgot Password / Login with OTP)
# ---------------------------------------------------------------------------

@router.post("/send-login-otp")
async def send_login_otp(body: dict):
    """Send a one-time login OTP to the user's registered email."""
    email = (body.get("email") or "").strip().lower()

    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=422, detail="Invalid email address.")

    user = get_user_by_email(email)
    if user is None:
        # Don't leak whether email exists — same message either way
        raise HTTPException(
            status_code=404,
            detail="No account found with this email address. Please register first.",
        )

    otp_code = str(100000 + (uuid.uuid4().int % 900000))
    _LOGIN_OTP_STORE[email] = {
        "otp": otp_code,
        "expires_at": time.time() + 600,  # 10 minutes
    }

    sent = _send_otp_email(
        recipient_email=user["email"],
        otp_code=otp_code,
        applicant_name=user.get("name", "User"),
    )

    if sent:
        return {"success": True, "message": f"OTP sent to {email}. Check your inbox."}
    else:
        return {
            "success": True,
            "message": "OTP generated but email delivery failed. Please retry.",
            "_debug_otp": otp_code,  # Remove in production
        }


@router.post("/verify-login-otp", response_model=TokenResponse)
async def verify_login_otp(body: dict):
    """Verify the OTP and issue a JWT token for passwordless login."""
    email = (body.get("email") or "").strip().lower()
    submitted_otp = str(body.get("otp") or "").strip()

    if not email or not submitted_otp:
        raise HTTPException(status_code=422, detail="Email and OTP are required.")

    entry = _LOGIN_OTP_STORE.get(email)
    if not entry:
        raise HTTPException(status_code=400, detail="No OTP was requested for this email. Please request a new one.")

    if time.time() > entry["expires_at"]:
        _LOGIN_OTP_STORE.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if submitted_otp != entry["otp"]:
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please check your email and try again.")

    # OTP valid — consume it
    _LOGIN_OTP_STORE.pop(email, None)

    user = get_user_by_email(email)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(**user),
    )

