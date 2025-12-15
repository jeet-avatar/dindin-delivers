# Stripe Payment Integration - Complete Guide

## Overview
This document explains the complete order → payment → invoice flow with Stripe integration and Coupa accounting sync.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PAYMENT FLOW                                    │
└─────────────────────────────────────────────────────────────────────────┘

1. MOBILE APP (Customer Orders Food)
   ↓
   POST /api/orders
   {
     customer_name, email, phone
     vendor_id
     items: [{menu_item_id, quantity}]
     delivery_address
   }

2. BACKEND (Create Order + Payment Intent)
   ↓
   - Validates vendor and menu items
   - Calculates: subtotal, tax (8%), delivery fee ($5.99), platform fee (15%)
   - Creates Order record (status: PENDING_PAYMENT)
   - Creates Stripe PaymentIntent
   ↓
   Returns: {client_secret, order_id, total_amount}

3. MOBILE APP (Collect Payment)
   ↓
   - Uses Stripe SDK to show payment UI
   - Customer enters card details
   - Stripe processes payment securely
   ↓
   Payment succeeded? → Stripe sends webhook

4. STRIPE WEBHOOK → BACKEND (SOURCE OF TRUTH)
   ↓
   POST /api/webhooks/stripe
   Event: payment_intent.succeeded
   ↓
   - Verifies webhook signature (security)
   - Updates Order:
     * payment_status = "succeeded"
     * status = CONFIRMED
     * confirmed_at = now()
   - Logs payment in stripe_payment_logs
   - Generates customer invoice (INV-20241125-00001)
   - Sends confirmation emails/push notifications
   ↓
   Mobile app polls: GET /api/orders/{order_id}

5. VENDOR APP (Restaurant Prepares Order)
   ↓
   PATCH /api/orders/{order_id}/status
   {status: "preparing"}
   ↓
   {status: "out_for_delivery"}
   ↓
   {status: "delivered"}

6. ACCOUNTING SYNC (Weekly/Monthly)
   ↓
   POST /api/accounting/sync-vendor-payouts
   {period_start, period_end}
   ↓
   - Groups orders by vendor
   - Calculates:
     * Gross revenue (all order subtotals)
     * Platform fees (15% commission)
     * Stripe fees (2.9% + $0.30 per transaction)
     * Net payout = gross - platform_fee - stripe_fees
   - Creates VendorPayout records
   - Syncs to Coupa for accounting
```

## Database Schema

### New Tables Added

```sql
-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Customer info
    customer_id INTEGER,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    
    -- Vendor
    vendor_id INTEGER REFERENCES vendors(id),
    
    -- Items (JSON array)
    items TEXT,  -- [{"menu_item_id": 1, "name": "Pizza", "quantity": 2, "price": 15.99}]
    
    -- Financial
    subtotal FLOAT NOT NULL,
    tax_rate FLOAT DEFAULT 0.08,
    tax_amount FLOAT DEFAULT 0,
    delivery_fee FLOAT DEFAULT 5.99,
    platform_fee FLOAT DEFAULT 0,
    total_amount FLOAT NOT NULL,
    
    -- Delivery
    delivery_address TEXT,  -- JSON
    delivery_instructions TEXT,
    delivery_latitude FLOAT,
    delivery_longitude FLOAT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending_payment',
    payment_status VARCHAR(50) DEFAULT 'pending',
    
    -- Stripe
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    payment_method VARCHAR(50),
    
    -- Invoice
    invoice_number VARCHAR(50),
    invoice_generated BOOLEAN DEFAULT FALSE,
    invoice_pdf_url VARCHAR(500),
    
    -- Coupa
    coupa_synced BOOLEAN DEFAULT FALSE,
    coupa_invoice_id VARCHAR(100),
    coupa_status VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    preparing_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- Stripe payment logs (audit trail)
CREATE TABLE stripe_payment_logs (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    
    event_type VARCHAR(100),
    stripe_event_id VARCHAR(255) UNIQUE,
    payment_intent_id VARCHAR(255),
    charge_id VARCHAR(255),
    
    amount FLOAT,
    currency VARCHAR(10) DEFAULT 'usd',
    status VARCHAR(50),
    
    raw_data TEXT,  -- Full Stripe JSON
    
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Vendor payouts (for Coupa)
CREATE TABLE vendor_payouts (
    id SERIAL PRIMARY KEY,
    payout_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    total_orders INTEGER DEFAULT 0,
    gross_revenue FLOAT DEFAULT 0,
    platform_fee FLOAT DEFAULT 0,
    stripe_fees FLOAT DEFAULT 0,
    net_payout FLOAT DEFAULT 0,
    
    status VARCHAR(50) DEFAULT 'pending',
    
    coupa_invoice_id VARCHAR(100),
    coupa_status VARCHAR(50),
    coupa_synced_at TIMESTAMP,
    
    paid_at TIMESTAMP,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### 1. Create Order (Mobile App)

```bash
POST /api/orders
Content-Type: application/json

{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "vendor_id": 1,
  "items": [
    {
      "menu_item_id": 5,
      "name": "Margherita Pizza",
      "quantity": 2,
      "price": 15.99
    },
    {
      "menu_item_id": 8,
      "name": "Caesar Salad",
      "quantity": 1,
      "price": 8.99
    }
  ],
  "delivery_address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102"
  },
  "delivery_instructions": "Ring doorbell twice",
  "delivery_latitude": 37.7749,
  "delivery_longitude": -122.4194
}
```

Response:
```json
{
  "order_id": 123,
  "order_number": "ORD-20241125-00001",
  "client_secret": "pi_3Abc123_secret_xyz",
  "amount": 46.86,
  "currency": "usd"
}
```

### 2. Stripe Webhook (Automatic)

```bash
POST /api/webhooks/stripe
Stripe-Signature: t=1234567890,v1=abc123...

{
  "id": "evt_1234567890",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3Abc123",
      "amount": 4686,
      "status": "succeeded",
      "metadata": {
        "order_id": "123",
        "order_number": "ORD-20241125-00001"
      }
    }
  }
}
```

### 3. Track Order (Mobile App)

```bash
GET /api/orders/123
```

Response:
```json
{
  "id": 123,
  "order_number": "ORD-20241125-00001",
  "customer_name": "John Doe",
  "vendor_id": 1,
  "vendor_name": "Pizza Palace",
  "items": [...],
  "subtotal": 40.97,
  "tax_amount": 3.28,
  "delivery_fee": 5.99,
  "platform_fee": 6.15,
  "total_amount": 46.86,
  "status": "confirmed",
  "payment_status": "succeeded",
  "created_at": "2024-11-25T10:30:00Z"
}
```

### 4. Update Order Status (Vendor App)

```bash
PATCH /api/orders/123/status
Content-Type: application/json

{
  "status": "preparing"
}
```

### 5. List Orders (Admin Dashboard)

```bash
GET /api/orders?vendor_id=1&status=confirmed&limit=50
```

### 6. Sync Vendor Payouts (Accounting)

```bash
POST /api/accounting/sync-vendor-payouts
Content-Type: application/json

{
  "period_start": "2024-11-01T00:00:00Z",
  "period_end": "2024-11-30T23:59:59Z"
}
```

Response:
```json
{
  "message": "Vendor payouts calculated",
  "payouts": [
    {
      "vendor_id": 1,
      "payout_number": "PAYOUT-20241125-00001",
      "net_payout": 1250.50
    }
  ],
  "total_vendors": 1
}
```

### 7. Get Vendor Payouts

```bash
GET /api/accounting/vendor-payouts?vendor_id=1&status=pending
```

## Mobile App Integration (Stripe SDK)

### iOS Example (Swift)

```swift
import Stripe

// Step 1: Create order and get client_secret
func placeOrder() async {
    let orderData = [
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "vendor_id": 1,
        "items": [...]
    ]
    
    let response = try await api.post("/api/orders", json: orderData)
    let clientSecret = response["client_secret"] as! String
    let orderId = response["order_id"] as! Int
    
    // Step 2: Present Stripe payment sheet
    showStripePaymentSheet(clientSecret: clientSecret, orderId: orderId)
}

func showStripePaymentSheet(clientSecret: String, orderId: Int) {
    var configuration = PaymentSheet.Configuration()
    configuration.merchantDisplayName = "DoorDash P2P"
    
    let paymentSheet = PaymentSheet(
        paymentIntentClientSecret: clientSecret,
        configuration: configuration
    )
    
    paymentSheet.present(from: viewController) { result in
        switch result {
        case .completed:
            // Payment succeeded!
            self.trackOrder(orderId: orderId)
        case .canceled:
            print("Payment canceled")
        case .failed(let error):
            print("Payment failed: \(error)")
        }
    }
}

// Step 3: Track order status
func trackOrder(orderId: Int) async {
    let order = try await api.get("/api/orders/\(orderId)")
    // Update UI with order status
}
```

### Android Example (Kotlin)

```kotlin
import com.stripe.android.PaymentConfiguration
import com.stripe.android.paymentsheet.PaymentSheet

// Step 1: Create order
suspend fun placeOrder() {
    val orderData = mapOf(
        "customer_name" to "John Doe",
        "customer_email" to "john@example.com",
        "vendor_id" to 1,
        "items" to listOf(...)
    )
    
    val response = api.post("/api/orders", orderData)
    val clientSecret = response.getString("client_secret")
    val orderId = response.getInt("order_id")
    
    // Step 2: Show Stripe payment
    showStripePayment(clientSecret, orderId)
}

fun showStripePayment(clientSecret: String, orderId: Int) {
    val paymentSheet = PaymentSheet(this) { result ->
        when (result) {
            is PaymentSheetResult.Completed -> {
                // Payment succeeded!
                trackOrder(orderId)
            }
            is PaymentSheetResult.Canceled -> {
                println("Payment canceled")
            }
            is PaymentSheetResult.Failed -> {
                println("Payment failed: ${result.error}")
            }
        }
    }
    
    paymentSheet.presentWithPaymentIntent(clientSecret)
}
```

## Stripe Setup Instructions

### 1. Create Stripe Account
- Go to https://stripe.com
- Sign up for free account
- Get test API keys from Dashboard

### 2. Get API Keys
```
Dashboard → Developers → API keys

Test mode:
- Publishable key: pk_test_51xxxxx (use in mobile apps)
- Secret key: sk_test_51xxxxx (use in backend .env)
```

### 3. Set Up Webhook
```
Dashboard → Developers → Webhooks → Add endpoint

Endpoint URL: https://your-domain.com/api/webhooks/stripe

Select events:
✓ payment_intent.succeeded
✓ payment_intent.payment_failed
✓ charge.succeeded
✓ charge.failed

Copy webhook signing secret: whsec_xxxxx
```

### 4. Configure Backend (.env)
```bash
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 5. Test Payment
Use Stripe test cards:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- 3D Secure: 4000 0027 6000 3184

## Coupa Integration (Accounting)

### Purpose
- Track vendor payouts
- Generate invoices for accounting
- Sync financial data to ERP system

### Flow
1. Weekly/monthly, run: `POST /api/accounting/sync-vendor-payouts`
2. System calculates:
   - Gross revenue per vendor
   - Platform commission (15%)
   - Stripe processing fees (2.9% + $0.30)
   - Net payout amount
3. Create Coupa invoice for each vendor
4. Finance team approves in Coupa
5. Vendor receives payout

### Coupa API Integration (TODO)
```python
import requests

def create_coupa_invoice(payout: VendorPayout):
    coupa_api_url = os.getenv("COUPA_API_URL")
    api_key = os.getenv("COUPA_API_KEY")
    
    invoice_data = {
        "invoice-number": payout.payout_number,
        "supplier-id": payout.vendor_id,
        "invoice-date": payout.created_at,
        "payment-term": "Net 30",
        "invoice-lines": [{
            "description": f"Food delivery revenue {payout.period_start} - {payout.period_end}",
            "quantity": 1,
            "price": payout.net_payout,
            "total": payout.net_payout
        }]
    }
    
    response = requests.post(
        f"{coupa_api_url}/invoices",
        headers={"Authorization": f"Bearer {api_key}"},
        json=invoice_data
    )
    
    return response.json()["id"]
```

## Missing Database Fields Check

### ✅ Already Have:
- vendors table with restaurant fields
- vendor_menu_items table
- vendor_purchase_orders table

### ✅ Just Added:
- **orders** - Complete order management
- **stripe_payment_logs** - Payment audit trail
- **vendor_payouts** - Accounting sync

### 🚧 Optional Enhancements:
- **customers** table - Store customer profiles
- **delivery_drivers** table - If you handle delivery
- **order_reviews** table - Customer ratings/reviews
- **vendor_bank_accounts** table - For automatic payouts

## Next Steps

1. **Install Stripe SDK**
   ```bash
   cd backend
   source venv/bin/activate
   pip install stripe==7.8.0
   ```

2. **Update Database**
   ```bash
   python init_db.py  # Will create new tables
   ```

3. **Configure Stripe**
   - Copy .env.example to .env
   - Add your Stripe test keys

4. **Test Locally**
   ```bash
   # Terminal 1 - Backend
   python main_new.py
   
   # Terminal 2 - Test order creation
   curl -X POST http://localhost:3000/api/orders \
     -H "Content-Type: application/json" \
     -d @test_order.json
   ```

5. **Mobile App Setup**
   - Add Stripe SDK to iOS/Android project
   - Use client_secret to show payment UI
   - Poll order status after payment

## Security Notes

⚠️ **CRITICAL**:
- Always verify Stripe webhook signatures
- Never trust payment status from mobile app
- Webhook is the SOURCE OF TRUTH
- Use HTTPS in production
- Store Stripe keys in environment variables, NEVER commit to git

## Support

For issues:
- Stripe docs: https://stripe.com/docs
- Stripe webhook testing: Use Stripe CLI
- Database migrations: Use Alembic for production
