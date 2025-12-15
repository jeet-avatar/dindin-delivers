"""
DOLLOR.AI V5 - DRIVER EARNINGS & INCENTIVES
============================================

CLARIFICATION ON THE $17K LIMIT:
================================

The $17,000 is NOT an earnings cap! Here's what it actually means:

1. GIFT TAX EXCLUSION ($17k):
   - Each GIVER can give up to $17k per year to each recipient TAX-FREE
   - This is per giver, not total
   - A driver can receive $17k from Customer A, $17k from Customer B, etc.
   - With 1000+ different customers, there's effectively no limit

2. WHAT DRIVERS ACTUALLY REPORT:
   - If structured as gifts: Only report if single giver exceeds $17k (rare)
   - If structured as self-employment income: Report all, but deduct expenses
   - Either way: Drivers can earn unlimited amounts

3. BETTER FRAMING - SELF-EMPLOYMENT:
   - Driver is a "self-employed errand runner"
   - Customer pays for errand service
   - Driver reports as business income
   - Driver deducts mileage, phone, etc.
   - This is cleaner and has no caps

RECOMMENDED MODEL: HYBRID
=========================

- Small amounts ($5-15): Treated as tips/gifts (common for service)
- Regular earnings: Self-employment income
- Driver gets 1099-K from payment processors (Venmo, etc.) if >$600
- Driver can deduct business expenses (mileage = $0.67/mile in 2024)

HOW DRIVER SEES EARNINGS:
=========================

Before accepting:
- See exact amount customer will pay
- See distance and estimated time
- See $/mile and $/hour calculation
- See customer rating

After delivery:
- Instant payment via Venmo/Zelle/Cash
- Track daily/weekly/monthly earnings
- See tax-deductible mileage
- Export for taxes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid

router = APIRouter(prefix="/api/v5/driver", tags=["V5 Driver Earnings"])


# =============================================================================
# DRIVER EARNINGS CONFIGURATION
# =============================================================================

class DriverEarningsConfig:
    """
    Pricing suggestions to ensure drivers earn well.
    These are SUGGESTIONS - customers set final amount.
    """

    # Minimum suggested amounts (to ensure fair pay)
    MIN_DELIVERY_SUGGESTION = 5.00  # Don't let customers lowball

    # Distance-based suggestions
    BASE_SUGGESTION = 4.00  # First 2 miles
    PER_MILE_SUGGESTION = 1.50  # Per mile after first 2

    # Time-based additions
    PEAK_HOUR_BONUS = 2.00  # Lunch 11-1, Dinner 5-8
    LATE_NIGHT_BONUS = 3.00  # After 9pm
    BAD_WEATHER_BONUS = 3.00  # Rain/snow

    # Target hourly rate (what we design around)
    TARGET_HOURLY_RATE = 25.00  # $25/hr target

    # IRS mileage deduction rate (2024)
    IRS_MILEAGE_RATE = 0.67  # $0.67 per mile deductible

    # Average deliveries per hour (for calculations)
    AVG_DELIVERIES_PER_HOUR = 2.5


class SuggestedPricing(BaseModel):
    """What we suggest customer pay for delivery help"""
    minimum: float
    suggested: float
    generous: float
    breakdown: Dict[str, float]
    driver_perspective: Dict[str, Any]


# =============================================================================
# PRICING CALCULATOR - SHOWN TO BOTH CUSTOMER AND DRIVER
# =============================================================================

@router.get("/pricing/calculate")
async def calculate_suggested_pricing(
    distance_miles: float,
    is_peak_hour: bool = False,
    is_late_night: bool = False,
    is_bad_weather: bool = False,
    estimated_wait_minutes: int = 5
) -> SuggestedPricing:
    """
    Calculate suggested pricing for delivery.

    This is shown to:
    1. CUSTOMER when posting request (so they offer fair amount)
    2. DRIVER when viewing request (so they know what to expect)

    Transparency is key - everyone sees the same numbers.
    """

    # Base calculation
    if distance_miles <= 2:
        base_amount = DriverEarningsConfig.BASE_SUGGESTION
    else:
        extra_miles = distance_miles - 2
        base_amount = DriverEarningsConfig.BASE_SUGGESTION + (extra_miles * DriverEarningsConfig.PER_MILE_SUGGESTION)

    # Add bonuses
    bonuses = 0
    bonus_breakdown = {}

    if is_peak_hour:
        bonuses += DriverEarningsConfig.PEAK_HOUR_BONUS
        bonus_breakdown["peak_hour"] = DriverEarningsConfig.PEAK_HOUR_BONUS

    if is_late_night:
        bonuses += DriverEarningsConfig.LATE_NIGHT_BONUS
        bonus_breakdown["late_night"] = DriverEarningsConfig.LATE_NIGHT_BONUS

    if is_bad_weather:
        bonuses += DriverEarningsConfig.BAD_WEATHER_BONUS
        bonus_breakdown["bad_weather"] = DriverEarningsConfig.BAD_WEATHER_BONUS

    suggested = base_amount + bonuses
    minimum = max(DriverEarningsConfig.MIN_DELIVERY_SUGGESTION, suggested * 0.7)
    generous = suggested * 1.5

    # Calculate what this means for driver
    total_miles = distance_miles * 2  # Round trip
    estimated_time_minutes = (distance_miles * 3) + estimated_wait_minutes + 5  # 3 min/mile + wait + buffer

    # Tax deduction driver can claim
    mileage_deduction = total_miles * DriverEarningsConfig.IRS_MILEAGE_RATE

    # Effective hourly rate
    effective_hourly = (suggested / estimated_time_minutes) * 60

    return SuggestedPricing(
        minimum=round(minimum, 2),
        suggested=round(suggested, 2),
        generous=round(generous, 2),
        breakdown={
            "base_amount": round(base_amount, 2),
            "distance_miles": distance_miles,
            "bonuses": round(bonuses, 2),
            **bonus_breakdown
        },
        driver_perspective={
            "you_receive": round(suggested, 2),
            "platform_fee": 0.00,  # We take NOTHING from drivers
            "you_keep": round(suggested, 2),
            "estimated_time_minutes": round(estimated_time_minutes),
            "effective_hourly_rate": round(effective_hourly, 2),
            "total_miles_round_trip": round(total_miles, 1),
            "tax_deductible_mileage": round(mileage_deduction, 2),
            "net_after_expenses": round(suggested - (total_miles * 0.20), 2),  # Rough gas cost
            "comparison": {
                "doordash_equivalent": round(suggested * 0.75, 2),  # They take 25%
                "ubereats_equivalent": round(suggested * 0.70, 2),  # They take 30%
                "your_advantage": "You keep 100%"
            }
        }
    )


# =============================================================================
# DRIVER DASHBOARD - EARNINGS VISIBILITY
# =============================================================================

@router.get("/{driver_id}/dashboard")
async def get_driver_dashboard(driver_id: str):
    """
    Driver's earnings dashboard - complete transparency.
    """
    # In production: Query from database
    # Mock data for demonstration

    today_deliveries = 8
    today_earnings = 72.50
    today_miles = 34
    today_hours = 3.5

    return {
        "driver_id": driver_id,
        "snapshot_time": datetime.utcnow().isoformat(),

        "today": {
            "deliveries": today_deliveries,
            "gross_earnings": today_earnings,
            "total_miles": today_miles,
            "active_hours": today_hours,
            "effective_hourly_rate": round(today_earnings / today_hours, 2),
            "per_delivery_average": round(today_earnings / today_deliveries, 2),
        },

        "this_week": {
            "deliveries": 42,
            "gross_earnings": 478.50,
            "total_miles": 156,
            "active_hours": 18,
            "effective_hourly_rate": 26.58,
        },

        "this_month": {
            "deliveries": 168,
            "gross_earnings": 1892.00,
            "total_miles": 612,
            "active_hours": 72,
            "effective_hourly_rate": 26.28,
        },

        "tax_info": {
            "total_miles_ytd": 4850,
            "mileage_deduction_ytd": round(4850 * 0.67, 2),  # $3,249.50
            "gross_earnings_ytd": 15240.00,
            "estimated_taxable_after_mileage": round(15240 - (4850 * 0.67), 2),
            "note": "You can deduct $0.67 per mile from your taxes",
            "other_deductions": [
                "Phone bill (% used for work)",
                "Hot bags / delivery equipment",
                "Car maintenance (% used for work)",
            ]
        },

        "platform_fees_paid": {
            "to_dollor": 0.00,
            "note": "Dollor.ai charges drivers $0. Always. Forever.",
        },

        "payment_methods": {
            "primary": "Venmo @driver_name",
            "backup": "Zelle (555) 123-4567",
            "accepts_cash": True,
        },

        "ratings": {
            "overall": 4.9,
            "total_reviews": 156,
            "on_time_percentage": 97,
            "customer_compliments": 23,
        }
    }


# =============================================================================
# AVAILABLE DELIVERIES WITH FULL EARNINGS INFO
# =============================================================================

@router.get("/{driver_id}/available-deliveries")
async def get_available_deliveries_for_driver(
    driver_id: str,
    driver_lat: float,
    driver_lng: float,
    max_distance: float = 10.0
):
    """
    Show driver available deliveries with FULL earnings transparency.

    Driver sees EXACTLY what they'll earn before accepting.
    """

    # Mock available deliveries
    deliveries = [
        {
            "request_id": "REQ-ABC123",
            "posted_ago": "2 min",

            "pickup": {
                "restaurant": "Tony's Pizza",
                "address": "123 Main St",
                "distance_from_you": 0.8,  # miles
            },

            "delivery": {
                "area": "Downtown",  # Don't show exact address until accepted
                "distance_from_pickup": 2.3,  # miles
            },

            "earnings": {
                "customer_offering": 8.50,
                "you_keep": 8.50,  # 100%
                "platform_fee": 0.00,

                "breakdown": {
                    "base": 4.00,
                    "distance": 3.50,
                    "peak_bonus": 1.00,
                },

                "your_metrics": {
                    "total_miles": 6.2,  # Round trip
                    "estimated_time": "18 min",
                    "effective_hourly": 28.33,
                    "per_mile": 1.37,
                    "mileage_deduction": 4.15,  # Tax write-off
                },

                "comparison": {
                    "if_doordash": 6.38,  # They'd take 25%
                    "if_ubereats": 5.95,  # They'd take 30%
                    "your_extra": 2.55,  # What you save
                }
            },

            "customer": {
                "rating": 4.8,
                "total_orders": 23,
                "tip_history": "Usually tips well",
            },

            "payment_method": "Venmo (instant)",
        },
        {
            "request_id": "REQ-DEF456",
            "posted_ago": "5 min",

            "pickup": {
                "restaurant": "Sushi Palace",
                "address": "456 Oak Ave",
                "distance_from_you": 1.2,
            },

            "delivery": {
                "area": "Westside",
                "distance_from_pickup": 4.1,
            },

            "earnings": {
                "customer_offering": 12.00,
                "you_keep": 12.00,
                "platform_fee": 0.00,

                "breakdown": {
                    "base": 4.00,
                    "distance": 6.15,
                    "peak_bonus": 0.00,
                    "generous_customer": 1.85,
                },

                "your_metrics": {
                    "total_miles": 10.6,
                    "estimated_time": "28 min",
                    "effective_hourly": 25.71,
                    "per_mile": 1.13,
                    "mileage_deduction": 7.10,
                },
            },

            "customer": {
                "rating": 5.0,
                "total_orders": 8,
                "tip_history": "New customer - gave generous amount",
            },

            "payment_method": "Cash",
        }
    ]

    return {
        "available_count": len(deliveries),
        "deliveries": deliveries,

        "your_status": {
            "current_location": f"{driver_lat}, {driver_lng}",
            "active_hours_today": 2.5,
            "deliveries_today": 5,
            "earnings_today": 47.50,
        },

        "market_conditions": {
            "demand_level": "High",
            "surge_active": False,
            "peak_hours": "5pm - 8pm (dinner rush coming)",
            "tip": "Dinner rush starting soon - great time to deliver!",
        },

        "earnings_reminder": {
            "you_keep": "100% of every delivery",
            "platform_fee": "$0",
            "vs_competitors": "You'd lose 25-30% on other apps",
        }
    }


# =============================================================================
# DRIVER INCENTIVE PROGRAMS
# =============================================================================

@router.get("/incentives/active")
async def get_active_incentives():
    """
    Incentive programs to make driving more lucrative.

    These are EXTRA earnings on top of delivery payments.
    """
    return {
        "current_incentives": [
            {
                "name": "New Driver Bonus",
                "description": "Complete 25 deliveries in your first week",
                "reward": 50.00,
                "type": "bonus_from_platform",
                "how_paid": "Added to your next cash out",
            },
            {
                "name": "Lunch Rush Challenge",
                "description": "Complete 5 deliveries between 11am-1pm",
                "reward": 10.00,
                "type": "daily_challenge",
                "expires": "Today 1pm",
            },
            {
                "name": "Weekend Warrior",
                "description": "Complete 20 deliveries Sat-Sun",
                "reward": 25.00,
                "type": "weekly_challenge",
            },
            {
                "name": "Perfect Week",
                "description": "Maintain 4.8+ rating for a week",
                "reward": 15.00,
                "type": "quality_bonus",
            },
            {
                "name": "Refer a Driver",
                "description": "Get $25 when your referral completes 10 deliveries",
                "reward": 25.00,
                "type": "referral",
                "unlimited": True,
            },
        ],

        "earning_boosters": {
            "peak_hours": {
                "lunch": {"time": "11am-1pm", "typical_boost": "+$1-2 per delivery"},
                "dinner": {"time": "5pm-8pm", "typical_boost": "+$2-3 per delivery"},
                "late_night": {"time": "9pm-12am", "typical_boost": "+$3-4 per delivery"},
            },
            "weather_boost": "Bad weather = higher customer offers (+$2-5)",
            "event_boost": "Sports games, concerts = surge in orders",
        },

        "long_term_benefits": {
            "milestone_100": {"deliveries": 100, "reward": "Priority access to high-value orders"},
            "milestone_500": {"deliveries": 500, "reward": "VIP driver badge (customers tip more)"},
            "milestone_1000": {"deliveries": 1000, "reward": "Featured driver status + $100 bonus"},
        },

        "tax_benefits": {
            "mileage_deduction": "$0.67 per mile (IRS 2024 rate)",
            "example": "500 miles/week = $335/week tax deduction = $17,420/year",
            "other_deductions": [
                "Phone bill (work %)",
                "Insulated bags",
                "Car washes",
                "Portion of car insurance",
            ],
            "tip": "Keep a mileage log - apps like Stride do this automatically",
        }
    }


# =============================================================================
# EARNINGS PROJECTIONS
# =============================================================================

@router.get("/earnings/projections")
async def get_earnings_projections():
    """
    Help drivers understand earning potential.
    """
    return {
        "earning_scenarios": {
            "part_time_casual": {
                "hours_per_week": 10,
                "deliveries_per_hour": 2.5,
                "avg_per_delivery": 8.50,
                "weekly_gross": 212.50,
                "monthly_gross": 850.00,
                "yearly_gross": 10200.00,
                "estimated_miles": 200,  # per week
                "mileage_deduction_weekly": 134.00,
                "effective_hourly": 21.25,
            },

            "part_time_dedicated": {
                "hours_per_week": 20,
                "deliveries_per_hour": 2.5,
                "avg_per_delivery": 9.00,
                "weekly_gross": 450.00,
                "monthly_gross": 1800.00,
                "yearly_gross": 21600.00,
                "estimated_miles": 400,
                "mileage_deduction_weekly": 268.00,
                "effective_hourly": 22.50,
            },

            "full_time": {
                "hours_per_week": 40,
                "deliveries_per_hour": 2.5,
                "avg_per_delivery": 9.50,
                "weekly_gross": 950.00,
                "monthly_gross": 3800.00,
                "yearly_gross": 45600.00,
                "estimated_miles": 800,
                "mileage_deduction_weekly": 536.00,
                "effective_hourly": 23.75,
                "note": "Full-time drivers often earn more per delivery due to experience",
            },

            "power_driver": {
                "hours_per_week": 50,
                "deliveries_per_hour": 3.0,  # More efficient
                "avg_per_delivery": 10.00,  # Cherry-pick best orders
                "weekly_gross": 1500.00,
                "monthly_gross": 6000.00,
                "yearly_gross": 72000.00,
                "estimated_miles": 1000,
                "mileage_deduction_weekly": 670.00,
                "effective_hourly": 30.00,
                "note": "Top drivers who know the best routes and times",
            },
        },

        "vs_competitors": {
            "note": "On other platforms, you'd lose 25-30% of these amounts",
            "example": {
                "your_delivery": 10.00,
                "doordash_equivalent": 7.50,
                "ubereats_equivalent": 7.00,
                "your_advantage_per_delivery": 2.50,
                "yearly_advantage_full_time": 13000.00,
            }
        },

        "tax_advantage": {
            "yearly_miles_full_time": 41600,
            "mileage_deduction": 27872.00,  # At $0.67/mile
            "gross_earnings": 45600.00,
            "taxable_after_mileage": 17728.00,
            "effective_tax_savings": "Significant - consult a tax professional",
        },

        "how_to_maximize": [
            "Work peak hours (lunch 11-1, dinner 5-8)",
            "Accept stacked orders when possible",
            "Learn which restaurants are fastest",
            "Build regular customers who tip well",
            "Track all miles for tax deductions",
            "Use multiple apps (we don't require exclusivity)",
        ]
    }


# =============================================================================
# PAYMENT SETUP & INSTANT PAY
# =============================================================================

@router.get("/{driver_id}/payment-setup")
async def get_payment_setup(driver_id: str):
    """
    How drivers get paid - instant, direct, no platform involvement.
    """
    return {
        "how_you_get_paid": {
            "method": "Direct from customer",
            "options": ["Venmo", "Zelle", "Cash App", "PayPal", "Cash"],
            "timing": "Instant - as soon as delivery complete",
            "platform_involvement": "NONE - we never touch your money",
        },

        "setup_required": {
            "venmo": {
                "status": "Recommended",
                "why": "Most popular, instant, easy",
                "setup": "Just share your @username",
            },
            "zelle": {
                "status": "Good backup",
                "why": "Direct to bank, no fees",
                "setup": "Share phone or email linked to Zelle",
            },
            "cash": {
                "status": "Always accepted",
                "why": "Some customers prefer cash",
                "tip": "Keep small bills for change",
            },
        },

        "your_payment_info": {
            "venmo": "@driver_username",  # Would be their actual info
            "zelle": "driver@email.com",
            "accepts_cash": True,
            "display_to_customers": True,
        },

        "advantages": {
            "instant": "Get paid the second you complete delivery",
            "no_waiting": "No weekly payouts, no minimum thresholds",
            "no_fees": "Venmo/Zelle are free for personal payments",
            "control": "You choose how to receive money",
            "no_garnishment": "Direct P2P payments",
        },

        "vs_competitors": {
            "doordash": "Weekly payouts, or pay $1.99 for instant",
            "ubereats": "Weekly payouts, instant cash out has fees",
            "dollor": "Always instant, always free, always direct",
        }
    }
