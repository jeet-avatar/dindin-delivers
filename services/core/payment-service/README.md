# Payment Service - Dollor.ai

Payment processing and payout management microservice for the Dollor.ai platform.

## Overview

The Payment Service handles all payment-related operations including:
- Stripe payment intent creation and processing
- Payment refunds
- Vendor payout calculations and tracking
- Driver payout calculations and tracking
- Payment history and analytics
- Stripe webhook event processing

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dollor

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Platform Fees
PLATFORM_FEE_PERCENTAGE=15.0  # Platform commission (default: 15%)
STRIPE_FEE_PERCENTAGE=2.9     # Stripe fee percentage (default: 2.9%)
STRIPE_FEE_FIXED=0.30         # Stripe fixed fee (default: $0.30)
```

## Service Details

- **Port**: 8006
- **Error Prefix**: PAY
- **Database**: PostgreSQL (shared Dollor database)

## API Endpoints

### Payment Intents

#### Create Payment Intent
```http
POST /api/payments/intent
Content-Type: application/json

{
  "amount": 25.50,
  "currency": "usd",
  "customer_email": "customer@example.com",
  "customer_id": "cus_123",
  "order_id": 1,
  "metadata": {
    "order_number": "ORD-001"
  }
}
```

Response:
```json
{
  "payment_intent_id": "pi_123...",
  "client_secret": "pi_123..._secret_...",
  "amount": 25.50,
  "currency": "usd",
  "status": "requires_payment_method"
}
```

#### Get Payment Intent
```http
GET /api/payments/intent/{payment_intent_id}
```

### Refunds

#### Create Refund
```http
POST /api/payments/refund
Content-Type: application/json

{
  "payment_intent_id": "pi_123...",
  "amount": 25.50,  // Optional, full refund if not specified
  "reason": "requested_by_customer"
}
```

Response:
```json
{
  "refund_id": "re_123...",
  "payment_intent_id": "pi_123...",
  "amount": 25.50,
  "status": "succeeded",
  "reason": "requested_by_customer"
}
```

### Payment History

#### Get Payments
```http
GET /api/payments?order_id=1&status=completed&limit=50&offset=0
```

#### Get Payment by ID
```http
GET /api/payments/{payment_id}
```

#### Get Order Payment History
```http
GET /api/payments/order/{order_id}/history
```

Response:
```json
{
  "total_payments": 1,
  "total_amount": 25.50,
  "payments": [
    {
      "id": 1,
      "amount": 25.50,
      "payment_date": "2025-01-15T10:30:00Z",
      "payment_method": "card",
      "reference_number": "pi_123...",
      "status": "completed",
      "stripe_payment_intent_id": "pi_123...",
      "order_id": 1,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### Vendor Payouts

#### Create Vendor Payout
```http
POST /api/payouts/vendor
Content-Type: application/json

{
  "vendor_id": 1,
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-01-31T23:59:59Z"
}
```

Response:
```json
{
  "id": 1,
  "payout_number": "VND-123456",
  "vendor_id": 1,
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-01-31T23:59:59Z",
  "total_orders": 0,
  "gross_revenue": 0.0,
  "platform_fee": 0.0,
  "stripe_fees": 0.0,
  "net_payout": 0.0,
  "status": "pending",
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### Get Vendor Payouts
```http
GET /api/payouts/vendor/{vendor_id}?status=pending&limit=50&offset=0
```

#### Update Vendor Payout Status
```http
PUT /api/payouts/vendor/{payout_id}/status?new_status=completed&payment_reference=txn_123
```

### Driver Payouts

#### Create Driver Payout
```http
POST /api/payouts/driver
Content-Type: application/json

{
  "driver_id": 1,
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-01-31T23:59:59Z"
}
```

Response:
```json
{
  "id": 1,
  "payout_number": "DRV-123456",
  "driver_id": 1,
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-01-31T23:59:59Z",
  "total_deliveries": 0,
  "delivery_fee": 0.0,
  "tip": 0.0,
  "bonus": 0.0,
  "deductions": 0.0,
  "net_payout": 0.0,
  "status": "pending",
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### Get Driver Payouts
```http
GET /api/payouts/driver/{driver_id}?status=pending&limit=50&offset=0
```

#### Update Driver Payout Status
```http
PUT /api/payouts/driver/{payout_id}/status?new_status=completed&payment_reference=txn_123
```

### Stripe Webhooks

#### Webhook Endpoint
```http
POST /api/webhooks/stripe
Headers:
  stripe-signature: t=1234567890,v1=...
```

Supported events:
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Charge was refunded

### Analytics

#### Revenue Analytics
```http
GET /api/analytics/revenue?start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z
```

Response:
```json
{
  "total_payments": 150,
  "total_revenue": 5432.10,
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-01-31T23:59:59Z"
}
```

#### Vendor Payout Analytics
```http
GET /api/analytics/payouts/vendor?vendor_id=1&status=completed
```

Response:
```json
{
  "total_payouts": 4,
  "total_gross_revenue": 10000.00,
  "total_platform_fees": 1500.00,
  "total_net_payout": 8200.00
}
```

#### Driver Payout Analytics
```http
GET /api/analytics/payouts/driver?driver_id=1&status=completed
```

Response:
```json
{
  "total_payouts": 4,
  "total_deliveries": 120,
  "total_delivery_fees": 600.00,
  "total_tips": 240.00,
  "total_net_payout": 840.00
}
```

## Database Models

### Payment
Stores payment transactions linked to orders.

### StripePaymentLog
Logs all Stripe webhook events for auditing.

### VendorPayout
Tracks vendor payouts for order fulfillment.

### DriverPayout
Tracks driver payouts for deliveries.

## Error Codes

All errors follow the format: `PAY-XXX`

- `PAY-101`: Failed to create payment intent
- `PAY-102`: Failed to create refund
- `PAY-301`: Payment/Payment intent not found
- `PAY-302`: Payout not found
- `PAY-500`: Internal server error

## Running the Service

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dollor"
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."

# Run the service
python main.py
```

The service will start on `http://localhost:8006`

### Docker

```bash
# Build the image
docker build -t dollor-payment-service .

# Run the container
docker run -p 8006:8006 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/dollor" \
  -e STRIPE_SECRET_KEY="sk_test_..." \
  -e STRIPE_WEBHOOK_SECRET="whsec_..." \
  dollor-payment-service
```

## Health Checks

The service provides standard health check endpoints:

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe (checks database connection)
- `GET /health/live` - Liveness probe

## Metrics

Prometheus metrics are available at `/metrics`:

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration
- `payment_intents_created_total` - Total payment intents created
- `refunds_created_total` - Total refunds created
- `vendor_payouts_total` - Total vendor payouts
- `driver_payouts_total` - Total driver payouts

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```

## Stripe Integration

### Payment Flow

1. **Create Payment Intent**: Client calls `/api/payments/intent` to create a payment intent
2. **Client-side Processing**: Client uses Stripe.js to collect payment method and confirm payment
3. **Webhook Processing**: Stripe sends webhook events to `/api/webhooks/stripe`
4. **Update Status**: Service updates payment status based on webhook events

### Webhook Setup

Configure Stripe webhook URL in Stripe Dashboard:
```
https://your-domain.com/api/payments/webhooks/stripe
```

Select events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

### Testing Webhooks Locally

Use Stripe CLI to forward webhooks to local development:

```bash
stripe listen --forward-to localhost:8006/api/webhooks/stripe
```

## Fee Calculation

### Platform Fees

- **Vendor Commission**: 15% of order total (configurable)
- **Stripe Processing Fee**: 2.9% + $0.30 per transaction

### Example Calculation

Order total: $100.00
- Stripe fee: ($100 × 2.9%) + $0.30 = $3.20
- Platform fee: $100 × 15% = $15.00
- Vendor payout: $100 - $3.20 - $15.00 = $81.80

### Driver Payouts

- **Delivery Fee**: Base fee per delivery
- **Tips**: Customer tips (100% goes to driver)
- **Bonuses**: Peak hour bonuses, incentives
- **Deductions**: Any fees or adjustments

## Integration with Other Services

### Order Service
- Receives payment status updates
- Triggers payment intent creation on order placement

### User Service
- Links payments to customer accounts
- Updates customer spending stats

### Driver Service
- Links driver payouts to driver accounts
- Updates driver earnings

### Restaurant Service
- Links vendor payouts to restaurant accounts
- Updates vendor revenue stats

## Security

- All Stripe API keys stored as environment variables
- Webhook signature verification for all Stripe events
- Database credentials encrypted
- Non-root Docker container user
- Input validation on all endpoints

## Monitoring

- Structured JSON logging with correlation IDs
- OpenTelemetry distributed tracing
- Prometheus metrics for monitoring
- Health checks for Kubernetes

## Support

For issues or questions:
- Check service logs: `docker logs <container-id>`
- Check Stripe Dashboard for payment details
- Review webhook event logs in database

## License

Proprietary - Dollor.ai
