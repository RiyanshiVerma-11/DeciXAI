"""
Developer API Keys router for DeciXAI.
"""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from models.schemas import CreateApiKeyInput, ApiKeyResponse, CreatedApiKeyResponse
from routers.auth import _get_current_user_id
from services.apikeys_service import generate_api_key, list_api_keys, revoke_api_key

router = APIRouter()


@router.get("", response_model=list[ApiKeyResponse])
async def get_keys(authorization: str | None = Header(None)):
    """List all developer API keys for the current user."""
    user_id = _get_current_user_id(authorization)
    records = list_api_keys(user_id)
    return [ApiKeyResponse(**r) for r in records]


@router.post("", response_model=CreatedApiKeyResponse)
async def create_key(body: CreateApiKeyInput, authorization: str | None = Header(None)):
    """Generate a new developer API key. The secret key is only returned once."""
    user_id = _get_current_user_id(authorization)
    result = generate_api_key(user_id, body.name)
    return CreatedApiKeyResponse(**result)


@router.delete("/{key_id}")
async def delete_key(key_id: int, authorization: str | None = Header(None)):
    """Revoke an API key."""
    user_id = _get_current_user_id(authorization)
    success = revoke_api_key(user_id, key_id)
    if not success:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"status": "success", "message": "API key revoked"}
