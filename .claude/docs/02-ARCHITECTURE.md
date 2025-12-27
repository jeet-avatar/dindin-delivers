# Dollor.ai Architecture

---

## Repository Structure

### eatfair-ios (Primary)
```
eatfair-ios/
├── apps/
│   ├── ios/                    # iOS Apps (Swift)
│   │   ├── customer/           # Customer App
│   │   ├── delivery/           # Driver App
│   │   └── restaurant/         # Restaurant App
│   └── web/p2p-platform/
│       ├── backend/            # Python FastAPI
│       └── frontend/           # React Admin Portal
├── services/core/              # 18 Microservices
└── infrastructure/             # K8s, Terraform, ArgoCD
```

### eatfair-android (Separate)
```
eatfair-android/
├── app/         # Customer App (Kotlin)
├── orderapp/    # Driver App
├── partner/     # Restaurant App
└── shared/      # Shared Library
```

---

## Mobile Apps

### iOS Apps
| App | Bundle ID | Purpose |
|-----|-----------|---------|
| Customer | com.eatfair.customer | Order food, Request rides |
| Driver | com.eatfair.delivery | Deliver food, Drive riders |
| Restaurant | com.eatfair.restaurant | Manage orders |

### Android Apps
| Module | Package | Purpose |
|--------|---------|---------|
| app | ai.dollor.customer | Order food, Request rides |
| orderapp | ai.dollor.driver | Deliver food, Drive riders |
| partner | ai.dollor.restaurant | Manage orders |

---

## Microservices (18 Total)

| Service | Port | Purpose |
|---------|------|---------|
| auth-service | 8001 | Customer authentication |
| user-service | 8002 | Customer profiles |
| driver-service | 8003 | Driver profiles, documents |
| restaurant-service | 8004 | Restaurant profiles |
| order-service | 8005 | Food order lifecycle |
| payment-service | 8006 | Stripe payments |
| location-service | 8007 | Real-time tracking |
| menu-service | 8008 | Menu management |
| notification-service | 8009 | Push, SMS, Email |
| restaurant-auth-service | 8010 | Vendor auth |
| driver-auth-service | 8011 | Driver auth |
| rating-service | 8013 | Reviews, ratings |
| ride-service | 8014 | Rideshare requests |
| pricing-service | 8015 | Fare calculation |
| analytics-service | 8016 | ClickHouse analytics |
| negotiation-service | 8017 | Price negotiation |
| chat-service | 8018 | Real-time messaging |
| call-service | 8019 | Phone masking (Twilio) |

---

## P2P Platform

### Backend (FastAPI)
Path: `apps/web/p2p-platform/backend/`

| File | Purpose |
|------|---------|
| main_new.py | All API endpoints |
| models.py | SQLAlchemy models |
| database.py | DB connection |

### Frontend (React)
Path: `apps/web/p2p-platform/frontend/`
- Admin Portal at `/admin`
- Order management, Analytics

---

## AWS Staging

| Resource | Value |
|----------|-------|
| EKS Cluster | dollor-staging |
| ECR | 134607809447.dkr.ecr.us-east-1.amazonaws.com |
| RDS | dollor-staging.c23qcukqe810.us-east-1.rds.amazonaws.com |
| VPC | vpc-06b31cf4c5205c340 |
