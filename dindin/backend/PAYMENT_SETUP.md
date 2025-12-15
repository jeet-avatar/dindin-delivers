# Enterprise Payment Setup Guide

Complete setup guide for Dollor.ai payment infrastructure.

## What's Implemented

### Backend Endpoints (enterprise_payments.py)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/enterprise/payments/create` | POST | Create card or ACH payment |
| `/api/enterprise/payments/ach/setup` | POST | Setup ACH-specific payment |
| `/api/enterprise/plaid/link-token` | POST | Get Plaid Link token for bank auth |
| `/api/enterprise/plaid/exchange` | POST | Exchange Plaid token for bank account |
| `/api/enterprise/connect/onboard` | POST | Create Stripe Connect account |
| `/api/enterprise/connect/status/{id}` | GET | Check Connect account status |
| `/api/enterprise/connect/dashboard-link/{id}` | POST | Get Express dashboard link |
| `/api/enterprise/payouts/create` | POST | Create payout to vendor/driver |
| `/api/enterprise/payouts/balance/{type}/{id}` | GET | Get available balance |
| `/api/enterprise/payouts/history/{type}/{id}` | GET | Get payout history |
| `/api/enterprise/payouts/batch` | POST | Process batch payouts |
| `/api/enterprise/fees/calculate` | GET | Calculate fees for display |
| `/api/enterprise/webhooks/stripe-connect` | POST | Handle Connect webhooks |

---

## What You Need to Do

### Step 1: Create Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Complete business verification
3. Enable Stripe Connect: Dashboard > Settings > Connect

### Step 2: Get Stripe API Keys

From Stripe Dashboard > Developers > API Keys:

```
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```

### Step 3: Set Up Stripe Webhooks

1. Go to Dashboard > Developers > Webhooks
2. Add endpoint: `https://dollor.ai/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Add endpoint: `https://dollor.ai/api/enterprise/webhooks/stripe-connect`
   - Events: `account.updated`, `payout.paid`, `payout.failed`
4. Copy both webhook signing secrets

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 4: Create Plaid Account (for ACH)

1. Go to https://dashboard.plaid.com/signup
2. Get credentials from Dashboard > Keys

```
PLAID_CLIENT_ID=xxxxxxxxxxxxx
PLAID_SECRET=xxxxxxxxxxxxx
PLAID_ENV=sandbox  # Use 'development' for testing, 'production' for live
```

### Step 5: Configure Server Environment

Create `.env` file on your AWS server:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Plaid Configuration (for ACH payments)
PLAID_CLIENT_ID=xxxxxxxxxxxxx
PLAID_SECRET=xxxxxxxxxxxxx
PLAID_ENV=production

# Environment
ENVIRONMENT=production
APP_BASE_URL=https://dollor.ai
```

### Step 6: Add Database Columns

Add these columns to your Vendor and Driver tables:

```sql
-- Add to vendors table
ALTER TABLE vendors ADD COLUMN stripe_connect_account_id VARCHAR(255);
ALTER TABLE vendors ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN preferred_payout_speed VARCHAR(20) DEFAULT 'standard';

-- Add to drivers table
ALTER TABLE drivers ADD COLUMN stripe_connect_account_id VARCHAR(255);
ALTER TABLE drivers ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers ADD COLUMN preferred_payout_speed VARCHAR(20) DEFAULT 'standard';

-- Add to orders table (track which orders have been paid out)
ALTER TABLE orders ADD COLUMN vendor_payout_id INTEGER REFERENCES vendor_payouts(id);
ALTER TABLE orders ADD COLUMN driver_payout_id INTEGER REFERENCES driver_payouts(id);
```

### Step 7: Install Python Dependencies

```bash
pip install httpx  # For Plaid API calls
```

---

## Fee Structure

### Customer Payment Fees (You Pay)

| Method | Fee | Customer Discount |
|--------|-----|-------------------|
| Credit/Debit Card | 2.9% + $0.30 | $0.00 |
| ACH (Bank Transfer) | 0.8% (max $5) | $0.50 |

### Vendor Payout Fees

| Speed | Fee | Settlement |
|-------|-----|------------|
| Standard | $1.00 | Weekly (every Monday) |
| Fast | $0.50/day | Same business day |
| Instant | 1.5% | Within minutes |

### Driver Payout Fees

| Speed | Fee | Settlement |
|-------|-----|------------|
| Standard | FREE | Weekly (every Monday) |
| Instant | 1% (min $0.50) | Within minutes |

---

## iOS App Integration

### Update PaymentService.swift

```swift
// Add ACH payment option
func createACHPayment(amount: Double, completion: @escaping (Result<PaymentResponse, Error>) -> Void) {
    let url = URL(string: "\(AppConfig.shared.p2pAPIBaseURL)/api/enterprise/payments/ach/setup")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: Any] = [
        "amount": Int(amount * 100),  // Convert to cents
        "currency": "usd",
        "payment_method": "ach"
    ]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    URLSession.shared.dataTask(with: request) { data, response, error in
        // Handle response
    }.resume()
}
```

### Add Stripe Financial Connections (ACH)

In your Podfile or Package.swift, ensure you have:
```
StripePaymentSheet (includes Financial Connections)
```

---

## Testing

### Test with Stripe CLI

```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8000/api/webhooks/stripe

# In another terminal, test payment
curl -X POST http://localhost:8000/api/enterprise/payments/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 2500, "payment_method": "card"}'

# Test ACH payment
curl -X POST http://localhost:8000/api/enterprise/payments/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 2500, "payment_method": "ach"}'

# Calculate fees
curl "http://localhost:8000/api/enterprise/fees/calculate?amount=2500&payment_method=card"
```

### Test Plaid (Sandbox)

```bash
# Get link token
curl -X POST http://localhost:8000/api/enterprise/plaid/link-token \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "test123", "customer_email": "test@example.com"}'
```

### Test Stripe Connect

```bash
# Create Connect account for vendor
curl -X POST http://localhost:8000/api/enterprise/connect/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "vendor",
    "entity_id": 1,
    "email": "restaurant@example.com"
  }'
```

---

## Production Checklist

- [ ] Stripe account verified and approved
- [ ] Stripe Connect enabled
- [ ] Live API keys configured
- [ ] Webhook endpoints added and verified
- [ ] Plaid account approved for production
- [ ] Database migrations applied
- [ ] SSL certificate valid for webhooks
- [ ] Test payment processed successfully
- [ ] Test payout processed successfully

---

## API Examples

### Create Card Payment

```bash
curl -X POST https://dollor.ai/api/enterprise/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "currency": "usd",
    "payment_method": "card",
    "customer_email": "customer@example.com",
    "order_id": "ORD-12345"
  }'
```

Response:
```json
{
  "payment_id": "pi_xxxxx",
  "client_secret": "pi_xxxxx_secret_xxxxx",
  "amount": 2500,
  "currency": "usd",
  "payment_method": "card",
  "status": "requires_payment_method",
  "customer_discount": 0,
  "processing_fee": 1.03,
  "net_amount": 2500
}
```

### Create ACH Payment (Lower Fees)

```bash
curl -X POST https://dollor.ai/api/enterprise/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "currency": "usd",
    "payment_method": "ach",
    "customer_email": "customer@example.com"
  }'
```

Response:
```json
{
  "payment_id": "pi_xxxxx",
  "client_secret": "pi_xxxxx_secret_xxxxx",
  "amount": 2500,
  "currency": "usd",
  "payment_method": "ach",
  "status": "requires_payment_method",
  "customer_discount": 0.50,
  "processing_fee": 0.20,
  "net_amount": 2450
}
```

### Onboard Vendor to Stripe Connect

```bash
curl -X POST https://dollor.ai/api/enterprise/connect/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "vendor",
    "entity_id": 123,
    "email": "restaurant@example.com",
    "business_type": "company"
  }'
```

Response:
```json
{
  "account_id": "acct_xxxxx",
  "onboarding_url": "https://connect.stripe.com/express/onboarding/xxxxx",
  "status": "pending"
}
```

### Create Instant Payout for Driver

```bash
curl -X POST https://dollor.ai/api/enterprise/payouts/create \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "driver",
    "entity_id": 456,
    "amount": 5000,
    "speed": "instant"
  }'
```

Response:
```json
{
  "payout_id": "po_xxxxx",
  "amount": 5000,
  "fee": 0.50,
  "net_amount": 4950,
  "speed": "instant",
  "status": "pending",
  "arrival_date": "Within minutes"
}
```

---

## Support

- Stripe Support: https://support.stripe.com
- Plaid Support: https://support.plaid.com
- Stripe Connect Docs: https://stripe.com/docs/connect
- Plaid Auth Docs: https://plaid.com/docs/auth/
