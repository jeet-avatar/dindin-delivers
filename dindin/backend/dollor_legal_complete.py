"""
DOLLOR.AI - COMPLETE LEGAL & COMPLIANCE FRAMEWORK
==================================================

This module contains all legal documents, terms, and compliance
requirements for App Store approval and regulatory compliance.

APPLE APP STORE REQUIREMENTS ADDRESSED:
- Guideline 3.1.1: In-App Purchases (physical services exemption)
- Guideline 5.1.1: Data Collection and Storage (Privacy Policy)
- Guideline 5.1.2: Data Use and Sharing
- Guideline 5.6: Developer Code of Conduct
- Account Deletion Requirement (effective 2022)

LEGAL FRAMEWORKS:
- Section 230 of Communications Decency Act (platform immunity)
- California Consumer Privacy Act (CCPA)
- General Data Protection Regulation (GDPR) - for EU users
- ABC Test (California AB5) - worker classification
- IRS Independent Contractor Guidelines
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/legal", tags=["Legal & Compliance"])


# =============================================================================
# ORDER NUMBERING SYSTEM - STANDARDIZED ACROSS PLATFORM
# =============================================================================

class OrderNumberingSystem:
    """
    Standardized Order Numbering System for Dollor.ai

    Format: [SERVICE]-[REGION]-[DATE]-[SEQUENCE]

    Examples:
    - DLV-SF-20241210-00001 (Delivery, San Francisco, Dec 10 2024, order #1)
    - RID-LA-20241210-00042 (Ride, Los Angeles, Dec 10 2024, order #42)
    - FRD-NY-20241210-00003 (Food Order, New York, Dec 10 2024, order #3)

    Prefixes:
    - DLV: Delivery (P2P delivery requests)
    - RID: Rideshare (P2P ride requests)
    - FRD: Food Order (Restaurant food orders)
    - TXN: Transaction (Payment transactions)
    - TKT: Ticket (Support tickets)
    - USR: User (User IDs)
    - DRV: Driver (Driver IDs)
    - RST: Restaurant (Restaurant IDs)
    """

    PREFIXES = {
        "delivery": "DLV",
        "ride": "RID",
        "food_order": "FRD",
        "transaction": "TXN",
        "ticket": "TKT",
        "user": "USR",
        "driver": "DRV",
        "restaurant": "RST",
    }

    REGIONS = {
        "san_francisco": "SF",
        "los_angeles": "LA",
        "new_york": "NY",
        "chicago": "CHI",
        "miami": "MIA",
        "seattle": "SEA",
        "austin": "AUS",
        "denver": "DEN",
        "boston": "BOS",
        "default": "US",
    }

    @staticmethod
    def generate(service_type: str, region: str = "default") -> str:
        prefix = OrderNumberingSystem.PREFIXES.get(service_type, "ORD")
        region_code = OrderNumberingSystem.REGIONS.get(region, "US")
        date_str = datetime.utcnow().strftime("%Y%m%d")
        sequence = uuid.uuid4().hex[:5].upper()
        return f"{prefix}-{region_code}-{date_str}-{sequence}"


# =============================================================================
# AI BOTS DOCUMENTATION
# =============================================================================

AI_BOTS = {
    "customer_support_bot": {
        "name": "ARIA (AI Response & Inquiry Assistant)",
        "function": "Handles customer inquiries, order status, refund requests",
        "capabilities": [
            "24/7 customer support via chat",
            "Order tracking and status updates",
            "Refund request processing",
            "FAQ responses",
            "Escalation to human support when needed",
        ],
        "data_access": ["Order history", "User profile", "Support tickets"],
        "limitations": ["Cannot process payments directly", "Cannot modify user accounts"],
    },

    "driver_dispatch_bot": {
        "name": "DASH (Delivery Assignment & Scheduling Helper)",
        "function": "Optimizes driver assignments and delivery routing",
        "capabilities": [
            "Real-time delivery matching",
            "Route optimization",
            "Driver availability monitoring",
            "Surge pricing calculations",
            "ETA predictions",
        ],
        "data_access": ["Driver locations", "Order queue", "Traffic data"],
        "limitations": ["Recommendations only - drivers choose to accept"],
    },

    "fraud_detection_bot": {
        "name": "SHIELD (Security & Hazard Identification Engine for Legitimate Deliveries)",
        "function": "Detects and prevents fraudulent activities",
        "capabilities": [
            "Payment fraud detection",
            "Account anomaly detection",
            "Multi-account prevention",
            "Chargeback prediction",
            "Risk scoring",
        ],
        "data_access": ["Transaction patterns", "Device fingerprints", "IP addresses"],
        "limitations": ["Flags for review - humans make final decisions"],
    },

    "pricing_bot": {
        "name": "FAIR (Fee & Amount Intelligent Recommender)",
        "function": "Calculates fair pricing for deliveries and rides",
        "capabilities": [
            "Distance-based pricing",
            "Time-based adjustments",
            "Demand surge calculations",
            "Weather impact pricing",
            "Driver earnings optimization",
        ],
        "data_access": ["Market rates", "Distance/time data", "Historical pricing"],
        "limitations": ["Suggestions only - users set final amounts"],
    },

    "restaurant_ops_bot": {
        "name": "RESTO (Restaurant Operations & Tracking Optimizer)",
        "function": "Manages restaurant order flow and kitchen timing",
        "capabilities": [
            "Order preparation time estimates",
            "Kitchen queue management",
            "Inventory alerts",
            "Peak hour predictions",
            "Driver arrival coordination",
        ],
        "data_access": ["Restaurant order history", "Preparation times", "Menu data"],
        "limitations": ["Advisory only - restaurants control operations"],
    },

    "driver_onboarding_bot": {
        "name": "GUIDE (Getting Users Into Driving Excellence)",
        "function": "Assists driver registration and verification",
        "capabilities": [
            "Document verification assistance",
            "Background check coordination",
            "Vehicle inspection guidance",
            "Stripe Connect setup help",
            "Platform training",
        ],
        "data_access": ["Driver applications", "Verification status"],
        "limitations": ["Cannot approve drivers - human verification required"],
    },

    "analytics_bot": {
        "name": "INTEL (Insights & Trends for Executive Leadership)",
        "function": "Provides business analytics and insights",
        "capabilities": [
            "Revenue tracking",
            "User growth metrics",
            "Driver performance analytics",
            "Market expansion insights",
            "Competitor analysis",
        ],
        "data_access": ["Aggregated platform data", "Public market data"],
        "limitations": ["Read-only access - no operational changes"],
    },

    "compliance_bot": {
        "name": "COMPLY (Compliance & Legal Monitoring Platform for Legality Yielding)",
        "function": "Monitors regulatory compliance across jurisdictions",
        "capabilities": [
            "Tax reporting assistance",
            "Regulatory change monitoring",
            "License expiration tracking",
            "Policy violation detection",
            "Audit trail maintenance",
        ],
        "data_access": ["Compliance records", "Regulatory databases"],
        "limitations": ["Alerts only - legal team makes decisions"],
    },
}


@router.get("/ai-bots")
async def get_ai_bots_info():
    """
    Returns information about all AI bots powering the Dollor.ai platform.
    Required for transparency and user trust.
    """
    return {
        "total_bots": len(AI_BOTS),
        "bots": AI_BOTS,
        "transparency_statement": """
            Dollor.ai uses AI-powered assistants to enhance user experience
            and platform efficiency. All AI bots operate under human oversight.
            AI recommendations are advisory - final decisions are made by
            users, drivers, restaurants, or human staff as appropriate.

            No AI bot has autonomous decision-making authority over:
            - Payment processing
            - Account termination
            - Driver approval/rejection
            - Dispute resolution
        """,
        "data_protection": """
            All AI bots comply with our Privacy Policy. User data is processed
            only for stated purposes. You can request information about how
            your data is used by AI systems by contacting privacy@dollor.ai.
        """,
    }


# =============================================================================
# COMPREHENSIVE TERMS OF SERVICE
# =============================================================================

@router.get("/terms-of-service")
async def get_full_terms_of_service():
    """
    Complete Terms of Service - App Store Compliant
    Last Updated: December 2024
    """
    return {
        "document_info": {
            "title": "Dollor.ai Terms of Service",
            "version": "3.0",
            "effective_date": "2024-12-10",
            "last_updated": "2024-12-10",
            "jurisdiction": "State of Delaware, United States",
        },

        "section_1_acceptance": {
            "title": "1. ACCEPTANCE OF TERMS",
            "content": """
1.1 Agreement to Terms
By downloading, accessing, or using the Dollor.ai mobile application, website,
or any related services (collectively, the "Platform"), you agree to be bound
by these Terms of Service ("Terms"). If you do not agree to these Terms, do
not use the Platform.

1.2 Age Requirement
You must be at least 18 years old to use the Platform. By using the Platform,
you represent and warrant that you are at least 18 years of age.

1.3 Capacity to Contract
You represent that you have the legal capacity to enter into a binding agreement.
If you are using the Platform on behalf of a business entity, you represent that
you have the authority to bind that entity to these Terms.

1.4 Updates to Terms
We may modify these Terms at any time. We will notify you of material changes
through the Platform or via email. Your continued use after such notification
constitutes acceptance of the modified Terms.
            """,
        },

        "section_2_platform_description": {
            "title": "2. WHAT DOLLOR.AI IS",
            "content": """
2.1 Platform Definition
Dollor.ai is a TECHNOLOGY PLATFORM that provides software tools enabling
users to connect with each other for peer-to-peer services, including but
not limited to:
- Food delivery facilitation
- Rideshare coordination
- Local errands and deliveries

2.2 What We Are NOT
DOLLOR.AI IS NOT:
(a) A delivery company or courier service
(b) A food service provider or restaurant
(c) A transportation company or taxi service
(d) An employer of any service providers ("Helpers")
(e) A party to transactions between users
(f) An insurance provider
(g) A guarantor of any services

2.3 Marketplace Model
We operate as a neutral technology marketplace under Section 230 of the
Communications Decency Act (47 U.S.C. Section 230). We provide the technological
infrastructure for users to connect, but we do not participate in the actual
transactions or services exchanged between users.

2.4 No Agency Relationship
Nothing in these Terms creates any agency, partnership, joint venture,
employment, or franchise relationship between Dollor.ai and any user.
            """,
        },

        "section_3_user_accounts": {
            "title": "3. USER ACCOUNTS",
            "content": """
3.1 Account Creation
To use certain features of the Platform, you must create an account. You agree to:
(a) Provide accurate, current, and complete information
(b) Maintain and update your information to keep it accurate
(c) Maintain the security of your account credentials
(d) Accept responsibility for all activities under your account
(e) Notify us immediately of any unauthorized use

3.2 Account Types
The Platform supports the following account types:
(a) CUSTOMER: Users requesting services (delivery, rides)
(b) HELPER: Users providing services (drivers, delivery persons)
(c) RESTAURANT PARTNER: Food service establishments

3.3 Account Verification
We may require verification of identity, documents, or other information.
Failure to provide requested verification may result in account limitations.

3.4 Account Restrictions
You may not:
(a) Create multiple accounts
(b) Share your account with others
(c) Transfer your account to another person
(d) Use another person's account without permission

3.5 Account Termination
You may delete your account at any time through Settings > Account > Delete Account.
We may suspend or terminate accounts that violate these Terms.
            """,
        },

        "section_4_helper_status": {
            "title": "4. HELPER INDEPENDENT STATUS",
            "content": """
4.1 Independent Status
HELPERS (drivers, delivery persons) ARE NOT EMPLOYEES, AGENTS, OR
CONTRACTORS OF DOLLOR.AI. Helpers are independent individuals who:
(a) Choose when, where, and whether to use the Platform
(b) Are free to use competing platforms simultaneously
(c) Set their own schedule with no minimum requirements
(d) Use their own vehicle, equipment, and supplies
(e) Control the manner and means of performing services
(f) Are responsible for their own expenses (fuel, maintenance, etc.)
(g) Bear their own business risk

4.2 No Employment Relationship
The relationship between Dollor.ai and Helpers is that of independent
business entities. Dollor.ai does not:
(a) Control how Helpers perform services
(b) Require Helpers to wear uniforms or use branded materials
(c) Provide training on how to perform deliveries or rides
(d) Set Helpers' schedules or require minimum hours
(e) Provide employee benefits (health insurance, paid leave, etc.)
(f) Withhold taxes from Helper earnings
(g) Provide workers' compensation insurance

4.3 Customer-Helper Relationship
When a Helper accepts a service request, they enter into a direct arrangement
with the Customer. Dollor.ai is not a party to this arrangement and has no
liability for the services provided or not provided.

4.4 Tax Responsibility
Helpers are solely responsible for:
(a) Reporting all income to relevant tax authorities
(b) Paying all applicable federal, state, and local taxes
(c) Filing appropriate tax returns (1099 forms will be issued where required)
(d) Claiming eligible business deductions (mileage, expenses)

4.5 Insurance Responsibility
Helpers must maintain:
(a) Valid auto insurance meeting state minimum requirements
(b) Any additional coverage required by local regulations
(c) Personal liability coverage as appropriate
Dollor.ai does not provide insurance coverage for Helpers or their activities.
            """,
        },

        "section_5_payments": {
            "title": "5. PAYMENTS AND FEES",
            "content": """
5.1 Food Payment
For food delivery services:
(a) Customers pay restaurants directly for food items
(b) Dollor.ai does not process or handle food payments
(c) Food pricing is set by restaurants, not Dollor.ai

5.2 Delivery/Service Payment
For delivery and ride services:
(a) Customers pre-authorize a service amount via the Platform
(b) Payment is held (not charged) until service completion
(c) Upon successful completion, payment is released to Helper
(d) Payment flows: Customer -> Stripe -> Helper (Dollor.ai does not touch funds)

5.3 Platform Service Fees
(a) CUSTOMERS pay a $0.99 service fee per request
(b) RESTAURANTS pay a $0.99 service fee per confirmed order
(c) HELPERS pay $0.00 - they receive 100% of service payments

5.4 Payment Processing
All payments are processed through Stripe, a PCI-DSS compliant payment processor.
Dollor.ai does not store credit card numbers or sensitive payment information.

5.5 Helper Payouts
Helpers receive payments via Stripe Connect:
(a) Instant payouts available to eligible debit cards
(b) Standard payouts within 1-2 business days
(c) No minimum payout threshold

5.6 Refunds and Cancellations
(a) Before Helper accepts: Full refund of held amount
(b) After Helper accepts: Cancellation fee may apply
(c) Service issues: Case-by-case resolution through support

5.7 No Money Transmission
Dollor.ai does not engage in money transmission. We are a technology
platform that facilitates connections; Stripe handles all fund transfers.
            """,
        },

        "section_6_conduct": {
            "title": "6. USER CONDUCT",
            "content": """
6.1 General Conduct
All users agree to:
(a) Use the Platform only for lawful purposes
(b) Treat other users with respect
(c) Provide accurate information
(d) Honor commitments made through the Platform
(e) Comply with all applicable laws and regulations

6.2 Prohibited Activities
Users shall NOT:
(a) Use the Platform for any illegal activity
(b) Harass, threaten, or abuse other users
(c) Discriminate against any user
(d) Transport illegal items or substances
(e) Impersonate another person or entity
(f) Attempt to circumvent Platform fees
(g) Create fake orders or accounts
(h) Manipulate ratings or reviews
(i) Reverse engineer the Platform
(j) Interfere with Platform operations

6.3 Helper-Specific Conduct
Helpers additionally agree to:
(a) Maintain valid driver's license and vehicle registration
(b) Maintain required insurance coverage
(c) Not drive under influence of drugs or alcohol
(d) Follow all traffic laws
(e) Not engage in unsafe driving practices
(f) Handle food and packages with care
(g) Respect customer property and privacy

6.4 Customer-Specific Conduct
Customers additionally agree to:
(a) Provide accurate delivery/pickup locations
(b) Be available to receive orders
(c) Not make false complaints or claims
(d) Pay for services as agreed
            """,
        },

        "section_7_liability": {
            "title": "7. LIMITATION OF LIABILITY",
            "content": """
7.1 Platform Liability Limitation
TO THE MAXIMUM EXTENT PERMITTED BY LAW, DOLLOR.AI SHALL NOT BE LIABLE FOR:
(a) Actions or omissions of any user (Customer, Helper, Restaurant)
(b) Quality, safety, or legality of items delivered
(c) Quality of driving or delivery services
(d) Personal injury or property damage during services
(e) Disputes between users
(f) Loss of data or business interruption
(g) Third-party products or services
(h) Events outside our reasonable control

7.2 Section 230 Protection
As an interactive computer service provider under 47 U.S.C. Section 230,
Dollor.ai is not liable for content or transactions created by users.

7.3 Limitation of Damages
IN NO EVENT SHALL DOLLOR.AI'S TOTAL LIABILITY EXCEED THE GREATER OF:
(a) The fees paid by you in the 12 months preceding the claim, OR
(b) $100 USD

7.4 No Consequential Damages
DOLLOR.AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS.

7.5 Disclaimer of Warranties
THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.
WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:
(a) Merchantability
(b) Fitness for a particular purpose
(c) Non-infringement
(d) Accuracy or reliability of content

7.6 User Acknowledgment
By using the Platform, you acknowledge that:
(a) Services are provided by independent users, not Dollor.ai
(b) You use the Platform at your own risk
(c) Dollor.ai is a technology platform, not a service provider
            """,
        },

        "section_8_disputes": {
            "title": "8. DISPUTE RESOLUTION",
            "content": """
8.1 User-to-User Disputes
Disputes between users (Customer vs. Helper, etc.) should be resolved
directly between those users. Dollor.ai may assist in mediation but is
not obligated to resolve user disputes.

8.2 Platform Disputes - Arbitration Agreement
For disputes with Dollor.ai:

BINDING ARBITRATION: You agree that any dispute, claim, or controversy
arising from these Terms or the Platform shall be resolved through
binding arbitration administered by the American Arbitration Association
(AAA) under its Commercial Arbitration Rules.

CLASS ACTION WAIVER: YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS
ACTION OR CLASS-WIDE ARBITRATION.

8.3 Exceptions to Arbitration
The following may be brought in court:
(a) Small claims court actions (if eligible)
(b) Intellectual property infringement claims
(c) Injunctive relief for unauthorized use

8.4 30-Day Opt-Out
You may opt out of arbitration by sending written notice to
legal@dollor.ai within 30 days of first using the Platform.

8.5 Governing Law
These Terms are governed by the laws of the State of Delaware, USA,
without regard to conflict of laws principles.
            """,
        },

        "section_9_termination": {
            "title": "9. TERMINATION",
            "content": """
9.1 User Termination
You may terminate your account at any time by:
(a) Using the in-app deletion feature (Settings > Account > Delete Account)
(b) Emailing deletion@dollor.ai with your account details

9.2 Effect of User Termination
Upon termination:
(a) Your account access will be revoked
(b) Pending transactions will be completed
(c) Outstanding payments will be processed
(d) Your data will be deleted per our Privacy Policy

9.3 Dollor.ai Termination Rights
We may suspend or terminate accounts for:
(a) Violation of these Terms
(b) Fraudulent or illegal activity
(c) Harmful behavior toward other users
(d) Extended inactivity
(e) Request by law enforcement

9.4 Survival
Sections relating to liability, indemnification, dispute resolution,
and intellectual property survive termination.
            """,
        },

        "section_10_intellectual_property": {
            "title": "10. INTELLECTUAL PROPERTY",
            "content": """
10.1 Dollor.ai Property
The Platform, including all software, designs, text, images, and other
content, is owned by Dollor.ai or its licensors. You may not copy,
modify, distribute, or create derivative works without permission.

10.2 User License
We grant you a limited, non-exclusive, revocable license to use the
Platform for its intended purposes, subject to these Terms.

10.3 User Content
By submitting content (reviews, photos, etc.), you grant Dollor.ai a
worldwide, royalty-free license to use, display, and distribute such
content in connection with the Platform.

10.4 Feedback
Any feedback, suggestions, or ideas you provide may be used by
Dollor.ai without compensation or attribution.
            """,
        },

        "section_11_indemnification": {
            "title": "11. INDEMNIFICATION",
            "content": """
11.1 User Indemnification
You agree to indemnify, defend, and hold harmless Dollor.ai, its officers,
directors, employees, and agents from any claims, damages, losses, or
expenses (including attorney fees) arising from:
(a) Your use of the Platform
(b) Your violation of these Terms
(c) Your violation of any law or third-party rights
(d) Services you provide or receive through the Platform
(e) Any content you submit to the Platform
            """,
        },

        "section_12_miscellaneous": {
            "title": "12. MISCELLANEOUS",
            "content": """
12.1 Entire Agreement
These Terms, together with the Privacy Policy and any other policies
referenced herein, constitute the entire agreement between you and
Dollor.ai regarding the Platform.

12.2 Severability
If any provision is found unenforceable, the remaining provisions
continue in full force and effect.

12.3 No Waiver
Failure to enforce any provision does not waive the right to enforce it.

12.4 Assignment
You may not assign these Terms. Dollor.ai may assign them freely.

12.5 Notices
We may send notices via the Platform, email, or postal mail. You should
send notices to: legal@dollor.ai or Dollor.ai, 123 Tech Street,
San Francisco, CA 94102.

12.6 Force Majeure
Dollor.ai is not liable for delays due to circumstances beyond our
reasonable control (natural disasters, war, government actions, etc.).

12.7 Headings
Section headings are for convenience only and do not affect interpretation.
            """,
        },

        "section_13_contact": {
            "title": "13. CONTACT INFORMATION",
            "content": """
Dollor.ai, Inc.
123 Tech Street
San Francisco, CA 94102
United States

General Inquiries: support@dollor.ai
Legal Notices: legal@dollor.ai
Privacy Concerns: privacy@dollor.ai
Account Deletion: deletion@dollor.ai

Phone: +1 (415) 555-0123

For urgent safety concerns: urgent@dollor.ai
            """,
        },

        "user_acknowledgments": [
            "I have read and understand these Terms of Service",
            "I understand Dollor.ai is a technology platform, not a delivery or transportation company",
            "I understand Helpers are independent individuals, not Dollor.ai employees",
            "I understand payments flow directly between users via Stripe",
            "I understand Dollor.ai has limited liability for user transactions",
            "I am at least 18 years old and have capacity to enter this agreement",
            "I agree to resolve disputes through binding arbitration",
            "I waive my right to participate in class action lawsuits",
        ],

        "app_store_compliance": {
            "apple_3_1_1": "Physical goods/services exemption applies - no IAP required for delivery/ride fees",
            "apple_5_1_1": "Full Privacy Policy provided with data collection disclosure",
            "apple_5_1_2": "Data sharing practices clearly disclosed",
            "apple_account_deletion": "Account deletion available via Settings > Account > Delete Account",
            "google_play": "Compliant with Google Play Developer Program Policies",
        },
    }


# =============================================================================
# COMPREHENSIVE PRIVACY POLICY
# =============================================================================

@router.get("/privacy-policy")
async def get_full_privacy_policy():
    """
    Complete Privacy Policy - App Store Compliant (Apple 5.1.1, 5.1.2)
    CCPA and GDPR Compliant
    """
    return {
        "document_info": {
            "title": "Dollor.ai Privacy Policy",
            "version": "3.0",
            "effective_date": "2024-12-10",
            "last_updated": "2024-12-10",
        },

        "section_1_introduction": {
            "title": "1. INTRODUCTION",
            "content": """
Dollor.ai, Inc. ("Dollor.ai," "we," "us," or "our") respects your privacy
and is committed to protecting your personal information. This Privacy Policy
explains how we collect, use, disclose, and protect your information when you
use our mobile application, website, and services (the "Platform").

By using the Platform, you consent to the practices described in this Policy.
If you do not agree, please do not use the Platform.
            """,
        },

        "section_2_information_collected": {
            "title": "2. INFORMATION WE COLLECT",
            "categories": {
                "2_1_account_information": {
                    "description": "Information you provide when creating an account",
                    "data_types": [
                        "Full name",
                        "Email address",
                        "Phone number",
                        "Profile photo (optional)",
                        "Date of birth (for age verification)",
                        "Password (encrypted)",
                    ],
                    "purpose": "Account creation and management",
                    "retention": "Duration of account plus 30 days after deletion",
                },

                "2_2_identity_verification": {
                    "description": "Information for Helper verification",
                    "data_types": [
                        "Driver's license",
                        "Vehicle registration",
                        "Insurance documentation",
                        "Social Security Number (last 4 digits for tax purposes)",
                        "Background check authorization",
                    ],
                    "purpose": "Verify Helper eligibility and compliance",
                    "retention": "Duration of Helper status plus required legal retention",
                },

                "2_3_payment_information": {
                    "description": "Information for payment processing",
                    "data_types": [
                        "Credit/debit card details (stored by Stripe, not us)",
                        "Bank account information (stored by Stripe for payouts)",
                        "Billing address",
                        "Transaction history",
                    ],
                    "purpose": "Process payments and payouts",
                    "retention": "As required by payment processor and tax regulations",
                    "note": "Card numbers are NOT stored on Dollor.ai servers",
                },

                "2_4_location_information": {
                    "description": "Geographic information",
                    "data_types": [
                        "Real-time GPS location (when app is in use)",
                        "Saved addresses (home, work, etc.)",
                        "Delivery/pickup locations",
                        "Route information",
                    ],
                    "purpose": "Enable delivery/ride services, show nearby options",
                    "retention": "Real-time location not stored; addresses retained with account",
                    "user_control": "Location access can be revoked in device settings",
                },

                "2_5_usage_information": {
                    "description": "Information about how you use the Platform",
                    "data_types": [
                        "App interactions (screens viewed, buttons tapped)",
                        "Order history",
                        "Search queries",
                        "Feature usage patterns",
                        "Session duration and frequency",
                    ],
                    "purpose": "Improve services and user experience",
                    "retention": "Aggregated data retained; individual data for 24 months",
                },

                "2_6_device_information": {
                    "description": "Information about your device",
                    "data_types": [
                        "Device type and model",
                        "Operating system version",
                        "Unique device identifiers",
                        "IP address",
                        "Mobile network information",
                        "App version",
                    ],
                    "purpose": "Troubleshooting, security, and optimization",
                    "retention": "24 months",
                },

                "2_7_communications": {
                    "description": "Information from your communications",
                    "data_types": [
                        "Support chat transcripts",
                        "Email correspondence",
                        "In-app messages between users",
                        "Phone call recordings (with consent, for quality)",
                    ],
                    "purpose": "Customer support and dispute resolution",
                    "retention": "Support tickets: 3 years; Messages: 90 days after order completion",
                },
            },
        },

        "section_3_how_we_use_information": {
            "title": "3. HOW WE USE YOUR INFORMATION",
            "purposes": [
                {
                    "purpose": "Provide Platform services",
                    "examples": ["Process orders", "Match Customers with Helpers", "Enable payments"],
                },
                {
                    "purpose": "Safety and security",
                    "examples": ["Verify identities", "Detect fraud", "Prevent abuse"],
                },
                {
                    "purpose": "Improve our services",
                    "examples": ["Analyze usage patterns", "Develop new features", "Fix bugs"],
                },
                {
                    "purpose": "Communications",
                    "examples": ["Order updates", "Service announcements", "Marketing (with consent)"],
                },
                {
                    "purpose": "Legal compliance",
                    "examples": ["Tax reporting", "Respond to legal requests", "Enforce Terms"],
                },
            ],
        },

        "section_4_information_sharing": {
            "title": "4. HOW WE SHARE YOUR INFORMATION",
            "sharing_categories": {
                "4_1_with_other_users": {
                    "what": "Name, phone number, approximate location",
                    "when": "When matched for a delivery or ride",
                    "why": "Enable service completion and coordination",
                },

                "4_2_with_restaurants": {
                    "what": "Order details, delivery address, name",
                    "when": "When you place an order",
                    "why": "Fulfill your food order",
                },

                "4_3_with_service_providers": {
                    "what": "Varies by provider",
                    "providers": [
                        "Stripe (payment processing)",
                        "AWS (cloud hosting)",
                        "Twilio (communications)",
                        "Google Maps (mapping services)",
                        "Background check providers",
                    ],
                    "why": "Operate the Platform",
                },

                "4_4_legal_requirements": {
                    "what": "Any information as required",
                    "when": "Court orders, subpoenas, legal obligations",
                    "why": "Comply with law",
                },

                "4_5_business_transfers": {
                    "what": "All information",
                    "when": "Merger, acquisition, or asset sale",
                    "why": "Business continuity",
                },
            },

            "we_never_sell": {
                "statement": "WE DO NOT SELL YOUR PERSONAL INFORMATION",
                "detail": "Dollor.ai does not sell user data to third parties for marketing or any other purpose.",
            },
        },

        "section_5_data_security": {
            "title": "5. DATA SECURITY",
            "measures": [
                "Encryption in transit (TLS 1.3)",
                "Encryption at rest (AES-256)",
                "PCI-DSS compliant payment processing via Stripe",
                "Regular security audits and penetration testing",
                "Access controls and authentication",
                "Employee security training",
                "Incident response procedures",
            ],
            "disclaimer": """
While we implement industry-standard security measures, no system is
completely secure. You are responsible for maintaining the security of
your account credentials.
            """,
        },

        "section_6_your_rights": {
            "title": "6. YOUR PRIVACY RIGHTS",
            "rights": {
                "access": {
                    "description": "Request a copy of your personal data",
                    "how": "Settings > Privacy > Request My Data, or email privacy@dollor.ai",
                },
                "correction": {
                    "description": "Update or correct inaccurate information",
                    "how": "Settings > Profile > Edit, or email privacy@dollor.ai",
                },
                "deletion": {
                    "description": "Delete your account and personal data",
                    "how": "Settings > Account > Delete Account, or email deletion@dollor.ai",
                    "note": "Some data may be retained for legal requirements",
                },
                "portability": {
                    "description": "Receive your data in a portable format",
                    "how": "Email privacy@dollor.ai to request data export",
                },
                "opt_out": {
                    "description": "Opt out of marketing communications",
                    "how": "Settings > Notifications, or unsubscribe link in emails",
                },
                "restrict_processing": {
                    "description": "Limit how we use your data",
                    "how": "Email privacy@dollor.ai with your request",
                },
            },
            "response_time": "We respond to requests within 45 days (30 days for GDPR)",
        },

        "section_7_california_residents": {
            "title": "7. CALIFORNIA PRIVACY RIGHTS (CCPA)",
            "rights": [
                "Right to know what personal information we collect",
                "Right to know if we sell or share your information (we don't)",
                "Right to request deletion of your information",
                "Right to opt out of sale of personal information",
                "Right to non-discrimination for exercising rights",
            ],
            "categories_collected": [
                "Identifiers (name, email, phone)",
                "Commercial information (order history)",
                "Internet activity (usage data)",
                "Geolocation data",
                "Professional information (for Helpers)",
            ],
            "how_to_exercise": "Email privacy@dollor.ai or call +1 (415) 555-0123",
            "do_not_sell": "We do not sell personal information. Opt-out is not required but available at Settings > Privacy > Do Not Sell.",
        },

        "section_8_eu_residents": {
            "title": "8. EU/EEA RESIDENTS (GDPR)",
            "legal_bases": {
                "consent": "Marketing communications, optional features",
                "contract": "Providing Platform services",
                "legal_obligation": "Tax reporting, legal requests",
                "legitimate_interests": "Security, fraud prevention, service improvement",
            },
            "international_transfers": {
                "statement": "Data is transferred to the United States",
                "safeguards": "Standard Contractual Clauses, Privacy Shield principles",
            },
            "dpo_contact": "dpo@dollor.ai",
            "supervisory_authority": "You may lodge a complaint with your local data protection authority",
        },

        "section_9_children": {
            "title": "9. CHILDREN'S PRIVACY",
            "policy": """
The Platform is not intended for users under 18 years of age. We do not
knowingly collect personal information from children under 18. If we learn
that we have collected information from a child under 18, we will delete
it immediately. If you believe a child has provided us information,
contact us at privacy@dollor.ai.
            """,
        },

        "section_10_retention": {
            "title": "10. DATA RETENTION",
            "periods": {
                "active_accounts": "Data retained while account is active",
                "deleted_accounts": "Most data deleted within 30 days of account deletion",
                "transaction_records": "7 years (tax and legal requirements)",
                "support_tickets": "3 years",
                "aggregated_analytics": "Indefinitely (anonymized)",
            },
        },

        "section_11_cookies": {
            "title": "11. COOKIES AND TRACKING",
            "types": {
                "essential": "Required for Platform functionality",
                "analytics": "Help us understand usage patterns",
                "preferences": "Remember your settings",
            },
            "control": "Manage cookie preferences in your browser settings",
            "mobile_tracking": "Manage in device settings (IDFA/GAID)",
        },

        "section_12_changes": {
            "title": "12. CHANGES TO THIS POLICY",
            "policy": """
We may update this Privacy Policy periodically. We will notify you of
material changes through the Platform or via email. Your continued use
after such notification constitutes acceptance of the updated Policy.
            """,
        },

        "section_13_contact": {
            "title": "13. CONTACT US",
            "content": """
For privacy-related inquiries:

Email: privacy@dollor.ai
Phone: +1 (415) 555-0123
Mail: Dollor.ai, Inc.
      Attn: Privacy Team
      123 Tech Street
      San Francisco, CA 94102

Data Protection Officer (EU): dpo@dollor.ai
            """,
        },

        "apple_app_store_compliance": {
            "data_collection_disclosure": {
                "collected_for_analytics": ["Usage Data", "Diagnostics"],
                "collected_for_functionality": ["Location", "Contact Info", "Identifiers"],
                "collected_for_product_personalization": ["Search History", "Browsing History"],
                "linked_to_identity": ["Contact Info", "Location", "Identifiers"],
                "used_for_tracking": False,
            },
            "privacy_nutrition_label": "Accurately reflects data practices as required by Apple",
        },
    }


# =============================================================================
# DELIVERY SERVICE LEGAL CLARIFICATIONS
# =============================================================================

@router.get("/delivery-service-terms")
async def get_delivery_legal_clarifications():
    """
    Detailed legal clarifications for delivery services.
    Points requiring vetting for laws and regulations.
    """
    return {
        "service_model": {
            "title": "DELIVERY SERVICE MODEL - LEGAL CLARIFICATIONS",
            "model_type": "Peer-to-Peer Marketplace",
            "legal_framework": "Section 230 CDA Platform Protection",
        },

        "clarification_points": {
            "1_employment_classification": {
                "point": "Helper (Driver) Classification",
                "our_position": "Helpers are independent individuals, not employees or contractors of Dollor.ai",
                "legal_tests_addressed": {
                    "abc_test_california_ab5": {
                        "A_free_from_control": "Helpers choose when, where, and whether to work. No minimum hours, no required schedule. Can reject any request.",
                        "B_outside_usual_course": "Dollor.ai is a technology company providing software. Delivery is performed by users, not the company.",
                        "C_customarily_engaged": "Helpers may use multiple platforms and have their own delivery businesses.",
                    },
                    "irs_factors": {
                        "behavioral_control": "Dollor.ai does not instruct Helpers how to perform deliveries",
                        "financial_control": "Helpers use own vehicle, pay own expenses, can work for competitors",
                        "relationship_type": "No benefits, no ongoing relationship required, per-task basis",
                    },
                },
                "legal_review_needed": True,
                "jurisdiction_specific": "AB5 (California), Proposition 22 exemption analysis required",
            },

            "2_payment_flow": {
                "point": "Money Flow and Money Transmission",
                "our_position": "Dollor.ai does not engage in money transmission",
                "structure": {
                    "food_payment": "Customer -> Restaurant (direct, not through Dollor)",
                    "delivery_payment": "Customer -> Stripe -> Helper (Dollor.ai doesn't touch funds)",
                    "platform_fee": "Customer -> Dollor.ai (service fee for platform access)",
                },
                "money_transmission_exemption": {
                    "reasoning": "We use Stripe as licensed payment processor. Dollor.ai never holds user funds.",
                    "stripe_role": "Stripe holds funds and is the licensed money transmitter",
                },
                "legal_review_needed": True,
                "jurisdiction_specific": "State-by-state money transmission laws",
            },

            "3_food_safety": {
                "point": "Food Safety Liability",
                "our_position": "Restaurants are responsible for food safety",
                "clarification": {
                    "restaurant_responsibility": "Food preparation, packaging, temperature maintenance until pickup",
                    "helper_responsibility": "Timely delivery, not tampering with food",
                    "dollor_responsibility": "None - platform facilitates connection only",
                },
                "disclaimers_required": [
                    "Food quality and safety is restaurant's responsibility",
                    "Dollor.ai does not prepare, package, or inspect food",
                    "Delivery time estimates are not guarantees",
                ],
                "legal_review_needed": True,
                "jurisdiction_specific": "State food safety regulations, local health codes",
            },

            "4_insurance_requirements": {
                "point": "Insurance Coverage",
                "our_position": "Helpers maintain their own insurance",
                "structure": {
                    "helper_insurance": "Personal auto insurance required, commercial coverage recommended",
                    "restaurant_insurance": "Their own business liability coverage",
                    "dollor_insurance": "Platform liability insurance (not covering user activities)",
                },
                "gap_coverage": {
                    "concern": "Personal auto insurance may not cover commercial delivery",
                    "recommendation": "Require Helpers to acknowledge and maintain appropriate coverage",
                },
                "legal_review_needed": True,
                "jurisdiction_specific": "State insurance requirements, rideshare/delivery specific laws",
            },

            "5_liability_allocation": {
                "point": "Liability for Incidents",
                "our_position": "Section 230 protection as platform provider",
                "scenarios": {
                    "accident_during_delivery": "Helper's insurance/responsibility",
                    "food_poisoning": "Restaurant's responsibility",
                    "theft_of_package": "Case-by-case resolution, user-to-user dispute",
                    "assault_or_crime": "Law enforcement matter, platform cooperation",
                },
                "indemnification": "Users indemnify Dollor.ai for their actions",
                "legal_review_needed": True,
            },

            "6_background_checks": {
                "point": "Helper Background Verification",
                "our_position": "Background checks conducted for user safety",
                "process": {
                    "provider": "Third-party background check service",
                    "checks_included": ["Criminal history", "Driving record", "Sex offender registry"],
                    "disqualifying_factors": ["Violent crimes", "DUI within X years", "Sexual offenses"],
                },
                "fcra_compliance": {
                    "required": True,
                    "elements": ["Pre-adverse action notice", "Adverse action notice", "Dispute rights"],
                },
                "legal_review_needed": True,
                "jurisdiction_specific": "Ban-the-box laws, FCRA requirements",
            },

            "7_tipping_and_earnings": {
                "point": "Helper Compensation Structure",
                "our_position": "Helpers receive 100% of delivery payments",
                "structure": {
                    "delivery_payment": "Set by customer, 100% goes to Helper",
                    "tips": "100% goes to Helper",
                    "platform_fee": "Charged to customer and restaurant, not Helper",
                },
                "minimum_wage_concerns": {
                    "our_position": "Not applicable - Helpers are independent users",
                    "ab5_prop22_analysis": "If classified as employees, different analysis required",
                },
                "legal_review_needed": True,
                "jurisdiction_specific": "Minimum wage laws, tip pooling regulations",
            },

            "8_cancellations_and_refunds": {
                "point": "Cancellation and Refund Policy",
                "our_position": "Clear policies protect all parties",
                "policy": {
                    "customer_cancels_before_acceptance": "Full refund of held delivery amount",
                    "customer_cancels_after_acceptance": "Cancellation fee to compensate Helper's time",
                    "helper_cancels": "No penalty if before pickup; possible account impact if pattern",
                    "restaurant_cancels": "Full refund to customer, restaurant fee may still apply",
                },
                "legal_review_needed": True,
            },

            "9_restricted_items": {
                "point": "Prohibited Deliveries",
                "our_position": "Clear restrictions on what can be delivered",
                "prohibited_items": [
                    "Alcohol (unless properly licensed)",
                    "Tobacco products",
                    "Controlled substances",
                    "Weapons",
                    "Hazardous materials",
                    "Stolen goods",
                    "Items requiring special licensing",
                ],
                "age_verification": {
                    "alcohol": "21+ verification required if permitted by license",
                    "tobacco": "Age verification required per local law",
                },
                "legal_review_needed": True,
                "jurisdiction_specific": "Alcohol delivery laws vary by state/city",
            },

            "10_data_protection": {
                "point": "User Data Handling",
                "our_position": "Compliant with CCPA, GDPR, and app store requirements",
                "key_elements": {
                    "data_minimization": "Collect only necessary data",
                    "purpose_limitation": "Use data only for stated purposes",
                    "user_rights": "Access, correction, deletion, portability",
                    "security": "Encryption, access controls, incident response",
                },
                "legal_review_needed": True,
                "jurisdiction_specific": "CCPA (California), GDPR (EU), state privacy laws",
            },
        },

        "regulatory_checklist": {
            "federal": [
                "FTC Act (unfair/deceptive practices)",
                "Fair Credit Reporting Act (background checks)",
                "Americans with Disabilities Act",
                "IRS independent contractor guidelines",
            ],
            "state_california": [
                "AB5 / Proposition 22 compliance",
                "CCPA privacy compliance",
                "State money transmission laws",
                "Food safety regulations",
            ],
            "state_general": [
                "Employment classification laws",
                "Consumer protection laws",
                "Insurance requirements",
                "Background check laws",
            ],
            "local": [
                "Business licensing",
                "Food delivery permits",
                "Operating hour restrictions",
                "Parking/loading zone regulations",
            ],
        },

        "recommended_legal_review": {
            "priority_1_before_launch": [
                "Employment classification analysis (AB5 compliance)",
                "Terms of Service and arbitration agreement",
                "Privacy Policy (app store compliance)",
                "Money transmission analysis",
            ],
            "priority_2_pre_launch": [
                "Insurance requirements and disclosure",
                "Background check process (FCRA)",
                "Food safety disclaimers",
                "State-specific regulatory compliance",
            ],
            "priority_3_ongoing": [
                "New market expansion analysis",
                "Regulatory change monitoring",
                "Terms updates as needed",
                "Incident response procedures",
            ],
        },
    }


# =============================================================================
# RIDESHARE SERVICE LEGAL CLARIFICATIONS
# =============================================================================

@router.get("/rideshare-service-terms")
async def get_rideshare_legal_clarifications():
    """
    Detailed legal clarifications for rideshare services.
    Points requiring vetting for laws and regulations.
    """
    return {
        "service_model": {
            "title": "RIDESHARE SERVICE MODEL - LEGAL CLARIFICATIONS",
            "model_type": "Peer-to-Peer Rideshare Marketplace",
            "legal_framework": "Section 230 CDA Platform Protection",
            "distinction": "P2P 'community help' model, not commercial rideshare like Uber/Lyft",
        },

        "clarification_points": {
            "1_tnc_classification": {
                "point": "Transportation Network Company (TNC) Status",
                "our_position": "We are NOT a TNC - we are a P2P technology platform",
                "key_distinction": {
                    "tnc_model": "Company provides transportation services via driver network",
                    "our_model": "Users help each other with rides; we provide connection technology",
                },
                "regulatory_implications": {
                    "if_tnc": "State TNC licensing, insurance requirements, driver permits",
                    "if_p2p_platform": "Section 230 protection, limited regulatory burden",
                },
                "legal_review_needed": True,
                "jurisdiction_specific": "State TNC laws (vary significantly by state)",
                "high_risk": True,
                "note": "This is a critical classification that requires careful legal analysis",
            },

            "2_insurance_requirements": {
                "point": "Insurance for Rideshare Activities",
                "our_position": "Helpers maintain personal insurance; commercial coverage recommended",
                "tnc_insurance_requirements": {
                    "period_1_app_on": "Contingent liability coverage",
                    "period_2_matched": "Primary coverage $50K/$100K/$25K minimum",
                    "period_3_passenger": "Primary coverage $1M typically required",
                },
                "our_model": {
                    "position": "As P2P platform, TNC insurance requirements may not apply",
                    "recommendation": "Require Helpers to maintain adequate coverage",
                    "disclaimer": "Personal insurance may not cover rideshare activities",
                },
                "legal_review_needed": True,
                "high_risk": True,
                "note": "Insurance is often the biggest regulatory hurdle for rideshare",
            },

            "3_driver_requirements": {
                "point": "Helper (Driver) Requirements",
                "our_position": "Safety requirements without implying employment",
                "requirements": {
                    "age": "21+ for rideshare services",
                    "license": "Valid driver's license for 1+ years",
                    "vehicle": "Registered, insured, passes safety inspection",
                    "background": "Pass background and driving record check",
                },
                "tnc_comparison": {
                    "tnc_drivers": "Often required to have TNC permit/license",
                    "our_helpers": "No special permit - personal vehicle use",
                },
                "legal_review_needed": True,
                "jurisdiction_specific": "Some states require all rideshare drivers to be permitted",
            },

            "4_vehicle_requirements": {
                "point": "Vehicle Standards",
                "our_position": "Basic safety requirements",
                "requirements": [
                    "Registered in driver's name (or authorized use)",
                    "Current insurance",
                    "Passes state inspection requirements",
                    "Maximum age (10-15 years typical)",
                    "4 doors, seats 4+ passengers",
                    "No branded commercial vehicles",
                ],
                "no_tnc_inspection": "We don't require TNC-style vehicle inspection",
                "legal_review_needed": True,
            },

            "5_passenger_safety": {
                "point": "Passenger Safety Measures",
                "our_position": "Safety through transparency and accountability",
                "measures": {
                    "identity_verification": "Photo matching, phone verification",
                    "trip_sharing": "Share trip details with emergency contacts",
                    "gps_tracking": "Real-time location during trips",
                    "rating_system": "Two-way ratings for accountability",
                    "emergency_button": "Quick access to emergency services",
                    "photo_matching": "Confirm driver matches profile photo",
                },
                "disclaimers": [
                    "Dollor.ai does not guarantee passenger safety",
                    "Users travel at their own risk",
                    "Helpers are independent users, not Dollor.ai employees",
                ],
                "legal_review_needed": True,
            },

            "6_pricing_model": {
                "point": "Ride Pricing Structure",
                "our_position": "Suggested pricing, user sets final amount",
                "structure": {
                    "suggestion": "Algorithm suggests fair price based on distance/time",
                    "final_price": "Customer and Helper agree on amount",
                    "payment": "Customer -> Stripe -> Helper (100% to Helper)",
                    "platform_fee": "$0.99 from customer only",
                },
                "not_surge_pricing": "We suggest prices, don't mandate them",
                "legal_review_needed": True,
                "note": "Price-fixing concerns if platform controls pricing",
            },

            "7_airport_and_restricted_areas": {
                "point": "Airport and Restricted Pickups/Dropoffs",
                "our_position": "Comply with local regulations",
                "considerations": {
                    "airports": "Many require TNC permits for pickups/dropoffs",
                    "ports": "May have specific regulations",
                    "events": "Special permits may be required",
                },
                "our_approach": {
                    "geofencing": "May restrict certain pickup/dropoff locations",
                    "user_responsibility": "Helpers responsible for permit compliance",
                },
                "legal_review_needed": True,
                "jurisdiction_specific": "Airport-by-airport rules",
            },

            "8_accessibility": {
                "point": "Accessibility and ADA Compliance",
                "our_position": "Platform accessible; ride accessibility varies",
                "ada_considerations": {
                    "platform_accessibility": "App designed for accessibility",
                    "ride_accessibility": "Depends on individual Helper vehicles",
                    "service_animals": "Helpers must accommodate service animals",
                },
                "wheelchair_accessible": {
                    "current": "Standard vehicles may not accommodate wheelchairs",
                    "future": "May add WAV (wheelchair accessible vehicle) filter",
                },
                "legal_review_needed": True,
                "note": "ADA applies differently to TNCs vs. P2P platforms",
            },

            "9_intoxicated_passengers": {
                "point": "Handling Intoxicated Passengers",
                "our_position": "Helper discretion with guidelines",
                "guidelines": {
                    "acceptance": "Helpers may decline visibly intoxicated passengers",
                    "safety": "Safety concerns take priority",
                    "completion": "If accepted, complete ride safely",
                },
                "liability": {
                    "concern": "Over-service liability in some jurisdictions",
                    "mitigation": "Helpers not serving alcohol, just providing rides",
                },
                "legal_review_needed": True,
            },

            "10_criminal_activity": {
                "point": "Criminal Activity During Rides",
                "our_position": "Zero tolerance, cooperation with law enforcement",
                "policies": {
                    "prohibited": "Any illegal activity during rides",
                    "reporting": "Users should report illegal activity immediately",
                    "cooperation": "Full cooperation with law enforcement",
                    "evidence": "Trip data available for investigations with proper legal process",
                },
                "legal_review_needed": True,
            },

            "11_cross_border_rides": {
                "point": "Interstate and International Rides",
                "our_position": "Allowed with appropriate disclosures",
                "considerations": {
                    "interstate": "Subject to laws of both states",
                    "international": "Complex - customs, immigration, insurance",
                },
                "current_approach": "Focus on local/regional rides initially",
                "legal_review_needed": True,
            },

            "12_commercial_vs_personal": {
                "point": "Commercial vs. Personal Use",
                "our_position": "Personal vehicle, community help model",
                "distinction": {
                    "commercial": "Operating for-profit transportation business",
                    "personal": "Helping community members, receiving voluntary compensation",
                },
                "tax_implications": {
                    "helper_income": "Reportable income for tax purposes",
                    "deductions": "Business-use mileage and expenses deductible",
                },
                "legal_review_needed": True,
                "note": "Key distinction for regulatory classification",
            },
        },

        "regulatory_checklist": {
            "federal": [
                "ADA accessibility requirements",
                "DOT regulations (if applicable)",
                "IRS reporting requirements",
            ],
            "state_tnc_laws": {
                "states_with_tnc_laws": [
                    "California (CPUC regulated)",
                    "New York (TLC in NYC)",
                    "Texas",
                    "Florida",
                    "Illinois",
                    "Most other states",
                ],
                "key_requirements": [
                    "TNC permit/license",
                    "Insurance coverage",
                    "Driver background checks",
                    "Vehicle inspections",
                    "Fee/tax payments",
                ],
            },
            "local": [
                "City operating permits",
                "Airport permits",
                "Port authority rules",
                "Special event regulations",
            ],
        },

        "key_legal_questions": {
            "1": {
                "question": "Are we a TNC under state law?",
                "importance": "Critical - determines regulatory requirements",
                "analysis_needed": "State-by-state TNC definition analysis",
            },
            "2": {
                "question": "Does our P2P model qualify for regulatory exemption?",
                "importance": "Could reduce compliance burden",
                "analysis_needed": "Comparison to carpooling/ridesharing exemptions",
            },
            "3": {
                "question": "What insurance must we require/provide?",
                "importance": "Major cost and liability factor",
                "analysis_needed": "State insurance requirements analysis",
            },
            "4": {
                "question": "Can we operate without TNC permits?",
                "importance": "Determines launch timeline and costs",
                "analysis_needed": "Regulatory pathway analysis by market",
            },
        },

        "recommended_legal_strategy": {
            "option_1_p2p_platform": {
                "description": "Maintain P2P community help model",
                "pros": ["Lower regulatory burden", "Section 230 protection", "Faster launch"],
                "cons": ["May face regulatory challenge", "Limited to certain markets"],
                "risk": "Medium-High",
            },
            "option_2_tnc_license": {
                "description": "Obtain TNC licenses where required",
                "pros": ["Full regulatory compliance", "All markets accessible"],
                "cons": ["High cost", "Insurance requirements", "Slower launch"],
                "risk": "Low",
            },
            "option_3_hybrid": {
                "description": "P2P where possible, TNC where required",
                "pros": ["Balanced approach", "Market-by-market optimization"],
                "cons": ["Complexity", "Different rules in different markets"],
                "risk": "Medium",
            },
        },
    }


# =============================================================================
# APP STORE COMPLIANCE CHECKLIST
# =============================================================================

@router.get("/app-store-compliance")
async def get_app_store_compliance():
    """
    Complete App Store compliance checklist for Apple and Google.
    """
    return {
        "apple_app_store": {
            "guideline_3_1_1_iap": {
                "requirement": "Use In-App Purchase for digital goods/services",
                "our_compliance": {
                    "status": "COMPLIANT - EXEMPTION APPLIES",
                    "reasoning": """
                        Our services are PHYSICAL SERVICES (delivery of physical goods,
                        transportation of persons). Apple's guidelines explicitly exempt
                        physical goods and services from IAP requirements.

                        Per Apple: "Apps may use purchase methods other than in-app
                        purchase to allow users to... pay for physical goods or services
                        that will be fulfilled outside of the app."
                    """,
                    "evidence": [
                        "Delivery is a physical service fulfilled outside the app",
                        "Rideshare is a physical transportation service",
                        "Food is a physical good delivered outside the app",
                    ],
                },
            },

            "guideline_5_1_1_privacy": {
                "requirement": "Privacy Policy clearly posted and accessible",
                "our_compliance": {
                    "status": "COMPLIANT",
                    "implementation": [
                        "Privacy Policy accessible in app (Settings > Privacy Policy)",
                        "Privacy Policy linked in App Store listing",
                        "Privacy Policy on website (dollor.ai/privacy)",
                        "All data collection clearly disclosed",
                    ],
                },
            },

            "guideline_5_1_1_data_collection": {
                "requirement": "Accurately disclose data collection",
                "our_compliance": {
                    "status": "COMPLIANT",
                    "app_privacy_nutrition_label": {
                        "data_used_to_track_you": "None",
                        "data_linked_to_you": [
                            "Contact Info (Name, Email, Phone)",
                            "Location (Precise Location)",
                            "Identifiers (User ID, Device ID)",
                            "Financial Info (Payment Info - via Stripe)",
                        ],
                        "data_not_linked_to_you": [
                            "Usage Data",
                            "Diagnostics",
                        ],
                    },
                },
            },

            "guideline_5_1_2_data_use": {
                "requirement": "Use data only for stated purposes",
                "our_compliance": {
                    "status": "COMPLIANT",
                    "purposes_disclosed": [
                        "Provide Platform services",
                        "Process payments",
                        "Ensure safety and security",
                        "Improve services",
                        "Communicate with users",
                    ],
                },
            },

            "account_deletion_requirement": {
                "requirement": "Apps with account creation must offer account deletion",
                "our_compliance": {
                    "status": "COMPLIANT",
                    "implementation": [
                        "In-app deletion: Settings > Account > Delete Account",
                        "Email deletion: deletion@dollor.ai",
                        "Data deleted within 30 days per Privacy Policy",
                        "User notified of what data is deleted/retained",
                    ],
                },
            },

            "guideline_5_6_developer_conduct": {
                "requirement": "No misleading claims or deceptive practices",
                "our_compliance": {
                    "status": "COMPLIANT",
                    "measures": [
                        "Accurate app description",
                        "Clear pricing disclosure ($0.99 service fee)",
                        "No hidden fees",
                        "Accurate screenshots and previews",
                    ],
                },
            },
        },

        "google_play_store": {
            "privacy_policy": {
                "requirement": "Privacy Policy required for apps collecting data",
                "our_compliance": {
                    "status": "COMPLIANT",
                    "implementation": "Same as Apple - accessible in app and Play Store listing",
                },
            },

            "data_safety_section": {
                "requirement": "Complete Data Safety section",
                "our_compliance": {
                    "status": "COMPLIANT",
                    "disclosures": {
                        "data_collected": ["Location", "Personal info", "Financial info"],
                        "data_shared": ["With other users for service", "With payment processor"],
                        "security_practices": ["Data encrypted in transit", "Data encrypted at rest"],
                        "data_deletion": "Users can request data deletion",
                    },
                },
            },

            "user_data_policy": {
                "requirement": "Handle user data appropriately",
                "our_compliance": {
                    "status": "COMPLIANT",
                    "measures": [
                        "Secure data transmission",
                        "Clear data handling disclosure",
                        "User consent for data collection",
                        "Account deletion option",
                    ],
                },
            },

            "financial_services": {
                "requirement": "Compliance with financial services policies",
                "our_compliance": {
                    "status": "COMPLIANT - EXEMPTION",
                    "reasoning": "We use Stripe for payments, not proprietary payment processing",
                },
            },
        },

        "submission_checklist": {
            "before_submission": [
                "Privacy Policy published and accessible",
                "Terms of Service published and accessible",
                "Account deletion implemented and tested",
                "Data collection accurately described",
                "Screenshots and descriptions accurate",
                "Contact information provided",
                "Support email/URL configured",
            ],
            "metadata_requirements": [
                "App description accurate and non-misleading",
                "Category appropriate (Food & Drink or Travel)",
                "Age rating accurate (17+ if alcohol delivery enabled)",
                "Keywords relevant and non-deceptive",
            ],
        },
    }


# =============================================================================
# INVESTOR METRICS ENDPOINT
# =============================================================================

@router.get("/investor-metrics")
async def get_investor_metrics():
    """
    Key metrics and model information for investors.
    """
    return {
        "company_overview": {
            "name": "Dollor.ai, Inc.",
            "founded": "2024",
            "headquarters": "San Francisco, CA",
            "mission": "Democratize delivery and transportation through peer-to-peer technology",
            "tagline": "Community-powered delivery where everyone wins",
        },

        "business_model": {
            "type": "Two-Sided Marketplace with Platform Fee Revenue",
            "description": """
                Dollor.ai connects customers who need deliveries or rides with independent
                Helpers who provide those services. Unlike traditional gig economy platforms,
                we charge ZERO fees to service providers (Helpers), creating a competitive
                advantage in Helper recruitment and retention.
            """,

            "revenue_streams": {
                "customer_service_fee": {
                    "amount": "$0.99 per request",
                    "description": "Charged when customer posts a delivery/ride request",
                },
                "restaurant_service_fee": {
                    "amount": "$0.99 per order",
                    "description": "Charged when restaurant confirms order for Dollor delivery",
                },
                "helper_fee": {
                    "amount": "$0.00",
                    "description": "ZERO - Helpers keep 100% of service payments",
                },
                "total_per_transaction": "$1.98",
            },

            "unit_economics": {
                "gross_revenue_per_delivery": 1.98,
                "stripe_processing_fee": 0.36,  # ~$0.30 + 2.9%
                "net_revenue_per_delivery": 1.62,
                "gross_margin": "82%",
            },
        },

        "competitive_advantages": {
            "1_helper_economics": {
                "advantage": "Helpers keep 100% of earnings",
                "vs_competitors": "DoorDash/Uber take 15-25% of delivery fees",
                "impact": "Better Helper recruitment, retention, and service quality",
            },
            "2_low_fees": {
                "advantage": "Flat $0.99 fee regardless of order size",
                "vs_competitors": "Competitors charge % of order (often $5-10+)",
                "impact": "More affordable for customers, higher conversion",
            },
            "3_restaurant_friendly": {
                "advantage": "Only $0.99 per order vs. 15-30% commission",
                "vs_competitors": "DoorDash/Uber Eats take 15-30% of food price",
                "impact": "Restaurant profitability preserved, better partnerships",
            },
            "4_legal_structure": {
                "advantage": "P2P marketplace with Section 230 protection",
                "vs_competitors": "Uber/Lyft facing employment classification lawsuits",
                "impact": "Lower legal risk, sustainable business model",
            },
            "5_ai_operations": {
                "advantage": "AI-powered operations reduce overhead",
                "bots": "8 specialized AI bots handle operations",
                "impact": "Lower operating costs, higher margins",
            },
        },

        "market_opportunity": {
            "food_delivery_market": {
                "size_2024": "$350 billion globally",
                "growth_rate": "10% CAGR",
                "us_market": "$45 billion",
            },
            "rideshare_market": {
                "size_2024": "$85 billion globally",
                "growth_rate": "12% CAGR",
                "us_market": "$20 billion",
            },
            "our_target": {
                "initial_focus": "US metro areas",
                "expansion": "Secondary markets underserved by competitors",
                "tam_sam_som": {
                    "tam": "$65 billion (US delivery + rideshare)",
                    "sam": "$15 billion (delivery-focused metros)",
                    "som_year_3": "$150 million (1% of SAM)",
                },
            },
        },

        "ai_infrastructure": {
            "total_bots": 8,
            "bot_summary": {
                "ARIA": "Customer support",
                "DASH": "Driver dispatch",
                "SHIELD": "Fraud detection",
                "FAIR": "Pricing optimization",
                "RESTO": "Restaurant operations",
                "GUIDE": "Driver onboarding",
                "INTEL": "Analytics",
                "COMPLY": "Compliance monitoring",
            },
            "operational_efficiency": "90% of operations automated",
            "human_staff_needed": "Minimal - oversight and escalations only",
        },

        "growth_projections": {
            "disclaimer": "Forward-looking projections, not guarantees",
            "year_1": {
                "target_deliveries": "100,000",
                "revenue": "$198,000",
                "markets": "3 cities",
            },
            "year_2": {
                "target_deliveries": "1,000,000",
                "revenue": "$1,980,000",
                "markets": "15 cities",
            },
            "year_3": {
                "target_deliveries": "5,000,000",
                "revenue": "$9,900,000",
                "markets": "50 cities",
            },
        },

        "funding_use": {
            "technology": "40% - Platform development, AI enhancement",
            "marketing": "30% - User acquisition, market expansion",
            "operations": "20% - Team, legal, compliance",
            "reserve": "10% - Working capital",
        },

        "team_and_ai": {
            "approach": "AI-first company with minimal human headcount",
            "human_team": "Executive team + specialized roles only",
            "ai_team": "8 AI bots handling 90% of operations",
            "scalability": "AI enables rapid scaling without linear headcount growth",
        },

        "legal_and_compliance": {
            "structure": "Delaware C-Corp",
            "legal_model": "Section 230 protected marketplace",
            "employment_model": "All Helpers are independent users, not employees",
            "compliance": "CCPA, GDPR, App Store compliant",
            "insurance": "Platform liability insurance",
        },
    }
