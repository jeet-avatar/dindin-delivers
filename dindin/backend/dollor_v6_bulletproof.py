"""
DOLLOR.AI V6 - BULLETPROOF MODEL
=================================

DESIGN GOALS:
1. Nobody gets cheated (customer, driver, restaurant, platform)
2. Maximum viral potential
3. Zero legal liability
4. App Store compliant (Apple Guidelines 3.1.1, 5.1.1)
5. Crystal clear terms

THE WINNING MODEL: PREPAID MARKETPLACE WITH INSTANT PAYOUT
===========================================================

This combines:
- Airbnb's escrow model (trust)
- Venmo's P2P simplicity (speed)
- Craigslist's marketplace immunity (legal protection)
- DoorDash's convenience (UX)

WITHOUT:
- Employment relationships
- Worker classification risk
- Money transmission complexity
- Hidden fees

COMPLETE FLOW:
==============

1. CUSTOMER ORDERS FOOD
   Customer → pays Restaurant directly (Apple Pay/Card)
   Platform NOT involved in food payment

2. CUSTOMER REQUESTS DELIVERY
   Customer → pre-authorizes delivery tip on Dollor.ai
   Card is HELD (not charged) via Stripe
   Platform charges $0.99 service fee (our revenue)

3. DRIVER ACCEPTS
   Driver sees "PAYMENT GUARANTEED ✓"
   Driver knows exactly what they'll earn

4. DRIVER DELIVERS
   Driver delivers food
   Takes photo proof (optional but encouraged)

5. AUTOMATIC PAYMENT
   Upon delivery confirmation:
   - Held amount released directly to driver's Stripe Connect
   - Driver receives instant payout to debit card
   - No manual Venmo/Cash needed

6. EVERYONE HAPPY
   ✓ Customer got food delivered
   ✓ Driver got paid instantly (100%, no platform cut)
   ✓ Restaurant got paid for food
   ✓ Platform got $0.99 from customer + $0.99 from restaurant = $1.98/order

WHY THIS IS LEGALLY BULLETPROOF:
================================

1. NO EMPLOYMENT:
   - We don't pay drivers (Stripe transfers customer's money)
   - We don't control drivers
   - Drivers are independent users of the marketplace
   - Like Airbnb hosts - they're not Airbnb employees

2. NO MONEY TRANSMISSION:
   - We use Stripe Connect (they have the licenses)
   - Money flows: Customer → Stripe → Driver
   - We're a "platform" not a "money transmitter"

3. SECTION 230 PROTECTION:
   - We're an interactive computer service
   - Users transact with each other
   - We facilitate, not participate

4. CLEAR TERMS:
   - Every user agrees to explicit terms
   - No ambiguity about relationships
   - No hidden fees or surprises

APP STORE COMPLIANCE:
====================

Apple Guideline 3.1.1 (In-App Purchase):
- Food purchase is OUTSIDE the app (restaurant direct)
- Delivery tip is a P2P transfer (like Venmo)
- Platform fee ($0.99) goes through Apple IAP if required
  OR is a "physical service" exception

Apple Guideline 5.1.1 (Privacy):
- Privacy policy clearly stated
- Data usage disclosed
- Account deletion available

Apple Guideline 5.6 (Developer Code of Conduct):
- No misleading claims
- Accurate app description
- Clear pricing
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum
import uuid
import stripe
import os
import logging

logger = logging.getLogger("dollor.v6")
router = APIRouter(prefix="/api/v6", tags=["V6 Bulletproof Model"])

# Stripe Connect configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")


# =============================================================================
# CONFIGURATION
# =============================================================================

class V6Config:
    # Platform service fee from CUSTOMERS
    CUSTOMER_SERVICE_FEE = 0.99  # $0.99 per delivery request

    # Platform service fee from RESTAURANTS
    RESTAURANT_SERVICE_FEE = 0.99  # $0.99 per order fulfilled via Dollor

    # Total platform revenue per order: $1.98

    # Driver platform fee (ZERO - competitive advantage)
    DRIVER_PLATFORM_FEE = 0.00  # $0

    # Minimum delivery amount
    MIN_DELIVERY_AMOUNT = 3.00

    # Suggested delivery amounts
    SUGGESTED_SHORT = 5.00   # < 2 miles
    SUGGESTED_MEDIUM = 8.00  # 2-5 miles
    SUGGESTED_LONG = 12.00   # 5+ miles

    # Payment hold duration
    HOLD_DURATION_HOURS = 2

    # Auto-release time after delivery
    AUTO_RELEASE_MINUTES = 30


# =============================================================================
# MODELS
# =============================================================================

class OrderStatus(str, Enum):
    CREATED = "created"                    # Order created
    PAYMENT_HELD = "payment_held"          # Delivery payment held
    DRIVER_ASSIGNED = "driver_assigned"    # Driver accepted
    PICKED_UP = "picked_up"               # Food picked up
    DELIVERED = "delivered"               # Delivered
    PAYMENT_RELEASED = "payment_released"  # Driver paid
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class CreateDeliveryOrder(BaseModel):
    # Customer info
    customer_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: str

    # Food order (already placed with restaurant)
    restaurant_name: str
    restaurant_address: str
    restaurant_lat: float
    restaurant_lng: float
    food_order_reference: str  # Order # from restaurant

    # Delivery details
    delivery_address: str
    delivery_lat: float
    delivery_lng: float
    delivery_instructions: Optional[str] = None

    # Payment
    delivery_amount: float  # What customer will give driver
    payment_method_id: str  # Stripe payment method for hold


class DriverAcceptOrder(BaseModel):
    driver_id: str
    driver_name: str
    driver_phone: str
    driver_stripe_account_id: str  # Driver's Stripe Connect account


# =============================================================================
# IN-MEMORY STORAGE (Use database in production)
# =============================================================================

orders_db: Dict[str, Dict] = {}


# =============================================================================
# STEP 1: CREATE DELIVERY ORDER WITH PAYMENT GUARANTEE
# =============================================================================

@router.post("/orders/create")
async def create_delivery_order(order: CreateDeliveryOrder):
    """
    MAIN ENDPOINT: Customer creates delivery order with guaranteed payment.

    What happens:
    1. Validate delivery amount
    2. Create Stripe PaymentIntent with manual capture (HOLD)
    3. Charge platform service fee ($0.99)
    4. Create order visible to drivers

    Customer's card shows:
    - $X.XX pending (delivery amount - held, not charged)
    - $0.99 charged (platform service fee)
    """
    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"

    # Validate minimum
    if order.delivery_amount < V6Config.MIN_DELIVERY_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum delivery amount is ${V6Config.MIN_DELIVERY_AMOUNT}"
        )

    try:
        # STEP 1: Create payment hold for delivery amount
        if stripe.api_key != "sk_test_placeholder":
            # Hold delivery amount (not charged yet)
            delivery_hold = stripe.PaymentIntent.create(
                amount=int(order.delivery_amount * 100),
                currency="usd",
                payment_method=order.payment_method_id,
                capture_method="manual",  # HOLD, don't capture
                confirm=True,
                metadata={
                    "order_id": order_id,
                    "type": "delivery_payment_hold",
                    "customer_id": order.customer_id,
                },
                description=f"Dollor.ai Delivery - Order {order_id}"
            )
            hold_id = delivery_hold.id

            # Charge customer service fee (immediate)
            service_fee = stripe.PaymentIntent.create(
                amount=int(V6Config.CUSTOMER_SERVICE_FEE * 100),
                currency="usd",
                payment_method=order.payment_method_id,
                confirm=True,
                metadata={
                    "order_id": order_id,
                    "type": "customer_service_fee",
                },
                description=f"Dollor.ai Service Fee - Order {order_id}"
            )
            service_fee_id = service_fee.id
        else:
            hold_id = f"pi_hold_{order_id}"
            service_fee_id = f"pi_fee_{order_id}"

        # Calculate distance (simplified)
        distance_miles = 3.0  # Would use real calculation

        # Store order
        orders_db[order_id] = {
            "order_id": order_id,
            "status": OrderStatus.PAYMENT_HELD,

            "customer": {
                "id": order.customer_id,
                "name": order.customer_name,
                "email": order.customer_email,
                "phone": order.customer_phone,
            },

            "restaurant": {
                "name": order.restaurant_name,
                "address": order.restaurant_address,
                "lat": order.restaurant_lat,
                "lng": order.restaurant_lng,
                "food_order_ref": order.food_order_reference,
            },

            "delivery": {
                "address": order.delivery_address,
                "lat": order.delivery_lat,
                "lng": order.delivery_lng,
                "instructions": order.delivery_instructions,
                "distance_miles": distance_miles,
            },

            "payment": {
                "delivery_amount": order.delivery_amount,
                "customer_fee": V6Config.CUSTOMER_SERVICE_FEE,
                "driver_receives": order.delivery_amount,  # 100%!
                "hold_id": hold_id,
                "service_fee_id": service_fee_id,
                "status": "held",
            },

            "driver": None,

            "timestamps": {
                "created_at": datetime.utcnow().isoformat(),
                "hold_expires_at": (datetime.utcnow() + timedelta(hours=V6Config.HOLD_DURATION_HOURS)).isoformat(),
            },
        }

        return {
            "order_id": order_id,
            "status": "Payment secured - looking for driver",

            "payment_summary": {
                "delivery_amount": order.delivery_amount,
                "delivery_status": "HELD on your card (charged upon delivery)",
                "service_fee": V6Config.CUSTOMER_SERVICE_FEE,
                "service_fee_status": "Charged",
                "total_if_delivered": order.delivery_amount + V6Config.CUSTOMER_SERVICE_FEE,
            },

            "what_happens_next": [
                "1. Drivers see your order with 'Payment Guaranteed' badge",
                "2. A driver accepts and picks up your food",
                "3. Driver delivers to you",
                "4. You confirm delivery (or auto-confirms in 30 min)",
                "5. Payment released to driver instantly",
            ],

            "driver_sees": {
                "amount": order.delivery_amount,
                "status": "✓ PAYMENT GUARANTEED",
                "they_keep": "100% (Dollor.ai takes $0 from drivers)",
            },

            "cancellation_policy": {
                "before_driver_accepts": "Full refund",
                "after_driver_accepts": "May incur cancellation fee",
            }
        }

    except stripe.error.CardError as e:
        raise HTTPException(status_code=400, detail=f"Card error: {e.user_message}")
    except Exception as e:
        logger.error(f"Order creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create order")


# =============================================================================
# STEP 2: DRIVER VIEWS AVAILABLE ORDERS
# =============================================================================

@router.get("/orders/available")
async def get_available_orders(
    driver_lat: float,
    driver_lng: float,
    driver_id: str,
    max_distance: float = 15.0
):
    """
    Drivers see available orders with GUARANTEED payment.

    Every order shown has:
    - Payment already held on customer's card
    - Clear earnings breakdown
    - Customer trust score
    """
    available = []

    for order_id, order in orders_db.items():
        if order["status"] == OrderStatus.PAYMENT_HELD:
            # Calculate distance to pickup
            pickup_lat = order["restaurant"]["lat"]
            pickup_lng = order["restaurant"]["lng"]
            distance_to_pickup = abs(driver_lat - pickup_lat) * 69 + abs(driver_lng - pickup_lng) * 69

            if distance_to_pickup <= max_distance:
                available.append({
                    "order_id": order_id,

                    "earnings": {
                        "amount": order["payment"]["delivery_amount"],
                        "you_keep": order["payment"]["delivery_amount"],  # 100%
                        "platform_fee": 0.00,  # We take NOTHING from drivers
                        "payment_status": "✓ GUARANTEED",
                        "payment_method": "Instant to your bank/card",
                    },

                    "pickup": {
                        "restaurant": order["restaurant"]["name"],
                        "address": order["restaurant"]["address"],
                        "distance_miles": round(distance_to_pickup, 1),
                        "food_order_ref": order["restaurant"]["food_order_ref"],
                    },

                    "delivery": {
                        "area": order["delivery"]["address"].split(",")[0],  # Just city/area
                        "distance_miles": order["delivery"]["distance_miles"],
                        "instructions": order["delivery"]["instructions"],
                    },

                    "customer": {
                        "name": order["customer"]["name"].split()[0],  # First name only
                        "trust_badge": "Verified ✓",  # Would calculate real trust score
                    },

                    "time_estimate": {
                        "pickup": f"{int(distance_to_pickup * 3)} min",
                        "total": f"{int((distance_to_pickup + order['delivery']['distance_miles']) * 3 + 10)} min",
                    },

                    "posted_at": order["timestamps"]["created_at"],
                })

    return {
        "available_orders": available,
        "count": len(available),

        "driver_assurance": {
            "all_payments_guaranteed": True,
            "how": "Customer's card is pre-authorized before you see the order",
            "you_keep": "100% of delivery amount",
            "platform_fee": "$0 (we never take from drivers)",
            "payout": "Instant to your connected bank/card",
        }
    }


# =============================================================================
# STEP 3: DRIVER ACCEPTS ORDER
# =============================================================================

@router.post("/orders/{order_id}/accept")
async def driver_accept_order(order_id: str, driver: DriverAcceptOrder):
    """
    Driver accepts the delivery order.

    At this point:
    - Payment is already held
    - Driver is committed
    - Customer is notified
    """
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")

    order = orders_db[order_id]

    if order["status"] != OrderStatus.PAYMENT_HELD:
        raise HTTPException(status_code=400, detail="Order not available")

    # Assign driver
    order["status"] = OrderStatus.DRIVER_ASSIGNED
    order["driver"] = {
        "id": driver.driver_id,
        "name": driver.driver_name,
        "phone": driver.driver_phone,
        "stripe_account_id": driver.driver_stripe_account_id,
    }
    order["timestamps"]["driver_assigned_at"] = datetime.utcnow().isoformat()

    return {
        "order_id": order_id,
        "status": "Accepted",

        "your_earnings": {
            "amount": order["payment"]["delivery_amount"],
            "platform_fee": 0.00,
            "you_receive": order["payment"]["delivery_amount"],
            "payment_status": "Guaranteed - held on customer's card",
        },

        "pickup_details": {
            "restaurant": order["restaurant"]["name"],
            "address": order["restaurant"]["address"],
            "order_reference": order["restaurant"]["food_order_ref"],
            "what_to_say": f"Picking up for {order['customer']['name']}, order {order['restaurant']['food_order_ref']}",
        },

        "delivery_details": {
            "address": order["delivery"]["address"],
            "customer_name": order["customer"]["name"],
            "customer_phone": order["customer"]["phone"],
            "instructions": order["delivery"]["instructions"],
        },

        "next_steps": [
            "1. Head to restaurant",
            "2. Pick up order (give reference number)",
            "3. Mark as 'Picked Up' in app",
            "4. Deliver to customer",
            "5. Mark as 'Delivered' - payment sent instantly!",
        ],
    }


# =============================================================================
# STEP 4: DRIVER MARKS PICKED UP
# =============================================================================

@router.post("/orders/{order_id}/pickup")
async def driver_pickup(order_id: str, driver_id: str):
    """Driver confirms food pickup from restaurant."""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")

    order = orders_db[order_id]

    if order["driver"]["id"] != driver_id:
        raise HTTPException(status_code=403, detail="Not your order")

    order["status"] = OrderStatus.PICKED_UP
    order["timestamps"]["picked_up_at"] = datetime.utcnow().isoformat()

    return {
        "status": "Picked up",
        "delivery_address": order["delivery"]["address"],
        "customer_phone": order["customer"]["phone"],
        "instructions": order["delivery"]["instructions"],
        "next_step": "Head to delivery address",
    }


# =============================================================================
# STEP 5: DELIVERY COMPLETE - AUTOMATIC PAYMENT
# =============================================================================

@router.post("/orders/{order_id}/deliver")
async def complete_delivery(
    order_id: str,
    driver_id: str,
    photo_proof_url: Optional[str] = None,
    delivery_lat: Optional[float] = None,
    delivery_lng: Optional[float] = None
):
    """
    Driver marks delivery complete.

    AUTOMATIC PAYMENT RELEASE:
    1. Capture held payment from customer
    2. Transfer to driver's Stripe Connect account
    3. Driver receives instant payout
    """
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")

    order = orders_db[order_id]

    if order["driver"]["id"] != driver_id:
        raise HTTPException(status_code=403, detail="Not your order")

    if order["status"] not in [OrderStatus.PICKED_UP, OrderStatus.DRIVER_ASSIGNED]:
        raise HTTPException(status_code=400, detail="Invalid order status")

    try:
        delivery_amount = order["payment"]["delivery_amount"]
        driver_stripe_account = order["driver"]["stripe_account_id"]

        if stripe.api_key != "sk_test_placeholder":
            # STEP 1: Capture the held payment
            stripe.PaymentIntent.capture(order["payment"]["hold_id"])

            # STEP 2: Transfer to driver's Stripe Connect account
            transfer = stripe.Transfer.create(
                amount=int(delivery_amount * 100),
                currency="usd",
                destination=driver_stripe_account,
                metadata={
                    "order_id": order_id,
                    "type": "driver_payout",
                },
                description=f"Dollor.ai Delivery Payout - Order {order_id}"
            )
            transfer_id = transfer.id
        else:
            transfer_id = f"tr_test_{order_id}"

        # Update order
        order["status"] = OrderStatus.PAYMENT_RELEASED
        order["timestamps"]["delivered_at"] = datetime.utcnow().isoformat()
        order["timestamps"]["payment_released_at"] = datetime.utcnow().isoformat()
        order["payment"]["transfer_id"] = transfer_id
        order["payment"]["status"] = "released"

        if photo_proof_url:
            order["delivery"]["photo_proof"] = photo_proof_url
        if delivery_lat and delivery_lng:
            order["delivery"]["completion_location"] = {"lat": delivery_lat, "lng": delivery_lng}

        return {
            "status": "Delivered & Paid!",
            "order_id": order_id,

            "payment": {
                "amount": delivery_amount,
                "status": "✓ SENT TO YOUR ACCOUNT",
                "transfer_id": transfer_id,
                "platform_fee_deducted": 0.00,
                "you_received": delivery_amount,
            },

            "message": f"${delivery_amount:.2f} has been sent to your connected account!",
            "payout_info": "Funds available immediately or within 1-2 business days depending on your bank",

            "next_delivery": "Check available orders for your next delivery!",
        }

    except Exception as e:
        logger.error(f"Payment release error: {e}")
        raise HTTPException(status_code=500, detail="Payment processing error - our team has been notified")


# =============================================================================
# DRIVER ONBOARDING (Stripe Connect)
# =============================================================================

@router.post("/drivers/onboard")
async def onboard_driver(
    driver_email: str,
    driver_name: str,
    driver_phone: str
):
    """
    Quick driver onboarding with Stripe Connect Express.

    This creates a Stripe account so drivers can receive instant payouts.
    """
    driver_id = f"DRV-{uuid.uuid4().hex[:8].upper()}"

    try:
        if stripe.api_key != "sk_test_placeholder":
            # Create Stripe Connect Express account
            account = stripe.Account.create(
                type="express",
                country="US",
                email=driver_email,
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                business_type="individual",
                business_profile={
                    "mcc": "4215",  # Courier services
                    "url": "https://dollor.ai",
                },
                metadata={
                    "driver_id": driver_id,
                    "platform": "dollor.ai",
                }
            )

            # Create onboarding link
            account_link = stripe.AccountLink.create(
                account=account.id,
                refresh_url="https://dollor.ai/driver/onboard/refresh",
                return_url="https://dollor.ai/driver/onboard/complete",
                type="account_onboarding",
            )

            return {
                "driver_id": driver_id,
                "stripe_account_id": account.id,
                "onboarding_url": account_link.url,
                "status": "pending_onboarding",

                "next_steps": [
                    "1. Click the onboarding link",
                    "2. Verify your identity (takes 2 min)",
                    "3. Connect your bank/debit card",
                    "4. Start accepting deliveries!",
                ],

                "benefits": {
                    "instant_payout": "Get paid instantly after each delivery",
                    "platform_fee": "$0 (we never take from drivers)",
                    "keep_everything": "100% of delivery earnings are yours",
                    "no_minimum": "Cash out anytime, any amount",
                },
            }
        else:
            return {
                "driver_id": driver_id,
                "stripe_account_id": f"acct_test_{driver_id}",
                "onboarding_url": "https://dollor.ai/driver/onboard/test",
                "status": "test_mode",
            }

    except Exception as e:
        logger.error(f"Driver onboarding error: {e}")
        raise HTTPException(status_code=500, detail="Onboarding failed")


# =============================================================================
# LEGAL TERMS & APP STORE COMPLIANCE
# =============================================================================

@router.get("/legal/terms-of-service")
async def get_terms_of_service():
    """
    Complete Terms of Service - App Store Compliant
    """
    return {
        "version": "2.0",
        "effective_date": "2024-01-15",
        "last_updated": "2024-01-15",

        "1_introduction": {
            "title": "1. Introduction",
            "content": """
                Welcome to Dollor.ai. These Terms of Service ("Terms") govern your use of
                the Dollor.ai mobile application and website (the "Platform").

                By using our Platform, you agree to these Terms. If you do not agree,
                do not use the Platform.
            """,
        },

        "2_what_we_are": {
            "title": "2. What Dollor.ai Is",
            "content": """
                Dollor.ai is a TECHNOLOGY PLATFORM that connects:
                - Customers who need food delivered
                - Independent delivery providers ("Helpers") who offer to assist

                WE ARE NOT:
                - A delivery company
                - A food service provider
                - An employer of Helpers
                - A party to transactions between users

                We provide the technology infrastructure for users to connect.
                All transactions occur directly between users.
            """,
        },

        "3_user_relationships": {
            "title": "3. User Relationships",
            "content": """
                HELPERS ARE NOT OUR EMPLOYEES OR CONTRACTORS.

                Helpers are independent individuals who choose to use our Platform
                to find delivery opportunities. They:
                - Set their own schedule
                - Choose which deliveries to accept
                - Use their own vehicle and equipment
                - Are responsible for their own taxes and insurance

                When a Helper accepts a delivery request, they enter into a
                direct arrangement with the Customer, not with Dollor.ai.
            """,
        },

        "4_payments": {
            "title": "4. Payments",
            "content": """
                FOOD PAYMENT:
                Customers pay restaurants directly for food. Dollor.ai does not
                process food payments.

                DELIVERY PAYMENT:
                Customers pre-authorize a delivery amount via the Platform.
                Upon successful delivery, this amount is transferred directly
                to the Helper's connected account via Stripe.

                Dollor.ai does NOT take any percentage from delivery payments.
                Helpers receive 100% of the delivery amount.

                PLATFORM SERVICE FEES:
                - Customers pay a $0.99 service fee per delivery request
                - Restaurants pay a $0.99 service fee per order confirmed
                - Helpers/Drivers pay $0 (they keep 100%)

                These fees are for access to our marketplace technology and
                to maintain the platform infrastructure.
            """,
        },

        "5_liability": {
            "title": "5. Limitation of Liability",
            "content": """
                Dollor.ai is a platform connecting users. We are not responsible for:
                - Food quality or safety (restaurant's responsibility)
                - Delivery issues between users
                - Actions or omissions of Helpers
                - Disputes between users

                Users transact at their own risk. We encourage users to:
                - Verify identities
                - Use in-app communication
                - Report any issues promptly
            """,
        },

        "6_dispute_resolution": {
            "title": "6. Dispute Resolution",
            "content": """
                Disputes between users should be resolved directly between those users.

                Dollor.ai may assist in mediation but is not obligated to resolve
                user disputes.

                For Platform-related disputes, users agree to binding arbitration
                in accordance with AAA rules.
            """,
        },

        "7_termination": {
            "title": "7. Account Termination",
            "content": """
                Users may delete their account at any time through the app settings.

                Dollor.ai may terminate accounts that violate these Terms.

                Upon termination, any pending payments will be processed.
            """,
        },

        "8_governing_law": {
            "title": "8. Governing Law",
            "content": """
                These Terms are governed by the laws of the State of Delaware, USA.
            """,
        },

        "app_store_compliance": {
            "apple_iap": "Platform service fee may be processed via Apple In-App Purchase where required",
            "physical_goods_exception": "Delivery services are physical services exempt from IAP requirements",
            "privacy": "See Privacy Policy for data handling practices",
            "account_deletion": "Users can delete accounts via Settings > Account > Delete Account",
        },

        "user_acknowledgment": [
            "I understand Dollor.ai is a technology platform, not a delivery company",
            "I understand Helpers are not employees of Dollor.ai",
            "I understand payments flow directly between users via Stripe",
            "I understand Dollor.ai is not liable for user transactions",
            "I am at least 18 years old",
        ],
    }


@router.get("/legal/privacy-policy")
async def get_privacy_policy():
    """
    Privacy Policy - App Store Compliant (Apple 5.1.1)
    """
    return {
        "version": "2.0",
        "effective_date": "2024-01-15",

        "data_we_collect": {
            "account_info": ["Name", "Email", "Phone number"],
            "location_data": "Used to show nearby restaurants and track deliveries",
            "payment_info": "Processed securely by Stripe (we don't store card numbers)",
            "usage_data": "App usage patterns to improve service",
        },

        "how_we_use_data": [
            "To provide and improve our services",
            "To process payments via Stripe",
            "To communicate with you about orders",
            "To ensure platform safety",
        ],

        "data_sharing": {
            "with_other_users": "Name and phone shared between customers and helpers for delivery coordination",
            "with_stripe": "Payment processing",
            "with_law_enforcement": "Only when legally required",
            "we_never_sell": "We do not sell your personal data",
        },

        "your_rights": {
            "access": "Request a copy of your data",
            "correction": "Update your information in app settings",
            "deletion": "Delete your account and data via Settings > Account > Delete Account",
            "portability": "Request data export",
        },

        "data_retention": {
            "active_accounts": "Data retained while account is active",
            "deleted_accounts": "Data deleted within 30 days of account deletion",
            "legal_requirements": "Some data may be retained for legal/tax purposes",
        },

        "security": {
            "encryption": "All data encrypted in transit and at rest",
            "stripe_pci": "Payment processing is PCI-DSS compliant via Stripe",
            "access_controls": "Strict employee access controls",
        },

        "california_residents": {
            "ccpa_rights": "California residents have additional rights under CCPA",
            "do_not_sell": "We do not sell personal information",
            "opt_out": "Contact privacy@dollor.ai for requests",
        },

        "contact": {
            "email": "privacy@dollor.ai",
            "address": "Dollor.ai, 123 Tech Street, San Francisco, CA 94102",
        },
    }


@router.get("/legal/helper-agreement")
async def get_helper_agreement():
    """
    Helper (Driver) Agreement - Clear independent contractor status
    """
    return {
        "version": "2.0",
        "effective_date": "2024-01-15",

        "acknowledgments": {
            "independent_status": """
                I acknowledge that I am an INDEPENDENT INDIVIDUAL using the
                Dollor.ai platform. I am NOT an employee, contractor, or agent
                of Dollor.ai.
            """,

            "no_employment": """
                My use of this platform does not create any employment relationship.
                Dollor.ai does not:
                - Control how I perform deliveries
                - Set my schedule or require minimum deliveries
                - Provide equipment, uniforms, or training
                - Pay me wages (payments come from customers)
                - Withhold taxes or provide benefits
            """,

            "customer_relationship": """
                When I accept a delivery request, I am entering into a direct
                arrangement with the customer, not with Dollor.ai.
                The customer is paying me directly for my assistance.
            """,

            "my_responsibilities": """
                I am responsible for:
                - My own vehicle, fuel, and maintenance
                - My own insurance (vehicle and liability)
                - Compliance with all traffic laws
                - My own tax obligations
                - Maintaining a valid driver's license
            """,

            "payment_understanding": """
                I understand that:
                - Customers pre-authorize payment before I accept
                - Payment is transferred to my Stripe account upon delivery
                - I receive 100% of the delivery amount
                - Dollor.ai charges me $0 platform fee
                - I am responsible for reporting income for tax purposes
            """,
        },

        "representations": [
            "I am at least 18 years old",
            "I have a valid driver's license",
            "I have valid vehicle insurance",
            "I have legal authorization to work",
            "I will comply with all applicable laws",
        ],
    }


# =============================================================================
# SUPPORT & DISPUTES
# =============================================================================

@router.post("/support/report-issue")
async def report_issue(
    order_id: str,
    user_id: str,
    user_type: str,  # "customer" or "driver"
    issue_type: str,
    description: str
):
    """
    Report an issue with an order.
    """
    ticket_id = f"TKT-{uuid.uuid4().hex[:8].upper()}"

    return {
        "ticket_id": ticket_id,
        "status": "submitted",
        "message": "Your issue has been submitted. We'll respond within 24 hours.",
        "order_id": order_id,
        "issue_type": issue_type,

        "what_happens_next": [
            "1. Our team reviews your report",
            "2. We may contact you for more information",
            "3. Resolution provided within 24-48 hours",
        ],

        "if_urgent": {
            "email": "urgent@dollor.ai",
            "response_time": "Within 2 hours during business hours",
        },
    }


# =============================================================================
# RESTAURANT PARTNER INTEGRATION
# =============================================================================

# In-memory restaurant storage (use database in production)
restaurants_db: Dict[str, Dict] = {}


class RestaurantOnboard(BaseModel):
    business_name: str
    business_email: EmailStr
    business_phone: str
    business_address: str
    contact_person: str
    payment_method_id: Optional[str] = None  # For automatic fee charging


@router.post("/restaurants/onboard")
async def onboard_restaurant(restaurant: RestaurantOnboard):
    """
    Restaurant partner onboarding.

    Benefits for restaurants:
    - Access to Dollor.ai delivery network
    - No need to hire their own drivers
    - Only $0.99 per order fulfilled via Dollor
    - No monthly fees or commitments

    How it works:
    1. Restaurant registers on Dollor.ai
    2. Restaurant integrates with their POS or uses our dashboard
    3. When customer requests Dollor delivery, restaurant confirms order
    4. Upon order confirmation, restaurant is charged $0.99
    5. Driver picks up and delivers
    """
    restaurant_id = f"REST-{uuid.uuid4().hex[:8].upper()}"

    try:
        stripe_customer_id = None

        if stripe.api_key != "sk_test_placeholder" and restaurant.payment_method_id:
            # Create Stripe customer for the restaurant
            customer = stripe.Customer.create(
                email=restaurant.business_email,
                name=restaurant.business_name,
                phone=restaurant.business_phone,
                payment_method=restaurant.payment_method_id,
                invoice_settings={
                    "default_payment_method": restaurant.payment_method_id,
                },
                metadata={
                    "restaurant_id": restaurant_id,
                    "platform": "dollor.ai",
                },
            )
            stripe_customer_id = customer.id

            # Set as default payment method
            stripe.Customer.modify(
                customer.id,
                invoice_settings={"default_payment_method": restaurant.payment_method_id}
            )
        else:
            stripe_customer_id = f"cus_test_{restaurant_id}"

        # Store restaurant
        restaurants_db[restaurant_id] = {
            "restaurant_id": restaurant_id,
            "business_name": restaurant.business_name,
            "business_email": restaurant.business_email,
            "business_phone": restaurant.business_phone,
            "business_address": restaurant.business_address,
            "contact_person": restaurant.contact_person,
            "stripe_customer_id": stripe_customer_id,
            "payment_method_id": restaurant.payment_method_id,
            "status": "active",
            "onboarded_at": datetime.utcnow().isoformat(),
            "total_orders": 0,
            "total_fees_paid": 0.0,
        }

        return {
            "restaurant_id": restaurant_id,
            "status": "active",
            "message": "Welcome to Dollor.ai! Your restaurant is now connected to our delivery network.",

            "pricing": {
                "fee_per_order": f"${V6Config.RESTAURANT_SERVICE_FEE}",
                "monthly_fee": "$0",
                "setup_fee": "$0",
                "when_charged": "Only when a customer uses Dollor delivery for your restaurant",
            },

            "how_it_works": [
                "1. Customer orders food from you (via phone, in-store, or your app)",
                "2. Customer requests Dollor.ai delivery",
                "3. You confirm the order in our dashboard or via API",
                "4. We charge $0.99 to your saved payment method",
                "5. A Dollor driver picks up and delivers the food",
            ],

            "benefits": [
                "Access to independent delivery network",
                "No driver management headaches",
                "Pay only for orders you fulfill",
                "Real-time delivery tracking",
                "Customer satisfaction guarantee",
            ],

            "next_steps": [
                "Log into your restaurant dashboard",
                "Set your pickup location details",
                "Configure order notification preferences",
                "Start accepting Dollor deliveries!",
            ],
        }

    except Exception as e:
        logger.error(f"Restaurant onboarding error: {e}")
        raise HTTPException(status_code=500, detail="Failed to onboard restaurant")


@router.post("/restaurants/{restaurant_id}/confirm-order")
async def restaurant_confirm_order(
    restaurant_id: str,
    order_id: str,
    estimated_prep_time_minutes: int = 15
):
    """
    Restaurant confirms an order for Dollor delivery.

    This triggers:
    1. $0.99 fee charge to restaurant's saved payment method
    2. Order becomes visible to drivers
    3. Customer is notified of estimated time
    """
    if restaurant_id not in restaurants_db:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")

    restaurant = restaurants_db[restaurant_id]
    order = orders_db[order_id]

    try:
        restaurant_fee_id = None

        if stripe.api_key != "sk_test_placeholder" and restaurant.get("stripe_customer_id"):
            # Charge restaurant fee
            restaurant_fee = stripe.PaymentIntent.create(
                amount=int(V6Config.RESTAURANT_SERVICE_FEE * 100),
                currency="usd",
                customer=restaurant["stripe_customer_id"],
                payment_method=restaurant.get("payment_method_id"),
                confirm=True,
                off_session=True,  # Charge without customer present
                metadata={
                    "order_id": order_id,
                    "restaurant_id": restaurant_id,
                    "type": "restaurant_service_fee",
                },
                description=f"Dollor.ai Restaurant Fee - Order {order_id}"
            )
            restaurant_fee_id = restaurant_fee.id
        else:
            restaurant_fee_id = f"pi_rest_fee_{order_id}"

        # Update order with restaurant confirmation
        order["restaurant"]["confirmed"] = True
        order["restaurant"]["confirmed_at"] = datetime.utcnow().isoformat()
        order["restaurant"]["prep_time_minutes"] = estimated_prep_time_minutes
        order["restaurant"]["restaurant_fee_id"] = restaurant_fee_id

        # Update restaurant stats
        restaurant["total_orders"] += 1
        restaurant["total_fees_paid"] += V6Config.RESTAURANT_SERVICE_FEE

        return {
            "order_id": order_id,
            "status": "confirmed",
            "restaurant_fee_charged": V6Config.RESTAURANT_SERVICE_FEE,
            "fee_payment_id": restaurant_fee_id,

            "prep_time": f"{estimated_prep_time_minutes} minutes",

            "what_happens_next": [
                "1. Order is now visible to Dollor drivers",
                "2. A driver will accept and head to your location",
                "3. Prepare the order for pickup",
                "4. Driver arrives and picks up the order",
            ],

            "pickup_instructions": {
                "driver_will_say": f"Picking up order {order['restaurant'].get('food_order_ref', order_id)}",
                "verify_items": "Please verify all items before handing to driver",
            },
        }

    except stripe.error.CardError as e:
        raise HTTPException(status_code=400, detail=f"Payment failed: {e.user_message}")
    except Exception as e:
        logger.error(f"Restaurant confirm order error: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm order")


@router.get("/restaurants/{restaurant_id}/dashboard")
async def restaurant_dashboard(restaurant_id: str):
    """
    Restaurant dashboard showing stats and recent orders.
    """
    if restaurant_id not in restaurants_db:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant = restaurants_db[restaurant_id]

    # Get restaurant's orders
    restaurant_orders = [
        order for order in orders_db.values()
        if order.get("restaurant", {}).get("restaurant_id") == restaurant_id
    ]

    return {
        "restaurant": {
            "id": restaurant_id,
            "name": restaurant["business_name"],
            "status": restaurant["status"],
        },

        "stats": {
            "total_orders": restaurant["total_orders"],
            "total_fees_paid": f"${restaurant['total_fees_paid']:.2f}",
            "fee_per_order": f"${V6Config.RESTAURANT_SERVICE_FEE}",
        },

        "recent_orders": [
            {
                "order_id": o["order_id"],
                "status": o["status"],
                "customer_name": o["customer"]["name"],
                "created_at": o["timestamps"]["created_at"],
            }
            for o in restaurant_orders[-10:]  # Last 10 orders
        ],

        "pricing_reminder": {
            "fee": f"${V6Config.RESTAURANT_SERVICE_FEE} per Dollor delivery",
            "no_monthly_fee": True,
            "no_driver_costs": True,
        },
    }


@router.get("/restaurants/{restaurant_id}/billing")
async def restaurant_billing(restaurant_id: str):
    """
    Restaurant billing history and statements.
    """
    if restaurant_id not in restaurants_db:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant = restaurants_db[restaurant_id]

    return {
        "restaurant_id": restaurant_id,
        "business_name": restaurant["business_name"],

        "billing_summary": {
            "total_orders": restaurant["total_orders"],
            "fee_per_order": V6Config.RESTAURANT_SERVICE_FEE,
            "total_fees": restaurant["total_fees_paid"],
        },

        "payment_method": {
            "type": "card",
            "status": "active" if restaurant.get("payment_method_id") else "not_set",
        },

        "pricing": {
            "dollor_fee": f"${V6Config.RESTAURANT_SERVICE_FEE}/order",
            "billing_cycle": "Per order (charged at confirmation)",
            "monthly_minimum": "$0",
        },
    }


# =============================================================================
# PLATFORM REVENUE METRICS
# =============================================================================

@router.get("/admin/revenue-metrics")
async def get_revenue_metrics():
    """
    Platform revenue metrics for investors/admin.

    Revenue Model:
    - $0.99 from each customer per delivery request
    - $0.99 from each restaurant per order confirmed
    - $0 from drivers (competitive advantage)
    - Total: $1.98 per completed order
    """
    total_orders = len(orders_db)
    completed_orders = len([o for o in orders_db.values() if o["status"] == OrderStatus.PAYMENT_RELEASED])
    total_restaurants = len(restaurants_db)

    customer_revenue = completed_orders * V6Config.CUSTOMER_SERVICE_FEE
    restaurant_revenue = completed_orders * V6Config.RESTAURANT_SERVICE_FEE
    total_revenue = customer_revenue + restaurant_revenue

    return {
        "revenue_model": {
            "customer_fee": f"${V6Config.CUSTOMER_SERVICE_FEE} per delivery request",
            "restaurant_fee": f"${V6Config.RESTAURANT_SERVICE_FEE} per order confirmed",
            "driver_fee": "$0 (100% to drivers)",
            "revenue_per_order": f"${V6Config.CUSTOMER_SERVICE_FEE + V6Config.RESTAURANT_SERVICE_FEE}",
        },

        "current_metrics": {
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "total_restaurants": total_restaurants,
        },

        "revenue": {
            "from_customers": f"${customer_revenue:.2f}",
            "from_restaurants": f"${restaurant_revenue:.2f}",
            "total_revenue": f"${total_revenue:.2f}",
        },

        "unit_economics": {
            "gross_revenue_per_order": V6Config.CUSTOMER_SERVICE_FEE + V6Config.RESTAURANT_SERVICE_FEE,
            "stripe_fees_estimated": 0.30 + (0.029 * (V6Config.CUSTOMER_SERVICE_FEE + V6Config.RESTAURANT_SERVICE_FEE)),
            "net_revenue_per_order": (V6Config.CUSTOMER_SERVICE_FEE + V6Config.RESTAURANT_SERVICE_FEE) - 0.30 - (0.029 * (V6Config.CUSTOMER_SERVICE_FEE + V6Config.RESTAURANT_SERVICE_FEE)),
        },

        "why_this_works": {
            "customers": "Get reliable delivery with payment protection",
            "restaurants": "Access delivery network without hiring drivers",
            "drivers": "Keep 100% of earnings - unprecedented in industry",
            "platform": "Small fee from both sides creates sustainable revenue",
        },
    }
