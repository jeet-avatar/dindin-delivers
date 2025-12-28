# Dollor.ai Development Guide

---

## Quick Reference

### Start P2P Platform Locally
```bash
# Backend
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
source venv/bin/activate
uvicorn main_new:app --reload --port 8080

# Frontend (Admin Portal)
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/frontend
npm run dev
# Opens at http://localhost:5173/admin
```

### iOS Development
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios
open EatFair.xcworkspace
# Select scheme: eatfaircustomer | eatffairdelivery | eatffairrestaurant
```

### Android Development
```bash
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew :app:installDebug      # Customer
./gradlew :orderapp:installDebug # Driver
./gradlew :partner:installDebug  # Restaurant
```

---

## Admin Portal Access

```
URL:      http://localhost:5173/admin (local)
Email:    admin.invoice@dollor.ai
Password: AdminTest123

Routes:
- /admin              Dashboard
- /admin/invoices     Invoice Management
- /admin/orders       Order Management
- /admin/accounting   Vendor Payouts, Platform Revenue
```

---

## Docker Infrastructure

### Start All Services
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/services
docker-compose up -d
```

### Infrastructure Only
```bash
docker-compose up -d postgres redis zookeeper kafka kafka-ui
```

### Service Ports
| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| PostgreSQL | dollor-postgres | 5432 | Primary database |
| Redis | dollor-redis | 6379 | Cache, sessions, Geo |
| Zookeeper | dollor-zookeeper | 2181 | Kafka coordination |
| Kafka | dollor-kafka | 9093 (host) / 29092 (internal) | Event streaming |
| Kafka UI | dollor-kafka-ui | 8088 | Kafka monitoring |
| ClickHouse | dollor-clickhouse | 8123 (HTTP), 9000 (Native) | Analytics |

**Kafka UI:** http://localhost:8088

### Kafka Topics (Pre-configured)
| Topic | Partitions | Purpose |
|-------|------------|---------|
| `orders.events` | 12 | Order domain events |
| `orders.commands` | 12 | Order commands |
| `rides.events` | 12 | Ride domain events |
| `drivers.location` | 24 | Real-time driver GPS |
| `drivers.status` | 12 | Driver online/offline |
| `payments.events` | 6 | Payment events |
| `notifications.send` | 6 | Notification triggers |

---

## Microservices Local Development

### Start All Microservices
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/services
docker-compose up -d

# Start specific services only
docker-compose up -d postgres redis auth-service driver-service

# View logs
docker-compose logs -f auth-service driver-service

# Stop all
docker-compose down
```

### Health Check Endpoints
```bash
curl http://localhost:8001/health  # auth-service
curl http://localhost:8003/health  # driver-service
curl http://localhost:8009/health  # notification-service
curl http://localhost:8014/health  # ride-service
```

### Docker Environment (CRITICAL)
All microservices require this in Dockerfile:
```dockerfile
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/shared          # CRITICAL for shared library imports
ENV SERVICE_NAME={service-name}
ENV SERVICE_PORT={port}
```

---

## Environment Variables

### Database
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Microservices (for proxy)
```bash
RIDE_SERVICE_URL=http://ride-service:8014
RESTAURANT_SERVICE_URL=http://restaurant-service:8004
PRICING_SERVICE_URL=http://pricing-service:8015
LOCATION_SERVICE_URL=http://location-service:8007
```

### Push Notifications
```bash
FCM_SERVER_KEY=...
APNS_KEY_ID=...
APNS_TEAM_ID=...
APNS_AUTH_KEY_PATH=...
APNS_BUNDLE_ID=com.eatfair.customer
```

### Stripe Payment
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Twilio (Call Masking)
```bash
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
TWILIO_PROXY_SERVICE_SID=KSxxx
```

---

## Shared Library

All microservices use shared utilities from `services/shared/common.py`:
- `MicroserviceFactory` - Standard FastAPI setup
- `StructuredLogger` - JSON logging
- `ErrorCodes` - Standardized error codes

**Error Code Format**: `{SERVICE}-{CATEGORY}{NUMBER}`

| Category | Meaning | Example |
|----------|---------|---------|
| 1xx | Validation | `ORD-101` Invalid items |
| 2xx | Auth | `AUTH-201` Invalid credentials |
| 3xx | Not Found | `DRV-301` Driver not found |
| 4xx | Business Logic | `ORD-401` Cannot cancel |
| 5xx | External Service | `PAY-501` Stripe error |

---

## Git Worktree - Hotfix Workflow

### Repository Structure
```
/Users/jeet/StudioProjects/
├── eatfair-ios/              # Main development (branch: main)
│   └── scripts/hotfix.sh     # Hotfix helper script
└── eatfair-ios-hotfix/       # Hotfix worktree (branch: hotfix/base)
```

### Hotfix Commands
```bash
./scripts/hotfix.sh status          # Show worktree status
./scripts/hotfix.sh create fix-name # Create new hotfix
./scripts/hotfix.sh finish fix-name # Create PR after fix
./scripts/hotfix.sh sync            # Sync after merge
./scripts/hotfix.sh list            # List active hotfixes
```

### When to Use Hotfix Worktree
| Scenario | Use Hotfix? |
|----------|-------------|
| Production is down | Yes |
| Critical security vulnerability | Yes |
| Payment processing broken | Yes |
| Minor bug (can wait) | No |
| New feature | No |

---

## Running Tests

### Backend Tests
```bash
cd apps/web/p2p-platform/backend
pytest tests/ -v
```

### Android Staging Tests
```bash
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew :app:testStagingDebugUnitTest
```

### Run All Service Tests
```bash
cd services
for svc in core/*/; do
  echo "Testing $svc"
  cd $svc && pytest tests/ -v && cd ../..
done
```

---

## P2P Backend Docker

```bash
# Build
cd apps/web/p2p-platform/backend
docker build -t dollor-p2p-backend:latest .

# Run
docker run -d --name dollor-p2p-backend \
  -p 8080:8080 \
  --network=services_dollor-network \
  -e DATABASE_URL=postgresql://dollor:dollor_dev_password@dollor-postgres:5432/dollor \
  dollor-p2p-backend:latest

# View logs
docker logs dollor-p2p-backend -f
```
