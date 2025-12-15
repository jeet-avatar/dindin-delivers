"""
TRIP SAFETY MODULE - DOLLOR.AI TRIP BOARD
==========================================
Comprehensive safety system for drivers and passengers.

LEGAL FRAMEWORK:
This module implements safety features as VOLUNTARY tools for users who
arrange their own private transportation. Dollor.ai is NOT a TNC and does
NOT guarantee safety - these are tools to help users protect themselves.

FEATURES:
1. Mutual Recording Consent - Both parties agree to allow recording
2. Payment Confirmation - Driver confirms payment before trip starts
3. Two-Way Identity Verification - Code exchange to confirm identity
4. Safety Checklist - Pre-trip safety acknowledgments
5. Emergency Contact Sharing - Optional sharing of emergency contacts

IMPORTANT DISCLAIMERS:
- Dollor.ai does NOT verify identities (users verify each other)
- Dollor.ai does NOT guarantee payment (private arrangement)
- Dollor.ai does NOT control or monitor trips
- All safety features are VOLUNTARY user tools
- Users are responsible for their own safety
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from decimal import Decimal
import secrets
import uuid
import hashlib

from database import get_db, Base

router = APIRouter(prefix="/api/trip-board/safety", tags=["trip-safety"])


# =============================================================================
# LEGAL DISCLAIMERS
# =============================================================================

SAFETY_DISCLAIMER = """
SAFETY FEATURES DISCLAIMER:

These safety features are TOOLS provided to help users protect themselves
when arranging private transportation through connections made on Dollor.ai.

IMPORTANT:
1. Dollor.ai does NOT verify user identities - use these tools to verify each other
2. Dollor.ai does NOT guarantee payment - confirm payment directly with the other party
3. Dollor.ai does NOT monitor or control trips - you are responsible for your safety
4. These features are VOLUNTARY - users choose to use them at their own discretion
5. Dollor.ai is NOT responsible for any incidents during private transportation

RECORDING CONSENT:
By agreeing to mutual recording, both parties consent to audio/video recording
during the trip for safety purposes. This is a PRIVATE agreement between users.
Dollor.ai does NOT record, store, or access any recordings.

PAYMENT CONFIRMATION:
Payment arrangements are PRIVATE matters between users. Dollor.ai does NOT
process payments or guarantee any payment. The payment confirmation feature
is a communication tool only.

USE COMMON SENSE:
- Meet in public places first
- Share your plans with someone you trust
- Trust your instincts
- Have a backup plan
- Keep your phone charged
"""

RECORDING_CONSENT_TEXT = """
MUTUAL RECORDING CONSENT AGREEMENT

By confirming below, BOTH parties agree to the following:

1. CONSENT TO RECORD: Both the driver and passenger consent to audio and/or
   video recording during the trip for personal safety purposes.

2. PRIVATE AGREEMENT: This consent is a private agreement between the two
   parties. Dollor.ai is NOT a party to this agreement and does NOT record,
   store, or have access to any recordings.

3. PURPOSE: Recordings are for personal safety and accountability only.

4. LEGAL COMPLIANCE: Each party is responsible for complying with applicable
   recording laws in their jurisdiction. Some states require all-party consent
   for recording. By agreeing here, both parties provide that consent.

5. NO LIABILITY: Dollor.ai has no liability for recordings made by users.

6. RETENTION: Each party is responsible for how they store, use, or dispose
   of their own recordings.

This consent is VOLUNTARY. If either party does not consent, the trip should
not proceed, or parties should agree on alternative safety measures.
"""

PAYMENT_METHODS_INFO = """
PAYMENT INFORMATION

Dollor.ai does NOT process payments. All payment arrangements are private
matters between users. Common payment methods users may discuss:

CASH:
- Agree on exact amount before trip
- Driver may request payment before starting
- Both parties should count and confirm

VENMO / PAYPAL / ZELLE:
- Share usernames before trip
- Confirm payment sent/received before starting
- Keep transaction records

OTHER METHODS:
- Users may agree on any payment method
- Dollor.ai has no involvement in payment

IMPORTANT:
- Confirm payment method BEFORE the trip
- Driver has right to request payment before starting
- Never give payment info to untrusted parties
- Dollor.ai does NOT mediate payment disputes
"""


# =============================================================================
# DATABASE MODELS
# =============================================================================

class TripSafetyAgreement(Base):
    """
    Track safety agreements between matched users.
    This is a VOLUNTARY agreement between private parties.
    """
    __tablename__ = "trip_safety_agreements"

    id = Column(Integer, primary_key=True, index=True)
    agreement_id = Column(String(50), unique=True, nullable=False, index=True)  # SA-XXXXXX
    match_id = Column(String(50), nullable=False, index=True)

    # Recording consent
    driver_recording_consent = Column(Boolean, default=False)
    driver_recording_consent_at = Column(DateTime, nullable=True)
    passenger_recording_consent = Column(Boolean, default=False)
    passenger_recording_consent_at = Column(DateTime, nullable=True)
    mutual_recording_agreed = Column(Boolean, default=False)

    # Payment confirmation
    payment_method = Column(String(50), nullable=True)  # cash, venmo, paypal, zelle, other
    agreed_amount = Column(Float, nullable=True)
    driver_confirmed_payment = Column(Boolean, default=False)
    driver_confirmed_payment_at = Column(DateTime, nullable=True)
    passenger_confirmed_payment = Column(Boolean, default=False)
    passenger_confirmed_payment_at = Column(DateTime, nullable=True)
    payment_confirmed = Column(Boolean, default=False)

    # Identity verification codes
    driver_verification_code = Column(String(10), nullable=True)  # 4-digit code
    passenger_verification_code = Column(String(10), nullable=True)  # 4-digit code
    driver_verified_passenger = Column(Boolean, default=False)
    passenger_verified_driver = Column(Boolean, default=False)
    identity_verified = Column(Boolean, default=False)

    # Safety checklist acknowledgments
    driver_safety_checklist = Column(Boolean, default=False)
    passenger_safety_checklist = Column(Boolean, default=False)

    # Emergency contacts (optional, stored encrypted in production)
    driver_emergency_contact = Column(String(255), nullable=True)
    passenger_emergency_contact = Column(String(255), nullable=True)
    share_emergency_contacts = Column(Boolean, default=False)

    # Trip status
    trip_started = Column(Boolean, default=False)
    trip_started_at = Column(DateTime, nullable=True)
    trip_completed = Column(Boolean, default=False)
    trip_completed_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class RecordingConsentRequest(BaseModel):
    """Request to give recording consent"""
    match_id: str
    user_email: str
    user_role: str  # "driver" or "passenger"
    consent: bool = True

class PaymentConfirmationRequest(BaseModel):
    """Request to confirm payment"""
    match_id: str
    user_email: str
    user_role: str
    payment_method: Optional[str] = None  # cash, venmo, paypal, zelle, other
    amount: Optional[float] = None
    payment_details: Optional[str] = None  # e.g., Venmo username

class VerifyIdentityRequest(BaseModel):
    """Request to verify other party's identity"""
    match_id: str
    user_email: str
    user_role: str
    verification_code: str  # Code shown by other party

class SafetyChecklistRequest(BaseModel):
    """Request to acknowledge safety checklist"""
    match_id: str
    user_email: str
    user_role: str
    acknowledged_items: List[str]  # List of acknowledged items

class TripStatusRequest(BaseModel):
    """Request to update trip status"""
    match_id: str
    user_email: str
    user_role: str
    status: str  # "started" or "completed"

class EmergencyContactRequest(BaseModel):
    """Request to share emergency contact"""
    match_id: str
    user_email: str
    user_role: str
    emergency_contact_name: str
    emergency_contact_phone: str
    share_with_other_party: bool = False


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_verification_code() -> str:
    """Generate a 4-digit verification code"""
    return str(secrets.randbelow(9000) + 1000)  # 1000-9999

def get_or_create_safety_agreement(db: Session, match_id: str) -> TripSafetyAgreement:
    """Get existing or create new safety agreement for a match"""
    agreement = db.query(TripSafetyAgreement).filter(
        TripSafetyAgreement.match_id == match_id
    ).first()

    if not agreement:
        agreement = TripSafetyAgreement(
            agreement_id=f"SA-{uuid.uuid4().hex[:8].upper()}",
            match_id=match_id,
            driver_verification_code=generate_verification_code(),
            passenger_verification_code=generate_verification_code()
        )
        db.add(agreement)
        db.commit()
        db.refresh(agreement)

    return agreement


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.get("/info")
async def get_safety_info():
    """
    Get information about safety features.
    """
    return {
        "title": "Trip Safety Features",
        "disclaimer": SAFETY_DISCLAIMER,
        "features": [
            {
                "name": "Mutual Recording Consent",
                "description": "Both parties agree to allow audio/video recording for safety",
                "voluntary": True,
                "dollor_involvement": "None - private agreement between users"
            },
            {
                "name": "Payment Confirmation",
                "description": "Confirm payment method and amount before trip starts",
                "voluntary": True,
                "dollor_involvement": "None - Dollor.ai does not process payments"
            },
            {
                "name": "Identity Verification Codes",
                "description": "Exchange codes to verify you're meeting the right person",
                "voluntary": True,
                "dollor_involvement": "Generates random codes only"
            },
            {
                "name": "Safety Checklist",
                "description": "Acknowledge safety best practices before trip",
                "voluntary": True,
                "dollor_involvement": "Provides checklist - users responsible for safety"
            },
            {
                "name": "Emergency Contact Sharing",
                "description": "Optionally share emergency contact with other party",
                "voluntary": True,
                "dollor_involvement": "Facilitates sharing only"
            }
        ],
        "legal_model": "User-to-user safety tools, not platform guarantees"
    }


@router.get("/agreement/{match_id}")
async def get_safety_agreement(
    match_id: str,
    user_email: str,
    db: Session = Depends(get_db)
):
    """
    Get the current safety agreement status for a match.
    """
    agreement = get_or_create_safety_agreement(db, match_id)

    # Determine user role (would normally verify from match record)
    # For now, return full status

    return {
        "agreement_id": agreement.agreement_id,
        "match_id": agreement.match_id,

        "recording_consent": {
            "driver_consented": agreement.driver_recording_consent,
            "passenger_consented": agreement.passenger_recording_consent,
            "mutual_agreed": agreement.mutual_recording_agreed,
            "consent_text": RECORDING_CONSENT_TEXT
        },

        "payment": {
            "method": agreement.payment_method,
            "amount": agreement.agreed_amount,
            "driver_confirmed": agreement.driver_confirmed_payment,
            "passenger_confirmed": agreement.passenger_confirmed_payment,
            "payment_confirmed": agreement.payment_confirmed,
            "info": PAYMENT_METHODS_INFO
        },

        "identity_verification": {
            "driver_verified_passenger": agreement.driver_verified_passenger,
            "passenger_verified_driver": agreement.passenger_verified_driver,
            "both_verified": agreement.identity_verified,
            "instructions": (
                "When you meet, ask the other person to show their verification code. "
                "Enter the code they show you to confirm their identity. "
                "This helps ensure you're meeting the right person."
            )
        },

        "safety_checklist": {
            "driver_completed": agreement.driver_safety_checklist,
            "passenger_completed": agreement.passenger_safety_checklist
        },

        "trip_status": {
            "started": agreement.trip_started,
            "started_at": agreement.trip_started_at.isoformat() if agreement.trip_started_at else None,
            "completed": agreement.trip_completed,
            "completed_at": agreement.trip_completed_at.isoformat() if agreement.trip_completed_at else None
        },

        "disclaimer": SAFETY_DISCLAIMER
    }


@router.get("/my-verification-code/{match_id}")
async def get_my_verification_code(
    match_id: str,
    user_email: str,
    user_role: str,
    db: Session = Depends(get_db)
):
    """
    Get YOUR verification code to show the other party.
    The other party will enter this code to verify your identity.
    """
    agreement = get_or_create_safety_agreement(db, match_id)

    if user_role == "driver":
        code = agreement.driver_verification_code
    else:
        code = agreement.passenger_verification_code

    return {
        "your_code": code,
        "instructions": (
            f"When you meet the other party, show them this code: {code}. "
            "They will enter it in their app to confirm your identity. "
            "You should also ask them to show you THEIR code, which you'll enter in your app."
        ),
        "important": (
            "Do NOT share this code before meeting in person. "
            "This code helps confirm you're meeting the right person."
        )
    }


@router.post("/recording-consent")
async def give_recording_consent(
    request: RecordingConsentRequest,
    db: Session = Depends(get_db)
):
    """
    Give consent for mutual recording during the trip.
    Both parties must consent for mutual recording agreement.
    """
    agreement = get_or_create_safety_agreement(db, request.match_id)

    if request.user_role == "driver":
        agreement.driver_recording_consent = request.consent
        agreement.driver_recording_consent_at = datetime.utcnow() if request.consent else None
    else:
        agreement.passenger_recording_consent = request.consent
        agreement.passenger_recording_consent_at = datetime.utcnow() if request.consent else None

    # Check if both consented
    agreement.mutual_recording_agreed = (
        agreement.driver_recording_consent and agreement.passenger_recording_consent
    )

    db.commit()

    return {
        "success": True,
        "your_consent": request.consent,
        "mutual_recording_agreed": agreement.mutual_recording_agreed,
        "message": (
            "Both parties have agreed to mutual recording for safety."
            if agreement.mutual_recording_agreed
            else "Waiting for the other party to consent to recording."
        ),
        "legal_notice": (
            "This is a private agreement between you and the other party. "
            "Dollor.ai does not record, store, or access any recordings. "
            "Each party is responsible for complying with local recording laws."
        )
    }


@router.post("/confirm-payment")
async def confirm_payment(
    request: PaymentConfirmationRequest,
    db: Session = Depends(get_db)
):
    """
    Confirm payment has been arranged/received.
    Driver should confirm payment before starting the trip.
    """
    agreement = get_or_create_safety_agreement(db, request.match_id)

    # Update payment details if provided
    if request.payment_method:
        agreement.payment_method = request.payment_method
    if request.amount:
        agreement.agreed_amount = request.amount

    if request.user_role == "driver":
        agreement.driver_confirmed_payment = True
        agreement.driver_confirmed_payment_at = datetime.utcnow()
    else:
        agreement.passenger_confirmed_payment = True
        agreement.passenger_confirmed_payment_at = datetime.utcnow()

    # Check if both confirmed
    agreement.payment_confirmed = (
        agreement.driver_confirmed_payment and agreement.passenger_confirmed_payment
    )

    db.commit()

    return {
        "success": True,
        "payment_method": agreement.payment_method,
        "amount": agreement.agreed_amount,
        "driver_confirmed": agreement.driver_confirmed_payment,
        "passenger_confirmed": agreement.passenger_confirmed_payment,
        "payment_confirmed": agreement.payment_confirmed,
        "message": (
            "Both parties have confirmed payment arrangement."
            if agreement.payment_confirmed
            else f"{'Driver' if request.user_role == 'driver' else 'Passenger'} has confirmed. "
                 "Waiting for the other party."
        ),
        "important": (
            "Dollor.ai does NOT process payments. This confirmation is a communication "
            "tool between you and the other party. You are responsible for verifying "
            "that payment has been made/received."
        )
    }


@router.post("/verify-identity")
async def verify_identity(
    request: VerifyIdentityRequest,
    db: Session = Depends(get_db)
):
    """
    Verify the other party's identity by entering their code.
    """
    agreement = get_or_create_safety_agreement(db, request.match_id)

    # Driver verifies passenger (enters passenger's code)
    # Passenger verifies driver (enters driver's code)
    if request.user_role == "driver":
        correct_code = agreement.passenger_verification_code
        if request.verification_code == correct_code:
            agreement.driver_verified_passenger = True
            verified = True
        else:
            verified = False
    else:
        correct_code = agreement.driver_verification_code
        if request.verification_code == correct_code:
            agreement.passenger_verified_driver = True
            verified = True
        else:
            verified = False

    # Check if both verified
    agreement.identity_verified = (
        agreement.driver_verified_passenger and agreement.passenger_verified_driver
    )

    db.commit()

    if verified:
        return {
            "success": True,
            "verified": True,
            "both_verified": agreement.identity_verified,
            "message": (
                "Identity verified! Both parties have confirmed each other."
                if agreement.identity_verified
                else "Code correct! You've verified the other party. "
                     "Make sure they also verify you by showing them your code."
            )
        }
    else:
        return {
            "success": True,
            "verified": False,
            "message": (
                "Code does not match. Please ask the other party to show their code again. "
                "If codes don't match, you may not be meeting the right person. "
                "Trust your instincts and prioritize your safety."
            ),
            "safety_warning": (
                "If you cannot verify the other person's identity, consider not proceeding. "
                "Your safety is your responsibility."
            )
        }


@router.post("/safety-checklist")
async def acknowledge_safety_checklist(
    request: SafetyChecklistRequest,
    db: Session = Depends(get_db)
):
    """
    Acknowledge completion of safety checklist.
    """
    agreement = get_or_create_safety_agreement(db, request.match_id)

    # Required checklist items
    required_items = [
        "shared_plans_with_someone",
        "verified_identity",
        "confirmed_payment_method",
        "phone_charged",
        "meeting_in_safe_location"
    ]

    all_acknowledged = all(item in request.acknowledged_items for item in required_items)

    if request.user_role == "driver":
        agreement.driver_safety_checklist = all_acknowledged
    else:
        agreement.passenger_safety_checklist = all_acknowledged

    db.commit()

    return {
        "success": True,
        "checklist_complete": all_acknowledged,
        "acknowledged_items": request.acknowledged_items,
        "missing_items": [item for item in required_items if item not in request.acknowledged_items],
        "both_completed": agreement.driver_safety_checklist and agreement.passenger_safety_checklist,
        "reminder": (
            "These safety practices are recommendations. You are responsible for your own safety. "
            "Dollor.ai does not monitor or control trips."
        )
    }


@router.get("/safety-checklist-items")
async def get_safety_checklist_items():
    """
    Get the safety checklist items.
    """
    return {
        "title": "Pre-Trip Safety Checklist",
        "disclaimer": (
            "These are RECOMMENDATIONS to help protect yourself. "
            "Dollor.ai does not guarantee safety - you are responsible for your own safety."
        ),
        "items": [
            {
                "id": "shared_plans_with_someone",
                "title": "Share Your Plans",
                "description": "Tell a friend or family member where you're going, with whom, and when you expect to arrive.",
                "required": True
            },
            {
                "id": "verified_identity",
                "title": "Verify Identity",
                "description": "Use the verification code to confirm you're meeting the right person.",
                "required": True
            },
            {
                "id": "confirmed_payment_method",
                "title": "Confirm Payment",
                "description": "Agree on payment method and amount. Drivers: confirm payment before starting.",
                "required": True
            },
            {
                "id": "phone_charged",
                "title": "Phone Charged",
                "description": "Make sure your phone is charged and you have a way to contact someone if needed.",
                "required": True
            },
            {
                "id": "meeting_in_safe_location",
                "title": "Safe Meeting Location",
                "description": "Meet in a public, well-lit location. Don't share your home address until comfortable.",
                "required": True
            },
            {
                "id": "vehicle_matches_description",
                "title": "Vehicle Verification (Passengers)",
                "description": "Confirm the vehicle matches the description provided.",
                "required": False
            },
            {
                "id": "checked_reviews",
                "title": "Checked Reviews/References",
                "description": "If available, review any feedback or references for the other party.",
                "required": False
            },
            {
                "id": "backup_plan",
                "title": "Have a Backup Plan",
                "description": "Know what you'll do if something doesn't feel right.",
                "required": False
            }
        ]
    }


@router.post("/trip-status")
async def update_trip_status(
    request: TripStatusRequest,
    db: Session = Depends(get_db)
):
    """
    Update trip status (started/completed).
    """
    agreement = get_or_create_safety_agreement(db, request.match_id)

    if request.status == "started":
        agreement.trip_started = True
        agreement.trip_started_at = datetime.utcnow()
        message = "Trip marked as started."
    elif request.status == "completed":
        agreement.trip_completed = True
        agreement.trip_completed_at = datetime.utcnow()
        message = "Trip marked as completed."
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Use 'started' or 'completed'."
        )

    db.commit()

    return {
        "success": True,
        "message": message,
        "trip_status": {
            "started": agreement.trip_started,
            "started_at": agreement.trip_started_at.isoformat() if agreement.trip_started_at else None,
            "completed": agreement.trip_completed,
            "completed_at": agreement.trip_completed_at.isoformat() if agreement.trip_completed_at else None
        },
        "disclaimer": (
            "This status update is for your records only. Dollor.ai does not "
            "monitor or track trips. You are responsible for your own safety."
        )
    }


@router.post("/emergency-contact")
async def share_emergency_contact(
    request: EmergencyContactRequest,
    db: Session = Depends(get_db)
):
    """
    Share emergency contact with the other party (optional).
    """
    agreement = get_or_create_safety_agreement(db, request.match_id)

    contact_info = f"{request.emergency_contact_name}: {request.emergency_contact_phone}"

    if request.user_role == "driver":
        agreement.driver_emergency_contact = contact_info
    else:
        agreement.passenger_emergency_contact = contact_info

    if request.share_with_other_party:
        agreement.share_emergency_contacts = True

    db.commit()

    return {
        "success": True,
        "message": (
            "Emergency contact saved and shared with the other party."
            if request.share_with_other_party
            else "Emergency contact saved. Not shared with other party."
        ),
        "shared": request.share_with_other_party,
        "note": (
            "Sharing emergency contacts is optional and at your discretion. "
            "This information is stored only for this trip and shared only if you choose."
        )
    }


@router.get("/pre-trip-summary/{match_id}")
async def get_pre_trip_summary(
    match_id: str,
    user_email: str,
    user_role: str,
    db: Session = Depends(get_db)
):
    """
    Get a summary of all safety checks before starting the trip.
    This helps ensure all safety steps have been completed.
    """
    agreement = get_or_create_safety_agreement(db, match_id)

    # Get user's verification code to show
    my_code = (agreement.driver_verification_code
               if user_role == "driver"
               else agreement.passenger_verification_code)

    safety_status = {
        "recording_consent": {
            "status": "complete" if agreement.mutual_recording_agreed else "incomplete",
            "your_consent": (agreement.driver_recording_consent
                            if user_role == "driver"
                            else agreement.passenger_recording_consent),
            "other_party_consent": (agreement.passenger_recording_consent
                                   if user_role == "driver"
                                   else agreement.driver_recording_consent)
        },
        "payment": {
            "status": "confirmed" if agreement.payment_confirmed else "pending",
            "method": agreement.payment_method,
            "amount": agreement.agreed_amount,
            "you_confirmed": (agreement.driver_confirmed_payment
                             if user_role == "driver"
                             else agreement.passenger_confirmed_payment),
            "other_confirmed": (agreement.passenger_confirmed_payment
                               if user_role == "driver"
                               else agreement.driver_confirmed_payment)
        },
        "identity": {
            "status": "verified" if agreement.identity_verified else "pending",
            "your_code": my_code,
            "you_verified_them": (agreement.driver_verified_passenger
                                 if user_role == "driver"
                                 else agreement.passenger_verified_driver),
            "they_verified_you": (agreement.passenger_verified_driver
                                 if user_role == "driver"
                                 else agreement.driver_verified_passenger)
        },
        "safety_checklist": {
            "status": "complete" if (agreement.driver_safety_checklist
                                    if user_role == "driver"
                                    else agreement.passenger_safety_checklist) else "incomplete"
        }
    }

    # Calculate overall readiness
    ready_to_start = (
        agreement.payment_confirmed and
        agreement.identity_verified
    )

    recommendations = []
    if not agreement.mutual_recording_agreed:
        recommendations.append("Consider agreeing to mutual recording for added safety")
    if not agreement.payment_confirmed:
        recommendations.append("Confirm payment arrangement before starting")
    if not agreement.identity_verified:
        recommendations.append("Verify identity codes before starting")
    if user_role == "driver" and not agreement.driver_confirmed_payment:
        recommendations.append("IMPORTANT: As driver, confirm you received payment before starting")

    return {
        "match_id": match_id,
        "your_role": user_role,
        "safety_status": safety_status,
        "ready_to_start": ready_to_start,
        "recommendations": recommendations,
        "your_verification_code": my_code,
        "final_reminder": (
            "Before starting the trip:\n"
            "1. Verify the other person's identity with their code\n"
            "2. Confirm payment has been arranged/received\n"
            "3. Share your plans with someone you trust\n"
            "4. Trust your instincts - if something feels wrong, don't proceed\n\n"
            "IMPORTANT: You are responsible for your own safety. Dollor.ai does not "
            "monitor, control, or guarantee any aspect of this private arrangement."
        )
    }
