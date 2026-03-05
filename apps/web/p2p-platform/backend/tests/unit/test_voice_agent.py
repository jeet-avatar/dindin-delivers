"""
Tests for Voice Agent incoming-call endpoint (Phase 10 coverage).

Covers:
- POST /api/voice/incoming-call (TwiML webhook)
- GET /api/voice/incoming-call (also accepted via api_route)
- TwiML response format validation

Note: twilio is not installed in the test environment. The endpoint imports
twilio inside the function body, so we mock it before calling the endpoint.
"""

import sys
import types
import pytest
from unittest.mock import patch


# Build a mock twilio module tree that produces realistic TwiML XML
def _setup_twilio_mock():
    """Create a mock twilio module hierarchy returning valid TwiML-like XML."""

    class MockConnect:
        def __init__(self):
            self._streams = []

        def stream(self, url=""):
            self._streams.append(url)

        def __str__(self):
            streams = "".join(f'<Stream url="{u}"/>' for u in self._streams)
            return f"<Connect>{streams}</Connect>"

    class MockVoiceResponse:
        def __init__(self):
            self._parts = []

        def say(self, text):
            self._parts.append(f"<Say>{text}</Say>")

        def pause(self, length=1):
            self._parts.append(f'<Pause length="{length}"/>')

        def append(self, obj):
            self._parts.append(str(obj))

        def __str__(self):
            return "<Response>" + "".join(self._parts) + "</Response>"

    # Build module tree
    twilio_mod = types.ModuleType("twilio")
    twiml_mod = types.ModuleType("twilio.twiml")
    voice_mod = types.ModuleType("twilio.twiml.voice_response")
    voice_mod.VoiceResponse = MockVoiceResponse
    voice_mod.Connect = MockConnect

    twilio_mod.twiml = twiml_mod
    twiml_mod.voice_response = voice_mod

    return {
        "twilio": twilio_mod,
        "twilio.twiml": twiml_mod,
        "twilio.twiml.voice_response": voice_mod,
    }


# Pre-check: if twilio is not installed, inject mocks into sys.modules
_twilio_available = "twilio" in sys.modules or __import__("importlib").util.find_spec("twilio") is not None
if not _twilio_available:
    _mocks = _setup_twilio_mock()
    sys.modules.update(_mocks)


class TestVoiceIncomingCall:
    """Tests for /api/voice/incoming-call"""

    def test_incoming_call_returns_twiml_post(self, client):
        """POST /api/voice/incoming-call returns 200 with TwiML XML."""
        resp = client.post("/api/voice/incoming-call")
        assert resp.status_code == 200
        body = resp.text
        assert "<Response>" in body
        assert "<Connect>" in body
        assert "<Stream" in body

    def test_incoming_call_returns_twiml_get(self, client):
        """GET /api/voice/incoming-call also returns 200 (multi-method route)."""
        resp = client.get("/api/voice/incoming-call")
        assert resp.status_code == 200
        body = resp.text
        assert "<Response>" in body

    def test_incoming_call_twiml_has_stream_url(self, client):
        """TwiML response body contains a stream URL with media-stream path."""
        resp = client.post("/api/voice/incoming-call")
        assert resp.status_code == 200
        body = resp.text
        assert "/api/voice/media-stream" in body
