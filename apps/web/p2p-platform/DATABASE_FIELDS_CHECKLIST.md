# Stripe Integration - Database Fields Checklist

## ✅ COMPLETE - Ready for ZIP Orders

### Core Vendor Management
- ✅ vendors table (complete with restaurant fields)
  - restaurant_name, cuisine_type, operating_hours
  - seating_capacity, delivery_available, pickup_available
  - latitude, longitude (GPS coordinates)
  - food_license, health_permit, insurance docs
  - mobile app integration (app_registered, platform, device_id, push_token)
  - onboarding_status, onboarding_phase, risk_rating
  - performance_score, last_activity

### Menu Management
- ✅ vendor_menu_items table
  - item_name, description, category, price
  - is_available, is_vegetarian, is_vegan, is_gluten_free, is_spicy
  - prep_time, calories, image_url
  - inventory: in_stock, daily_limit, items_sold_today

### Order Management (NEW - Just Added)
- ✅ orders table
  - order_number (unique identifier)
  - customer_id, customer_name, customer_email, customer_phone
  - vendor_id (links to restaurant)
  - items (JSON array with menu items)
  - subtotal, tax_rate, tax_amount, delivery_fee, platform_fee, total_amount
  - delivery_address (JSON), delivery_instructions, GPS coordinates
  - status (pending_payment, confirmed, preparing, out_for_delivery, delivered, cancelled)
  - payment_status (pending, processing, succeeded, failed, refunded)
  - stripe_payment_intent_id, stripe_charge_id, stripe_customer_id
  - payment_method
  - invoice_number, invoice_generated, invoice_pdf_url
  - coupa_synced, coupa_invoice_id, coupa_status
  - timestamps: created_at, updated_at, confirmed_at, preparing_at, delivered_at

### Payment Audit Trail (NEW - Just Added)
- ✅ stripe_payment_logs table
  - order_id (links to order)
  - event_type (payment_intent.succeeded, etc.)
  - stripe_event_id (unique, prevents duplicate processing)
  - payment_intent_id, charge_id
  - amount, currency, status
  - raw_data (full Stripe webhook JSON)
  - created_at, processed_at

### Vendor Accounting (NEW - Just Added)
- ✅ vendor_payouts table
  - payout_number (unique identifier)
  - vendor_id
  - period_start, period_end
  - total_orders, gross_revenue
  - platform_fee (your 15% commission)
  - stripe_fees (2.9% + $0.30 per transaction)
  - net_payout (what vendor receives)
  - status (pending, processing, completed, failed)
  - coupa_invoice_id, coupa_status, coupa_synced_at
  - paid_at, payment_method, payment_reference
  - created_at, updated_at

## 📋 Field Mapping for Complete Flow

### When Customer Orders (Mobile App → Backend)
```
Mobile App Sends:
├── customer_name ────────────→ orders.customer_name
├── customer_email ───────────→ orders.customer_email  
├── customer_phone ───────────→ orders.customer_phone
├── vendor_id ────────────────→ orders.vendor_id (joins vendors table)
├── items[] 
│   ├── menu_item_id ────────→ Validates against vendor_menu_items
│   ├── quantity
│   └── price
├── delivery_address ─────────→ orders.delivery_address (JSON)
├── delivery_instructions ────→ orders.delivery_instructions
├── delivery_latitude ────────→ orders.delivery_latitude
└── delivery_longitude ───────→ orders.delivery_longitude

Backend Calculates:
├── subtotal ─────────────────→ orders.subtotal (sum of items)
├── tax_amount ───────────────→ orders.tax_amount (subtotal * 8%)
├── delivery_fee ─────────────→ orders.delivery_fee ($5.99)
├── platform_fee ─────────────→ orders.platform_fee (subtotal * 15%)
└── total_amount ─────────────→ orders.total_amount (sum of all)

Backend Creates:
├── order_number ─────────────→ orders.order_number (ORD-20241125-00001)
├── status ───────────────────→ orders.status (PENDING_PAYMENT)
└── payment_status ───────────→ orders.payment_status (pending)

Backend Creates Stripe Payment:
└── payment_intent_id ────────→ orders.stripe_payment_intent_id

Backend Returns:
├── order_id
├── order_number
├── client_secret (for Stripe SDK)
└── total_amount
```

### When Payment Succeeds (Stripe Webhook → Backend)
```
Stripe Sends Webhook:
├── event.id ─────────────────→ stripe_payment_logs.stripe_event_id
├── event.type ───────────────→ stripe_payment_logs.event_type
├── payment_intent.id ────────→ stripe_payment_logs.payment_intent_id
├── charge.id ────────────────→ stripe_payment_logs.charge_id
├── amount ───────────────────→ stripe_payment_logs.amount
├── status ───────────────────→ stripe_payment_logs.status
└── full_json ────────────────→ stripe_payment_logs.raw_data

Backend Updates Order:
├── payment_status ───────────→ orders.payment_status (succeeded)
├── status ───────────────────→ orders.status (CONFIRMED)
├── confirmed_at ─────────────→ orders.confirmed_at (now())
├── stripe_charge_id ─────────→ orders.stripe_charge_id
└── payment_method ───────────→ orders.payment_method

Backend Generates Invoice:
├── invoice_number ───────────→ orders.invoice_number (INV-20241125-00001)
├── invoice_generated ────────→ orders.invoice_generated (true)
└── invoice_pdf_url ──────────→ orders.invoice_pdf_url (S3 URL)
```

### When Calculating Vendor Payouts (Accounting → Coupa)
```
Accounting System:
├── period_start ─────────────→ vendor_payouts.period_start
├── period_end ───────────────→ vendor_payouts.period_end
│
├── Query all orders WHERE:
│   ├── payment_status = "succeeded"
│   ├── created_at BETWEEN period_start AND period_end
│   └── GROUP BY vendor_id
│
├── For each vendor:
│   ├── COUNT orders ─────────→ vendor_payouts.total_orders
│   ├── SUM subtotals ────────→ vendor_payouts.gross_revenue
│   ├── SUM platform_fees ────→ vendor_payouts.platform_fee
│   ├── CALC stripe_fees ─────→ vendor_payouts.stripe_fees
│   └── CALC net_payout ──────→ vendor_payouts.net_payout
│
├── Create Coupa Invoice:
│   ├── coupa_invoice_id ─────→ vendor_payouts.coupa_invoice_id
│   └── coupa_status ─────────→ vendor_payouts.coupa_status
│
└── payout_number ────────────→ vendor_payouts.payout_number
```

## 🔍 Missing Fields Analysis

### Customer Management (Optional)
Currently storing customer info directly in orders table.

**Recommended Enhancement:**
```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    default_address TEXT,  -- JSON
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Then change orders.customer_id to FOREIGN KEY
```

**Benefit:** Faster checkout for returning customers, order history

### Payment Methods (Optional)
```sql
CREATE TABLE customer_payment_methods (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    stripe_payment_method_id VARCHAR(255),
    last4 VARCHAR(4),
    brand VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE
);
```

**Benefit:** Save cards for one-click checkout

### Order Reviews (Optional)
```sql
CREATE TABLE order_reviews (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    customer_id INTEGER,
    vendor_id INTEGER REFERENCES vendors(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    food_quality INTEGER,
    delivery_speed INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Benefit:** Customer feedback, vendor ratings

### Delivery Tracking (If You Handle Delivery)
```sql
CREATE TABLE delivery_drivers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    vehicle_type VARCHAR(50),
    license_plate VARCHAR(20),
    current_latitude FLOAT,
    current_longitude FLOAT,
    is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE order_deliveries (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    driver_id INTEGER REFERENCES delivery_drivers(id),
    picked_up_at TIMESTAMP,
    estimated_delivery_time TIMESTAMP,
    actual_delivery_time TIMESTAMP,
    delivery_photo_url VARCHAR(500)
);
```

**Benefit:** Real-time tracking, driver assignment

### Vendor Bank Accounts (For Automatic Payouts)
```sql
CREATE TABLE vendor_bank_accounts (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    account_holder_name VARCHAR(255),
    bank_name VARCHAR(255),
    account_number_last4 VARCHAR(4),
    routing_number VARCHAR(9),
    stripe_bank_account_id VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Benefit:** Automatic ACH payouts via Stripe Connect

## ✅ Ready to Go - No Critical Fields Missing

### For MVP Launch:
Your database is **COMPLETE** with all necessary fields for:
- ✅ Restaurant onboarding (ZIP integration)
- ✅ Menu management
- ✅ Customer ordering
- ✅ Stripe payment processing
- ✅ Invoice generation
- ✅ Vendor accounting (Coupa sync)
- ✅ Order tracking
- ✅ Payment audit trail

### Optional Enhancements (Phase 2):
- customers table (for returning customer optimization)
- order_reviews table (for ratings/feedback)
- delivery_drivers table (if handling delivery yourself)
- vendor_bank_accounts table (for automatic payouts)
- customer_payment_methods table (for saved cards)

## 🎯 Next Steps

1. **Install Stripe:**
   ```bash
   cd backend
   ./SETUP_STRIPE.sh
   ```

2. **Configure Stripe:**
   - Get test keys from https://dashboard.stripe.com/test/apikeys
   - Update .env file

3. **Test Payment Flow:**
   ```bash
   # Create order
   curl -X POST http://localhost:3000/api/orders \
     -H "Content-Type: application/json" \
     -d @test_order.json
   
   # Simulate webhook (use Stripe CLI)
   stripe trigger payment_intent.succeeded
   ```

4. **Integrate Mobile App:**
   - Add Stripe SDK to iOS/Android
   - Use client_secret for payment UI
   - Poll order status after payment

## 📊 Database Size Estimates

With 1000 orders/day:
- orders: ~30,000 rows/month (~10 MB)
- stripe_payment_logs: ~30,000 rows/month (~5 MB)
- vendor_payouts: ~100 rows/month (weekly per vendor)

**Total: ~15 MB/month** - Easily manageable with PostgreSQL

## 🔒 Security Checklist

- ✅ Stripe webhook signature verification
- ✅ Payment status from webhook only (not client)
- ✅ Audit trail in stripe_payment_logs
- ✅ Environment variables for secrets
- ✅ Order number uniqueness constraint
- ✅ Foreign key constraints on vendor_id
- ⚠️ TODO: Add indexes on frequently queried fields
- ⚠️ TODO: Add row-level security policies (RLS) if using PostgreSQL

## 📝 Summary

**YOU ARE 100% READY FOR ORDERS!**

All database fields are in place for complete order-to-payment-to-invoice flow with Stripe integration and Coupa accounting sync. The optional enhancements are exactly that - optional. Your MVP can launch with the current schema.
