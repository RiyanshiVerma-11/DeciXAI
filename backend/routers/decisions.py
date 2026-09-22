"""
Decisions router for user workspaces, saved decision dossiers, and public reports.
"""
from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Header, HTTPException, Query

from models.schemas import (
    SaveDecisionInput,
    UpdateDecisionInput,
    SavedDecisionResponse,
    PublicDecisionResponse,
)
from routers.auth import _get_current_user_id
from services.decisions_service import (
    save_decision,
    list_user_decisions,
    get_user_decision,
    delete_user_decision,
    toggle_decision_sharing,
    get_public_decision_by_token,
)

router = APIRouter()


@router.post("", response_model=SavedDecisionResponse)
async def create_saved_decision(
    body: SaveDecisionInput,
    authorization: str | None = Header(None),
):
    """Save a decision evaluation run to the user's workspace."""
    user_id = _get_current_user_id(authorization, allow_guest=True)
    result = save_decision(
        user_id=user_id,
        domain=body.domain,
        title=body.title,
        notes=body.notes,
        tags=body.tags,
        input_payload=body.input_payload,
        output_payload=body.output_payload,
        score=body.score,
        verdict=body.verdict,
    )
    return SavedDecisionResponse(**result)


@router.get("", response_model=list[SavedDecisionResponse])
async def get_saved_decisions(
    domain: str | None = Query(None),
    search: str | None = Query(None),
    authorization: str | None = Header(None),
):
    """List saved decisions for the authenticated user."""
    user_id = _get_current_user_id(authorization, allow_guest=True)
    records = list_user_decisions(user_id, domain=domain, search=search)
    return [SavedDecisionResponse(**r) for r in records]


@router.get("/public/{share_token}", response_model=PublicDecisionResponse)
async def get_public_report(share_token: str):
    """Retrieve an official, verified read-only public decision report."""
    report = get_public_decision_by_token(share_token)
    if not report:
        raise HTTPException(status_code=404, detail="Decision report not found or sharing has been disabled")
    return PublicDecisionResponse(**report)


@router.get("/{decision_id}", response_model=SavedDecisionResponse)
async def get_single_decision(
    decision_id: int,
    authorization: str | None = Header(None),
):
    """Fetch details of a single saved decision."""
    user_id = _get_current_user_id(authorization, allow_guest=True)
    record = get_user_decision(user_id, decision_id)
    if not record:
        raise HTTPException(status_code=404, detail="Decision not found")
    return SavedDecisionResponse(**record)


@router.delete("/{decision_id}")
async def remove_decision(
    decision_id: int,
    authorization: str | None = Header(None),
):
    """Delete a saved decision from workspace."""
    user_id = _get_current_user_id(authorization, allow_guest=True)
    success = delete_user_decision(user_id, decision_id)
    if not success:
        raise HTTPException(status_code=404, detail="Decision not found")
    return {"status": "success", "message": "Decision deleted successfully"}


@router.post("/{decision_id}/share", response_model=SavedDecisionResponse)
async def share_decision(
    decision_id: int,
    body: dict,
    authorization: str | None = Header(None),
):
    """Toggle public sharing status of a decision report."""
    user_id = _get_current_user_id(authorization, allow_guest=True)
    is_public = bool(body.get("is_public", True))
    updated = toggle_decision_sharing(user_id, decision_id, is_public)
    if not updated:
        raise HTTPException(status_code=404, detail="Decision not found")
    return SavedDecisionResponse(**updated)
