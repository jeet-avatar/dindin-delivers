# tests/test_ai_routes.py
import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
from main import app

pytestmark = pytest.mark.asyncio


async def test_chat_requires_message(client):
    response = await client.post("/api/ai/chat", json={})
    assert response.status_code == 422  # Pydantic validation error


async def test_chat_returns_ok_with_mocked_claude(client):
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Test response from Claude")]

    with patch("ai_routes.load_library", return_value=[]), \
         patch("ai_routes.anthropic_client") as mock_client:
        mock_client.messages.create.return_value = mock_response
        response = await client.post("/api/ai/chat", json={
            "message": "Build me a techno set"
        })

    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "playlist" in data


async def test_chat_playlist_parsed_from_json_response(client):
    playlist_json = json.dumps([
        {"title": "Afterlife", "artist": "Tale Of Us", "reason": "Great opener"}
    ])
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=playlist_json)]

    with patch("ai_routes.load_library", return_value=[]), \
         patch("ai_routes.anthropic_client") as mock_client:
        mock_client.messages.create.return_value = mock_response
        response = await client.post("/api/ai/chat", json={"message": "Build a set"})

    data = response.json()
    assert len(data["playlist"]) == 1
    assert data["playlist"][0]["title"] == "Afterlife"


async def test_chat_without_anthropic_key_returns_503(client):
    with patch("ai_routes.anthropic_client", None):
        response = await client.post("/api/ai/chat", json={"message": "hello"})
    assert response.status_code == 503
