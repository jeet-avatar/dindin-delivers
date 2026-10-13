"""
Unit tests for stripe_integration.py

Food-order creation/tracking/vendor-payout functions (create_order, get_order,
list_orders, update_order_status, sync_vendor_payouts, get_vendor_payouts,
generate_customer_invoice) were removed along with the rest of the food order
flow. The Stripe webhook's food-order branch was also removed — only the
ride-payment branch remains, since the webhook is shared infrastructure that
also processes ride payment confirmations.

These tests cover what's left: webhook signature/payload verification, which
is unchanged and still security-relevant regardless of the payment's source.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, Mock, patch
from fastapi import HTTPException

from stripe_integration import stripe_webhook


def _run(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


class TestStripeWebhookSecurity:
    """Webhook signature/payload verification (unchanged by the food-order removal)"""

    @patch('stripe_integration.stripe.Webhook.construct_event')
    def test_webhook_invalid_payload(self, mock_construct_event, db_session):
        """Should raise 400 for invalid payload"""
        mock_construct_event.side_effect = ValueError("Invalid payload")

        mock_request = Mock()
        mock_request.body = AsyncMock(return_value=b'invalid')

        with pytest.raises(HTTPException) as exc_info:
            _run(stripe_webhook(mock_request, stripe_signature="test_sig", db=db_session))

        assert exc_info.value.status_code == 400
        assert "Invalid payload" in str(exc_info.value.detail)

    @patch('stripe_integration.stripe.Webhook.construct_event')
    def test_webhook_invalid_signature(self, mock_construct_event, db_session):
        """Should raise 400 for invalid signature"""
        import stripe
        mock_construct_event.side_effect = stripe.error.SignatureVerificationError(
            "Invalid signature", "sig_header"
        )

        mock_request = Mock()
        mock_request.body = AsyncMock(return_value=b'{"test": "data"}')

        with pytest.raises(HTTPException) as exc_info:
            _run(stripe_webhook(mock_request, stripe_signature="bad_sig", db=db_session))

        assert exc_info.value.status_code == 400
        assert "Invalid signature" in str(exc_info.value.detail)
