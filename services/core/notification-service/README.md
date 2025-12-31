# Notification Service

Multi-channel notification microservice for Dollor.ai platform.

## Overview

Handles all notifications for:
- Email (SMTP)
- Push (Firebase FCM)
- SMS (Twilio)
- In-app notifications

## Port

`8009`

## Error Codes

| Code | Description |
|------|-------------|
| NTF-101 | Invalid email address |
| NTF-102 | Unknown email template |
| NTF-201 | User not found |
| NTF-202 | No FCM token registered |
| NTF-301 | Invalid phone number |
| NTF-401 | Order not found |
| NTF-501 | Email service error |
| NTF-502 | Push service error |
| NTF-503 | SMS service error |

## Endpoints

### Email
- `POST /api/notifications/email/send` - Send templated email
- `POST /api/notifications/email/vendor-approval` - Vendor approval email
- `POST /api/notifications/email/vendor-registration` - Vendor registration email
- `POST /api/notifications/email/driver-approval` - Driver approval email
- `POST /api/notifications/email/driver-registration` - Driver registration email

### Push
- `POST /api/notifications/push/send` - Send push notification
- `POST /api/notifications/push/topic` - Send to FCM topic

### SMS
- `POST /api/notifications/sms/send` - Send SMS

### Orders
- `POST /api/notifications/order` - Send order notification (auto-routes)

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
# Or with uvicorn
uvicorn main:app --reload --port 8009
```

## Docker

```bash
# Build
docker build -t dollor/notification-service:dev .

# Run
docker run -p 8009:8009 \
  -e DATABASE_URL=postgresql://... \
  -e SMTP_USER=... \
  -e SMTP_PASSWORD=... \
  dollor/notification-service:dev
```

## Kubernetes

```bash
# Deploy to dev
kubectl apply -k infrastructure/kubernetes/services/notification-service/overlays/dev

# Deploy to staging
kubectl apply -k infrastructure/kubernetes/services/notification-service/overlays/staging

# Deploy to production
kubectl apply -k infrastructure/kubernetes/services/notification-service/overlays/production
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SMTP_HOST` | SMTP server host | smtp.gmail.com |
| `SMTP_PORT` | SMTP server port | 587 |
| `SMTP_USER` | SMTP username | Required |
| `SMTP_PASSWORD` | SMTP password | Required |
| `FROM_EMAIL` | Sender email address | noreply@dollor.ai |
| `FROM_NAME` | Sender display name | Dollor.ai |
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase credentials JSON | Optional |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Optional |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Optional |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | Optional |
| `ENVIRONMENT` | dev/staging/production | development |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry endpoint | Optional |

## Health Checks

- `GET /health` - Full health check
- `GET /ready` - Readiness check
- `GET /live` - Liveness check
- `GET /api/notifications/health` - Service-specific health
