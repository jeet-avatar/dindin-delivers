#!/usr/bin/env python3
"""
Seed departments, team members, and assignment rules into the project tracker.

This script populates the INITIAL configuration. Once seeded, all departments,
members, and rules are managed via the admin UI — no hardcoded values at runtime.

Usage:
  cd apps/web/p2p-platform/backend
  DATABASE_URL=postgresql://... JWT_SECRET_KEY=test ADMIN_SECRET_KEY=test \
    python scripts/seed_departments.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from database import SessionLocal
from project_tracker import Department, TeamMember, AssignmentRule, ProjectCase
from sqlalchemy import func
import re


# ==================== Department Definitions ====================
# These are SEED data only. After initial run, manage via admin UI.

DEPARTMENTS = [
    {
        "code": "backend-platform",
        "name": "Backend Platform",
        "description": "Core API, models, authentication, security, configuration, email, image services",
        "color": "#3b82f6",
        "lead_name": "Backend Lead",
        "lead_email": "backend-lead@dollor.ai",
    },
    {
        "code": "payments-pricing",
        "name": "Payments & Pricing",
        "description": "Stripe integration, fare calculation, payment safety, order disputes",
        "color": "#10b981",
        "lead_name": "Payments Lead",
        "lead_email": "payments-lead@dollor.ai",
    },
    {
        "code": "order-delivery",
        "name": "Order & Delivery",
        "description": "Order lifecycle, delivery flow, restaurant management, menu service",
        "color": "#f59e0b",
        "lead_name": "Order Lead",
        "lead_email": "order-lead@dollor.ai",
    },
    {
        "code": "rideshare",
        "name": "Rideshare",
        "description": "Ride requests, bidding, driver matching, ride lifecycle",
        "color": "#8b5cf6",
        "lead_name": "Rideshare Lead",
        "lead_email": "rideshare-lead@dollor.ai",
    },
    {
        "code": "customer-exp",
        "name": "Customer Experience",
        "description": "Customer iOS and Android apps, customer UI wiring, cross-platform tests",
        "color": "#ec4899",
        "lead_name": "Customer Lead",
        "lead_email": "customer-lead@dollor.ai",
    },
    {
        "code": "driver-exp",
        "name": "Driver Experience",
        "description": "Driver iOS and Android apps, location tracking, proximity detection",
        "color": "#06b6d4",
        "lead_name": "Driver Lead",
        "lead_email": "driver-lead@dollor.ai",
    },
    {
        "code": "vendor-exp",
        "name": "Vendor Experience",
        "description": "Restaurant/partner apps, vendor endpoints, document verification",
        "color": "#f97316",
        "lead_name": "Vendor Lead",
        "lead_email": "vendor-lead@dollor.ai",
    },
    {
        "code": "realtime-comms",
        "name": "Real-time & Communications",
        "description": "WebSocket events, notifications, chat, voice agent, support",
        "color": "#14b8a6",
        "lead_name": "Comms Lead",
        "lead_email": "comms-lead@dollor.ai",
    },
    {
        "code": "analytics-reporting",
        "name": "Analytics & Reporting",
        "description": "Analytics, promotions, ratings, admin portal frontend",
        "color": "#a855f7",
        "lead_name": "Analytics Lead",
        "lead_email": "analytics-lead@dollor.ai",
    },
    {
        "code": "platform-infra",
        "name": "Platform Infrastructure",
        "description": "Auth service, user service, iOS API contracts, shared libraries, wave tests",
        "color": "#64748b",
        "lead_name": "Infra Lead",
        "lead_email": "infra-lead@dollor.ai",
    },
]


# ==================== Assignment Rules ====================
# format: (department_code, match_field, match_pattern, priority)
# These become DB rows — the auto-assign engine reads them at runtime.

RULES = [
    # Backend Platform (priority 10-19)
    ("backend-platform", "category", "^test_models$", 10),
    ("backend-platform", "category", "^test_endpoints$", 10),
    ("backend-platform", "category", "^test_auth_endpoints$", 10),
    ("backend-platform", "category", "^test_security_helpers$", 10),
    ("backend-platform", "category", "^test_api_config$", 10),
    ("backend-platform", "category", "^test_file_upload_security$", 10),
    ("backend-platform", "category", "^test_email_service$", 10),
    ("backend-platform", "category", "^test_image_service$", 10),
    ("backend-platform", "category", "^test_smoke$", 10),
    ("backend-platform", "category", "^test_project_tracker$", 10),

    # Payments & Pricing (priority 20-29)
    ("payments-pricing", "category", "^test_stripe_integration$", 20),
    ("payments-pricing", "category", "^test_dollor_pricing_model$", 20),
    ("payments-pricing", "category", "^test_payment_safety$", 20),
    ("payments-pricing", "category", "^test_order_disputes$", 20),
    ("payments-pricing", "category", "^pricing-service$", 20),
    ("payments-pricing", "category", "^payment-service$", 20),

    # Order & Delivery (priority 30-39)
    ("order-delivery", "category", "^test_order_flow$", 30),
    ("order-delivery", "category", "^test_order_chat$", 30),
    ("order-delivery", "category", "^test_delivery_no_customer$", 30),
    ("order-delivery", "category", "^test_approval_to_publish_flow$", 30),
    ("order-delivery", "category", "^test_android_restaurant_e2e_workflow$", 30),
    ("order-delivery", "category", "^order-service$", 30),
    ("order-delivery", "category", "^menu-service$", 30),
    ("order-delivery", "category", "^restaurant-service$", 30),

    # Rideshare (priority 40-49)
    ("rideshare", "category", "^test_rideshare", 40),
    ("rideshare", "category", "^ride-service$", 40),
    ("rideshare", "category", "^negotiation-service$", 40),

    # Customer Experience (priority 50-59)
    ("customer-exp", "category", "^customer$", 50),
    ("customer-exp", "category", "^test_customer_ui_wiring_e2e$", 50),
    ("customer-exp", "category", "^test_cross_platform$", 50),
    ("customer-exp", "category", "^test_address_validation$", 50),

    # Driver Experience (priority 60-69)
    ("driver-exp", "category", "^driver$", 60),
    ("driver-exp", "category", "^test_driver_endpoints$", 60),
    ("driver-exp", "category", "^test_driver_proximity$", 60),
    ("driver-exp", "category", "^test_stale_driver_reassignment$", 60),
    ("driver-exp", "category", "^driver-service$", 60),
    ("driver-exp", "category", "^location-service$", 60),
    ("driver-exp", "category", "^test_driver_vendor_ui_wiring_e2e$", 60),

    # Vendor Experience (priority 70-79)
    ("vendor-exp", "category", "^restaurant$", 70),
    ("vendor-exp", "category", "^partner$", 70),
    ("vendor-exp", "category", "^test_vendor_endpoints$", 70),
    ("vendor-exp", "category", "^test_document_verification$", 70),
    ("vendor-exp", "category", "^test_document_save_flow$", 70),

    # Real-time & Comms (priority 80-89)
    ("realtime-comms", "category", "^test_realtime_events$", 80),
    ("realtime-comms", "category", "^test_support_chat$", 80),
    ("realtime-comms", "category", "^test_voice_agent$", 80),
    ("realtime-comms", "category", "^notification-service$", 80),
    ("realtime-comms", "category", "^chat-service$", 80),
    ("realtime-comms", "category", "^call-service$", 80),

    # Analytics & Reporting (priority 90-99)
    ("analytics-reporting", "category", "^test_promotions$", 90),
    ("analytics-reporting", "category", "^analytics-service$", 90),
    ("analytics-reporting", "category", "^rating-service$", 90),
    ("analytics-reporting", "category", "^admin-portal$", 90),

    # Platform Infrastructure (priority 100-109) — catch-all for remaining
    ("platform-infra", "category", "^auth-service$", 100),
    ("platform-infra", "category", "^user-service$", 100),
    ("platform-infra", "category", "^test_ios_api_contracts$", 100),
    ("platform-infra", "category", "^test_wave", 100),
    ("platform-infra", "category", "^test_critical_flows$", 100),
    ("platform-infra", "category", "^shared$", 100),
    ("platform-infra", "category", "^eatfair-ios-shared$", 100),
]


def seed_departments_and_rules():
    db = SessionLocal()
    try:
        # Create departments
        dept_map = {}
        created_depts = 0
        skipped_depts = 0
        for dept_data in DEPARTMENTS:
            existing = db.query(Department).filter(Department.code == dept_data["code"]).first()
            if existing:
                dept_map[dept_data["code"]] = existing.id
                skipped_depts += 1
            else:
                dept = Department(**dept_data)
                db.add(dept)
                db.flush()
                dept_map[dept_data["code"]] = dept.id
                created_depts += 1

        print(f"Departments: {created_depts} created, {skipped_depts} already exist")

        # Create assignment rules
        created_rules = 0
        skipped_rules = 0
        for dept_code, match_field, match_pattern, priority in RULES:
            dept_id = dept_map.get(dept_code)
            if not dept_id:
                print(f"  WARNING: department '{dept_code}' not found, skipping rule")
                continue
            existing = (
                db.query(AssignmentRule)
                .filter(
                    AssignmentRule.department_id == dept_id,
                    AssignmentRule.match_field == match_field,
                    AssignmentRule.match_pattern == match_pattern,
                )
                .first()
            )
            if existing:
                skipped_rules += 1
            else:
                rule = AssignmentRule(
                    department_id=dept_id, match_field=match_field,
                    match_pattern=match_pattern, priority=priority,
                )
                db.add(rule)
                created_rules += 1

        db.commit()
        print(f"Rules: {created_rules} created, {skipped_rules} already exist")

        # Auto-assign all unassigned cases
        rules = db.query(AssignmentRule).order_by(AssignmentRule.priority, AssignmentRule.id).all()
        unassigned = db.query(ProjectCase).filter(ProjectCase.department_id.is_(None)).all()
        assigned_count = 0
        dept_counts = {}

        for case in unassigned:
            for rule in rules:
                field_value = getattr(case, rule.match_field, None) or ""
                try:
                    if re.search(rule.match_pattern, field_value, re.IGNORECASE):
                        case.department_id = rule.department_id
                        assigned_count += 1
                        dept_name = dept_data_by_id(dept_map, rule.department_id)
                        dept_counts[dept_name] = dept_counts.get(dept_name, 0) + 1
                        break
                except re.error:
                    if rule.match_pattern.lower() == field_value.lower():
                        case.department_id = rule.department_id
                        assigned_count += 1
                        dept_name = dept_data_by_id(dept_map, rule.department_id)
                        dept_counts[dept_name] = dept_counts.get(dept_name, 0) + 1
                        break

        db.commit()

        total = db.query(func.count(ProjectCase.id)).scalar()
        still_unassigned = db.query(func.count(ProjectCase.id)).filter(ProjectCase.department_id.is_(None)).scalar()

        print(f"\nAuto-assign results:")
        print(f"  Assigned: {assigned_count}")
        print(f"  Total cases: {total}")
        print(f"  Still unassigned: {still_unassigned}")
        print(f"\n  Per department:")
        for name, count in sorted(dept_counts.items(), key=lambda x: -x[1]):
            print(f"    {name:35s}: {count}")

    finally:
        db.close()


def dept_data_by_id(dept_map, dept_id):
    """Reverse lookup: dept_id -> dept_code."""
    for code, did in dept_map.items():
        if did == dept_id:
            return code
    return f"dept-{dept_id}"


if __name__ == "__main__":
    seed_departments_and_rules()
