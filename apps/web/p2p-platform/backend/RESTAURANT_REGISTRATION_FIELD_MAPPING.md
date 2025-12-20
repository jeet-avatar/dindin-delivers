# Restaurant Registration Field Mapping

This document maps all UI fields across iOS, Android, and Web platforms to their corresponding API endpoints and database columns.

## Platform Summary

| Platform | Registration UI | Registration Type | API Endpoint |
|----------|----------------|-------------------|--------------|
| **iOS** | `SignUpView` in `LoginView.swift` | Basic (email, password, restaurant name) | `POST /api/auth/vendor/register` |
| **Android** | N/A (login only) | Via Web Application | N/A |
| **Web** | `RestaurantApplication.tsx` | Full application with documents | `POST /api/vendors/public` |

---

## iOS Restaurant Registration

### SignUpView Fields (LoginView.swift:608-811)

| UI Field | State Variable | API Field | Database Column | Required |
|----------|---------------|-----------|-----------------|----------|
| Restaurant Name | `restaurantName` | `restaurant_name` | `vendors.restaurant_name` | Yes |
| Email | `email` | `email` | `vendors.contact_email` + `users.email` | Yes |
| Password | `password` | `password` | `users.password_hash` (hashed) | Yes |
| Confirm Password | `confirmPassword` | N/A (validation only) | N/A | Yes |

### API Call
```swift
p2pAPI.vendorRegister(email: email, password: password, restaurantName: restaurantName)
```

### Backend Endpoint
```
POST /api/auth/vendor/register
Content-Type: application/json

{
    "email": "restaurant@example.com",
    "password": "SecurePassword123!",
    "full_name": "Restaurant Owner Name",    // Optional
    "restaurant_name": "My Restaurant"       // Optional
}
```

---

## Web Restaurant Registration

### RestaurantApplication.tsx - Multi-Step Form

#### Step 0: Restaurant Details

| UI Field | Form Field | API Field | Database Column | Required |
|----------|-----------|-----------|-----------------|----------|
| Restaurant Name | `restaurantName` | `restaurant_name` | `vendors.restaurant_name` | Yes |
| Cuisine Type | `cuisineType` | `cuisine_type` | `vendors.cuisine_type` | No |
| Contact Name | `contactName` | `contact_name` | `vendors.contact_name` | Yes |
| Email | `contactEmail` | `contact_email` | `vendors.contact_email` | Yes |
| Phone | `contactPhone` | `contact_phone` | `vendors.contact_phone` | No |
| Password | `password` | `password` | `users.password_hash` (hashed) | Yes |
| Confirm Password | `confirmPassword` | N/A (validation) | N/A | Yes |
| Description | `description` | `notes` | `vendors.notes` | No |

#### Step 1: Location

| UI Field | Form Field | API Field | Database Column | Required |
|----------|-----------|-----------|-----------------|----------|
| Street Address | `streetAddress` | `street` | `vendors.street` | Yes |
| City | `city` | `city` | `vendors.city` | Yes |
| State | `state` | `state` | `vendors.state` | Yes |
| ZIP Code | `zipCode` | `zip_code` | `vendors.zip_code` | Yes |
| Latitude | (auto-geocoded) | `latitude` | `vendors.latitude` | No |
| Longitude | (auto-geocoded) | `longitude` | `vendors.longitude` | No |

#### Step 2: Operations

| UI Field | Form Field | API Field | Database Column | Required |
|----------|-----------|-----------|-----------------|----------|
| Seating Capacity | `seatingCapacity` | `seating_capacity` | `vendors.seating_capacity` | No |
| Avg Prep Time | `avgPrepTime` | `average_prep_time` | `vendors.average_prep_time` | No |
| Offer Delivery | `deliveryAvailable` | `delivery_available` | `vendors.delivery_available` | No (default: true) |
| Offer Pickup | `pickupAvailable` | `pickup_available` | `vendors.pickup_available` | No (default: true) |
| Monday Hours | `mondayHours` | `operating_hours` (JSON) | `vendors.operating_hours` | No |
| Tuesday Hours | `tuesdayHours` | `operating_hours` (JSON) | `vendors.operating_hours` | No |
| Wednesday Hours | `wednesdayHours` | `operating_hours` (JSON) | `vendors.operating_hours` | No |
| Thursday Hours | `thursdayHours` | `operating_hours` (JSON) | `vendors.operating_hours` | No |
| Friday Hours | `fridayHours` | `operating_hours` (JSON) | `vendors.operating_hours` | No |
| Saturday Hours | `saturdayHours` | `operating_hours` (JSON) | `vendors.operating_hours` | No |
| Sunday Hours | `sundayHours` | `operating_hours` (JSON) | `vendors.operating_hours` | No |

#### Step 3: Review & Documents (Post-Submission)

| Document Type | Form Field | API Field | Database Column | Required for Approval |
|--------------|-----------|-----------|-----------------|----------------------|
| Food Service License | `food_license` | `food_license` | `vendors.food_license` + `vendors.food_license_url` | Yes |
| Health Permit | `health_permit` | `health_permit` | `vendors.health_permit` + `vendors.health_permit_url` | Yes |
| Business License/W-9 | `business_license` | `w9_form` | `vendors.w9_form` + `vendors.w9_form_url` | Yes |
| Liability Insurance | `liability_insurance` | `insurance` | `vendors.insurance` + `vendors.insurance_url` | Yes |

### API Call (Web Registration)
```
POST /api/vendors/public
Content-Type: application/json

{
    "company_name": "Restaurant Inc",
    "restaurant_name": "My Restaurant",
    "cuisine_type": "Italian",
    "contact_name": "John Doe",
    "contact_email": "john@restaurant.com",
    "contact_phone": "+14155551234",
    "password": "SecurePassword123!",
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94102",
    "operating_hours": "{\"monday\": \"9:00 AM - 10:00 PM\", ...}",
    "seating_capacity": 50,
    "delivery_available": true,
    "pickup_available": true,
    "average_prep_time": 25
}
```

### Document Upload API
```
POST /api/vendors/public/{vendor_id}/documents
Content-Type: multipart/form-data

file: [binary file]
document_type: "food_license" | "health_permit" | "business_license" | "liability_insurance" | "w9_form"
contact_email: "john@restaurant.com"
```

---

## Database Schema - Vendor Table

### Core Fields
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `vendor_id` | INTEGER (computed) | Same as `id`, auto-computed |
| `company_name` | VARCHAR(255) | Company legal name (required) |
| `restaurant_name` | VARCHAR(255) | Restaurant display name |
| `cuisine_type` | VARCHAR(100) | Cuisine category |

### Contact Fields
| Column | Type | Description |
|--------|------|-------------|
| `contact_name` | VARCHAR(255) | Primary contact name |
| `contact_email` | VARCHAR(255) | Contact email |
| `contact_phone` | VARCHAR(50) | Contact phone |
| `contact_title` | VARCHAR(100) | Contact title/role |

### Address Fields
| Column | Type | Description |
|--------|------|-------------|
| `street` | TEXT | Street address |
| `city` | VARCHAR(100) | City |
| `state` | VARCHAR(100) | State |
| `zip_code` | VARCHAR(20) | ZIP code |
| `country` | VARCHAR(100) | Country |
| `latitude` | FLOAT | GPS latitude |
| `longitude` | FLOAT | GPS longitude |

### Operations Fields
| Column | Type | Description |
|--------|------|-------------|
| `operating_hours` | TEXT | JSON string of hours per day |
| `seating_capacity` | INTEGER | Number of seats |
| `delivery_available` | BOOLEAN | Offers delivery |
| `pickup_available` | BOOLEAN | Offers pickup |
| `average_prep_time` | INTEGER | Minutes to prepare |

### Status/Approval Fields
| Column | Type | Description |
|--------|------|-------------|
| `onboarding_status` | ENUM | PENDING, IN_REVIEW, APPROVED, REJECTED, SUSPENDED |
| `onboarding_phase` | ENUM | NOT_STARTED, DOCUMENTS_PENDING, UNDER_REVIEW, COMPLIANCE_CHECK, COMPLETED |
| `approved_at` | DATETIME | When approved |
| `rejection_reason` | TEXT | Reason for rejection |

### Document Fields
| Column | Type | Description |
|--------|------|-------------|
| `w9_form` | BOOLEAN | W-9 uploaded |
| `w9_form_url` | VARCHAR(500) | W-9 file URL |
| `insurance` | BOOLEAN | Insurance cert uploaded |
| `insurance_url` | VARCHAR(500) | Insurance file URL |
| `food_license` | BOOLEAN | Food license uploaded |
| `food_license_url` | VARCHAR(500) | Food license file URL |
| `health_permit` | BOOLEAN | Health permit uploaded |
| `health_permit_url` | VARCHAR(500) | Health permit file URL |

### Verification Fields
| Column | Type | Description |
|--------|------|-------------|
| `verification_id` | VARCHAR(255) | Persona/Onfido inquiry ID |
| `verification_status` | VARCHAR(50) | not_started, pending, verified, rejected |
| `documents_verified` | BOOLEAN | All docs verified |
| `documents_verified_at` | DATETIME | When verified |

### Mobile App Fields
| Column | Type | Description |
|--------|------|-------------|
| `app_registered` | BOOLEAN | Registered via app |
| `mobile_device_id` | VARCHAR(255) | Device ID |
| `push_token` | VARCHAR(500) | FCM/APNs token |
| `platform` | VARCHAR(20) | ios or android |

---

## Admin Approval Workflow

### Web Admin UI (VendorManagement/Main.tsx)

| Tab | Filter | Description |
|-----|--------|-------------|
| All | None | All vendors |
| Onboarding | `onboarding` status | In onboarding process |
| Active | `APPROVED` status | Approved and active |
| Pending Approval | `PENDING` or `IN_REVIEW` | Awaiting admin review |

### Status Transitions
```
PENDING → IN_REVIEW → APPROVED/REJECTED
                    ↓
              SUSPENDED (if issues found)
```

### Admin Actions
| Action | Endpoint | Description |
|--------|----------|-------------|
| View Details | GET `/api/vendors/{id}` | View full vendor profile |
| Approve | PATCH `/api/vendors/{id}/status` | Set status to APPROVED |
| Reject | PATCH `/api/vendors/{id}/status` | Set status to REJECTED with reason |
| Suspend | PATCH `/api/vendors/{id}/status` | Set status to SUSPENDED |

---

## API Endpoint Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/vendor/register` | POST | None | iOS/Android registration |
| `/api/vendor/register` | POST | None | iOS JSON registration (alias) |
| `/api/vendors/public` | POST | None | Web registration |
| `/api/vendors/public/{id}/documents` | POST | Email match | Document upload |
| `/api/vendors/public/{id}/documents` | GET | Email match | Document status |
| `/api/auth/vendor/login` | POST | None | Form-based login |
| `/api/vendor/login` | POST | None | JSON login (iOS) |
| `/api/auth/vendor/google` | POST | None | Google OAuth |
| `/api/auth/vendor/apple-auth` | POST | None | Apple Sign In |
| `/api/vendors` | GET | Admin | List all vendors |
| `/api/vendors/{id}` | GET | Auth | Get vendor details |
| `/api/vendors/{id}/status` | PATCH | Admin | Update status |

---

## Fixes Applied

### Issue: vendor_id Type Mismatch
- **Problem**: Code was generating string vendor_id like "VEN-202512-0001" but database expects Integer
- **Solution**: Removed manual vendor_id generation - it's auto-computed from `id` in the database
- **Files Modified**: `main_new.py` (4 locations)
  - Line ~5880: create_vendor_public
  - Line ~917: vendor_google_auth
  - Line ~987: vendor_apple_auth
  - Line ~6140: create_vendor_public_with_menu
  - Line ~6240: create_vendor (admin)

---

*Last Updated: December 19, 2025*
