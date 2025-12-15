"""
DOLLOR.AI PRICING CONFIGURATION
================================
Centralized pricing configuration for the entire platform.
All fees, rates, and calculations are defined here.

TIERED PRICING MODEL (Effective Dec 2024):
==========================================
Customer Delivery Fee:
  - Order ≤ $35:    $1
  - Order $35-$70:  $2
  - Order > $70:    $3

Restaurant Platform Fee:
  - Order ≤ $35:    $1
  - Order $35-$70:  $2
  - Order > $70:    $3

Rideshare Platform Fee:
  - Fare ≤ $15:     $1
  - Fare $15-$35:   $2
  - Fare > $35:     $3

This replaces all hardcoded values across order_flow.py, rideshare.py, and iOS apps.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Tuple, List
from enum import Enum
import math


# =============================================================================
# TIERED PRICING THRESHOLDS
# =============================================================================

@dataclass
class TieredPricingConfig:
    """
    Tiered pricing configuration for both delivery and rideshare.

    Tiers are defined by order/fare value thresholds.
    Each tier has a corresponding flat fee.
    """
    # Tier thresholds (order value or fare value)
    tier1_max: float = 35.00    # Orders/fares up to $35
    tier2_max: float = 70.00    # Orders/fares $35.01 to $70
    # tier3: Everything above $70

    # Customer delivery fees
    customer_tier1_fee: float = 1.00   # $1 for orders ≤ $35
    customer_tier2_fee: float = 2.00   # $2 for orders $35.01-$70
    customer_tier3_fee: float = 3.00   # $3 for orders > $70

    # Restaurant platform fees (same tiers)
    restaurant_tier1_fee: float = 1.00  # $1 for orders ≤ $35
    restaurant_tier2_fee: float = 2.00  # $2 for orders $35.01-$70
    restaurant_tier3_fee: float = 3.00  # $3 for orders > $70

    # Rideshare platform fees (different thresholds)
    rideshare_tier1_max: float = 15.00   # Fares up to $15
    rideshare_tier2_max: float = 35.00   # Fares $15.01 to $35
    rideshare_tier1_fee: float = 1.00    # $1 for fares ≤ $15
    rideshare_tier2_fee: float = 2.00    # $2 for fares $15.01-$35
    rideshare_tier3_fee: float = 3.00    # $3 for fares > $35

    def get_customer_delivery_fee(self, order_subtotal: float) -> float:
        """Get customer delivery fee based on order subtotal"""
        if order_subtotal <= self.tier1_max:
            return self.customer_tier1_fee
        elif order_subtotal <= self.tier2_max:
            return self.customer_tier2_fee
        else:
            return self.customer_tier3_fee

    def get_restaurant_platform_fee(self, order_subtotal: float) -> float:
        """Get restaurant platform fee based on order subtotal"""
        if order_subtotal <= self.tier1_max:
            return self.restaurant_tier1_fee
        elif order_subtotal <= self.tier2_max:
            return self.restaurant_tier2_fee
        else:
            return self.restaurant_tier3_fee

    def get_rideshare_platform_fee(self, fare_amount: float) -> float:
        """Get rideshare platform fee based on fare amount"""
        if fare_amount <= self.rideshare_tier1_max:
            return self.rideshare_tier1_fee
        elif fare_amount <= self.rideshare_tier2_max:
            return self.rideshare_tier2_fee
        else:
            return self.rideshare_tier3_fee

    def get_fee_tier_description(self, amount: float, fee_type: str = "delivery") -> str:
        """Get human-readable tier description"""
        if fee_type == "rideshare":
            if amount <= self.rideshare_tier1_max:
                return f"Tier 1 (≤${self.rideshare_tier1_max}): ${self.rideshare_tier1_fee}"
            elif amount <= self.rideshare_tier2_max:
                return f"Tier 2 (${self.rideshare_tier1_max+0.01}-${self.rideshare_tier2_max}): ${self.rideshare_tier2_fee}"
            else:
                return f"Tier 3 (>${self.rideshare_tier2_max}): ${self.rideshare_tier3_fee}"
        else:
            if amount <= self.tier1_max:
                return f"Tier 1 (≤${self.tier1_max}): ${self.customer_tier1_fee}"
            elif amount <= self.tier2_max:
                return f"Tier 2 (${self.tier1_max+0.01}-${self.tier2_max}): ${self.customer_tier2_fee}"
            else:
                return f"Tier 3 (>${self.tier2_max}): ${self.customer_tier3_fee}"


# Global tiered pricing configuration
TIERED_PRICING = TieredPricingConfig()

# =============================================================================
# STATE TAX RATES (US)
# =============================================================================

STATE_TAX_RATES = {
    # States with NO sales tax on food
    "DE": 0.0,      # Delaware - No sales tax
    "MT": 0.0,      # Montana - No sales tax
    "NH": 0.0,      # New Hampshire - No sales tax
    "OR": 0.0,      # Oregon - No sales tax

    # States with reduced/no tax on groceries (but tax prepared food)
    "AL": 0.04,     # Alabama
    "AK": 0.0,      # Alaska - No state tax (local varies)
    "AZ": 0.056,    # Arizona
    "AR": 0.065,    # Arkansas
    "CA": 0.0725,   # California
    "CO": 0.029,    # Colorado
    "CT": 0.0635,   # Connecticut
    "FL": 0.06,     # Florida
    "GA": 0.04,     # Georgia
    "HI": 0.04,     # Hawaii
    "ID": 0.06,     # Idaho
    "IL": 0.0625,   # Illinois
    "IN": 0.07,     # Indiana
    "IA": 0.06,     # Iowa
    "KS": 0.065,    # Kansas
    "KY": 0.06,     # Kentucky
    "LA": 0.0445,   # Louisiana
    "ME": 0.055,    # Maine
    "MD": 0.06,     # Maryland
    "MA": 0.0625,   # Massachusetts
    "MI": 0.06,     # Michigan
    "MN": 0.06875,  # Minnesota
    "MS": 0.07,     # Mississippi
    "MO": 0.04225,  # Missouri
    "NE": 0.055,    # Nebraska
    "NV": 0.0685,   # Nevada
    "NJ": 0.06625,  # New Jersey
    "NM": 0.05125,  # New Mexico
    "NY": 0.08,     # New York
    "NC": 0.0475,   # North Carolina
    "ND": 0.05,     # North Dakota
    "OH": 0.0575,   # Ohio
    "OK": 0.045,    # Oklahoma
    "PA": 0.06,     # Pennsylvania
    "RI": 0.07,     # Rhode Island
    "SC": 0.06,     # South Carolina
    "SD": 0.045,    # South Dakota
    "TN": 0.07,     # Tennessee
    "TX": 0.0625,   # Texas
    "UT": 0.0485,   # Utah
    "VT": 0.06,     # Vermont
    "VA": 0.053,    # Virginia
    "WA": 0.065,    # Washington
    "WV": 0.06,     # West Virginia
    "WI": 0.05,     # Wisconsin
    "WY": 0.04,     # Wyoming
    "DC": 0.06,     # District of Columbia
}

# Default tax rate for unknown states
DEFAULT_TAX_RATE = 0.08


# =============================================================================
# PLATFORM FEE CONFIGURATION
# =============================================================================

class PlatformFeeModel(Enum):
    FLAT = "flat"              # Fixed dollar amount per order
    PERCENTAGE = "percentage"   # Percentage of subtotal
    HYBRID = "hybrid"          # Base + percentage
    TIERED = "tiered"          # Tiered based on order value (NEW!)


@dataclass
class PlatformFeeConfig:
    """
    Platform fee charged to customers.

    NEW TIERED MODEL (Dec 2024):
    - Order ≤ $35:    $1
    - Order $35-$70:  $2
    - Order > $70:    $3
    """
    model: PlatformFeeModel = PlatformFeeModel.TIERED  # Changed to tiered!
    flat_fee: float = 1.00           # $1.00 base (legacy, used for backwards compat)
    percentage_fee: float = 0.0      # 0% if flat/tiered model
    min_fee: float = 1.00            # Minimum fee
    max_fee: float = 3.00            # Maximum fee cap

    def calculate(self, subtotal: float) -> float:
        """Calculate platform fee based on model - NOW USES TIERED PRICING"""
        if self.model == PlatformFeeModel.TIERED:
            # Use global tiered pricing configuration
            return TIERED_PRICING.get_customer_delivery_fee(subtotal)
        elif self.model == PlatformFeeModel.FLAT:
            fee = self.flat_fee
        elif self.model == PlatformFeeModel.PERCENTAGE:
            fee = subtotal * self.percentage_fee
        else:  # HYBRID
            fee = self.flat_fee + (subtotal * self.percentage_fee)

        # Apply min/max caps
        return max(self.min_fee, min(self.max_fee, fee))

    def get_fee_breakdown(self, subtotal: float) -> Dict[str, any]:
        """Get detailed fee breakdown for transparency"""
        fee = self.calculate(subtotal)
        return {
            "fee": fee,
            "model": self.model.value,
            "tier": TIERED_PRICING.get_fee_tier_description(subtotal, "delivery") if self.model == PlatformFeeModel.TIERED else "flat",
            "subtotal": subtotal
        }


# Current platform fee configuration - NOW TIERED!
PLATFORM_FEE_CONFIG = PlatformFeeConfig(
    model=PlatformFeeModel.TIERED,
    flat_fee=1.00,  # Legacy fallback
    percentage_fee=0.0,
    min_fee=1.00,
    max_fee=3.00
)


# =============================================================================
# DELIVERY FEE CONFIGURATION
# =============================================================================

@dataclass
class DeliveryFeeConfig:
    """Delivery fee configuration with distance-based pricing"""
    base_fee: float = 2.99           # Base delivery fee
    per_mile_fee: float = 0.50       # Additional per mile
    free_delivery_threshold: float = 35.00  # Free delivery over this amount
    min_fee: float = 2.99            # Minimum delivery fee
    max_fee: float = 12.99           # Maximum delivery fee cap
    max_delivery_distance: float = 15.0  # Maximum delivery distance in miles

    def calculate(self, subtotal: float, distance_miles: float) -> float:
        """Calculate delivery fee based on distance and order amount

        There is NO free delivery - someone has to deliver the order and pay for
        gas, time, and vehicle costs. The minimum fee covers basic delivery costs.
        """
        # Distance-based calculation
        fee = self.base_fee + (distance_miles * self.per_mile_fee)

        # Apply min/max caps - ALWAYS at least min_fee
        return round(max(self.min_fee, min(self.max_fee, fee)), 2)

    def is_deliverable(self, distance_miles: float) -> bool:
        """Check if distance is within delivery range"""
        return distance_miles <= self.max_delivery_distance


# Current delivery fee configuration
DELIVERY_FEE_CONFIG = DeliveryFeeConfig(
    base_fee=2.99,
    per_mile_fee=0.50,
    free_delivery_threshold=35.00,
    min_fee=2.99,
    max_fee=12.99,
    max_delivery_distance=15.0
)


# =============================================================================
# DRIVER PAYOUT CONFIGURATION
# =============================================================================

@dataclass
class DriverPayoutConfig:
    """Driver compensation configuration"""
    base_pay: float = 2.00           # Base pay per delivery
    per_mile_pay: float = 0.60       # Pay per mile
    min_payout: float = 4.00         # Minimum payout per delivery
    tip_percentage: float = 1.0      # 100% of tip goes to driver
    surge_enabled: bool = True       # Enable surge pricing

    def calculate_base_payout(self, distance_miles: float) -> float:
        """Calculate base driver payout before tips"""
        payout = self.base_pay + (distance_miles * self.per_mile_pay)
        return max(self.min_payout, round(payout, 2))

    def calculate_total_payout(self, distance_miles: float, tip: float, surge_multiplier: float = 1.0) -> float:
        """Calculate total driver payout including tips and surge"""
        base = self.calculate_base_payout(distance_miles)
        if self.surge_enabled:
            base = base * surge_multiplier
        return round(base + (tip * self.tip_percentage), 2)


# Current driver payout configuration
DRIVER_PAYOUT_CONFIG = DriverPayoutConfig(
    base_pay=2.00,
    per_mile_pay=0.60,
    min_payout=4.00,
    tip_percentage=1.0,
    surge_enabled=True
)


# =============================================================================
# RESTAURANT COMMISSION CONFIGURATION
# =============================================================================

@dataclass
class RestaurantCommissionConfig:
    """
    Restaurant commission/payout configuration.

    NEW TIERED MODEL (Dec 2024):
    - Order ≤ $35:    $1 platform fee
    - Order $35-$70:  $2 platform fee
    - Order > $70:    $3 platform fee

    This is DRAMATICALLY lower than competitors (15-30%).
    """
    commission_model: str = "tiered"   # "flat", "percentage", or "tiered" (NEW!)
    flat_commission: float = 1.00      # $1.00 flat per order (legacy fallback)
    percentage_commission: float = 0.0  # 0% if flat/tiered model
    min_commission: float = 1.00       # Minimum commission
    max_commission: float = 3.00       # Maximum commission cap (tiered max)

    def calculate_commission(self, subtotal: float) -> float:
        """Calculate platform commission from restaurant - NOW TIERED!"""
        if self.commission_model == "tiered":
            # Use global tiered pricing configuration
            return TIERED_PRICING.get_restaurant_platform_fee(subtotal)
        elif self.commission_model == "flat":
            commission = self.flat_commission
        else:  # percentage
            commission = subtotal * self.percentage_commission

        return max(self.min_commission, min(self.max_commission, commission))

    def calculate_restaurant_payout(self, subtotal: float) -> float:
        """Calculate what restaurant receives after commission

        IMPORTANT: Never return negative - if subtotal is too low to cover commission,
        return 0. This prevents scenarios where restaurants would owe money.
        """
        if subtotal <= 0:
            return 0.0
        commission = self.calculate_commission(subtotal)
        payout = subtotal - commission
        # Never allow negative payouts
        return round(max(0.0, payout), 2)

    def get_commission_breakdown(self, subtotal: float) -> Dict[str, any]:
        """Get detailed commission breakdown for transparency"""
        commission = self.calculate_commission(subtotal)
        return {
            "commission": commission,
            "model": self.commission_model,
            "tier": TIERED_PRICING.get_fee_tier_description(subtotal, "delivery") if self.commission_model == "tiered" else "flat",
            "restaurant_receives": self.calculate_restaurant_payout(subtotal),
            "subtotal": subtotal
        }


# Current restaurant commission configuration - NOW TIERED!
RESTAURANT_COMMISSION_CONFIG = RestaurantCommissionConfig(
    commission_model="tiered",
    flat_commission=1.00,  # Legacy fallback
    percentage_commission=0.0,
    min_commission=1.00,
    max_commission=3.00
)


# =============================================================================
# PAYMENT PROCESSING CONFIGURATION
# =============================================================================

@dataclass
class PaymentProcessingConfig:
    """
    Payment processing fees (Stripe, Apple Pay, Google Pay)

    IMPORTANT: Apple App Store Commission
    =====================================
    Apple charges 30% on in-app purchases (15% for Small Business Program).

    However, for PHYSICAL GOODS AND SERVICES (food delivery, rideshare), Apple's
    guidelines state that their commission does NOT apply:

    "Apps may use in-app purchase currencies to enable customers to 'tip' digital
    content providers in the app. Apps that offer digital content or services for
    purchase must use in-app purchase, but physical goods and services can use
    other payment methods."

    DOLLOR.AI QUALIFIES FOR EXEMPTION:
    - Food delivery = physical goods
    - Rideshare = physical service
    - Tips = can use external payment

    We use Stripe for all payments, which charges 2.9% + $0.30.
    Apple Pay through Stripe = same Stripe fees (no additional Apple cut).
    """
    # Stripe fees (same for Apple Pay / Google Pay through Stripe)
    stripe_percentage: float = 0.029     # 2.9%
    stripe_fixed: float = 0.30           # $0.30 per transaction

    # Apple In-App Purchase commission (for digital goods only - NOT applicable to us)
    # Keeping for reference if we ever add digital products
    apple_iap_percentage: float = 0.30   # 30% standard
    apple_small_business_percentage: float = 0.15  # 15% for Small Business Program (<$1M/year)

    # PHYSICAL GOODS EXEMPTION: Apple does NOT take commission on physical goods/services
    # Food delivery and rideshare are exempt from Apple's IAP requirements
    apple_commission_applicable: bool = False  # Set to True only for digital goods
    use_small_business_rate: bool = True  # We qualify for Small Business Program

    # Who absorbs the fee
    fee_absorbed_by: str = "platform"    # "platform", "restaurant", or "split"

    # ACH payout fees
    ach_payout_fee: float = 0.25         # $0.25 per ACH transfer

    def calculate_stripe_fee(self, amount: float) -> float:
        """Calculate Stripe processing fee"""
        return round((amount * self.stripe_percentage) + self.stripe_fixed, 2)

    def calculate_apple_fee(self, amount: float) -> float:
        """
        Calculate Apple commission (for digital goods only).

        IMPORTANT: Returns 0 for Dollor.ai because:
        - Food delivery = physical goods (exempt)
        - Rideshare = physical service (exempt)
        - Tips can use external payment (exempt)

        Apple's App Store Review Guidelines Section 3.1.3(e):
        "Goods and services outside of the app: If your app enables people to
        purchase physical goods or services that will be consumed outside of the
        app, you must use purchase methods other than in-app purchase to collect
        those payments, such as Apple Pay or traditional credit card entry."
        """
        if not self.apple_commission_applicable:
            return 0.0

        rate = self.apple_small_business_percentage if self.use_small_business_rate else self.apple_iap_percentage
        return round(amount * rate, 2)

    def calculate_total_processing_fee(self, amount: float) -> float:
        """Calculate total processing fees (Stripe + Apple if applicable)"""
        stripe = self.calculate_stripe_fee(amount)
        apple = self.calculate_apple_fee(amount)
        return round(stripe + apple, 2)

    def calculate_net_amount(self, amount: float) -> float:
        """Calculate amount after all processing fees"""
        fee = self.calculate_total_processing_fee(amount)
        return round(amount - fee, 2)

    def get_fee_breakdown(self, amount: float) -> Dict[str, any]:
        """Get detailed fee breakdown for transparency"""
        stripe_fee = self.calculate_stripe_fee(amount)
        apple_fee = self.calculate_apple_fee(amount)
        return {
            "amount": amount,
            "stripe_fee": stripe_fee,
            "stripe_rate": f"{self.stripe_percentage*100}% + ${self.stripe_fixed}",
            "apple_fee": apple_fee,
            "apple_applicable": self.apple_commission_applicable,
            "apple_exemption_reason": "Physical goods/services (food delivery, rideshare)" if not self.apple_commission_applicable else None,
            "total_fees": stripe_fee + apple_fee,
            "net_amount": amount - stripe_fee - apple_fee
        }


# Current payment processing configuration
# NOTE: Apple commission is NOT applicable for physical goods (food delivery, rideshare)
PAYMENT_PROCESSING_CONFIG = PaymentProcessingConfig(
    stripe_percentage=0.029,
    stripe_fixed=0.30,
    apple_iap_percentage=0.30,
    apple_small_business_percentage=0.15,
    apple_commission_applicable=False,  # EXEMPT - physical goods/services
    use_small_business_rate=True,
    fee_absorbed_by="platform",
    ach_payout_fee=0.25
)


# =============================================================================
# SURGE PRICING CONFIGURATION
# =============================================================================

@dataclass
class SurgePricingConfig:
    """Surge pricing for high-demand periods"""
    enabled: bool = True

    # Surge thresholds
    low_demand_orders: int = 5       # Orders in queue < this = no surge
    medium_demand_orders: int = 15   # Orders in queue < this = 1.25x
    high_demand_orders: int = 25     # Orders in queue < this = 1.5x
    extreme_demand_orders: int = 40  # Orders in queue >= this = 2.0x

    # Surge multipliers
    no_surge: float = 1.0
    low_surge: float = 1.25
    medium_surge: float = 1.5
    high_surge: float = 2.0

    # Peak hour settings (24-hour format)
    peak_hours: list = None  # Will default to [11, 12, 13, 18, 19, 20]
    peak_hour_base_surge: float = 1.1

    def __post_init__(self):
        if self.peak_hours is None:
            self.peak_hours = [11, 12, 13, 18, 19, 20]  # Lunch & dinner

    def get_surge_multiplier(self, orders_in_queue: int, current_hour: int = None) -> float:
        """Calculate surge multiplier based on demand"""
        if not self.enabled:
            return 1.0

        # Base multiplier from queue size
        if orders_in_queue < self.low_demand_orders:
            multiplier = self.no_surge
        elif orders_in_queue < self.medium_demand_orders:
            multiplier = self.low_surge
        elif orders_in_queue < self.high_demand_orders:
            multiplier = self.medium_surge
        else:
            multiplier = self.high_surge

        # Add peak hour boost
        if current_hour is not None and current_hour in self.peak_hours:
            multiplier = multiplier * self.peak_hour_base_surge

        return round(multiplier, 2)


# Current surge pricing configuration
SURGE_PRICING_CONFIG = SurgePricingConfig(
    enabled=True,
    low_demand_orders=5,
    medium_demand_orders=15,
    high_demand_orders=25,
    extreme_demand_orders=40
)


# =============================================================================
# ORDER VALIDATION CONFIGURATION
# =============================================================================

@dataclass
class OrderValidationConfig:
    """Order validation rules"""
    min_order_amount: float = 10.00      # Minimum order subtotal
    max_order_amount: float = 500.00     # Maximum order amount
    max_items_per_order: int = 50        # Maximum items in one order
    max_quantity_per_item: int = 20      # Maximum quantity of single item

    def validate_order(self, subtotal: float, item_count: int = 0) -> Tuple[bool, str]:
        """Validate order meets requirements"""
        if subtotal < self.min_order_amount:
            return False, f"Minimum order amount is ${self.min_order_amount:.2f}"
        if subtotal > self.max_order_amount:
            return False, f"Maximum order amount is ${self.max_order_amount:.2f}"
        if item_count > self.max_items_per_order:
            return False, f"Maximum {self.max_items_per_order} items per order"
        return True, "Valid"


# Current order validation configuration
ORDER_VALIDATION_CONFIG = OrderValidationConfig(
    min_order_amount=10.00,
    max_order_amount=500.00,
    max_items_per_order=50,
    max_quantity_per_item=20
)


# =============================================================================
# RIDESHARE PRICING CONFIGURATION
# =============================================================================

@dataclass
class RidesharePricingConfig:
    """
    Rideshare fare calculation with TIERED platform fees.

    NEW TIERED MODEL (Dec 2024):
    - Fare ≤ $15:     $1 platform fee
    - Fare $15-$35:   $2 platform fee
    - Fare > $35:     $3 platform fee

    Driver receives: Base fare + distance + time + tips
    Platform receives: Tiered fee only ($1-$3)
    """
    base_fare: float = 2.00           # Base fare (to driver)
    per_mile_rate: float = 1.00       # Per mile (to driver)
    per_minute_rate: float = 0.15     # Per minute (to driver)
    platform_fee: float = 1.00        # Legacy flat fee (now tiered)
    min_fare: float = 5.00            # Minimum total fare
    cancellation_fee: float = 5.00    # Customer cancellation fee
    use_tiered_pricing: bool = True   # Enable tiered pricing

    # Surge pricing
    surge_enabled: bool = True
    max_surge_multiplier: float = 3.0

    def get_platform_fee(self, fare_before_platform: float) -> float:
        """Get platform fee - NOW TIERED based on fare amount"""
        if self.use_tiered_pricing:
            return TIERED_PRICING.get_rideshare_platform_fee(fare_before_platform)
        return self.platform_fee

    def calculate_fare(
        self,
        distance_miles: float,
        duration_minutes: float,
        surge_multiplier: float = 1.0,
        tip: float = 0.0
    ) -> Dict[str, float]:
        """Calculate rideshare fare breakdown with tiered platform fees"""
        # Base calculations
        distance_charge = distance_miles * self.per_mile_rate
        time_charge = duration_minutes * self.per_minute_rate

        # Driver earnings (before surge)
        driver_base = self.base_fare + distance_charge + time_charge

        # Apply surge to driver earnings only
        if self.surge_enabled and surge_multiplier > 1.0:
            surge_multiplier = min(surge_multiplier, self.max_surge_multiplier)
            driver_earnings = driver_base * surge_multiplier
        else:
            driver_earnings = driver_base

        # Calculate platform fee based on driver earnings (tiered)
        platform_fee = self.get_platform_fee(driver_earnings)

        # Total fare = driver earnings + platform fee
        total_fare = driver_earnings + platform_fee

        # Apply minimum fare
        if total_fare < self.min_fare:
            # Adjust driver earnings to meet minimum
            driver_earnings = self.min_fare - platform_fee
            total_fare = self.min_fare

        # Add tip to driver earnings (100% goes to driver)
        driver_earnings_with_tip = driver_earnings + tip
        total_fare_with_tip = total_fare + tip

        return {
            "base_fare": round(self.base_fare, 2),
            "distance_charge": round(distance_charge, 2),
            "time_charge": round(time_charge, 2),
            "surge_multiplier": round(surge_multiplier, 2),
            "driver_earnings": round(driver_earnings_with_tip, 2),
            "driver_earnings_before_tip": round(driver_earnings, 2),
            "platform_fee": round(platform_fee, 2),
            "tip": round(tip, 2),
            "total_fare": round(total_fare_with_tip, 2),
            "total_fare_before_tip": round(total_fare, 2),
            "fee_tier": TIERED_PRICING.get_fee_tier_description(driver_earnings, "rideshare") if self.use_tiered_pricing else "flat"
        }

    def get_fare_breakdown_for_display(
        self,
        distance_miles: float,
        duration_minutes: float,
        state: str = "CA",
        tip: float = 0.0
    ) -> Dict[str, any]:
        """Get fare breakdown for UI display with tax"""
        fare = self.calculate_fare(distance_miles, duration_minutes, tip=tip)

        # Calculate tax on fare (before tip)
        tax_rate = STATE_TAX_RATES.get(state.upper(), DEFAULT_TAX_RATE)
        taxable_amount = fare["total_fare_before_tip"]
        tax_amount = round(taxable_amount * tax_rate, 2)

        return {
            **fare,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "grand_total": round(fare["total_fare"] + tax_amount, 2)
        }


# Current rideshare pricing configuration - NOW WITH TIERED FEES!
RIDESHARE_PRICING_CONFIG = RidesharePricingConfig(
    base_fare=2.00,
    per_mile_rate=1.00,
    per_minute_rate=0.15,
    platform_fee=1.00,  # Legacy fallback
    min_fare=5.00,
    cancellation_fee=5.00,
    use_tiered_pricing=True,  # Enable tiered pricing!
    surge_enabled=True,
    max_surge_multiplier=3.0
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_tax_rate(state: str) -> float:
    """Get tax rate for a given state code"""
    return STATE_TAX_RATES.get(state.upper(), DEFAULT_TAX_RATE)


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    Returns distance in miles.
    """
    R = 3959  # Earth's radius in miles

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return round(R * c, 2)


def calculate_order_totals(
    subtotal: float,
    state: str = "CA",
    distance_miles: float = 3.0,
    tip: float = 0.0,
    surge_multiplier: float = 1.0
) -> Dict[str, float]:
    """
    Calculate all order totals with proper breakdown.

    Returns complete pricing breakdown for an order.
    """
    # Tax calculation
    tax_rate = get_tax_rate(state)
    tax_amount = round(subtotal * tax_rate, 2)

    # Delivery fee (distance-based)
    delivery_fee = DELIVERY_FEE_CONFIG.calculate(subtotal, distance_miles)

    # Platform fee
    platform_fee = PLATFORM_FEE_CONFIG.calculate(subtotal)

    # Surge adjustment to delivery fee
    if SURGE_PRICING_CONFIG.enabled and surge_multiplier > 1.0:
        delivery_fee = round(delivery_fee * surge_multiplier, 2)

    # Total
    total = round(subtotal + tax_amount + delivery_fee + platform_fee + tip, 2)

    # Stripe fees (absorbed by platform)
    stripe_fee = PAYMENT_PROCESSING_CONFIG.calculate_stripe_fee(total)

    # Driver payout
    driver_payout = DRIVER_PAYOUT_CONFIG.calculate_total_payout(distance_miles, tip, surge_multiplier)

    # Restaurant payout
    restaurant_payout = RESTAURANT_COMMISSION_CONFIG.calculate_restaurant_payout(subtotal)

    # Platform revenue (after Stripe fees and payouts)
    platform_revenue = round(
        platform_fee + delivery_fee - driver_payout - stripe_fee, 2
    )

    return {
        "subtotal": subtotal,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "delivery_fee": delivery_fee,
        "platform_fee": platform_fee,
        "tip": tip,
        "surge_multiplier": surge_multiplier,
        "total": total,

        # Backend calculations
        "stripe_fee": stripe_fee,
        "driver_payout": driver_payout,
        "restaurant_payout": restaurant_payout,
        "platform_revenue": platform_revenue,

        # Breakdown for transparency
        "breakdown": {
            "food_cost": subtotal,
            "tax": tax_amount,
            "delivery": delivery_fee,
            "service_fee": platform_fee,
            "driver_tip": tip,
            "you_pay": total
        }
    }


# =============================================================================
# PRICING COMPARISON (For Reference)
# =============================================================================
"""
COMPETITOR PRICING COMPARISON:

| Platform  | Delivery Fee | Service Fee | Restaurant Commission |
|-----------|--------------|-------------|----------------------|
| DoorDash  | $0.99-$7.99  | 10-15%      | 15-30%               |
| UberEats  | $0.49-$7.99  | 15%         | 15-30%               |
| Grubhub   | $0.99-$7.99  | 5-15%       | 15-30%               |
| Postmates | $0.99-$9.99  | 9%          | 20-30%               |
| EatFair   | $2.99-$12.99 | $1 flat     | $1 flat              |

EatFair Advantage:
- Flat $1 platform fee vs 10-15% competitor fees
- Flat $1 restaurant commission vs 15-30% competitor commissions
- 90%+ of fare goes to driver for rideshare
- Transparent, predictable pricing
"""


# =============================================================================
# EXPORT ALL CONFIGURATIONS
# =============================================================================

__all__ = [
    # Tiered Pricing (NEW!)
    'TIERED_PRICING',
    'TieredPricingConfig',

    # Tax Rates
    'STATE_TAX_RATES',
    'DEFAULT_TAX_RATE',

    # Fee Configurations
    'PLATFORM_FEE_CONFIG',
    'DELIVERY_FEE_CONFIG',
    'DRIVER_PAYOUT_CONFIG',
    'RESTAURANT_COMMISSION_CONFIG',
    'PAYMENT_PROCESSING_CONFIG',
    'SURGE_PRICING_CONFIG',
    'ORDER_VALIDATION_CONFIG',
    'RIDESHARE_PRICING_CONFIG',

    # Enums
    'PlatformFeeModel',

    # Helper Functions
    'get_tax_rate',
    'calculate_distance',
    'calculate_order_totals',
]
