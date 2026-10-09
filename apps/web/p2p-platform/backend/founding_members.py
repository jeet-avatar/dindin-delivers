"""
Founding Member program — "Founding 10,000 per state"
=======================================================

Rules (confirmed with ownership 2026-10-07):
- 10,000 founding RIDERS PER STATE (each state has its own hard cap).
- $100 NON-REFUNDABLE to join → permanent founder status ("founders profit for life").
- Benefit: the PLATFORM FEE is frozen for founders at the founding fee schedule and
  NEVER increases, no matter how pricing changes for everyone else. (Government /
  regulatory fees — taxes, CPUC fees, the $0.10 Access-for-All — still pass through.)
- Future surge-pricing protection (founders are shielded) — flagged, applied in pricing.
- Claim window: a rider may join ONLY within their first 3 rides; the offer is closed
  by their 4th ride.
- Fully transparent: the locked platform fee is itemized on the receipt.

SAFETY: the $100 join charge uses STRIPE_SECRET_KEY (test key in a test env) and the same
demo-account bypass used elsewhere. This module MUST be verified end-to-end in Stripe TEST
mode before it is allowed to take a real $100 from anyone.
"""

import os
import logging
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Boolean, func, UniqueConstraint
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator

from database import get_db, Base
from auth_utils import require_customer, require_driver
from models import Customer, Driver, RideRequest

logger = logging.getLogger("founding_members")
router = APIRouter(prefix="/api/founding", tags=["Founding Members"])

FOUNDING_CAP_PER_STATE = 10000
CLAIM_WINDOW_RIDES = 3            # may join only within the first 3 rides
FOUNDING_DEPOSIT_CENTS = 10000   # $100.00, non-refundable
FOUNDING_FEE_SCHEDULE = "v1"     # founders are locked to this platform-fee schedule forever

_US_STATES = {
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY",
    "LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND",
    "OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
}


class FoundingMember(Base):
    __tablename__ = "founding_members"

    id = Column(Integer, primary_key=True, index=True)
    member_type = Column(String(10), index=True, nullable=False, default="customer")  # 'customer' | 'driver'
    member_id = Column(Integer, index=True, nullable=False)   # customer.id or driver.id per member_type
    state = Column(String(2), index=True, nullable=False)   # 2-letter US state, capped per state per type
    joined_at = Column(DateTime, default=datetime.utcnow)
    deposit_cents = Column(Integer, default=FOUNDING_DEPOSIT_CENTS)   # $100 non-refundable
    deposit_payment_intent_id = Column(String(255))
    fee_schedule_locked = Column(String(20), default=FOUNDING_FEE_SCHEDULE)  # frozen platform-fee schedule
    surge_protected = Column(Boolean, default=True)
    active = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("member_type", "member_id", name="uq_founding_member_type_id"),
    )


# ---------------------------------------------------------------------------
# Core helpers (importable by the ride/pricing paths)
# ---------------------------------------------------------------------------

def is_founder(db: Session, member_id: int, member_type: str = "customer") -> bool:
    if not member_id:
        return False
    return db.query(FoundingMember).filter(
        FoundingMember.member_type == member_type,
        FoundingMember.member_id == member_id,
        FoundingMember.active == True,
    ).first() is not None


def get_founder(db: Session, member_id: int, member_type: str = "customer"):
    return db.query(FoundingMember).filter(
        FoundingMember.member_type == member_type,
        FoundingMember.member_id == member_id,
        FoundingMember.active == True,
    ).first()


def founders_in_state(db: Session, state: str, member_type: str = "customer") -> int:
    """Count active founders of a given type in a state. Cap is per type per state."""
    return db.query(func.count(FoundingMember.id)).filter(
        FoundingMember.member_type == member_type,
        FoundingMember.state == state,
        FoundingMember.active == True,
    ).scalar() or 0


def slots_remaining(db: Session, state: str, member_type: str = "customer") -> int:
    return max(0, FOUNDING_CAP_PER_STATE - founders_in_state(db, state, member_type))


def member_ride_count(db: Session, member_id: int, member_type: str = "customer") -> int:
    """Rides taken — used for the 'first 3 rides' claim window. Customers: rides they
    requested; drivers: rides they were matched to."""
    if member_type == "driver":
        return db.query(func.count(RideRequest.id)).filter(
            RideRequest.matched_driver_id == member_id
        ).scalar() or 0
    return db.query(func.count(RideRequest.id)).filter(
        RideRequest.customer_id == member_id
    ).scalar() or 0


# Backward-compatible alias (customers only)
def customer_ride_count(db: Session, customer_id: int) -> int:
    return member_ride_count(db, customer_id, "customer")


def founding_platform_fee(standard_fee: float) -> float:
    """Platform fee a founder pays. Locked to the founding schedule (v1). Today v1 == the
    current tiers, so founders pay the same now and are protected from FUTURE increases.
    Government/regulatory fees are NOT handled here — they always pass through."""
    # v1 schedule == current tiers; when a v2 (higher) schedule ships, founders stay on v1.
    return standard_fee


# ---------------------------------------------------------------------------
# Ride fee schedule — the "25/50/75" scheme, charged to BOTH customer and driver
# on EVERY ride. Today the CURRENT schedule and the frozen FOUNDER (v1) schedule are
# identical, so founders pay the same now. When the current schedule is later raised
# (company policy / government factor / etc.), founders stay on the v1 numbers below.
# ---------------------------------------------------------------------------

def ride_fee_tier(fare: float) -> float:
    """CURRENT per-side platform fee by fare. Caps at $3 for fares over $75."""
    if fare <= 25:
        return 1.0
    if fare <= 50:
        return 2.0
    return 3.0  # $75 tier and above — capped, no further increase


def ride_fee_tier_v1(fare: float) -> float:
    """FROZEN founder (v1) per-side platform fee. Never changes, even if ride_fee_tier is
    raised later — this is the rate a $100 founding member keeps for life."""
    if fare <= 25:
        return 1.0
    if fare <= 50:
        return 2.0
    return 3.0


def compute_ride_fees(fare: float, customer_is_founder: bool = False,
                      driver_is_founder: bool = False) -> dict:
    """Single source of truth for per-ride money. The platform fee ($1/$2/$3 by fare tier)
    is charged to the customer AND the driver. Founders pay the frozen v1 rate; everyone
    else pays the current rate. The $0.10 CPUC Access-for-All fee is a separate pass-through
    (not part of the platform fee) and is remitted by the platform.

    Returns dollars:
      customer_platform_fee  — added ON TOP of the fare to the customer's charge
      driver_platform_fee    — deducted from the driver's fare
      platform_fee_total     — what the DB `platform_fee` column stores (customer + driver)
      customer_total_ex_tip  — fare + customer_platform_fee (what we authorize/capture, pre-tip)
      driver_payout          — fare - driver_platform_fee
    """
    fare = round(float(fare or 0), 2)
    customer_fee = ride_fee_tier_v1(fare) if customer_is_founder else ride_fee_tier(fare)
    driver_fee = ride_fee_tier_v1(fare) if driver_is_founder else ride_fee_tier(fare)
    return {
        "fare": fare,
        "tier_base_fee": ride_fee_tier(fare),
        "customer_platform_fee": round(customer_fee, 2),
        "driver_platform_fee": round(driver_fee, 2),
        "platform_fee_total": round(customer_fee + driver_fee, 2),
        "access_for_all_fee": 0.10,
        "customer_total_ex_tip": round(fare + customer_fee, 2),
        "driver_payout": round(fare - driver_fee, 2),
    }


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

class JoinRequest(BaseModel):
    state: str
    payment_method_id: str | None = None   # Stripe PaymentMethod for the $100 (optional for demo)

    @field_validator("state")
    @classmethod
    def _valid_state(cls, v):
        v = (v or "").strip().upper()
        if v not in _US_STATES:
            raise ValueError("A valid 2-letter US state is required")
        return v


DEMO_EMAILS = ["demo.customer@dollor.ai", "demo.driver@dollor.ai", "demo.restaurant@dollor.ai"]


def _founding_status_payload(db: Session, member_type: str, member_id: int, state: str | None) -> dict:
    """Shared status payload for a customer or driver — founder state, eligibility, slots."""
    founder = get_founder(db, member_id, member_type)
    rides = member_ride_count(db, member_id, member_type)
    eligible = (founder is None) and (rides < CLAIM_WINDOW_RIDES)
    resp = {
        "member_type": member_type,
        "is_founder": founder is not None,
        "founder_state": founder.state if founder else None,
        "rides_taken": rides,
        "claim_window_rides": CLAIM_WINDOW_RIDES,
        "eligible_to_join": eligible,
        "deposit_usd": FOUNDING_DEPOSIT_CENTS / 100,
        "cap_per_state": FOUNDING_CAP_PER_STATE,
        "benefit": "Lock today's platform fee for life and stay protected from future fee / surge increases. Government fees still apply.",
    }
    st = (state or "").strip().upper()
    if st in _US_STATES:
        resp["state"] = st
        resp["slots_remaining"] = slots_remaining(db, st, member_type)
    return resp


def _do_founding_join(db: Session, *, member_type: str, entity, state: str,
                      payment_method_id: str | None) -> dict:
    """Shared join flow for customers and drivers: non-refundable $100, hard per-(type,state)
    cap of 10,000, and the 'first 3 rides' claim window. Locks the member's own fee side."""
    member_id = entity.id
    if get_founder(db, member_id, member_type):
        raise HTTPException(status_code=400, detail="You are already a founding member.")
    if member_ride_count(db, member_id, member_type) >= CLAIM_WINDOW_RIDES:
        raise HTTPException(status_code=403, detail="The founding offer is only available within your first 3 rides.")
    if slots_remaining(db, state, member_type) <= 0:
        raise HTTPException(status_code=409, detail=f"Founding slots for {state} are full (10,000 reached).")

    # $100 NON-REFUNDABLE charge (test-mode-safe: uses STRIPE_SECRET_KEY = test key in test env)
    payment_intent_id = None
    email = getattr(entity, "email", None)
    if email and email.lower() in DEMO_EMAILS:
        payment_intent_id = "demo_founding_appstore_review"
    else:
        import stripe
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe.api_key:
            raise HTTPException(status_code=503, detail="Payment not configured")
        try:
            stripe_customer_id = getattr(entity, "stripe_customer_id", None)
            if not stripe_customer_id:
                sc = stripe.Customer.create(
                    email=email,
                    metadata={f"dollor_{member_type}_id": str(member_id)},
                    idempotency_key=f"founding-{member_type}-cust-{member_id}")
                stripe_customer_id = sc.id
                try:
                    entity.stripe_customer_id = stripe_customer_id
                    db.commit()
                except Exception:
                    db.rollback()  # entity may not persist a stripe_customer_id column; idempotency key keeps it stable
            pi = stripe.PaymentIntent.create(
                amount=FOUNDING_DEPOSIT_CENTS, currency="usd", customer=stripe_customer_id,
                payment_method=payment_method_id, off_session=bool(payment_method_id),
                confirm=bool(payment_method_id),
                description=f"Dollor Founding {member_type.title()} ({state}) — non-refundable",
                metadata={"type": "founding_member", "member_type": member_type,
                          "member_id": str(member_id), "state": state},
                idempotency_key=f"founding-join-{member_type}-{member_id}",
            )
            if pi.status not in ("succeeded", "requires_capture"):
                raise HTTPException(status_code=402, detail="The $100 founding payment did not complete.")
            payment_intent_id = pi.id
        except stripe.error.StripeError as e:
            logger.error(f"Founding join Stripe error for {member_type} {member_id}: {e}")
            raise HTTPException(status_code=402, detail="Your card was declined for the founding payment.")

    # Re-check cap inside the commit window (race safety)
    if slots_remaining(db, state, member_type) <= 0:
        raise HTTPException(status_code=409, detail=f"Founding slots for {state} just filled.")

    fm = FoundingMember(member_type=member_type, member_id=member_id, state=state,
                        deposit_payment_intent_id=payment_intent_id,
                        fee_schedule_locked=FOUNDING_FEE_SCHEDULE, surge_protected=True, active=True)
    db.add(fm)
    db.commit()
    logger.info(f"{member_type.title()} {member_id} joined Founding ({state}); slots left {slots_remaining(db, state, member_type)}")

    return {
        "success": True,
        "is_founder": True,
        "member_type": member_type,
        "state": state,
        "deposit_usd": FOUNDING_DEPOSIT_CENTS / 100,
        "benefit": "Your platform fee is locked for life and you're protected from surge increases. Government fees still apply.",
        "slots_remaining": slots_remaining(db, state, member_type),
    }


@router.get("/status")
async def founding_status(request: Request, state: str | None = None,
                          customer: Customer = Depends(require_customer), db: Session = Depends(get_db)):
    """Customer: am I a founder / still eligible, and how many slots remain in a state."""
    return _founding_status_payload(db, "customer", customer.id, state)


@router.post("/join")
async def founding_join(data: JoinRequest, request: Request,
                        customer: Customer = Depends(require_customer), db: Session = Depends(get_db)):
    """Customer joins the Founding program: non-refundable $100, per-state cap, 3-ride window."""
    return _do_founding_join(db, member_type="customer", entity=customer,
                             state=data.state, payment_method_id=data.payment_method_id)


@router.get("/driver/status")
async def founding_driver_status(request: Request, state: str | None = None,
                                 driver: Driver = Depends(require_driver), db: Session = Depends(get_db)):
    """Driver: am I a founder / still eligible, and how many driver slots remain in a state."""
    return _founding_status_payload(db, "driver", driver.id, state)


@router.post("/driver/join")
async def founding_driver_join(data: JoinRequest, request: Request,
                               driver: Driver = Depends(require_driver), db: Session = Depends(get_db)):
    """Driver joins the Founding program: non-refundable $100, per-state cap, first-3-rides window."""
    return _do_founding_join(db, member_type="driver", entity=driver,
                             state=data.state, payment_method_id=data.payment_method_id)
