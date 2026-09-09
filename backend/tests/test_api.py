import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_health_check():
    """Test the new health check endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "uptime_seconds" in data
    assert "models" in data
    assert "career" in data["models"]

def test_root_endpoint():
    """Test the root endpoint for backwards compatibility/info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data

def test_api_key_auth_enforcement(monkeypatch):
    """Test that API Key middleware blocks unauthorized requests when configured."""
    monkeypatch.setattr("middleware.security.API_KEY", "test-secret-key")
    
    # Root and health should bypass auth
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    # Without API key, career parse should fail
    response = client.post("/api/v1/career/parse", json={"text": "I want to be a data scientist"})
    assert response.status_code == 401
    
    # With wrong API key, should fail
    response = client.post(
        "/api/v1/career/parse", 
        json={"text": "I want to be a data scientist"},
        headers={"X-API-Key": "wrong-key"}
    )
    assert response.status_code == 401

    # With correct API key, should pass (or return 200/400 depending on actual service behavior)
    response = client.post(
        "/api/v1/career/parse", 
        json={"text": "I want to be a data scientist"},
        headers={"X-API-Key": "test-secret-key"}
    )
    assert response.status_code in (200, 422)

def test_cors_headers():
    """Test that CORS headers are appropriately applied."""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code == 200
    # Depending on how CORSMiddleware is set up, verify headers:
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"

def test_rate_limiter(monkeypatch):
    """Test that the sliding window rate limiter kicks in."""
    from middleware.rate_limiter import _counter
    _counter._hits.clear()
    # Temporarily set limit to 2
    monkeypatch.setattr("middleware.rate_limiter.RATE_LIMIT", 2)
    
    # 1st request
    r1 = client.get("/api/v1/health")
    assert r1.status_code == 200
    
    # 2nd request
    r2 = client.get("/api/v1/health")
    assert r2.status_code == 200
    
    # 3rd request should hit limit
    r3 = client.get("/api/v1/health")
    assert r3.status_code == 429
    assert r3.json()["detail"] == "Too many requests. Please slow down."


def test_resume_upload_pdf():
    """Test resume upload endpoint with a generated PDF byte stream."""
    import io
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer)
    p.drawString(100, 750, "Jane Doe - Full Stack AI Developer")
    p.drawString(100, 730, "Education: B.Tech Computer Science, CGPA 8.9")
    p.drawString(100, 710, "Skills: Python, FastAPI, React, Docker, SQL, Machine Learning")
    p.drawString(100, 690, "Experience: Built scalable inference backend handling 50k requests/day")
    p.drawString(100, 670, "Projects: Autonomous RAG Copilot with 40% accuracy improvement")
    p.drawString(100, 650, "Certifications: AWS Certified Machine Learning Specialty")
    p.showPage()
    p.save()

    pdf_bytes = buffer.getvalue()
    files = {"file": ("test_resume.pdf", pdf_bytes, "application/pdf")}
    response = client.post("/api/v1/career/upload-resume", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "ats_audit" in data
    assert "ats_score" in data["ats_audit"]
    assert data["ats_audit"]["ats_score"] > 0
    assert "parsed_profile" in data
    assert "decision" in data
    assert "decision" in data["decision"]


