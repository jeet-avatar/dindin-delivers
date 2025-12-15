"""
DOLLOR.AI - COMPLETE FEE TRANSPARENCY SYSTEM
=============================================
Every penny is tracked and explained to all parties:
- Customers see exactly what they pay and where it goes
- Drivers see exactly what they earn
- Restaurants see exactly what they receive
- Platform shows exactly what it keeps

TRANSPARENCY PRINCIPLE: No hidden fees, ever.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/fees", tags=["Fee Transparency"])


# =============================================================================
# TAX RATES BY JURISDICTION
# =============================================================================

class TaxJurisdiction(BaseModel):
    """Tax rates for a specific jurisdiction"""
    state: str
    city: str
    state_sales_tax: Decimal = Field(description="State sales tax rate (e.g., 0.0725 for 7.25%)")
    city_sales_tax: Decimal = Field(description="City sales tax rate")
    county_tax: Decimal = Field(description="County tax rate")
    special_district_tax: Decimal = Field(description="Special district tax (transit, etc.)")
    food_tax_exempt: bool = Field(description="Whether prepared food is tax exempt")
    delivery_taxable: bool = Field(description="Whether delivery fees are taxable")

    @property
    def total_tax_rate(self) -> Decimal:
        return self.state_sales_tax + self.city_sales_tax + self.county_tax + self.special_district_tax


# California jurisdictions
TAX_JURISDICTIONS = {
    "CA_SAN_FRANCISCO": TaxJurisdiction(
        state="CA",
        city="San Francisco",
        state_sales_tax=Decimal("0.0725"),  # 7.25% state
        city_sales_tax=Decimal("0.0125"),   # 1.25% city
        county_tax=Decimal("0.0"),          # Included in city
        special_district_tax=Decimal("0.0100"),  # 1% BART district
        food_tax_exempt=False,  # Prepared food is taxable in CA
        delivery_taxable=True   # Delivery fees are taxable in CA
    ),
    "CA_LOS_ANGELES": TaxJurisdiction(
        state="CA",
        city="Los Angeles",
        state_sales_tax=Decimal("0.0725"),
        city_sales_tax=Decimal("0.0225"),   # 2.25% city + county
        county_tax=Decimal("0.0"),
        special_district_tax=Decimal("0.0100"),  # Metro district
        food_tax_exempt=False,
        delivery_taxable=True
    ),
    "CA_SAN_JOSE": TaxJurisdiction(
        state="CA",
        city="San Jose",
        state_sales_tax=Decimal("0.0725"),
        city_sales_tax=Decimal("0.0175"),
        county_tax=Decimal("0.0"),
        special_district_tax=Decimal("0.0025"),
        food_tax_exempt=False,
        delivery_taxable=True
    ),
    "DEFAULT": TaxJurisdiction(
        state="CA",
        city="Default",
        state_sales_tax=Decimal("0.0725"),
        city_sales_tax=Decimal("0.0150"),
        county_tax=Decimal("0.0"),
        special_district_tax=Decimal("0.0050"),
        food_tax_exempt=False,
        delivery_taxable=True
    )
}


# =============================================================================
# FEE STRUCTURE CONSTANTS
# =============================================================================

class PlatformFees:
    """All platform fee constants - FULLY TRANSPARENT"""

    # Platform connection fee - flat $1
    PLATFORM_FEE = Decimal("1.00")
    PLATFORM_FEE_DESCRIPTION = "Platform connection fee for matching you with restaurant and driver"

    # Payment processing fees (passed through at cost)
    STRIPE_PERCENTAGE = Decimal("0.029")      # 2.9%
    STRIPE_FIXED = Decimal("0.30")            # $0.30
    STRIPE_DESCRIPTION = "Payment processing fee (Stripe)"

    # Small order fee threshold
    SMALL_ORDER_THRESHOLD = Decimal("15.00")
    SMALL_ORDER_FEE = Decimal("2.00")
    SMALL_ORDER_DESCRIPTION = "Small order fee (orders under $15)"

    # Delivery base calculation
    DELIVERY_BASE_FEE = Decimal("2.99")       # Base delivery
    DELIVERY_PER_MILE = Decimal("0.50")       # Per mile after first 2 miles
    DELIVERY_FREE_MILES = Decimal("2.0")      # First 2 miles included

    # Driver earnings
    DRIVER_BASE_EARNING = Decimal("3.00")     # Base per delivery
    DRIVER_PER_MILE = Decimal("0.75")         # Per mile
    DRIVER_TIP_PERCENTAGE = Decimal("1.00")   # 100% of tips go to driver

    # Restaurant fees - ZERO commission model
    RESTAURANT_COMMISSION = Decimal("0.00")   # 0% - restaurant keeps 100%
    RESTAURANT_DESCRIPTION = "Restaurant receives 100% of food cost (zero commission)"


# =============================================================================
# FEE BREAKDOWN MODELS
# =============================================================================

class FeeLineItem(BaseModel):
    """Single line item in fee breakdown"""
    name: str
    description: str
    amount: Decimal
    percentage: Optional[Decimal] = None
    recipient: str  # Who receives this money
    category: str   # food, delivery, tax, platform, processing


class CustomerFeeBreakdown(BaseModel):
    """Complete breakdown of what customer pays"""

    # Order details
    order_id: Optional[str] = None
    restaurant_name: str

    # Food items
    food_subtotal: Decimal
    food_items: List[Dict[str, Any]]

    # Delivery
    delivery_fee: Decimal
    delivery_distance_miles: Decimal
    delivery_breakdown: Dict[str, Decimal]

    # Taxes (itemized)
    state_tax: Decimal
    city_tax: Decimal
    county_tax: Decimal
    special_district_tax: Decimal
    total_tax: Decimal
    tax_jurisdiction: str

    # Fees
    platform_fee: Decimal
    small_order_fee: Decimal

    # Processing
    payment_processing_fee: Decimal
    payment_processing_breakdown: Dict[str, Decimal]

    # Tips
    driver_tip: Decimal

    # Totals
    subtotal_before_tax: Decimal
    total_taxes_and_fees: Decimal
    grand_total: Decimal

    # Transparency breakdown - where every dollar goes
    money_flow: Dict[str, Decimal]
    money_flow_percentages: Dict[str, Decimal]

    # Human readable explanation
    explanation: List[str]


class DriverEarningsBreakdown(BaseModel):
    """Complete breakdown of what driver earns"""

    order_id: Optional[str] = None

    # Base earnings
    base_delivery_fee: Decimal
    distance_miles: Decimal
    distance_pay: Decimal

    # Tip
    customer_tip: Decimal
    tip_percentage_kept: Decimal = Decimal("100")  # 100% goes to driver

    # Totals
    total_earnings: Decimal

    # Deductions (for transparency - even though we don't take any)
    platform_deduction: Decimal = Decimal("0.00")
    deduction_description: str = "Dollor.ai takes $0 from driver earnings"

    # Net
    net_earnings: Decimal

    # Explanation
    explanation: List[str]


class RestaurantPayoutBreakdown(BaseModel):
    """Complete breakdown of what restaurant receives"""

    order_id: Optional[str] = None
    restaurant_name: str

    # Food revenue
    food_subtotal: Decimal
    items_sold: List[Dict[str, Any]]

    # Commission (ZERO)
    platform_commission_rate: Decimal = Decimal("0.00")
    platform_commission_amount: Decimal = Decimal("0.00")
    commission_description: str = "Dollor.ai charges 0% commission - you keep 100%"

    # Payment processing (restaurant pays their own)
    payment_processing_fee: Decimal
    payment_processing_rate: str = "2.9% + $0.30"

    # Net payout
    gross_revenue: Decimal
    total_deductions: Decimal
    net_payout: Decimal

    # Comparison with competitors
    competitor_comparison: Dict[str, Dict[str, Decimal]]

    # Explanation
    explanation: List[str]


# =============================================================================
# FEE CALCULATION ENGINE
# =============================================================================

class FeeCalculator:
    """Central fee calculation engine with full transparency"""

    @staticmethod
    def round_currency(amount: Decimal) -> Decimal:
        """Round to 2 decimal places for currency"""
        return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @staticmethod
    def get_tax_jurisdiction(city: str, state: str) -> TaxJurisdiction:
        """Get tax rates for a jurisdiction"""
        key = f"{state.upper()}_{city.upper().replace(' ', '_')}"
        return TAX_JURISDICTIONS.get(key, TAX_JURISDICTIONS["DEFAULT"])

    @classmethod
    def calculate_delivery_fee(cls, distance_miles: Decimal) -> Dict[str, Decimal]:
        """Calculate delivery fee with breakdown"""
        base = PlatformFees.DELIVERY_BASE_FEE

        extra_miles = max(Decimal("0"), distance_miles - PlatformFees.DELIVERY_FREE_MILES)
        distance_charge = cls.round_currency(extra_miles * PlatformFees.DELIVERY_PER_MILE)

        total = cls.round_currency(base + distance_charge)

        return {
            "base_fee": base,
            "free_miles_included": PlatformFees.DELIVERY_FREE_MILES,
            "extra_miles": extra_miles,
            "per_mile_rate": PlatformFees.DELIVERY_PER_MILE,
            "distance_charge": distance_charge,
            "total": total
        }

    @classmethod
    def calculate_taxes(cls, food_subtotal: Decimal, delivery_fee: Decimal,
                       jurisdiction: TaxJurisdiction) -> Dict[str, Decimal]:
        """Calculate all taxes with itemization"""

        # Determine taxable amount
        taxable_amount = food_subtotal
        if jurisdiction.delivery_taxable:
            taxable_amount += delivery_fee

        state_tax = cls.round_currency(taxable_amount * jurisdiction.state_sales_tax)
        city_tax = cls.round_currency(taxable_amount * jurisdiction.city_sales_tax)
        county_tax = cls.round_currency(taxable_amount * jurisdiction.county_tax)
        special_tax = cls.round_currency(taxable_amount * jurisdiction.special_district_tax)

        return {
            "taxable_amount": taxable_amount,
            "state_tax": state_tax,
            "state_tax_rate": jurisdiction.state_sales_tax,
            "city_tax": city_tax,
            "city_tax_rate": jurisdiction.city_sales_tax,
            "county_tax": county_tax,
            "county_tax_rate": jurisdiction.county_tax,
            "special_district_tax": special_tax,
            "special_district_rate": jurisdiction.special_district_tax,
            "total_tax": state_tax + city_tax + county_tax + special_tax,
            "effective_rate": jurisdiction.total_tax_rate
        }

    @classmethod
    def calculate_payment_processing(cls, total_amount: Decimal) -> Dict[str, Decimal]:
        """Calculate Stripe payment processing fee"""
        percentage_fee = cls.round_currency(total_amount * PlatformFees.STRIPE_PERCENTAGE)
        fixed_fee = PlatformFees.STRIPE_FIXED
        total = cls.round_currency(percentage_fee + fixed_fee)

        return {
            "percentage_rate": PlatformFees.STRIPE_PERCENTAGE,
            "percentage_amount": percentage_fee,
            "fixed_fee": fixed_fee,
            "total": total,
            "description": f"{PlatformFees.STRIPE_PERCENTAGE * 100}% + ${fixed_fee} (Stripe)"
        }

    @classmethod
    def calculate_driver_earnings(cls, distance_miles: Decimal,
                                  customer_tip: Decimal) -> Dict[str, Decimal]:
        """Calculate what driver earns"""
        base = PlatformFees.DRIVER_BASE_EARNING
        distance_pay = cls.round_currency(distance_miles * PlatformFees.DRIVER_PER_MILE)

        # Driver keeps 100% of tip
        tip_kept = customer_tip

        total = cls.round_currency(base + distance_pay + tip_kept)

        return {
            "base_earning": base,
            "distance_miles": distance_miles,
            "per_mile_rate": PlatformFees.DRIVER_PER_MILE,
            "distance_pay": distance_pay,
            "customer_tip": customer_tip,
            "tip_percentage_kept": Decimal("100"),
            "tip_amount_kept": tip_kept,
            "platform_takes": Decimal("0.00"),
            "total_earnings": total
        }

    @classmethod
    def calculate_complete_breakdown(
        cls,
        food_items: List[Dict[str, Any]],
        restaurant_name: str,
        delivery_distance_miles: Decimal,
        driver_tip: Decimal,
        city: str,
        state: str,
        order_id: Optional[str] = None
    ) -> CustomerFeeBreakdown:
        """Calculate complete customer fee breakdown"""

        # Food subtotal
        food_subtotal = cls.round_currency(
            sum(Decimal(str(item.get("price", 0))) * item.get("quantity", 1)
                for item in food_items)
        )

        # Delivery
        delivery_breakdown = cls.calculate_delivery_fee(delivery_distance_miles)
        delivery_fee = delivery_breakdown["total"]

        # Get tax jurisdiction
        jurisdiction = cls.get_tax_jurisdiction(city, state)

        # Calculate taxes
        taxes = cls.calculate_taxes(food_subtotal, delivery_fee, jurisdiction)

        # Platform fee (flat $1)
        platform_fee = PlatformFees.PLATFORM_FEE

        # Small order fee
        small_order_fee = Decimal("0.00")
        if food_subtotal < PlatformFees.SMALL_ORDER_THRESHOLD:
            small_order_fee = PlatformFees.SMALL_ORDER_FEE

        # Subtotal before payment processing
        subtotal_before_processing = cls.round_currency(
            food_subtotal + delivery_fee + taxes["total_tax"] +
            platform_fee + small_order_fee + driver_tip
        )

        # Payment processing
        processing = cls.calculate_payment_processing(subtotal_before_processing)

        # Grand total
        grand_total = cls.round_currency(subtotal_before_processing + processing["total"])

        # Money flow breakdown - where every dollar goes
        money_flow = {
            "restaurant": food_subtotal,  # 100% to restaurant
            "driver_delivery": delivery_fee,  # Delivery fee to driver
            "driver_tip": driver_tip,  # 100% tip to driver
            "state_government": taxes["state_tax"],
            "city_government": taxes["city_tax"],
            "county_government": taxes["county_tax"],
            "special_district": taxes["special_district_tax"],
            "platform_dollor": platform_fee,  # $1 to Dollor.ai
            "payment_processor_stripe": processing["total"],
            "small_order_fee_platform": small_order_fee
        }

        # Calculate percentages
        money_flow_percentages = {
            k: cls.round_currency((v / grand_total) * 100) if grand_total > 0 else Decimal("0")
            for k, v in money_flow.items()
        }

        # Human readable explanations
        explanations = [
            f"🍕 FOOD (${food_subtotal}): Goes 100% to {restaurant_name} - we charge them $0 commission",
            f"🚗 DELIVERY (${delivery_fee}): Goes to your driver for picking up and delivering your food",
            f"💰 TIP (${driver_tip}): Goes 100% to your driver - we don't take any cut",
            f"🏛️ STATE TAX (${taxes['state_tax']}): California state sales tax at {taxes['state_tax_rate']*100}%",
            f"🏙️ CITY TAX (${taxes['city_tax']}): {city} city tax at {taxes['city_tax_rate']*100}%",
            f"📱 PLATFORM FEE (${platform_fee}): Dollor.ai connection fee - this is how we make money",
            f"💳 PROCESSING (${processing['total']}): Stripe payment processing - passed through at cost",
        ]

        if small_order_fee > 0:
            explanations.append(f"📦 SMALL ORDER (${small_order_fee}): Fee for orders under ${PlatformFees.SMALL_ORDER_THRESHOLD}")

        return CustomerFeeBreakdown(
            order_id=order_id,
            restaurant_name=restaurant_name,
            food_subtotal=food_subtotal,
            food_items=food_items,
            delivery_fee=delivery_fee,
            delivery_distance_miles=delivery_distance_miles,
            delivery_breakdown=delivery_breakdown,
            state_tax=taxes["state_tax"],
            city_tax=taxes["city_tax"],
            county_tax=taxes["county_tax"],
            special_district_tax=taxes["special_district_tax"],
            total_tax=taxes["total_tax"],
            tax_jurisdiction=f"{city}, {state}",
            platform_fee=platform_fee,
            small_order_fee=small_order_fee,
            payment_processing_fee=processing["total"],
            payment_processing_breakdown=processing,
            driver_tip=driver_tip,
            subtotal_before_tax=food_subtotal + delivery_fee,
            total_taxes_and_fees=taxes["total_tax"] + platform_fee + small_order_fee + processing["total"],
            grand_total=grand_total,
            money_flow=money_flow,
            money_flow_percentages=money_flow_percentages,
            explanation=explanations
        )


# =============================================================================
# API ENDPOINTS
# =============================================================================

class FeeCalculationRequest(BaseModel):
    """Request to calculate fees"""
    food_items: List[Dict[str, Any]] = Field(description="List of food items with name, price, quantity")
    restaurant_name: str
    delivery_distance_miles: float
    driver_tip: float = 0.0
    city: str = "San Francisco"
    state: str = "CA"


@router.post("/calculate", response_model=CustomerFeeBreakdown)
async def calculate_order_fees(request: FeeCalculationRequest):
    """
    Calculate complete fee breakdown for an order.

    Shows exactly where every penny goes:
    - Food cost → 100% to Restaurant
    - Delivery fee → 100% to Driver
    - Driver tip → 100% to Driver
    - Taxes → Government (itemized by jurisdiction)
    - Platform fee → $1 flat to Dollor.ai
    - Processing → Stripe (at cost)
    """
    return FeeCalculator.calculate_complete_breakdown(
        food_items=request.food_items,
        restaurant_name=request.restaurant_name,
        delivery_distance_miles=Decimal(str(request.delivery_distance_miles)),
        driver_tip=Decimal(str(request.driver_tip)),
        city=request.city,
        state=request.state
    )


@router.get("/explain")
async def explain_fee_structure():
    """
    Get human-readable explanation of the entire fee structure.

    Perfect for FAQ pages and customer support.
    """
    return {
        "title": "Dollor.ai Fee Transparency",
        "tagline": "Every penny accounted for, every dollar explained",

        "platform_model": {
            "name": "Section 230 Matchmaking Platform",
            "description": "We connect customers with restaurants and independent delivery drivers",
            "how_we_make_money": "We charge a flat $1 platform fee per order - that's it"
        },

        "customer_fees": {
            "food_cost": {
                "who_pays": "Customer",
                "who_receives": "Restaurant (100%)",
                "description": "The full menu price goes directly to the restaurant",
                "our_cut": "$0.00"
            },
            "delivery_fee": {
                "who_pays": "Customer",
                "who_receives": "Driver (100%)",
                "calculation": f"Base ${PlatformFees.DELIVERY_BASE_FEE} + ${PlatformFees.DELIVERY_PER_MILE}/mile after {PlatformFees.DELIVERY_FREE_MILES} miles",
                "our_cut": "$0.00"
            },
            "driver_tip": {
                "who_pays": "Customer (optional)",
                "who_receives": "Driver (100%)",
                "description": "Tips go entirely to the driver - we never take a cut",
                "our_cut": "$0.00"
            },
            "platform_fee": {
                "who_pays": "Customer",
                "who_receives": "Dollor.ai",
                "amount": f"${PlatformFees.PLATFORM_FEE}",
                "description": "Flat fee for connecting you with restaurants and drivers"
            },
            "taxes": {
                "who_pays": "Customer",
                "who_receives": "Government",
                "description": "Sales tax varies by location (state, city, county, district)",
                "example": "San Francisco: 8.625% total"
            },
            "payment_processing": {
                "who_pays": "Customer",
                "who_receives": "Stripe",
                "rate": "2.9% + $0.30",
                "description": "We pass through payment processing at cost - no markup"
            },
            "small_order_fee": {
                "who_pays": "Customer (if applicable)",
                "who_receives": "Dollor.ai",
                "amount": f"${PlatformFees.SMALL_ORDER_FEE}",
                "condition": f"Orders under ${PlatformFees.SMALL_ORDER_THRESHOLD}",
                "reason": "Helps cover fixed costs on small orders"
            }
        },

        "restaurant_fees": {
            "commission": {
                "rate": "0%",
                "amount": "$0.00",
                "description": "We charge restaurants ZERO commission",
                "comparison": {
                    "DoorDash": "15-30%",
                    "Uber Eats": "15-30%",
                    "Grubhub": "15-30%",
                    "Dollor.ai": "0%"
                }
            },
            "what_restaurant_pays": "Only their own Stripe processing fees (2.9% + $0.30)"
        },

        "driver_earnings": {
            "base_pay": f"${PlatformFees.DRIVER_BASE_EARNING} per delivery",
            "distance_pay": f"${PlatformFees.DRIVER_PER_MILE} per mile",
            "tips": "100% - we never take a cut of tips",
            "platform_takes": "$0.00 from driver earnings",
            "independent_contractor": True,
            "fare_negotiation": "Drivers can negotiate fares for long-distance deliveries"
        },

        "transparency_promise": [
            "We will never hide fees in inflated menu prices",
            "We will always show where every dollar goes",
            "We will never take a cut of driver tips",
            "We will never charge restaurants commission",
            "Our only revenue is the $1 platform fee"
        ],

        "example_order": {
            "scenario": "$50 food order, 3 miles away, $5 tip",
            "breakdown": {
                "food_subtotal": "$50.00 → Restaurant",
                "delivery_fee": "$3.49 → Driver ($2.99 base + $0.50 for extra mile)",
                "driver_tip": "$5.00 → Driver",
                "state_tax": "$3.88 → California",
                "city_tax": "$0.67 → San Francisco",
                "district_tax": "$0.53 → BART District",
                "platform_fee": "$1.00 → Dollor.ai",
                "processing": "$1.88 → Stripe",
                "total": "$66.45"
            },
            "who_gets_what": {
                "restaurant": "$50.00 (75.3%)",
                "driver": "$8.49 (12.8%)",
                "government": "$5.08 (7.6%)",
                "dollor_ai": "$1.00 (1.5%)",
                "stripe": "$1.88 (2.8%)"
            }
        }
    }


@router.get("/driver-earnings-example")
async def driver_earnings_example(distance_miles: float = 3.0, tip: float = 5.0):
    """
    Show example of what a driver earns on a delivery.

    Demonstrates complete transparency:
    - Base pay
    - Distance pay
    - Tips (100% kept)
    - Platform deductions ($0)
    """
    earnings = FeeCalculator.calculate_driver_earnings(
        distance_miles=Decimal(str(distance_miles)),
        customer_tip=Decimal(str(tip))
    )

    return DriverEarningsBreakdown(
        distance_miles=Decimal(str(distance_miles)),
        base_delivery_fee=earnings["base_earning"],
        distance_pay=earnings["distance_pay"],
        customer_tip=Decimal(str(tip)),
        tip_percentage_kept=Decimal("100"),
        total_earnings=earnings["total_earnings"],
        platform_deduction=Decimal("0.00"),
        deduction_description="Dollor.ai takes $0 from your earnings - you keep everything",
        net_earnings=earnings["total_earnings"],
        explanation=[
            f"💵 BASE PAY: ${earnings['base_earning']} - Guaranteed per delivery",
            f"🚗 DISTANCE: ${earnings['distance_pay']} - {distance_miles} miles × ${PlatformFees.DRIVER_PER_MILE}/mile",
            f"💰 TIP: ${tip} - You keep 100% of customer tips",
            f"❌ PLATFORM FEE: $0.00 - We don't take anything from drivers",
            f"✅ YOUR TOTAL: ${earnings['total_earnings']} - This is all yours"
        ]
    )


@router.get("/restaurant-payout-example")
async def restaurant_payout_example(food_subtotal: float = 50.0):
    """
    Show example of what a restaurant receives from an order.

    Demonstrates our zero-commission model vs competitors.
    """
    subtotal = Decimal(str(food_subtotal))
    processing = FeeCalculator.calculate_payment_processing(subtotal)

    net_payout = FeeCalculator.round_currency(subtotal - processing["total"])

    # Competitor comparison
    competitor_rates = {
        "DoorDash": Decimal("0.25"),
        "Uber Eats": Decimal("0.30"),
        "Grubhub": Decimal("0.25"),
        "Postmates": Decimal("0.30")
    }

    competitor_comparison = {}
    for name, rate in competitor_rates.items():
        commission = FeeCalculator.round_currency(subtotal * rate)
        competitor_comparison[name] = {
            "commission_rate": f"{rate * 100}%",
            "commission_amount": commission,
            "net_payout": FeeCalculator.round_currency(subtotal - commission - processing["total"]),
            "you_lose": commission
        }

    return RestaurantPayoutBreakdown(
        restaurant_name="Your Restaurant",
        food_subtotal=subtotal,
        items_sold=[{"example": "Menu items totaling", "amount": str(subtotal)}],
        platform_commission_rate=Decimal("0.00"),
        platform_commission_amount=Decimal("0.00"),
        commission_description="Dollor.ai charges 0% commission - you keep 100% of food sales",
        payment_processing_fee=processing["total"],
        payment_processing_rate="2.9% + $0.30",
        gross_revenue=subtotal,
        total_deductions=processing["total"],
        net_payout=net_payout,
        competitor_comparison=competitor_comparison,
        explanation=[
            f"🍕 YOUR FOOD SALES: ${subtotal}",
            f"📱 DOLLOR.AI COMMISSION: $0.00 (0%) - We charge you nothing",
            f"💳 STRIPE PROCESSING: ${processing['total']} (2.9% + $0.30) - Standard rate",
            f"✅ YOU RECEIVE: ${net_payout}",
            "",
            "📊 COMPARISON - What you'd get elsewhere:",
            f"   DoorDash (25%): ${competitor_comparison['DoorDash']['net_payout']} - You LOSE ${competitor_comparison['DoorDash']['commission_amount']}",
            f"   Uber Eats (30%): ${competitor_comparison['Uber Eats']['net_payout']} - You LOSE ${competitor_comparison['Uber Eats']['commission_amount']}",
            f"   Grubhub (25%): ${competitor_comparison['Grubhub']['net_payout']} - You LOSE ${competitor_comparison['Grubhub']['commission_amount']}",
            "",
            f"💰 WITH DOLLOR.AI YOU SAVE: ${competitor_comparison['DoorDash']['commission_amount']} per order vs DoorDash"
        ]
    )


@router.get("/tax-rates/{city}")
async def get_tax_rates(city: str, state: str = "CA"):
    """Get tax rates for a specific city"""
    jurisdiction = FeeCalculator.get_tax_jurisdiction(city, state)

    return {
        "jurisdiction": f"{jurisdiction.city}, {jurisdiction.state}",
        "rates": {
            "state_sales_tax": f"{jurisdiction.state_sales_tax * 100}%",
            "city_tax": f"{jurisdiction.city_tax * 100}%",
            "county_tax": f"{jurisdiction.county_tax * 100}%",
            "special_district_tax": f"{jurisdiction.special_district_tax * 100}%",
            "total_rate": f"{jurisdiction.total_tax_rate * 100}%"
        },
        "notes": {
            "food_tax_exempt": jurisdiction.food_tax_exempt,
            "delivery_taxable": jurisdiction.delivery_taxable
        },
        "example": {
            "on_50_dollar_order": {
                "taxable_amount": "$50.00",
                "tax_amount": f"${FeeCalculator.round_currency(Decimal('50') * jurisdiction.total_tax_rate)}"
            }
        }
    }


@router.get("/platform-profitability")
async def platform_profitability():
    """
    Show how Dollor.ai makes money (for complete transparency).

    We believe in showing exactly how the platform sustains itself.
    """

    platform_fee = PlatformFees.PLATFORM_FEE
    stripe_on_platform_fee = FeeCalculator.calculate_payment_processing(platform_fee)
    net_per_order = FeeCalculator.round_currency(platform_fee - stripe_on_platform_fee["total"])

    return {
        "our_revenue_source": "Flat $1 platform fee per order",

        "per_order_economics": {
            "gross_fee": f"${platform_fee}",
            "stripe_processing": f"${stripe_on_platform_fee['total']}",
            "net_to_platform": f"${net_per_order}",
            "margin": f"{FeeCalculator.round_currency((net_per_order / platform_fee) * 100)}%"
        },

        "monthly_projections": {
            "1000_orders": {
                "gross_revenue": "$1,000",
                "stripe_fees": "$330",
                "hosting_costs": "$100",
                "net_profit": "$570",
                "margin": "57%"
            },
            "10000_orders": {
                "gross_revenue": "$10,000",
                "stripe_fees": "$3,300",
                "hosting_costs": "$500",
                "net_profit": "$6,200",
                "margin": "62%"
            },
            "100000_orders": {
                "gross_revenue": "$100,000",
                "stripe_fees": "$33,000",
                "hosting_costs": "$2,000",
                "net_profit": "$65,000",
                "margin": "65%"
            }
        },

        "what_we_dont_take": [
            "❌ $0 from restaurants (no commission)",
            "❌ $0 from driver earnings",
            "❌ $0 from driver tips",
            "❌ $0 markup on menu prices"
        ],

        "why_this_works": [
            "Low overhead - cloud-native infrastructure",
            "Automated matching - no manual dispatch",
            "Volume-based profitability - small margin, big volume",
            "Community trust - transparency builds loyalty"
        ],

        "sustainability": {
            "breakeven_orders_per_month": "~750",
            "current_hosting_cost": "$500/month at scale",
            "customer_acquisition_cost": "Target: $5",
            "lifetime_value": "Target: $50 (50 orders)"
        }
    }


# =============================================================================
# RECEIPT GENERATION
# =============================================================================

@router.post("/generate-receipt")
async def generate_receipt(request: FeeCalculationRequest, order_id: str = "ORD-123456"):
    """
    Generate a detailed receipt showing complete fee transparency.

    This is what customers see after ordering - every penny explained.
    """
    breakdown = FeeCalculator.calculate_complete_breakdown(
        food_items=request.food_items,
        restaurant_name=request.restaurant_name,
        delivery_distance_miles=Decimal(str(request.delivery_distance_miles)),
        driver_tip=Decimal(str(request.driver_tip)),
        city=request.city,
        state=request.state,
        order_id=order_id
    )

    receipt_lines = [
        "═" * 50,
        "           DOLLOR.AI - ORDER RECEIPT",
        "        Every Penny Accounted For",
        "═" * 50,
        f"Order ID: {order_id}",
        f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"Restaurant: {request.restaurant_name}",
        "─" * 50,
        "",
        "FOOD ITEMS:",
    ]

    for item in request.food_items:
        qty = item.get("quantity", 1)
        price = Decimal(str(item.get("price", 0)))
        name = item.get("name", "Item")
        receipt_lines.append(f"  {qty}x {name}: ${price * qty}")

    receipt_lines.extend([
        "",
        f"  Food Subtotal: ${breakdown.food_subtotal}",
        f"  └─ 100% goes to {request.restaurant_name}",
        "",
        "─" * 50,
        "DELIVERY:",
        f"  Distance: {breakdown.delivery_distance_miles} miles",
        f"  Delivery Fee: ${breakdown.delivery_fee}",
        f"  └─ 100% goes to your driver",
        "",
        "─" * 50,
        f"DRIVER TIP: ${breakdown.driver_tip}",
        f"  └─ 100% goes to your driver",
        "",
        "─" * 50,
        f"TAXES ({breakdown.tax_jurisdiction}):",
        f"  State Tax (CA): ${breakdown.state_tax}",
        f"  City Tax: ${breakdown.city_tax}",
        f"  District Tax: ${breakdown.special_district_tax}",
        f"  Total Tax: ${breakdown.total_tax}",
        "",
        "─" * 50,
        "FEES:",
        f"  Platform Fee: ${breakdown.platform_fee}",
        f"  └─ Dollor.ai connection fee",
    ])

    if breakdown.small_order_fee > 0:
        receipt_lines.append(f"  Small Order Fee: ${breakdown.small_order_fee}")

    receipt_lines.extend([
        f"  Processing (Stripe): ${breakdown.payment_processing_fee}",
        f"  └─ Passed through at cost",
        "",
        "═" * 50,
        f"TOTAL: ${breakdown.grand_total}",
        "═" * 50,
        "",
        "WHERE YOUR MONEY GOES:",
    ])

    for recipient, amount in breakdown.money_flow.items():
        if amount > 0:
            pct = breakdown.money_flow_percentages[recipient]
            name = recipient.replace("_", " ").title()
            receipt_lines.append(f"  {name}: ${amount} ({pct}%)")

    receipt_lines.extend([
        "",
        "─" * 50,
        "TRANSPARENCY PROMISE:",
        "  ✓ Restaurant gets 100% (0% commission)",
        "  ✓ Driver keeps 100% of tips",
        "  ✓ All fees clearly itemized",
        "  ✓ No hidden charges",
        "",
        "Thank you for using Dollor.ai!",
        "Questions? support@dollor.ai",
        "═" * 50,
    ])

    return {
        "receipt_text": "\n".join(receipt_lines),
        "breakdown": breakdown,
        "order_id": order_id
    }
