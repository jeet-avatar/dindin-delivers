# Dollor.ai - Ride Service

Microservice handling rideshare operations for the Dollor.ai platform.

## Overview

The Ride Service manages all rideshare-related functionality including ride requests, driver matching, real-time tracking, ride status management, fare calculation, and ride history.

## Features

- **Ride Request Management**: Create and manage ride requests
- **Driver Matching Algorithm**: Intelligent driver assignment based on proximity and availability
- **Real-time Tracking**: Track driver location and ETA
- **Ride Status Management**: Complete ride lifecycle tracking (requested → accepted → driver_arriving → in_progress → completed)
- **Fare Estimation**: Calculate fares based on distance, time, and ride type
- **Ride Cancellation**: Handle cancellations from customers, drivers, or system
- **Ride History**: Complete ride history for customers and drivers
- **Scheduled Rides**: Book rides for future pickup times
- **Ride Sharing (Pooling)**: Support for shared rides to reduce costs
- **Route Optimization**: Optimize routes for shared rides
- **Driver ETA Calculation**: Real-time ETA updates
- **Ride Statistics**: Analytics for customers and drivers

## Configuration

### Port
- **Service Port**: 8014
- **Error Prefix**: RIDE

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dollor

# Service
SERVICE_NAME=ride-service
SERVICE_PORT=8014
```

## API Endpoints

### Fare Estimation

#### Estimate Ride Fare
```http
POST /api/rides/estimate-fare
Query Parameters:
  - pickup_lat: float (required)
  - pickup_lon: float (required)
  - dropoff_lat: float (required)
  - dropoff_lon: float (required)
  - ride_type: string (default: "standard")
  - promo_code: string (optional)

Response:
{
  "ride_type": "standard",
  "distance_km": 10.5,
  "duration_min": 25,
  "base_fare": 2.50,
  "distance_fare": 12.60,
  "time_fare": 7.50,
  "surge_multiplier": 1.2,
  "subtotal": 27.12,
  "discount": 2.71,
  "total": 24.41,
  "currency": "USD"
}
```

### Ride Requests

#### Create Ride Request
```http
POST /api/rides

Body:
{
  "customer_id": 123,
  "customer_name": "John Doe",
  "customer_phone": "+1234567890",
  "pickup": {
    "address": "123 Main St, City, State 12345",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "instructions": "Near the blue awning"
  },
  "dropoff": {
    "address": "456 Oak Ave, City, State 12345",
    "latitude": 40.7589,
    "longitude": -73.9851,
    "instructions": "Main entrance"
  },
  "ride_type": "standard",
  "payment_method_id": "pm_123456",
  "is_scheduled": false,
  "is_shared": false,
  "max_passengers": 1,
  "promo_code": "SAVE10",
  "notes": "Extra trunk space needed"
}

Response: 201 Created
{
  "id": 1,
  "ride_id": "RIDE-123456",
  "customer_id": 123,
  "driver_id": 45,
  "driver_name": "Jane Smith",
  "driver_phone": "+1234567891",
  "driver_rating": 4.8,
  "vehicle_make": "Toyota",
  "vehicle_model": "Camry",
  "vehicle_color": "Black",
  "vehicle_plate": "ABC123",
  "ride_type": "standard",
  "status": "accepted",
  "pickup_address": "123 Main St, City, State 12345",
  "pickup_latitude": 40.7128,
  "pickup_longitude": -74.0060,
  "dropoff_address": "456 Oak Ave, City, State 12345",
  "dropoff_latitude": 40.7589,
  "dropoff_longitude": -73.9851,
  "estimated_distance_km": 10.5,
  "estimated_duration_min": 25,
  "driver_eta_minutes": 5,
  "total_fare": 24.41,
  "currency": "USD",
  "requested_at": "2024-01-15T10:30:00Z",
  "accepted_at": "2024-01-15T10:30:15Z",
  "completed_at": null
}
```

#### Get Ride Details
```http
GET /api/rides/{ride_id}

Response: 200 OK
```

#### Get Customer Rides
```http
GET /api/rides/customer/{customer_id}
Query Parameters:
  - status: string (optional) - Filter by status
  - limit: int (default: 50, max: 100)
  - offset: int (default: 0)

Response: 200 OK
[{ride}, {ride}, ...]
```

#### Get Driver Rides
```http
GET /api/rides/driver/{driver_id}
Query Parameters:
  - status: string (optional)
  - limit: int (default: 50, max: 100)
  - offset: int (default: 0)

Response: 200 OK
[{ride}, {ride}, ...]
```

### Ride Status Management

#### Update Ride Status
```http
PUT /api/rides/{ride_id}/status
Query Parameters:
  - new_status: string (required)
    Valid values: searching, accepted, driver_arriving, driver_arrived, in_progress, completed, cancelled
  - latitude: float (optional) - Driver current latitude
  - longitude: float (optional) - Driver current longitude

Response: 200 OK
{
  "ride_id": "RIDE-123456",
  "status": "driver_arriving",
  "updated_at": "2024-01-15T10:32:00Z"
}
```

#### Update Driver Location
```http
PUT /api/rides/{ride_id}/driver-location

Body:
{
  "driver_id": 45,
  "latitude": 40.7200,
  "longitude": -74.0050,
  "heading": 270.5
}

Response: 200 OK
{
  "ride_id": "RIDE-123456",
  "driver_eta_minutes": 3,
  "updated_at": "2024-01-15T10:33:00Z"
}
```

### Ride Cancellation

#### Cancel Ride
```http
POST /api/rides/{ride_id}/cancel
Query Parameters:
  - cancelled_by: string (required) - "customer", "driver", or "system"

Body:
{
  "reason": "customer_request",
  "notes": "Changed plans"
}

Response: 200 OK
{
  "ride_id": "RIDE-123456",
  "status": "cancelled",
  "cancelled_by": "customer",
  "cancelled_at": "2024-01-15T10:35:00Z"
}
```

### Ride Rating

#### Rate Ride
```http
POST /api/rides/{ride_id}/rate
Query Parameters:
  - rated_by: string (required) - "customer" or "driver"

Body:
{
  "rating": 5.0,
  "feedback": "Great ride, very professional driver!"
}

Response: 200 OK
{
  "ride_id": "RIDE-123456",
  "rating": 5.0,
  "rated_by": "customer"
}
```

### Scheduled Rides

#### Get Scheduled Rides
```http
GET /api/rides/scheduled/customer/{customer_id}

Response: 200 OK
[{ride}, {ride}, ...]
```

### Statistics

#### Get Customer Ride Statistics
```http
GET /api/rides/stats/customer/{customer_id}

Response: 200 OK
{
  "customer_id": 123,
  "total_rides": 45,
  "total_spent": 1250.50,
  "total_distance_km": 485.2,
  "average_rating": 4.8
}
```

#### Get Driver Ride Statistics
```http
GET /api/rides/stats/driver/{driver_id}

Response: 200 OK
{
  "driver_id": 45,
  "total_rides": 234,
  "total_earnings": 5678.90,
  "total_distance_km": 2345.6,
  "average_rating": 4.9,
  "cancellations": 3
}
```

## Ride Types

The service supports four ride types:

- **Standard**: Regular sedan, up to 4 passengers
  - Base fare: $2.50
  - Per km: $1.20
  - Per minute: $0.30

- **Premium**: Luxury vehicle, up to 4 passengers
  - Base fare: $5.00
  - Per km: $2.00
  - Per minute: $0.50

- **XL**: Large vehicle (SUV/Van), up to 6 passengers
  - Base fare: $4.00
  - Per km: $1.80
  - Per minute: $0.40

- **Shared**: Shared ride with other passengers
  - Base fare: $1.50
  - Per km: $0.80
  - Per minute: $0.20

## Ride Status Flow

```
requested → searching → accepted → driver_arriving → driver_arrived → in_progress → completed
                ↓           ↓              ↓                ↓
            cancelled   cancelled      cancelled        cancelled
```

Valid status transitions:
- `requested` → `searching`, `accepted`, `cancelled`
- `searching` → `accepted`, `cancelled`
- `accepted` → `driver_arriving`, `cancelled`, `cancelled_by_driver`
- `driver_arriving` → `driver_arrived`, `cancelled`, `cancelled_by_driver`
- `driver_arrived` → `in_progress`, `cancelled`, `cancelled_by_driver`
- `in_progress` → `completed`

## Error Codes

All errors follow the format: `RIDE-{CATEGORY}{NUMBER}`

### Validation Errors (1xx)
- `RIDE-101`: Invalid rating value

### Resource Not Found (3xx)
- `RIDE-301`: Ride not found

### Business Logic Errors (4xx)
- `RIDE-401`: Invalid status transition
- `RIDE-402`: Ride cannot be cancelled
- `RIDE-403`: Can only rate completed rides

## Database Schema

### Rides Table
- Complete ride information
- Customer and driver details
- Pickup/dropoff locations
- Fare calculation and pricing
- Status tracking with timestamps
- Driver ETA and location
- Payment information
- Ratings and feedback

### Scheduled Rides Table
- Future ride bookings
- Recurring ride patterns
- Scheduling information

### Ride Pools Table
- Shared ride groups
- Route optimization data
- Capacity tracking

## Development

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Run Locally
```bash
python main.py
```

The service will start on `http://localhost:8014`

### Run with Docker
```bash
# Build
docker build -t dollor-ride-service .

# Run
docker run -p 8014:8014 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/dollor \
  dollor-ride-service
```

## Health Check

The service includes a health check endpoint:

```http
GET /health

Response: 200 OK
{
  "status": "healthy",
  "service": "ride-service",
  "version": "1.0.0"
}
```

## Integration

### With Driver Service
- Query available drivers near pickup location
- Get driver profile and vehicle information
- Update driver status when ride is assigned

### With Payment Service
- Process ride payments on completion
- Handle refunds for cancellations
- Apply promo codes and discounts

### With Notification Service
- Send push notifications for status updates
- Notify customer when driver arrives
- Send ride receipts

### With User Service
- Get customer profile information
- Update ride statistics
- Award loyalty points

## Architecture Notes

- Uses shared library for logging, tracing, metrics, and error handling
- PostgreSQL for ride data persistence
- RESTful API design
- Stateless microservice architecture
- Docker containerized for easy deployment

## Future Enhancements

- Real-time location tracking with WebSocket
- Advanced driver matching algorithm with ML
- Dynamic surge pricing based on demand
- Multi-stop ride support
- Integration with mapping services (Google Maps, Mapbox)
- Ride splitting for shared costs
- Carbon footprint tracking
- Accessibility features (wheelchair access, etc.)

## License

Copyright 2024 Dollor.ai - All Rights Reserved
