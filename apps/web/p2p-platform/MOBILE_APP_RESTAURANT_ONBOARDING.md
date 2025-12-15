# Restaurant Onboarding - Mobile App Integration Guide

## Overview
This document describes how restaurants onboard through the ZIP vendor management system via iOS/Android mobile applications. The system supports complete restaurant registration, document upload, menu management, and order processing.

## Architecture

```
Mobile App (iOS/Android)
    ↓
API Endpoints (FastAPI)
    ↓
PostgreSQL Database
    ↓
ZIP Integration
```

## Database Schema for Restaurants

### Enhanced Vendor Table
Additional restaurant-specific fields:

| Field | Type | Description |
|-------|------|-------------|
| `restaurant_name` | String | Display name of restaurant |
| `cuisine_type` | String | Indian, Italian, Chinese, etc. |
| `operating_hours` | Text | JSON: {"mon": "9am-10pm", ...} |
| `seating_capacity` | Integer | Number of seats |
| `delivery_available` | Boolean | Offers delivery service |
| `pickup_available` | Boolean | Offers pickup service |
| `average_prep_time` | Integer | Average order prep time (minutes) |
| `latitude` | Float | GPS latitude |
| `longitude` | Float | GPS longitude |
| `food_license` | Boolean | Food license uploaded |
| `food_license_url` | String | Document URL |
| `health_permit` | Boolean | Health permit uploaded |
| `health_permit_url` | String | Document URL |
| `app_registered` | Boolean | Mobile app registered |
| `mobile_device_id` | String | Device identifier |
| `push_token` | String | Push notification token |
| `platform` | String | 'ios' or 'android' |

### Menu Items Table (vendor_menu_items)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `vendor_id` | Integer | Foreign key to vendors |
| `item_name` | String | Menu item name |
| `description` | Text | Item description |
| `category` | String | Appetizers, Main, Desserts, etc. |
| `price` | Float | Item price |
| `is_available` | Boolean | Currently available |
| `is_vegetarian` | Boolean | Vegetarian option |
| `is_vegan` | Boolean | Vegan option |
| `is_gluten_free` | Boolean | Gluten-free option |
| `is_spicy` | Boolean | Contains spice |
| `spice_level` | Integer | 0-5 spice rating |
| `prep_time` | Integer | Preparation time (minutes) |
| `calories` | Integer | Calorie count |
| `image_url` | String | Item image URL |
| `in_stock` | Boolean | In stock |
| `daily_limit` | Integer | Max orders per day |
| `items_sold_today` | Integer | Orders today |

## Mobile App API Endpoints

### 1. Restaurant Registration

**POST** `/api/vendors`

```json
{
  "company_name": "Natraj Restaurant LLC",
  "restaurant_name": "Natraj Indian Cuisine",
  "cuisine_type": "Indian",
  "tax_id": "12-3456789",
  "business_type": "LLC",
  "industry": "Restaurant",
  
  "operating_hours": "{\"mon\":\"11am-10pm\",\"tue\":\"11am-10pm\",\"wed\":\"11am-10pm\",\"thu\":\"11am-10pm\",\"fri\":\"11am-11pm\",\"sat\":\"11am-11pm\",\"sun\":\"11am-10pm\"}",
  "seating_capacity": 50,
  "delivery_available": true,
  "pickup_available": true,
  "average_prep_time": 25,
  
  "contact_name": "Raj Patel",
  "contact_email": "raj@natrajrestaurant.com",
  "contact_phone": "(555) 123-4567",
  
  "street": "123 Main Street",
  "city": "San Francisco",
  "state": "CA",
  "zip_code": "94105",
  "country": "US",
  "latitude": 37.7749,
  "longitude": -122.4194,
  
  "platform": "ios",
  "mobile_device_id": "DEVICE-12345",
  "push_token": "TOKEN-ABC123"
}
```

Response:
```json
{
  "id": 1,
  "vendor_id": "VEN-202411-0001",
  "company_name": "Natraj Restaurant LLC",
  "restaurant_name": "Natraj Indian Cuisine",
  "onboarding_status": "pending",
  "onboarding_phase": "not_started",
  ...
}
```

### 2. Register Mobile App

**POST** `/api/vendors/{vendor_id}/register-app`

```json
{
  "platform": "ios",
  "device_id": "DEVICE-12345",
  "push_token": "TOKEN-ABC123"
}
```

### 3. Upload Documents

**PATCH** `/api/vendors/{vendor_id}/documents`

```json
{
  "w9_form": true,
  "w9_form_url": "https://storage.example.com/docs/w9.pdf",
  "insurance": true,
  "insurance_url": "https://storage.example.com/docs/insurance.pdf",
  "food_license": true,
  "food_license_url": "https://storage.example.com/docs/food-license.pdf",
  "health_permit": true,
  "health_permit_url": "https://storage.example.com/docs/health-permit.pdf"
}
```

### 4. Add Menu Item

**POST** `/api/vendors/{vendor_id}/menu`

```json
{
  "item_name": "Chicken Tikka Masala",
  "description": "Tender chicken pieces in creamy tomato sauce",
  "category": "Main Course",
  "price": 16.99,
  "is_available": true,
  "is_vegetarian": false,
  "is_vegan": false,
  "is_gluten_free": true,
  "is_spicy": true,
  "spice_level": 3,
  "prep_time": 20,
  "calories": 450,
  "image_url": "https://storage.example.com/images/tikka-masala.jpg",
  "in_stock": true,
  "daily_limit": 50
}
```

### 5. Get Restaurant Menu

**GET** `/api/vendors/{vendor_id}/menu?category=Main%20Course&available_only=true`

Response:
```json
[
  {
    "id": 1,
    "vendor_id": 1,
    "item_name": "Chicken Tikka Masala",
    "description": "Tender chicken pieces in creamy tomato sauce",
    "category": "Main Course",
    "price": 16.99,
    "is_available": true,
    "is_vegetarian": false,
    "is_spicy": true,
    "spice_level": 3,
    "prep_time": 20,
    "image_url": "https://storage.example.com/images/tikka-masala.jpg",
    "in_stock": true,
    "items_sold_today": 12
  }
]
```

### 6. Update Menu Item

**PUT** `/api/vendors/{vendor_id}/menu/{item_id}`

```json
{
  "price": 17.99,
  "is_available": false
}
```

### 7. Get Menu Categories

**GET** `/api/vendors/{vendor_id}/menu/categories`

Response:
```json
["Appetizers", "Main Course", "Desserts", "Beverages"]
```

### 8. Check Onboarding Status

**GET** `/api/vendors/{vendor_id}`

Response shows current status and what's needed:
```json
{
  "id": 1,
  "vendor_id": "VEN-202411-0001",
  "onboarding_status": "in_review",
  "onboarding_phase": "documents_pending",
  "w9_form": true,
  "insurance": false,
  "food_license": true,
  "health_permit": false,
  ...
}
```

## Mobile App Onboarding Flow

### Phase 1: Restaurant Registration
1. **User opens app** → Registration screen
2. **Enters basic info**:
   - Restaurant name
   - Cuisine type
   - Contact details
   - Address with GPS coordinates
3. **Submit** → Creates vendor record
4. **Status**: `PENDING`, Phase: `NOT_STARTED`

### Phase 2: Document Upload
1. **Document checklist shown**:
   - [ ] W-9 Form
   - [ ] Insurance Certificate
   - [ ] Food License
   - [ ] Health Permit
2. **User uploads** from camera/gallery
3. **Each upload** → Update document status
4. **All uploaded** → Phase: `DOCUMENTS_PENDING` → `UNDER_REVIEW`

### Phase 3: Menu Setup
1. **Add menu categories**:
   - Appetizers
   - Main Course
   - Desserts
   - Beverages
2. **Add menu items**:
   - Name, description, price
   - Upload food photos
   - Mark dietary options (veg, vegan, gluten-free)
   - Set spice levels
3. **Set availability** and daily limits

### Phase 4: Review & Approval
1. **Admin reviews** documents on web dashboard
2. **Status changes**:
   - `IN_REVIEW` → `APPROVED` ✅
   - Or `IN_REVIEW` → `REJECTED` ❌
3. **Push notification** sent to app
4. **If approved**: Restaurant goes live!

### Phase 5: Live Operations
1. **Receive orders** via push notifications
2. **Update menu** in real-time:
   - Mark items unavailable
   - Update prices
   - Add daily specials
3. **Track performance** score
4. **Manage inventory** (in_stock, daily_limit)

## Mobile App Features

### For Restaurants (Vendors)
✅ Complete onboarding in-app
✅ Upload documents with camera
✅ Build menu with photos
✅ Real-time availability updates
✅ Push notifications for:
   - Status changes
   - New orders
   - Performance alerts
✅ Track onboarding progress
✅ View performance score

### Admin Web Dashboard Features
✅ Review restaurant applications
✅ Verify documents
✅ Approve/reject vendors
✅ View all restaurant menus
✅ Monitor performance
✅ ZIP integration sync

## Database Initialization

Run this to create tables and sample restaurants:

```bash
cd /Users/jeet/doordash-p2p/backend
source venv/bin/activate
python init_vendors.py
```

## Example: Natraj Restaurant Onboarding

```json
{
  "restaurant_name": "Natraj Indian Cuisine",
  "cuisine_type": "Indian",
  "operating_hours": {
    "mon": "11:00am - 10:00pm",
    "tue": "11:00am - 10:00pm",
    "wed": "11:00am - 10:00pm",
    "thu": "11:00am - 10:00pm",
    "fri": "11:00am - 11:00pm",
    "sat": "11:00am - 11:00pm",
    "sun": "11:00am - 10:00pm"
  },
  "seating_capacity": 75,
  "delivery_available": true,
  "pickup_available": true,
  "average_prep_time": 25
}
```

Menu Categories:
- **Appetizers**: Samosa, Pakora, Paneer Tikka
- **Main Course**: Tikka Masala, Biryani, Curry
- **Breads**: Naan, Roti, Paratha
- **Desserts**: Gulab Jamun, Kheer
- **Beverages**: Mango Lassi, Chai

## Next Steps

1. **Build iOS/Android apps** with:
   - Registration forms
   - Camera integration for docs
   - Menu builder with image upload
   - Real-time status tracking

2. **Implement push notifications**
3. **Add order management system**
4. **Create vendor portal dashboard**
5. **Integrate with DoorDash/delivery platforms**

