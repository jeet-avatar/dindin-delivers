"""
Stripe routes for BeatMind subscriptions.
"""

import logging
import os

import stripe
from fastapi import APIRouter, HTTPException, Header, Request, Depends

log = logging.getLogger("beatmind.stripe")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Track processed webhook event IDs for idempotency (use Redis in multi-instance)
_processed_events: set[str] = set()

router = APIRouter(prefix="/api/stripe", tags=["stripe"])


def _get_current_user_dep():
    """Lazy import to avoid circular dependency."""
    from main import get_current_user
    return Depends(get_current_user)


@router.post("/checkout")
async def create_checkout_session(request: Request):
    """Create a Stripe Checkout session. Requires authenticated user."""
    from main import get_current_user
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from fastapi import Header as FHeader

    # Get auth header and validate user
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized")

    from musai_auth import decode_token
    from database import get_user_by_id
    from jose import JWTError
    try:
        payload = decode_token(auth[7:])
        user = get_user_by_id(int(payload["sub"]))
        if not user:
            raise HTTPException(401, "Unauthorized")
    except JWTError:
        raise HTTPException(401, "Unauthorized")

    if not stripe.api_key:
        raise HTTPException(500, "Payment system not configured")
    if not STRIPE_PRICE_ID:
        raise HTTPException(500, "Payment system not configured")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            customer_email=user["email"],  # Use authenticated user's email, not user-supplied
            subscription_data={"trial_period_days": 7},
            success_url=f"{FRONTEND_URL}/dashboard?subscribed=true",
            cancel_url=f"{FRONTEND_URL}/#pricing",
            metadata={"user_id": str(user["id"])},  # Use user_id, not email (tamper-proof)
        )
        return {"url": session.url}
    except stripe.StripeError as e:
        log.error("Stripe checkout error for user %s: %s", user["id"], type(e).__name__)
        raise HTTPException(400, "Payment processing failed. Please try again.")


@router.post("/portal")
async def customer_portal(request: Request):
    """Create Stripe Customer Portal session for authenticated user."""
    from musai_auth import decode_token
    from database import get_user_by_id
    from jose import JWTError

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized")

    try:
        payload = decode_token(auth[7:])
        user = get_user_by_id(int(payload["sub"]))
        if not user:
            raise HTTPException(401, "Unauthorized")
    except JWTError:
        raise HTTPException(401, "Unauthorized")

    if not user.get("stripe_customer_id"):
        raise HTTPException(404, "No active subscription found")

    try:
        session = stripe.billing_portal.Session.create(
            customer=user["stripe_customer_id"],
            return_url=f"{FRONTEND_URL}/dashboard",
        )
        return {"url": session.url}
    except stripe.StripeError as e:
        log.error("Stripe portal error for user %s: %s", user["id"], type(e).__name__)
        raise HTTPException(400, "Unable to open billing portal. Please contact support.")


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Handle Stripe webhook events with signature verification and idempotency."""
    if not STRIPE_WEBHOOK_SECRET:
        log.error("STRIPE_WEBHOOK_SECRET not configured — rejecting webhook")
        raise HTTPException(500, "Webhook not configured")

    body = await request.body()

    try:
        event = stripe.Webhook.construct_event(body, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except stripe.SignatureVerificationError:
        log.warning("Stripe webhook signature verification failed")
        raise HTTPException(400, "Invalid signature")
    except Exception:
        raise HTTPException(400, "Invalid webhook payload")

    # Idempotency: skip already-processed events
    event_id = event["id"]
    if event_id in _processed_events:
        return {"received": True, "duplicate": True}
    _processed_events.add(event_id)
    if len(_processed_events) > 10000:  # Prevent unbounded growth
        _processed_events.clear()

    event_type = event["type"]
    data = event["data"]["object"]
    log.info("Stripe webhook: %s", event_type)

    from database import db, update_user_subscription

    if event_type == "checkout.session.completed":
        user_id = data.get("metadata", {}).get("user_id")
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        if user_id:
            with db() as conn:
                conn.execute(
                    "UPDATE users SET stripe_customer_id=?, subscription_status='active', subscription_id=? WHERE id=?",
                    (customer_id, subscription_id, int(user_id)),
                )
            log.info("Subscription activated: user_id=%s", user_id)

    elif event_type == "invoice.payment_succeeded":
        customer_id = data.get("customer")
        with db() as conn:
            conn.execute(
                "UPDATE users SET subscription_status='active' WHERE stripe_customer_id=?",
                (customer_id,),
            )

    elif event_type in ("customer.subscription.deleted", "invoice.payment_failed"):
        customer_id = data.get("customer")
        with db() as conn:
            conn.execute(
                "UPDATE users SET subscription_status='inactive' WHERE stripe_customer_id=?",
                (customer_id,),
            )
        log.info("Subscription deactivated: customer_id=%s", customer_id)

    return {"received": True}
