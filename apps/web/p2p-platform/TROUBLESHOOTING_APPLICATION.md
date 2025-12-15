# Restaurant Application Troubleshooting Guide

## Issue: Submit Application Not Working

### Quick Diagnosis Steps

Run these commands in order to diagnose the issue:

### Step 1: Check if Backend is Running
```bash
curl http://localhost:3000/
```

**Expected Response:**
```json
{"message":"Invoice Management System API","version":"1.0.0"}
```

**If you get "Connection refused":**
```bash
cd backend
uvicorn main_new:app --reload --port 3000
```

---

### Step 2: Check if Database is Initialized
```bash
cd backend
python init_db.py
```

This creates all necessary tables including `vendors`.

---

### Step 3: Test the Public Vendor Endpoint
```bash
curl -X POST http://localhost:3000/api/vendors/public \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Restaurant",
    "restaurant_name": "Test Restaurant",
    "cuisine_type": "American",
    "contact_name": "John Doe",
    "contact_email": "test@restaurant.com",
    "contact_phone": "(555) 123-4567",
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94102",
    "seating_capacity": 50,
    "delivery_available": true,
    "pickup_available": true,
    "average_prep_time": 30
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "vendor_id": "VEN-202511-0001",
  "company_name": "Test Restaurant",
  ...
}
```

---

### Step 4: Check PostgreSQL Database
```bash
psql -U postgres -d invoice_db -c "SELECT * FROM vendors;"
```

---

### Step 5: Check Browser Console

1. Open http://localhost:5173/restaurant/apply
2. Open Developer Tools (F12)
3. Go to Console tab
4. Fill out the form and click Submit
5. Look for errors in red

**Common Errors:**

**CORS Error:**
```
Access to XMLHttpRequest at 'http://localhost:3000/api/vendors/public' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Solution:** Backend CORS is already configured for localhost:5173

**Network Error:**
```
POST http://localhost:3000/api/vendors/public net::ERR_CONNECTION_REFUSED
```
**Solution:** Backend is not running. Start it with:
```bash
cd backend
uvicorn main_new:app --reload --port 3000
```

**400 Bad Request:**
```json
{"detail": "Field required"}
```
**Solution:** Check which field is missing in the frontend form

---

### Step 6: Enable Backend Logging

Edit `backend/main_new.py` and add logging to the public endpoint:

```python
@app.post("/api/vendors/public", response_model=VendorResponse)
def create_vendor_public(vendor: VendorCreate, db: Session = Depends(get_db)):
    """Public endpoint for restaurant applications - no auth required"""
    from models import Vendor
    
    print("=" * 50)
    print("PUBLIC VENDOR APPLICATION RECEIVED")
    print(f"Data: {vendor.dict()}")
    print("=" * 50)
    
    # Generate vendor ID
    count = db.query(Vendor).count()
    vendor_id = f"VEN-{datetime.now().year}{datetime.now().month:02d}-{count + 1:04d}"
    
    print(f"Generated vendor_id: {vendor_id}")
    
    try:
        db_vendor = Vendor(
            vendor_id=vendor_id,
            **vendor.dict()
        )
        db.add(db_vendor)
        db.commit()
        db.refresh(db_vendor)
        print(f"✅ Vendor created successfully: {db_vendor.id}")
        return db_vendor
    except Exception as e:
        print(f"❌ Error creating vendor: {str(e)}")
        raise
```

---

### Complete Startup Checklist

**Terminal 1 - Database:**
```bash
# Make sure PostgreSQL is running
pg_ctl status

# If not running:
brew services start postgresql
# OR
pg_ctl -D /usr/local/var/postgres start
```

**Terminal 2 - Backend:**
```bash
cd /Users/jeet/doordash-p2p/backend
source venv/bin/activate  # if using virtual environment
uvicorn main_new:app --reload --port 3000
```

**Terminal 3 - Frontend:**
```bash
cd /Users/jeet/doordash-p2p/frontend
npm run dev
```

**Verify All Running:**
- Backend: http://localhost:3000/docs (should show API documentation)
- Frontend: http://localhost:5173/restaurant/apply
- Database: `psql -U postgres -l` (should list invoice_db)

---

### Manual Database Check

```bash
psql -U postgres -d invoice_db
```

```sql
-- Check if vendors table exists
\dt vendors

-- Check table structure
\d vendors

-- Check if any vendors exist
SELECT id, vendor_id, restaurant_name, contact_email, onboarding_status FROM vendors;

-- Insert test vendor manually
INSERT INTO vendors (
  vendor_id, company_name, restaurant_name, cuisine_type,
  contact_name, contact_email, contact_phone,
  street, city, state, zip_code,
  onboarding_status, onboarding_phase, risk_rating, performance_score,
  created_at
) VALUES (
  'VEN-202511-9999', 'Test Restaurant', 'Test Restaurant', 'American',
  'John Doe', 'test@restaurant.com', '555-1234',
  '123 Main St', 'San Francisco', 'CA', '94102',
  'pending', 'not_started', 'medium', 0,
  NOW()
);
```

---

### If Still Not Working

**Check exact error in terminal where backend is running:**

When you submit the form, you should see a log entry like:
```
INFO:     127.0.0.1:XXXXX - "POST /api/vendors/public HTTP/1.1" 200 OK
```

If you see:
```
INFO:     127.0.0.1:XXXXX - "POST /api/vendors/public HTTP/1.1" 500 Internal Server Error
```

The error details will be printed in the terminal. Share those error messages for further debugging.
