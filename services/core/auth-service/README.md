# Auth Service

Authentication microservice for Dollor.ai platform.

## Overview

Handles all authentication for:
- Users (admin portal)
- Vendors (restaurants)
- Drivers (delivery/rideshare)
- Customers (app users)

## Port

`8001`

## Error Codes

| Code | Description |
|------|-------------|
| AUTH-101 | Invalid email format |
| AUTH-102 | Password too weak |
| AUTH-103 | Email already registered |
| AUTH-201 | Invalid credentials |
| AUTH-202 | Account not active |
| AUTH-203 | Token expired |
| AUTH-301 | User not found |

## Endpoints

### General Auth
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Driver Auth
- `POST /api/auth/driver/login` - Driver login
- `POST /api/auth/driver/register` - Driver registration
- `POST /api/auth/driver/google` - Google OAuth
- `GET /api/auth/driver/me` - Get driver profile

### Customer Auth
- `POST /api/auth/customer/login` - Customer login
- `POST /api/auth/customer/register` - Customer registration

### Password Reset
- `POST /api/auth/password-reset/request` - Request reset
- `POST /api/auth/password-reset/confirm` - Confirm reset

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
# Or with uvicorn
uvicorn main:app --reload --port 8001
```

## Docker

```bash
# Build
docker build -t dollor/auth-service:dev .

# Run
docker run -p 8001:8001 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET_KEY=... \
  dollor/auth-service:dev
```

## Kubernetes

```bash
# Deploy to dev
kubectl apply -k infrastructure/kubernetes/services/auth-service/overlays/dev

# Deploy to staging
kubectl apply -k infrastructure/kubernetes/services/auth-service/overlays/staging

# Deploy to production
kubectl apply -k infrastructure/kubernetes/services/auth-service/overlays/production
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET_KEY` | Secret for JWT signing | Required |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry | 1440 (24h) |
| `ENVIRONMENT` | dev/staging/production | development |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry endpoint | Optional |

## Health Checks

- `GET /health` - Full health check
- `GET /ready` - Readiness check
- `GET /live` - Liveness check
- `GET /api/auth/health` - Service-specific health
