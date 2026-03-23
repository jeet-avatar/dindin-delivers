import pytest

pytestmark = pytest.mark.asyncio


async def test_health_returns_200(client):
    response = await client.get("/health")
    assert response.status_code == 200


async def test_health_returns_ok_status(client):
    response = await client.get("/health")
    data = response.json()
    assert data["status"] == "ok"


async def test_health_returns_version(client):
    response = await client.get("/health")
    data = response.json()
    assert data["version"] == "1.0.0"
