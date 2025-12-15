# Order Service

Dollor.ai microservice for food order management and tracking.

## Overview

The Order Service handles all food order operations including creation, status updates, driver assignment, and real-time tracking.

## Port

- **Development**: 8005
- **Production**: 8005

## Error Codes

| Code | Description |
|------|-------------|
| ORD-101 | Invalid order items |
| ORD-102 | Restaurant closed |
| ORD-103 | Item unavailable |
| ORD-104 | Delivery address out of range |
| ORD-105 | Minimum order amount not met |
| ORD-106 | Invalid tip amount |
| ORD-201 | User not authorized to view this order |
| ORD-301 | Order not found |
| ORD-401 | Cannot cancel - order already picked up |
| ORD-402 | Cannot modify - order already confirmed |
| ORD-403 | No drivers available |
| ORD-404 | Order already assigned to a driver |
| ORD-405 | Invalid order status transition |
| ORD-501 | Payment processing failed |
| ORD-502 | Restaurant service unavailable |
| ORD-503 | Driver service unavailable |
| ORD-601 | Failed to save order |

## Order Status Flow

```
pending/pending_payment → confirmed → preparing → ready_for_pickup → out_for_delivery → delivered
                ↓            ↓           ↓              ↓                    ↓
             cancelled    cancelled  cancelled      cancelled          cancelled
```

## API Endpoints

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/{id}` | Get order by ID/number |
| PUT | `/api/orders/{id}` | Update order (before confirmation) |
| GET | `/api/orders` | Search orders with filters |

### Order Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/orders/{id}/status` | Update order status |
| POST | `/api/orders/{id}/confirm` | Confirm order |
| POST | `/api/orders/{id}/preparing` | Mark as preparing |
| POST | `/api/orders/{id}/ready` | Mark as ready for pickup |
| POST | `/api/orders/{id}/out-for-delivery` | Mark as out for delivery |
| POST | `/api/orders/{id}/delivered` | Mark as delivered |

### Driver Assignment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/{id}/assign-driver` | Assign driver to order |
| PUT | `/api/orders/{id}/driver-location` | Update driver location |

### Cancellation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/{id}/cancel` | Cancel order |

### Order History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders/customer/{customer_id}` | Get customer order history |
| GET | `/api/orders/restaurant/{vendor_id}` | Get restaurant order history |
| GET | `/api/orders/driver/{driver_id}` | Get driver order history |

### Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders/{id}/track` | Get real-time tracking info |

### Payment

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/orders/{id}/payment-status` | Update payment status |

## Request Examples

### Create Order

```bash
curl -X POST http://localhost:8005/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+1234567890",
    "vendor_id": 10,
    "vendor_name": "Pizza Palace",
    "items": [
      {
        "menu_item_id": 101,
        "name": "Margherita Pizza",
        "quantity": 2,
        "price": 15.99
      }
    ],
    "delivery_address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip_code": "94102",
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "delivery_instructions": "Ring doorbell twice",
    "subtotal": 31.98,
    "tax_rate": 0.0875,
    "tax_amount": 2.80,
    "delivery_fee": 3.99,
    "tip": 5.00,
    "platform_fee": 1.00,
    "total_amount": 44.77,
    "payment_method": "card"
  }'
```

### Confirm Order

```bash
curl -X POST http://localhost:8005/api/orders/ORD-123456/confirm
```

### Assign Driver

```bash
curl -X POST http://localhost:8005/api/orders/ORD-123456/assign-driver \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": 5,
    "driver_name": "Mike Wilson"
  }'
```

### Update Driver Location

```bash
curl -X PUT http://localhost:8005/api/orders/ORD-123456/driver-location \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7850,
    "longitude": -122.4200
  }'
```

### Track Order

```bash
curl http://localhost:8005/api/orders/ORD-123456/track
```

### Cancel Order

```bash
curl -X POST http://localhost:8005/api/orders/ORD-123456/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer changed mind",
    "cancelled_by": "customer"
  }'
```

### Get Customer Orders

```bash
curl "http://localhost:8005/api/orders/customer/1?status=delivered&limit=10"
```

### Update Payment Status

```bash
curl -X PUT http://localhost:8005/api/orders/ORD-123456/payment-status \
  -H "Content-Type: application/json" \
  -d '{
    "payment_status": "succeeded",
    "stripe_payment_intent_id": "pi_xxxxxxxxxxxxx",
    "stripe_charge_id": "ch_xxxxxxxxxxxxx"
  }'
```

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dollor

# Run service
uvicorn main:app --reload --port 8005
```

## Docker

```bash
docker build -t dollor/order-service .
docker run -p 8005:8005 -e DATABASE_URL=... dollor/order-service
```

## Order Status Transitions

### Valid Transitions

- **pending** → confirmed, cancelled
- **pending_payment** → confirmed, cancelled
- **confirmed** → preparing, cancelled
- **preparing** → ready_for_pickup, cancelled
- **ready_for_pickup** → out_for_delivery, cancelled
- **out_for_delivery** → delivered, cancelled
- **delivered** → (terminal state)
- **cancelled** → (terminal state)

### Status Descriptions

- **pending**: Order created, awaiting confirmation
- **pending_payment**: Order created, waiting for payment
- **confirmed**: Restaurant accepted the order
- **preparing**: Restaurant is preparing the food
- **ready_for_pickup**: Food is ready, waiting for driver
- **out_for_delivery**: Driver picked up, on the way
- **delivered**: Order completed successfully
- **cancelled**: Order was cancelled

## Database Schema

### Orders Table

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    vendor_id INTEGER NOT NULL,
    vendor_name VARCHAR(255),
    driver_id INTEGER,
    driver_name VARCHAR(255),
    items TEXT,  -- JSON array
    subtotal FLOAT NOT NULL,
    tax_rate FLOAT DEFAULT 0.0,
    tax_amount FLOAT DEFAULT 0.0,
    delivery_fee FLOAT DEFAULT 0.0,
    tip FLOAT DEFAULT 0.0,
    platform_fee FLOAT DEFAULT 0.0,
    total_amount FLOAT NOT NULL,
    delivery_address TEXT,  -- JSON
    delivery_instructions TEXT,
    delivery_latitude FLOAT,
    delivery_longitude FLOAT,
    driver_location TEXT,  -- JSON
    status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    payment_method VARCHAR(50),
    invoice_number VARCHAR(50),
    invoice_generated BOOLEAN DEFAULT FALSE,
    invoice_pdf_url VARCHAR(500),
    coupa_synced BOOLEAN DEFAULT FALSE,
    coupa_invoice_id VARCHAR(100),
    coupa_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    preparing_at TIMESTAMP,
    ready_at TIMESTAMP,
    delivered_at TIMESTAMP,
    dispatched_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(50),
    auto_dispatched BOOLEAN DEFAULT FALSE,
    broadcast_to_drivers BOOLEAN DEFAULT FALSE,
    broadcast_at TIMESTAMP,
    broadcast_radius_km FLOAT
);

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX idx_orders_driver_id ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

## Integration with Other Services

### User Service (8002)
- Validates customer_id
- Retrieves customer information
- Updates customer order stats

### Restaurant Service (8003)
- Validates vendor_id and menu items
- Checks restaurant availability
- Notifies restaurant of new orders

### Driver Service (8004)
- Assigns drivers to orders
- Receives driver location updates
- Tracks driver availability

### Payment Service (8006)
- Processes payments
- Updates payment status
- Handles refunds for cancellations

### Notification Service (8007)
- Sends order confirmation emails
- Pushes status updates to mobile apps
- SMS notifications for delivery

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://postgres:postgres@localhost:5432/dollor |
| SERVICE_PORT | Port to run the service | 8005 |
| LOG_LEVEL | Logging level | INFO |

## Health Checks

```bash
# Health endpoint
curl http://localhost:8005/health

# Metrics endpoint
curl http://localhost:8005/metrics
```

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```
