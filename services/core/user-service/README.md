# User Service

Dollor.ai microservice for customer and rider profile management.

## Overview

The User Service handles all customer/rider profile operations for both food delivery and rideshare platforms.

## Port

- **Development**: 8002
- **Production**: 8002

## Error Codes

| Code | Description |
|------|-------------|
| USER-101 | Email already registered |
| USER-301 | Customer not found |
| USER-302 | Address not found |

## API Endpoints

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/{id}` | Get customer by ID |
| GET | `/api/customers/email/{email}` | Get customer by email |
| PUT | `/api/customers/{id}` | Update customer |
| DELETE | `/api/customers/{id}` | Soft delete customer |
| GET | `/api/customers` | Search customers |

### Addresses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers/{id}/addresses` | Get addresses |
| POST | `/api/customers/{id}/addresses` | Add address |
| PUT | `/api/customers/{id}/addresses/{addr_id}` | Update address |
| DELETE | `/api/customers/{id}/addresses/{addr_id}` | Delete address |

### Loyalty

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers/{id}/loyalty` | Get loyalty info |
| POST | `/api/customers/{id}/loyalty/add-points` | Add points |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/customers/{id}/stats/order-completed` | Record order |
| POST | `/api/customers/{id}/stats/ride-completed` | Record ride |

### Device

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/customers/{id}/device` | Update device info |

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dollor

# Run service
uvicorn main:app --reload --port 8002
```

## Docker

```bash
docker build -t dollor/user-service .
docker run -p 8002:8002 -e DATABASE_URL=... dollor/user-service
```

## Loyalty Tiers

| Tier | Points Required | Benefits |
|------|-----------------|----------|
| Bronze | 0 | Free delivery $50+, 10% birthday |
| Silver | 1,000 | Free delivery $30+, 15% birthday, Priority |
| Gold | 5,000 | Free delivery all, 20% birthday, Exclusive |
| Platinum | 10,000 | VIP support, 25% birthday, Early access |
