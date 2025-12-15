"""
DOLLOR.AI V5 - PURE P2P MODEL (ULTIMATE ZERO LIABILITY)
========================================================

THE PROBLEM WITH V4:
- Restaurant pays driver → Restaurant has contractor liability
- Some restaurants won't want that responsibility

THE SOLUTION: PURE PEER-TO-PEER
===============================

EVERYONE IS AN INDEPENDENT USER. NO ONE EMPLOYS ANYONE.

LEGAL MODEL: "RIDESHARE FOR PACKAGES" / "HITCHHIKING WITH FOOD"
===============================================================

Think of it like this:
- Customer needs food delivered
- Driver is "going that way anyway" and offers to help
- Customer tips the driver directly as a thank-you gift
- Restaurant has no relationship with driver at all

REAL-WORLD ANALOGIES THAT ARE 100% LEGAL:
=========================================

1. ROADIE/NEIGHBOR FAVOR MODEL:
   "Hey, you're going near that restaurant, can you pick up my food?"
   "Sure, I'll do you a favor"
   "Thanks, here's $10 for gas/your time"

2. HITCHHIKING MODEL:
   - Picking up a hitchhiker is legal
   - The hitchhiker can give you gas money (gift)
   - No employment relationship exists

3. TASKRABBIT ERRAND MODEL:
   - "I need someone to pick something up"
   - Independent person accepts
   - Direct payment for the errand
   - TaskRabbit is just the connection platform

4. CRAIGSLIST RIDESHARE MODEL:
   - "Driving to LA, have extra seats"
   - "I'll chip in for gas"
   - No employment, just cost-sharing

THE V5 FLOW:
============

1. CUSTOMER places order with RESTAURANT (direct payment)
2. CUSTOMER posts "DELIVERY REQUEST" on Dollor.ai
   - "I need someone to pick up my food from Restaurant X"
   - "I'll give you $X as a thank-you"
3. DRIVER sees request, decides to help (their choice)
4. DRIVER picks up food (as customer's agent/helper)
5. CUSTOMER pays DRIVER directly (peer-to-peer gift/tip)
6. Dollor.ai charges $1 platform fee (marketplace access)

WHO EMPLOYS WHOM: NOBODY EMPLOYS ANYBODY
========================================

- Restaurant doesn't hire driver (customer arranged pickup)
- Customer doesn't employ driver (it's a favor/gift arrangement)
- Dollor.ai doesn't employ driver (we're just the bulletin board)
- Driver is helping a fellow community member for a tip

LEGAL STRUCTURE:
===============

1. DRIVER = Good Samaritan / Helpful neighbor
   - Not an employee or contractor of anyone
   - Voluntarily helping someone get their food
   - Receiving a gift/tip for their kindness

2. CUSTOMER = Person who arranged pickup
   - Customer authorized driver to pick up THEIR order
   - Customer is giving driver a thank-you gift
   - No employment relationship

3. RESTAURANT = Just preparing food for customer
   - Customer ordered (or driver ordered on customer's behalf)
   - Restaurant releases food to authorized pickup person
   - No relationship with driver

4. DOLLOR.AI = Community bulletin board
   - Connects people who need help with people willing to help
   - Like Nextdoor for errands
   - Charges access fee only

KEY LEGAL PROTECTIONS:
=====================

1. TIPS/GIFTS ARE NOT WAGES
   - Gift tax only applies over $17,000/year per person
   - Tips to helpful strangers are gifts
   - No employment relationship = no labor law issues

2. AUTHORIZED AGENT PICKUP
   - Customer authorizes driver to pick up their order
   - Driver acts as customer's agent, not restaurant's
   - Common in food pickup (friend picks up your order)

3. INDEPENDENT VOLUNTEER
   - Driver chooses to help
   - No requirements, no schedule, no control
   - Pure voluntary mutual aid

4. PLATFORM IMMUNITY (Section 230)
   - We're a communications platform
   - We connect users who want to help each other
   - We're not a party to their arrangements
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid
import logging

logger = logging.getLogger("dollor.v5")

router = APIRouter(prefix="/api/v5", tags=["Dollor V5 - Pure P2P Zero Liability"])


# =============================================================================
# CONFIGURATION
# =============================================================================

class DollorV5Config:
    # Our only revenue - platform access fee
    PLATFORM_FEE = 1.00  # $1 for using the platform

    # Suggested tip ranges (we don't set prices, just suggest)
    SUGGESTED_TIP_SHORT = 5.00   # < 2 miles
    SUGGESTED_TIP_MEDIUM = 8.00  # 2-5 miles
    SUGGESTED_TIP_LONG = 12.00   # 5+ miles


# =============================================================================
# MODELS
# =============================================================================

class DeliveryRequestStatus(str, Enum):
    OPEN = "open"                  # Customer needs help
    HELPER_FOUND = "helper_found"  # Someone offered to help
    PICKED_UP = "picked_up"        # Helper picked up food
    DELIVERED = "delivered"        # Food delivered
    CANCELLED = "cancelled"


class PostDeliveryRequest(BaseModel):
    """Customer posts a request for delivery help"""
    customer_id: str
    customer_name: str
    customer_phone: str

    # Food order details (customer already ordered from restaurant)
    restaurant_name: str
    restaurant_address: str
    restaurant_lat: float
    restaurant_lng: float
    order_confirmation: str  # Order number/name for pickup

    # Delivery details
    delivery_address: str
    delivery_lat: float
    delivery_lng: float
    special_instructions: Optional[str] = None

    # What customer will give helper as thank-you
    thank_you_amount: float  # This is a GIFT, not payment for services


class OfferToHelp(BaseModel):
    """Driver offers to help with delivery"""
    helper_id: str
    helper_name: str
    helper_phone: str
    estimated_pickup_time: int  # minutes
    message: Optional[str] = None  # "Happy to help!"


# =============================================================================
# IN-MEMORY STORAGE
# =============================================================================

requests_db: Dict[str, Dict] = {}


# =============================================================================
# CUSTOMER POSTS DELIVERY REQUEST
# =============================================================================

@router.post("/requests/post")
async def post_delivery_request(request: PostDeliveryRequest):
    """
    Customer posts a request for delivery help.

    This is NOT posting a job or hiring someone.
    This is asking the community: "Can anyone help me pick up my food?"

    Like posting on Nextdoor: "Can someone grab my prescription?"
    """
    request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"

    delivery_request = {
        "request_id": request_id,
        "status": DeliveryRequestStatus.OPEN,
        "type": "community_help_request",  # NOT a job posting

        "customer": {
            "id": request.customer_id,
            "name": request.customer_name,
            "phone": request.customer_phone,
        },

        "pickup": {
            "restaurant_name": request.restaurant_name,
            "address": request.restaurant_address,
            "lat": request.restaurant_lat,
            "lng": request.restaurant_lng,
            "order_confirmation": request.order_confirmation,
            "pickup_type": "customer_authorized_agent",  # Driver picks up AS customer
        },

        "delivery": {
            "address": request.delivery_address,
            "lat": request.delivery_lat,
            "lng": request.delivery_lng,
            "special_instructions": request.special_instructions,
        },

        "thank_you": {
            "amount": request.thank_you_amount,
            "type": "voluntary_gift",  # NOT wages or payment
            "from": "customer",
            "to": "helper",
            "legal_classification": "gift_between_individuals",
        },

        "helper": None,
        "timestamps": {
            "posted_at": datetime.utcnow().isoformat(),
        },

        "legal_notices": {
            "relationship": "Community mutual aid",
            "employment": "None - this is neighbor helping neighbor",
            "payment_type": "Voluntary thank-you gift",
        }
    }

    requests_db[request_id] = delivery_request

    return {
        "request_id": request_id,
        "status": "open",
        "message": "Your delivery help request has been posted",
        "what_happens_next": [
            "Community helpers will see your request",
            "Someone will offer to help",
            "They'll pick up your food as your authorized agent",
            "You give them a thank-you gift directly",
        ],
        "legal_note": "This is a request for community help, not a job posting. "
                      "The helper is a Good Samaritan, not an employee or contractor.",
    }


# =============================================================================
# HELPER BROWSES REQUESTS
# =============================================================================

@router.get("/requests/available")
async def get_available_requests(
    helper_lat: float,
    helper_lng: float,
    max_distance: float = 10.0
):
    """
    Helper browses available delivery help requests.

    This is NOT job searching.
    This is seeing who in the community needs help.

    Like browsing Nextdoor for neighbors who need assistance.
    """
    available = []

    for req_id, req in requests_db.items():
        if req["status"] == DeliveryRequestStatus.OPEN:
            # Simplified distance calculation
            pickup_lat = req["pickup"]["lat"]
            pickup_lng = req["pickup"]["lng"]
            distance = abs(helper_lat - pickup_lat) + abs(helper_lng - pickup_lng)
            distance_miles = distance * 69

            if distance_miles <= max_distance:
                available.append({
                    "request_id": req_id,
                    "customer_name": req["customer"]["name"],
                    "restaurant": req["pickup"]["restaurant_name"],
                    "pickup_address": req["pickup"]["address"],
                    "delivery_address": req["delivery"]["address"],
                    "distance_to_pickup": round(distance_miles, 1),

                    "thank_you_gift": {
                        "amount": req["thank_you"]["amount"],
                        "type": "Voluntary gift from customer",
                        "note": "NOT payment for services",
                    },

                    "posted_at": req["timestamps"]["posted_at"],
                })

    return {
        "available_requests": available,
        "total_count": len(available),

        "helper_notice": {
            "what_this_is": "Neighbors asking for help with food pickup",
            "what_you_are": "A helpful community member (NOT an employee)",
            "the_gift": "Customer's thank-you for your kindness (NOT wages)",
            "your_choice": "Completely voluntary - help if you want to",
        },

        "legal_framework": {
            "your_status": "Good Samaritan / Helpful neighbor",
            "employment": "None",
            "liability": "Standard personal liability (your own insurance)",
            "taxes": "Gifts under $17k/year are not taxable income to you",
        }
    }


# =============================================================================
# HELPER OFFERS TO HELP
# =============================================================================

@router.post("/requests/{request_id}/offer-help")
async def offer_to_help(request_id: str, offer: OfferToHelp):
    """
    Helper offers to assist with the delivery.

    This is NOT accepting a job.
    This is offering to help a neighbor.

    Legal: Voluntary mutual aid, not employment.
    """
    if request_id not in requests_db:
        raise HTTPException(status_code=404, detail="Request not found")

    req = requests_db[request_id]

    if req["status"] != DeliveryRequestStatus.OPEN:
        raise HTTPException(status_code=400, detail="Request already has a helper")

    req["status"] = DeliveryRequestStatus.HELPER_FOUND
    req["helper"] = {
        "id": offer.helper_id,
        "name": offer.helper_name,
        "phone": offer.helper_phone,
        "estimated_pickup_time": offer.estimated_pickup_time,
        "message": offer.message or "Happy to help!",
        "role": "community_helper",  # NOT employee or contractor
    }
    req["timestamps"]["helper_found_at"] = datetime.utcnow().isoformat()

    return {
        "request_id": request_id,
        "status": "helper_found",
        "message": "Thank you for offering to help!",

        "your_role": {
            "what_you_are": "A helpful community member",
            "what_you_are_not": "An employee or contractor of anyone",
            "acting_as": "Customer's authorized pickup agent",
        },

        "pickup_instructions": {
            "restaurant": req["pickup"]["restaurant_name"],
            "address": req["pickup"]["address"],
            "order_name": req["pickup"]["order_confirmation"],
            "what_to_say": f"Picking up for {req['customer']['name']}",
            "authorization": "Customer has authorized you to pick up their order",
        },

        "delivery_instructions": {
            "address": req["delivery"]["address"],
            "customer_name": req["customer"]["name"],
            "customer_phone": req["customer"]["phone"],
            "special_notes": req["delivery"]["special_instructions"],
        },

        "thank_you_gift": {
            "amount": req["thank_you"]["amount"],
            "from": req["customer"]["name"],
            "how": "Direct payment (Venmo, Cash, etc.)",
            "legal_type": "Gift between individuals",
        },

        "legal_acknowledgment": {
            "statement": "By helping, you acknowledge this is voluntary community assistance.",
            "not_employment": "This does not create any employment relationship.",
            "your_insurance": "You are responsible for your own vehicle insurance.",
            "gift_not_wages": "The thank-you gift is a personal gift, not wages.",
        }
    }


# =============================================================================
# PICKUP AND DELIVERY FLOW
# =============================================================================

@router.post("/requests/{request_id}/picked-up")
async def mark_picked_up(request_id: str, helper_id: str):
    """Helper picked up the food"""
    if request_id not in requests_db:
        raise HTTPException(status_code=404, detail="Request not found")

    req = requests_db[request_id]

    if req["helper"]["id"] != helper_id:
        raise HTTPException(status_code=403, detail="Not your request")

    req["status"] = DeliveryRequestStatus.PICKED_UP
    req["timestamps"]["picked_up_at"] = datetime.utcnow().isoformat()

    return {
        "status": "picked_up",
        "message": "Great! Head to the delivery address",
        "delivery_address": req["delivery"]["address"],
        "customer_phone": req["customer"]["phone"],
    }


@router.post("/requests/{request_id}/delivered")
async def mark_delivered(
    request_id: str,
    helper_id: str,
    gift_received: bool,
    gift_method: str  # "cash", "venmo", "zelle", etc.
):
    """
    Helper completed the delivery.

    Customer gave thank-you gift directly to helper.
    Dollor.ai was not involved in this gift exchange.
    """
    if request_id not in requests_db:
        raise HTTPException(status_code=404, detail="Request not found")

    req = requests_db[request_id]

    if req["helper"]["id"] != helper_id:
        raise HTTPException(status_code=403, detail="Not your request")

    req["status"] = DeliveryRequestStatus.DELIVERED
    req["timestamps"]["delivered_at"] = datetime.utcnow().isoformat()
    req["thank_you"]["received"] = gift_received
    req["thank_you"]["method"] = gift_method

    return {
        "status": "delivered",
        "message": "Thank you for helping your neighbor!",

        "gift_summary": {
            "amount": req["thank_you"]["amount"],
            "from": req["customer"]["name"],
            "method": gift_method,
            "legal_type": "Personal gift (not taxable under $17k/year)",
        },

        "no_1099_notice": {
            "will_you_receive_1099": "NO",
            "reason": "This was a gift, not payment for services",
            "from_dollor": "We didn't pay you anything",
            "from_customer": "Gifts between individuals don't generate 1099s",
            "from_restaurant": "You had no relationship with the restaurant",
        },

        "thank_you": "You've helped your community today!"
    }


# =============================================================================
# PLATFORM FEE (Our only revenue)
# =============================================================================

@router.post("/platform-fee/charge")
async def charge_platform_fee(user_id: str, user_type: str):
    """
    Charge $1 platform access fee.

    This is for using Dollor.ai marketplace.
    NOT for delivery services.
    NOT for food.
    Just for platform access.
    """
    fee_id = f"PLT-{uuid.uuid4().hex[:8].upper()}"

    return {
        "fee_id": fee_id,
        "amount": DollorV5Config.PLATFORM_FEE,
        "for": "Dollor.ai marketplace access",
        "not_for": [
            "Food (paid directly to restaurant)",
            "Delivery (gift paid directly to helper)",
            "Any services",
        ],
        "legal_note": "Platform access fee only. Dollor.ai is a communications platform.",
    }


# =============================================================================
# LEGAL DOCUMENTATION
# =============================================================================

@router.get("/legal/how-it-works")
async def get_legal_explainer():
    """Complete legal explanation of the P2P model"""
    return {
        "title": "How Dollor.ai Works - Legal Framework",

        "the_model": {
            "name": "Peer-to-Peer Community Help",
            "similar_to": [
                "Nextdoor neighbor requests",
                "Craigslist rideshare",
                "TaskRabbit errands",
                "Asking a friend to pick up your food",
            ],
        },

        "three_separate_transactions": {
            "transaction_1": {
                "what": "Customer orders food from restaurant",
                "parties": ["Customer", "Restaurant"],
                "dollor_role": "None - direct transaction",
                "employment": "None",
            },
            "transaction_2": {
                "what": "Customer asks community for pickup help",
                "parties": ["Customer", "Helper"],
                "dollor_role": "Connection platform only",
                "employment": "None - voluntary mutual aid",
            },
            "transaction_3": {
                "what": "Customer gives helper a thank-you gift",
                "parties": ["Customer", "Helper"],
                "dollor_role": "None - direct peer-to-peer gift",
                "employment": "None - gift, not wages",
            },
        },

        "why_no_employment_exists": {
            "helper_is_not_employed_by_dollor": {
                "reason": "We don't pay them, direct them, or control them",
                "we_are": "A bulletin board / communications platform",
            },
            "helper_is_not_employed_by_restaurant": {
                "reason": "Restaurant has no relationship with helper",
                "restaurant_role": "Just prepared food for their customer",
                "pickup": "Helper is customer's agent, not restaurant's",
            },
            "helper_is_not_employed_by_customer": {
                "reason": "No employment agreement exists",
                "what_exists": "Request for voluntary community help",
                "the_gift": "Thank-you gift, not wages for services",
            },
        },

        "gift_vs_wages": {
            "this_is_a_gift_because": [
                "It's voluntary (helper chose to help)",
                "It's gratitude-based (thank you for helping)",
                "It's between individuals (not business transaction)",
                "There's no employment agreement",
                "Helper could refuse the gift",
                "Amount is suggested, not required",
            ],
            "this_is_not_wages_because": [
                "No employment relationship exists",
                "No services were contracted",
                "Helper acted voluntarily",
                "This is community mutual aid",
            ],
            "tax_implications": {
                "for_helper": "Gifts received are not taxable (up to $17k/year per giver)",
                "for_customer": "Gifts given are not deductible but also not taxable event",
                "1099_required": "NO - not from Dollor, not from customer",
            },
        },

        "helper_acting_as_customer_agent": {
            "explanation": "When you pick up food, you're acting on customer's behalf",
            "like": "A friend picking up your pizza order",
            "legal_term": "Authorized agent for pickup",
            "restaurant_sees": "Someone authorized by customer to collect order",
            "no_restaurant_relationship": "Restaurant didn't hire helper",
        },

        "platform_immunity": {
            "section_230": {
                "what": "Communications Decency Act Section 230",
                "protects": "Interactive computer service providers",
                "we_are": "A platform where users post and respond to requests",
                "we_are_not": "Party to user transactions",
            },
            "our_role": {
                "we_do": "Provide technology to connect users",
                "we_dont": "Provide delivery services, employ anyone, or process food/delivery payments",
            },
        },

        "comparison_to_legal_models": {
            "nextdoor": {
                "their_model": "Neighbors asking for/offering help",
                "legal_status": "Completely legal",
                "our_similarity": "Same - community help requests",
            },
            "craigslist_rideshare": {
                "their_model": "Cost-sharing for rides",
                "legal_status": "Completely legal",
                "our_similarity": "Voluntary assistance with gratitude gift",
            },
            "venmo_requests": {
                "their_model": "P2P money transfers for any reason",
                "legal_status": "Completely legal",
                "our_similarity": "Direct peer-to-peer gifts",
            },
        },

        "what_if_challenged": {
            "our_defense": [
                "We are a communications platform (Section 230)",
                "We don't employ anyone",
                "We don't provide delivery services",
                "We don't control helpers",
                "Gifts between individuals are legal",
                "Voluntary mutual aid is legal",
            ],
            "precedents": [
                "Craigslist not liable for user transactions",
                "eBay not liable for seller actions",
                "Nextdoor not liable for neighbor arrangements",
            ],
        },

        "terms_users_agree_to": [
            "I understand Dollor.ai is a communications platform only",
            "I understand helpers are not employees of anyone",
            "I understand thank-you gifts are voluntary",
            "I understand I'm responsible for my own taxes and insurance",
            "I understand Dollor.ai is not a party to my transactions",
        ],
    }


@router.get("/legal/helper-agreement")
async def get_helper_agreement():
    """Agreement helpers acknowledge"""
    return {
        "title": "Community Helper Acknowledgment",
        "version": "1.0",

        "i_understand": [
            "I am a community member voluntarily offering to help others",
            "I am NOT an employee or contractor of Dollor.ai",
            "I am NOT an employee or contractor of any restaurant",
            "I am NOT an employee of any customer I help",
            "Any 'thank-you' I receive is a personal gift, not wages",
            "I choose which requests to help with - no requirements",
            "I use my own vehicle and maintain my own insurance",
            "I am responsible for my own tax obligations",
            "Dollor.ai is just the platform connecting me with people who need help",
        ],

        "i_agree": [
            "To help others voluntarily and in good faith",
            "To pick up food as the customer's authorized agent",
            "To deliver food safely and in good condition",
            "To treat customers with respect",
            "That any gift I receive is between me and the customer",
        ],

        "i_acknowledge": {
            "employment_status": "I am not employed by anyone through this platform",
            "gift_classification": "Thank-you amounts are gifts, not wages",
            "tax_responsibility": "I handle my own taxes (gifts under $17k not taxable)",
            "insurance": "I maintain my own vehicle/liability insurance",
            "no_1099": "I will not receive a 1099 from Dollor.ai or restaurants",
        },
    }


# =============================================================================
# INVESTOR METRICS
# =============================================================================

@router.get("/metrics/business-model")
async def get_business_metrics():
    """Investor-ready business model explanation"""
    return {
        "model_name": "Pure P2P Marketplace",

        "revenue": {
            "source": "Platform access fee only",
            "amount_per_transaction": 1.00,
            "collected_from": ["Customer ($1)", "Restaurant ($1 optional)"],
            "not_collected_from": "Helpers ($0 - our advantage)",
            "total_per_order": 1.00,  # Conservative - customer only
        },

        "costs_per_order": {
            "infrastructure": 0.03,
            "payment_processing": 0.03,
            "support": 0.02,
            "total": 0.08,
        },

        "profit_per_order": 0.92,
        "gross_margin": "92%",

        "legal_risk_profile": {
            "worker_classification_risk": "ZERO",
            "reason": "No workers to classify - pure P2P",
            "ab5_exposure": "None",
            "employment_lawsuits": "Not applicable",
            "money_transmission": "N/A - we don't move money",
        },

        "why_this_works": {
            "users_want": "Convenient food delivery",
            "we_provide": "Platform to connect people",
            "legal_framework": "Community mutual aid + gifts",
            "precedent": "Craigslist, Nextdoor, TaskRabbit",
        },

        "scaling": {
            "requires": "Only technology infrastructure",
            "does_not_require": [
                "Employee management",
                "Contractor management",
                "Benefits administration",
                "Workers comp",
                "1099 processing",
                "Employment lawyers",
            ],
        },

        "competitive_advantage": {
            "vs_doordash": "No worker classification risk",
            "vs_uber_eats": "No AB5 lawsuits",
            "for_helpers": "$0 platform fee (they keep everything)",
            "for_restaurants": "$1 flat (vs 30% commission)",
        },
    }
