# 🎯 Quick Start - Stripe Payment System

## ✅ Stripe Keys Configured!

Your Stripe test keys are now active:
- **Publishable Key:** `pk_test_51S5xJ0Je...` ✅
- **Secret Key:** `sk_test_51S5xJ0Je...` ✅

## 🚀 Start the System

```bash
cd backend
chmod +x START_WITH_STRIPE.sh
./START_WITH_STRIPE.sh
```

This will:
1. Install Stripe SDK
2. Update database with payment tables
3. Start backend on port 3000

## 🧪 Test Order Creation

```bash
# Create a test order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+14155551234",
    "vendor_id": 1,
    "items": [
      {
        "menu_item_id": 1,
        "name": "Test Item",
        "quantity": 2,
        "price": 15.99
      }
    ],
    "delivery_address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102"
    }
  }'
```

Response:
```json
{
  "order_id": 1,
  "order_number": "ORD-20241125-00001",
  "client_secret": "pi_xxx_secret_yyy",
  "amount": 41.86,
  "currency": "usd"
}
```

## 💳 Stripe Test Cards

Use these for testing payments:

| Card Number | Result |
|------------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Decline |
| `4000 0027 6000 3184` | 🔐 3D Secure |

Any future expiry date, any 3-digit CVC

## 🔔 Webhook Setup (Critical!)

Stripe webhooks are the SOURCE OF TRUTH for payments. Set them up:

### Option 1: Local Testing with Stripe CLI (Recommended)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will output a webhook secret like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

Copy that secret to your `.env` file:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Option 2: Production Webhook

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/webhooks/stripe`
4. Events to send:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.succeeded`
5. Copy webhook signing secret to `.env`

## 🧪 Test Payment Flow End-to-End

```bash
# Terminal 1 - Start backend
cd backend
./START_WITH_STRIPE.sh

# Terminal 2 - Forward webhooks (in separate terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3 - Create order and trigger test payment
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d @test_order.json

# This returns a client_secret - use it to test payment:
stripe payment_intents confirm pi_xxxxx --payment-method=pm_card_visa
```

## 📱 Mobile App Integration

Use the `client_secret` from order creation:

### iOS (Swift)
```swift
let paymentSheet = PaymentSheet(
    paymentIntentClientSecret: clientSecret,
    configuration: configuration
)
paymentSheet.present(from: viewController)
```

### Android (Kotlin)
```kotlin
paymentSheet.presentWithPaymentIntent(clientSecret)
```

## 📊 Monitor Orders

```bash
# List all orders
curl http://localhost:3000/api/orders

# Get specific order
curl http://localhost:3000/api/orders/1

# View Stripe payment logs
curl http://localhost:3000/api/accounting/vendor-payouts
```

## 🔍 API Documentation

Open in browser: http://localhost:3000/docs

Interactive Swagger UI with all endpoints documented.

## 🎯 What Happens When Payment Succeeds

1. **Stripe sends webhook** → `POST /api/webhooks/stripe`
2. **Backend verifies signature** (security!)
3. **Order updated:**
   - `payment_status` = "succeeded"
   - `status` = "confirmed"
   - `confirmed_at` = now
4. **Invoice generated:** `INV-20241125-00001`
5. **Notifications sent** (email/push - implement later)
6. **Vendor sees order** in their app

## 💰 Fee Breakdown

Example: $40.97 food order

```
Subtotal:        $40.97
Tax (8%):        $ 3.28
Delivery:        $ 5.99
Platform (15%):  $ 6.15
─────────────────────────
Customer Pays:   $56.39

Vendor Receives:
Gross Revenue:   $40.97
- Platform Fee:  $ 6.15
- Stripe Fee:    $ 1.48  (2.9% + $0.30)
─────────────────────────
Net Payout:      $33.34
```

## 📅 Accounting Sync (Weekly/Monthly)

```bash
# Calculate vendor payouts for November 2024
curl -X POST http://localhost:3000/api/accounting/sync-vendor-payouts \
  -H "Content-Type: application/json" \
  -d '{
    "period_start": "2024-11-01T00:00:00Z",
    "period_end": "2024-11-30T23:59:59Z"
  }'
```

This creates payout records ready to sync to Coupa for accounting.

## 🚨 Troubleshooting

### "Invalid signature" webhook error
→ Check `STRIPE_WEBHOOK_SECRET` in `.env` matches Stripe CLI output

### Order created but no payment
→ Verify webhook is forwarding: check Stripe CLI terminal

### Menu item not found
→ Run `python init_vendors.py` to create sample data

### Database connection error
→ Check PostgreSQL is running: `brew services start postgresql`

## 📚 Full Documentation

- **Complete Guide:** `STRIPE_PAYMENT_INTEGRATION.md`
- **Database Fields:** `DATABASE_FIELDS_CHECKLIST.md`
- **Mobile App:** `MOBILE_APP_RESTAURANT_ONBOARDING.md`

## ✅ You're Ready!

All systems go for restaurant ordering with Stripe payments! 🚀
