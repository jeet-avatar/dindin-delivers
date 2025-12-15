"""
DOLLOR.AI V4 - TRUE ZERO LIABILITY MODEL
=========================================

THE PROBLEM WITH DOORDASH/UBER MODEL:
- Platform pays drivers → Worker classification risk
- AB5 lawsuits in California
- Prop 22 battles
- $100M+ legal fees

THE DOLLOR.AI SOLUTION: MARKETPLACE FACILITATOR ONLY
====================================================

You are NOT in the delivery business.
You are NOT in the restaurant business.
You ARE a technology marketplace (like Craigslist, eBay, Etsy).

LEGAL STRUCTURE:
================

1. DOLLOR.AI = MARKETPLACE FACILITATOR
   - Connects customers with restaurants
   - Connects restaurants with delivery providers
   - Charges ACCESS FEE only ($1 per transaction)
   - Does NOT handle food payments
   - Does NOT employ or pay drivers
   - Protected by Section 230 CDA

2. PAYMENT FLOWS (You are NOT in the middle):

   Flow A - Food Payment:
   Customer ──────────────────────────> Restaurant
              (Apple Pay / Venmo / Cash)

   Flow B - Delivery Payment:
   Restaurant ─────────────────────────> Driver
              (Venmo / Zelle / Cash)

   Flow C - Platform Fee (YOUR ONLY REVENUE):
   Customer ─────> Dollor.ai ($1)
   Restaurant ───> Dollor.ai ($1)
   Driver ────────> Dollor.ai ($0) ← ZERO! Competitive advantage

   You only collect $2 per order. That's it.

3. DRIVER RELATIONSHIP:
   - Drivers are NOT your contractors
   - Drivers are NOT your employees
   - Drivers are INDEPENDENT BUSINESSES using your marketplace
   - Restaurant HIRES driver for each delivery (gig-to-gig)
   - You just show available jobs - like Indeed.com for delivery

4. WHY THIS IS LEGAL:
   - Craigslist model: You list jobs, you don't employ workers
   - eBay model: You connect buyers/sellers, you don't sell products
   - Etsy model: You're the marketplace, not the merchant
   - Section 230 CDA: Platform immunity for user content/transactions

5. WHO IS LIABLE FOR WHAT:
   - Food quality: Restaurant (not you)
   - Delivery issues: Restaurant hired the driver (not you)
   - Driver accidents: Driver's own insurance (not you)
   - Payment disputes: Between the two parties (not you)

TERMS OF SERVICE KEY CLAUSES:
============================

"Dollor.ai is a technology platform that connects users. We do not
provide delivery services, restaurant services, or employment. All
transactions occur directly between users. Dollor.ai is not a party
to any transaction between users."

"Delivery providers using this platform are independent businesses
offering services to restaurants. Dollor.ai does not employ, direct,
or control delivery providers in any way."

"The platform fee is for access to our marketplace technology only.
It is not payment for delivery services or food services."
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid
import logging

logger = logging.getLogger("dollor.v4")

router = APIRouter(prefix="/api/v4", tags=["Dollor V4 - Zero Liability"])


# =============================================================================
# CONFIGURATION - MARKETPLACE FEE ONLY
# =============================================================================

class DollorV4Config:
    """
    ONLY revenue is platform access fee.
    We do NOT touch food money or delivery money.
    """

    # Platform access fees (our ONLY revenue)
    CUSTOMER_ACCESS_FEE = 1.00   # $1 to use the app
    RESTAURANT_ACCESS_FEE = 1.00  # $1 per order facilitated
    DRIVER_ACCESS_FEE = 0.00      # $0 - FREE for drivers (competitive advantage)

    # Suggested delivery rates (we don't set these, just suggest)
    SUGGESTED_BASE_DELIVERY = 3.99
    SUGGESTED_PER_MILE = 0.75

    # We don't control these - restaurants and drivers negotiate
    # These are just defaults shown in the app


# =============================================================================
# MODELS
# =============================================================================

class DeliveryJobStatus(str, Enum):
    POSTED = "posted"              # Restaurant posted job
    CLAIMED = "claimed"            # Driver claimed job
    PICKED_UP = "picked_up"        # Driver picked up food
    DELIVERED = "delivered"        # Delivery complete
    CANCELLED = "cancelled"        # Job cancelled


class PostDeliveryJobRequest(BaseModel):
    """Restaurant posts a delivery job (like posting on Craigslist)"""
    restaurant_id: str
    restaurant_name: str
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    delivery_address: str
    delivery_lat: float
    delivery_lng: float
    customer_name: str
    customer_phone: str
    order_total: float  # For driver to know package value
    delivery_payment: float  # What restaurant will pay driver
    special_instructions: Optional[str] = None


class ClaimJobRequest(BaseModel):
    """Driver claims a delivery job"""
    driver_id: str
    driver_name: str
    driver_phone: str
    driver_vehicle: str
    estimated_pickup_time: int  # minutes


class DeliveryJob(BaseModel):
    job_id: str
    status: DeliveryJobStatus
    restaurant: Dict[str, Any]
    delivery: Dict[str, Any]
    payment: Dict[str, Any]
    driver: Optional[Dict[str, Any]] = None
    timestamps: Dict[str, str]


# =============================================================================
# IN-MEMORY STORAGE (Use database in production)
# =============================================================================

jobs_db: Dict[str, Dict] = {}
platform_fees_collected: List[Dict] = []


# =============================================================================
# DELIVERY JOB BOARD (Like Craigslist for Deliveries)
# =============================================================================

@router.post("/jobs/post")
async def post_delivery_job(request: PostDeliveryJobRequest):
    """
    RESTAURANT posts a delivery job.

    This is like posting a job on Craigslist or TaskRabbit.
    Dollor.ai is just the bulletin board.

    Legal note: We are NOT hiring the driver. The RESTAURANT is hiring.
    """
    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"

    # Calculate distance (simplified)
    # In production: Use Google Maps Distance Matrix API
    distance_miles = 3.0  # Placeholder

    job = {
        "job_id": job_id,
        "status": DeliveryJobStatus.POSTED,
        "restaurant": {
            "id": request.restaurant_id,
            "name": request.restaurant_name,
            "pickup_address": request.pickup_address,
            "pickup_lat": request.pickup_lat,
            "pickup_lng": request.pickup_lng,
        },
        "delivery": {
            "address": request.delivery_address,
            "lat": request.delivery_lat,
            "lng": request.delivery_lng,
            "customer_name": request.customer_name,
            "customer_phone": request.customer_phone,
            "distance_miles": distance_miles,
            "special_instructions": request.special_instructions,
        },
        "payment": {
            "order_total": request.order_total,
            "delivery_payment": request.delivery_payment,  # Restaurant pays driver
            "payment_method": "Direct from restaurant (Venmo/Zelle/Cash)",
            "platform_involved": False,  # We don't touch this money!
        },
        "driver": None,
        "timestamps": {
            "posted_at": datetime.utcnow().isoformat(),
        }
    }

    jobs_db[job_id] = job

    return {
        "job_id": job_id,
        "status": "posted",
        "message": "Delivery job posted to marketplace",
        "legal_note": "Driver will be hired by restaurant, not Dollor.ai",
        "next_step": "Wait for driver to claim job",
        "estimated_driver_claim_time": "2-5 minutes"
    }


@router.get("/jobs/available")
async def get_available_jobs(
    driver_lat: float,
    driver_lng: float,
    max_distance_miles: float = 10.0
):
    """
    DRIVER views available delivery jobs.

    Like browsing Craigslist job listings.
    Driver chooses which jobs to accept.

    Legal note: Driver is an independent business choosing work opportunities.
    """
    available_jobs = []

    for job_id, job in jobs_db.items():
        if job["status"] == DeliveryJobStatus.POSTED:
            # Calculate distance from driver (simplified)
            # In production: Use proper distance calculation
            pickup_lat = job["restaurant"]["pickup_lat"]
            pickup_lng = job["restaurant"]["pickup_lng"]

            # Simplified distance (Haversine in production)
            distance_to_pickup = abs(driver_lat - pickup_lat) + abs(driver_lng - pickup_lng)
            distance_miles = distance_to_pickup * 69  # Rough conversion

            if distance_miles <= max_distance_miles:
                available_jobs.append({
                    "job_id": job_id,
                    "restaurant_name": job["restaurant"]["name"],
                    "pickup_address": job["restaurant"]["pickup_address"],
                    "delivery_address": job["delivery"]["address"],
                    "delivery_distance_miles": job["delivery"]["distance_miles"],
                    "distance_to_pickup_miles": round(distance_miles, 1),
                    "payment": {
                        "amount": job["payment"]["delivery_payment"],
                        "paid_by": "Restaurant (direct)",
                        "method": "Venmo/Zelle/Cash",
                    },
                    "posted_at": job["timestamps"]["posted_at"],
                })

    return {
        "available_jobs": available_jobs,
        "total_count": len(available_jobs),
        "legal_note": "You are an independent delivery provider. "
                      "Accepting a job creates a contract between you and the restaurant, "
                      "not with Dollor.ai.",
        "driver_tip": "Higher-paying jobs go fast. Claim quickly!"
    }


@router.post("/jobs/{job_id}/claim")
async def claim_delivery_job(job_id: str, request: ClaimJobRequest):
    """
    DRIVER claims a delivery job.

    This creates a contract between DRIVER and RESTAURANT.
    Dollor.ai is NOT a party to this contract.

    Legal note: Restaurant is hiring driver. We're just the job board.
    """
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs_db[job_id]

    if job["status"] != DeliveryJobStatus.POSTED:
        raise HTTPException(status_code=400, detail="Job already claimed")

    # Update job with driver info
    job["status"] = DeliveryJobStatus.CLAIMED
    job["driver"] = {
        "id": request.driver_id,
        "name": request.driver_name,
        "phone": request.driver_phone,
        "vehicle": request.driver_vehicle,
        "estimated_pickup_time": request.estimated_pickup_time,
    }
    job["timestamps"]["claimed_at"] = datetime.utcnow().isoformat()

    return {
        "job_id": job_id,
        "status": "claimed",
        "message": "You've accepted this delivery job",
        "contract_parties": {
            "employer": job["restaurant"]["name"],  # Restaurant hires driver
            "service_provider": request.driver_name,  # Driver provides service
            "marketplace": "Dollor.ai (facilitator only)",  # We're just the platform
        },
        "payment_info": {
            "amount": job["payment"]["delivery_payment"],
            "paid_by": job["restaurant"]["name"],
            "payment_method": "Direct (Venmo/Zelle/Cash)",
            "when": "Upon delivery completion",
            "dollor_involvement": "NONE - payment is between you and restaurant",
        },
        "next_steps": [
            f"Head to {job['restaurant']['pickup_address']}",
            f"Pick up order for {job['delivery']['customer_name']}",
            f"Deliver to {job['delivery']['address']}",
            f"Collect ${job['payment']['delivery_payment']:.2f} from restaurant",
        ],
        "legal_acknowledgment": "By claiming this job, you acknowledge that you are "
                                 "entering into a service agreement with the restaurant, "
                                 "not with Dollor.ai. You are an independent business."
    }


@router.post("/jobs/{job_id}/pickup")
async def mark_pickup(job_id: str, driver_id: str):
    """Driver confirms food pickup"""
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs_db[job_id]

    if job["driver"]["id"] != driver_id:
        raise HTTPException(status_code=403, detail="Not your job")

    job["status"] = DeliveryJobStatus.PICKED_UP
    job["timestamps"]["picked_up_at"] = datetime.utcnow().isoformat()

    return {
        "status": "picked_up",
        "next_step": f"Deliver to {job['delivery']['address']}",
        "customer_phone": job["delivery"]["customer_phone"],
    }


@router.post("/jobs/{job_id}/complete")
async def complete_delivery(
    job_id: str,
    driver_id: str,
    payment_received: bool,
    payment_method: str  # "venmo", "zelle", "cash"
):
    """
    Driver marks delivery complete.

    Payment happened directly between restaurant and driver.
    Dollor.ai was not involved in the payment.
    """
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs_db[job_id]

    if job["driver"]["id"] != driver_id:
        raise HTTPException(status_code=403, detail="Not your job")

    job["status"] = DeliveryJobStatus.DELIVERED
    job["timestamps"]["delivered_at"] = datetime.utcnow().isoformat()
    job["payment"]["payment_received"] = payment_received
    job["payment"]["actual_payment_method"] = payment_method

    return {
        "status": "delivered",
        "job_id": job_id,
        "earnings": {
            "delivery_payment": job["payment"]["delivery_payment"],
            "paid_by": job["restaurant"]["name"],
            "payment_method": payment_method,
            "dollor_fee_deducted": 0.00,  # We take NOTHING from drivers
        },
        "message": "Delivery complete! Payment was between you and the restaurant.",
        "legal_summary": {
            "who_paid_you": job["restaurant"]["name"],
            "who_employed_you": job["restaurant"]["name"],
            "dollor_role": "Marketplace facilitator only",
            "tax_responsibility": "You are responsible for your own taxes as an independent business",
        }
    }


# =============================================================================
# PLATFORM ACCESS FEE (OUR ONLY REVENUE)
# =============================================================================

@router.post("/platform-fee/customer")
async def charge_customer_platform_fee(
    customer_id: str,
    customer_email: str,
    payment_method_id: str  # Stripe payment method
):
    """
    Charge customer $1 platform access fee.

    This is our ONLY interaction with customer payments.
    We do NOT touch food payments - those go direct to restaurant.
    """
    fee_id = f"FEE-{uuid.uuid4().hex[:8].upper()}"

    # In production: Use Stripe to charge $1
    # stripe.PaymentIntent.create(
    #     amount=100,  # $1.00 in cents
    #     currency="usd",
    #     customer=customer_id,
    #     payment_method=payment_method_id,
    #     description="Dollor.ai marketplace access fee",
    #     metadata={"type": "platform_access", "user_type": "customer"}
    # )

    fee_record = {
        "fee_id": fee_id,
        "type": "customer_access",
        "amount": DollorV4Config.CUSTOMER_ACCESS_FEE,
        "customer_id": customer_id,
        "timestamp": datetime.utcnow().isoformat(),
        "description": "Marketplace access fee - NOT payment for food or delivery",
    }

    platform_fees_collected.append(fee_record)

    return {
        "fee_id": fee_id,
        "amount": DollorV4Config.CUSTOMER_ACCESS_FEE,
        "description": "Platform access fee",
        "legal_note": "This fee is for access to the Dollor.ai marketplace. "
                      "It is NOT payment for food or delivery services. "
                      "Food payment goes directly to restaurant.",
    }


@router.post("/platform-fee/restaurant")
async def charge_restaurant_platform_fee(
    restaurant_id: str,
    order_id: str
):
    """
    Charge restaurant $1 platform fee per order facilitated.

    This is a marketplace listing/facilitation fee.
    Like eBay charging sellers a listing fee.
    """
    fee_id = f"FEE-{uuid.uuid4().hex[:8].upper()}"

    fee_record = {
        "fee_id": fee_id,
        "type": "restaurant_facilitation",
        "amount": DollorV4Config.RESTAURANT_ACCESS_FEE,
        "restaurant_id": restaurant_id,
        "order_id": order_id,
        "timestamp": datetime.utcnow().isoformat(),
        "description": "Order facilitation fee - marketplace access",
    }

    platform_fees_collected.append(fee_record)

    return {
        "fee_id": fee_id,
        "amount": DollorV4Config.RESTAURANT_ACCESS_FEE,
        "description": "Order facilitation fee",
        "comparison": "Like eBay's seller fee or Etsy's listing fee",
    }


# =============================================================================
# LEGAL DOCUMENTATION ENDPOINTS
# =============================================================================

@router.get("/legal/driver-agreement")
async def get_driver_agreement():
    """
    Driver independent business agreement.

    This explicitly states drivers are NOT our employees/contractors.
    """
    return {
        "agreement_version": "1.0",
        "last_updated": "2024-01-15",
        "title": "Independent Delivery Provider Agreement",

        "key_terms": {
            "relationship": {
                "statement": "You are an independent business using the Dollor.ai marketplace.",
                "not_employee": "You are NOT an employee of Dollor.ai.",
                "not_contractor": "You are NOT an independent contractor OF Dollor.ai.",
                "your_clients": "Your clients are the restaurants who post delivery jobs.",
            },

            "how_it_works": {
                "step_1": "Restaurants post delivery jobs on our marketplace",
                "step_2": "You browse and choose which jobs to accept",
                "step_3": "When you accept, you enter a contract with THE RESTAURANT",
                "step_4": "Restaurant pays you directly (not through us)",
                "step_5": "We are just the technology platform connecting you",
            },

            "payment": {
                "who_pays_you": "The restaurant that posted the job",
                "how_paid": "Direct payment (Venmo, Zelle, Cash, etc.)",
                "dollor_fee": "$0 - We charge drivers NOTHING",
                "our_revenue": "We charge customers and restaurants a platform fee",
            },

            "your_responsibilities": {
                "taxes": "You are responsible for your own tax obligations",
                "insurance": "You must maintain your own vehicle/liability insurance",
                "licenses": "You must have valid driver's license",
                "compliance": "You must comply with local delivery regulations",
            },

            "we_do_not": [
                "Employ you or direct your work",
                "Set your hours or require minimum deliveries",
                "Provide equipment, uniforms, or training",
                "Pay you or withhold taxes",
                "Provide benefits, workers comp, or unemployment",
                "Control how you perform deliveries",
                "Require exclusivity - work for anyone you want",
            ],
        },

        "legal_classification": {
            "irs_classification": "You are a self-employed individual",
            "tax_form": "You will NOT receive a 1099 from Dollor.ai",
            "reason": "We do not pay you - restaurants pay you directly",
            "your_1099s": "You may receive 1099s from restaurants if applicable",
        },

        "acknowledgment_required": True,
    }


@router.get("/legal/platform-terms")
async def get_platform_terms():
    """Platform terms of service - establishes marketplace-only relationship"""
    return {
        "version": "1.0",
        "effective_date": "2024-01-15",

        "what_we_are": {
            "definition": "Dollor.ai is a technology marketplace platform",
            "function": "We connect customers with restaurants, and restaurants with delivery providers",
            "revenue": "We charge a platform access fee for use of our technology",
        },

        "what_we_are_not": {
            "not_restaurant": "We do not prepare, sell, or deliver food",
            "not_delivery_company": "We do not provide delivery services",
            "not_employer": "We do not employ delivery drivers",
            "not_payment_processor": "We do not process food or delivery payments",
        },

        "user_transactions": {
            "statement": "All transactions between users are solely between those users",
            "food_payment": "Food payments go directly from customer to restaurant",
            "delivery_payment": "Delivery payments go directly from restaurant to driver",
            "platform_fee": "Platform fee is separate and is for marketplace access only",
        },

        "liability_disclaimer": {
            "food_quality": "Restaurant is solely responsible for food quality and safety",
            "delivery_issues": "Restaurant and driver are responsible for delivery",
            "accidents": "Driver is responsible for their own insurance and accidents",
            "disputes": "Disputes between users should be resolved between those users",
        },

        "section_230_notice": {
            "statement": "Dollor.ai is an interactive computer service provider",
            "protection": "We are protected under Section 230 of the Communications Decency Act",
            "user_content": "Users are responsible for their own content and transactions",
        },
    }


# =============================================================================
# BUSINESS METRICS (Investor Dashboard)
# =============================================================================

@router.get("/metrics/investor-summary")
async def get_investor_summary():
    """
    Investor-friendly metrics showing the business model works.
    """
    return {
        "business_model": {
            "type": "Pure Marketplace (like Craigslist, eBay)",
            "revenue_source": "Platform access fees only",
            "food_payments": "We don't touch (customer → restaurant direct)",
            "delivery_payments": "We don't touch (restaurant → driver direct)",
        },

        "unit_economics": {
            "revenue_per_order": 2.00,  # $1 customer + $1 restaurant
            "cost_per_order": {
                "infrastructure": 0.05,
                "ai_processing": 0.02,
                "payment_processing": 0.03,  # Only on our $2 fee
                "total": 0.10,
            },
            "profit_per_order": 1.90,
            "gross_margin": "95%",
        },

        "legal_advantages": {
            "worker_classification": "N/A - We don't employ workers",
            "ab5_risk": "ZERO - Drivers work for restaurants",
            "liability": "Marketplace immunity (Section 230)",
            "money_transmission": "N/A - We don't move food/delivery money",
        },

        "competitive_advantages": {
            "driver_fee": "$0 (vs 20-25% at competitors)",
            "restaurant_fee": "$1 flat (vs 15-30% at competitors)",
            "legal_risk": "Near-zero (pure marketplace)",
            "scalability": "Infinite (no worker management)",
        },

        "comparison_to_competitors": {
            "doordash": {
                "their_model": "Pay drivers → employment risk",
                "their_lawsuits": "$100M+ in AB5/classification suits",
                "our_advantage": "Restaurants pay drivers directly",
            },
            "uber_eats": {
                "their_model": "Take 30% from restaurants",
                "their_problem": "Restaurants hate them",
                "our_advantage": "$1 flat fee, restaurants love us",
            },
        },
    }


# =============================================================================
# DRIVER PAYMENT TRACKING (For driver's records, not our books)
# =============================================================================

@router.get("/driver/{driver_id}/earnings")
async def get_driver_earnings(driver_id: str):
    """
    Show driver their earnings.

    Note: These payments were from RESTAURANTS, not from us.
    We track this as a service to drivers, not because we paid them.
    """
    # Get completed jobs for this driver
    driver_jobs = [
        job for job in jobs_db.values()
        if job.get("driver", {}).get("id") == driver_id
        and job["status"] == DeliveryJobStatus.DELIVERED
    ]

    total_earnings = sum(job["payment"]["delivery_payment"] for job in driver_jobs)

    return {
        "driver_id": driver_id,
        "total_deliveries": len(driver_jobs),
        "total_earnings": total_earnings,

        "earnings_breakdown": [
            {
                "job_id": job["job_id"],
                "restaurant": job["restaurant"]["name"],
                "amount": job["payment"]["delivery_payment"],
                "payment_method": job["payment"].get("actual_payment_method", "direct"),
                "date": job["timestamps"].get("delivered_at"),
            }
            for job in driver_jobs
        ],

        "important_tax_info": {
            "paid_by": "Individual restaurants (not Dollor.ai)",
            "1099_from_us": "NO - We did not pay you",
            "your_responsibility": "Track earnings for your own tax filing",
            "classification": "Self-employed income",
        },

        "dollor_fees_charged": {
            "amount": 0.00,
            "note": "Dollor.ai charges drivers $0. Always.",
        }
    }
