# Dollor.ai Location Service

Real-time location tracking, geocoding, and geospatial services for the Dollor.ai platform.

## Overview

The Location Service handles all location-based operations including:
- Real-time driver location tracking and updates
- Geocoding (address to coordinates conversion)
- Reverse geocoding (coordinates to address conversion)
- Distance and ETA calculations
- Nearby driver search within specified radius
- Geofencing and delivery zone management
- Service area validation

## Service Information

- **Port**: 8007
- **Error Prefix**: LOC
- **Version**: 1.0.0

## Features

### 1. Driver Location Tracking
- Real-time location updates from drivers
- GPS coordinates with heading, speed, and accuracy
- Cached in Redis for fast access (5-minute TTL)
- Historical location tracking
- Location age tracking

### 2. Geocoding Services
- Convert addresses to GPS coordinates
- Reverse geocoding from coordinates to addresses
- Caching layer to reduce API calls
- Uses Nominatim (OpenStreetMap) for geocoding

### 3. Distance & ETA Calculations
- Geodesic distance calculations between two points
- Estimated time of arrival based on average speed
- Distance provided in both kilometers and miles

### 4. Nearby Driver Search
- Find available drivers within a radius
- Redis geospatial indexing for performance
- Distance and ETA for each nearby driver
- Configurable radius and result limits

### 5. Delivery Zones (Geofencing)
- Define circular delivery zones by city
- Check if location is within service area
- Calculate delivery fees based on distance
- Support for multiple overlapping zones

## API Endpoints

### Driver Location Management

#### Update Driver Location
```http
POST /api/locations/driver
Content-Type: application/json

{
  "driver_id": 123,
  "latitude": 37.7749,
  "longitude": -122.4194,
  "heading": 90.0,
  "speed": 45.5,
  "accuracy": 10.0,
  "is_available": true,
  "is_on_delivery": false,
  "current_order_id": null
}
```

#### Get Driver Location
```http
GET /api/locations/driver/{driver_id}
```

#### Get Driver Location History
```http
GET /api/locations/driver/{driver_id}/history?limit=100&start_time=2024-01-01T00:00:00Z
```

### Nearby Driver Search

#### Find Nearby Drivers
```http
POST /api/locations/nearby-drivers
Content-Type: application/json

{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radius_km": 5.0,
  "available_only": true,
  "limit": 10
}
```

Response:
```json
{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "radius_km": 5.0,
  "drivers": [
    {
      "driver_id": 456,
      "latitude": 37.7850,
      "longitude": -122.4100,
      "distance_km": 1.23,
      "eta_minutes": 2,
      "is_available": true,
      "is_on_delivery": false
    }
  ],
  "total_found": 1
}
```

### Geocoding

#### Geocode Address
```http
POST /api/locations/geocode
Content-Type: application/json

{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

Response:
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA",
  "formatted_address": "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
  "latitude": 37.4224764,
  "longitude": -122.0842499,
  "city": "Mountain View",
  "state": "California",
  "country": "United States",
  "postal_code": "94043",
  "from_cache": false
}
```

#### Reverse Geocode
```http
POST /api/locations/reverse-geocode
Content-Type: application/json

{
  "latitude": 37.4224764,
  "longitude": -122.0842499
}
```

### Distance Calculation

#### Calculate Distance & ETA
```http
POST /api/locations/distance
Content-Type: application/json

{
  "origin_lat": 37.7749,
  "origin_lon": -122.4194,
  "dest_lat": 37.8044,
  "dest_lon": -122.2712
}
```

Response:
```json
{
  "distance_km": 15.2,
  "distance_miles": 9.44,
  "estimated_duration_minutes": 23,
  "origin": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "destination": {
    "latitude": 37.8044,
    "longitude": -122.2712
  }
}
```

### Delivery Zones

#### Create Delivery Zone
```http
POST /api/locations/zones
Content-Type: application/json

{
  "name": "Downtown San Francisco",
  "city": "San Francisco",
  "state": "CA",
  "center_latitude": 37.7749,
  "center_longitude": -122.4194,
  "radius_km": 5.0,
  "base_delivery_fee": 3.99,
  "per_km_fee": 0.50
}
```

#### Get All Delivery Zones
```http
GET /api/locations/zones?city=San Francisco&active_only=true
```

#### Check Delivery Zone Coverage
```http
POST /api/locations/zones/check?latitude=37.7749&longitude=-122.4194
```

Response:
```json
{
  "is_covered": true,
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "zones": [
    {
      "zone_id": 1,
      "zone_name": "Downtown San Francisco",
      "city": "San Francisco",
      "distance_from_center_km": 0.0,
      "base_delivery_fee": 3.99,
      "per_km_fee": 0.50,
      "estimated_delivery_fee": 3.99
    }
  ],
  "message": "Location is covered by 1 zone(s)"
}
```

### Utility Endpoints

#### Get Service Area Configuration
```http
GET /api/locations/service-area
```

#### Clear Driver Location Cache
```http
DELETE /api/locations/driver/{driver_id}/clear-cache
```

## Error Codes

All errors follow the format `LOC-XXX`:

### Validation Errors (1xx)
- `LOC-101`: Invalid coordinates
- `LOC-102`: Location outside service area

### Not Found Errors (3xx)
- `LOC-301`: Driver location not found

### Business Logic Errors (4xx)
- `LOC-401`: Cannot calculate route

### External Service Errors (5xx)
- `LOC-501`: Maps API unavailable

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dollor

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_TTL=300  # 5 minutes

# Geocoding
GEOCODING_USER_AGENT=dollor-ai-location-service

# Service Area (San Francisco Bay Area example)
SERVICE_AREA_CENTER_LAT=37.7749
SERVICE_AREA_CENTER_LON=-122.4194
SERVICE_AREA_RADIUS_KM=50

# Delivery Settings
MAX_DELIVERY_RADIUS_KM=10
AVERAGE_SPEED_KMH=40
```

## Database Models

### DriverLocation
Stores real-time and historical driver locations:
- `driver_id`: Driver identifier
- `latitude`, `longitude`: GPS coordinates
- `heading`: Direction in degrees (0-360)
- `speed`: Current speed in km/h
- `accuracy`: GPS accuracy in meters
- `is_available`: Driver availability status
- `is_on_delivery`: Active delivery status
- `current_order_id`: Current order assignment
- `recorded_at`: Timestamp of location update

### DeliveryZone
Defines service coverage areas:
- `name`: Zone name
- `city`, `state`: Location
- `center_latitude`, `center_longitude`: Zone center
- `radius_km`: Coverage radius
- `base_delivery_fee`: Base fee
- `per_km_fee`: Per-kilometer fee
- `is_active`: Zone status

### LocationCache
Caches geocoding results:
- `address`: Original address
- `latitude`, `longitude`: Geocoded coordinates
- `formatted_address`: Standardized address
- `city`, `state`, `country`, `postal_code`: Address components
- `cache_hits`: Usage counter

## Running the Service

### Local Development

1. Install dependencies:
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/services/core/location-service
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dollor
export REDIS_URL=redis://localhost:6379/0
```

3. Run the service:
```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8007 --reload
```

### Docker

Build and run with Docker:
```bash
docker build -t dollor-location-service .
docker run -p 8007:8007 \
  -e DATABASE_URL=postgresql://postgres:postgres@db:5432/dollor \
  -e REDIS_URL=redis://redis:6379/0 \
  dollor-location-service
```

### Docker Compose

```yaml
version: '3.8'

services:
  location-service:
    build: .
    ports:
      - "8007:8007"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/dollor
      - REDIS_URL=redis://redis:6379/0
      - SERVICE_AREA_CENTER_LAT=37.7749
      - SERVICE_AREA_CENTER_LON=-122.4194
      - SERVICE_AREA_RADIUS_KM=50
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=dollor
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Health Checks

The service provides standard health check endpoints:

```http
GET /health
GET /health/live
GET /health/ready
```

## Metrics

Prometheus metrics available at:
```http
GET /metrics
```

## Architecture

### Real-Time Location Tracking

1. **Driver Updates Location**:
   - POST request to `/api/locations/driver`
   - Location stored in PostgreSQL for history
   - Cached in Redis with 5-minute TTL
   - Added to Redis geospatial index if available

2. **Querying Driver Location**:
   - First checks Redis cache (fast)
   - Falls back to PostgreSQL if cache miss
   - Returns location age in seconds

### Nearby Driver Search

1. **Redis-based (Fast)**:
   - Uses Redis GEORADIUS command
   - Only for available drivers
   - Results sorted by distance
   - TTL prevents stale data

2. **Database-based (Fallback)**:
   - Queries recent locations (last 5 minutes)
   - Calculates distances in application
   - Filters by radius and availability

### Geocoding Strategy

1. **Cache First**:
   - Check PostgreSQL cache for address
   - Increment cache hit counter

2. **Geocode on Miss**:
   - Use Nominatim geocoding service
   - Store result in cache
   - Extract address components

3. **Error Handling**:
   - Timeout handling for slow requests
   - Graceful degradation on service errors

## Performance Considerations

### Caching
- Redis caching for driver locations (5-minute TTL)
- PostgreSQL cache for geocoding results
- Geospatial indexing for nearby searches

### Database Indexes
- Composite index on `(driver_id, is_available, recorded_at)`
- Spatial index on `(latitude, longitude)`
- Index on driver_id for quick lookups

### Rate Limiting
Consider implementing rate limiting for:
- Geocoding API calls (to avoid external API limits)
- Location update frequency per driver
- Nearby driver search queries

## Integration with Other Services

### Driver Service
- Provides driver_id for location tracking
- Validates driver existence
- Syncs availability status

### Order Service
- Queries nearby drivers for assignment
- Tracks driver location during delivery
- Calculates delivery ETAs

### Customer App
- Real-time driver tracking during delivery
- ETA updates based on current location
- Delivery zone validation for addresses

## Future Enhancements

1. **Advanced Routing**:
   - Integration with Google Maps Directions API
   - Traffic-aware ETA calculations
   - Multi-stop route optimization

2. **Geofencing Events**:
   - Webhooks for zone entry/exit
   - Automatic status updates
   - Location-based notifications

3. **Heat Maps**:
   - Driver density visualization
   - High-demand area identification
   - Zone optimization recommendations

4. **Location Accuracy**:
   - GPS accuracy filtering
   - Outlier detection
   - Location interpolation

5. **WebSocket Support**:
   - Real-time location streaming
   - Live tracking updates
   - Reduced polling overhead

## Support

For issues or questions about the Location Service:
- Check logs: `docker logs dollor-location-service`
- Review error codes in responses
- Contact the Dollor.ai platform team

## License

Copyright (c) 2024 Dollor.ai - All Rights Reserved
