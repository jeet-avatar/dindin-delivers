# Location Service - Quick Start Guide

Get the Location Service running in 5 minutes.

## Prerequisites

- Python 3.12+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

## Option 1: Docker Compose (Recommended)

The fastest way to get started:

```bash
cd /Users/jeet/StudioProjects/eatfair-ios/services/core/location-service

# Start all services (location-service, postgres, redis)
docker-compose up -d

# View logs
docker-compose logs -f location-service

# Service will be available at http://localhost:8007
```

Test the service:
```bash
curl http://localhost:8007/health
```

## Option 2: Local Development

### Step 1: Install Dependencies

```bash
cd /Users/jeet/StudioProjects/eatfair-ios/services/core/location-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Setup Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### Step 3: Start Dependencies

Start PostgreSQL and Redis (if not running):

```bash
# Using Docker
docker run -d --name dollor-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=dollor \
  -p 5432:5432 \
  postgres:15-alpine

docker run -d --name dollor-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Step 4: Run the Service

```bash
# Run with Python
python main.py

# Or with uvicorn (with auto-reload)
uvicorn main:app --host 0.0.0.0 --port 8007 --reload
```

Service will be available at http://localhost:8007

## Quick Test

### Test 1: Update Driver Location

```bash
curl -X POST http://localhost:8007/api/locations/driver \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": 1,
    "latitude": 37.7749,
    "longitude": -122.4194,
    "is_available": true,
    "is_on_delivery": false
  }'
```

### Test 2: Get Driver Location

```bash
curl http://localhost:8007/api/locations/driver/1
```

### Test 3: Find Nearby Drivers

```bash
curl -X POST http://localhost:8007/api/locations/nearby-drivers \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "radius_km": 10
  }'
```

### Test 4: Geocode an Address

```bash
curl -X POST http://localhost:8007/api/locations/geocode \
  -H "Content-Type: application/json" \
  -d '{
    "address": "1 Market St, San Francisco, CA"
  }'
```

### Test 5: Calculate Distance

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

## Interactive API Documentation

Once the service is running, visit:

- **Swagger UI**: http://localhost:8007/docs
- **ReDoc**: http://localhost:8007/redoc

## Verify Installation

Check all endpoints are working:

```bash
# Health check
curl http://localhost:8007/health

# Service area config
curl http://localhost:8007/api/locations/service-area

# List delivery zones
curl http://localhost:8007/api/locations/zones
```

## Monitoring

### View Metrics

```bash
curl http://localhost:8007/metrics
```

### Check Logs

Docker:
```bash
docker-compose logs -f location-service
```

Local:
```bash
# Logs are output to stdout
```

### Redis Cache Stats

```bash
# Connect to Redis
redis-cli

# Check driver location cache
KEYS driver_location:*

# Check geospatial index
GEORADIUS available_drivers -122.4194 37.7749 10 km
```

## Common Issues

### Issue: "Database connection failed"

**Solution**: Ensure PostgreSQL is running and DATABASE_URL is correct.

```bash
# Check PostgreSQL
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -d dollor
```

### Issue: "Redis connection refused"

**Solution**: Ensure Redis is running and REDIS_URL is correct.

```bash
# Check Redis
docker ps | grep redis

# Test connection
redis-cli ping
```

### Issue: "Geocoding timeout"

**Solution**: Increase timeout or check internet connection. Nominatim requires internet access.

### Issue: "Invalid coordinates"

**Solution**: Ensure latitude is between -90 and 90, longitude between -180 and 180.

## Next Steps

1. **Read the full documentation**: See `README.md`
2. **API Reference**: See `API_REFERENCE.md`
3. **Configure service area**: Edit `.env` to match your coverage area
4. **Create delivery zones**: Use `/api/locations/zones` endpoint
5. **Integrate with other services**: Connect with driver-service and order-service

## Production Deployment

For production deployment:

1. Use environment-specific configuration
2. Enable HTTPS/TLS
3. Set up monitoring and alerting
4. Configure rate limiting
5. Use managed PostgreSQL and Redis
6. Enable backup and recovery
7. Set up horizontal scaling

See main `README.md` for detailed deployment instructions.

## Support

- Documentation: `README.md`
- API Reference: `API_REFERENCE.md`
- Issues: Contact Dollor.ai platform team

## Development Tips

### Watch Mode (Auto-reload)

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8007
```

### Debug Mode

```bash
export LOG_LEVEL=DEBUG
python main.py
```

### Test with HTTPie (prettier than curl)

```bash
# Install httpie
pip install httpie

# Use it
http POST localhost:8007/api/locations/driver \
  driver_id:=1 \
  latitude:=37.7749 \
  longitude:=-122.4194 \
  is_available:=true
```

### Database Migrations (Alembic)

If you need to modify the database schema:

```bash
# Initialize Alembic (first time only)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Add new column"

# Apply migration
alembic upgrade head
```

## File Structure

```
location-service/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container image
├── docker-compose.yml     # Local development stack
├── README.md              # Full documentation
├── API_REFERENCE.md       # API endpoint reference
├── QUICKSTART.md          # This file
├── .env.example           # Environment template
└── .gitignore            # Git ignore rules
```

Happy coding! 🚀
