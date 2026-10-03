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
import database
from database import db, is_subscribed, mixmind_access, parse_utc, subscription_access

log = logging.getLogger("beatmind.stripe")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
# BeatMind's own Customer Portal configuration (cancel at period end, plan switching); the account default serves other apps.
STRIPE_PORTAL_CONFIGURATION = os.getenv("STRIPE_PORTAL_CONFIGURATION", "")
# Founding subscribers' customers stay on the previous Stripe account until moved; everything new uses the primary one.
STRIPE_LEGACY_SECRET_KEY = os.getenv("STRIPE_LEGACY_SECRET_KEY", "")
STRIPE_LEGACY_WEBHOOK_SECRET = os.getenv("STRIPE_LEGACY_WEBHOOK_SECRET", "")
STRIPE_LEGACY_PORTAL_CONFIGURATION = os.getenv("STRIPE_LEGACY_PORTAL_CONFIGURATION", "")
PRIMARY = "primary"  # users.stripe_account for customers on the primary account; NULL means the legacy account.
TERMS_URL = "https://www.beatmind.io/terms"
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
    """Web login JWTs only: Bridge and MixMind app tokens cannot manage billing."""
    from main import get_current_user
    return get_current_user(request.headers.get("Authorization"))


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


def _account_tag(legacy: bool = False):
    """users.stripe_account for a new customer. Untagged until a legacy account is configured, so rows written
    before the move are read as legacy afterwards."""
    return PRIMARY if STRIPE_LEGACY_SECRET_KEY and not legacy else None


def _on_legacy(user: dict) -> bool:
    """Whether the user's Stripe customer is on the legacy account."""
    return bool(STRIPE_LEGACY_SECRET_KEY and user.get("stripe_customer_id") and user.get("stripe_account") != PRIMARY)


def _options(user: dict) -> dict:
    """Request options for Stripe calls about the user's own customer and subscription."""
    return {"api_key": STRIPE_LEGACY_SECRET_KEY} if _on_legacy(user) else {}


def _ensure_customer(user: dict) -> str:
    """The user's Stripe Customer on the primary account, created once and saved so the billing portal works
    without a subscription. A legacy customer is replaced, so only call this when the user has no open plan there."""
    if user.get("stripe_customer_id") and not _on_legacy(user):
        return user["stripe_customer_id"]
    customer = stripe.Customer.create(
        email=user["email"], name=user["name"], metadata={"user_id": str(user["id"]), "app": APP},
        idempotency_key=f"beatmind-customer-{user['id']}")
    with db() as conn:
        conn.execute("""UPDATE users SET stripe_customer_id=?, stripe_account=? WHERE id=?
                     AND (stripe_customer_id=? OR (stripe_customer_id IS NULL AND ? IS NULL))""",
                     (customer["id"], _account_tag(), user["id"],
                      user.get("stripe_customer_id"), user.get("stripe_customer_id")))
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
    discount = None
    if body.promo_code and body.promo_code.strip():
        try:
            discount = await asyncio.to_thread(catalog.promotion, body.promo_code, entry)
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
            # Automatic-renewal disclosure and affirmative consent on the payment page itself.
            consent_collection={"terms_of_service": "required"},
            custom_text={"terms_of_service_acceptance": {"message": f"I agree to the [BeatMind Terms]({TERMS_URL})."},
                         "submit": {"message": catalog.renewal_terms(entry, discount)}},
            success_url=f"{FRONTEND_URL}/dashboard?subscribed=true",
            cancel_url=f"{FRONTEND_URL}/dashboard?checkout=cancelled",
            metadata={"user_id": str(user["id"]), "app": APP, "plan": body.plan, "interval": body.interval},
            **({"discounts": [{"promotion_code": discount["id"]}]} if discount else {}),
        )
        return {"url": session.url}
    except stripe.InvalidRequestError as e:
        log.error("Stripe checkout rejected for user %s: %s", user["id"], type(e).__name__)
        # e.g. a first-time-only code on a customer who has paid before.
        raise HTTPException(400, "That code can't be used on this account." if discount else "Payment processing failed. Please try again.")
    except stripe.StripeError as e:
        log.error("Stripe checkout error for user %s: %s", user["id"], type(e).__name__)
        raise HTTPException(400, "Payment processing failed. Please try again.")


@router.get("/promo")
async def preview_promo(code: str, request: Request, interval: Literal["month", "year"] = "month"):
    """Which plans a code applies to for this billing period, with the renewal terms to show before checkout."""
    _authenticated_user(request)
    try:
        promo, coupon = await asyncio.to_thread(catalog.find_promotion, code)
    except catalog.PromoError as error:
        raise HTTPException(400, str(error))
    except stripe.StripeError:
        raise HTTPException(503, "Codes can't be checked right now. Please try again shortly.")
    plans = {}
    for item in await asyncio.to_thread(catalog.public_plans):
        if item["interval"] != interval or not item["available"]:
            continue
        entry = catalog.plan(item["plan"], interval)
        try:
            catalog.check_promotion(promo, coupon, entry)
        except catalog.PromoError as error:
            plans[item["plan"]] = {"ok": False, "message": str(error)}
            continue
        discount = catalog.discount_of(promo, coupon)
        plans[item["plan"]] = {"ok": True, "first_amount": catalog.discounted_amount(entry, discount),
                               "terms": catalog.renewal_terms(entry, discount)}
    return {"code": promo["code"], "interval": interval, "plans": plans}


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
    import song_usage
    entry = catalog.resolve()["plans"].get(user.get("plan_lookup_key") or "")
    return {**summary, "songs": song_usage.summary(user), "packs": [p for p in packs if p["price"]],
            "plan_price": {"amount": entry["amount"], "currency": entry["currency"]} if entry else None,
            "renewal_terms": catalog.renewal_terms(entry) if entry else None,
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
        raise HTTPException(402, "Packs top up a paid plan.")
    metadata = {"user_id": str(user["id"]), "app": APP, "pack_id": item["id"],
                "kind": item["kind"], "credits": str(item["credits"])}
    try:
        # A founding subscriber's customer is on the legacy account, where the packs aren't sold: check out as a guest.
        buyer = {"customer_email": user["email"]} if _on_legacy(user) else \
            {"customer": await asyncio.to_thread(_ensure_customer, user)}
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="payment", **buyer, line_items=[{"price": item["price_id"], "quantity": 1}],
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
        raise HTTPException(404, "Choose a plan first.")
    configuration = STRIPE_LEGACY_PORTAL_CONFIGURATION if _on_legacy(user) else STRIPE_PORTAL_CONFIGURATION
    try:
        session = await asyncio.to_thread(
            stripe.billing_portal.Session.create,
            customer=user["stripe_customer_id"],
            return_url=f"{FRONTEND_URL}/dashboard",
            **({"configuration": configuration} if configuration else {}),
            **_options(user),
        )
        return {"url": session.url}
    except stripe.StripeError as e:
        log.error("Stripe portal error for user %s: %s", user["id"], type(e).__name__)
        raise HTTPException(400, "Unable to open billing portal. Please contact support.")


# ---- One-click cancel and resume ----

EXPAND = ["items.data.price.product"]


def _own_subscription(user: dict):
    """The user's open subscription, re-read from Stripe; 404 when there is none or it isn't theirs."""
    if not user.get("subscription_id") or user["subscription_status"] not in OPEN_STATUSES:
        raise HTTPException(404, "You don't have an active subscription.")
    subscription = stripe.Subscription.retrieve(user["subscription_id"], expand=EXPAND, **_options(user))
    owner = _field(_field(subscription, "metadata", {}), "user_id")
    if _id(_field(subscription, "customer")) != user.get("stripe_customer_id") and owner != str(user["id"]):
        raise HTTPException(404, "You don't have an active subscription.")
    return subscription


def _subscription_state(subscription) -> dict:
    fields = _plan_fields(subscription)
    return {"status": subscription["status"], "cancel_at_period_end": bool(_field(subscription, "cancel_at_period_end")),
            "cancel_at": fields["cancel_at"], "current_period_end": fields["current_period_end"]}


def _set_cancellation(user: dict, cancel: bool) -> dict:
    subscription = _own_subscription(user)
    pending = bool(_field(subscription, "cancel_at_period_end") or _field(subscription, "cancel_at"))
    if pending != cancel:  # Repeated clicks change nothing.
        change = {"cancel_at_period_end": True} if cancel else (
            {"cancel_at_period_end": False} if _field(subscription, "cancel_at_period_end") else {"cancel_at": ""})
        subscription = stripe.Subscription.modify(subscription["id"], expand=EXPAND, **change, **_options(user))
    apply_subscription(subscription, user["id"], legacy=_on_legacy(user))  # Show the change now; the webhook confirms it.
    return _subscription_state(subscription)


@router.post("/subscription/cancel")
async def cancel_subscription(request: Request):
    """Cancel at the end of the paid period: no further charges, access until then."""
    user = _authenticated_user(request)
    try:
        return await asyncio.to_thread(_set_cancellation, user, True)
    except stripe.StripeError as e:
        log.error("Stripe cancel error for user %s: %s", user["id"], type(e).__name__)
        raise HTTPException(502, "Your subscription could not be cancelled right now. Please try again or use Manage billing.")


@router.post("/subscription/resume")
async def resume_subscription(request: Request):
    """Undo a pending cancellation before the period ends."""
    user = _authenticated_user(request)
    try:
        return await asyncio.to_thread(_set_cancellation, user, False)
    except stripe.StripeError as e:
        log.error("Stripe resume error for user %s: %s", user["id"], type(e).__name__)
        raise HTTPException(502, "Your subscription could not be resumed right now. Please try again or use Manage billing.")


# ---- Webhook ----

def _iso(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat() if timestamp else None


def _find_user(conn, subscription, user_id=None):
    """Looks up the matching user row. Inside apply_subscription's transaction on Postgres, this also
    locks whichever row is found (FOR UPDATE) so a second webhook for the same user waits its turn;
    SQLite never runs two of these at once, so no lock keyword is needed there."""
    lock = " FOR UPDATE" if database.is_postgres() else ""
    metadata = _field(subscription, "metadata", {})
    if not user_id and _field(metadata, "app") == APP:
        user_id = _field(metadata, "user_id")
    if str(user_id or "").isdigit():
        row = conn.execute(f"SELECT * FROM users WHERE id=?{lock}", (int(user_id),)).fetchone()
        if row:
            return dict(row)
    for column, value in (("subscription_id", subscription["id"]), ("stripe_customer_id", _id(_field(subscription, "customer")))):
        row = conn.execute(f"SELECT * FROM users WHERE {column}=?{lock}", (value,)).fetchone() if value else None
        if row:
            return dict(row)
    return None


LEGACY_METADATA_KEY = "beatmind_legacy"
LEGACY_LOOKUP_KEY = "beatmind_starter_monthly"


def _legacy_upgrade(subscription, lookup_key, included):
    """Subscribers from before tiered pricing were sold "$19/mo, unlimited BeatMind + MixMind".

    Their subscription carries metadata beatmind_legacy=true; while they stay on the original $19
    price they get Pro allowances plus MixMind. Switching to another plan drops the override.
    """
    legacy = str(_field(_field(subscription, "metadata", {}), LEGACY_METADATA_KEY, "")).lower() == "true"
    if not legacy or lookup_key != LEGACY_LOOKUP_KEY:
        return included
    pro = catalog.plan("pro", "month") or {}
    return {**included, "tier": "legacy",
            "included_tracks": pro.get("included_tracks", included.get("included_tracks")),
            "included_cloud": pro.get("included_cloud", included.get("included_cloud")),
            "mixmind": True}


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
    included = _legacy_upgrade(subscription, key, included or {})
    cancel_at = _field(subscription, "cancel_at") or (period_end if _field(subscription, "cancel_at_period_end") else None)
    return {"plan": plan, "cancel_at": _iso(cancel_at), "plan_tier": included.get("tier"), "plan_lookup_key": key,
            "plan_interval": _field(_field(price, "recurring", {}), "interval"),
            "included_tracks": included.get("included_tracks"), "included_cloud": included.get("included_cloud"),
            "mixmind": None if "mixmind" not in included else int(included["mixmind"]),
            "current_period_end": _iso(period_end)}


def apply_subscription(subscription, user_id=None, legacy=False) -> bool:
    """Copy a subscription's status and plan onto its user. Returns False when it belongs to no user or is stale."""
    status = subscription["status"]
    with db() as conn:
        if not database.is_postgres():
            conn.execute("BEGIN IMMEDIATE")  # SQLite: _find_user below carries no lock keyword.
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
                     "stripe_account=CASE WHEN stripe_customer_id IS NULL THEN ? ELSE stripe_account END, "
                     "stripe_customer_id=COALESCE(stripe_customer_id, ?) WHERE id=?",
                     (*fields.values(), _account_tag(legacy), _id(_field(subscription, "customer")), user["id"]))
    log.info("Subscription %s: user_id=%s status=%s plan=%s", subscription["id"], user["id"], status, fields["plan"])
    return True


def sync_subscription(subscription_id, user_id=None, legacy=False):
    """Apply Stripe's current state of a subscription (not the event's snapshot, which may be out of order)."""
    options = {"api_key": STRIPE_LEGACY_SECRET_KEY} if legacy else {}
    subscription = stripe.Subscription.retrieve(subscription_id, expand=EXPAND, **options)
    return apply_subscription(subscription, user_id, legacy)


def _grant_pack(session, legacy=False):
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
            conn.execute("UPDATE users SET stripe_customer_id=?, stripe_account=? WHERE id=? AND stripe_customer_id IS NULL",
                         (customer, _account_tag(legacy), user_id))
    log.info("Package %s for user_id=%s granted=%s", pack_id, user_id, granted)


def _invoice_subscription(invoice):
    # API versions from 2025-03-31 moved the subscription under invoice.parent.subscription_details.
    details = _field(_field(invoice, "parent", {}), "subscription_details", {})
    return _id(_field(invoice, "subscription") or _field(details, "subscription"))


def handle_event(event, legacy=False):
    """legacy: the event came from the legacy account, so its objects are read with that account's key."""
    event_type = event["type"]
    data = event["data"]["object"]
    metadata = _field(data, "metadata", {})
    if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded") and _field(metadata, "pack_id"):
        _grant_pack(data, legacy)
    elif event_type == "checkout.session.completed" and _field(data, "mode") == "subscription":
        user_id = _field(metadata, "user_id") if _field(metadata, "app") == APP else None
        if _field(data, "subscription"):
            sync_subscription(_id(data["subscription"]), user_id, legacy)
    elif event_type in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
        sync_subscription(data["id"], legacy=legacy)
    elif event_type in ("invoice.payment_succeeded", "invoice.payment_failed"):
        subscription_id = _invoice_subscription(data)
        if subscription_id:
            sync_subscription(subscription_id, legacy=legacy)


def _verified_event(body: bytes, signature: str):
    """The event and whether it was signed by the legacy account's endpoint secret."""
    for secret, legacy in ((STRIPE_WEBHOOK_SECRET, False), (STRIPE_LEGACY_WEBHOOK_SECRET, True)):
        if not secret:
            continue
        try:
            return stripe.Webhook.construct_event(body, signature, secret), legacy
        except stripe.SignatureVerificationError:
            continue
        except Exception:
            raise HTTPException(400, "Invalid webhook payload")
    log.warning("Stripe webhook signature verification failed")
    raise HTTPException(400, "Invalid signature")


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Handle Stripe webhook events with signature verification and persistent idempotency.

    An event is recorded as processed only after it was handled; a failure returns 500 so Stripe retries.
    """
    if not STRIPE_WEBHOOK_SECRET:
        log.error("STRIPE_WEBHOOK_SECRET not configured — rejecting webhook")
        raise HTTPException(500, "Webhook not configured")

    body = await request.body()

    event, legacy = _verified_event(body, stripe_signature)

    event_id = event["id"]
    with db() as conn:
        if conn.execute("SELECT 1 FROM stripe_events WHERE id=?", (event_id,)).fetchone():
            return {"received": True, "duplicate": True}
    log.info("Stripe webhook: %s%s", event["type"], " (legacy account)" if legacy else "")
    try:
        await asyncio.to_thread(handle_event, event, legacy)
    except Exception:
        log.exception("Stripe webhook %s (%s) failed; Stripe will retry", event_id, event["type"])
        raise HTTPException(500, "Webhook handling failed")
    with db() as conn:
        conn.execute("INSERT INTO stripe_events (id, type) VALUES (?, ?) ON CONFLICT (id) DO NOTHING", (event_id, event["type"]))
    return {"received": True}
