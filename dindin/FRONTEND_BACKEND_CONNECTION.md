# Frontend-Backend Integration for ZIP Vendor Management

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Apps (iOS/Android)                 │
│              Restaurant Onboarding Interface                 │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST API
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                          │
│                  (main_new.py - Port 3000)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Vendor Management Endpoints:                         │  │
│  │  - POST   /api/vendors (create restaurant)           │  │
│  │  - GET    /api/vendors (list all)                    │  │
│  │  - GET    /api/vendors/{id} (get details)            │  │
│  │  - PUT    /api/vendors/{id} (update)                 │  │
│  │  - PATCH  /api/vendors/{id}/status (update status)   │  │
│  │  - PATCH  /api/vendors/{id}/documents (upload docs)  │  │
│  │  - POST   /api/vendors/{id}/menu (add menu item)     │  │
│  │  - GET    /api/vendors/{id}/menu (get menu)          │  │
│  │  - POST   /api/vendors/{id}/register-app (register)  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Port 5432)                 │
│                    invoice_db                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tables:                                              │  │
│  │  - vendors (restaurant info, status, documents)      │  │
│  │  - vendor_menu_items (menu with prices, dietary)     │  │
│  │  - vendor_purchase_orders (POs)                      │  │
│  │  - users (admin authentication)                      │  │
│  │  - clients, invoices, payments (existing)            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              React Frontend (Port 5173)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Admin Dashboards:                                    │  │
│  │  - ZIP Dashboard (/zip-dashboard)                    │  │
│  │    → Fetches: GET /api/vendors                       │  │
│  │    → Shows: Metrics, charts, activities              │  │
│  │                                                       │  │
│  │  - Vendor Management (/vendor-management)            │  │
│  │    → Fetches: GET /api/vendors                       │  │
│  │    → Shows: Table, filters, CRUD operations          │  │
│  │    → Actions: Approve/reject, view docs, edit        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Frontend → Backend → Database

**No Frontend Database!** The frontend is a client-side React app that:
- Makes HTTP requests to backend API
- Displays data received from backend
- Sends user actions to backend for processing
- All data is stored in PostgreSQL on backend

## Current Status

### ✅ Backend (Fully Built)
- **Database Models**: `vendors`, `vendor_menu_items` tables created
- **API Endpoints**: 15+ endpoints for vendor/menu management
- **Restaurant Fields**: cuisine_type, operating_hours, seating, GPS, food licenses
- **Mobile Integration**: device_id, push_token, platform tracking
- **Document Tracking**: W-9, insurance, food license, health permit
- **Status Workflow**: PENDING → IN_REVIEW → APPROVED/REJECTED

### ✅ Frontend (Just Connected to Backend)
- **ZIP Dashboard**: Now fetches real vendor data from `/api/vendors`
- **Vendor Management**: Now fetches and displays real restaurants
- **Data Mapping**: Backend snake_case → Frontend camelCase
- **Error Handling**: Fallback to empty state if API fails

## How It Works

### 1. Restaurant Registers (Mobile App)
```
Mobile App → POST /api/vendors
{
  "company_name": "Natraj Restaurant",
  "restaurant_name": "Natraj Indian Cuisine",
  "cuisine_type": "Indian",
  "contact_email": "raj@natraj.com",
  ...
}
↓
Backend creates vendor record
↓
Database stores in vendors table
↓
Returns vendor_id: "VEN-202411-0001"
```

### 2. Admin Views Dashboard (Web)
```
User opens http://localhost:5173/zip-dashboard
↓
Frontend: useEffect(() => fetch('/api/vendors'))
↓
Backend: SELECT * FROM vendors
↓
Database returns all vendors
↓
Frontend calculates metrics:
- Active vendors (status=approved)
- Pending approvals (status=pending/in_review)
- Onboarding progress
↓
Displays charts and KPIs
```

### 3. Admin Approves Vendor
```
Admin clicks "Approve" button
↓
Frontend: PATCH /api/vendors/{id}/status
Body: { "status": "approved" }
↓
Backend updates: vendor.onboarding_status = APPROVED
                vendor.approved_at = now()
↓
Database persists change
↓
Backend returns success
↓
Frontend refreshes vendor list
↓
Mobile app receives push notification (TODO)
```

## API Examples

### Create Restaurant from Mobile App
```bash
curl -X POST http://localhost:3000/api/vendors \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Natraj Restaurant LLC",
    "restaurant_name": "Natraj Indian Cuisine",
    "cuisine_type": "Indian",
    "contact_email": "raj@natraj.com",
    "street": "123 Main St",
    "city": "San Francisco",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "platform": "ios"
  }'
```

### Get All Restaurants (Admin Dashboard)
```bash
curl http://localhost:3000/api/vendors
```

Response:
```json
[
  {
    "id": 1,
    "vendor_id": "VEN-202411-0001",
    "company_name": "Natraj Restaurant LLC",
    "restaurant_name": "Natraj Indian Cuisine",
    "cuisine_type": "Indian",
    "onboarding_status": "pending",
    "onboarding_phase": "documents_pending",
    ...
  }
]
```

### Add Menu Item (Mobile App)
```bash
curl -X POST http://localhost:3000/api/vendors/1/menu \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "Butter Chicken",
    "description": "Creamy tomato-based curry",
    "category": "Main Course",
    "price": 16.99,
    "is_vegetarian": false,
    "is_spicy": true,
    "spice_level": 2,
    "prep_time": 20
  }'
```

## Running the Complete System

### 1. Start Backend
```bash
cd /Users/jeet/doordash-p2p/backend
source venv/bin/activate
python init_vendors.py  # Initialize with sample data
python -m uvicorn main_new:app --reload --port 3000
```

### 2. Start Frontend
```bash
cd /Users/jeet/doordash-p2p/frontend
npm run dev  # Runs on port 5173
```

### 3. Access Dashboards
- **ZIP Dashboard**: http://localhost:5173/zip-dashboard
- **Vendor Management**: http://localhost:5173/vendor-management
- **API Docs**: http://localhost:3000/docs

## Frontend Pages Connected to Backend

### ZIP Dashboard (`/zip-dashboard`)
**Displays:**
- Total active vendors (COUNT WHERE status=approved)
- Pending approvals (COUNT WHERE status=pending)
- Onboarding in progress (COUNT WHERE phase!=completed)
- Charts: Vendor status distribution, onboarding stages

**API Calls:**
- `GET /api/vendors` → Calculate all metrics from response

### Vendor Management (`/vendor-management`)
**Displays:**
- Table of all restaurants with filters
- Onboarding status, phase, risk rating
- Document completion progress
- Edit/approve/reject actions

**API Calls:**
- `GET /api/vendors` → Display in table
- `GET /api/vendors/{id}` → View details modal
- `PUT /api/vendors/{id}` → Edit vendor info
- `PATCH /api/vendors/{id}/status` → Approve/reject
- `PATCH /api/vendors/{id}/documents` → Update document checklist

## Database Schema (PostgreSQL)

### vendors Table
```sql
id                    SERIAL PRIMARY KEY
vendor_id             VARCHAR(50) UNIQUE  -- VEN-202411-0001
company_name          VARCHAR(255)
restaurant_name       VARCHAR(255)        -- Display name
cuisine_type          VARCHAR(100)        -- Indian, Italian, etc.
operating_hours       TEXT                -- JSON string
seating_capacity      INTEGER
delivery_available    BOOLEAN
pickup_available      BOOLEAN
contact_email         VARCHAR(255)
contact_phone         VARCHAR(50)
street, city, state   VARCHAR
latitude, longitude   FLOAT               -- GPS coordinates
onboarding_status     ENUM (pending, in_review, approved, rejected)
onboarding_phase      ENUM (not_started, documents_pending, ...)
w9_form               BOOLEAN
food_license          BOOLEAN
health_permit         BOOLEAN
platform              VARCHAR(20)         -- 'ios' or 'android'
mobile_device_id      VARCHAR(255)
created_at            TIMESTAMP
approved_at           TIMESTAMP
```

### vendor_menu_items Table
```sql
id                    SERIAL PRIMARY KEY
vendor_id             INTEGER REFERENCES vendors(id)
item_name             VARCHAR(255)
description           TEXT
category              VARCHAR(100)
price                 FLOAT
is_vegetarian         BOOLEAN
is_vegan              BOOLEAN
is_spicy              BOOLEAN
spice_level           INTEGER (0-5)
prep_time             INTEGER (minutes)
image_url             VARCHAR(500)
in_stock              BOOLEAN
daily_limit           INTEGER
items_sold_today      INTEGER
```

## Next Steps

### For Mobile App Development:
1. **Registration Flow**: Use `POST /api/vendors` with restaurant details
2. **Document Upload**: Use `PATCH /api/vendors/{id}/documents` with URLs
3. **Menu Builder**: Use `POST /api/vendors/{id}/menu` for each item
4. **Status Tracking**: Poll `GET /api/vendors/{id}` to check onboarding progress
5. **Push Notifications**: Send `push_token` in registration, backend triggers on status changes

### For Admin Dashboard:
1. ✅ Data is now connected to backend
2. Add realtime updates (WebSockets or polling)
3. Add bulk approve/reject actions
4. Add document viewer (download from S3/storage)
5. Add analytics filters (date range, cuisine type)

### For Backend:
1. Add file upload endpoints (S3 integration)
2. Add push notification service
3. Add email notifications
4. Add analytics aggregation endpoints
5. Add search/pagination for large vendor lists

## Summary

**Question: "What about frontend database?"**

**Answer:** There is NO frontend database! 

✅ **Frontend** = React app (just HTML/CSS/JS in browser)
✅ **Backend** = FastAPI server with PostgreSQL database
✅ **Data flows**: Frontend ← HTTP API → Backend ← SQL → PostgreSQL

The frontend now fetches real restaurant data from your backend API and displays it in the ZIP Dashboard and Vendor Management screens. All restaurant/vendor data is stored in PostgreSQL on the backend server.
