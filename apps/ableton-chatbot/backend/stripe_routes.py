"""
Stripe routes for BeatMind plans, track packages and the billing portal.

Plans and packages are resolved by lookup key (catalog.py). The webhook re-reads each subscription from
Stripe and copies its status and plan onto the user, so events may arrive in any order or repeat.
"""

import asyncio
from datetime import datetime, timezone
import logging
import os
import time
from typing import Literal

import stripe
from fastapi import APIRouter, HTTPException, Header, Request, Depends
from pydantic import BaseModel, ConfigDict, Field

import ai_usage
import billing
import catalog
from database import db, get_user_by_id, is_subscribed, mixmind_access, parse_utc, subscription_access

log = logging.getLogger("beatmind.stripe")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
APP = "beatmind"  # Tags BeatMind's Stripe objects; the Stripe account also serves other apps.
# Statuses in which the user still has a subscription to manage rather than buy again.
OPEN_STATUSES = ("active", "trialing", "past_due")

router = APIRouter(prefix="/api/stripe", tags=["stripe"])


def _get_current_user_dep():
    """Lazy import to avoid circular dependency."""
    from main import get_current_user
    return Depends(get_current_user)


def _authenticated_user(request: Request) -> dict:
    from beatmind_auth import decode_token
    from jose import JWTError
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized")
    try:
        user = get_user_by_id(int(decode_token(auth[7:])["sub"]))
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "Unauthorized")
    if not user:
        raise HTTPException(401, "Unauthorized")
    return user


def _field(obj, key, default=None):
    """Safe field access for both StripeObject and plain dicts."""
    try:
        value = obj[key]
    except (KeyError, TypeError, IndexError):
        return default
    return default if value is None else value


def _id(value):
    """An ID from a field that may hold either an ID or an expanded object."""
    return value if isinstance(value, str) or value is None else _field(value, "id")


def _ensure_customer(user: dict) -> str:
    """The user's Stripe Customer, created once and saved so the billing portal works without a subscription."""
    if user.get("stripe_customer_id"):
        return user["stripe_customer_id"]
    customer = stripe.Customer.create(
        email=user["email"], name=user["name"], metadata={"user_id": str(user["id"]), "app": APP},
        idempotency_key=f"beatmind-customer-{user['id']}")
    with db() as conn:
        conn.execute("UPDATE users SET stripe_customer_id=? WHERE id=? AND stripe_customer_id IS NULL",
                     (customer["id"], user["id"]))
        return conn.execute("SELECT stripe_customer_id FROM users WHERE id=?", (user["id"],)).fetchone()[0]


class CheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    plan: Literal["starter", "pro", "studio", "mixmind", "starter_mixmind", "pro_mixmind"] = "starter"
    interval: Literal["month", "year"] = "month"
    promo_code: str | None = Field(default=None, max_length=64)


@router.get("/plans")
async def plans():
    """The plan picker's catalog. MixMind plans stay listed as unavailable until MixMind sales open."""
    items = await asyncio.to_thread(catalog.public_plans)
    return {"plans": items, "trial_days": 7,
            "trial": {**billing.trial_allowance(), **ai_usage.trial_limits()},
            "mixmind_sales_enabled": catalog.mixmind_sales_enabled()}


@router.post("/checkout")
async def create_checkout_session(request: Request, body: CheckoutRequest | None = None):
    """Stripe Checkout for a plan. Requires authenticated user. Defaults to Starter monthly."""
    user = _authenticated_user(request)
    body = body or CheckoutRequest()
    if not stripe.api_key:
        raise HTTPException(500, "Payment system not configured")
    if not catalog.available(body.plan):
        raise HTTPException(409, "MixMind is coming soon")
    entry = await asyncio.to_thread(catalog.plan, body.plan, body.interval)
    if not entry:
        raise HTTPException(503, "This plan is not available right now. Please try again shortly.")
    if user["subscription_status"] in OPEN_STATUSES:
        raise HTTPException(409, "You already have a BeatMind plan. Change it or update your card from Manage billing.")

    # Codes are checked here, not with allow_promotion_codes: a coupon cannot tell monthly from yearly prices.
    discounts = {}
    if body.promo_code and body.promo_code.strip():
        try:
            discounts = {"discounts": [{"promotion_code": await asyncio.to_thread(catalog.promotion, body.promo_code, entry)}]}
        except catalog.PromoError as error:
            raise HTTPException(400, str(error))
        except stripe.StripeError as e:
            log.error("Stripe promotion lookup error for user %s: %s", user["id"], type(e).__name__)
            raise HTTPException(503, "Codes can't be checked right now. Please try again shortly.")
    # No Stripe trial: the app's free trial collects no card, and subscribing ends it (charged today, full allowance).
    subscription_data = {"metadata": {"user_id": str(user["id"]), "app": APP, "plan": body.plan}}
    try:
        customer = await asyncio.to_thread(_ensure_customer, user)
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="subscription",
            customer=customer,
            client_reference_id=str(user["id"]),
            payment_method_types=["card"],
            line_items=[{"price": entry["price_id"], "quantity": 1}],
            subscription_data=subscription_data,
            success_url=f"{FRONTEND_URL}/dashboard?subscribed=true",
            cancel_url=f"{FRONTEND_URL}/dashboard?checkout=cancelled",
            metadata={"user_id": str(user["id"]), "app": APP, "plan": body.plan, "interval": body.interval},
            **discounts,
        )
        return {"url": session.url}
    except stripe.InvalidRequestError as e:
        log.error("Stripe checkout rejected for user %s: %s", user["id"], type(e).__name__)
        # e.g. a first-time-only code on a customer who has paid before.
        raise HTTPException(400, "That code can't be used on this account." if discounts else "Payment processing failed. Please try again.")
    except stripe.StripeError as e:
        log.error("Stripe checkout error for user %s: %s", user["id"], type(e).__name__)
        raise HTTPException(400, "Payment processing failed. Please try again.")


_prices: dict[str, tuple[float, dict]] = {}


def _price(price_id: str) -> dict | None:
    """Amount and currency of a BEATMIND_PACKS override price, cached for ten minutes."""
    cached = _prices.get(price_id)
    if cached and time.monotonic() - cached[0] < 600:
        return cached[1]
    try:
        price = stripe.Price.retrieve(price_id)
        value = {"amount": price["unit_amount"], "currency": price["currency"]}
    except stripe.StripeError:
        return None
    _prices[price_id] = (time.monotonic(), value)
    return value


@router.get("/usage")
async def usage(request: Request):
    """Plan, tracks and cloud tracks used vs included this month, purchased credits, AI usage and packages for sale."""
    user = _authenticated_user(request)
    packs = [{"id": p["id"], "kind": p["kind"], "credits": p["credits"], "price": p["price"] or _price(p["price_id"])}
             for p in billing.packs()]
    summary = billing.summary(user["id"])
    return {**summary, "packs": [p for p in packs if p["price"]],
            "subscribed": is_subscribed(user), "mixmind_access": mixmind_access(user),
            # Packages top up a paid plan: they are not sold during the free trial or without a plan.
            "packs_require_plan": True, "can_buy_packs": subscription_access(user),
            "billing_account": bool(user.get("stripe_customer_id")),
            "ai_usage": ai_usage.status(user["id"], summary["plan"])}


@router.post("/packs/{pack_id}/checkout")
async def buy_pack(pack_id: str, request: Request):
    """One-time Checkout for a track or cloud-credit package. Credits come from server config, not the request."""
    user = _authenticated_user(request)
    item = billing.pack(pack_id)
    if not item:
        raise HTTPException(404, "Unknown package")
    if not stripe.api_key:
        raise HTTPException(500, "Payment system not configured")
    if not subscription_access(user):
        raise HTTPException(402, "Track packs top up a paid plan. Choose a plan first.")
    metadata = {"user_id": str(user["id"]), "app": APP, "pack_id": item["id"],
                "kind": item["kind"], "credits": str(item["credits"])}
    try:
        customer = await asyncio.to_thread(_ensure_customer, user)
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="payment", customer=customer, line_items=[{"price": item["price_id"], "quantity": 1}],
            payment_intent_data={"metadata": metadata},
            success_url=f"{FRONTEND_URL}/dashboard?purchase=complete", cancel_url=f"{FRONTEND_URL}/dashboard",
            metadata=metadata)
        return {"url": session.url}
    except stripe.StripeError as e:
        log.error("Stripe package checkout error for user %s: %s", user["id"], type(e).__name__)
        raise HTTPException(400, "Payment processing failed. Please try again.")


@router.post("/portal")
async def customer_portal(request: Request):
    """Create Stripe Customer Portal session for authenticated user."""
    user = _authenticated_user(request)
    if not user.get("stripe_customer_id"):
        raise HTTPException(404, "No billing account yet. Choose a plan or buy a pack first.")
    try:
        session = await asyncio.to_thread(
            stripe.billing_portal.Session.create,
            customer=user["stripe_customer_id"],
            return_url=f"{FRONTEND_URL}/dashboard",
        )
        return {"url": session.url}
    except stripe.StripeError as e:
        log.error("Stripe portal error for user %s: %s", user["id"], type(e).__name__)
        raise HTTPException(400, "Unable to open billing portal. Please contact support.")


# ---- Webhook ----

def _iso(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat() if timestamp else None


def _find_user(conn, subscription, user_id=None):
    metadata = _field(subscription, "metadata", {})
    if not user_id and _field(metadata, "app") == APP:
        user_id = _field(metadata, "user_id")
    if str(user_id or "").isdigit():
        row = conn.execute("SELECT * FROM users WHERE id=?", (int(user_id),)).fetchone()
        if row:
            return dict(row)
    for column, value in (("subscription_id", subscription["id"]), ("stripe_customer_id", _id(_field(subscription, "customer")))):
        row = conn.execute(f"SELECT * FROM users WHERE {column}=?", (value,)).fetchone() if value else None
        if row:
            return dict(row)
    return None


def _plan_fields(subscription):
    """Plan fields from the subscription's first item: product metadata first, then the catalog."""
    item = (_field(_field(subscription, "items", {}), "data", []) or [{}])[0]
    price = _field(item, "price", {})
    product = _field(price, "product")
    included = catalog.entitlements(product) if not isinstance(product, str) else None
    entry = catalog.by_price(price)
    if included is None and entry:
        included = {key: entry[key] for key in ("tier", "included_tracks", "included_cloud", "mixmind")}
    key = _field(price, "lookup_key")
    plan = catalog.PLAN_KEYS.get(key, (None,))[0] or (entry or {}).get("plan") or (included or {}).get("tier")
    # API versions from 2025-03-31 moved the billing period from the subscription to its items.
    period_end = _field(subscription, "current_period_end") or _field(item, "current_period_end")
    included = included or {}
    return {"plan": plan, "plan_tier": included.get("tier"), "plan_lookup_key": key,
            "plan_interval": _field(_field(price, "recurring", {}), "interval"),
            "included_tracks": included.get("included_tracks"), "included_cloud": included.get("included_cloud"),
            "mixmind": None if "mixmind" not in included else int(included["mixmind"]),
            "current_period_end": _iso(period_end)}


def apply_subscription(subscription, user_id=None) -> bool:
    """Copy a subscription's status and plan onto its user. Returns False when it belongs to no user or is stale."""
    status = subscription["status"]
    with db() as conn:
        conn.execute("BEGIN IMMEDIATE")
        user = _find_user(conn, subscription, user_id)
        if not user:
            log.warning("Subscription %s matches no BeatMind user", subscription["id"])
            return False
        current = user.get("subscription_id")
        if current and current != subscription["id"] and user["subscription_status"] in OPEN_STATUSES \
                and status not in OPEN_STATUSES:
            log.info("Ignoring %s subscription %s: user %s has open subscription %s", status, subscription["id"], user["id"], current)
            return False
        fields = _plan_fields(subscription)
        if status in OPEN_STATUSES and (trial := parse_utc(user.get("trial_ends_at"))) and trial > datetime.now(timezone.utc):
            fields["trial_ends_at"] = datetime.now(timezone.utc).isoformat()  # A paid plan replaces the free trial.
        if status == "past_due":
            already = user["subscription_status"] == "past_due" and user.get("past_due_since")
            fields["past_due_since"] = user["past_due_since"] if already else datetime.now(timezone.utc).isoformat()
        else:
            fields["past_due_since"] = None
        fields.update(subscription_status=status, subscription_id=subscription["id"])
        conn.execute(f"UPDATE users SET {', '.join(f'{name}=?' for name in fields)}, "
                     "stripe_customer_id=COALESCE(stripe_customer_id, ?) WHERE id=?",
                     (*fields.values(), _id(_field(subscription, "customer")), user["id"]))
    log.info("Subscription %s: user_id=%s status=%s plan=%s", subscription["id"], user["id"], status, fields["plan"])
    return True


def sync_subscription(subscription_id, user_id=None):
    """Apply Stripe's current state of a subscription (not the event's snapshot, which may be out of order)."""
    subscription = stripe.Subscription.retrieve(subscription_id, expand=["items.data.price.product"])
    return apply_subscription(subscription, user_id)


def _grant_pack(session):
    metadata = _field(session, "metadata", {})
    if _field(metadata, "app") != APP:
        log.warning("Ignoring package session %s without the BeatMind tag", _field(session, "id"))
        return
    if _field(session, "mode") != "payment" or _field(session, "payment_status") != "paid":
        log.info("Package session %s not paid yet", _field(session, "id"))
        return
    user_id, pack_id = int(_field(metadata, "user_id")), _field(metadata, "pack_id")
    try:
        credits = int(_field(metadata, "credits"))
    except (TypeError, ValueError):
        credits = None
    granted = billing.grant(user_id, pack_id, _field(session, "id"), _field(metadata, "kind"), credits)
    customer = _id(_field(session, "customer"))
    if customer:
        with db() as conn:
            conn.execute("UPDATE users SET stripe_customer_id=? WHERE id=? AND stripe_customer_id IS NULL", (customer, user_id))
    log.info("Package %s for user_id=%s granted=%s", pack_id, user_id, granted)


def _invoice_subscription(invoice):
    # API versions from 2025-03-31 moved the subscription under invoice.parent.subscription_details.
    details = _field(_field(invoice, "parent", {}), "subscription_details", {})
    return _id(_field(invoice, "subscription") or _field(details, "subscription"))


def handle_event(event):
    event_type = event["type"]
    data = event["data"]["object"]
    metadata = _field(data, "metadata", {})
    if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded") and _field(metadata, "pack_id"):
        _grant_pack(data)
    elif event_type == "checkout.session.completed" and _field(data, "mode") == "subscription":
        user_id = _field(metadata, "user_id") if _field(metadata, "app") == APP else None
        if _field(data, "subscription"):
            sync_subscription(_id(data["subscription"]), user_id)
    elif event_type in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
        sync_subscription(data["id"])
    elif event_type in ("invoice.payment_succeeded", "invoice.payment_failed"):
        subscription_id = _invoice_subscription(data)
        if subscription_id:
            sync_subscription(subscription_id)


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Handle Stripe webhook events with signature verification and persistent idempotency.

    An event is recorded as processed only after it was handled; a failure returns 500 so Stripe retries.
    """
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

    event_id = event["id"]
    with db() as conn:
        if conn.execute("SELECT 1 FROM stripe_events WHERE id=?", (event_id,)).fetchone():
            return {"received": True, "duplicate": True}
    log.info("Stripe webhook: %s", event["type"])
    try:
        await asyncio.to_thread(handle_event, event)
    except Exception:
        log.exception("Stripe webhook %s (%s) failed; Stripe will retry", event_id, event["type"])
        raise HTTPException(500, "Webhook handling failed")
    with db() as conn:
        conn.execute("INSERT OR IGNORE INTO stripe_events (id, type) VALUES (?, ?)", (event_id, event["type"]))
    return {"received": True}
