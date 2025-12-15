"""
LEGAL TERMS AND CONDITIONS - DOLLOR.AI TRIP BOARD
=================================================

This module provides legally binding terms of service, privacy policy,
and disclaimers for the Trip Board matchmaking service.

LEGAL MODEL: Section 230 CDA Protected Bulletin Board

Dollor.ai operates as an Interactive Computer Service (ICS) under
47 U.S.C. Section 230, providing a platform for user-generated content.
We do not create, edit, or control user content.

This is NOT a Transportation Network Company (TNC).
This is NOT a rideshare service.
This IS a classified advertising / bulletin board service.
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api/legal", tags=["legal"])

# Last updated date for legal documents
LAST_UPDATED = "2024-12-11"
VERSION = "1.1"

# =============================================================================
# TIERED PRICING DISCLOSURE (NEW)
# =============================================================================

TIERED_PRICING_DISCLOSURE = """
DOLLOR.AI TIERED PRICING DISCLOSURE
===================================
Effective: December 11, 2024

FOOD DELIVERY FEES:
-------------------
Order Value          | Customer Fee | Restaurant Fee
---------------------|--------------|---------------
Orders up to $35     | $1.00        | $1.00
Orders $35.01-$70    | $2.00        | $2.00
Orders over $70      | $3.00        | $3.00

RIDESHARE CONNECTION FEES:
--------------------------
Fare Amount          | Platform Fee
---------------------|-------------
Fares up to $15      | $1.00
Fares $15.01-$35     | $2.00
Fares over $35       | $3.00

KEY POINTS:
- All fees are FLAT, not percentage-based
- Drivers receive 100% of fares and 100% of tips
- No hidden fees or surge pricing
- Fees clearly displayed before transaction confirmation

RESTAURANT DELIVERY OPTION:
- Restaurants may self-deliver within 60-second decision window
- Same platform fee applies regardless of delivery method
- Self-delivery keeps food fresher and supports local businesses
"""


# =============================================================================
# TERMS OF SERVICE
# =============================================================================

TERMS_OF_SERVICE = """
DOLLOR.AI TRIP BOARD - TERMS OF SERVICE
========================================
Last Updated: December 10, 2024
Version: 1.0

PLEASE READ THESE TERMS CAREFULLY BEFORE USING THE DOLLOR.AI TRIP BOARD SERVICE.

1. ACCEPTANCE OF TERMS
----------------------
By accessing or using Dollor.ai Trip Board ("Service"), you agree to be bound
by these Terms of Service ("Terms"). If you do not agree to these Terms, you
may not use the Service.

2. NATURE OF SERVICE - IMPORTANT
--------------------------------
DOLLOR.AI IS A CLASSIFIED ADVERTISING SERVICE, NOT A TRANSPORTATION COMPANY.

Dollor.ai Trip Board is a bulletin board / classified advertising platform
that allows users to:
- Post trip listings (like Craigslist classified ads)
- Browse trip listings posted by other users
- Send messages to listing posters
- Connect with other users

DOLLOR.AI DOES NOT:
- Provide, arrange, or guarantee transportation services
- Calculate, suggest, or determine fares or prices
- Process payments between users
- Verify user identities, backgrounds, or driving records
- Inspect vehicles or verify insurance
- Endorse or recommend any user or listing
- Participate in or mediate user arrangements

All transportation arrangements made through connections on this platform are
PRIVATE ARRANGEMENTS between individual users. Dollor.ai is not a party to
any such arrangements.

3. USER-GENERATED CONTENT
-------------------------
All listings, messages, and other content posted on Dollor.ai Trip Board is
created by users, not by Dollor.ai. Under Section 230 of the Communications
Decency Act (47 U.S.C. § 230), Dollor.ai is not liable for user-generated
content.

By posting content, you represent that:
- The content is accurate and truthful
- You have the right to post such content
- The content does not violate any laws or rights of others
- You are solely responsible for the content

Dollor.ai does not pre-screen content but reserves the right to remove any
content that violates these Terms.

4. USER RESPONSIBILITIES
------------------------
As a user, you agree to:
- Provide accurate information
- Use the Service only for lawful purposes
- Not post fraudulent or misleading listings
- Not use the Service to harass, threaten, or harm others
- Not violate any applicable laws or regulations
- Exercise your own judgment when arranging transportation
- Conduct your own verification of other users
- Ensure you have appropriate insurance for any transportation activities
- Comply with all applicable transportation laws and regulations

5. ASSUMPTION OF RISK
---------------------
YOU UNDERSTAND AND AGREE THAT:

a) Dollor.ai does not verify users, drivers, vehicles, or listings
b) You use the Service and contact other users at your own risk
c) Any transportation you arrange is at your own risk
d) Dollor.ai has no control over the quality, safety, or legality of any
   transportation that may result from connections made through the Service
e) You are responsible for your own safety when meeting strangers

YOU ASSUME ALL RISKS ASSOCIATED WITH USING THE SERVICE AND ANY TRANSPORTATION
ARRANGED THROUGH CONNECTIONS MADE ON THE SERVICE.

6. NO TRANSPORTATION SERVICES
-----------------------------
DOLLOR.AI DOES NOT PROVIDE TRANSPORTATION SERVICES.

Dollor.ai is not a Transportation Network Company (TNC) as defined by any
state or federal law. We do not:
- Hold ourselves out as a transportation provider
- Exercise control over drivers or transportation services
- Set fares or receive a portion of transportation fees
- Require or verify driver qualifications
- Provide or require commercial insurance

Any transportation is arranged privately between users. Dollor.ai has no
involvement in, control over, or responsibility for such arrangements.

7. LIMITATION OF LIABILITY
--------------------------
TO THE MAXIMUM EXTENT PERMITTED BY LAW:

a) DOLLOR.AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
   CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE
   OR ANY TRANSPORTATION ARRANGED THROUGH CONNECTIONS MADE ON THE SERVICE.

b) DOLLOR.AI'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED
   TO THE SERVICE SHALL NOT EXCEED $100.

c) DOLLOR.AI IS NOT LIABLE FOR ANY ACTS OR OMISSIONS OF USERS, INCLUDING
   BUT NOT LIMITED TO ANY PERSONAL INJURY, PROPERTY DAMAGE, OR OTHER HARM
   ARISING FROM TRANSPORTATION ARRANGED THROUGH THE SERVICE.

8. INDEMNIFICATION
------------------
You agree to indemnify, defend, and hold harmless Dollor.ai, its officers,
directors, employees, and agents from any claims, damages, losses, or expenses
(including attorney's fees) arising from:
- Your use of the Service
- Your violation of these Terms
- Your violation of any rights of another
- Any transportation you arrange or provide
- Any content you post on the Service

9. SECTION 230 NOTICE
---------------------
Under Section 230 of the Communications Decency Act (47 U.S.C. § 230),
Dollor.ai is an Interactive Computer Service (ICS) provider. As such:

"No provider or user of an interactive computer service shall be treated
as the publisher or speaker of any information provided by another
information content provider."

Dollor.ai does not create or develop the content of user listings. All
content is provided by users, and Dollor.ai is not responsible for such
content.

10. DISPUTE RESOLUTION
----------------------
Any dispute arising from these Terms or your use of the Service shall be
resolved through binding arbitration in accordance with the rules of the
American Arbitration Association. The arbitration shall take place in
Los Angeles, California.

CLASS ACTION WAIVER: You agree that any arbitration will be conducted on
an individual basis and not as a class action or representative action.

11. GOVERNING LAW
-----------------
These Terms shall be governed by the laws of the State of California,
without regard to conflicts of law principles.

12. MODIFICATIONS
-----------------
Dollor.ai may modify these Terms at any time. Continued use of the Service
after modifications constitutes acceptance of the modified Terms.

13. CONTACT
-----------
For questions about these Terms, contact:
legal@dollor.ai

DOLLOR.AI, INC.
[Address]

BY USING DOLLOR.AI TRIP BOARD, YOU ACKNOWLEDGE THAT YOU HAVE READ,
UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
"""


# =============================================================================
# PRIVACY POLICY
# =============================================================================

PRIVACY_POLICY = """
DOLLOR.AI TRIP BOARD - PRIVACY POLICY
=====================================
Last Updated: December 10, 2024
Version: 1.0

1. INFORMATION WE COLLECT
-------------------------
We collect information you provide when using the Service, including:
- Name, email address, and phone number (when you create listings)
- Trip listing information (origin, destination, dates, prices)
- Messages you send through the Service
- Device information and IP addresses
- Usage data and analytics

2. HOW WE USE INFORMATION
-------------------------
We use your information to:
- Provide and improve the Service
- Display your listings to other users
- Facilitate communication between users
- Send service-related notifications
- Comply with legal obligations
- Protect against fraud and abuse

3. INFORMATION SHARING
----------------------
We share your information:
- With other users: Your listing information is visible to other users.
  Contact information is masked until you choose to share it.
- With service providers who assist in operating the Service
- When required by law or to protect our rights
- In connection with a business transfer

We do NOT sell your personal information.

4. DATA SECURITY
----------------
We implement reasonable security measures to protect your information.
However, no internet transmission is completely secure.

5. YOUR RIGHTS
--------------
You may:
- Access your personal information
- Request correction of your information
- Request deletion of your information
- Opt out of marketing communications

6. CALIFORNIA PRIVACY RIGHTS
----------------------------
California residents have additional rights under the CCPA, including:
- Right to know what information is collected
- Right to delete personal information
- Right to opt out of sale of personal information (we do not sell data)
- Right to non-discrimination

7. CONTACT
----------
For privacy questions, contact:
privacy@dollor.ai
"""


# =============================================================================
# SAFETY GUIDELINES
# =============================================================================

SAFETY_GUIDELINES = """
DOLLOR.AI TRIP BOARD - SAFETY GUIDELINES
========================================

YOUR SAFETY IS YOUR RESPONSIBILITY. Please read and follow these guidelines.

BEFORE ARRANGING A TRIP:
------------------------
1. VERIFY THE PERSON
   - Ask for verification of identity
   - Request social media profiles or LinkedIn
   - Video call before meeting in person
   - Trust your instincts - if something feels off, don't proceed

2. CHECK DRIVING CREDENTIALS
   - Ask to see a valid driver's license
   - Ask about vehicle insurance
   - Ask about driving history

3. SHARE YOUR PLANS
   - Tell a friend or family member your plans
   - Share the driver's name and contact information
   - Share your expected route and arrival time

WHEN MEETING:
-------------
1. MEET IN A PUBLIC PLACE
   - Arrange to meet at a well-lit, public location
   - Don't share your home address until you feel comfortable
   - Have a backup plan if things don't feel right

2. VERIFY THE VEHICLE
   - Check that the vehicle matches the description
   - Note the license plate number
   - Check the condition of the vehicle

3. STAY CONNECTED
   - Keep your phone charged
   - Share your live location with someone you trust
   - Have emergency contacts ready

DURING THE TRIP:
----------------
1. TRUST YOUR INSTINCTS
   - If you feel uncomfortable, ask to be dropped off
   - Don't hesitate to end the trip early
   - Call 911 if you feel in danger

2. STAY ALERT
   - Be aware of the route being taken
   - Keep valuables secure
   - Avoid sharing personal financial information

AFTER THE TRIP:
---------------
1. PROVIDE FEEDBACK
   - Report any concerning behavior
   - Help other users make informed decisions
   - Block users you don't want to contact you again

EMERGENCY:
----------
If you are in immediate danger, call 911.

REMEMBER: Dollor.ai is a bulletin board service. We do not verify users,
drivers, or vehicles. Your safety is your responsibility. Use common sense
and take appropriate precautions when meeting strangers.
"""


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.get("/terms-of-service")
async def get_terms_of_service():
    """Get the full Terms of Service"""
    return {
        "title": "Terms of Service",
        "version": VERSION,
        "last_updated": LAST_UPDATED,
        "content": TERMS_OF_SERVICE,
        "acceptance_required": True,
        "key_points": [
            "Dollor.ai is a classified advertising service, NOT a transportation company",
            "All listings are user-generated content",
            "Dollor.ai does not verify users, drivers, or vehicles",
            "You assume all risks when arranging transportation",
            "Section 230 CDA protection applies"
        ]
    }


@router.get("/privacy-policy")
async def get_privacy_policy():
    """Get the Privacy Policy"""
    return {
        "title": "Privacy Policy",
        "version": VERSION,
        "last_updated": LAST_UPDATED,
        "content": PRIVACY_POLICY,
        "key_points": [
            "We collect information you provide in listings and messages",
            "We do not sell your personal information",
            "You can request deletion of your data",
            "California residents have additional CCPA rights"
        ]
    }


@router.get("/safety-guidelines")
async def get_safety_guidelines():
    """Get Safety Guidelines for users"""
    return {
        "title": "Safety Guidelines",
        "version": VERSION,
        "last_updated": LAST_UPDATED,
        "content": SAFETY_GUIDELINES,
        "disclaimer": (
            "Dollor.ai is a bulletin board service. We do not verify users, "
            "drivers, or vehicles. Your safety is your responsibility."
        ),
        "key_points": [
            "Verify the person before arranging a trip",
            "Meet in a public place first",
            "Share your plans with someone you trust",
            "Trust your instincts - end the trip if uncomfortable",
            "Call 911 in emergencies"
        ]
    }


@router.get("/legal-summary")
async def get_legal_summary():
    """Get a summary of all legal documents"""
    return {
        "platform_name": "Dollor.ai Trip Board",
        "platform_type": "Classified Advertising / Bulletin Board",
        "legal_protection": "Section 230 Communications Decency Act",
        "not_a_tnc": True,
        "last_updated": LAST_UPDATED,
        "documents": [
            {
                "name": "Terms of Service",
                "endpoint": "/api/legal/terms-of-service",
                "acceptance_required": True
            },
            {
                "name": "Privacy Policy",
                "endpoint": "/api/legal/privacy-policy",
                "acceptance_required": False
            },
            {
                "name": "Safety Guidelines",
                "endpoint": "/api/legal/safety-guidelines",
                "acceptance_required": False
            }
        ],
        "key_disclaimers": [
            "Dollor.ai is NOT a Transportation Network Company (TNC)",
            "Dollor.ai does NOT provide, arrange, or guarantee transportation",
            "All listings are USER-GENERATED content",
            "Dollor.ai does NOT calculate fares or process payments",
            "Dollor.ai does NOT verify users, drivers, or vehicles",
            "All arrangements are PRIVATE matters between individuals",
            "Users assume ALL RISKS when using the Service"
        ],
        "contact": {
            "legal": "legal@dollor.ai",
            "privacy": "privacy@dollor.ai",
            "support": "support@dollor.ai"
        }
    }


@router.get("/section-230-notice")
async def get_section_230_notice():
    """Get the Section 230 CDA notice"""
    return {
        "title": "Section 230 Notice",
        "statute": "47 U.S.C. § 230 - Communications Decency Act",
        "protection_type": "Interactive Computer Service (ICS)",
        "summary": (
            "Dollor.ai Trip Board is an Interactive Computer Service under "
            "Section 230 of the Communications Decency Act. As such, Dollor.ai "
            "is not liable for content posted by users. All trip listings and "
            "messages are user-generated content. Dollor.ai does not create, "
            "edit, develop, or control this content."
        ),
        "statutory_text": (
            '"No provider or user of an interactive computer service shall be '
            'treated as the publisher or speaker of any information provided '
            'by another information content provider." - 47 U.S.C. § 230(c)(1)'
        ),
        "implications": [
            "Dollor.ai is not liable for user-generated trip listings",
            "Dollor.ai is not liable for messages between users",
            "Dollor.ai is not liable for arrangements made by users",
            "Dollor.ai is not the publisher of user content"
        ],
        "user_responsibility": (
            "Users are responsible for their own content and for verifying "
            "information in listings. Dollor.ai does not endorse or verify "
            "any user-generated content."
        )
    }


@router.get("/tiered-pricing")
async def get_tiered_pricing():
    """Get the Tiered Pricing Disclosure"""
    return {
        "title": "Tiered Pricing Disclosure",
        "version": VERSION,
        "last_updated": LAST_UPDATED,
        "content": TIERED_PRICING_DISCLOSURE,
        "food_delivery_tiers": [
            {"order_max": 35.00, "customer_fee": 1.00, "restaurant_fee": 1.00},
            {"order_max": 70.00, "customer_fee": 2.00, "restaurant_fee": 2.00},
            {"order_max": None, "customer_fee": 3.00, "restaurant_fee": 3.00}
        ],
        "rideshare_tiers": [
            {"fare_max": 15.00, "platform_fee": 1.00},
            {"fare_max": 35.00, "platform_fee": 2.00},
            {"fare_max": None, "platform_fee": 3.00}
        ],
        "key_points": [
            "All fees are FLAT, not percentage-based",
            "Drivers receive 100% of fares and 100% of tips",
            "No hidden fees or surge pricing on platform fees",
            "Fees clearly displayed before transaction confirmation",
            "Restaurants may self-deliver within 60-second decision window"
        ]
    }
