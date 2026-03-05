"""
Tests for Support Chat endpoint and intent classification (Phase 10 coverage).

Covers:
- POST /api/support/chat (deterministic rule-based responses)
- Intent classification via _classify_intent (direct unit tests)
- Edge cases: empty message, invalid JSON
"""

import pytest
from unittest.mock import patch

from support_agent import _classify_intent


class TestSupportChatEndpoint:
    """Tests for POST /api/support/chat"""

    def test_support_chat_empty_message(self, client):
        """POST with empty message returns 400."""
        resp = client.post("/api/support/chat", json={"message": ""})
        assert resp.status_code == 400

    def test_support_chat_invalid_json(self, client):
        """POST with non-JSON body returns 400."""
        resp = client.post(
            "/api/support/chat",
            content=b"this is not json",
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 400

    def test_support_chat_hello(self, client):
        """POST with 'hello' returns 200 with general help menu."""
        resp = client.post("/api/support/chat", json={"message": "hello"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert isinstance(data["response"], str)
        assert len(data["response"]) > 0
        # General handler lists capabilities
        assert "help" in data["response"].lower() or "order" in data["response"].lower()

    def test_support_chat_pricing_intent(self, client):
        """POST with pricing question returns pricing info."""
        resp = client.post(
            "/api/support/chat", json={"message": "what is the pricing info?"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        # Pricing handler mentions fee structure
        response_lower = data["response"].lower()
        assert "fee" in response_lower or "$1" in data["response"]

    def test_support_chat_order_status_no_auth(self, client):
        """POST about order status without auth returns login prompt."""
        resp = client.post(
            "/api/support/chat", json={"message": "where is my order"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        # Without auth, should prompt to log in
        assert "log in" in data["response"].lower()

    @patch("support_agent.send_email")
    def test_support_chat_escalate(self, mock_email, client):
        """POST with escalation request returns escalation response."""
        mock_email.return_value = True
        resp = client.post(
            "/api/support/chat", json={"message": "talk to human"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "escalat" in data["response"].lower() or "support" in data["response"].lower()


class TestIntentClassification:
    """Unit tests for _classify_intent (no HTTP, direct function calls)."""

    def test_classify_intent_cancel(self):
        """'cancel my order' maps to cancel handler."""
        assert _classify_intent("I want to cancel my order") == "_handle_cancel"

    def test_classify_intent_refund(self):
        """'refund' maps to refund handler."""
        assert _classify_intent("I want a refund") == "_handle_refund"

    def test_classify_intent_ride(self):
        """'rideshare' maps to ride status handler."""
        assert _classify_intent("I need help with rideshare") == "_handle_ride_status"

    def test_classify_intent_general_fallback(self):
        """Unrecognized input falls back to general handler."""
        assert _classify_intent("asdfghjkl") == "_handle_general"

    def test_classify_intent_pricing(self):
        """'how much' maps to pricing handler."""
        assert _classify_intent("how much does it cost") == "_handle_pricing"

    def test_classify_intent_delivery(self):
        """'delivery' maps to delivery issue handler."""
        assert _classify_intent("I have a delivery issue") == "_handle_delivery_issue"

    def test_classify_intent_account(self):
        """'password' maps to account handler."""
        assert _classify_intent("I forgot my password") == "_handle_account"

    def test_classify_intent_escalation(self):
        """'talk to human' maps to escalate handler."""
        assert _classify_intent("I want to talk to human") == "_handle_escalate"
