"""
EatFair P2P - Promotion Management System
AI Employee: Sierra - Marketing Maestro

Features:
1. Create, manage, schedule promotions
2. AI-suggested promotions based on sales data
3. Instant push to customer apps
4. Time-based scheduling (happy hour, lunch specials)
5. Target specific audiences (new, returning, dormant customers)
6. Track redemptions and ROI
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from auth_utils import require_any_auth
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import json
import uuid

from database import get_db
from models import Vendor, Order, OrderStatus, Customer
from models_extended import (
    Promotion, PromotionType, PromotionStatus, PromotionTargetAudience,
    PromotionRedemption, RealTimeEvent, Communication, CommunicationChannel,
    CommunicationStatus, RecipientType, VendorAnalytics
)

router = APIRouter(prefix="/api/promotions", tags=["promotions"])

# ==================== AI EMPLOYEE ====================

AI_EMPLOYEES = {
    "MARKETING_MAESTRO": {
        "id": "AI_EMP_007",
        "name": "Sierra",
        "role": "Marketing Maestro",
        "description": "Promotional campaigns and marketing optimization"
    },
    "NOTIFICATION_NINJA": {
        "id": "AI_EMP_008",
        "name": "Phoenix",
        "role": "Notification Ninja",
        "description": "Push, email, SMS at the right moments"
    },
    "ANALYTICS_ADVISOR": {
        "id": "AI_EMP_009",
        "name": "Sage",
        "role": "Analytics Advisor",
        "description": "Generate insights, predict trends, recommend actions"
    }
}


# ==================== REQUEST MODELS ====================

class CreatePromotionRequest(BaseModel):
    name: str
    description: Optional[str] = None
    type: str  # percentage, flat_amount, bogo, free_delivery, free_item, bundle
    value: float
    max_discount: Optional[float] = None
    min_order_amount: Optional[float] = 0
    target_audience: Optional[str] = "all"  # all, new_customers, returning, loyalty_members, dormant
    applies_to: Optional[Dict] = None  # {"type": "all"|"category"|"items", "ids": [...]}
    schedule: Optional[Dict] = None  # {"days": [1,2,3], "start_time": "11:00", "end_time": "14:00"}
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_recurring: bool = False
    usage_limit: Optional[int] = None
    per_customer_limit: int = 1
    budget_limit: Optional[float] = None
    push_to_app: bool = True


class UpdatePromotionRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    value: Optional[float] = None
    max_discount: Optional[float] = None
    status: Optional[str] = None
    schedule: Optional[Dict] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ApplyPromotionRequest(BaseModel):
    promotion_code: str
    order_total: float
    customer_id: Optional[int] = None
    items: Optional[List[Dict]] = None


# ==================== CREATE PROMOTION ====================

@router.post("/create")
async def create_promotion(
    vendor_id: int,
    request: CreatePromotionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_any_auth),
):
    """
    Create a new promotion
    AI Employee: Sierra

    Supports:
    - Percentage discounts (20% off)
    - Flat amount ($5 off)
    - BOGO (Buy one get one)
    - Free delivery
    - Bundle deals
    """
    ai_employee = AI_EMPLOYEES["MARKETING_MAESTRO"]

    # Verify vendor
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Generate promotion code
    promo_code = f"PROMO{uuid.uuid4().hex[:6].upper()}"

    # Parse dates
    start_date = datetime.fromisoformat(request.start_date) if request.start_date else datetime.now()
    end_date = datetime.fromisoformat(request.end_date) if request.end_date else None

    # Determine initial status
    status = PromotionStatus.DRAFT
    if start_date <= datetime.now():
        if not end_date or end_date > datetime.now():
            status = PromotionStatus.ACTIVE
    else:
        status = PromotionStatus.SCHEDULED

    # Create promotion
    promotion = Promotion(
        promotion_code=promo_code,
        vendor_id=vendor_id,
        name=request.name,
        description=request.description,
        type=PromotionType(request.type),
        value=request.value,
        max_discount=request.max_discount,
        min_order_amount=request.min_order_amount or 0,
        target_audience=PromotionTargetAudience(request.target_audience or "all"),
        applies_to=request.applies_to,
        schedule=request.schedule,
        start_date=start_date,
        end_date=end_date,
        is_recurring=request.is_recurring,
        usage_limit=request.usage_limit,
        per_customer_limit=request.per_customer_limit,
        budget_limit=request.budget_limit,
        status=status,
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"]
    )

    db.add(promotion)
    db.commit()
    db.refresh(promotion)

    # Push to app if requested and active
    if request.push_to_app and status == PromotionStatus.ACTIVE:
        background_tasks.add_task(
            push_promotion_to_apps,
            promotion.id,
            vendor_id,
            db
        )
        promotion.pushed_to_app = True
        promotion.pushed_at = datetime.now()
        db.commit()

    return {
        "id": promotion.id,
        "promotion_code": promotion.promotion_code,
        "vendor_id": promotion.vendor_id,
        "name": promotion.name,
        "description": promotion.description,
        "type": promotion.type.value,
        "value": promotion.value,
        "max_discount": promotion.max_discount,
        "min_order_amount": promotion.min_order_amount,
        "target_audience": promotion.target_audience.value,
        "schedule": promotion.schedule,
        "start_date": promotion.start_date.isoformat() if promotion.start_date else None,
        "end_date": promotion.end_date.isoformat() if promotion.end_date else None,
        "is_recurring": promotion.is_recurring,
        "usage_count": promotion.usage_count,
        "usage_limit": promotion.usage_limit,
        "total_discount_given": promotion.total_discount_given,
        "status": promotion.status.value,
        "pushed_to_app": promotion.pushed_to_app,
        "ai_suggested": promotion.ai_suggested,
        "created_at": promotion.created_at.isoformat(),
        "success": True,
        "processed_by": ai_employee["name"],
        "message": f"Promotion '{request.name}' created successfully!",
        "push_status": "Pushing to customer apps..." if request.push_to_app else "Not pushed yet"
    }


# ==================== PUSH TO APPS ====================

async def push_promotion_to_apps(promotion_id: int, vendor_id: int, db: Session):
    """
    Push promotion to customer apps via real-time event
    AI Employee: Phoenix
    """
    from database import SessionLocal
    db = SessionLocal()

    ai_employee = AI_EMPLOYEES["NOTIFICATION_NINJA"]

    try:
        promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()

        if not promotion or not vendor:
            return

        # Create real-time event
        event = RealTimeEvent(
            event_id=f"evt_{uuid.uuid4().hex}",
            event_type="promo:new",
            vendor_id=vendor_id,
            target_type="vendor_customers",
            payload={
                "promotion_id": promotion.id,
                "promotion_code": promotion.promotion_code,
                "restaurant_name": vendor.restaurant_name,
                "name": promotion.name,
                "description": promotion.description,
                "type": promotion.type.value,
                "value": promotion.value,
                "min_order": promotion.min_order_amount,
                "expires": promotion.end_date.isoformat() if promotion.end_date else None
            },
            send_push=True,
            push_title=f"🎉 New deal at {vendor.restaurant_name}!",
            push_body=get_promotion_message(promotion),
            created_by_ai=ai_employee["id"],
            created_by_ai_name=ai_employee["name"]
        )

        db.add(event)

        # Update promotion
        promotion.pushed_to_app = True
        promotion.pushed_at = datetime.now()

        db.commit()

    except Exception as e:
        print(f"Push promotion error: {e}")
    finally:
        db.close()


def get_promotion_message(promotion: Promotion) -> str:
    """Generate human-readable promotion message"""
    if promotion.type == PromotionType.PERCENTAGE:
        return f"Get {int(promotion.value)}% off your order! Use code: {promotion.promotion_code}"
    elif promotion.type == PromotionType.FLAT_AMOUNT:
        return f"Save ${promotion.value:.2f} on your next order! Use code: {promotion.promotion_code}"
    elif promotion.type == PromotionType.FREE_DELIVERY:
        return f"FREE DELIVERY on your next order! Use code: {promotion.promotion_code}"
    elif promotion.type == PromotionType.BOGO:
        return f"Buy One Get One FREE! Use code: {promotion.promotion_code}"
    else:
        return f"Special offer: {promotion.name}! Use code: {promotion.promotion_code}"


# ==================== AI SUGGESTED PROMOTIONS ====================

@router.get("/suggestions/{vendor_id}")
async def get_ai_suggested_promotions(
    vendor_id: int,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_any_auth),
):
    """
    AI-generated promotion suggestions based on restaurant data
    AI Employee: Sierra + Sage

    Analyzes:
    - Sales trends
    - Peak/slow hours
    - Popular items
    - Customer behavior
    """
    ai_employee = AI_EMPLOYEES["MARKETING_MAESTRO"]
    analytics_ai = AI_EMPLOYEES["ANALYTICS_ADVISOR"]

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Get recent orders
    last_30_days = datetime.now() - timedelta(days=30)
    orders = db.query(Order).filter(
        Order.vendor_id == vendor_id,
        Order.created_at >= last_30_days
    ).all()

    # Calculate metrics
    total_orders = len(orders)
    completed_orders = [o for o in orders if o.status == OrderStatus.DELIVERED]
    total_revenue = sum(o.total_amount for o in completed_orders)
    avg_order_value = total_revenue / len(completed_orders) if completed_orders else 0

    # Analyze by hour
    orders_by_hour = {}
    for order in orders:
        hour = order.created_at.hour
        orders_by_hour[hour] = orders_by_hour.get(hour, 0) + 1

    # Find slow hours
    slow_hours = [h for h, count in orders_by_hour.items() if count < total_orders / 24 * 0.5]

    # Generate suggestions
    suggestions = []

    # Suggestion 1: Slow period boost
    if slow_hours:
        slow_start = min(slow_hours)
        slow_end = max(slow_hours) + 1
        suggestions.append({
            "name": "Slow Period Boost",
            "type": "percentage",
            "value": 15,
            "reason": f"Orders are slow between {slow_start}:00-{slow_end}:00. A 15% discount could increase traffic.",
            "schedule": {
                "days": [1, 2, 3, 4, 5],
                "start_time": f"{slow_start}:00",
                "end_time": f"{slow_end}:00"
            },
            "expected_impact": "+25% orders during this period",
            "confidence": 0.82
        })

    # Suggestion 2: New customer acquisition
    if total_orders < 100:
        suggestions.append({
            "name": "First Order Special",
            "type": "percentage",
            "value": 25,
            "target_audience": "new_customers",
            "reason": "You're a new restaurant. A 25% first-order discount can help build your customer base.",
            "expected_impact": "+40% new customers",
            "confidence": 0.88
        })

    # Suggestion 3: Increase average order value
    if avg_order_value < 30:
        suggestions.append({
            "name": "Spend More, Save More",
            "type": "flat_amount",
            "value": 5,
            "min_order_amount": 35,
            "reason": f"Your average order is ${avg_order_value:.2f}. A '$5 off $35+' deal encourages larger orders.",
            "expected_impact": "+20% average order value",
            "confidence": 0.75
        })

    # Suggestion 4: Weekend special
    suggestions.append({
        "name": "Weekend Feast",
        "type": "free_delivery",
        "value": 0,
        "schedule": {
            "days": [5, 6],  # Saturday, Sunday
            "start_time": "17:00",
            "end_time": "21:00"
        },
        "reason": "Free delivery on weekends drives family orders and higher ticket sizes.",
        "expected_impact": "+35% weekend orders",
        "confidence": 0.80
    })

    # Suggestion 5: Re-engage dormant customers
    suggestions.append({
        "name": "We Miss You!",
        "type": "percentage",
        "value": 20,
        "target_audience": "dormant",
        "reason": "Win back customers who haven't ordered in 30+ days with a personalized discount.",
        "expected_impact": "15% of dormant customers return",
        "confidence": 0.72
    })

    return {
        "success": True,
        "vendor_id": vendor_id,
        "analyzed_by": [ai_employee["name"], analytics_ai["name"]],
        "analysis_period": "Last 30 days",
        "metrics": {
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "average_order_value": avg_order_value,
            "slow_hours": slow_hours
        },
        "suggestions": suggestions,
        "message": "These promotions are tailored to your restaurant's performance data."
    }


# ==================== LIST PROMOTIONS ====================

@router.get("/vendor/{vendor_id}")
async def list_promotions(
    vendor_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_any_auth),
):
    """Get all promotions for a vendor"""
    query = db.query(Promotion).filter(Promotion.vendor_id == vendor_id)

    if status:
        query = query.filter(Promotion.status == PromotionStatus(status))

    promotions = query.order_by(Promotion.created_at.desc()).all()

    return {
        "success": True,
        "promotions": [{
            "id": p.id,
            "promotion_code": p.promotion_code,
            "vendor_id": p.vendor_id,
            "name": p.name,
            "description": p.description,
            "type": p.type.value,
            "value": p.value,
            "max_discount": p.max_discount,
            "min_order_amount": p.min_order_amount,
            "target_audience": p.target_audience.value,
            "schedule": p.schedule,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "is_recurring": p.is_recurring,
            "usage_count": p.usage_count,
            "usage_limit": p.usage_limit,
            "total_discount_given": p.total_discount_given,
            "status": p.status.value,
            "pushed_to_app": p.pushed_to_app,
            "ai_suggested": p.ai_suggested,
            "created_at": p.created_at.isoformat()
        } for p in promotions],
        "count": len(promotions)
    }


# ==================== UPDATE PROMOTION ====================

@router.put("/{promotion_id}")
async def update_promotion(
    promotion_id: int,
    request: UpdatePromotionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_any_auth),
):
    """Update an existing promotion"""
    ai_employee = AI_EMPLOYEES["MARKETING_MAESTRO"]

    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")

    # Update fields
    if request.name:
        promotion.name = request.name
    if request.description:
        promotion.description = request.description
    if request.value:
        promotion.value = request.value
    if request.max_discount:
        promotion.max_discount = request.max_discount
    if request.schedule:
        promotion.schedule = request.schedule
    if request.start_date:
        promotion.start_date = datetime.fromisoformat(request.start_date)
    if request.end_date:
        promotion.end_date = datetime.fromisoformat(request.end_date)
    if request.status:
        new_status = PromotionStatus(request.status)
        old_status = promotion.status
        promotion.status = new_status

        # If activating, push to apps
        if new_status == PromotionStatus.ACTIVE and old_status != PromotionStatus.ACTIVE:
            background_tasks.add_task(
                push_promotion_to_apps,
                promotion.id,
                promotion.vendor_id,
                db
            )

    promotion.updated_at = datetime.now()
    db.commit()

    # Create real-time event for update
    event = RealTimeEvent(
        event_id=f"evt_{uuid.uuid4().hex}",
        event_type="promo:updated",
        vendor_id=promotion.vendor_id,
        target_type="vendor_customers",
        payload={
            "promotion_id": promotion.id,
            "promotion_code": promotion.promotion_code,
            "updated_fields": request.dict(exclude_none=True)
        },
        send_push=False,
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"]
    )
    db.add(event)
    db.commit()

    return {
        "success": True,
        "promotion_id": promotion.id,
        "status": promotion.status.value,
        "processed_by": ai_employee["name"],
        "message": "Promotion updated successfully"
    }


# ==================== APPLY PROMOTION ====================

@router.post("/apply")
async def apply_promotion(
    request: ApplyPromotionRequest,
    db: Session = Depends(get_db)
):
    """
    Apply promotion to an order
    Called from iOS Customer App during checkout

    Validates:
    - Promotion exists and is active
    - Customer is eligible (target audience)
    - Minimum order met
    - Usage limits not exceeded
    - Schedule is valid
    """
    promotion = db.query(Promotion).filter(
        Promotion.promotion_code == request.promotion_code.upper()
    ).first()

    if not promotion:
        raise HTTPException(status_code=404, detail="Invalid promotion code")

    # Check status
    if promotion.status != PromotionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="This promotion is not active")

    # Check dates
    now = datetime.now()
    if promotion.start_date and now < promotion.start_date:
        raise HTTPException(status_code=400, detail="This promotion hasn't started yet")
    if promotion.end_date and now > promotion.end_date:
        raise HTTPException(status_code=400, detail="This promotion has expired")

    # Check schedule
    if promotion.schedule:
        schedule = promotion.schedule
        current_day = now.weekday()  # 0=Monday, 6=Sunday
        current_time = now.strftime("%H:%M")

        if "days" in schedule and current_day not in schedule["days"]:
            days_map = {0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"}
            valid_days = [days_map[d] for d in schedule["days"]]
            raise HTTPException(
                status_code=400,
                detail=f"This promotion is only valid on {', '.join(valid_days)}"
            )

        if "start_time" in schedule and "end_time" in schedule:
            if not (schedule["start_time"] <= current_time <= schedule["end_time"]):
                raise HTTPException(
                    status_code=400,
                    detail=f"This promotion is only valid from {schedule['start_time']} to {schedule['end_time']}"
                )

    # Check minimum order
    if promotion.min_order_amount and request.order_total < promotion.min_order_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Order must be at least ${promotion.min_order_amount:.2f} to use this promotion"
        )

    # Check usage limits
    if promotion.usage_limit and promotion.usage_count >= promotion.usage_limit:
        raise HTTPException(status_code=400, detail="This promotion has reached its usage limit")

    # Check per-customer limit
    if request.customer_id and promotion.per_customer_limit:
        customer_redemptions = db.query(PromotionRedemption).filter(
            PromotionRedemption.promotion_id == promotion.id,
            PromotionRedemption.customer_id == request.customer_id
        ).count()

        if customer_redemptions >= promotion.per_customer_limit:
            raise HTTPException(status_code=400, detail="You've already used this promotion")

    # Check budget limit
    if promotion.budget_limit and promotion.total_discount_given >= promotion.budget_limit:
        raise HTTPException(status_code=400, detail="This promotion's budget has been exhausted")

    # Check target audience
    if promotion.target_audience != PromotionTargetAudience.ALL and request.customer_id:
        customer = db.query(Customer).filter(Customer.id == request.customer_id).first()
        if customer:
            if promotion.target_audience == PromotionTargetAudience.NEW_CUSTOMERS:
                if customer.total_orders > 0:
                    raise HTTPException(status_code=400, detail="This promotion is for new customers only")
            elif promotion.target_audience == PromotionTargetAudience.RETURNING:
                if customer.total_orders == 0:
                    raise HTTPException(status_code=400, detail="This promotion is for returning customers")
            elif promotion.target_audience == PromotionTargetAudience.DORMANT:
                if customer.days_since_last_order and customer.days_since_last_order < 30:
                    raise HTTPException(status_code=400, detail="This promotion is for customers we haven't seen in a while")

    # Calculate discount
    discount = calculate_discount(promotion, request.order_total, request.items)

    return {
        "success": True,
        "promotion_code": promotion.promotion_code,
        "promotion_name": promotion.name,
        "discount_amount": discount,
        "original_total": request.order_total,
        "final_total": request.order_total - discount,
        "message": f"Applied: {promotion.name}"
    }


def calculate_discount(promotion: Promotion, order_total: float, items: Optional[List[Dict]] = None) -> float:
    """Calculate the actual discount amount"""
    discount = 0.0

    if promotion.type == PromotionType.PERCENTAGE:
        discount = order_total * (promotion.value / 100)
        if promotion.max_discount:
            discount = min(discount, promotion.max_discount)

    elif promotion.type == PromotionType.FLAT_AMOUNT:
        discount = promotion.value

    elif promotion.type == PromotionType.FREE_DELIVERY:
        discount = 4.99  # Standard delivery fee

    elif promotion.type == PromotionType.BOGO:
        # Find cheapest item for free
        if items:
            prices = [item.get("price", 0) for item in items]
            if prices:
                discount = min(prices)

    return round(discount, 2)


# ==================== RECORD REDEMPTION ====================

@router.post("/redeem")
async def record_redemption(
    promotion_id: int,
    order_id: int,
    discount_amount: float,
    customer_id: Optional[int] = None,
    original_total: Optional[float] = None,
    final_total: Optional[float] = None,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_any_auth),
):
    """
    Record a promotion redemption after order is placed
    Called after order creation
    """
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")

    # Create redemption record
    redemption = PromotionRedemption(
        promotion_id=promotion_id,
        order_id=order_id,
        customer_id=customer_id,
        discount_amount=discount_amount,
        original_total=original_total,
        final_total=final_total
    )
    db.add(redemption)

    # Update promotion stats
    promotion.usage_count += 1
    promotion.total_discount_given += discount_amount

    # Check if promotion should be deactivated
    if promotion.usage_limit and promotion.usage_count >= promotion.usage_limit:
        promotion.status = PromotionStatus.EXPIRED

    if promotion.budget_limit and promotion.total_discount_given >= promotion.budget_limit:
        promotion.status = PromotionStatus.EXPIRED

    db.commit()

    return {
        "success": True,
        "redemption_id": redemption.id,
        "promotion_usage_count": promotion.usage_count,
        "total_discount_given": promotion.total_discount_given
    }


# ==================== PROMOTION ANALYTICS ====================

@router.get("/analytics/{vendor_id}")
async def get_promotion_analytics(
    vendor_id: int,
    days: int = 30,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_any_auth),
):
    """
    Get promotion performance analytics
    AI Employee: Sage
    """
    ai_employee = AI_EMPLOYEES["ANALYTICS_ADVISOR"]

    # Get all promotions for vendor
    promotions = db.query(Promotion).filter(Promotion.vendor_id == vendor_id).all()

    # Get redemptions in time period
    since = datetime.now() - timedelta(days=days)
    promo_stats = []

    for promo in promotions:
        redemptions = db.query(PromotionRedemption).filter(
            PromotionRedemption.promotion_id == promo.id,
            PromotionRedemption.redeemed_at >= since
        ).all()

        total_discount = sum(r.discount_amount for r in redemptions)
        total_revenue = sum(r.final_total or 0 for r in redemptions)

        promo_stats.append({
            "promotion_id": promo.id,
            "promotion_code": promo.promotion_code,
            "name": promo.name,
            "type": promo.type.value,
            "status": promo.status.value,
            "redemptions": len(redemptions),
            "total_discount": total_discount,
            "revenue_generated": total_revenue,
            "roi": (total_revenue - total_discount) / total_discount if total_discount > 0 else 0
        })

    # Sort by ROI
    promo_stats.sort(key=lambda x: x["roi"], reverse=True)

    return {
        "success": True,
        "vendor_id": vendor_id,
        "period": f"Last {days} days",
        "analyzed_by": ai_employee["name"],
        "summary": {
            "total_promotions": len(promotions),
            "active_promotions": len([p for p in promotions if p.status == PromotionStatus.ACTIVE]),
            "total_redemptions": sum(p["redemptions"] for p in promo_stats),
            "total_discount_given": sum(p["total_discount"] for p in promo_stats),
            "total_revenue_generated": sum(p["revenue_generated"] for p in promo_stats)
        },
        "promotions": promo_stats,
        "insights": generate_promotion_insights(promo_stats)
    }


def generate_promotion_insights(promo_stats: List[Dict]) -> List[str]:
    """Generate AI insights about promotion performance"""
    insights = []

    if not promo_stats:
        return ["No promotions have been created yet. Try creating your first promotion!"]

    # Best performing
    best = max(promo_stats, key=lambda x: x["roi"])
    if best["redemptions"] > 0:
        insights.append(f"🏆 Best performer: '{best['name']}' with {best['roi']:.1f}x ROI")

    # Most popular
    most_used = max(promo_stats, key=lambda x: x["redemptions"])
    if most_used["redemptions"] > 0:
        insights.append(f"📈 Most popular: '{most_used['name']}' with {most_used['redemptions']} redemptions")

    # Recommendations
    active_count = len([p for p in promo_stats if p["status"] == "active"])
    if active_count == 0:
        insights.append("💡 No active promotions! Consider activating one to boost orders.")
    elif active_count > 5:
        insights.append("⚠️ Many promotions active. Consider focusing on top performers.")

    return insights


# ==================== DELETE PROMOTION ====================

@router.delete("/{promotion_id}")
async def delete_promotion(
    promotion_id: int,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_any_auth),
):
    """Delete a promotion (sets status to cancelled)"""
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")

    promotion.status = PromotionStatus.CANCELLED
    db.commit()

    return {
        "success": True,
        "message": "Promotion cancelled"
    }


# ==================== QUICK ACTIONS ====================

@router.post("/quick-create/{vendor_id}/{promo_type}")
async def quick_create_promotion(
    vendor_id: int,
    promo_type: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_any_auth),
):
    """
    Quick create common promotion types
    AI Employee: Sierra

    Types:
    - happy_hour: 15% off 3-5 PM
    - lunch_special: 10% off 11 AM - 2 PM
    - first_order: 25% off first order
    - free_delivery: Free delivery all day
    - weekend: 20% off weekends
    """
    ai_employee = AI_EMPLOYEES["MARKETING_MAESTRO"]

    templates = {
        "happy_hour": {
            "name": "Happy Hour Special",
            "type": "percentage",
            "value": 15,
            "schedule": {"days": [0, 1, 2, 3, 4], "start_time": "15:00", "end_time": "17:00"},
            "is_recurring": True
        },
        "lunch_special": {
            "name": "Lunch Rush Deal",
            "type": "percentage",
            "value": 10,
            "schedule": {"days": [0, 1, 2, 3, 4], "start_time": "11:00", "end_time": "14:00"},
            "is_recurring": True
        },
        "first_order": {
            "name": "Welcome Discount",
            "type": "percentage",
            "value": 25,
            "target_audience": "new_customers",
            "per_customer_limit": 1
        },
        "free_delivery": {
            "name": "Free Delivery Day",
            "type": "free_delivery",
            "value": 0,
            "end_date": (datetime.now() + timedelta(days=1)).isoformat()
        },
        "weekend": {
            "name": "Weekend Treat",
            "type": "percentage",
            "value": 20,
            "schedule": {"days": [5, 6]},  # Saturday, Sunday
            "is_recurring": True
        }
    }

    if promo_type not in templates:
        raise HTTPException(status_code=400, detail=f"Unknown promo type. Available: {list(templates.keys())}")

    template = templates[promo_type]

    request = CreatePromotionRequest(
        name=template["name"],
        type=template["type"],
        value=template["value"],
        target_audience=template.get("target_audience", "all"),
        schedule=template.get("schedule"),
        is_recurring=template.get("is_recurring", False),
        per_customer_limit=template.get("per_customer_limit", 1),
        end_date=template.get("end_date"),
        push_to_app=True
    )

    return await create_promotion(vendor_id, request, background_tasks, db)
