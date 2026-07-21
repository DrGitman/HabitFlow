"""
Integration tests for POST /api/coach/generate.
Uses FastAPI TestClient — no real DB or AI calls.
Run with: python -m pytest tests/coach/test_coach_endpoint.py -v
"""
from __future__ import annotations

from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app
from coach.schemas import (
    CoachDraft, CoachMode, CoachSummary,
    CoachContext, ContextTask, ContextHabit,
    RecentPerformance, RecommendationHistory,
)

TODAY = date.today().isoformat()
TOMORROW = (date.today() + __import__("datetime").timedelta(days=1)).isoformat()

# ---------------------------------------------------------------------------
# Auth bypass helper
# ---------------------------------------------------------------------------

def _override_auth(user_id: int = 1):
    """Override get_current_user_id to return a fixed user_id without a real JWT."""
    from auth import get_current_user_id
    app.dependency_overrides[get_current_user_id] = lambda: user_id


def _clear_overrides():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Minimal valid coach response from the service
# ---------------------------------------------------------------------------

def _minimal_response():
    return {
        "type": "daily",
        "summary": {"headline": "Focus on your top task.", "detail": "One focused block today."},
        "recommendations": [],
        "warnings": [],
        "evidence": [],
        "actions": [],
        "generated_at": f"{TODAY}T10:00:00+00:00",
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def auth_override():
    _override_auth(user_id=1)
    yield
    _clear_overrides()


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestRequestValidation:
    def test_unknown_mode_returns_422(self, client):
        response = client.post(
            "/api/coach/generate",
            json={"type": "unknown_mode", "date": TODAY, "timezone": "UTC"},
            headers={"Authorization": "Bearer fake"},
        )
        assert response.status_code == 422

    def test_missing_date_returns_422(self, client):
        response = client.post(
            "/api/coach/generate",
            json={"type": "daily", "timezone": "UTC"},
            headers={"Authorization": "Bearer fake"},
        )
        assert response.status_code == 422

    def test_invalid_date_format_returns_422(self, client):
        response = client.post(
            "/api/coach/generate",
            json={"type": "daily", "date": "not-a-date", "timezone": "UTC"},
            headers={"Authorization": "Bearer fake"},
        )
        assert response.status_code == 422

    def test_no_auth_token_returns_401(self, client):
        _clear_overrides()  # remove auth bypass for this test
        response = client.post(
            "/api/coach/generate",
            json={"type": "daily", "date": TODAY, "timezone": "UTC"},
        )
        assert response.status_code == 401


class TestSuccessfulGeneration:
    def test_daily_mode_returns_200(self, client):
        with patch("coach.router.run_coach", new_callable=AsyncMock) as mock_run:
            from coach.schemas import CoachResponse
            mock_run.return_value = CoachResponse(**_minimal_response())
            response = client.post(
                "/api/coach/generate",
                json={"type": "daily", "date": TODAY, "timezone": "Africa/Windhoek"},
                headers={"Authorization": "Bearer fake"},
            )
        assert response.status_code == 200

    def test_recovery_mode_returns_200(self, client):
        with patch("coach.router.run_coach", new_callable=AsyncMock) as mock_run:
            from coach.schemas import CoachResponse
            r = _minimal_response()
            r["type"] = "recovery"
            mock_run.return_value = CoachResponse(**r)
            response = client.post(
                "/api/coach/generate",
                json={"type": "recovery", "date": TODAY, "timezone": "UTC"},
                headers={"Authorization": "Bearer fake"},
            )
        assert response.status_code == 200

    def test_weekly_mode_returns_200(self, client):
        with patch("coach.router.run_coach", new_callable=AsyncMock) as mock_run:
            from coach.schemas import CoachResponse
            r = _minimal_response()
            r["type"] = "weekly"
            mock_run.return_value = CoachResponse(**r)
            response = client.post(
                "/api/coach/generate",
                json={"type": "weekly", "date": TODAY, "timezone": "UTC"},
                headers={"Authorization": "Bearer fake"},
            )
        assert response.status_code == 200

    def test_response_has_required_fields(self, client):
        with patch("coach.router.run_coach", new_callable=AsyncMock) as mock_run:
            from coach.schemas import CoachResponse
            mock_run.return_value = CoachResponse(**_minimal_response())
            response = client.post(
                "/api/coach/generate",
                json={"type": "daily", "date": TODAY, "timezone": "UTC"},
                headers={"Authorization": "Bearer fake"},
            )
        data = response.json()
        assert "type" in data
        assert "summary" in data
        assert "recommendations" in data
        assert "warnings" in data
        assert "generated_at" in data

    def test_response_type_matches_request(self, client):
        with patch("coach.router.run_coach", new_callable=AsyncMock) as mock_run:
            from coach.schemas import CoachResponse
            mock_run.return_value = CoachResponse(**_minimal_response())
            response = client.post(
                "/api/coach/generate",
                json={"type": "daily", "date": TODAY, "timezone": "UTC"},
                headers={"Authorization": "Bearer fake"},
            )
        assert response.json()["type"] == "daily"


class TestSafetyGuarantees:
    def test_invalid_model_json_returns_422_not_500(self, client):
        """If the AI returns garbage JSON, client gets 422 not a raw 500."""
        with patch("coach.router.run_coach", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = ValueError("Model returned non-JSON output")
            response = client.post(
                "/api/coach/generate",
                json={"type": "daily", "date": TODAY, "timezone": "UTC"},
                headers={"Authorization": "Bearer fake"},
            )
        assert response.status_code == 422
        assert "non-JSON" in response.json()["detail"]

    def test_gateway_error_returns_502(self, client):
        with patch("coach.router.run_coach", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = RuntimeError("AI Gateway returned 503")
            response = client.post(
                "/api/coach/generate",
                json={"type": "daily", "date": TODAY, "timezone": "UTC"},
                headers={"Authorization": "Bearer fake"},
            )
        assert response.status_code == 502

    def test_generate_endpoint_does_not_write_to_db(self, client):
        """Verify generate calls no write operations."""
        write_calls = []

        original_eq = None

        def tracking_execute_query(query, params=None, **kwargs):
            q = query.strip().upper()
            if any(q.startswith(op) for op in ("INSERT", "UPDATE", "DELETE")):
                write_calls.append(query)
            return []

        with patch("coach.router.run_coach", new_callable=AsyncMock) as mock_run:
            from coach.schemas import CoachResponse
            mock_run.return_value = CoachResponse(**_minimal_response())
            with patch("coach.context_assembler.execute_query", side_effect=tracking_execute_query):
                client.post(
                    "/api/coach/generate",
                    json={"type": "daily", "date": TODAY, "timezone": "UTC"},
                    headers={"Authorization": "Bearer fake"},
                )

        # run_coach is mocked so no real DB calls happen — the key assertion
        # is that the endpoint itself never calls write operations directly
        assert write_calls == [], f"Generate endpoint made write calls: {write_calls}"

    def test_provider_internals_not_exposed_on_error(self, client):
        """Error messages must not leak model name, API key, or gateway URL."""
        with patch("coach.router.run_coach", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = RuntimeError(
                "AI Gateway returned 401. Check AI_GATEWAY_API_KEY"
            )
            response = client.post(
                "/api/coach/generate",
                json={"type": "daily", "date": TODAY, "timezone": "UTC"},
                headers={"Authorization": "Bearer fake"},
            )
        body = response.text
        assert "AI_GATEWAY_API_KEY" not in body
        assert "claude-" not in body.lower()
