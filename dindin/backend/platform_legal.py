"""
DOLLOR.AI COMPREHENSIVE LEGAL FRAMEWORK
========================================

This module provides ALL legal terms, agreements, and compliance documents for:
1. FOOD DELIVERY SERVICE - Standard delivery platform model
2. TRIP BOARD SERVICE - Section 230 CDA protected bulletin board
3. DRIVER INDEPENDENT CONTRACTOR AGREEMENT - California AB5 compliant

LEGAL MODELS:
- Food Delivery: Platform operator with independent contractor drivers
- Trip Board: Section 230 Interactive Computer Service (bulletin board)

App Store Compliance:
- Apple Guidelines 5.1.1 (Legal compliance)
- Apple Guidelines 4.2.3 (Business model clarity)
- Privacy manifests (iOS 17+)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import hashlib

router = APIRouter(prefix="/api/platform-legal", tags=["legal"])

# Version tracking for legal documents
LEGAL_VERSION = "2.0"
LAST_UPDATED = "2024-12-10"

# =============================================================================
# FOOD DELIVERY - CUSTOMER TERMS OF SERVICE
# =============================================================================

FOOD_DELIVERY_CUSTOMER_TOS = """
DOLLOR.AI FOOD DELIVERY - CUSTOMER TERMS OF SERVICE
====================================================
Last Updated: December 10, 2024
Version: 2.0

PLEASE READ THESE TERMS CAREFULLY BEFORE USING THE DOLLOR.AI FOOD DELIVERY SERVICE.

1. ACCEPTANCE OF TERMS
----------------------
By downloading, accessing, or using the Dollor.ai application ("App") or services
("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do
not agree to these Terms, do not use the Service.

2. DESCRIPTION OF SERVICE
-------------------------
Dollor.ai provides a food delivery platform that connects customers with
restaurants and independent delivery contractors. The Service includes:
- Browsing restaurant menus and placing food orders
- Real-time order tracking and delivery status
- Payment processing for food orders
- Communication with restaurants and delivery personnel

3. PLATFORM BUSINESS MODEL - $1 DELIVERY
----------------------------------------
Dollor.ai operates on a transparent, low-cost model:
- Platform Fee: $1.00 per order (charged to customer)
- Delivery Fee: Variable based on distance ($2.99 base + mileage)
- Restaurant Commission: $1.00 flat fee per order
- Driver Earnings: Drivers receive delivery fees + 100% of tips
- No hidden fees or surge pricing

4. ORDERING AND PAYMENT
-----------------------
a) Orders: When you place an order, you are making an offer to purchase food from
   the restaurant at the listed price. The order is confirmed when the restaurant
   accepts it.

b) Pricing: All prices are set by restaurants and displayed including applicable
   taxes. Dollor.ai does not control restaurant pricing.

c) Payment: You authorize Dollor.ai to charge your selected payment method for:
   - Food cost (goes to restaurant)
   - Delivery fee (goes to driver)
   - Platform fee (goes to Dollor.ai)
   - Tips (100% goes to driver)
   - Applicable taxes

d) Refunds: Refund policies vary by situation:
   - Order not delivered: Full refund
   - Wrong order: Full refund or redelivery
   - Quality issues: Contact support within 24 hours
   - Late delivery: Case-by-case review

5. DELIVERY
-----------
a) Delivery is performed by INDEPENDENT CONTRACTORS, not Dollor.ai employees.

b) Estimated delivery times are approximate and not guaranteed.

c) You must provide accurate delivery address and contact information.

d) If you are unavailable at delivery time, additional fees may apply for
   re-delivery or the order may be cancelled.

6. RESTAURANTS
--------------
Restaurants on Dollor.ai are independent businesses. Dollor.ai:
- Does NOT own, operate, or control restaurants
- Does NOT prepare food or guarantee food quality
- Does NOT set restaurant prices or menu items
- Is NOT responsible for food allergies or dietary issues

Contact the restaurant directly for specific food questions.

7. ACCOUNT RESPONSIBILITIES
---------------------------
You are responsible for:
- Maintaining accurate account information
- Keeping your login credentials secure
- All activity on your account
- Ensuring you can legally enter into agreements

8. PROHIBITED CONDUCT
--------------------
You agree NOT to:
- Provide false information
- Use the Service for illegal purposes
- Harass drivers, restaurants, or other users
- Attempt to circumvent fees or manipulate the Service
- Use automated systems to access the Service
- Interfere with the proper functioning of the Service

9. LIMITATION OF LIABILITY
--------------------------
TO THE MAXIMUM EXTENT PERMITTED BY LAW:

a) DOLLOR.AI IS NOT LIABLE FOR:
   - Food quality, safety, or preparation by restaurants
   - Actions of independent delivery contractors
   - Delays caused by traffic, weather, or other factors
   - Restaurant closures or menu changes
   - Third-party services (payment processors, etc.)

b) DOLLOR.AI'S TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE
   ORDER IN QUESTION.

c) IN NO EVENT SHALL DOLLOR.AI BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
   CONSEQUENTIAL, OR PUNITIVE DAMAGES.

10. INDEMNIFICATION
-------------------
You agree to indemnify and hold harmless Dollor.ai, its officers, directors,
employees, and agents from any claims arising from your use of the Service.

11. DISPUTE RESOLUTION
----------------------
Any disputes shall be resolved through binding arbitration in Los Angeles,
California, in accordance with AAA rules.

CLASS ACTION WAIVER: You waive any right to participate in class actions.

12. PRIVACY
-----------
Your privacy is important. See our Privacy Policy for details on data collection
and use.

13. MODIFICATIONS
-----------------
Dollor.ai may modify these Terms at any time. Continued use constitutes
acceptance of modified Terms.

14. CONTACT
-----------
Questions: support@dollor.ai
Legal: legal@dollor.ai

DOLLOR.AI, INC.
Los Angeles, California

BY USING DOLLOR.AI, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND
AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
"""

# =============================================================================
# FOOD DELIVERY - RESTAURANT TERMS OF SERVICE
# =============================================================================

FOOD_DELIVERY_RESTAURANT_TOS = """
DOLLOR.AI FOR RESTAURANTS - MERCHANT TERMS OF SERVICE
======================================================
Last Updated: December 10, 2024
Version: 2.0

1. MERCHANT AGREEMENT
---------------------
By registering as a restaurant partner ("Merchant") on Dollor.ai, you agree
to these Merchant Terms of Service.

2. SERVICE DESCRIPTION
----------------------
Dollor.ai provides a platform for restaurants to:
- List menu items for delivery orders
- Receive and manage orders
- Connect with delivery contractors
- Receive payments for food orders

3. COMMISSION STRUCTURE - INDUSTRY'S LOWEST
-------------------------------------------
Dollor.ai charges a FLAT $1.00 commission per order. This is the lowest
commission in the industry compared to:
- DoorDash: 15-30% commission
- Uber Eats: 15-30% commission
- Grubhub: 15-30% commission

Your commission: $1.00 flat, regardless of order size.

4. PAYMENT TERMS
----------------
a) Food Revenue: You receive 100% of menu prices minus $1.00 commission
b) Payment Schedule: Weekly deposits to your bank account
c) Chargebacks: You may be responsible for chargebacks due to:
   - Incorrect orders
   - Missing items
   - Quality issues

5. MENU AND PRICING
-------------------
a) You control your menu items and pricing
b) Prices must be accurate and match in-store pricing
c) You are responsible for updating item availability
d) You must mark items unavailable when out of stock

6. ORDER ACCEPTANCE
-------------------
a) You must accept or reject orders within 5 minutes
b) Failure to respond results in automatic cancellation
c) High cancellation rates may result in account suspension

7. FOOD PREPARATION
-------------------
a) Food must be prepared according to order specifications
b) Food must be ready for pickup within the estimated time
c) You must follow all food safety regulations
d) You are solely responsible for food quality and safety

8. INDEPENDENT CONTRACTOR STATUS
--------------------------------
Delivery is performed by independent contractors. Dollor.ai:
- Does NOT employ delivery personnel
- Does NOT control delivery methods
- Provides a technology platform only

9. REPRESENTATIONS AND WARRANTIES
---------------------------------
You represent and warrant that:
- You have all required licenses and permits
- You comply with food safety regulations
- You have liability insurance
- You will maintain food quality standards

10. TERMINATION
---------------
Either party may terminate with 30 days notice. Dollor.ai may suspend
accounts immediately for Terms violations.

11. LIMITATION OF LIABILITY
---------------------------
Dollor.ai's liability is limited to the commission fees paid in the
prior 12 months.

12. CONTACT
-----------
Merchant Support: merchants@dollor.ai
"""

# =============================================================================
# DRIVER INDEPENDENT CONTRACTOR AGREEMENT (California AB5 Compliant)
# =============================================================================

DRIVER_INDEPENDENT_CONTRACTOR_AGREEMENT = """
DOLLOR.AI DELIVERY PARTNER - INDEPENDENT CONTRACTOR AGREEMENT
=============================================================
Last Updated: December 10, 2024
Version: 2.0

IMPORTANT: THIS AGREEMENT ESTABLISHES AN INDEPENDENT CONTRACTOR RELATIONSHIP,
NOT AN EMPLOYMENT RELATIONSHIP.

1. PARTIES
----------
This Independent Contractor Agreement ("Agreement") is between:
- Dollor.ai, Inc. ("Company")
- You, the Delivery Partner ("Contractor")

2. INDEPENDENT CONTRACTOR STATUS
--------------------------------
You are an INDEPENDENT CONTRACTOR, not an employee. This means:

a) YOU CONTROL YOUR WORK:
   - You choose when to work (no minimum hours required)
   - You choose which deliveries to accept or decline
   - You choose your own routes and methods
   - You can work for competing platforms simultaneously

b) YOU PROVIDE YOUR OWN EQUIPMENT:
   - Your own vehicle (car, bike, scooter, etc.)
   - Your own smartphone
   - Your own insurance

c) NO EMPLOYEE BENEFITS:
   - No health insurance from Dollor.ai
   - No paid time off
   - No workers' compensation
   - No unemployment insurance
   - You are responsible for your own taxes (1099)

3. CALIFORNIA AB5 COMPLIANCE (PROPOSITION 22)
---------------------------------------------
Under California Proposition 22 (passed November 2020), app-based delivery
drivers are classified as independent contractors, not employees, when:

a) The company does not control how you perform your work
b) You can work for competing companies
c) You have freedom to set your own schedule

Dollor.ai complies with Proposition 22 by providing:
- Healthcare subsidy for qualifying contractors (15+ hours/week)
- Occupational accident insurance while on delivery
- Earnings guarantee of 120% of minimum wage while engaged in deliveries
- Vehicle maintenance reimbursement ($0.30/mile)

4. EARNINGS STRUCTURE
---------------------
You earn for each delivery:
- Base Pay: $2.99 per delivery
- Per-Mile Pay: $0.50 per mile
- Tips: 100% of customer tips (always)
- Peak Pay: Additional earnings during busy periods

Dollor.ai does NOT take any percentage of your delivery earnings.

5. DELIVERY REQUIREMENTS
------------------------
When you accept a delivery, you agree to:
- Pick up the order promptly
- Handle food with care
- Deliver to the customer's location
- Complete the delivery within a reasonable time
- Follow food safety guidelines

6. ACCEPTANCE OF DELIVERIES
---------------------------
You have FULL DISCRETION to:
- Accept or decline any delivery offer
- Cancel a delivery before pickup (with valid reason)
- Set your own availability hours
- Work for multiple platforms simultaneously

Your acceptance rate does NOT affect your access to the platform.

7. VEHICLE AND INSURANCE REQUIREMENTS
-------------------------------------
You must maintain:
- Valid driver's license (if using motor vehicle)
- Vehicle registration (if applicable)
- Auto insurance meeting state minimums
- Vehicle in safe working condition

You are solely responsible for your vehicle.

8. TAXES AND REPORTING
----------------------
As an independent contractor:
- You are responsible for all federal, state, and local taxes
- You will receive a 1099-NEC form if you earn $600+ annually
- You may deduct business expenses (mileage, phone, etc.)
- Consider quarterly estimated tax payments

Dollor.ai does NOT withhold taxes from your earnings.

9. BACKGROUND CHECK
-------------------
You consent to a background check including:
- Criminal history
- Driving record (if applicable)
- Identity verification

This is for safety purposes only and does not create an employment relationship.

10. DEACTIVATION
----------------
Your account may be deactivated for:
- Safety violations
- Fraud or theft
- Consistently poor service
- Violation of these terms

You may appeal deactivation through our support process.

11. DISPUTE RESOLUTION
----------------------
Any disputes shall be resolved through binding arbitration.

MUTUAL ARBITRATION AGREEMENT: Both parties agree to resolve disputes through
arbitration rather than court, except for small claims.

12. NO EMPLOYMENT RELATIONSHIP
------------------------------
THIS AGREEMENT DOES NOT CREATE AN EMPLOYMENT RELATIONSHIP.

You understand and agree that:
- You are NOT an employee of Dollor.ai
- Dollor.ai is NOT your employer
- You are an independent business
- You control how you perform your services

13. ENTIRE AGREEMENT
--------------------
This Agreement constitutes the entire agreement between the parties.

14. ACCEPTANCE
--------------
By activating your Delivery Partner account, you acknowledge that you have
read, understood, and agree to this Independent Contractor Agreement.

DOLLOR.AI, INC.
Los Angeles, California
"""

# =============================================================================
# TRIP BOARD - SECTION 230 PROTECTED BULLETIN BOARD
# =============================================================================

TRIP_BOARD_TOS = """
DOLLOR.AI TRIP BOARD - TERMS OF SERVICE
========================================
Last Updated: December 10, 2024
Version: 2.0

*** IMPORTANT LEGAL NOTICE ***
DOLLOR.AI TRIP BOARD IS A CLASSIFIED ADVERTISING SERVICE.
THIS IS NOT A RIDESHARE SERVICE OR TRANSPORTATION COMPANY.

1. NATURE OF SERVICE - CRITICAL DISTINCTION
-------------------------------------------
Dollor.ai Trip Board is a BULLETIN BOARD / CLASSIFIED ADVERTISING platform,
similar to Craigslist's rideshare section. It allows users to:

- Post trip listings (seeking or offering rides)
- Browse listings posted by other users
- Send messages to connect with other users
- Arrange PRIVATE transportation independently

DOLLOR.AI DOES NOT:
- Provide transportation services
- Arrange or guarantee any rides
- Calculate or suggest fares/prices
- Process payments between users
- Verify drivers, passengers, or vehicles
- Background check users
- Provide insurance for rides
- Control or monitor trips

2. SECTION 230 COMMUNICATIONS DECENCY ACT PROTECTION
----------------------------------------------------
Dollor.ai Trip Board operates as an Interactive Computer Service (ICS) under
Section 230 of the Communications Decency Act (47 U.S.C. § 230).

"No provider or user of an interactive computer service shall be treated as
the publisher or speaker of any information provided by another information
content provider." - 47 U.S.C. § 230(c)(1)

ALL LISTINGS AND CONTENT ARE USER-GENERATED. Dollor.ai does not create,
edit, develop, or control user listings.

3. NOT A TRANSPORTATION NETWORK COMPANY (TNC)
---------------------------------------------
Dollor.ai Trip Board is NOT a Transportation Network Company as defined by:
- California Public Utilities Commission
- Any state or federal regulatory agency
- Any local transportation authority

We do NOT:
- Hold out as a transportation provider
- Exercise control over drivers or vehicles
- Set fares or take payment percentages
- Require driver qualifications
- Provide commercial insurance

4. USER-TO-USER TRANSACTIONS
----------------------------
All transportation arrangements are:
- PRIVATE agreements between individual users
- Negotiated directly between users
- Payment handled directly between users (Cash, Venmo, etc.)
- Completely outside of Dollor.ai's involvement

Dollor.ai is NOT a party to any transportation agreement.

5. PLATFORM FEE - MATCH SUCCESS FEE
-----------------------------------
Dollor.ai charges a voluntary "Match Success Fee" of $1.00 from each party
ONLY when both parties confirm a successful match. This fee is for:
- Platform access and maintenance
- Messaging infrastructure
- Listing hosting services

This fee is NOT related to transportation services and does NOT make
Dollor.ai a transportation provider.

6. ASSUMPTION OF RISK
---------------------
YOU UNDERSTAND AND ACCEPT THAT:

a) ALL USERS ARE STRANGERS - Dollor.ai does NOT verify anyone
b) ALL RISK IS YOURS - You meet and travel at your own risk
c) NO SAFETY GUARANTEES - We provide no safety assurances
d) NO RECOURSE THROUGH DOLLOR.AI - Disputes are between users only
e) VERIFY EVERYTHING YOURSELF - Identity, license, insurance, vehicle

YOUR SAFETY IS YOUR SOLE RESPONSIBILITY.

7. SAFETY TOOLS - VOLUNTARY USE
-------------------------------
We provide optional safety tools that users may choose to use:
- Verification codes (to confirm identity in person)
- Recording consent forms (mutual agreement for recordings)
- Pre-trip checklist reminders

These tools are FOR YOUR CONVENIENCE and do NOT:
- Guarantee safety
- Create liability for Dollor.ai
- Make Dollor.ai responsible for user safety
- Verify or validate users

8. PROHIBITED CONTENT
---------------------
Users may NOT post listings that:
- Are fraudulent or misleading
- Offer illegal services
- Involve commercial transportation (taxi/rideshare businesses)
- Solicit illegal activity
- Violate any laws or regulations

Dollor.ai may remove violating content without notice.

9. LIMITATION OF LIABILITY
--------------------------
TO THE FULLEST EXTENT PERMITTED BY LAW:

a) DOLLOR.AI HAS NO LIABILITY FOR:
   - Personal injury or death during transportation
   - Property damage or theft
   - Fraud by other users
   - Any transportation-related incidents
   - Actions or omissions of any user

b) MAXIMUM LIABILITY: $100 total for any claim related to the Service

c) NO LIABILITY FOR TRANSPORTATION: Dollor.ai has ZERO liability for any
   transportation arranged through user connections on the platform

10. INDEMNIFICATION
-------------------
You agree to indemnify and hold harmless Dollor.ai from ANY claims arising
from your use of the Service or any transportation you arrange or provide.

11. ARBITRATION AND CLASS ACTION WAIVER
---------------------------------------
All disputes resolved through binding arbitration in Los Angeles, CA.
YOU WAIVE THE RIGHT TO PARTICIPATE IN CLASS ACTIONS.

12. GOVERNING LAW
-----------------
California law governs. Federal law (Section 230 CDA) provides immunity.

13. CONTACT
-----------
Legal: legal@dollor.ai
Support: support@dollor.ai

DOLLOR.AI, INC.
Los Angeles, California

BY USING TRIP BOARD, YOU ACKNOWLEDGE THIS IS A BULLETIN BOARD SERVICE,
NOT A TRANSPORTATION COMPANY, AND YOU ASSUME ALL RISKS.
"""

# =============================================================================
# PRIVACY POLICY (All Services)
# =============================================================================

PRIVACY_POLICY = """
DOLLOR.AI - PRIVACY POLICY
==========================
Last Updated: December 10, 2024
Version: 2.0

This Privacy Policy applies to all Dollor.ai services including Food Delivery,
Trip Board, and associated applications.

1. INFORMATION WE COLLECT
-------------------------
a) Information You Provide:
   - Name, email address, phone number
   - Delivery addresses
   - Payment information (processed by Stripe)
   - Profile information
   - Messages and communications

b) Automatically Collected:
   - Device information (type, OS, unique identifiers)
   - Location data (with your permission)
   - Usage data and analytics
   - IP address

c) From Third Parties:
   - Authentication providers (Google, Apple Sign-In)
   - Payment processors (Stripe)
   - Background check providers (drivers only)

2. HOW WE USE INFORMATION
-------------------------
- Provide and improve our services
- Process orders and payments
- Enable communication between users
- Ensure safety and security
- Send service-related notifications
- Comply with legal obligations
- Analytics and service improvement

3. INFORMATION SHARING
----------------------
We share information with:
- Restaurants (order details for fulfillment)
- Delivery Partners (delivery information)
- Payment processors (payment processing)
- Service providers (hosting, analytics)
- Law enforcement (when legally required)

We do NOT sell your personal information.

4. LOCATION DATA
----------------
We collect location data to:
- Show nearby restaurants
- Enable delivery tracking
- Optimize delivery routes (drivers)
- Display location in Trip Board listings (with consent)

You can disable location services in your device settings.

5. DATA SECURITY
----------------
We implement industry-standard security measures:
- Encryption in transit (TLS 1.3)
- Encryption at rest
- Access controls and monitoring
- Regular security audits

6. DATA RETENTION
-----------------
We retain data as needed for service provision and legal requirements:
- Account data: Duration of account + 7 years
- Transaction data: 7 years
- Location data: 90 days
- Messages: 1 year

7. YOUR RIGHTS
--------------
You may:
- Access your personal data
- Correct inaccurate data
- Request deletion of your data
- Export your data
- Opt out of marketing communications

8. CALIFORNIA PRIVACY RIGHTS (CCPA)
-----------------------------------
California residents have additional rights:
- Right to know what data is collected
- Right to delete personal information
- Right to opt out of data sales (we don't sell data)
- Right to non-discrimination

To exercise rights: privacy@dollor.ai

9. CHILDREN'S PRIVACY
---------------------
Our services are not intended for children under 18. We do not knowingly
collect information from children.

10. INTERNATIONAL TRANSFERS
---------------------------
Data may be processed in the United States. By using our services, you
consent to this transfer.

11. CHANGES TO POLICY
---------------------
We may update this policy. Significant changes will be notified via email
or in-app notification.

12. CONTACT
-----------
Privacy questions: privacy@dollor.ai
Data Protection Officer: dpo@dollor.ai

DOLLOR.AI, INC.
Los Angeles, California
"""

# =============================================================================
# API ENDPOINTS
# =============================================================================

class LegalDocumentResponse(BaseModel):
    title: str
    version: str
    last_updated: str
    content: str
    acceptance_required: bool
    key_points: List[str]
    document_hash: str

class AcceptanceRequest(BaseModel):
    user_email: str
    document_type: str  # "food_delivery_tos", "trip_board_tos", "driver_agreement", "privacy_policy"
    version: str
    accepted: bool
    ip_address: Optional[str] = None

class AcceptanceResponse(BaseModel):
    success: bool
    message: str
    acceptance_id: str
    timestamp: str

def get_document_hash(content: str) -> str:
    """Generate hash of document content for version verification"""
    return hashlib.sha256(content.encode()).hexdigest()[:16]

# Food Delivery Customer TOS
@router.get("/food-delivery/customer-tos", response_model=LegalDocumentResponse)
async def get_food_delivery_customer_tos():
    """Get Food Delivery Customer Terms of Service"""
    return LegalDocumentResponse(
        title="Food Delivery - Customer Terms of Service",
        version=LEGAL_VERSION,
        last_updated=LAST_UPDATED,
        content=FOOD_DELIVERY_CUSTOMER_TOS,
        acceptance_required=True,
        key_points=[
            "Dollor.ai is a food delivery platform connecting customers, restaurants, and drivers",
            "$1.00 platform fee per order - industry's lowest",
            "Restaurants are independent businesses - not owned by Dollor.ai",
            "Delivery is performed by independent contractors, not employees",
            "Tips go 100% to drivers"
        ],
        document_hash=get_document_hash(FOOD_DELIVERY_CUSTOMER_TOS)
    )

# Food Delivery Restaurant TOS
@router.get("/food-delivery/restaurant-tos", response_model=LegalDocumentResponse)
async def get_food_delivery_restaurant_tos():
    """Get Food Delivery Restaurant Terms of Service"""
    return LegalDocumentResponse(
        title="Food Delivery - Restaurant Terms of Service",
        version=LEGAL_VERSION,
        last_updated=LAST_UPDATED,
        content=FOOD_DELIVERY_RESTAURANT_TOS,
        acceptance_required=True,
        key_points=[
            "$1.00 flat commission per order - industry's lowest",
            "You control your menu and pricing",
            "Weekly payment deposits",
            "Delivery by independent contractors",
            "You are responsible for food quality and safety"
        ],
        document_hash=get_document_hash(FOOD_DELIVERY_RESTAURANT_TOS)
    )

# Driver Independent Contractor Agreement
@router.get("/driver-agreement", response_model=LegalDocumentResponse)
async def get_driver_agreement():
    """Get Driver Independent Contractor Agreement"""
    return LegalDocumentResponse(
        title="Delivery Partner - Independent Contractor Agreement",
        version=LEGAL_VERSION,
        last_updated=LAST_UPDATED,
        content=DRIVER_INDEPENDENT_CONTRACTOR_AGREEMENT,
        acceptance_required=True,
        key_points=[
            "You are an INDEPENDENT CONTRACTOR, not an employee",
            "You control when, where, and how you work",
            "You can work for competing platforms",
            "You receive 100% of tips + delivery fees",
            "California Proposition 22 compliant",
            "You are responsible for your own taxes (1099)"
        ],
        document_hash=get_document_hash(DRIVER_INDEPENDENT_CONTRACTOR_AGREEMENT)
    )

# Trip Board TOS
@router.get("/trip-board-tos", response_model=LegalDocumentResponse)
async def get_trip_board_tos():
    """Get Trip Board Terms of Service"""
    return LegalDocumentResponse(
        title="Trip Board - Terms of Service (Bulletin Board)",
        version=LEGAL_VERSION,
        last_updated=LAST_UPDATED,
        content=TRIP_BOARD_TOS,
        acceptance_required=True,
        key_points=[
            "Trip Board is a BULLETIN BOARD service, NOT a transportation company",
            "Section 230 CDA protection - user-generated content only",
            "Dollor.ai does NOT verify users, vehicles, or arrange transportation",
            "All arrangements are PRIVATE between users",
            "Users assume ALL RISKS - your safety is your responsibility",
            "$1.00 Match Success Fee (voluntary) per confirmed match"
        ],
        document_hash=get_document_hash(TRIP_BOARD_TOS)
    )

# Privacy Policy
@router.get("/privacy-policy", response_model=LegalDocumentResponse)
async def get_privacy_policy():
    """Get Privacy Policy"""
    return LegalDocumentResponse(
        title="Privacy Policy",
        version=LEGAL_VERSION,
        last_updated=LAST_UPDATED,
        content=PRIVACY_POLICY,
        acceptance_required=True,
        key_points=[
            "We collect information to provide and improve services",
            "We do NOT sell your personal information",
            "Location data is used for delivery and nearby search",
            "You can request deletion of your data",
            "California CCPA rights apply"
        ],
        document_hash=get_document_hash(PRIVACY_POLICY)
    )

# Legal Summary
@router.get("/summary")
async def get_legal_summary():
    """Get summary of all legal documents and platform legal structure"""
    return {
        "platform_name": "Dollor.ai",
        "company": "Dollor.ai, Inc.",
        "jurisdiction": "California, USA",
        "last_updated": LAST_UPDATED,
        "version": LEGAL_VERSION,
        
        "services": {
            "food_delivery": {
                "description": "Food delivery platform connecting customers, restaurants, and drivers",
                "legal_model": "Platform operator with independent contractor drivers",
                "customer_tos": "/api/platform-legal/food-delivery/customer-tos",
                "restaurant_tos": "/api/platform-legal/food-delivery/restaurant-tos",
                "driver_agreement": "/api/platform-legal/driver-agreement"
            },
            "trip_board": {
                "description": "Bulletin board for posting and browsing trip listings",
                "legal_model": "Section 230 CDA protected Interactive Computer Service",
                "is_tnc": False,
                "is_rideshare": False,
                "is_bulletin_board": True,
                "terms": "/api/platform-legal/trip-board-tos"
            }
        },
        
        "key_legal_positions": [
            {
                "topic": "Food Delivery - Driver Status",
                "position": "Drivers are independent contractors under California Proposition 22",
                "supporting_factors": [
                    "Drivers control their own schedule",
                    "Drivers can work for competing platforms",
                    "Drivers use their own equipment",
                    "No minimum hours required"
                ]
            },
            {
                "topic": "Trip Board - Platform Liability",
                "position": "Section 230 CDA immunity as Interactive Computer Service",
                "supporting_factors": [
                    "All content is user-generated",
                    "Platform does not create/edit listings",
                    "No control over transportation arrangements",
                    "Users arrange private transportation independently"
                ]
            },
            {
                "topic": "Trip Board - TNC Classification",
                "position": "NOT a Transportation Network Company",
                "supporting_factors": [
                    "Does not provide transportation services",
                    "Does not set fares or pricing",
                    "Does not process payments for rides",
                    "Does not verify drivers or vehicles",
                    "Does not provide commercial insurance"
                ]
            }
        ],
        
        "regulatory_compliance": {
            "california_ab5": "Compliant via Proposition 22",
            "ccpa": "Full compliance with California Consumer Privacy Act",
            "section_230_cda": "Trip Board protected as ICS",
            "pci_dss": "Payment processing via Stripe (PCI compliant)",
            "apple_app_store": "Guidelines 5.1.1 and 4.2.3 compliant"
        },
        
        "contact": {
            "legal": "legal@dollor.ai",
            "privacy": "privacy@dollor.ai",
            "support": "support@dollor.ai"
        }
    }

# App Store Compliance Summary
@router.get("/app-store-compliance")
async def get_app_store_compliance():
    """Get App Store compliance information for review"""
    return {
        "app_name": "Dollor",
        "developer": "Dollor.ai, Inc.",
        "category": "Food & Drink / Lifestyle",
        
        "guideline_compliance": {
            "5.1.1_legal": {
                "status": "COMPLIANT",
                "details": [
                    "Food Delivery: Standard platform model used by DoorDash, Uber Eats",
                    "Trip Board: Section 230 protected bulletin board (like Craigslist)",
                    "Driver classification: California Proposition 22 compliant",
                    "Clear terms of service displayed before use"
                ]
            },
            "4.2.3_minimum_functionality": {
                "status": "COMPLIANT",
                "details": [
                    "Full food ordering and delivery functionality",
                    "Real-time order tracking",
                    "Payment processing",
                    "User messaging"
                ]
            },
            "5.1.2_data_use": {
                "status": "COMPLIANT",
                "details": [
                    "Privacy manifest included",
                    "Location used for delivery/nearby search",
                    "No data sold to third parties",
                    "User consent obtained for data collection"
                ]
            }
        },
        
        "trip_board_clarification": {
            "what_it_is": "A bulletin board/classified ads service for trip listings",
            "what_it_is_not": "A rideshare service or transportation company",
            "comparable_services": [
                "Craigslist Rideshare section",
                "Facebook Marketplace (rideshare listings)",
                "University carpool boards"
            ],
            "section_230_protection": True,
            "no_fare_calculation": True,
            "no_payment_processing_for_rides": True,
            "user_generated_content_only": True
        },
        
        "permissions_justification": {
            "location_when_in_use": "Show nearby restaurants, set delivery address",
            "location_always": "Driver app only - real-time delivery tracking",
            "camera": "Profile photos, payment card scanning",
            "contacts": "Share delivery address from contacts",
            "push_notifications": "Order updates, delivery status"
        }
    }
