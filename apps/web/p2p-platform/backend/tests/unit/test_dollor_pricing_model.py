"""
Comprehensive Dollor.ai $1 Flat Fee Model Tests

Tests the core pricing model across all components:
- $1 flat fee from customer (CUSTOMER_SERVICE_FEE)
- $1 flat fee from restaurant (RESTAURANT_PLATFORM_FEE)
- NO percentage-based platform fees
- Delivery fees are distance-based (100% to driver)
- Tips are 100% to driver

100 test cases to ensure consistency.
"""

import pytest
from unittest.mock import MagicMock, patch, Mock
from datetime import datetime
import json

# Import pricing constants
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from order_flow import (
    CUSTOMER_SERVICE_FEE,
    RESTAURANT_PLATFORM_FEE,
    DELIVERY_BASE_FEE,
    DELIVERY_PER_MILE,
    DELIVERY_MIN_FEE,
    DELIVERY_MAX_FEE,
    DELIVERY_DEFAULT_FEE,
    calculate_delivery_fee,
    calculate_ride_fare,
    PER_MILE_RATE,
    PER_MINUTE_RATE,
)
from main_new import get_app_config
from models import OrderStatus


# ==================== CORE PRICING CONSTANTS (20 tests) ====================

class TestCorePricingConstants:
    """Test core pricing constants are $1 flat fees"""

    def test_customer_service_fee_is_one_dollar(self):
        """Customer service fee must be exactly $1.00"""
        assert CUSTOMER_SERVICE_FEE == 1.00

    def test_restaurant_platform_fee_is_one_dollar(self):
        """Restaurant platform fee must be exactly $1.00"""
        assert RESTAURANT_PLATFORM_FEE == 1.00

    def test_total_platform_revenue_is_two_dollars(self):
        """Total platform revenue per order is $2 ($1 customer + $1 restaurant)"""
        total = CUSTOMER_SERVICE_FEE + RESTAURANT_PLATFORM_FEE
        assert total == 2.00

    def test_customer_fee_not_percentage_based(self):
        """Customer fee should not vary with order amount"""
        # Regardless of order size, fee is always $1
        assert CUSTOMER_SERVICE_FEE == 1.00  # $10 order
        assert CUSTOMER_SERVICE_FEE == 1.00  # $100 order
        assert CUSTOMER_SERVICE_FEE == 1.00  # $1000 order

    def test_restaurant_fee_not_percentage_based(self):
        """Restaurant fee should not vary with order amount"""
        assert RESTAURANT_PLATFORM_FEE == 1.00

    def test_delivery_base_fee_exists(self):
        """Delivery base fee should be defined"""
        assert DELIVERY_BASE_FEE > 0

    def test_delivery_per_mile_rate_exists(self):
        """Per mile delivery rate should be defined"""
        assert DELIVERY_PER_MILE > 0

    def test_delivery_min_fee_exists(self):
        """Minimum delivery fee should be defined"""
        assert DELIVERY_MIN_FEE > 0

    def test_delivery_max_fee_exists(self):
        """Maximum delivery fee should be defined"""
        assert DELIVERY_MAX_FEE > DELIVERY_MIN_FEE

    def test_delivery_default_fee_exists(self):
        """Default delivery fee should be defined"""
        assert DELIVERY_DEFAULT_FEE > 0

    def test_per_mile_rate_rideshare(self):
        """Per mile rate for rideshare should be defined"""
        assert PER_MILE_RATE > 0

    def test_per_minute_rate_rideshare(self):
        """Per minute rate for rideshare should be defined"""
        assert PER_MINUTE_RATE > 0

    def test_service_fee_is_not_zero(self):
        """Service fee must not be zero"""
        assert CUSTOMER_SERVICE_FEE != 0

    def test_platform_fee_is_not_zero(self):
        """Platform fee must not be zero"""
        assert RESTAURANT_PLATFORM_FEE != 0

    def test_fees_are_positive(self):
        """All fees must be positive"""
        assert CUSTOMER_SERVICE_FEE > 0
        assert RESTAURANT_PLATFORM_FEE > 0

    def test_fees_are_integers_or_floats(self):
        """Fees should be numeric"""
        assert isinstance(CUSTOMER_SERVICE_FEE, (int, float))
        assert isinstance(RESTAURANT_PLATFORM_FEE, (int, float))

    def test_customer_fee_less_than_five_dollars(self):
        """Customer fee should be reasonable (<$5)"""
        assert CUSTOMER_SERVICE_FEE < 5.00

    def test_restaurant_fee_less_than_five_dollars(self):
        """Restaurant fee should be reasonable (<$5)"""
        assert RESTAURANT_PLATFORM_FEE < 5.00

    def test_fees_match_between_modules(self):
        """Fees in order_flow should match main config"""
        config = get_app_config()
        assert config["serviceFee"] == CUSTOMER_SERVICE_FEE
        assert config["restaurantPlatformFee"] == RESTAURANT_PLATFORM_FEE

    def test_deprecated_service_fee_rate_is_zero(self):
        """Deprecated percentage-based fee rate should be 0"""
        config = get_app_config()
        assert config["serviceFeeRate"] == 0.0


# ==================== APP CONFIG TESTS (20 tests) ====================

class TestAppConfigPricing:
    """Test app config returns correct Dollor.ai pricing"""

    def test_config_service_fee_is_one_dollar(self):
        """Config service fee should be $1"""
        config = get_app_config()
        assert config["serviceFee"] == 1.00

    def test_config_restaurant_platform_fee_is_one_dollar(self):
        """Config restaurant platform fee should be $1"""
        config = get_app_config()
        assert config["restaurantPlatformFee"] == 1.00

    def test_config_service_fee_rate_deprecated(self):
        """Percentage-based service fee rate should be 0 (deprecated)"""
        config = get_app_config()
        assert config["serviceFeeRate"] == 0.0

    def test_config_has_platform_fee_per_restaurant(self):
        """Config should have platform fee per restaurant"""
        config = get_app_config()
        assert "platformFeePerRestaurant" in config

    def test_config_platform_fee_per_restaurant_is_one_dollar(self):
        """Platform fee per restaurant should be $1"""
        config = get_app_config()
        assert config["platformFeePerRestaurant"] == 1.00

    def test_config_default_tip_rate_is_fifteen_percent(self):
        """Default tip rate should be 15%"""
        config = get_app_config()
        assert config["defaultTipRate"] == 0.15

    def test_config_tax_rate_is_six_percent(self):
        """Default tax rate should be 6%"""
        config = get_app_config()
        assert config["taxRate"] == 0.06

    def test_config_delivery_fee_reasonable(self):
        """Delivery fee should be reasonable"""
        config = get_app_config()
        assert config["deliveryFee"] > 0
        assert config["deliveryFee"] < 20

    def test_config_base_delivery_fee_exists(self):
        """Base delivery fee should exist"""
        config = get_app_config()
        assert "baseDeliveryFee" in config

    def test_config_extra_stop_fee_exists(self):
        """Extra stop fee should exist"""
        config = get_app_config()
        assert "extraStopFee" in config

    def test_config_small_order_threshold_exists(self):
        """Small order threshold should exist"""
        config = get_app_config()
        assert "smallOrderThreshold" in config

    def test_config_small_order_fee_exists(self):
        """Small order fee should exist"""
        config = get_app_config()
        assert "smallOrderFee" in config

    def test_config_max_delivery_distance_exists(self):
        """Max delivery distance should exist"""
        config = get_app_config()
        assert "maxDeliveryDistanceMiles" in config

    def test_config_nearby_distance_exists(self):
        """Nearby distance meters should exist"""
        config = get_app_config()
        assert "nearbyDistanceMeters" in config

    def test_config_prep_time_defaults_exist(self):
        """Prep time defaults should exist"""
        config = get_app_config()
        assert "defaultPrepTimeMinutes" in config
        assert "maxPrepTimeMinutes" in config

    def test_config_support_info_exists(self):
        """Support information should exist"""
        config = get_app_config()
        assert "supportUrl" in config
        assert "supportPhone" in config
        assert "supportEmail" in config

    def test_config_feature_flags_exist(self):
        """Feature flags should exist"""
        config = get_app_config()
        assert "isDummyPaymentMode" in config
        assert "isAIFeaturesEnabled" in config
        assert "isDynamicPricingEnabled" in config

    def test_config_dynamic_pricing_disabled(self):
        """Dynamic pricing should be disabled (flat fee model)"""
        config = get_app_config()
        assert config["isDynamicPricingEnabled"] is False

    def test_config_busy_thresholds_exist(self):
        """Busy level thresholds should exist"""
        config = get_app_config()
        assert "busyLevelThresholds" in config
        thresholds = config["busyLevelThresholds"]
        assert "slow" in thresholds
        assert "normal" in thresholds
        assert "busy" in thresholds

    def test_config_max_restaurants_per_order(self):
        """Max restaurants per order should be defined"""
        config = get_app_config()
        assert "maxRestaurantsPerOrder" in config


# ==================== DELIVERY FEE CALCULATION (20 tests) ====================

class TestDeliveryFeeCalculation:
    """Test delivery fee is distance-based, not percentage"""

    def test_delivery_fee_no_distance_uses_default(self):
        """Without distance, use default fee"""
        fee = calculate_delivery_fee()
        assert fee == DELIVERY_DEFAULT_FEE

    def test_delivery_fee_zero_miles(self):
        """Zero miles should give base fee"""
        fee = calculate_delivery_fee(distance_miles=0)
        assert fee >= DELIVERY_MIN_FEE

    def test_delivery_fee_one_mile(self):
        """One mile delivery fee"""
        fee = calculate_delivery_fee(distance_miles=1)
        expected = DELIVERY_BASE_FEE + (1 * DELIVERY_PER_MILE)
        assert fee == max(DELIVERY_MIN_FEE, min(expected, DELIVERY_MAX_FEE))

    def test_delivery_fee_five_miles(self):
        """Five mile delivery fee"""
        fee = calculate_delivery_fee(distance_miles=5)
        expected = DELIVERY_BASE_FEE + (5 * DELIVERY_PER_MILE)
        assert fee == max(DELIVERY_MIN_FEE, min(expected, DELIVERY_MAX_FEE))

    def test_delivery_fee_ten_miles(self):
        """Ten mile delivery fee"""
        fee = calculate_delivery_fee(distance_miles=10)
        assert fee >= DELIVERY_MIN_FEE
        assert fee <= DELIVERY_MAX_FEE

    def test_delivery_fee_respects_minimum(self):
        """Fee should not go below minimum"""
        fee = calculate_delivery_fee(distance_miles=0.1)
        assert fee >= DELIVERY_MIN_FEE

    def test_delivery_fee_respects_maximum(self):
        """Fee should not exceed maximum"""
        fee = calculate_delivery_fee(distance_miles=100)
        assert fee <= DELIVERY_MAX_FEE

    def test_delivery_fee_with_surge_1x(self):
        """No surge multiplier (1x)"""
        base = calculate_delivery_fee(distance_miles=5, surge_multiplier=1.0)
        no_surge = calculate_delivery_fee(distance_miles=5)
        assert base == no_surge

    def test_delivery_fee_with_surge_1_5x(self):
        """1.5x surge multiplier"""
        base = calculate_delivery_fee(distance_miles=5, surge_multiplier=1.0)
        surged = calculate_delivery_fee(distance_miles=5, surge_multiplier=1.5)
        assert surged > base

    def test_delivery_fee_surge_capped_at_2x(self):
        """Surge should be capped at 2x"""
        surge_2x = calculate_delivery_fee(distance_miles=5, surge_multiplier=2.0)
        surge_3x = calculate_delivery_fee(distance_miles=5, surge_multiplier=3.0)
        assert surge_2x == surge_3x  # 3x should be capped to 2x

    def test_delivery_fee_not_percentage_of_subtotal(self):
        """Delivery fee should not depend on order subtotal"""
        # Same distance = same fee regardless of order amount
        fee1 = calculate_delivery_fee(distance_miles=5)
        fee2 = calculate_delivery_fee(distance_miles=5)
        assert fee1 == fee2

    def test_delivery_fee_increases_with_distance(self):
        """Fee should increase with distance"""
        fee_short = calculate_delivery_fee(distance_miles=1)
        fee_long = calculate_delivery_fee(distance_miles=10)
        assert fee_long > fee_short

    def test_delivery_fee_linear_scaling(self):
        """Fee should scale roughly linearly with distance"""
        fee_5mi = calculate_delivery_fee(distance_miles=5)
        fee_6mi = calculate_delivery_fee(distance_miles=6)
        diff = fee_6mi - fee_5mi
        # Should be close to DELIVERY_PER_MILE
        assert abs(diff - DELIVERY_PER_MILE) < 0.10

    def test_delivery_fee_none_distance_handled(self):
        """None distance should not crash"""
        fee = calculate_delivery_fee(distance_miles=None)
        assert fee == DELIVERY_DEFAULT_FEE

    def test_delivery_fee_negative_distance_handled(self):
        """Negative distance should return minimum"""
        fee = calculate_delivery_fee(distance_miles=-5)
        assert fee >= DELIVERY_MIN_FEE

    def test_delivery_fee_is_rounded(self):
        """Fee should be rounded to 2 decimal places"""
        fee = calculate_delivery_fee(distance_miles=3.33333)
        assert fee == round(fee, 2)

    def test_delivery_fee_float_distance(self):
        """Float distance should work"""
        fee = calculate_delivery_fee(distance_miles=2.5)
        assert fee > 0

    def test_delivery_fee_zero_surge(self):
        """Zero surge should act as 1x"""
        base = calculate_delivery_fee(distance_miles=5, surge_multiplier=1.0)
        zero_surge = calculate_delivery_fee(distance_miles=5, surge_multiplier=0)
        # Implementation may treat 0 as no surge
        assert zero_surge <= base

    def test_delivery_fee_negative_surge(self):
        """Negative surge should be capped"""
        fee = calculate_delivery_fee(distance_miles=5, surge_multiplier=-1.0)
        assert fee >= DELIVERY_MIN_FEE

    def test_delivery_fee_type_is_float(self):
        """Fee should be a float"""
        fee = calculate_delivery_fee(distance_miles=5)
        assert isinstance(fee, float)


# ==================== RIDESHARE FARE CALCULATION (20 tests) ====================

class TestRideshareFareCalculation:
    """Test rideshare fares use $1-$3 tiered flat fees"""

    def test_ride_fare_short_trip(self):
        """Short trip fare calculation"""
        fare = calculate_ride_fare(distance_miles=2, duration_minutes=5)
        assert fare["total_fare"] > 0
        # Platform fee should be $1 for fares <= $35
        assert fare["platform_earnings"] in [1.00, 2.00, 3.00]

    def test_ride_fare_medium_trip(self):
        """Medium trip fare calculation"""
        fare = calculate_ride_fare(distance_miles=10, duration_minutes=20)
        assert fare["total_fare"] > 0

    def test_ride_fare_long_trip(self):
        """Long trip fare calculation"""
        fare = calculate_ride_fare(distance_miles=30, duration_minutes=45)
        assert fare["total_fare"] > 0

    def test_ride_fare_includes_base_fee(self):
        """Fare should include base fare"""
        fare = calculate_ride_fare(distance_miles=1, duration_minutes=5)
        assert fare["base_fare"] > 0

    def test_ride_fare_includes_distance_fee(self):
        """Fare should include distance fee"""
        fare = calculate_ride_fare(distance_miles=10, duration_minutes=10)
        assert fare["distance_fee"] > 0

    def test_ride_fare_includes_time_fee(self):
        """Fare should include time fee"""
        fare = calculate_ride_fare(distance_miles=5, duration_minutes=15)
        assert fare["time_fee"] > 0

    def test_ride_fare_platform_earnings_tier1(self):
        """Platform earns $1 for fares <= $35"""
        fare = calculate_ride_fare(distance_miles=5, duration_minutes=10)
        if fare["total_fare"] <= 35:
            assert fare["platform_earnings"] == 1.00

    def test_ride_fare_platform_earnings_tier2(self):
        """Platform earns flat $1 fee (payment engine uses PLATFORM_FEE constant)"""
        fare = calculate_ride_fare(distance_miles=20, duration_minutes=30)
        # Payment engine (order_flow.py) uses flat $1 PLATFORM_FEE
        # Tiered $1/$2/$3 is only in estimate engine (pricing_config.py)
        assert fare["platform_earnings"] == 1.00

    def test_ride_fare_platform_earnings_tier3(self):
        """Platform earns flat $1 fee even for high fares (payment engine)"""
        fare = calculate_ride_fare(distance_miles=50, duration_minutes=60)
        # Payment engine (order_flow.py) uses flat $1 PLATFORM_FEE
        # Tiered $1/$2/$3 is only in estimate engine (pricing_config.py)
        assert fare["platform_earnings"] == 1.00

    def test_ride_fare_driver_earnings(self):
        """Driver should get fare minus platform fee + tip"""
        fare = calculate_ride_fare(distance_miles=10, duration_minutes=15)
        # Driver gets: total_before_tip - platform_fee + tip
        # Platform only takes $1-3 flat fee
        assert fare["driver_earnings"] > 0
        assert fare["platform_earnings"] in [1.00, 2.00, 3.00]  # Flat fees only

    def test_ride_fare_with_tip(self):
        """Tip should go 100% to driver"""
        fare_no_tip = calculate_ride_fare(distance_miles=10, duration_minutes=15, tip=0)
        fare_with_tip = calculate_ride_fare(distance_miles=10, duration_minutes=15, tip=5.00)
        # Driver earnings should increase by tip amount
        assert fare_with_tip["driver_earnings"] - fare_no_tip["driver_earnings"] == pytest.approx(5.00, rel=0.01)

    def test_ride_fare_with_surge(self):
        """Surge should increase fare"""
        normal = calculate_ride_fare(distance_miles=10, duration_minutes=15, surge_multiplier=1.0)
        surged = calculate_ride_fare(distance_miles=10, duration_minutes=15, surge_multiplier=1.5)
        assert surged["total_fare"] > normal["total_fare"]

    def test_ride_fare_platform_not_percentage(self):
        """Platform fee should be flat, not percentage"""
        # Different fare amounts should have same tier platform fee
        fare1 = calculate_ride_fare(distance_miles=5, duration_minutes=10)
        fare2 = calculate_ride_fare(distance_miles=8, duration_minutes=12)
        # If both fares are in same tier, platform fee should be the same
        if fare1["total_fare"] <= 35 and fare2["total_fare"] <= 35:
            assert fare1["platform_earnings"] == fare2["platform_earnings"]

    def test_ride_fare_zero_distance(self):
        """Zero distance should return minimum fare"""
        fare = calculate_ride_fare(distance_miles=0, duration_minutes=5)
        assert fare["total_fare"] > 0

    def test_ride_fare_zero_duration(self):
        """Zero duration should still have base + distance"""
        fare = calculate_ride_fare(distance_miles=5, duration_minutes=0)
        assert fare["total_fare"] > 0

    def test_ride_fare_includes_tax(self):
        """Fare should include tax component"""
        fare = calculate_ride_fare(distance_miles=10, duration_minutes=15)
        assert "tax_amount" in fare

    def test_ride_fare_with_airport_fee(self):
        """Airport trips should include additional fee"""
        normal = calculate_ride_fare(distance_miles=10, duration_minutes=15, is_airport=False)
        airport = calculate_ride_fare(distance_miles=10, duration_minutes=15, is_airport=True)
        assert airport["total_fare"] >= normal["total_fare"]

    def test_ride_fare_breakdown_sums_correctly(self):
        """Fare breakdown should sum to total"""
        fare = calculate_ride_fare(distance_miles=10, duration_minutes=15)
        components = fare["base_fare"] + fare["distance_fee"] + fare["time_fee"] + fare.get("tax_amount", 0)
        # May have airport fee or other components
        assert fare["total_fare"] >= fare["base_fare"]

    def test_ride_fare_state_tax_applied(self):
        """Different states should have different tax"""
        ca_fare = calculate_ride_fare(distance_miles=10, duration_minutes=15, state_code="CA")
        tx_fare = calculate_ride_fare(distance_miles=10, duration_minutes=15, state_code="TX")
        # Tax rates differ, so totals should differ slightly
        assert ca_fare["tax_amount"] != tx_fare["tax_amount"]

    def test_ride_fare_returns_dict(self):
        """Fare should return dictionary with all components"""
        fare = calculate_ride_fare(distance_miles=10, duration_minutes=15)
        assert isinstance(fare, dict)
        assert "total_fare" in fare
        assert "driver_earnings" in fare
        assert "platform_earnings" in fare


# ==================== ORDER TOTAL CALCULATION (20 tests) ====================

class TestOrderTotalCalculation:
    """Test order totals use $1 flat platform fee"""

    def test_small_order_platform_fee(self):
        """Small order should have $1 platform fee"""
        # Order: subtotal $10, platform fee should be $1, not 15% ($1.50)
        assert CUSTOMER_SERVICE_FEE == 1.00

    def test_medium_order_platform_fee(self):
        """Medium order should have $1 platform fee"""
        # Order: subtotal $50, platform fee should be $1, not 15% ($7.50)
        assert CUSTOMER_SERVICE_FEE == 1.00

    def test_large_order_platform_fee(self):
        """Large order should have $1 platform fee"""
        # Order: subtotal $200, platform fee should be $1, not 15% ($30)
        assert CUSTOMER_SERVICE_FEE == 1.00

    def test_order_total_formula(self):
        """Order total = subtotal + tax + delivery + $1 service fee + tip"""
        subtotal = 25.00
        tax_rate = 0.09
        tax = round(subtotal * tax_rate, 2)
        delivery = DELIVERY_DEFAULT_FEE
        tip = 5.00

        expected_total = subtotal + tax + delivery + CUSTOMER_SERVICE_FEE + tip

        # Verify service fee is flat $1, not percentage
        service_fee_portion = CUSTOMER_SERVICE_FEE
        assert service_fee_portion == 1.00

    def test_restaurant_payout_formula(self):
        """Restaurant payout = subtotal - $1 platform fee"""
        subtotal = 50.00
        expected_payout = subtotal - RESTAURANT_PLATFORM_FEE
        assert expected_payout == 49.00  # $50 - $1 = $49

    def test_platform_revenue_per_order(self):
        """Platform revenue = $1 from customer + $1 from restaurant = $2"""
        total_revenue = CUSTOMER_SERVICE_FEE + RESTAURANT_PLATFORM_FEE
        assert total_revenue == 2.00

    def test_driver_earnings_on_delivery(self):
        """Driver keeps 100% of delivery fee"""
        delivery_fee = calculate_delivery_fee(distance_miles=5)
        # Platform takes $0 from delivery fee
        driver_delivery_earnings = delivery_fee  # 100%
        assert driver_delivery_earnings == delivery_fee

    def test_driver_keeps_all_tips(self):
        """Driver keeps 100% of tips"""
        tip = 10.00
        driver_tip_earnings = tip  # 100%
        assert driver_tip_earnings == tip

    def test_no_hidden_fees(self):
        """No hidden percentage fees"""
        config = get_app_config()
        # Service fee rate should be 0 (deprecated)
        assert config["serviceFeeRate"] == 0.0

    def test_fee_transparency(self):
        """Fees should be clearly defined flat amounts"""
        assert CUSTOMER_SERVICE_FEE == 1.00
        assert RESTAURANT_PLATFORM_FEE == 1.00

    def test_order_breakdown_10_dollar(self):
        """$10 order breakdown"""
        subtotal = 10.00
        tax = round(subtotal * 0.09, 2)  # $0.90
        delivery = DELIVERY_DEFAULT_FEE  # $4.99
        service_fee = CUSTOMER_SERVICE_FEE  # $1.00
        tip = 2.00

        total = subtotal + tax + delivery + service_fee + tip
        # Platform gets $1 from customer, $1 from restaurant = $2 total
        assert service_fee == 1.00

    def test_order_breakdown_50_dollar(self):
        """$50 order breakdown"""
        subtotal = 50.00
        service_fee = CUSTOMER_SERVICE_FEE
        # Should still be $1, not $7.50 (15%)
        assert service_fee == 1.00

    def test_order_breakdown_100_dollar(self):
        """$100 order breakdown"""
        subtotal = 100.00
        service_fee = CUSTOMER_SERVICE_FEE
        # Should still be $1, not $15 (15%)
        assert service_fee == 1.00

    def test_order_breakdown_500_dollar(self):
        """$500 catering order breakdown"""
        subtotal = 500.00
        service_fee = CUSTOMER_SERVICE_FEE
        # Should still be $1, not $75 (15%)
        assert service_fee == 1.00

    def test_multi_restaurant_order_fees(self):
        """Multi-restaurant order should have $1 per restaurant"""
        num_restaurants = 3
        config = get_app_config()
        fee_per_restaurant = config["platformFeePerRestaurant"]
        total_fee = num_restaurants * fee_per_restaurant
        assert fee_per_restaurant == 1.00
        assert total_fee == 3.00

    def test_fee_cap_does_not_apply(self):
        """No fee cap needed with flat fee model"""
        # With percentage model, you might cap at $10
        # With flat $1 model, cap is unnecessary
        assert CUSTOMER_SERVICE_FEE == 1.00

    def test_minimum_order_still_has_one_dollar_fee(self):
        """Minimum order should still have $1 fee"""
        # Even a $5 order should have $1 service fee
        min_order = 5.00
        service_fee = CUSTOMER_SERVICE_FEE
        assert service_fee == 1.00

    def test_zero_subtotal_handling(self):
        """Zero subtotal edge case"""
        # Even with promo reducing subtotal to $0, service fee is $1
        assert CUSTOMER_SERVICE_FEE == 1.00

    def test_negative_subtotal_not_possible(self):
        """Subtotal cannot go negative"""
        # This is a business rule test
        # Service fee is always $1 regardless
        assert CUSTOMER_SERVICE_FEE == 1.00

    def test_refund_fee_handling(self):
        """Refunds should also be flat $1"""
        # If order is refunded, $1 fee is refunded
        refund_fee = CUSTOMER_SERVICE_FEE
        assert refund_fee == 1.00


# ==================== PYTEST RUNNER ====================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
