"""Tests for insurance REST API routes and webhook/API key management."""
import pytest
import uuid
import secrets
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from fastapi import FastAPI
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from models import Base
# Import all insurance models so their tables register in Base.metadata
import insurance.models  # noqa: F401
from insurance.models import InsuranceEvent, InsuranceWebhookConfig, InsuranceApiKey
from insurance.auth import hash_api_key
from database import get_db
from insurance.routes import router as insurance_router

# Single shared in-memory SQLite engine with StaticPool so all connections
# see the same in-memory database.
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(test_engine)

TestSession = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


test_app = FastAPI()
test_app.include_router(insurance_router)
test_app.dependency_overrides[get_db] = override_get_db
client = TestClient(test_app)


@pytest.fixture(autouse=True)
def clean_db():
    """Delete all rows from insurance tables between tests (avoids DROP/CREATE FK issues)."""
    db = TestSession()
    db.execute(text("DELETE FROM insurance_events"))
    db.execute(text("DELETE FROM insurance_webhook_configs"))
    db.execute(text("DELETE FROM insurance_api_keys"))
    db.commit()
    db.close()
    yield


@pytest.fixture
def api_key_header():
    raw_key = f"ins_test_{secrets.token_hex(16)}"
    db = TestSession()
    db.add(InsuranceApiKey(
        provider_name="TestProvider",
        api_key_hash=hash_api_key(raw_key),
        is_active=True,
    ))
    db.commit()
    db.close()
    return {"X-Insurance-API-Key": raw_key}


@pytest.fixture
def seed_events():
    db = TestSession()
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()
    db.add_all([
        InsuranceEvent(
            driver_id=1,
            trip_type="rideshare",
            trip_id=100,
            session_id=session_id,
            period=2,
            event_type="period_start",
            timestamp=now - timedelta(minutes=10),
            latitude=40.71,
            longitude=-74.00,
        ),
        InsuranceEvent(
            driver_id=1,
            trip_type="rideshare",
            trip_id=100,
            session_id=session_id,
            period=2,
            event_type="period_end",
            timestamp=now - timedelta(minutes=5),
            latitude=40.72,
            longitude=-74.00,
            segment_miles=0.5,
            segment_duration_seconds=300,
            odometer_miles=0.5,
        ),
    ])
    db.commit()
    db.close()
    return session_id


class TestTripEvents:
    def test_get_trip_events(self, api_key_header, seed_events):
        resp = client.get("/api/insurance/trips/rideshare/100/events", headers=api_key_header)
        assert resp.status_code == 200
        data = resp.json()
        assert "events" in data
        assert len(data["events"]) == 2

    def test_trip_events_returns_correct_fields(self, api_key_header, seed_events):
        resp = client.get("/api/insurance/trips/rideshare/100/events", headers=api_key_header)
        assert resp.status_code == 200
        event = resp.json()["events"][0]
        for field in ["id", "driver_id", "trip_type", "trip_id", "event_type", "timestamp"]:
            assert field in event

    def test_trip_events_empty_for_unknown_trip(self, api_key_header):
        resp = client.get("/api/insurance/trips/rideshare/9999/events", headers=api_key_header)
        assert resp.status_code == 200
        assert resp.json()["events"] == []

    def test_no_auth_returns_422(self):
        resp = client.get("/api/insurance/trips/rideshare/100/events")
        assert resp.status_code == 422

    def test_bad_key_returns_401(self):
        resp = client.get(
            "/api/insurance/trips/rideshare/100/events",
            headers={"X-Insurance-API-Key": "wrong_key"},
        )
        assert resp.status_code == 401

    def test_trip_type_filter_works(self, api_key_header, seed_events):
        resp = client.get("/api/insurance/trips/delivery/100/events", headers=api_key_header)
        assert resp.status_code == 200
        assert resp.json()["events"] == []


class TestDriverEvents:
    def test_get_driver_events(self, api_key_header, seed_events):
        resp = client.get("/api/insurance/drivers/1/events", headers=api_key_header)
        assert resp.status_code == 200
        data = resp.json()
        assert "events" in data
        assert len(data["events"]) == 2

    def test_driver_events_no_results_for_unknown_driver(self, api_key_header):
        resp = client.get("/api/insurance/drivers/9999/events", headers=api_key_header)
        assert resp.status_code == 200
        assert resp.json()["events"] == []

    def test_driver_events_from_date_filter(self, api_key_header, seed_events):
        future = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        resp = client.get(
            "/api/insurance/drivers/1/events",
            headers=api_key_header,
            params={"from_date": future},
        )
        assert resp.status_code == 200
        assert resp.json()["events"] == []

    def test_driver_events_to_date_filter(self, api_key_header, seed_events):
        past = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        resp = client.get(
            "/api/insurance/drivers/1/events",
            headers=api_key_header,
            params={"to_date": past},
        )
        assert resp.status_code == 200
        assert resp.json()["events"] == []

    def test_driver_events_trip_type_filter(self, api_key_header, seed_events):
        resp = client.get(
            "/api/insurance/drivers/1/events",
            headers=api_key_header,
            params={"trip_type": "delivery"},
        )
        assert resp.status_code == 200
        assert resp.json()["events"] == []

    def test_bad_key_returns_401(self):
        resp = client.get(
            "/api/insurance/drivers/1/events",
            headers={"X-Insurance-API-Key": "bad"},
        )
        assert resp.status_code == 401


class TestDriverSummary:
    def test_get_driver_summary(self, api_key_header, seed_events):
        resp = client.get("/api/insurance/drivers/1/summary", headers=api_key_header)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_trips"] >= 1
        assert data["total_miles"] >= 0

    def test_summary_structure(self, api_key_header, seed_events):
        resp = client.get("/api/insurance/drivers/1/summary", headers=api_key_header)
        assert resp.status_code == 200
        data = resp.json()
        for key in ["total_trips", "total_miles", "total_seconds", "time_by_period"]:
            assert key in data

    def test_summary_no_events_returns_zeros(self, api_key_header):
        resp = client.get("/api/insurance/drivers/9999/summary", headers=api_key_header)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_trips"] == 0
        assert data["total_miles"] == 0.0
        assert data["total_seconds"] == 0

    def test_bad_key_returns_401(self):
        resp = client.get(
            "/api/insurance/drivers/1/summary",
            headers={"X-Insurance-API-Key": "bad"},
        )
        assert resp.status_code == 401

    def test_summary_time_by_period_is_dict(self, api_key_header, seed_events):
        resp = client.get("/api/insurance/drivers/1/summary", headers=api_key_header)
        assert resp.status_code == 200
        assert isinstance(resp.json()["time_by_period"], dict)


class TestPlatformSummary:
    def test_get_platform_summary(self, api_key_header, seed_events):
        resp = client.get("/api/insurance/summary", headers=api_key_header)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_trips" in data
        assert "total_miles" in data
        assert "total_seconds" in data

    def test_platform_summary_bad_key(self):
        resp = client.get(
            "/api/insurance/summary",
            headers={"X-Insurance-API-Key": "bad"},
        )
        assert resp.status_code == 401


class TestWebhookManagement:
    def test_create_webhook(self, api_key_header):
        resp = client.post(
            "/api/insurance/webhooks",
            json={
                "provider_name": "ABI Insurance",
                "callback_url": "https://abi.example.com/webhook",
                "secret_key": "my-secret",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["provider_name"] == "ABI Insurance"
        assert data["callback_url"] == "https://abi.example.com/webhook"
        assert "id" in data

    def test_create_webhook_without_secret(self, api_key_header):
        resp = client.post(
            "/api/insurance/webhooks",
            json={
                "provider_name": "NoSecret Inc",
                "callback_url": "https://example.com/hook",
            },
        )
        assert resp.status_code == 201

    def test_list_webhooks(self):
        client.post(
            "/api/insurance/webhooks",
            json={"provider_name": "P1", "callback_url": "https://a.example.com/wh"},
        )
        client.post(
            "/api/insurance/webhooks",
            json={"provider_name": "P2", "callback_url": "https://b.example.com/wh"},
        )
        resp = client.get("/api/insurance/webhooks")
        assert resp.status_code == 200
        data = resp.json()
        assert "webhooks" in data
        assert len(data["webhooks"]) >= 2

    def test_update_webhook(self):
        create_resp = client.post(
            "/api/insurance/webhooks",
            json={"provider_name": "Old Name", "callback_url": "https://old.example.com/wh"},
        )
        webhook_id = create_resp.json()["id"]
        resp = client.put(
            f"/api/insurance/webhooks/{webhook_id}",
            json={"provider_name": "New Name", "callback_url": "https://new.example.com/wh"},
        )
        assert resp.status_code == 200
        assert resp.json()["provider_name"] == "New Name"

    def test_update_nonexistent_webhook_returns_404(self):
        resp = client.put(
            "/api/insurance/webhooks/nonexistent-id",
            json={"provider_name": "X", "callback_url": "https://x.example.com/wh"},
        )
        assert resp.status_code == 404

    def test_delete_webhook(self):
        create_resp = client.post(
            "/api/insurance/webhooks",
            json={"provider_name": "ToDelete", "callback_url": "https://del.example.com/wh"},
        )
        webhook_id = create_resp.json()["id"]
        resp = client.delete(f"/api/insurance/webhooks/{webhook_id}")
        assert resp.status_code == 200

        # Verify it's removed from list
        list_resp = client.get("/api/insurance/webhooks")
        ids = [w["id"] for w in list_resp.json()["webhooks"]]
        assert webhook_id not in ids

    def test_delete_nonexistent_webhook_returns_404(self):
        resp = client.delete("/api/insurance/webhooks/nonexistent-id")
        assert resp.status_code == 404


class TestApiKeyManagement:
    def test_generate_api_key(self):
        resp = client.post(
            "/api/insurance/api-keys",
            json={"provider_name": "SambaSafety"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "raw_key" in data
        assert data["raw_key"].startswith("ins_")
        assert "id" in data
        assert data["provider_name"] == "SambaSafety"

    def test_generated_key_is_usable(self):
        create_resp = client.post(
            "/api/insurance/api-keys",
            json={"provider_name": "TestProvider"},
        )
        raw_key = create_resp.json()["raw_key"]

        # The key should authenticate successfully against trip events
        resp = client.get(
            "/api/insurance/trips/rideshare/1/events",
            headers={"X-Insurance-API-Key": raw_key},
        )
        assert resp.status_code == 200

    def test_list_api_keys(self):
        client.post("/api/insurance/api-keys", json={"provider_name": "P1"})
        client.post("/api/insurance/api-keys", json={"provider_name": "P2"})
        resp = client.get("/api/insurance/api-keys")
        assert resp.status_code == 200
        data = resp.json()
        assert "api_keys" in data
        assert len(data["api_keys"]) >= 2

    def test_list_api_keys_no_raw_keys(self):
        client.post("/api/insurance/api-keys", json={"provider_name": "P1"})
        resp = client.get("/api/insurance/api-keys")
        keys_data = resp.json()["api_keys"]
        for k in keys_data:
            assert "raw_key" not in k
            assert "api_key_hash" not in k

    def test_revoke_api_key(self):
        create_resp = client.post(
            "/api/insurance/api-keys",
            json={"provider_name": "ToRevoke"},
        )
        key_id = create_resp.json()["id"]
        raw_key = create_resp.json()["raw_key"]

        resp = client.delete(f"/api/insurance/api-keys/{key_id}")
        assert resp.status_code == 200

        # Revoked key should no longer authenticate
        auth_resp = client.get(
            "/api/insurance/trips/rideshare/1/events",
            headers={"X-Insurance-API-Key": raw_key},
        )
        assert auth_resp.status_code == 401

    def test_revoke_nonexistent_key_returns_404(self):
        resp = client.delete("/api/insurance/api-keys/nonexistent-id")
        assert resp.status_code == 404
