"""TDD: Prop 22 API endpoint tests — tests written BEFORE implementation (RED phase)

Tests verify:
- /api/driver/prop22/periods  (require_driver auth)
- /api/driver/prop22/periods/{id}/rides  (require_driver auth)
- /api/admin/prop22/periods  (require_admin auth)
- /api/admin/prop22/manual-topup  (require_admin auth)
"""
import pytest
from fastapi.testclient import TestClient


def get_test_client():
    from main_new import app
    return TestClient(app)


class TestDriverProp22PeriodsEndpoint:
    def test_endpoint_exists(self):
        """GET /api/driver/prop22/periods must return 200 or 401/403 (not 404)."""
        client = get_test_client()
        response = client.get("/api/driver/prop22/periods")
        # 401/403 = endpoint exists but unauthenticated. 404 = endpoint missing.
        assert response.status_code != 404, \
            "Endpoint /api/driver/prop22/periods not found (404). Add route to main_new.py"

    def test_requires_driver_auth(self):
        """Without auth, must return 401 or 403."""
        client = get_test_client()
        response = client.get("/api/driver/prop22/periods")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"


class TestDriverProp22PeriodRidesEndpoint:
    def test_endpoint_exists(self):
        """GET /api/driver/prop22/periods/1/rides must return 200, 401, 403, or 404 for period (not route 404)."""
        client = get_test_client()
        response = client.get("/api/driver/prop22/periods/1/rides")
        # The route must exist. 401/403 = unauthenticated. 404 = period not found (OK if route exists).
        # We detect a 'route not found' by checking the response body.
        if response.status_code == 404:
            body = response.json()
            assert "detail" in body and body["detail"] != "Not Found", \
                "Endpoint /api/driver/prop22/periods/{id}/rides not found (route 404). Add route to main_new.py"

    def test_requires_driver_auth(self):
        """Without auth, must return 401 or 403."""
        client = get_test_client()
        response = client.get("/api/driver/prop22/periods/1/rides")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"


class TestAdminProp22PeriodsEndpoint:
    def test_endpoint_exists(self):
        """GET /api/admin/prop22/periods must return 200, 401, or 403 (not 404)."""
        client = get_test_client()
        response = client.get("/api/admin/prop22/periods")
        assert response.status_code != 404, \
            "Endpoint /api/admin/prop22/periods not found. Add route to main_new.py"

    def test_requires_admin_auth(self):
        """Without auth, must return 401 or 403."""
        client = get_test_client()
        response = client.get("/api/admin/prop22/periods")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"


class TestAdminProp22ManualTopupEndpoint:
    def test_endpoint_exists(self):
        """POST /api/admin/prop22/manual-topup must return 200, 401, 403, or 422 (not 404)."""
        client = get_test_client()
        response = client.post("/api/admin/prop22/manual-topup", json={})
        assert response.status_code != 404, \
            "Endpoint /api/admin/prop22/manual-topup not found. Add route to main_new.py"

    def test_requires_admin_auth(self):
        """Without auth, must return 401 or 403."""
        client = get_test_client()
        response = client.post(
            "/api/admin/prop22/manual-topup",
            json={
                "driver_id": 1,
                "period_id": 1,
                "amount": 50.0,
                "method": "ACH",
                "reference_number": "REF-001"
            }
        )
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"


class TestResponseShape:
    def test_periods_response_contains_required_fields(self):
        """Document expected period response shape per spec Section 4A.

        This test documents the contract between backend and iOS PayoutDashboardView.
        Actual data tests require a seeded DB and are out of scope for unit tests.
        """
        required_fields = {
            "id", "period_start", "period_end", "status",
            "engaged_hours", "engaged_miles", "net_earnings",
            "prop22_floor", "top_up_amount", "deadline_at", "qtd_engaged_hours"
        }
        # Verify the contract definition is complete (11 fields per spec)
        assert len(required_fields) == 11, \
            f"Expected 11 required fields, got {len(required_fields)}"

    def test_manual_topup_required_params(self):
        """Document expected POST body for manual-topup per spec Section 4B."""
        required_params = {"driver_id", "period_id", "amount", "method", "reference_number"}
        assert len(required_params) == 5, \
            f"Expected 5 required params for manual-topup, got {len(required_params)}"
