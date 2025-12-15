# Location Service API Reference

Quick reference for all Location Service endpoints.

## Base URL
```
http://localhost:8007
```

## Endpoints Summary

### Driver Location Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/locations/driver` | Update driver location |
| GET | `/api/locations/driver/{driver_id}` | Get current driver location |
| GET | `/api/locations/driver/{driver_id}/history` | Get location history |
| DELETE | `/api/locations/driver/{driver_id}/clear-cache` | Clear cached location |

### Nearby Driver Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/locations/nearby-drivers` | Find drivers within radius |

### Geocoding

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/locations/geocode` | Address to coordinates |
| POST | `/api/locations/reverse-geocode` | Coordinates to address |

### Distance & ETA

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/locations/distance` | Calculate distance and ETA |

### Delivery Zones

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/locations/zones` | Create delivery zone |
| GET | `/api/locations/zones` | List all zones |
| GET | `/api/locations/zones/{zone_id}` | Get specific zone |
| POST | `/api/locations/zones/check` | Check zone coverage |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations/service-area` | Get service area config |

## Example Requests

### 1. Update Driver Location

```bash
curl -X POST http://localhost:8007/api/locations/driver \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": 123,
    "latitude": 37.7749,
    "longitude": -122.4194,
    "heading": 90.0,
    "speed": 45.5,
    "accuracy": 10.0,
    "is_available": true,
    "is_on_delivery": false
  }'
```

### 2. Find Nearby Drivers

```bash
curl -X POST http://localhost:8007/api/locations/nearby-drivers \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "radius_km": 5.0,
    "available_only": true,
    "limit": 10
  }'
```

### 3. Geocode Address

```bash
curl -X POST http://localhost:8007/api/locations/geocode \
  -H "Content-Type: application/json" \
  -d '{
    "address": "1600 Amphitheatre Parkway, Mountain View, CA"
  }'
```

### 4. Calculate Distance

```bash
curl -X POST http://localhost:8007/api/locations/distance \
  -H "Content-Type: application/json" \
  -d '{
    "origin_lat": 37.7749,
    "origin_lon": -122.4194,
    "dest_lat": 37.8044,
    "dest_lon": -122.2712
  }'
```

### 5. Check Delivery Zone Coverage

```bash
curl -X POST "http://localhost:8007/api/locations/zones/check?latitude=37.7749&longitude=-122.4194"
```

## Error Codes

| Code | Description |
|------|-------------|
| LOC-101 | Invalid coordinates |
| LOC-102 | Location outside service area |
| LOC-301 | Driver location not found |
| LOC-401 | Cannot calculate route |
| LOC-501 | Maps API unavailable |

## Data Models

### LocationUpdate
```json
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

### LocationResponse
```json
{
  "driver_id": 123,
  "latitude": 37.7749,
  "longitude": -122.4194,
  "heading": 90.0,
  "speed": 45.5,
  "accuracy": 10.0,
  "is_available": true,
  "is_on_delivery": false,
  "current_order_id": null,
  "recorded_at": "2024-01-01T12:00:00Z",
  "age_seconds": 5
}
```

### NearbyDriver
```json
{
  "driver_id": 456,
  "latitude": 37.7850,
  "longitude": -122.4100,
  "distance_km": 1.23,
  "eta_minutes": 2,
  "is_available": true,
  "is_on_delivery": false
}
```

### GeocodeResponse
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

### DistanceResponse
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

## Health & Metrics

### Health Check
```bash
curl http://localhost:8007/health
```

### Prometheus Metrics
```bash
curl http://localhost:8007/metrics
```

## Testing with HTTPie

```bash
# Update driver location
http POST localhost:8007/api/locations/driver \
  driver_id:=123 \
  latitude:=37.7749 \
  longitude:=-122.4194 \
  is_available:=true

# Find nearby drivers
http POST localhost:8007/api/locations/nearby-drivers \
  latitude:=37.7749 \
  longitude:=-122.4194 \
  radius_km:=5.0 \
  available_only:=true

# Geocode address
http POST localhost:8007/api/locations/geocode \
  address="1600 Amphitheatre Parkway, Mountain View, CA"
```
