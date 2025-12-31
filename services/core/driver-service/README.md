# Driver Service

Driver management microservice for Dollor.ai platform.

## Overview

Handles all driver operations for:
- Profile management
- Real-time location tracking
- Online/offline status
- Document verification
- Earnings and payouts

## Port

`8002`

## Error Codes

| Code | Description |
|------|-------------|
| DRV-101 | Driver not found |
| DRV-102 | Invalid profile data |
| DRV-201 | Invalid location coordinates |
| DRV-202 | Location not available |
| DRV-301 | Driver not approved to go online |
| DRV-302 | Invalid status value |
| DRV-401 | Invalid document type |
| DRV-501 | Database error |

## Endpoints

### Profile
- `GET /api/driver/profile` - Get driver profile
- `PUT /api/driver/profile` - Update driver profile

### Location
- `PUT /api/driver/location` - Update driver location
- `GET /api/driver/location` - Get driver location
- `POST /api/driver/nearby` - Find nearby drivers

### Status
- `PUT /api/driver/online` - Update online status
- `GET /api/driver/status` - Get driver status

### Notifications
- `PUT /api/driver/fcm-token` - Update FCM push token

### Documents
- `GET /api/driver/documents` - Get driver documents
- `POST /api/driver/documents` - Upload driver document

### Earnings
- `GET /api/driver/earnings` - Get earnings summary
- `GET /api/driver/earnings/history` - Get earnings history

### ERP/Admin
- `GET /erp/drivers` - List all drivers
- `PATCH /erp/drivers/{driver_id}/status` - Update driver status

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
# Or with uvicorn
uvicorn main:app --reload --port 8002
```

## Docker

```bash
# Build
docker build -t dollor/driver-service:dev .

# Run
docker run -p 8002:8002 \
  -e DATABASE_URL=postgresql://... \
  dollor/driver-service:dev
```

## Kubernetes

```bash
# Deploy to dev
kubectl apply -k infrastructure/kubernetes/services/driver-service/overlays/dev

# Deploy to staging
kubectl apply -k infrastructure/kubernetes/services/driver-service/overlays/staging

# Deploy to production
kubectl apply -k infrastructure/kubernetes/services/driver-service/overlays/production
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NOTIFICATION_SERVICE_URL` | Notification service URL | http://notification-service:8009 |
| `ENVIRONMENT` | dev/staging/production | development |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry endpoint | Optional |

## Health Checks

- `GET /health` - Full health check
- `GET /ready` - Readiness check
- `GET /live` - Liveness check
- `GET /api/driver/health` - Service-specific health

## Location Tracking

The service supports real-time location tracking with the following features:

- **Location Updates**: Drivers send GPS coordinates via `PUT /api/driver/location`
- **Location Freshness**: Locations older than 5 minutes are considered stale
- **Nearby Search**: Uses Haversine formula for accurate distance calculations
- **Search Radius**: Default 10km, configurable per request
