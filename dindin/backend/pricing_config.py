"""
EATFAIR/DINDIN PRICING CONFIGURATION
=====================================
Centralized pricing configuration for the entire platform.
All fees, rates, and calculations are defined here.

This replaces all hardcoded values across order_flow.py and stripe_integration.py.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Tuple
from enum import Enum
import math

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


@dataclass
class PlatformFeeConfig:
    """Platform fee charged to customers"""
    model: PlatformFeeModel = PlatformFeeModel.FLAT
    flat_fee: float = 1.00           # $1.00 flat fee
    percentage_fee: float = 0.0      # 0% if flat model
    min_fee: float = 0.50            # Minimum fee
    max_fee: float = 5.00            # Maximum fee cap

    def calculate(self, subtotal: float) -> float:
        """Calculate platform fee based on model"""
        if self.model == PlatformFeeModel.FLAT:
            fee = self.flat_fee
        elif self.model == PlatformFeeModel.PERCENTAGE:
            fee = subtotal * self.percentage_fee
        else:  # HYBRID
            fee = self.flat_fee + (subtotal * self.percentage_fee)

        # Apply min/max caps
        return max(self.min_fee, min(self.max_fee, fee))


# Current platform fee configuration
PLATFORM_FEE_CONFIG = PlatformFeeConfig(
    model=PlatformFeeModel.FLAT,
    flat_fee=1.00,
    percentage_fee=0.0,
    min_fee=0.50,
    max_fee=5.00
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
    """Restaurant commission/payout configuration"""
    commission_model: str = "flat"   # "flat" or "percentage"
    flat_commission: float = 1.00    # $1.00 flat per order
    percentage_commission: float = 0.0  # 0% if flat model (competitors charge 15-30%)
    min_commission: float = 0.50     # Minimum commission
    max_commission: float = 50.00    # Maximum commission cap

    def calculate_commission(self, subtotal: float) -> float:
        """Calculate platform commission from restaurant"""
        if self.commission_model == "flat":
            commission = self.flat_commission
        else:
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


# Current restaurant commission configuration
RESTAURANT_COMMISSION_CONFIG = RestaurantCommissionConfig(
    commission_model="flat",
    flat_commission=1.00,
    percentage_commission=0.0,
    min_commission=0.50,
    max_commission=50.00
)


# =============================================================================
# PAYMENT PROCESSING CONFIGURATION
# =============================================================================

@dataclass
class PaymentProcessingConfig:
    """Payment processing fees (Stripe, Apple Pay, Google Pay)"""
    # Stripe fees (same for Apple Pay / Google Pay through Stripe)
    stripe_percentage: float = 0.029     # 2.9%
    stripe_fixed: float = 0.30           # $0.30 per transaction

    # Who absorbs the fee
    fee_absorbed_by: str = "platform"    # "platform", "restaurant", or "split"

    # ACH payout fees
    ach_payout_fee: float = 0.25         # $0.25 per ACH transfer

    def calculate_stripe_fee(self, amount: float) -> float:
        """Calculate Stripe processing fee"""
        return round((amount * self.stripe_percentage) + self.stripe_fixed, 2)

    def calculate_net_amount(self, amount: float) -> float:
        """Calculate amount after Stripe fees"""
        fee = self.calculate_stripe_fee(amount)
        return round(amount - fee, 2)


# Current payment processing configuration
PAYMENT_PROCESSING_CONFIG = PaymentProcessingConfig(
    stripe_percentage=0.029,
    stripe_fixed=0.30,
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
    """Rideshare fare calculation"""
    base_fare: float = 2.00           # Base fare (to driver)
    per_mile_rate: float = 1.00       # Per mile (to driver)
    per_minute_rate: float = 0.15     # Per minute (to driver)
    platform_fee: float = 1.00        # FLAT platform fee only
    min_fare: float = 5.00            # Minimum total fare
    cancellation_fee: float = 5.00    # Customer cancellation fee

    # Surge pricing
    surge_enabled: bool = True
    max_surge_multiplier: float = 3.0

    def calculate_fare(
        self,
        distance_miles: float,
        duration_minutes: float,
        surge_multiplier: float = 1.0
    ) -> Dict[str, float]:
        """Calculate rideshare fare breakdown"""
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

        # Total fare = driver earnings + platform fee
        total_fare = driver_earnings + self.platform_fee

        # Apply minimum fare
        if total_fare < self.min_fare:
            # Adjust driver earnings to meet minimum
            driver_earnings = self.min_fare - self.platform_fee
            total_fare = self.min_fare

        return {
            "base_fare": round(self.base_fare, 2),
            "distance_charge": round(distance_charge, 2),
            "time_charge": round(time_charge, 2),
            "surge_multiplier": round(surge_multiplier, 2),
            "driver_earnings": round(driver_earnings, 2),
            "platform_fee": self.platform_fee,
            "total_fare": round(total_fare, 2)
        }


# Current rideshare pricing configuration
RIDESHARE_PRICING_CONFIG = RidesharePricingConfig(
    base_fare=2.00,
    per_mile_rate=1.00,
    per_minute_rate=0.15,
    platform_fee=1.00,
    min_fare=5.00,
    cancellation_fee=5.00,
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
    'STATE_TAX_RATES',
    'DEFAULT_TAX_RATE',
    'PLATFORM_FEE_CONFIG',
    'DELIVERY_FEE_CONFIG',
    'DRIVER_PAYOUT_CONFIG',
    'RESTAURANT_COMMISSION_CONFIG',
    'PAYMENT_PROCESSING_CONFIG',
    'SURGE_PRICING_CONFIG',
    'ORDER_VALIDATION_CONFIG',
    'RIDESHARE_PRICING_CONFIG',
    'get_tax_rate',
    'calculate_distance',
    'calculate_order_totals',
]
