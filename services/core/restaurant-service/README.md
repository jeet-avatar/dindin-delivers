# Restaurant Service

Microservice for managing restaurant profiles, verification workflows, and operations in the Dollor.ai platform.

## Overview

The Restaurant Service handles all restaurant-related operations including:
- Restaurant profile management (CRUD)
- Restaurant verification and approval workflow
- Operating hours management
- Document upload and verification
- Restaurant search by location and cuisine
- Performance metrics and analytics
- Mobile app integration

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_PORT` | Service port | `8004` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/dollor` |
| `ENVIRONMENT` | Environment (dev/staging/production) | `development` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry endpoint | - |

## API Endpoints

### Restaurant CRUD

#### Create Restaurant
```http
POST /api/restaurants
Content-Type: application/json

{
  "company_name": "Joe's Pizza Inc",
  "restaurant_name": "Joe's Pizza",
  "contact_name": "Joe Smith",
  "contact_email": "joe@joespizza.com",
  "contact_phone": "+1-555-0123",
  "cuisine_type": "Italian",
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zip_code": "10001"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "vendor_id": "VEND-123456",
  "company_name": "Joe's Pizza Inc",
  "restaurant_name": "Joe's Pizza",
  "cuisine_type": "Italian",
  "onboarding_status": "pending",
  "onboarding_phase": "basic_info",
  "created_at": "2025-12-14T12:00:00Z"
}
```

**Error Codes:**
- `REST-101`: Restaurant email already registered

#### Get Restaurant
```http
GET /api/restaurants/{vendor_id}
```

**Response:** `200 OK`

**Error Codes:**
- `REST-301`: Restaurant not found

#### Update Restaurant
```http
PUT /api/restaurants/{vendor_id}
Content-Type: application/json

{
  "restaurant_name": "Joe's Famous Pizza",
  "cuisine_type": "Italian, Pizza",
  "operating_hours": "{\"monday\": \"9:00-22:00\", \"tuesday\": \"9:00-22:00\"}",
  "delivery_available": true,
  "average_prep_time": 30
}
```

**Response:** `200 OK`

#### Delete Restaurant
```http
DELETE /api/restaurants/{vendor_id}
```

**Response:** `204 No Content`

### Operating Hours

#### Get Operating Hours
```http
GET /api/restaurants/{vendor_id}/operating-hours
```

**Response:** `200 OK`
```json
{
  "vendor_id": "VEND-123456",
  "operating_hours": "{\"monday\": \"9:00-22:00\"}",
  "average_prep_time": 30
}
```

#### Update Operating Hours
```http
PUT /api/restaurants/{vendor_id}/operating-hours
Content-Type: application/json

{
  "operating_hours": "{\"monday\": \"9:00-22:00\", \"tuesday\": \"9:00-22:00\"}"
}
```

**Response:** `200 OK`

### Verification & Approval

#### Upload Document
```http
POST /api/restaurants/{vendor_id}/documents
Content-Type: application/json

{
  "document_type": "food_license",
  "document_url": "https://s3.amazonaws.com/docs/food_license.pdf"
}
```

**Document Types:**
- `w9_form`
- `insurance`
- `food_license`
- `health_permit`
- `financial_statements`

**Response:** `200 OK`

**Error Codes:**
- `REST-102`: Invalid document type
- `REST-301`: Restaurant not found

#### Get Verification Status
```http
GET /api/restaurants/{vendor_id}/verification-status
```

**Response:** `200 OK`
```json
{
  "vendor_id": "VEND-123456",
  "onboarding_status": "pending",
  "onboarding_phase": "verification",
  "verification_status": "not_started",
  "documents_verified": false,
  "documents": {
    "w9_form": false,
    "insurance": false,
    "food_license": true,
    "health_permit": true,
    "financial_statements": false
  }
}
```

#### Approve/Reject Restaurant
```http
POST /api/restaurants/{vendor_id}/approve
Content-Type: application/json

{
  "vendor_id": "VEND-123456",
  "approved": true,
  "notes": "All documents verified successfully"
}
```

For rejection:
```json
{
  "vendor_id": "VEND-123456",
  "approved": false,
  "rejection_reason": "Food license expired",
  "notes": "Please resubmit with valid license"
}
```

**Response:** `200 OK`

### Search

#### Search Restaurants
```http
GET /api/restaurants?cuisine_type=Italian&city=New York&delivery_available=true&limit=20
```

**Query Parameters:**
- `search`: Text search (name, cuisine)
- `cuisine_type`: Filter by cuisine
- `city`: Filter by city
- `state`: Filter by state
- `delivery_available`: Filter by delivery availability
- `status`: Filter by onboarding status
- `latitude`: User latitude (for distance filter)
- `longitude`: User longitude (for distance filter)
- `radius_miles`: Search radius in miles (default: 25)
- `limit`: Max results (default: 50, max: 100)
- `offset`: Pagination offset

**Response:** `200 OK` - Array of restaurants

#### Search Nearby Restaurants
```http
GET /api/restaurants/search/nearby?latitude=40.7128&longitude=-74.0060&radius_miles=5&cuisine_type=Italian
```

**Query Parameters:**
- `latitude`: Required - User latitude
- `longitude`: Required - User longitude
- `radius_miles`: Search radius (default: 10, max: 50)
- `cuisine_type`: Optional - Filter by cuisine
- `delivery_available`: Optional - Filter by delivery
- `limit`: Max results (default: 20, max: 50)

**Response:** `200 OK` - Array of restaurants sorted by distance

### Performance Metrics

#### Get Restaurant Metrics
```http
GET /api/restaurants/{vendor_id}/metrics
```

**Response:** `200 OK`
```json
{
  "vendor_id": "VEND-123456",
  "performance_score": 85,
  "risk_rating": "low",
  "last_activity": "2025-12-14T12:00:00Z",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Update Restaurant Metrics
```http
PUT /api/restaurants/{vendor_id}/metrics?performance_score=90
```

**Response:** `200 OK`

### Mobile App

#### Update Device Info
```http
PUT /api/restaurants/{vendor_id}/device
Content-Type: application/json

{
  "device_id": "ABC123DEF456",
  "push_token": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "platform": "ios"
}
```

**Response:** `200 OK`

### Analytics

#### Get Analytics Summary
```http
GET /api/restaurants/analytics/summary
```

**Response:** `200 OK`
```json
{
  "total_restaurants": 150,
  "approved": 120,
  "pending": 25,
  "rejected": 5,
  "average_performance_score": 82.5
}
```

## Error Codes

All errors follow the format: `REST-XXX`

| Code | Description |
|------|-------------|
| `REST-101` | Restaurant email already registered |
| `REST-102` | Invalid document type |
| `REST-301` | Restaurant not found |

## Database Schema

Based on the `vendors` table:

```sql
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(50) UNIQUE NOT NULL,

    -- Company Information
    company_name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50),
    business_type VARCHAR(100),
    website VARCHAR(255),

    -- Restaurant-Specific
    restaurant_name VARCHAR(255),
    cuisine_type VARCHAR(100),
    operating_hours TEXT,
    seating_capacity INTEGER,
    delivery_available BOOLEAN DEFAULT TRUE,
    pickup_available BOOLEAN DEFAULT TRUE,
    average_prep_time INTEGER,

    -- Contact
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),

    -- Address
    street TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    latitude FLOAT,
    longitude FLOAT,

    -- Status
    onboarding_status VARCHAR(20) DEFAULT 'pending',
    onboarding_phase VARCHAR(20) DEFAULT 'not_started',
    risk_rating VARCHAR(10) DEFAULT 'medium',
    performance_score INTEGER DEFAULT 0,

    -- Documents
    food_license BOOLEAN DEFAULT FALSE,
    food_license_url VARCHAR(500),
    health_permit BOOLEAN DEFAULT FALSE,
    health_permit_url VARCHAR(500),
    w9_form BOOLEAN DEFAULT FALSE,
    w9_form_url VARCHAR(500),
    insurance BOOLEAN DEFAULT FALSE,
    insurance_url VARCHAR(500),

    -- Verification
    verification_status VARCHAR(50) DEFAULT 'not_started',
    documents_verified BOOLEAN DEFAULT FALSE,
    documents_verified_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP
);
```

## Development

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dollor
export ENVIRONMENT=development

# Run the service
python main.py
```

The service will be available at `http://localhost:8004`

### Docker

```bash
# Build
docker build -t dollor/restaurant-service:latest .

# Run
docker run -p 8004:8004 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/dollor \
  dollor/restaurant-service:latest
```

## Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (includes dependencies)
- `GET /metrics` - Prometheus metrics

## Dependencies

This service depends on:
- PostgreSQL database (shared `vendors` table)
- Shared common library for logging, tracing, metrics

## Integration

### With Other Services

- **Auth Service**: Authentication tokens for restaurant users
- **Order Service**: Restaurant receives and processes orders
- **Menu Service**: Manages restaurant menu items
- **Notification Service**: Sends notifications to restaurants
- **Document Service**: Handles document verification (Persona/Onfido)

### Workflow Example

1. Restaurant registers via `POST /api/restaurants`
2. Restaurant uploads documents via `POST /api/restaurants/{id}/documents`
3. Admin reviews and approves via `POST /api/restaurants/{id}/approve`
4. Restaurant becomes available in search results
5. Performance metrics updated as orders are completed

## Monitoring

Metrics exposed at `/metrics`:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration
- `restaurant_registrations_total` - Total registrations
- `restaurant_approvals_total` - Total approvals
- `restaurant_search_queries_total` - Total search queries

## License

Copyright 2025 Dollor.ai - All Rights Reserved
