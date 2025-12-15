# Dollor.ai - Pricing Service

The Pricing Service is a core microservice in the Dollor.ai platform that handles all pricing calculations, fare estimation, surge pricing, promotional codes, and pricing analytics for both food delivery and rideshare services.

## Overview

- **Port**: 8015
- **Error Prefix**: PRICE
- **Database**: PostgreSQL (shared `dollor` database)
- **Service Type**: Core microservice

## Features

### 1. Fare Calculation
- **Rideshare Pricing**
  - Base fare + distance-based pricing ($1.50/mile)
  - Time-based pricing ($0.35/minute)
  - Minimum fare enforcement ($5.00)
  - Platform fee (15% for rides)

- **Food Delivery Pricing**
  - Base delivery fee ($2.99)
  - Distance-based adjustments ($0.50/mile over 2 miles)
  - Platform fee (flat $1.00 for food)

### 2. Surge Pricing
- Dynamic multipliers based on demand
- Time-based rules (peak hours, weekends)
- Location-based zones
- Priority-based rule application

### 3. Promotional Codes
- **Types**:
  - Percentage discounts
  - Fixed amount discounts
  - Free delivery promotions
- **Controls**:
  - Usage limits (total and per-customer)
  - Minimum order requirements
  - Service type restrictions
  - Expiration dates
  - First order only options

### 4. Price Estimation
- Real-time fare estimates with 15-minute validity
- Distance and duration calculations
- Complete price breakdown
- Tip suggestions (15%, 18%, 20%)
- Promo code validation

### 5. Fee Calculation
- **Platform Fees**:
  - $1.00 flat fee for food orders
  - 15% percentage for rideshare
- **Service Fees**: 5% of order value
- **Tax**: 8.25% tax rate
- **Delivery Fees**: Base + distance adjustments

### 6. Analytics
- Price history tracking
- Average pricing metrics
- Discount effectiveness
- Surge pricing impact
- Revenue analytics

## API Endpoints

### Promo Codes

#### Create Promo Code
```http
POST /api/promo-codes
```

**Request Body**:
```json
{
  "code": "WELCOME20",
  "type": "percentage",
  "value": 20,
  "max_discount": 10.00,
  "min_order_value": 15.00,
  "max_uses": 1000,
  "max_uses_per_customer": 1,
  "applies_to": "food",
  "first_order_only": true,
  "valid_until": "2024-12-31T23:59:59",
  "description": "20% off first food order"
}
```

#### Get Promo Code
```http
GET /api/promo-codes/{code}
```

#### Validate Promo Code
```http
POST /api/promo-codes/{code}/validate?order_value=25.00&service_type=food&customer_id=CUST-123
```

**Response**:
```json
{
  "valid": true,
  "code": "WELCOME20",
  "discount_amount": 5.00,
  "message": "Promo code is valid"
}
```

#### Deactivate Promo Code
```http
PUT /api/promo-codes/{code}/deactivate
```

### Pricing Rules

#### Create Pricing Rule
```http
POST /api/pricing-rules
```

**Request Body**:
```json
{
  "name": "Weekend Evening Surge",
  "rule_type": "surge",
  "conditions": {
    "hours": [17, 18, 19, 20, 21],
    "days_of_week": [5, 6]
  },
  "multiplier": 1.5,
  "applies_to": "ride",
  "priority": 10,
  "valid_from": "2024-01-01T00:00:00",
  "description": "1.5x surge on weekend evenings"
}
```

#### List Pricing Rules
```http
GET /api/pricing-rules?rule_type=surge&status=active
```

#### Delete Pricing Rule
```http
DELETE /api/pricing-rules/{rule_id}
```

### Price Estimation

#### Estimate Ride Price
```http
POST /api/estimate/ride
```

**Request Body**:
```json
{
  "pickup_latitude": 37.7749,
  "pickup_longitude": -122.4194,
  "dropoff_latitude": 37.7849,
  "dropoff_longitude": -122.4094,
  "customer_id": "CUST-123",
  "promo_code": "RIDE10"
}
```

**Response**:
```json
{
  "estimate_id": "EST-482615",
  "service_type": "rideshare",
  "distance_miles": 3.45,
  "duration_minutes": 12.5,
  "breakdown": {
    "base_fare": 5.00,
    "distance_fare": 5.18,
    "time_fare": 4.38,
    "surge_multiplier": 1.5,
    "surge_amount": 7.28,
    "service_fee": 0.73,
    "platform_fee": 2.18,
    "tax": 2.04,
    "discount_amount": 2.00,
    "subtotal": 24.75,
    "total": 24.79,
    "suggested_tips": [
      {"percentage": 15, "amount": 3.71},
      {"percentage": 18, "amount": 4.46},
      {"percentage": 20, "amount": 4.95}
    ]
  },
  "valid_until": "2024-01-15T15:30:00",
  "promo_code_applied": "RIDE10"
}
```

#### Estimate Delivery Price
```http
POST /api/estimate/delivery
```

**Request Body**:
```json
{
  "restaurant_latitude": 37.7749,
  "restaurant_longitude": -122.4194,
  "delivery_latitude": 37.7849,
  "delivery_longitude": -122.4094,
  "order_subtotal": 35.50,
  "customer_id": "CUST-123",
  "promo_code": "FREEDEL"
}
```

#### Get Estimate
```http
GET /api/estimate/{estimate_id}
```

### Price History

#### Record Price History
```http
POST /api/price-history
```

**Request Body**:
```json
{
  "order_id": "ORD-12345",
  "estimate_id": "EST-482615",
  "tip_amount": 5.00
}
```

#### Get Pricing Analytics
```http
GET /api/price-history/analytics?service_type=rideshare&days=30
```

**Response**:
```json
{
  "period_days": 30,
  "service_type": "rideshare",
  "total_transactions": 1543,
  "analytics": {
    "average_subtotal": 18.45,
    "average_total": 22.50,
    "average_discount": 2.15,
    "average_surge_multiplier": 1.15,
    "total_revenue": 34701.50,
    "total_discounts": 3317.25,
    "promo_code_usage": {
      "RIDE10": 342,
      "WELCOME20": 156
    }
  }
}
```

### Configuration

#### Get Pricing Config
```http
GET /api/pricing/config
```

**Response**:
```json
{
  "base_delivery_fee": 2.99,
  "base_fare_per_mile": 1.50,
  "base_fare_per_minute": 0.35,
  "minimum_ride_fare": 5.00,
  "platform_fee_food": 1.00,
  "platform_fee_ride_percentage": 0.15,
  "tax_rate": 0.0825,
  "service_fee_percentage": 0.05
}
```

## Database Models

### PromoCode
- Promotional discount codes
- Usage tracking and limits
- Validation rules

### PricingRule
- Dynamic pricing rules
- Surge multipliers
- Time and location-based conditions

### PriceEstimate
- Temporary price quotes
- 15-minute validity
- Full price breakdowns

### PriceHistory
- Historical pricing data
- Analytics and reporting
- Revenue tracking

## Error Codes

| Code | Description |
|------|-------------|
| PRICE-101 | Promo code already exists |
| PRICE-102 | Invalid request parameters |
| PRICE-301 | Promo code not found |
| PRICE-302 | Pricing rule not found |
| PRICE-303 | Estimate not found |
| PRICE-401 | Estimate has expired |

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dollor

# Service
SERVICE_PORT=8015
ENVIRONMENT=development

# Observability (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
```

### Pricing Constants

Edit these constants in `main.py` to adjust pricing:

```python
BASE_DELIVERY_FEE = 2.99
BASE_FARE_PER_MILE = 1.50
BASE_FARE_PER_MINUTE = 0.35
MINIMUM_RIDE_FARE = 5.00
PLATFORM_FEE_FOOD = 1.00
PLATFORM_FEE_RIDE_PERCENTAGE = 0.15
TAX_RATE = 0.0825
SERVICE_FEE_PERCENTAGE = 0.05
```

## Running the Service

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8015 --reload
```

### Docker

```bash
# Build the image
docker build -t pricing-service:latest .

# Run the container
docker run -d \
  -p 8015:8015 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/dollor \
  --name pricing-service \
  pricing-service:latest
```

### Docker Compose

```yaml
pricing-service:
  build: ./services/core/pricing-service
  ports:
    - "8015:8015"
  environment:
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/dollor
    ENVIRONMENT: development
  depends_on:
    - postgres
```

## Health Checks

The service provides standard health check endpoints:

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

## Integration

### Service Dependencies

This service is called by:
- **Order Service**: For delivery fee calculation
- **Ride Service**: For fare estimation
- **Payment Service**: For final price validation

### Calling Other Services

This service may call:
- **Location Service**: For distance/geocoding (optional)
- **Analytics Service**: For demand data (optional)

## Business Logic

### Ride Fare Calculation

1. Calculate distance using Haversine formula
2. Estimate duration based on average speed (30 mph)
3. Apply base fare + distance fare + time fare
4. Check for active surge pricing rules
5. Calculate platform fee (15%)
6. Add service fee (5%)
7. Calculate tax (8.25%)
8. Apply promotional discount if valid
9. Enforce minimum fare ($5.00)

### Delivery Fee Calculation

1. Calculate distance to delivery location
2. Apply base delivery fee ($2.99)
3. Add distance adjustment ($0.50/mile over 2 miles)
4. Check for surge pricing
5. Add platform fee (flat $1.00)
6. Add service fee (5% of food subtotal)
7. Calculate tax on delivery fees
8. Apply promotional discount

### Surge Pricing

- Time-based rules (e.g., peak hours)
- Day-based rules (e.g., weekends)
- Location-based multipliers
- Priority system for multiple rules
- Maximum surge caps can be configured

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=main --cov-report=html
```

## Monitoring

The service exports Prometheus metrics:

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration
- `pricing_estimates_total` - Total price estimates
- `promo_codes_validated_total` - Promo code validations
- `pricing_rules_applied_total` - Pricing rules applied

## Maintenance

### Adding New Promo Codes

1. Use the POST `/api/promo-codes` endpoint
2. Set appropriate limits and restrictions
3. Monitor usage through analytics

### Updating Pricing Rules

1. Create new rule with POST `/api/pricing-rules`
2. Set priority to control application order
3. Monitor impact through analytics
4. Delete old rules when no longer needed

### Adjusting Base Pricing

1. Update constants in `main.py`
2. Redeploy the service
3. Monitor analytics for impact

## Support

For issues or questions:
- Check logs: `docker logs pricing-service`
- Review metrics: `http://localhost:8015/metrics`
- API docs: `http://localhost:8015/docs`
