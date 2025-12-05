# EatFair iOS Apps - UAT Setup Guide

## Status: Ready for UAT Testing

All three iOS apps are configured and ready for User Acceptance Testing (UAT).

---

## 1. Google Maps API Setup (Required)

### Enable APIs in Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/library
2. Select your project (eatfair-app)
3. Enable these APIs:
   - **Maps SDK for iOS** - For map display
   - **Places API** - For address autocomplete
   - **Directions API** - For route calculation
   - **Distance Matrix API** - For ETA calculations
   - **Geocoding API** - For address lookup

### Configure API Key Restrictions:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your API key: `AIzaSyDuoM1JHPbHWCg-p8mLHjT3K2-TAR66boM`
3. Set Application Restrictions:
   - Select "iOS apps"
   - Add bundle IDs:
     - `com.eatfair.customer`
     - `com.eatfair.restaurant`
     - `com.eatfair.delivery`
4. Set API Restrictions:
   - Select "Restrict key"
   - Add: Maps SDK for iOS, Places API, Directions API, Distance Matrix API, Geocoding API

---

## 2. Database Migration (Required)

Run the SQL migration to add new fields:

```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
psql -U your_user -d invoice_db -f migrations/add_driver_auth_fields.sql
```

---

## 3. Start P2P Backend

```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

Backend will be available at: `http://localhost:3000`

---

## 4. Build & Run iOS Apps

### Customer App:
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer
open eatfaircustomer.xcworkspace
```
Press Cmd+R to build and run.

### Restaurant App:
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant
open eatffairrestaurant.xcworkspace
```
Press Cmd+R to build and run.

### Delivery App:
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery
open eatffairdelivery.xcworkspace
```
Press Cmd+R to build and run.

---

## 5. UAT Test Scenarios

### Customer Flow:
1. Browse restaurants
2. View menu items
3. Add items to cart
4. Enter delivery address (using Google Places autocomplete)
5. Place order
6. Track order on map

### Restaurant Flow:
1. View incoming orders
2. Accept orders
3. Mark as preparing
4. Mark as ready for pickup

### Delivery Flow:
1. Sign up / Login as driver
2. View available orders
3. Accept an order
4. View route on Google Maps
5. Navigate to restaurant
6. Pick up order
7. Navigate to customer
8. Mark as delivered

---

## 6. API Endpoints (P2P Backend)

### Customer App:
- `POST /api/erp/orders/create` - Create new order
- `GET /api/erp/vendors` - List restaurants
- `GET /api/erp/vendors/{id}/menu` - Get restaurant menu

### Restaurant App:
- `GET /api/erp/orders/vendor/{vendor_id}` - Get vendor orders
- `POST /api/erp/orders/{id}/start-preparing` - Start preparing
- `POST /api/erp/orders/{id}/ready-for-pickup` - Mark ready

### Delivery App:
- `POST /api/erp/drivers/register` - Register driver
- `POST /api/erp/drivers/login` - Driver login
- `GET /api/erp/orders/available-for-delivery` - Available orders
- `POST /api/erp/orders/{id}/assign-driver` - Accept order
- `POST /api/erp/orders/{id}/picked-up` - Mark picked up
- `POST /api/erp/orders/{id}/delivered` - Mark delivered
- `PUT /api/erp/orders/{id}/driver-location` - Update location

---

## 7. Next Phase: Payment Integration

After UAT approval, the next phase will add:
- Stripe payment processing
- Payment on order placement
- Driver payouts
- Restaurant payouts
- Transaction history

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        iOS Apps                                  │
├──────────────────┬──────────────────┬──────────────────────────┤
│  Customer App    │  Restaurant App  │     Delivery App         │
│  - Browse menus  │  - Manage orders │  - Accept deliveries     │
│  - Place orders  │  - Update status │  - Track on Google Maps  │
│  - Track orders  │  - View earnings │  - Complete deliveries   │
└────────┬─────────┴────────┬─────────┴────────────┬─────────────┘
         │                  │                       │
         │     EatFairShared (Swift Package)       │
         │     - P2PAPIService                      │
         │     - GoogleMapsService                  │
         │     - Shared Models                      │
         └────────────────────┬────────────────────┘
                              │
         ┌────────────────────▼────────────────────┐
         │           P2P Backend (FastAPI)          │
         │           http://localhost:3000          │
         │                                          │
         │  - Order Management                      │
         │  - Driver Assignment                     │
         │  - Restaurant Coordination               │
         │  - Accounting & Payouts                  │
         └────────────────────┬────────────────────┘
                              │
         ┌────────────────────▼────────────────────┐
         │         PostgreSQL (invoice_db)          │
         │                                          │
         │  Tables: orders, vendors, drivers,       │
         │          vendor_menu_items, payouts...   │
         └─────────────────────────────────────────┘
```

---

## Support

For issues, contact the development team or open a GitHub issue.
