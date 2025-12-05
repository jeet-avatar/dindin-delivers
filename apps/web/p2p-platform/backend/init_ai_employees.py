"""
Initialize AI Employees for EatFair Platform
This script creates the 5 AI employees that run the automated delivery operations.
"""

from database import SessionLocal, engine
from models import Base, AIEmployee, AIEmployeeStatus
from datetime import datetime
import json

# Define the 5 EatFair AI Employees
AI_EMPLOYEES = [
    {
        "employee_id": "AI_EMP_001",
        "name": "OrderBot Alpha",
        "role": "order_orchestrator",
        "department": "logistics",
        "avatar": "🤖",
        "config_json": json.dumps({
            "responsibilities": [
                "Order validation & creation",
                "Real-time pricing calculation",
                "Tax & fee computation (9% CA tax, $4.99 delivery, $1 platform fee)",
                "Stripe payment processing",
                "Restaurant order routing",
                "Customer notification management"
            ],
            "metrics_tracked": [
                "orders_processed",
                "total_order_value",
                "payment_success_rate",
                "avg_order_processing_time"
            ],
            "alert_thresholds": {
                "payment_failure_rate": 5,  # Alert if >5%
                "processing_time_seconds": 10  # Alert if >10s
            }
        })
    },
    {
        "employee_id": "AI_EMP_002",
        "name": "KitchenBot Beta",
        "role": "fulfillment_coordinator",
        "department": "fulfillment",
        "avatar": "👨‍🍳",
        "config_json": json.dumps({
            "responsibilities": [
                "Restaurant order management",
                "Prep time estimation",
                "Kitchen queue optimization",
                "Menu availability tracking",
                "Quality control monitoring",
                "Special instructions handling"
            ],
            "metrics_tracked": [
                "orders_sent_to_kitchen",
                "avg_prep_time_minutes",
                "kitchen_delays",
                "order_accuracy_rate"
            ],
            "alert_thresholds": {
                "prep_time_minutes": 25,  # Alert if >25min
                "accuracy_rate": 95  # Alert if <95%
            }
        })
    },
    {
        "employee_id": "AI_EMP_003",
        "name": "DispatchBot Gamma",
        "role": "dispatch_commander",
        "department": "fleet",
        "avatar": "🚗",
        "config_json": json.dumps({
            "responsibilities": [
                "Smart driver assignment",
                "Real-time GPS tracking",
                "Route optimization",
                "ETA calculation",
                "Driver communication",
                "Delivery confirmation with photo proof"
            ],
            "metrics_tracked": [
                "deliveries_dispatched",
                "avg_delivery_time_minutes",
                "driver_utilization_rate",
                "on_time_delivery_rate"
            ],
            "alert_thresholds": {
                "delivery_time_minutes": 45,  # Alert if >45min
                "on_time_rate": 90  # Alert if <90%
            }
        })
    },
    {
        "employee_id": "AI_EMP_004",
        "name": "LedgerBot Delta",
        "role": "finance_controller",
        "department": "finance",
        "avatar": "📊",
        "config_json": json.dumps({
            "responsibilities": [
                "Double-entry journal creation",
                "Automated payout calculation",
                "Tax collection & reporting (9% CA)",
                "Revenue recognition",
                "Vendor payment processing",
                "Driver payout management ($4.99 + tips)"
            ],
            "metrics_tracked": [
                "journal_entries_created",
                "total_debits",
                "total_credits",
                "platform_revenue",
                "tax_collected",
                "pending_payouts"
            ],
            "alert_thresholds": {
                "unbalanced_entries": 1,  # Alert if any
                "reconciliation_difference": 0.01  # Alert if >$0.01
            }
        })
    },
    {
        "employee_id": "AI_EMP_005",
        "name": "QualityBot Epsilon",
        "role": "quality_sentinel",
        "department": "quality",
        "avatar": "⭐",
        "config_json": json.dumps({
            "responsibilities": [
                "Customer satisfaction tracking",
                "Complaint resolution",
                "Restaurant performance monitoring",
                "Driver rating management",
                "Issue escalation",
                "Quality scorecards"
            ],
            "metrics_tracked": [
                "reviews_processed",
                "complaints_handled",
                "avg_customer_rating",
                "nps_score",
                "refund_rate"
            ],
            "alert_thresholds": {
                "avg_rating": 4.0,  # Alert if <4.0
                "complaint_rate": 5,  # Alert if >5%
                "refund_rate": 2  # Alert if >2%
            }
        })
    },
    {
        "employee_id": "AI_EMP_006",
        "name": "Vibing",
        "role": "food_image_manager",
        "department": "content",
        "avatar": "📸",
        "config_json": json.dumps({
            "responsibilities": [
                "AI food image generation (DALL-E, Stability AI)",
                "Restaurant website image scraping",
                "Image quality scoring & validation",
                "Smart stock image assignment",
                "Vendor image upload assistance",
                "Image optimization & CDN delivery",
                "Bundle/combo image composition",
                "Image performance analytics"
            ],
            "metrics_tracked": [
                "images_generated",
                "images_scraped",
                "stock_images_assigned",
                "vendor_uploads",
                "avg_quality_score",
                "conversion_rate_by_image"
            ],
            "alert_thresholds": {
                "quality_score": 60,  # Alert if avg <60
                "generation_failure_rate": 5,  # Alert if >5%
                "missing_images": 10  # Alert if >10 items without images
            },
            "image_sources": {
                "ai_generation": ["dall-e-3", "stability-ai"],
                "stock": "unsplash",
                "scraping": True,
                "vendor_upload": True
            },
            "quality_thresholds": {
                "excellent": 80,
                "acceptable": 60,
                "poor": 40
            }
        })
    }
]


def init_ai_employees():
    """Initialize AI Employees in the database"""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        created_count = 0
        updated_count = 0

        for emp_data in AI_EMPLOYEES:
            # Check if employee already exists
            existing = db.query(AIEmployee).filter(
                AIEmployee.employee_id == emp_data["employee_id"]
            ).first()

            if existing:
                # Update existing employee
                existing.name = emp_data["name"]
                existing.role = emp_data["role"]
                existing.department = emp_data["department"]
                existing.avatar = emp_data["avatar"]
                existing.config_json = emp_data["config_json"]
                existing.updated_at = datetime.utcnow()
                updated_count += 1
                print(f"✅ Updated: {emp_data['avatar']} {emp_data['name']}")
            else:
                # Create new employee
                new_employee = AIEmployee(
                    employee_id=emp_data["employee_id"],
                    name=emp_data["name"],
                    role=emp_data["role"],
                    department=emp_data["department"],
                    avatar=emp_data["avatar"],
                    config_json=emp_data["config_json"],
                    status=AIEmployeeStatus.ACTIVE,
                    is_online=True,
                    session_start=datetime.utcnow()
                )
                db.add(new_employee)
                created_count += 1
                print(f"✅ Created: {emp_data['avatar']} {emp_data['name']}")

        db.commit()

        print(f"\n{'='*50}")
        print(f"AI Employee Initialization Complete!")
        print(f"{'='*50}")
        print(f"Created: {created_count}")
        print(f"Updated: {updated_count}")
        print(f"Total AI Employees: {len(AI_EMPLOYEES)}")

        # List all AI Employees
        print(f"\n{'='*50}")
        print("AI Employee Roster:")
        print(f"{'='*50}")

        all_employees = db.query(AIEmployee).all()
        for emp in all_employees:
            status_emoji = "🟢" if emp.is_online else "🔴"
            print(f"{status_emoji} {emp.avatar} {emp.name} ({emp.employee_id})")
            print(f"   Role: {emp.role} | Dept: {emp.department}")
            print(f"   Tasks Completed: {emp.total_tasks_completed} | Success Rate: {emp.success_rate}%")
            print()

    except Exception as e:
        db.rollback()
        print(f"❌ Error initializing AI employees: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🤖 Initializing EatFair AI Employees...")
    print()
    init_ai_employees()
