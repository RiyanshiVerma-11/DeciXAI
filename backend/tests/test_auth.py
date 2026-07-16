"""
Authentication API tests for DeciXAI.

Uses unique emails per test run to avoid needing database cleanup,
which sidesteps aiosqlite/sqlite3 locking issues on Windows.
"""
import uuid

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _unique_email():
    """Generate a unique test email to avoid conflicts across runs."""
    return f"test_{uuid.uuid4().hex[:8]}@example.com"


def test_register_and_login():
    """Test full registration, login, and user profile flow."""
    from utils.database import init_db
    init_db()
    
    email = _unique_email()

    # 1. Register a new user
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "name": "Test User",
        "password": "supersecretpassword123",
    })
    assert reg.status_code == 200, reg.text
    data = reg.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == email
    assert data["user"]["name"] == "Test User"
    assert "id" in data["user"]

    token = data["access_token"]

    # 2. Duplicate registration should fail with 409
    dup = client.post("/api/v1/auth/register", json={
        "email": email,
        "name": "Test User",
        "password": "supersecretpassword123",
    })
    assert dup.status_code == 409
    assert dup.json()["detail"] == "An account with this email already exists"

    # 3. Invalid email format should fail
    bad_email = client.post("/api/v1/auth/register", json={
        "email": "invalidemail",
        "name": "Bad",
        "password": "password123",
    })
    assert bad_email.status_code == 422

    # 4. Short password should fail
    bad_pwd = client.post("/api/v1/auth/register", json={
        "email": _unique_email(),
        "name": "Other User",
        "password": "123",
    })
    assert bad_pwd.status_code == 422

    # 5. Login with correct credentials
    login = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "supersecretpassword123",
    })
    assert login.status_code == 200
    login_data = login.json()
    assert "access_token" in login_data
    assert login_data["user"]["name"] == "Test User"

    # 6. Login with wrong password should fail with 401
    bad_login = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "wrongpassword",
    })
    assert bad_login.status_code == 401
    assert bad_login.json()["detail"] == "Invalid email or password"

    # 7. Access /me with valid token
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email
    assert me.json()["name"] == "Test User"

    # 8. Access /me without token should fail
    no_auth = client.get("/api/v1/auth/me")
    assert no_auth.status_code == 401

    # 9. Access /me with bad token should fail
    bad_auth = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer badtoken"})
    assert bad_auth.status_code == 401
