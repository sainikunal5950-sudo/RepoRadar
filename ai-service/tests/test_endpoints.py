import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings

client = TestClient(app)
VALID_API_KEY = settings.AI_SERVICE_API_KEY


def test_health_endpoint_unauthenticated():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "reporadar-ai-service"


def test_api_rejection_without_api_key():
    response = client.post(
        "/api/explain/code",
        json={"code": "print('hello')", "file_path": "main.py"},
    )
    assert response.status_code == 401
    assert "Invalid or missing X-API-Key" in response.json()["detail"]


def test_api_rejection_with_invalid_api_key():
    response = client.post(
        "/api/explain/code",
        json={"code": "print('hello')", "file_path": "main.py"},
        headers={"X-API-Key": "wrong-secret-key"},
    )
    assert response.status_code == 401


@patch("app.services.llm_client.llm_client.complete_json", new_callable=AsyncMock)
def test_explain_code_success(mock_llm):
    mock_llm.return_value = {
        "purpose": "Prints a greeting message to stdout.",
        "explanation": "Simple console log output demonstrating string execution.",
        "key_points": ["Uses built-in print function", "Runs synchronously"],
    }

    response = client.post(
        "/api/explain/code",
        json={
            "code": "print('hello world')",
            "file_path": "app/main.py",
            "language": "python",
        },
        headers={"X-API-Key": VALID_API_KEY},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["file_path"] == "app/main.py"
    assert "greeting message" in data["purpose"]
    assert len(data["key_points"]) == 2


@patch("app.services.llm_client.llm_client.complete_json", new_callable=AsyncMock)
def test_suggest_fix_success(mock_llm):
    mock_llm.return_value = {
        "fixed_code": "const secret = process.env.SECRET_KEY;",
        "explanation": "Extracted hardcoded secret into environment variables.",
        "why_it_matters": "Prevents secret credential leakage in source control.",
        "confidence": "high",
    }

    response = client.post(
        "/api/suggest/fix",
        json={
            "issue_id": "issue-123",
            "code_snippet": "const secret = '123456';",
            "file_path": "src/config.ts",
            "line_number": 5,
            "issue_type": "security",
            "severity": "critical",
            "message": "Hardcoded secret detected",
            "language": "typescript",
        },
        headers={"X-API-Key": VALID_API_KEY},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["issue_id"] == "issue-123"
    assert "process.env.SECRET_KEY" in data["fixed_code"]
    assert data["confidence"] == "high"


@patch("app.services.llm_client.llm_client.complete_json", new_callable=AsyncMock)
def test_suggest_fixes_batch_success(mock_llm):
    mock_llm.return_value = {
        "fixed_code": "const safe = true;",
        "explanation": "Remediated issue.",
        "why_it_matters": "Fixes bug.",
        "confidence": "high",
    }

    response = client.post(
        "/api/suggest/fixes/batch",
        json={
            "repository_id": "repo-456",
            "issues": [
                {
                    "code_snippet": "var x = 1;",
                    "file_path": "src/a.ts",
                    "line_number": 1,
                    "issue_type": "bug",
                    "severity": "medium",
                    "message": "Use const instead of var",
                }
            ],
        },
        headers={"X-API-Key": VALID_API_KEY},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_processed"] == 1
    assert len(data["fixes"]) == 1
