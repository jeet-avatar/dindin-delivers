# Dollor.ai Rideshare - Complete End-to-End Flow

## Legal Model: Matchmaking Platform (Section 230 Protected)

```
===================================================================================
                    DOLLOR.AI IS NOT A TNC (TRANSPORTATION NETWORK COMPANY)

    We are a MATCHMAKING PLATFORM that connects riders with independent drivers.

    - Platform charges a $1 CONNECTION FEE only
    - Transportation contract is between RIDER and DRIVER directly
    - We are protected under Section 230 of the Communications Decency Act
    - We do NOT set fares, control drivers, or provide transportation services
===================================================================================
```

---

# PART 1: NEW DRIVER REGISTRATION FLOW

## Step 1.1: Driver App Launch Screen

```
┌─────────────────────────────────────────┐
│          [Dollor Driver Logo]           │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │     Earn on Your Schedule       │  │
│    │                                 │  │
│    │  Drive with Dollor and keep     │  │
│    │  100% of your negotiated fare   │  │
│    │                                 │  │
│    │  We only charge $1 per ride     │  │
│    │                                 │  │
│    └─────────────────────────────────┘  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │         Sign Up to Drive        │  │
│    └─────────────────────────────────┘  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │       Sign In (Existing)        │  │
│    └─────────────────────────────────┘  │
│                                         │
│         [Continue with Apple]           │
│         [Continue with Google]          │
│                                         │
└─────────────────────────────────────────┘
```

**API Endpoint:** `POST /api/auth/driver/register`

**Legal Compliance:**
- Clearly states "independent driver" language (not employee)
- Shows $1 platform fee transparency
- Driver keeps 100% of negotiated fare (no commission)

---

## Step 1.2: Driver Registration Form

```
┌─────────────────────────────────────────┐
│  ←  Create Your Driver Account          │
│                                         │
│  First Name                             │
│  ┌─────────────────────────────────┐    │
│  │ John                            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Last Name                              │
│  ┌─────────────────────────────────┐    │
│  │ Smith                           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Email                                  │
│  ┌─────────────────────────────────┐    │
│  │ john.smith@email.com            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Phone                                  │
│  ┌─────────────────────────────────┐    │
│  │ +1 (949) 555-1234               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Password                               │
│  ┌─────────────────────────────────┐    │
│  │ ••••••••••••                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ☑ I agree to the Terms of Service      │
│  ☑ I agree to the Privacy Policy        │
│  ☑ I understand I am an Independent     │
│    Contractor, not an employee          │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │           Continue               │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**API Request:**
```json
POST /api/auth/driver/register
{
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@email.com",
    "phone": "+19495551234",
    "password": "SecurePass123!",
    "tos_accepted": true,
    "privacy_policy_accepted": true,
    "driver_agreement_accepted": true
}
```

**API Response:**
```json
{
    "success": true,
    "driver": {
        "id": 1,
        "driver_id": "DRV-ABC123",
        "email": "john.smith@email.com",
        "status": "pending",
        "onboarding_step": 1,
        "verification_complete": false
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer"
}
```

**Legal Compliance:**
- ☑ Terms of Service acceptance recorded with timestamp
- ☑ Privacy Policy acceptance recorded with timestamp
- ☑ Independent Contractor acknowledgment (critical for AB5/Prop 22)
- All consents stored in `driver_consents` table with IP address

---

## Step 1.3: Document Upload - Driver's License

```
┌─────────────────────────────────────────┐
│  ←  Step 1 of 5: Driver's License       │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │                                 │  │
│    │     [Front of License Photo]    │  │
│    │                                 │  │
│    │         📷 Tap to Upload        │  │
│    │                                 │  │
│    └─────────────────────────────────┘  │
│                                         │
│  Requirements:                          │
│  • Valid US driver's license            │
│  • Not expired                          │
│  • Clear photo of front                 │
│  • All corners visible                  │
│                                         │
│  License Number                         │
│  ┌─────────────────────────────────┐    │
│  │ CA D1234567                     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  License State                          │
│  ┌─────────────────────────────────┐    │
│  │ California                   ▼  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Expiration Date                        │
│  ┌─────────────────────────────────┐    │
│  │ 03/15/2028                      │    │
│  └─────────────────────────────────┘    │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │        Continue to Step 2       │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**API Request:**
```json
PUT /api/drivers/{driver_id}/documents
{
    "document_type": "drivers_license",
    "document_url": "https://s3.../license_front.jpg",
    "license_number": "CA D1234567",
    "license_state": "CA",
    "expiry_date": "2028-03-15"
}
```

**Legal Compliance:**
- License verification required by California PUC (if TNC)
- Since we're matchmaking platform, this is for QUALITY ASSURANCE only
- We RECOMMEND verified drivers but don't mandate TNC compliance

---

## Step 1.4: Vehicle Information

```
┌─────────────────────────────────────────┐
│  ←  Step 2 of 5: Vehicle Details        │
│                                         │
│  Vehicle Make                           │
│  ┌─────────────────────────────────┐    │
│  │ Toyota                       ▼  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Vehicle Model                          │
│  ┌─────────────────────────────────┐    │
│  │ Camry                        ▼  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Year                                   │
│  ┌─────────────────────────────────┐    │
│  │ 2021                         ▼  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Color                                  │
│  ┌─────────────────────────────────┐    │
│  │ Silver                       ▼  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  License Plate                          │
│  ┌─────────────────────────────────┐    │
│  │ 8ABC123                         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Plate State                            │
│  ┌─────────────────────────────────┐    │
│  │ California                   ▼  │    │
│  └─────────────────────────────────┘    │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │        Continue to Step 3       │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**API Request:**
```json
PUT /api/drivers/{driver_id}/vehicle
{
    "vehicle_make": "Toyota",
    "vehicle_model": "Camry",
    "vehicle_year": 2021,
    "vehicle_color": "Silver",
    "license_plate": "8ABC123",
    "license_plate_state": "CA",
    "vehicle_doors": 4,
    "vehicle_seats": 5
}
```

---

## Step 1.5: Insurance Information

```
┌─────────────────────────────────────────┐
│  ←  Step 3 of 5: Insurance              │
│                                         │
│  ⚠️ Important Notice                    │
│  ─────────────────────────────────────  │
│  Dollor.ai recommends drivers carry     │
│  appropriate auto insurance. The        │
│  transportation agreement is between    │
│  you and the rider directly.            │
│  ─────────────────────────────────────  │
│                                         │
│  Insurance Provider                     │
│  ┌─────────────────────────────────┐    │
│  │ State Farm                      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Policy Number                          │
│  ┌─────────────────────────────────┐    │
│  │ 123-456-7890                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Expiration Date                        │
│  ┌─────────────────────────────────┐    │
│  │ 06/15/2025                      │    │
│  └─────────────────────────────────┘    │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │     📷 Upload Insurance Card    │  │
│    └─────────────────────────────────┘  │
│                                         │
│  ☑ I understand that I am responsible   │
│    for maintaining adequate insurance   │
│    coverage for transportation          │
│    services I provide.                  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │        Continue to Step 4       │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**Legal Compliance:**
- Driver acknowledges personal responsibility for insurance
- Platform is NOT providing TNC coverage (key legal distinction)
- Stored in `insurance_disclosure_accepted` with timestamp

---

## Step 1.6: Background Check Consent

```
┌─────────────────────────────────────────┐
│  ←  Step 4 of 5: Background Check       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🔒 Secure Background Check      │    │
│  │                                  │    │
│  │  To ensure rider safety, we      │    │
│  │  conduct background checks via   │    │
│  │  Checkr, Inc.                    │    │
│  │                                  │    │
│  │  This includes:                  │    │
│  │  • Criminal history check        │    │
│  │  • DMV records check             │    │
│  │  • Sex offender registry         │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Full Legal Name (as on ID)             │
│  ┌─────────────────────────────────┐    │
│  │ John Michael Smith              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Date of Birth                          │
│  ┌─────────────────────────────────┐    │
│  │ 05/12/1990                      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  SSN (last 4 digits)                    │
│  ┌─────────────────────────────────┐    │
│  │ ****1234                        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ☑ I authorize Dollor.ai and Checkr    │
│    to conduct a background check        │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │      Authorize & Continue       │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**API Request:**
```json
POST /api/drivers/{driver_id}/background-check/consent
{
    "full_legal_name": "John Michael Smith",
    "date_of_birth": "1990-05-12",
    "ssn_last_four": "1234",
    "background_check_consent": true,
    "consent_signature": "John Michael Smith",
    "consent_timestamp": "2025-12-11T10:30:00Z",
    "ip_address": "192.168.1.1",
    "device_id": "iOS-ABC123"
}
```

**Legal Compliance:**
- FCRA (Fair Credit Reporting Act) compliant consent
- Background check stored separately from PII
- Consent recorded with electronic signature

---

## Step 1.7: Stripe Connect Onboarding (Payout Setup)

```
┌─────────────────────────────────────────┐
│  ←  Step 5 of 5: Get Paid               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  💳 Set Up Your Payments         │    │
│  │                                  │    │
│  │  Receive instant payouts when    │    │
│  │  rides complete. We partner with │    │
│  │  Stripe for secure payments.     │    │
│  │                                  │    │
│  │  You'll earn:                    │    │
│  │  • 100% of negotiated fare       │    │
│  │  • 100% of tips                  │    │
│  │  • Instant deposit available     │    │
│  │                                  │    │
│  │  Platform fee: Only $1 per ride  │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │   Connect Bank Account (Stripe) │  │
│    └─────────────────────────────────┘  │
│                                         │
│    This will open Stripe's secure       │
│    onboarding flow                      │
│                                         │
└─────────────────────────────────────────┘
```

**API Endpoint:**
```json
POST /api/enterprise/stripe/connect/onboard
{
    "entity_type": "driver",
    "entity_id": 1
}

Response:
{
    "account_id": "acct_1ABC123",
    "onboarding_url": "https://connect.stripe.com/express/..."
}
```

**Legal Compliance:**
- Stripe handles KYC/AML compliance
- Driver is a Stripe Express account (1099-K handled by Stripe)
- Clear fee disclosure: $1 per ride only

---

## Step 1.8: Registration Complete

```
┌─────────────────────────────────────────┐
│                                         │
│           ✓ You're All Set!             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                  │    │
│  │  Your application is under       │    │
│  │  review. We'll notify you        │    │
│  │  within 24-48 hours.             │    │
│  │                                  │    │
│  │  Background Check: ⏳ Pending     │    │
│  │  Documents: ✓ Submitted          │    │
│  │  Vehicle: ✓ Submitted            │    │
│  │  Payment: ✓ Connected            │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │        Go to Dashboard          │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

# PART 2: NEW CUSTOMER REGISTRATION FLOW

## Step 2.1: Customer App Launch Screen

```
┌─────────────────────────────────────────┐
│          [Dollor Logo]                  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │    Get a Ride, Your Way         │  │
│    │                                 │  │
│    │  Negotiate directly with        │  │
│    │  drivers. No surge pricing.     │  │
│    │                                 │  │
│    │  Just $1 connection fee.        │  │
│    │                                 │  │
│    └─────────────────────────────────┘  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │      Continue with Apple        │  │
│    └─────────────────────────────────┘  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │      Continue with Google       │  │
│    └─────────────────────────────────┘  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │      Sign Up with Email         │  │
│    └─────────────────────────────────┘  │
│                                         │
│    Already have an account? Sign In     │
│                                         │
└─────────────────────────────────────────┘
```

---

## Step 2.2: Customer Registration

```
┌─────────────────────────────────────────┐
│  ←  Create Account                      │
│                                         │
│  Full Name                              │
│  ┌─────────────────────────────────┐    │
│  │ Sarah Johnson                   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Email                                  │
│  ┌─────────────────────────────────┐    │
│  │ sarah.johnson@email.com         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Phone                                  │
│  ┌─────────────────────────────────┐    │
│  │ +1 (310) 555-6789               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Password                               │
│  ┌─────────────────────────────────┐    │
│  │ ••••••••••••                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ☑ I agree to the Terms of Service      │
│  ☑ I agree to the Privacy Policy        │
│  ☑ I understand that Dollor.ai          │
│    connects me with independent         │
│    drivers and does not provide         │
│    transportation services directly     │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │         Create Account          │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**API Request:**
```json
POST /api/auth/customer/register
{
    "email": "sarah.johnson@email.com",
    "full_name": "Sarah Johnson",
    "phone": "+13105556789",
    "password": "SecurePass456!",
    "tos_accepted": true,
    "privacy_policy_accepted": true,
    "rider_terms_accepted": true
}
```

**API Response:**
```json
{
    "success": true,
    "customer": {
        "id": 1,
        "email": "sarah.johnson@email.com",
        "full_name": "Sarah Johnson"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer"
}
```

**Legal Compliance:**
- ☑ Clear disclosure: Platform connects, doesn't provide transportation
- ☑ Rider Terms acceptance (liability waiver for platform)
- ☑ All consents stored with timestamps and IP addresses

---

# PART 3: RIDE REQUEST - RANCHO SANTA MARGARITA TO LOS ANGELES

## Step 3.1: Home Screen - Enter Destination

```
┌─────────────────────────────────────────┐
│  Good morning, Sarah              👤    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🔍 Where to?                     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     [Map showing RSM area]       │    │
│  │                                  │    │
│  │         📍                       │    │
│  │      You are here                │    │
│  │    RSM, California               │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Recent Destinations                    │
│  ┌─────────────────────────────────┐    │
│  │ 🕐 LAX Airport                   │    │
│  │    1 World Way, Los Angeles      │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 🏢 Downtown LA                   │    │
│  │    633 W 5th St, Los Angeles     │    │
│  └─────────────────────────────────┘    │
│                                         │
│   🏠 Home        🏢 Work       ⭐ Saved  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Step 3.2: Search Destination

```
┌─────────────────────────────────────────┐
│  ←  Enter Destination                   │
│                                         │
│  From                                   │
│  ┌─────────────────────────────────┐    │
│  │ 📍 Current Location             │    │
│  │    30211 Avenida de las Banderas │    │
│  │    Rancho Santa Margarita, CA    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  To                                     │
│  ┌─────────────────────────────────┐    │
│  │ 🔍 Downtown Los Angeles         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Search Results                         │
│  ┌─────────────────────────────────┐    │
│  │ 📍 633 W 5th St                  │    │
│  │    Downtown Los Angeles, CA      │    │
│  │    ~54 miles away                │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 📍 Staples Center                │    │
│  │    1111 S Figueroa St, LA        │    │
│  │    ~52 miles away                │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Step 3.3: Fare Estimate & Confirmation

```
┌─────────────────────────────────────────┐
│  ←  Confirm Your Ride                   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     [Map RSM to Downtown LA]     │    │
│  │                                  │    │
│  │  📍 ─────────────────────── 📍   │    │
│  │  RSM              Downtown LA    │    │
│  │                                  │    │
│  │  Distance: 54.2 miles            │    │
│  │  Est. Time: 55-75 min            │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  FARE BREAKDOWN                  │    │
│  │  ─────────────────────────────   │    │
│  │  Base Fare            $2.00      │    │
│  │  Distance (54.2 mi)   $65.04     │    │
│  │  Time (~65 min)       $9.75      │    │
│  │  ─────────────────────────────   │    │
│  │  Subtotal             $76.79     │    │
│  │  Platform Fee         $1.00      │    │
│  │  Tax (CA 7.75%)       $5.95      │    │
│  │  ═════════════════════════════   │    │
│  │  ESTIMATED TOTAL      $83.74     │    │
│  │                                  │    │
│  │  💡 Drivers see: $76.79          │    │
│  │     (You can negotiate!)         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Special Instructions (optional)        │
│  ┌─────────────────────────────────┐    │
│  │ 2 passengers, 1 suitcase        │    │
│  └─────────────────────────────────┘    │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │       Request Ride $83.74       │  │
│    └─────────────────────────────────┘  │
│                                         │
│  ⓘ Payment will be authorized when a    │
│    driver accepts your ride request.    │
│                                         │
└─────────────────────────────────────────┘
```

**API Request:**
```json
POST /api/erp/rides/request
{
    "customer_name": "Sarah Johnson",
    "customer_email": "sarah.johnson@email.com",
    "customer_phone": "+13105556789",
    "pickup_address": {
        "street": "30211 Avenida de las Banderas",
        "city": "Rancho Santa Margarita",
        "state": "CA",
        "zip": "92688",
        "latitude": 33.6409,
        "longitude": -117.6031
    },
    "dropoff_address": {
        "street": "633 W 5th St",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90071",
        "latitude": 34.0505,
        "longitude": -118.2551
    },
    "notes": "2 passengers, 1 suitcase"
}
```

**API Response:**
```json
{
    "ride_id": 1,
    "ride_number": "RIDE-RSM2LA-001",
    "status": "waiting_for_driver",
    "fare_breakdown": {
        "base_fare": 2.00,
        "distance_miles": 54.2,
        "distance_fee": 65.04,
        "duration_minutes": 65,
        "time_fee": 9.75,
        "surge_multiplier": 1.0,
        "subtotal": 76.79,
        "platform_fee": 1.00,
        "tax_rate": 0.0775,
        "tax_amount": 5.95,
        "total_fare": 83.74,
        "driver_earnings": 76.79
    },
    "estimated_pickup_time": "5-10 minutes",
    "legal_disclosure": "Dollor.ai connects you with independent drivers. The transportation agreement is between you and the driver."
}
```

**Legal Compliance:**
- Clear disclosure that platform connects, doesn't transport
- $1 platform fee is CONNECTION fee, not transportation fee
- Driver earnings shown separately (transparency)
- Tax calculated based on California destination

---

## Step 3.4: Finding a Driver

```
┌─────────────────────────────────────────┐
│                                         │
│        🔄 Finding Your Driver...        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     [Map with pulsing radius]    │    │
│  │                                  │    │
│  │         📍 ● ● ●                │    │
│  │           ●     ●               │    │
│  │         ●   📍   ●              │    │
│  │           ●     ●               │    │
│  │         ● ● ●                   │    │
│  │                                  │    │
│  │  Searching 5 mile radius...      │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📍 Rancho Santa Margarita      │    │
│  │       ↓                          │    │
│  │  📍 Downtown Los Angeles        │    │
│  │                                  │    │
│  │  Fare: $83.74                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  3 drivers nearby viewing your request  │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │         Cancel Request          │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Step 3.5: Driver Accepts (Driver App View)

```
┌─────────────────────────────────────────┐
│  DRIVER APP                     Online 🟢│
│                                         │
│  🔔 NEW RIDE REQUEST                    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                  │    │
│  │  Rancho Santa Margarita          │    │
│  │         ↓                        │    │
│  │  Downtown Los Angeles            │    │
│  │                                  │    │
│  │  Distance: 54.2 miles            │    │
│  │  Est. Time: 55-75 min            │    │
│  │                                  │    │
│  │  ════════════════════════════    │    │
│  │  YOUR EARNINGS: $76.79           │    │
│  │  (Rider pays $83.74 total)       │    │
│  │  ════════════════════════════    │    │
│  │                                  │    │
│  │  Pickup: 0.8 miles (3 min)       │    │
│  │  Notes: 2 passengers, 1 suitcase │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│   ┌──────────────┐ ┌──────────────┐     │
│   │    Decline   │ │    ACCEPT    │     │
│   └──────────────┘ └──────────────┘     │
│                                         │
│         Counter-offer: $__              │
│                                         │
└─────────────────────────────────────────┘
```

**API Request (Driver Accepts):**
```json
POST /api/erp/rides/1/accept
{
    "driver_id": 1,
    "driver_name": "John Smith",
    "driver_phone": "+19495551234",
    "driver_lat": 33.6389,
    "driver_lng": -117.6041
}
```

**API Response:**
```json
{
    "success": true,
    "ride_id": 1,
    "status": "driver_assigned",
    "driver": {
        "id": 1,
        "name": "John Smith",
        "phone": "+19495551234",
        "rating": 4.9,
        "vehicle": {
            "make": "Toyota",
            "model": "Camry",
            "color": "Silver",
            "plate": "8ABC123"
        }
    },
    "eta_minutes": 3,
    "legal_notice": "By accepting, you agree to transport the rider as an independent contractor."
}
```

---

## Step 3.6: Driver Assigned (Customer View)

```
┌─────────────────────────────────────────┐
│  ←  Your Ride                           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     [Map showing driver ETA]     │    │
│  │                                  │    │
│  │    🚗 ─────────→ 📍              │    │
│  │    3 min away                    │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  John is on the way!             │    │
│  │                                  │    │
│  │  [Profile Photo]  ⭐ 4.9 rating  │    │
│  │                                  │    │
│  │  Silver Toyota Camry             │    │
│  │  8ABC123                         │    │
│  │                                  │    │
│  │  📞 Call   💬 Message            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📍 Pickup                       │    │
│  │     30211 Avenida de las Banderas│    │
│  │                                  │    │
│  │  📍 Dropoff                      │    │
│  │     633 W 5th St, Los Angeles    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Total: $83.74                          │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │         Cancel Ride             │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Step 3.7: Payment Authorization

When driver accepts, payment is authorized but NOT captured yet:

**API Request:**
```json
POST /api/erp/rides/1/payment-intent
{
    "amount": 83.74,
    "customer_stripe_id": "cus_ABC123",
    "payment_method_id": "pm_card_visa"
}
```

**Response:**
```json
{
    "success": true,
    "payment_intent_id": "pi_3QST...",
    "status": "requires_capture",
    "amount_authorized": 83.74,
    "message": "Payment authorized. Will be captured when ride completes."
}
```

**Legal Compliance:**
- Payment is only AUTHORIZED, not charged
- Customer can cancel without charge before pickup
- Capture happens only when ride completes

---

## Step 3.8: Ride In Progress

```
┌─────────────────────────────────────────┐
│  ←  Ride in Progress                    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     [Live Map - Route to LA]     │    │
│  │                                  │    │
│  │  📍 RSM                          │    │
│  │    │                             │    │
│  │    │ I-5 N →                    │    │
│  │    │                             │    │
│  │    🚗 ← You are here            │    │
│  │    │                             │    │
│  │    ↓                             │    │
│  │  📍 Downtown LA                  │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                  │    │
│  │  42 min remaining                │    │
│  │  31.5 miles to destination       │    │
│  │                                  │    │
│  │  ────────────────────────────    │    │
│  │  Progress: ████████░░░ 58%       │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Your Driver                            │
│  ┌─────────────────────────────────┐    │
│  │ [Photo] John S.  ⭐ 4.9          │    │
│  │ Silver Toyota Camry - 8ABC123    │    │
│  │                                  │    │
│  │  📞 Call       💬 Message        │    │
│  └─────────────────────────────────┘    │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │       🆘 Safety Center          │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**API (Track Ride):**
```json
GET /api/erp/rides/1/track

Response:
{
    "ride_id": 1,
    "status": "in_progress",
    "driver_location": {
        "latitude": 33.8521,
        "longitude": -117.8234
    },
    "progress_percentage": 58,
    "distance_remaining_miles": 31.5,
    "eta_minutes": 42,
    "route_polyline": "encoded_polyline_string"
}
```

---

## Step 3.9: Ride Complete

```
┌─────────────────────────────────────────┐
│                                         │
│         ✓ You've Arrived!               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                  │    │
│  │  📍 633 W 5th St                 │    │
│  │     Downtown Los Angeles, CA     │    │
│  │                                  │    │
│  │  Trip Duration: 62 minutes       │    │
│  │  Distance: 54.2 miles            │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Rate Your Driver                       │
│                                         │
│  [Photo] John S.                        │
│                                         │
│     ⭐ ⭐ ⭐ ⭐ ⭐                       │
│                                         │
│  Tip John?                              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────────┐       │
│  │ $3 │ │ $5 │ │$10 │ │ Custom │       │
│  └────┘ └────┘ └────┘ └────────┘       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  TRIP SUMMARY                    │    │
│  │  ─────────────────────────────   │    │
│  │  Base Fare            $2.00      │    │
│  │  Distance Fee         $65.04     │    │
│  │  Time Fee             $9.75      │    │
│  │  Subtotal             $76.79     │    │
│  │  Platform Fee         $1.00      │    │
│  │  Tax (CA)             $5.95      │    │
│  │  Tip                  $5.00      │    │
│  │  ═════════════════════════════   │    │
│  │  TOTAL CHARGED        $88.74     │    │
│  │                                  │    │
│  │  Driver received: $81.79         │    │
│  │  (fare + tip)                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │            Done                 │  │
│    └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**API (Complete Ride):**
```json
POST /api/erp/rides/1/complete
{
    "actual_distance_miles": 54.2,
    "actual_duration_minutes": 62,
    "dropoff_latitude": 34.0505,
    "dropoff_longitude": -118.2551,
    "tip_amount": 5.00
}
```

**Response:**
```json
{
    "success": true,
    "ride_id": 1,
    "status": "completed",
    "final_fare": {
        "base_fare": 2.00,
        "distance_fee": 65.04,
        "time_fee": 9.75,
        "subtotal": 76.79,
        "platform_fee": 1.00,
        "tax_amount": 5.95,
        "tip": 5.00,
        "total_charged": 88.74
    },
    "driver_earnings": {
        "fare": 76.79,
        "tip": 5.00,
        "total": 81.79
    },
    "receipt_url": "https://api.dollor.ai/receipts/RIDE-RSM2LA-001.pdf"
}
```

---

# PART 4: MONEY FLOW ARCHITECTURE

## Complete Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOLLOR.AI MONEY FLOW                                 │
│                    RSM to LA Ride ($88.74 with $5 tip)                      │
└─────────────────────────────────────────────────────────────────────────────┘

CUSTOMER PAYMENT ($88.74)
         │
         ▼
┌─────────────────────┐
│   Stripe Payment    │  Customer's card charged via PaymentIntent
│   Intent Capture    │
└─────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STRIPE SPLITS THE PAYMENT                            │
│                                                                              │
│   Total Charge: $88.74                                                       │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐   │
│   │   Driver Gets     │    │  Platform Gets    │    │   Government      │   │
│   │   (Stripe Connect)│    │  (Your Account)   │    │   (Collected)     │   │
│   │                   │    │                   │    │                   │   │
│   │   Fare:   $76.79  │    │   $1.00          │    │   Tax:  $5.95     │   │
│   │   Tip:    $5.00   │    │   Connection Fee  │    │   (CA 7.75%)      │   │
│   │   ─────────────   │    │                   │    │                   │   │
│   │   Total:  $81.79  │    │                   │    │   Remitted to     │   │
│   │                   │    │                   │    │   CA Tax Board    │   │
│   └───────────────────┘    └───────────────────┘    └───────────────────┘   │
│           │                        │                        │               │
│           ▼                        ▼                        ▼               │
│   ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐   │
│   │ Driver's Stripe   │    │  Dollor Platform  │    │  Tax Liability    │   │
│   │ Express Account   │    │  Stripe Account   │    │  Account          │   │
│   │                   │    │                   │    │                   │   │
│   │ acct_DRV123...    │    │ acct_DOLLOR...    │    │ (Monthly remit)   │   │
│   └───────────────────┘    └───────────────────┘    └───────────────────┘   │
│           │                                                                  │
│           ▼                                                                  │
│   ┌───────────────────┐                                                     │
│   │ Driver's Bank     │    Standard payout: T+2 business days               │
│   │ Account           │    Instant payout: Immediate (small fee)            │
│   │                   │                                                      │
│   │ Wells Fargo ****  │                                                      │
│   │ 1234              │                                                      │
│   └───────────────────┘                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


STRIPE PROCESSING FEES (Absorbed by Platform)
═════════════════════════════════════════════
Transaction: $88.74
Stripe Fee: 2.9% + $0.30 = $2.87
Net to distribute: $85.87

Platform receives $1.00 connection fee
Platform pays $2.87 Stripe fee
Platform NET: -$1.87 (negative on this ride)

But at scale with volume discounts and lower % rates,
the $1 fee becomes profitable.
```

## API: Transfer to Driver (Happens Automatically)

```json
POST /api/erp/rides/1/transfer-to-driver

// Internal Stripe API call:
stripe.transfers.create({
    amount: 8179,  // $81.79 in cents
    currency: "usd",
    destination: "acct_DRV123...",
    transfer_group: "RIDE-RSM2LA-001",
    metadata: {
        ride_id: "1",
        fare: 7679,
        tip: 500
    }
});

Response:
{
    "transfer_id": "tr_ABC123...",
    "amount": 81.79,
    "destination_account": "acct_DRV123...",
    "status": "pending",
    "estimated_arrival": "2025-12-13"
}
```

---

# PART 5: LEGAL COMPLIANCE AT EACH STEP

## Legal Framework Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LEGAL COMPLIANCE FRAMEWORK                                │
│                                                                              │
│  1. SECTION 230 PROTECTION (Communications Decency Act)                      │
│     ────────────────────────────────────────────────────                    │
│     • Dollor.ai is an "Interactive Computer Service"                        │
│     • We don't create content - users do                                    │
│     • We provide tools for users to connect                                 │
│     • Protected from liability for user-generated arrangements              │
│                                                                              │
│  2. NOT A TNC (Transportation Network Company)                               │
│     ────────────────────────────────────────────────                        │
│     Why we're NOT a TNC:                                                    │
│     • We don't set fares (drivers and riders negotiate)                     │
│     • We don't control driver schedules                                     │
│     • We don't provide the transportation service                           │
│     • We charge a flat $1 CONNECTION fee, not a % of fare                   │
│     • Drivers are clearly independent contractors                           │
│                                                                              │
│  3. INDEPENDENT CONTRACTOR STATUS (AB5/Prop 22 Compliant)                   │
│     ────────────────────────────────────────────────────                    │
│     ABC Test Compliance:                                                    │
│     A - Driver controls HOW they work (route, vehicle, schedule)            │
│     B - Service is OUTSIDE our usual business (we're tech platform)         │
│     C - Drivers customarily engage in independent driving                   │
│                                                                              │
│  4. CONSENT & DISCLOSURE TRACKING                                            │
│     ────────────────────────────────────────────────                        │
│     All consents stored with:                                               │
│     • Timestamp (UTC)                                                       │
│     • IP Address                                                            │
│     • Device ID                                                             │
│     • Document version hash                                                 │
│     • Electronic signature                                                  │
│                                                                              │
│  5. PAYMENT COMPLIANCE                                                       │
│     ────────────────────────────────────────────────                        │
│     • Stripe handles PCI-DSS compliance                                     │
│     • 1099-K issued by Stripe for drivers earning >$600                     │
│     • Sales tax collected and remitted to state                             │
│     • Clear receipt with all fee breakdowns                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Legal Disclosures Shown to Users

### At Registration:
```
"Dollor.ai is a technology platform that connects riders with independent
transportation providers. We do not provide transportation services.
Any transportation agreement is between you and the driver directly."
```

### At Ride Request:
```
"By requesting a ride, you understand that Dollor.ai facilitates the
connection between you and an independent driver. The transportation
services are provided by the driver, not by Dollor.ai."
```

### At Payment:
```
"The $1.00 platform fee is for the technology service of connecting
you with a driver. All other amounts go directly to your driver."
```

---

# PART 6: SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DOLLOR.AI SYSTEM ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   iOS Customer  │
                    │      App        │
                    │  (SwiftUI)      │
                    └────────┬────────┘
                             │
                             │ HTTPS/TLS 1.3
                             │
┌─────────────────┐          ▼          ┌─────────────────┐
│   iOS Driver    │    ┌─────────────────────────┐        │  Admin Dashboard │
│      App        │───►│     AWS CloudFront      │◄───────│    (React)       │
│  (SwiftUI)      │    │        CDN              │        │                  │
└─────────────────┘    └───────────┬─────────────┘        └─────────────────┘
                                   │
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │        AWS ALB             │
                    │   (Application Load        │
                    │    Balancer)               │
                    │   api.dollor.ai            │
                    └───────────┬─────────────────┘
                                │
                                ▼
                    ┌─────────────────────────────┐
                    │      AWS ECS Fargate        │
                    │   ┌─────────────────────┐   │
                    │   │   Container 1       │   │
                    │   │   (FastAPI)         │   │
                    │   │   Port 8080         │   │
                    │   └─────────────────────┘   │
                    │   ┌─────────────────────┐   │
                    │   │   Container 2       │   │
                    │   │   (FastAPI)         │   │
                    │   │   Port 8080         │   │
                    │   └─────────────────────┘   │
                    │                             │
                    │   Auto-scaling: 2-10 tasks  │
                    └───────────┬─────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│   AWS RDS         │ │   Stripe API      │ │   Google Maps     │
│   PostgreSQL      │ │   (Payments)      │ │   (Distance/ETA)  │
│                   │ │                   │ │                   │
│   - users         │ │   - PaymentIntent │ │   - Geocoding     │
│   - drivers       │ │   - Transfers     │ │   - Directions    │
│   - customers     │ │   - Connect       │ │   - Distance      │
│   - rides         │ │                   │ │     Matrix        │
│   - consents      │ │                   │ │                   │
└───────────────────┘ └───────────────────┘ └───────────────────┘


API ENDPOINTS USED IN THIS FLOW:
═══════════════════════════════════════════════════════════════════════════

DRIVER AUTH:
POST   /api/auth/driver/register       - Register new driver
POST   /api/auth/driver/login          - Driver login
GET    /api/auth/driver/me             - Get driver profile
PUT    /api/auth/driver/online         - Set online status
PUT    /api/auth/driver/location       - Update GPS location

CUSTOMER AUTH:
POST   /api/auth/customer/register     - Register new customer
POST   /api/auth/customer/login        - Customer login
POST   /api/auth/customer/apple        - Apple Sign In
POST   /api/auth/customer/google       - Google Sign In

RIDESHARE:
POST   /api/erp/rides/request          - Request a new ride
GET    /api/erp/rides/{id}/track       - Track ride status
POST   /api/erp/rides/{id}/accept      - Driver accepts ride
POST   /api/erp/rides/{id}/pickup      - Mark picked up
POST   /api/erp/rides/{id}/complete    - Complete ride
POST   /api/erp/rides/{id}/cancel      - Cancel ride

PAYMENTS:
POST   /api/erp/rides/{id}/payment-intent     - Create payment intent
POST   /api/erp/rides/{id}/confirm-payment    - Confirm payment
GET    /api/drivers/{id}/earnings             - Get driver earnings

STRIPE CONNECT:
POST   /api/enterprise/stripe/connect/onboard - Onboard driver to Stripe
GET    /api/enterprise/stripe/connect/status  - Check Stripe account status
```

---

# PART 7: DATABASE SCHEMA (Key Tables)

```sql
-- DRIVERS TABLE (simplified)
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    driver_id VARCHAR(50) UNIQUE NOT NULL,

    -- Personal Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255),

    -- Verification
    drivers_license BOOLEAN DEFAULT FALSE,
    background_check BOOLEAN DEFAULT FALSE,
    insurance BOOLEAN DEFAULT FALSE,

    -- Vehicle
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    vehicle_color VARCHAR(50),
    license_plate VARCHAR(20),

    -- Stripe Connect
    stripe_account_id VARCHAR(255),
    stripe_onboarded BOOLEAN DEFAULT FALSE,

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    verification_complete BOOLEAN DEFAULT FALSE,
    can_accept_rides BOOLEAN DEFAULT FALSE,

    -- Consent Tracking
    tos_accepted BOOLEAN DEFAULT FALSE,
    tos_accepted_at TIMESTAMP,
    privacy_policy_accepted BOOLEAN DEFAULT FALSE,
    driver_agreement_accepted BOOLEAN DEFAULT FALSE,
    background_check_consent BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);

-- CUSTOMERS TABLE
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),

    -- Auth
    password_hash VARCHAR(255),
    apple_user_id VARCHAR(255),
    google_user_id VARCHAR(255),

    -- Payment
    stripe_customer_id VARCHAR(255),

    -- Consent
    tos_accepted BOOLEAN DEFAULT FALSE,
    privacy_policy_accepted BOOLEAN DEFAULT FALSE,
    rider_terms_accepted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);

-- RIDES TABLE
CREATE TABLE rides (
    id SERIAL PRIMARY KEY,
    ride_number VARCHAR(50) UNIQUE NOT NULL,

    -- Customer
    customer_id INTEGER REFERENCES customers(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),

    -- Locations
    pickup_street TEXT,
    pickup_city VARCHAR(100),
    pickup_state VARCHAR(100),
    pickup_lat FLOAT,
    pickup_lng FLOAT,
    dropoff_street TEXT,
    dropoff_city VARCHAR(100),
    dropoff_state VARCHAR(100),
    dropoff_lat FLOAT,
    dropoff_lng FLOAT,

    -- Trip Details
    distance_miles FLOAT DEFAULT 0.0,
    duration_minutes FLOAT DEFAULT 0.0,

    -- Fare (TRANSPARENT BREAKDOWN)
    base_fare FLOAT DEFAULT 2.0,
    distance_fee FLOAT DEFAULT 0.0,
    time_fee FLOAT DEFAULT 0.0,
    surge_multiplier FLOAT DEFAULT 1.0,
    platform_fee FLOAT DEFAULT 1.0,      -- ALWAYS $1
    tax_rate FLOAT DEFAULT 0.0,
    tax_amount FLOAT DEFAULT 0.0,
    tip FLOAT DEFAULT 0.0,
    total_fare FLOAT DEFAULT 0.0,
    driver_earnings FLOAT DEFAULT 0.0,   -- fare + tip (no platform fee)

    -- Driver
    driver_id INTEGER REFERENCES drivers(id),
    driver_name VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'waiting_for_driver',

    -- Payment
    payment_intent_id VARCHAR(255),
    payment_status VARCHAR(50),
    paid_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

---

# PART 8: RECEIPT EXAMPLE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                              DOLLOR.AI                                       │
│                            RIDE RECEIPT                                      │
│                                                                              │
│  Receipt #: RIDE-RSM2LA-001                                                  │
│  Date: December 11, 2025 at 11:42 AM PST                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                              │
│  RIDER                                                                       │
│  Sarah Johnson                                                               │
│  sarah.johnson@email.com                                                     │
│                                                                              │
│  DRIVER                                                                      │
│  John Smith                                                                  │
│  Silver Toyota Camry - 8ABC123                                               │
│  Rating: ⭐ 4.9                                                              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                              │
│  TRIP DETAILS                                                                │
│                                                                              │
│  Pickup:  30211 Avenida de las Banderas                                     │
│           Rancho Santa Margarita, CA 92688                                   │
│           10:38 AM                                                           │
│                                                                              │
│  Dropoff: 633 W 5th St                                                       │
│           Los Angeles, CA 90071                                              │
│           11:40 AM                                                           │
│                                                                              │
│  Distance: 54.2 miles                                                        │
│  Duration: 62 minutes                                                        │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                              │
│  FARE BREAKDOWN                                                              │
│                                                                              │
│  Base Fare                                              $2.00                │
│  Distance (54.2 mi × $1.20/mi)                         $65.04               │
│  Time (62 min × $0.15/min)                              $9.75               │
│                                            ─────────────────────            │
│  Subtotal                                              $76.79               │
│                                                                              │
│  Platform Connection Fee                                $1.00               │
│  California Sales Tax (7.75%)                           $5.95               │
│  Tip (Thank you!)                                       $5.00               │
│                                            ═════════════════════            │
│  TOTAL CHARGED                                         $88.74               │
│                                                                              │
│  Payment Method: Visa ****4242                                               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                              │
│  EARNINGS BREAKDOWN                                                          │
│                                                                              │
│  Driver Received:                                                            │
│  • Fare:     $76.79                                                          │
│  • Tip:       $5.00                                                          │
│  • Total:    $81.79                                                          │
│                                                                              │
│  Platform Fee: $1.00 (connection service only)                               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                              │
│  LEGAL NOTICE                                                                │
│                                                                              │
│  Dollor.ai is a technology platform that connects riders with                │
│  independent transportation providers. The transportation service            │
│  was provided by John Smith as an independent contractor, not by             │
│  Dollor.ai. The $1.00 platform fee is for the technology service            │
│  of facilitating this connection.                                            │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                              │
│  Questions? Contact support@dollor.ai                                        │
│  © 2025 Dollor.ai - All Rights Reserved                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 9: E2E TEST VERIFICATION

Run the following to verify the complete flow:

```bash
cd /Users/jeet/StudioProjects/eatfair-ios/dindin/backend
python test_rideshare_e2e.py
```

Expected Output:
```
============================================
    DOLLOR RIDESHARE - END-TO-END TEST
============================================

[1/12] ✓ Health Check PASSED
[2/12] ✓ Driver Registration PASSED
[3/12] ✓ Driver Login PASSED
[4/12] ✓ Customer Registration PASSED
[5/12] ✓ Request Ride (RSM → LA) PASSED
[6/12] ✓ Track Ride PASSED
[7/12] ✓ Driver Accept PASSED
[8/12] ✓ Create Payment Intent PASSED
[9/12] ✓ Confirm Payment PASSED
[10/12] ✓ Complete Ride PASSED
[11/12] ✓ Journal Entry Created PASSED
[12/12] ✓ Driver Earnings Updated PASSED

============================================
    ALL TESTS PASSED - E2E FLOW WORKING
============================================
```

---

# SUMMARY

This document covers the complete end-to-end flow for Dollor.ai rideshare:

1. **Driver Registration** - 5-step onboarding with legal consents
2. **Customer Registration** - Quick signup with liability disclosures
3. **Ride Request** - RSM to LA ($83.74 total, $76.79 to driver)
4. **Payment Flow** - Stripe PaymentIntent → Transfer to Driver's Connect account
5. **Legal Compliance** - Section 230, NOT a TNC, Independent Contractor model
6. **Money Flow** - Transparent $1 platform fee, driver keeps 100% of fare + tips
7. **Architecture** - ECS Fargate, RDS PostgreSQL, Stripe Connect

**Key Legal Protection Points:**
- We're a MATCHMAKING platform, not a TNC
- $1 flat CONNECTION fee (not % of fare)
- Driver is independent contractor
- All consents tracked with timestamps
- Section 230 protection as interactive computer service
