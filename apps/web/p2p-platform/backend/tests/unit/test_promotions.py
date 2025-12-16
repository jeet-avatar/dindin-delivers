"""
Unit Tests for Promotion Utility Functions
Tests pure functions without database dependencies
"""

import unittest
from unittest.mock import Mock, MagicMock
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import sys
import os

# Add parent directory to path to import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from promotions import (
    get_promotion_message,
    calculate_discount,
    generate_promotion_insights,
    AI_EMPLOYEES,
    CreatePromotionRequest,
    UpdatePromotionRequest,
    ApplyPromotionRequest
)

# Import the actual enum classes for use in tests
try:
    from models_extended import PromotionType, PromotionStatus, PromotionTargetAudience
except ImportError:
    # Fallback mock enums if import fails
    class PromotionType:
        PERCENTAGE = "percentage"
        FLAT_AMOUNT = "flat_amount"
        FREE_DELIVERY = "free_delivery"
        BOGO = "bogo"
        FREE_ITEM = "free_item"
        BUNDLE = "bundle"

    class PromotionStatus:
        DRAFT = "draft"
        SCHEDULED = "scheduled"
        ACTIVE = "active"
        PAUSED = "paused"
        EXPIRED = "expired"
        CANCELLED = "cancelled"

    class PromotionTargetAudience:
        ALL = "all"
        NEW_CUSTOMERS = "new_customers"
        RETURNING = "returning"
        LOYALTY_MEMBERS = "loyalty_members"
        DORMANT = "dormant"


def create_mock_promotion(
    promotion_type: str,
    value: float,
    name: str = "Test Promotion",
    promotion_code: str = "TESTCODE",
    max_discount: Optional[float] = None,
    description: Optional[str] = None
) -> Mock:
    """Helper function to create a mock Promotion object"""
    promo = Mock()
    promo.type = Mock()
    promo.type.value = promotion_type

    # Set type comparison behavior
    if promotion_type == PromotionType.PERCENTAGE:
        promo.type.__eq__ = lambda self, other: other == PromotionType.PERCENTAGE or (hasattr(other, 'value') and other.value == 'percentage')
    elif promotion_type == PromotionType.FLAT_AMOUNT:
        promo.type.__eq__ = lambda self, other: other == PromotionType.FLAT_AMOUNT or (hasattr(other, 'value') and other.value == 'flat_amount')
    elif promotion_type == PromotionType.FREE_DELIVERY:
        promo.type.__eq__ = lambda self, other: other == PromotionType.FREE_DELIVERY or (hasattr(other, 'value') and other.value == 'free_delivery')
    elif promotion_type == PromotionType.BOGO:
        promo.type.__eq__ = lambda self, other: other == PromotionType.BOGO or (hasattr(other, 'value') and other.value == 'bogo')
    else:
        promo.type.__eq__ = lambda self, other: (hasattr(other, 'value') and other.value == promotion_type)

    promo.value = value
    promo.name = name
    promo.promotion_code = promotion_code
    promo.max_discount = max_discount
    promo.description = description

    return promo


class TestGetPromotionMessage(unittest.TestCase):
    """Test suite for get_promotion_message() function"""

    def test_percentage_promotion_message(self):
        """Test message generation for percentage discount"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=20.0,
            promotion_code="SAVE20"
        )

        message = get_promotion_message(promo)

        self.assertIn("20%", message)
        self.assertIn("SAVE20", message)
        self.assertIn("off", message.lower())

    def test_percentage_promotion_with_decimal(self):
        """Test percentage promotion with decimal value"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=15.5,
            promotion_code="SAVE15"
        )

        message = get_promotion_message(promo)

        # Should convert to int (15% not 15.5%)
        self.assertIn("15%", message)
        self.assertIn("SAVE15", message)

    def test_flat_amount_promotion_message(self):
        """Test message generation for flat amount discount"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FLAT_AMOUNT,
            value=5.00,
            promotion_code="FLAT5"
        )

        message = get_promotion_message(promo)

        self.assertIn("$5.00", message)
        self.assertIn("FLAT5", message)
        self.assertIn("save", message.lower())

    def test_flat_amount_with_cents(self):
        """Test flat amount with cents"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FLAT_AMOUNT,
            value=7.50,
            promotion_code="SAVE750"
        )

        message = get_promotion_message(promo)

        self.assertIn("$7.50", message)
        self.assertIn("SAVE750", message)

    def test_free_delivery_message(self):
        """Test message generation for free delivery"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FREE_DELIVERY,
            value=0,
            promotion_code="FREEDEL"
        )

        message = get_promotion_message(promo)

        self.assertIn("FREE DELIVERY", message)
        self.assertIn("FREEDEL", message)

    def test_bogo_message(self):
        """Test message generation for BOGO promotion"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BOGO,
            value=0,
            promotion_code="BOGO1"
        )

        message = get_promotion_message(promo)

        self.assertIn("Buy One Get One", message)
        self.assertIn("FREE", message)
        self.assertIn("BOGO1", message)

    def test_unknown_promotion_type_message(self):
        """Test message generation for unknown/other promotion types"""
        promo = create_mock_promotion(
            promotion_type="custom_type",
            value=10,
            name="Custom Special Offer",
            promotion_code="CUSTOM"
        )

        message = get_promotion_message(promo)

        self.assertIn("Custom Special Offer", message)
        self.assertIn("CUSTOM", message)
        self.assertIn("Special offer", message)

    def test_free_item_promotion_message(self):
        """Test message for FREE_ITEM type (falls to default case)"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FREE_ITEM,
            value=0,
            name="Free Dessert",
            promotion_code="DESSERT"
        )

        message = get_promotion_message(promo)

        self.assertIn("Free Dessert", message)
        self.assertIn("DESSERT", message)

    def test_bundle_promotion_message(self):
        """Test message for BUNDLE type (falls to default case)"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BUNDLE,
            value=25,
            name="Family Bundle Deal",
            promotion_code="FAMILY"
        )

        message = get_promotion_message(promo)

        self.assertIn("Family Bundle Deal", message)
        self.assertIn("FAMILY", message)


class TestCalculateDiscount(unittest.TestCase):
    """Test suite for calculate_discount() function"""

    def test_percentage_discount_calculation(self):
        """Test basic percentage discount calculation"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=20.0
        )

        discount = calculate_discount(promo, order_total=100.0, items=None)

        self.assertEqual(discount, 20.0)

    def test_percentage_discount_with_decimal_total(self):
        """Test percentage discount with decimal order total"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=15.0
        )

        discount = calculate_discount(promo, order_total=47.50, items=None)

        # 15% of 47.50 = 7.125, rounded to 7.12
        self.assertEqual(discount, 7.12)

    def test_percentage_discount_with_max_cap(self):
        """Test percentage discount with max_discount cap"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=20.0,
            max_discount=10.0
        )

        # 20% of 100 = 20, but capped at 10
        discount = calculate_discount(promo, order_total=100.0, items=None)

        self.assertEqual(discount, 10.0)

    def test_percentage_discount_under_max_cap(self):
        """Test percentage discount when under max cap"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=10.0,
            max_discount=20.0
        )

        # 10% of 50 = 5, under cap of 20
        discount = calculate_discount(promo, order_total=50.0, items=None)

        self.assertEqual(discount, 5.0)

    def test_percentage_discount_exactly_at_cap(self):
        """Test percentage discount exactly at max cap"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=20.0,
            max_discount=15.0
        )

        # 20% of 75 = 15, exactly at cap
        discount = calculate_discount(promo, order_total=75.0, items=None)

        self.assertEqual(discount, 15.0)

    def test_flat_amount_discount(self):
        """Test flat amount discount calculation"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FLAT_AMOUNT,
            value=5.0
        )

        discount = calculate_discount(promo, order_total=50.0, items=None)

        self.assertEqual(discount, 5.0)

    def test_flat_amount_discount_with_decimal(self):
        """Test flat amount with decimal value"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FLAT_AMOUNT,
            value=7.50
        )

        discount = calculate_discount(promo, order_total=100.0, items=None)

        self.assertEqual(discount, 7.50)

    def test_flat_amount_independent_of_order_total(self):
        """Test that flat amount is independent of order total"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FLAT_AMOUNT,
            value=10.0
        )

        discount1 = calculate_discount(promo, order_total=25.0, items=None)
        discount2 = calculate_discount(promo, order_total=100.0, items=None)

        self.assertEqual(discount1, 10.0)
        self.assertEqual(discount2, 10.0)

    def test_free_delivery_discount(self):
        """Test free delivery returns standard delivery fee"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FREE_DELIVERY,
            value=0
        )

        discount = calculate_discount(promo, order_total=50.0, items=None)

        # Standard delivery fee is 4.99
        self.assertEqual(discount, 4.99)

    def test_free_delivery_independent_of_order_total(self):
        """Test free delivery is independent of order total"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FREE_DELIVERY,
            value=0
        )

        discount1 = calculate_discount(promo, order_total=10.0, items=None)
        discount2 = calculate_discount(promo, order_total=200.0, items=None)

        self.assertEqual(discount1, 4.99)
        self.assertEqual(discount2, 4.99)

    def test_bogo_with_items_list(self):
        """Test BOGO discount with items list"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BOGO,
            value=0
        )

        items = [
            {"name": "Burger", "price": 12.99},
            {"name": "Fries", "price": 4.99},
            {"name": "Drink", "price": 2.99}
        ]

        discount = calculate_discount(promo, order_total=20.97, items=items)

        # Should discount the cheapest item (2.99)
        self.assertEqual(discount, 2.99)

    def test_bogo_with_single_item(self):
        """Test BOGO with single item"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BOGO,
            value=0
        )

        items = [{"name": "Pizza", "price": 15.99}]

        discount = calculate_discount(promo, order_total=15.99, items=items)

        self.assertEqual(discount, 15.99)

    def test_bogo_with_no_items(self):
        """Test BOGO with no items list"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BOGO,
            value=0
        )

        discount = calculate_discount(promo, order_total=30.0, items=None)

        # Should return 0 if no items provided
        self.assertEqual(discount, 0.0)

    def test_bogo_with_empty_items_list(self):
        """Test BOGO with empty items list"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BOGO,
            value=0
        )

        discount = calculate_discount(promo, order_total=30.0, items=[])

        self.assertEqual(discount, 0.0)

    def test_bogo_with_items_missing_price(self):
        """Test BOGO with items that have missing price"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BOGO,
            value=0
        )

        items = [
            {"name": "Item1", "price": 10.0},
            {"name": "Item2"},  # Missing price
            {"name": "Item3", "price": 5.0}
        ]

        discount = calculate_discount(promo, order_total=15.0, items=items)

        # Should handle missing price (defaults to 0) and return min (0)
        self.assertEqual(discount, 0.0)

    def test_bogo_finds_cheapest_item(self):
        """Test that BOGO correctly identifies cheapest item"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BOGO,
            value=0
        )

        items = [
            {"name": "Expensive", "price": 50.00},
            {"name": "Medium", "price": 25.00},
            {"name": "Cheap", "price": 8.99},
            {"name": "MostExpensive", "price": 75.00}
        ]

        discount = calculate_discount(promo, order_total=158.99, items=items)

        self.assertEqual(discount, 8.99)

    def test_discount_rounding(self):
        """Test that discount is properly rounded to 2 decimal places"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=33.33
        )

        discount = calculate_discount(promo, order_total=10.0, items=None)

        # 33.33% of 10 = 3.333, should round to 3.33
        self.assertEqual(discount, 3.33)

    def test_zero_order_total_percentage(self):
        """Test percentage discount with zero order total"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=20.0
        )

        discount = calculate_discount(promo, order_total=0.0, items=None)

        self.assertEqual(discount, 0.0)

    def test_large_order_total_percentage(self):
        """Test percentage discount with large order total"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=10.0
        )

        discount = calculate_discount(promo, order_total=1000.0, items=None)

        self.assertEqual(discount, 100.0)


class TestGeneratePromotionInsights(unittest.TestCase):
    """Test suite for generate_promotion_insights() function"""

    def test_insights_with_empty_stats(self):
        """Test insights generation with no promotion stats"""
        promo_stats = []

        insights = generate_promotion_insights(promo_stats)

        self.assertIsInstance(insights, list)
        self.assertEqual(len(insights), 1)
        self.assertIn("No promotions", insights[0])

    def test_insights_with_no_redemptions(self):
        """Test insights when promotions exist but have no redemptions"""
        promo_stats = [
            {
                "promotion_id": 1,
                "name": "Test Promo",
                "redemptions": 0,
                "roi": 0,
                "status": "active"
            }
        ]

        insights = generate_promotion_insights(promo_stats)

        self.assertIsInstance(insights, list)
        # Should not include best performer or most popular if no redemptions
        self.assertTrue(all("Best performer" not in insight for insight in insights))

    def test_insights_best_performer(self):
        """Test best performer insight detection"""
        promo_stats = [
            {
                "promotion_id": 1,
                "name": "High ROI Promo",
                "redemptions": 10,
                "roi": 5.2,
                "status": "active"
            },
            {
                "promotion_id": 2,
                "name": "Low ROI Promo",
                "redemptions": 5,
                "roi": 1.5,
                "status": "active"
            }
        ]

        insights = generate_promotion_insights(promo_stats)

        # Should identify High ROI Promo as best performer
        best_insight = next((i for i in insights if "Best performer" in i), None)
        self.assertIsNotNone(best_insight)
        self.assertIn("High ROI Promo", best_insight)
        self.assertIn("5.2x ROI", best_insight)

    def test_insights_most_popular(self):
        """Test most popular promotion detection"""
        promo_stats = [
            {
                "promotion_id": 1,
                "name": "Popular Promo",
                "redemptions": 50,
                "roi": 2.0,
                "status": "active"
            },
            {
                "promotion_id": 2,
                "name": "Less Popular",
                "redemptions": 10,
                "roi": 3.0,
                "status": "active"
            }
        ]

        insights = generate_promotion_insights(promo_stats)

        # Should identify Popular Promo as most popular
        popular_insight = next((i for i in insights if "Most popular" in i), None)
        self.assertIsNotNone(popular_insight)
        self.assertIn("Popular Promo", popular_insight)
        self.assertIn("50 redemptions", popular_insight)

    def test_insights_no_active_promotions(self):
        """Test recommendation when no active promotions"""
        promo_stats = [
            {
                "promotion_id": 1,
                "name": "Expired Promo",
                "redemptions": 5,
                "roi": 2.0,
                "status": "expired"
            },
            {
                "promotion_id": 2,
                "name": "Draft Promo",
                "redemptions": 0,
                "roi": 0,
                "status": "draft"
            }
        ]

        insights = generate_promotion_insights(promo_stats)

        # Should recommend activating a promotion
        no_active_insight = next((i for i in insights if "No active promotions" in i), None)
        self.assertIsNotNone(no_active_insight)

    def test_insights_too_many_active_promotions(self):
        """Test warning when too many promotions are active"""
        promo_stats = [
            {"promotion_id": i, "name": f"Promo {i}", "redemptions": 1, "roi": 1.0, "status": "active"}
            for i in range(1, 8)  # 7 active promotions
        ]

        insights = generate_promotion_insights(promo_stats)

        # Should warn about too many active promotions
        many_active_insight = next((i for i in insights if "Many promotions active" in i), None)
        self.assertIsNotNone(many_active_insight)
        self.assertIn("focusing on top performers", many_active_insight.lower())

    def test_insights_exactly_five_active_promotions(self):
        """Test with exactly 5 active promotions (boundary case)"""
        promo_stats = [
            {"promotion_id": i, "name": f"Promo {i}", "redemptions": 1, "roi": 1.0, "status": "active"}
            for i in range(1, 6)  # 5 active promotions
        ]

        insights = generate_promotion_insights(promo_stats)

        # Should NOT warn with 5 promotions
        many_active_insight = next((i for i in insights if "Many promotions active" in i), None)
        self.assertIsNone(many_active_insight)

    def test_insights_exactly_six_active_promotions(self):
        """Test with exactly 6 active promotions (boundary case)"""
        promo_stats = [
            {"promotion_id": i, "name": f"Promo {i}", "redemptions": 1, "roi": 1.0, "status": "active"}
            for i in range(1, 7)  # 6 active promotions
        ]

        insights = generate_promotion_insights(promo_stats)

        # Should warn with 6 promotions (> 5)
        many_active_insight = next((i for i in insights if "Many promotions active" in i), None)
        self.assertIsNotNone(many_active_insight)

    def test_insights_with_mixed_status(self):
        """Test insights with mixed promotion statuses"""
        promo_stats = [
            {"promotion_id": 1, "name": "Active 1", "redemptions": 20, "roi": 3.0, "status": "active"},
            {"promotion_id": 2, "name": "Active 2", "redemptions": 15, "roi": 2.5, "status": "active"},
            {"promotion_id": 3, "name": "Expired", "redemptions": 100, "roi": 5.0, "status": "expired"},
            {"promotion_id": 4, "name": "Paused", "redemptions": 10, "roi": 1.8, "status": "paused"}
        ]

        insights = generate_promotion_insights(promo_stats)

        # Should identify Expired as best performer (highest ROI)
        best_insight = next((i for i in insights if "Best performer" in i), None)
        self.assertIsNotNone(best_insight)
        self.assertIn("Expired", best_insight)

        # Should identify Expired as most popular (most redemptions)
        popular_insight = next((i for i in insights if "Most popular" in i), None)
        self.assertIsNotNone(popular_insight)
        self.assertIn("Expired", popular_insight)

    def test_insights_formatting_includes_emojis(self):
        """Test that insights include emoji indicators"""
        promo_stats = [
            {"promotion_id": 1, "name": "Best", "redemptions": 10, "roi": 4.0, "status": "active"},
            {"promotion_id": 2, "name": "Popular", "redemptions": 50, "roi": 2.0, "status": "active"}
        ]

        insights = generate_promotion_insights(promo_stats)

        # Check for emoji presence
        has_trophy = any("🏆" in i for i in insights)
        has_chart = any("📈" in i for i in insights)

        self.assertTrue(has_trophy or has_chart)

    def test_insights_roi_formatting(self):
        """Test ROI is formatted with one decimal place"""
        promo_stats = [
            {"promotion_id": 1, "name": "Test", "redemptions": 5, "roi": 3.456789, "status": "active"}
        ]

        insights = generate_promotion_insights(promo_stats)

        best_insight = next((i for i in insights if "Best performer" in i), None)
        self.assertIsNotNone(best_insight)
        self.assertIn("3.5x ROI", best_insight)

    def test_insights_returns_list(self):
        """Test that insights always returns a list"""
        insights1 = generate_promotion_insights([])
        insights2 = generate_promotion_insights([
            {"promotion_id": 1, "name": "Test", "redemptions": 1, "roi": 1.0, "status": "active"}
        ])

        self.assertIsInstance(insights1, list)
        self.assertIsInstance(insights2, list)


class TestAIEmployeesConstant(unittest.TestCase):
    """Test suite for AI_EMPLOYEES constant structure"""

    def test_ai_employees_exists(self):
        """Test that AI_EMPLOYEES constant exists"""
        self.assertIsNotNone(AI_EMPLOYEES)
        self.assertIsInstance(AI_EMPLOYEES, dict)

    def test_marketing_maestro_exists(self):
        """Test Marketing Maestro AI employee definition"""
        self.assertIn("MARKETING_MAESTRO", AI_EMPLOYEES)

        maestro = AI_EMPLOYEES["MARKETING_MAESTRO"]
        self.assertIn("id", maestro)
        self.assertIn("name", maestro)
        self.assertIn("role", maestro)
        self.assertIn("description", maestro)

        self.assertEqual(maestro["id"], "AI_EMP_007")
        self.assertEqual(maestro["name"], "Sierra")
        self.assertEqual(maestro["role"], "Marketing Maestro")

    def test_notification_ninja_exists(self):
        """Test Notification Ninja AI employee definition"""
        self.assertIn("NOTIFICATION_NINJA", AI_EMPLOYEES)

        ninja = AI_EMPLOYEES["NOTIFICATION_NINJA"]
        self.assertEqual(ninja["id"], "AI_EMP_008")
        self.assertEqual(ninja["name"], "Phoenix")
        self.assertEqual(ninja["role"], "Notification Ninja")

    def test_analytics_advisor_exists(self):
        """Test Analytics Advisor AI employee definition"""
        self.assertIn("ANALYTICS_ADVISOR", AI_EMPLOYEES)

        advisor = AI_EMPLOYEES["ANALYTICS_ADVISOR"]
        self.assertEqual(advisor["id"], "AI_EMP_009")
        self.assertEqual(advisor["name"], "Sage")
        self.assertEqual(advisor["role"], "Analytics Advisor")

    def test_all_employees_have_required_fields(self):
        """Test all AI employees have required fields"""
        required_fields = ["id", "name", "role", "description"]

        for key, employee in AI_EMPLOYEES.items():
            for field in required_fields:
                self.assertIn(field, employee, f"{key} missing {field}")
                self.assertIsInstance(employee[field], str, f"{key}.{field} is not a string")
                self.assertTrue(len(employee[field]) > 0, f"{key}.{field} is empty")

    def test_unique_employee_ids(self):
        """Test that all AI employee IDs are unique"""
        ids = [emp["id"] for emp in AI_EMPLOYEES.values()]
        self.assertEqual(len(ids), len(set(ids)), "Duplicate AI employee IDs found")

    def test_unique_employee_names(self):
        """Test that all AI employee names are unique"""
        names = [emp["name"] for emp in AI_EMPLOYEES.values()]
        self.assertEqual(len(names), len(set(names)), "Duplicate AI employee names found")


class TestPydanticModels(unittest.TestCase):
    """Test suite for Pydantic request models"""

    def test_create_promotion_request_minimal(self):
        """Test CreatePromotionRequest with minimal required fields"""
        request = CreatePromotionRequest(
            name="Test Promotion",
            type="percentage",
            value=20.0
        )

        self.assertEqual(request.name, "Test Promotion")
        self.assertEqual(request.type, "percentage")
        self.assertEqual(request.value, 20.0)
        # Test defaults
        self.assertIsNone(request.description)
        self.assertEqual(request.min_order_amount, 0)
        self.assertEqual(request.target_audience, "all")
        self.assertFalse(request.is_recurring)
        self.assertEqual(request.per_customer_limit, 1)
        self.assertTrue(request.push_to_app)

    def test_create_promotion_request_full(self):
        """Test CreatePromotionRequest with all fields"""
        schedule = {"days": [1, 2, 3], "start_time": "11:00", "end_time": "14:00"}
        applies_to = {"type": "category", "ids": [1, 2, 3]}

        request = CreatePromotionRequest(
            name="Lunch Special",
            description="Great lunch deal",
            type="percentage",
            value=15.0,
            max_discount=10.0,
            min_order_amount=25.0,
            target_audience="returning",
            applies_to=applies_to,
            schedule=schedule,
            start_date="2024-12-01T00:00:00",
            end_date="2024-12-31T23:59:59",
            is_recurring=True,
            usage_limit=100,
            per_customer_limit=2,
            budget_limit=500.0,
            push_to_app=False
        )

        self.assertEqual(request.name, "Lunch Special")
        self.assertEqual(request.description, "Great lunch deal")
        self.assertEqual(request.value, 15.0)
        self.assertEqual(request.max_discount, 10.0)
        self.assertEqual(request.min_order_amount, 25.0)
        self.assertEqual(request.target_audience, "returning")
        self.assertEqual(request.schedule, schedule)
        self.assertEqual(request.applies_to, applies_to)
        self.assertTrue(request.is_recurring)
        self.assertEqual(request.usage_limit, 100)
        self.assertEqual(request.per_customer_limit, 2)
        self.assertEqual(request.budget_limit, 500.0)
        self.assertFalse(request.push_to_app)

    def test_update_promotion_request_minimal(self):
        """Test UpdatePromotionRequest with no fields (all optional)"""
        request = UpdatePromotionRequest()

        self.assertIsNone(request.name)
        self.assertIsNone(request.description)
        self.assertIsNone(request.value)
        self.assertIsNone(request.max_discount)
        self.assertIsNone(request.status)
        self.assertIsNone(request.schedule)
        self.assertIsNone(request.start_date)
        self.assertIsNone(request.end_date)

    def test_update_promotion_request_partial(self):
        """Test UpdatePromotionRequest with some fields"""
        request = UpdatePromotionRequest(
            name="Updated Name",
            value=25.0,
            status="paused"
        )

        self.assertEqual(request.name, "Updated Name")
        self.assertEqual(request.value, 25.0)
        self.assertEqual(request.status, "paused")
        self.assertIsNone(request.description)
        self.assertIsNone(request.max_discount)

    def test_update_promotion_request_full(self):
        """Test UpdatePromotionRequest with all fields"""
        schedule = {"days": [5, 6], "start_time": "17:00", "end_time": "21:00"}

        request = UpdatePromotionRequest(
            name="Weekend Special",
            description="Updated description",
            value=30.0,
            max_discount=15.0,
            status="active",
            schedule=schedule,
            start_date="2025-01-01T00:00:00",
            end_date="2025-01-31T23:59:59"
        )

        self.assertEqual(request.name, "Weekend Special")
        self.assertEqual(request.description, "Updated description")
        self.assertEqual(request.value, 30.0)
        self.assertEqual(request.max_discount, 15.0)
        self.assertEqual(request.status, "active")
        self.assertEqual(request.schedule, schedule)
        self.assertIsNotNone(request.start_date)
        self.assertIsNotNone(request.end_date)

    def test_apply_promotion_request_minimal(self):
        """Test ApplyPromotionRequest with minimal required fields"""
        request = ApplyPromotionRequest(
            promotion_code="TESTCODE",
            order_total=50.0
        )

        self.assertEqual(request.promotion_code, "TESTCODE")
        self.assertEqual(request.order_total, 50.0)
        self.assertIsNone(request.customer_id)
        self.assertIsNone(request.items)

    def test_apply_promotion_request_full(self):
        """Test ApplyPromotionRequest with all fields"""
        items = [
            {"name": "Item1", "price": 10.0},
            {"name": "Item2", "price": 15.0}
        ]

        request = ApplyPromotionRequest(
            promotion_code="SAVE20",
            order_total=25.0,
            customer_id=123,
            items=items
        )

        self.assertEqual(request.promotion_code, "SAVE20")
        self.assertEqual(request.order_total, 25.0)
        self.assertEqual(request.customer_id, 123)
        self.assertEqual(request.items, items)
        self.assertEqual(len(request.items), 2)

    def test_create_promotion_request_dict_fields(self):
        """Test CreatePromotionRequest properly handles dict fields"""
        schedule = {"days": [0, 1, 2, 3, 4], "start_time": "09:00", "end_time": "17:00"}
        applies_to = {"type": "all"}

        request = CreatePromotionRequest(
            name="Test",
            type="percentage",
            value=10.0,
            schedule=schedule,
            applies_to=applies_to
        )

        self.assertIsInstance(request.schedule, dict)
        self.assertIsInstance(request.applies_to, dict)
        self.assertEqual(request.schedule["days"], [0, 1, 2, 3, 4])
        self.assertEqual(request.applies_to["type"], "all")

    def test_pydantic_validation_types(self):
        """Test that Pydantic validates types correctly"""
        # Valid request
        request = CreatePromotionRequest(
            name="Test",
            type="percentage",
            value=15.0
        )
        self.assertIsInstance(request.value, float)

        # Test with int value (should be coerced to float)
        request2 = CreatePromotionRequest(
            name="Test",
            type="percentage",
            value=20  # int
        )
        self.assertIsInstance(request2.value, float)
        self.assertEqual(request2.value, 20.0)


class TestEdgeCases(unittest.TestCase):
    """Test suite for edge cases and error handling"""

    def test_get_promotion_message_with_none_values(self):
        """Test get_promotion_message handles None gracefully"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=20.0,
            name=None,  # This shouldn't happen, but test it
            promotion_code="TEST"
        )
        promo.name = None

        # Should not raise an error
        message = get_promotion_message(promo)
        self.assertIsInstance(message, str)

    def test_calculate_discount_with_negative_values(self):
        """Test calculate_discount with unusual negative values"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=20.0
        )

        # Negative order total (shouldn't happen in practice)
        discount = calculate_discount(promo, order_total=-50.0, items=None)
        # Will calculate negative discount
        self.assertEqual(discount, -10.0)

    def test_calculate_discount_very_large_percentage(self):
        """Test percentage discount > 100%"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=150.0  # 150%
        )

        discount = calculate_discount(promo, order_total=100.0, items=None)

        # Should calculate 150% of 100 = 150
        self.assertEqual(discount, 150.0)

    def test_bogo_with_zero_price_items(self):
        """Test BOGO with items that have zero price"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BOGO,
            value=0
        )

        items = [
            {"name": "Free Sample", "price": 0.0},
            {"name": "Paid Item", "price": 10.0}
        ]

        discount = calculate_discount(promo, order_total=10.0, items=items)

        # Should return 0 (the cheapest item)
        self.assertEqual(discount, 0.0)

    def test_generate_insights_with_zero_roi(self):
        """Test insights generation with zero ROI promotions"""
        promo_stats = [
            {"promotion_id": 1, "name": "No ROI", "redemptions": 10, "roi": 0.0, "status": "active"}
        ]

        insights = generate_promotion_insights(promo_stats)

        # Should still generate insights without errors
        self.assertIsInstance(insights, list)
        self.assertTrue(len(insights) > 0)

    def test_generate_insights_with_negative_roi(self):
        """Test insights with negative ROI (lost money)"""
        promo_stats = [
            {"promotion_id": 1, "name": "Lost Money", "redemptions": 5, "roi": -0.5, "status": "active"},
            {"promotion_id": 2, "name": "Profitable", "redemptions": 5, "roi": 2.0, "status": "active"}
        ]

        insights = generate_promotion_insights(promo_stats)

        # Best performer should be the profitable one
        best_insight = next((i for i in insights if "Best performer" in i), None)
        self.assertIsNotNone(best_insight)
        self.assertIn("Profitable", best_insight)


class TestAIEmployees(unittest.TestCase):
    """Test suite for AI Employee configuration"""

    def test_marketing_maestro_exists(self):
        """Test Marketing Maestro AI employee is defined"""
        self.assertIn("MARKETING_MAESTRO", AI_EMPLOYEES)
        sierra = AI_EMPLOYEES["MARKETING_MAESTRO"]
        self.assertEqual(sierra["name"], "Sierra")
        self.assertEqual(sierra["role"], "Marketing Maestro")
        self.assertIn("id", sierra)

    def test_notification_ninja_exists(self):
        """Test Notification Ninja AI employee is defined"""
        self.assertIn("NOTIFICATION_NINJA", AI_EMPLOYEES)
        phoenix = AI_EMPLOYEES["NOTIFICATION_NINJA"]
        self.assertEqual(phoenix["name"], "Phoenix")
        self.assertEqual(phoenix["role"], "Notification Ninja")

    def test_analytics_advisor_exists(self):
        """Test Analytics Advisor AI employee is defined"""
        self.assertIn("ANALYTICS_ADVISOR", AI_EMPLOYEES)
        sage = AI_EMPLOYEES["ANALYTICS_ADVISOR"]
        self.assertEqual(sage["name"], "Sage")
        self.assertEqual(sage["role"], "Analytics Advisor")

    def test_all_ai_employees_have_required_fields(self):
        """Test all AI employees have required fields"""
        required_fields = ["id", "name", "role", "description"]
        for key, employee in AI_EMPLOYEES.items():
            for field in required_fields:
                self.assertIn(field, employee, f"{key} missing {field}")

    def test_ai_employee_ids_unique(self):
        """Test all AI employee IDs are unique"""
        ids = [emp["id"] for emp in AI_EMPLOYEES.values()]
        self.assertEqual(len(ids), len(set(ids)), "AI employee IDs are not unique")


class TestUpdatePromotionRequest(unittest.TestCase):
    """Test suite for UpdatePromotionRequest model"""

    def test_update_request_all_optional(self):
        """Test that all fields in update request are optional"""
        request = UpdatePromotionRequest()
        self.assertIsNone(request.name)
        self.assertIsNone(request.description)
        self.assertIsNone(request.value)
        self.assertIsNone(request.status)

    def test_update_request_with_name(self):
        """Test update request with only name"""
        request = UpdatePromotionRequest(name="New Name")
        self.assertEqual(request.name, "New Name")
        self.assertIsNone(request.value)

    def test_update_request_with_value(self):
        """Test update request with only value"""
        request = UpdatePromotionRequest(value=25.0)
        self.assertEqual(request.value, 25.0)
        self.assertIsNone(request.name)

    def test_update_request_with_status(self):
        """Test update request with status change"""
        request = UpdatePromotionRequest(status="active")
        self.assertEqual(request.status, "active")

    def test_update_request_with_schedule(self):
        """Test update request with schedule"""
        schedule = {"days": [0, 1, 2], "start_time": "10:00", "end_time": "14:00"}
        request = UpdatePromotionRequest(schedule=schedule)
        self.assertEqual(request.schedule, schedule)

    def test_update_request_with_dates(self):
        """Test update request with date changes"""
        request = UpdatePromotionRequest(
            start_date="2024-01-01T00:00:00",
            end_date="2024-12-31T23:59:59"
        )
        self.assertEqual(request.start_date, "2024-01-01T00:00:00")
        self.assertEqual(request.end_date, "2024-12-31T23:59:59")


class TestApplyPromotionRequest(unittest.TestCase):
    """Test suite for ApplyPromotionRequest model"""

    def test_apply_request_minimal(self):
        """Test minimal apply request"""
        request = ApplyPromotionRequest(
            promotion_code="SAVE20",
            order_total=50.0
        )
        self.assertEqual(request.promotion_code, "SAVE20")
        self.assertEqual(request.order_total, 50.0)
        self.assertIsNone(request.customer_id)

    def test_apply_request_with_customer(self):
        """Test apply request with customer ID"""
        request = ApplyPromotionRequest(
            promotion_code="SAVE20",
            order_total=50.0,
            customer_id=12345
        )
        self.assertEqual(request.customer_id, 12345)

    def test_apply_request_with_items(self):
        """Test apply request with items list"""
        items = [
            {"name": "Pizza", "price": 15.99, "quantity": 2},
            {"name": "Soda", "price": 2.99, "quantity": 1}
        ]
        request = ApplyPromotionRequest(
            promotion_code="BOGO",
            order_total=34.97,
            items=items
        )
        self.assertEqual(len(request.items), 2)
        self.assertEqual(request.items[0]["name"], "Pizza")


class TestPromotionMessageVariations(unittest.TestCase):
    """Test suite for various promotion message scenarios"""

    def test_percentage_message_zero_value(self):
        """Test percentage message with 0% (edge case)"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=0.0,
            promotion_code="ZERO"
        )
        message = get_promotion_message(promo)
        self.assertIn("0%", message)
        self.assertIn("ZERO", message)

    def test_flat_amount_message_large_value(self):
        """Test flat amount message with large discount"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FLAT_AMOUNT,
            value=100.00,
            promotion_code="BIG100"
        )
        message = get_promotion_message(promo)
        self.assertIn("$100.00", message)

    def test_unknown_promotion_type_message(self):
        """Test message for unknown promotion type"""
        promo = Mock()
        promo.type = Mock()
        promo.type.value = "custom_type"
        promo.type.__eq__ = lambda self, other: False
        promo.value = 10.0
        promo.name = "Custom Promo"
        promo.promotion_code = "CUSTOM"

        message = get_promotion_message(promo)
        self.assertIn("Custom Promo", message)
        self.assertIn("CUSTOM", message)


class TestDiscountCalculationEdgeCases(unittest.TestCase):
    """Additional edge cases for discount calculations"""

    def test_percentage_with_zero_order(self):
        """Test percentage discount on zero order"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.PERCENTAGE,
            value=20.0
        )
        discount = calculate_discount(promo, order_total=0.0, items=None)
        self.assertEqual(discount, 0.0)

    def test_flat_amount_exceeds_order(self):
        """Test flat amount that exceeds order total"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FLAT_AMOUNT,
            value=50.0
        )
        # Flat amount doesn't cap, it just returns the value
        discount = calculate_discount(promo, order_total=30.0, items=None)
        self.assertEqual(discount, 50.0)

    def test_bogo_single_item(self):
        """Test BOGO with single item"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BOGO,
            value=0
        )
        items = [{"name": "Item", "price": 20.0}]
        discount = calculate_discount(promo, order_total=20.0, items=items)
        self.assertEqual(discount, 20.0)  # Only item is the "free" one

    def test_bogo_many_items(self):
        """Test BOGO with many items"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.BOGO,
            value=0
        )
        items = [
            {"name": "Expensive", "price": 50.0},
            {"name": "Medium", "price": 30.0},
            {"name": "Cheap", "price": 5.0}
        ]
        discount = calculate_discount(promo, order_total=85.0, items=items)
        self.assertEqual(discount, 5.0)  # Cheapest item is free

    def test_free_delivery_fixed_value(self):
        """Test free delivery returns fixed delivery fee"""
        promo = create_mock_promotion(
            promotion_type=PromotionType.FREE_DELIVERY,
            value=0
        )
        discount = calculate_discount(promo, order_total=100.0, items=None)
        self.assertEqual(discount, 4.99)  # Standard delivery fee


class TestInsightsGeneration(unittest.TestCase):
    """Additional tests for insights generation"""

    def test_insights_all_inactive(self):
        """Test insights when all promotions are inactive"""
        promo_stats = [
            {"promotion_id": 1, "name": "Old Promo", "redemptions": 0, "roi": 0, "status": "expired"},
            {"promotion_id": 2, "name": "Cancelled", "redemptions": 0, "roi": 0, "status": "cancelled"}
        ]
        insights = generate_promotion_insights(promo_stats)
        self.assertIsInstance(insights, list)
        # Should mention no active promotions
        active_insight = [i for i in insights if "No active" in i]
        self.assertTrue(len(active_insight) > 0)

    def test_insights_many_active(self):
        """Test insights when many promotions are active"""
        promo_stats = [
            {"promotion_id": i, "name": f"Promo {i}", "redemptions": 10, "roi": 1.5, "status": "active"}
            for i in range(10)
        ]
        insights = generate_promotion_insights(promo_stats)
        self.assertIsInstance(insights, list)
        # Should warn about too many active promotions
        warning_insight = [i for i in insights if "Many" in i or "focus" in i.lower()]
        self.assertTrue(len(warning_insight) > 0)

    def test_insights_with_equal_roi(self):
        """Test insights when promotions have equal ROI"""
        promo_stats = [
            {"promotion_id": 1, "name": "Promo A", "redemptions": 10, "roi": 2.0, "status": "active"},
            {"promotion_id": 2, "name": "Promo B", "redemptions": 10, "roi": 2.0, "status": "active"}
        ]
        insights = generate_promotion_insights(promo_stats)
        self.assertIsInstance(insights, list)
        # Should identify one as best performer
        self.assertTrue(any("Best performer" in i for i in insights))

    def test_insights_with_high_redemptions(self):
        """Test insights highlights high redemption promotion"""
        promo_stats = [
            {"promotion_id": 1, "name": "Popular", "redemptions": 1000, "roi": 1.0, "status": "active"},
            {"promotion_id": 2, "name": "Unpopular", "redemptions": 5, "roi": 5.0, "status": "active"}
        ]
        insights = generate_promotion_insights(promo_stats)
        # Should mention the popular one
        popular_insight = [i for i in insights if "Popular" in i or "popular" in i]
        self.assertTrue(len(popular_insight) > 0 or any("1000" in str(i) for i in insights))


class TestCreatePromotionRequestValidation(unittest.TestCase):
    """Additional validation tests for CreatePromotionRequest"""

    def test_request_with_all_fields(self):
        """Test request with all optional fields set"""
        request = CreatePromotionRequest(
            name="Full Test",
            description="Complete promotion test",
            type="percentage",
            value=15.0,
            max_discount=50.0,
            min_order_amount=20.0,
            target_audience="new_customers",
            applies_to={"type": "category", "ids": [1, 2, 3]},
            schedule={"days": [0, 1, 2, 3, 4], "start_time": "11:00", "end_time": "14:00"},
            start_date="2024-01-01",
            end_date="2024-12-31",
            is_recurring=True,
            usage_limit=100,
            per_customer_limit=2,
            budget_limit=1000.0,
            push_to_app=True
        )
        self.assertEqual(request.name, "Full Test")
        self.assertEqual(request.max_discount, 50.0)
        self.assertTrue(request.is_recurring)
        self.assertEqual(request.per_customer_limit, 2)

    def test_request_default_values(self):
        """Test default values are set correctly"""
        request = CreatePromotionRequest(
            name="Defaults Test",
            type="percentage",
            value=10.0
        )
        self.assertEqual(request.min_order_amount, 0)
        self.assertEqual(request.target_audience, "all")
        self.assertFalse(request.is_recurring)
        self.assertEqual(request.per_customer_limit, 1)
        self.assertTrue(request.push_to_app)

    def test_all_promotion_types(self):
        """Test creating requests for all promotion types"""
        types = ["percentage", "flat_amount", "bogo", "free_delivery", "free_item", "bundle"]
        for promo_type in types:
            request = CreatePromotionRequest(
                name=f"Test {promo_type}",
                type=promo_type,
                value=10.0
            )
            self.assertEqual(request.type, promo_type)

    def test_all_target_audiences(self):
        """Test creating requests for all target audiences"""
        audiences = ["all", "new_customers", "returning", "loyalty_members", "dormant"]
        for audience in audiences:
            request = CreatePromotionRequest(
                name=f"Test {audience}",
                type="percentage",
                value=10.0,
                target_audience=audience
            )
            self.assertEqual(request.target_audience, audience)


if __name__ == "__main__":
    # Run tests with verbose output
    unittest.main(verbosity=2)
