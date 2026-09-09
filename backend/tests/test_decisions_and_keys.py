"""
Tests for Saved Decisions Workspace and Developer API Keys.
"""
import uuid
import pytest
from fastapi.testclient import TestClient

from main import app
from utils.database import init_db

client = TestClient(app)


def _unique_email():
    return f"test_workspace_{uuid.uuid4().hex[:8]}@example.com"


def _register_user():
    init_db()
    email = _unique_email()
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "name": "Workspace Tester",
        "password": "strongpassword123",
    })
    assert reg.status_code == 200
    data = reg.json()
    return data["access_token"], data["user"]


def test_decisions_workspace_crud_and_share():
    token, user = _register_user()
    auth_header = {"Authorization": f"Bearer {token}"}

    # 1. Save a decision
    save_payload = {
        "domain": "career",
        "title": "Senior AI Systems Pivot",
        "notes": "Targeting high-growth startups in Bengaluru",
        "tags": "AI,LLM,Pivot",
        "input_payload": {"cgpa": 8.5, "skills": ["python", "langchain", "vllm"], "interest": "ai engineer"},
        "output_payload": {"probability": 0.88, "score_label": "High Fit", "explanation": "Strong foundation"},
        "score": 88.0,
        "verdict": "High Fit",
    }
    res = client.post("/api/v1/decisions", json=save_payload, headers=auth_header)
    assert res.status_code == 200, res.text
    saved = res.json()
    assert saved["id"] > 0
    assert saved["title"] == "Senior AI Systems Pivot"
    assert saved["domain"] == "career"
    assert saved["share_token"] is not None
    decision_id = saved["id"]
    share_token = saved["share_token"]

    # 2. List saved decisions
    list_res = client.get("/api/v1/decisions", headers=auth_header)
    assert list_res.status_code == 200
    decisions = list_res.json()
    assert len(decisions) >= 1
    assert decisions[0]["title"] == "Senior AI Systems Pivot"

    # 3. Get single decision
    get_res = client.get(f"/api/v1/decisions/{decision_id}", headers=auth_header)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == decision_id

    # 4. Try accessing public report before sharing is enabled -> should fail 404
    pub_res = client.get(f"/api/v1/decisions/public/{share_token}")
    assert pub_res.status_code == 404

    # 5. Enable sharing
    share_res = client.post(f"/api/v1/decisions/{decision_id}/share", json={"is_public": True}, headers=auth_header)
    assert share_res.status_code == 200
    assert share_res.json()["is_public"] is True

    # 6. Now access public report without auth -> should succeed
    pub_ok = client.get(f"/api/v1/decisions/public/{share_token}")
    assert pub_ok.status_code == 200
    pub_data = pub_ok.json()
    assert pub_data["title"] == "Senior AI Systems Pivot"
    assert pub_data["verified"] is True
    assert "DX-" in pub_data["audit_hash"]

    # 7. Delete decision
    del_res = client.delete(f"/api/v1/decisions/{decision_id}", headers=auth_header)
    assert del_res.status_code == 200

    # Verify deleted
    get_del = client.get(f"/api/v1/decisions/{decision_id}", headers=auth_header)
    assert get_del.status_code == 404


def test_api_keys_management_and_usage():
    token, user = _register_user()
    auth_header = {"Authorization": f"Bearer {token}"}

    # 1. Create a new developer API key
    create_res = client.post("/api/v1/keys", json={"name": "Production Service Key"}, headers=auth_header)
    assert create_res.status_code == 200, create_res.text
    key_data = create_res.json()
    assert key_data["id"] > 0
    assert "dx_live_" in key_data["secret_key"]
    raw_key = key_data["secret_key"]
    key_id = key_data["id"]

    # 2. List keys (should contain prefix, but not secret_key)
    list_res = client.get("/api/v1/keys", headers=auth_header)
    assert list_res.status_code == 200
    keys = list_res.json()
    assert any(k["id"] == key_id for k in keys)

    # 3. Call endpoint using Developer API Key in X-API-Key header
    # Let's test with /api/v1/career/evaluate or /api/v1/health
    call_res = client.get("/api/v1/health", headers={"X-API-Key": raw_key})
    assert call_res.status_code == 200

    # 4. Revoke key
    revoke_res = client.delete(f"/api/v1/keys/{key_id}", headers=auth_header)
    assert revoke_res.status_code == 200

    # 5. List keys should be empty or not have key_id
    list_after = client.get("/api/v1/keys", headers=auth_header)
    assert not any(k["id"] == key_id for k in list_after.json())
