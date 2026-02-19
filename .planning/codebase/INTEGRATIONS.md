# External Integrations

**Analysis Date:** 2026-02-18

## APIs & External Services

**Payments:**
- Stripe - Payment intents, webhooks, Stripe Connect payouts to drivers
  - SDK/Client: `stripe==11.3.0` (backend), `stripe-android==21.29.0` (Android), Stripe iOS SDK (iOS)
  - Backend integration: `apps/web/p2p-platform/backend/stripe_integration.py`
  - Rideshare payments: `apps/web/p2p-platform/backend/rideshare_payments.py`
  - Auth env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Webhook endpoint: `POST /api/payments/webhook` (stripe signature verified)
  - Use cases: order payment intents, ride payment intents, driver Connect payouts on completion, tip transfers

**Maps & Location:**
- Google Maps Platform - ETA calculations, geocoding, address autocomplete
  - Backend: `httpx` HTTP calls to Directions API (`apps/web/p2p-platform/backend/google_maps_service.py`)
  - iOS: `GoogleMaps 9.0` + `GooglePlaces 9.0` via CocoaPods (`apps/ios/customer/Podfile`)
  - Android: `maps-compose 6.12.1` + `play-services-maps 19.2.0`
  - Auth: `GOOGLE_MAPS_API_KEY` (backend env var; iOS/Android from `local.properties` or xcconfig)
  - Google Web Client ID for Google Sign-In is environment-specific (staging vs production in `apps/android/app/build.gradle.kts:80-88`)

**Document Verification:**
- Persona (primary in production) - Driver/vendor identity document verification
  - SDK/Client: Direct HTTPS API via `httpx` (`apps/web/p2p-platform/backend/document_verification_service.py`)
  - Also supports Onfido and Veriff (configured via `DOCUMENT_VERIFICATION_PROVIDER`)
  - Auth env vars: `PERSONA_API_KEY`, `PERSONA_TEMPLATE_ID` (from AWS Secrets Manager in prod)
  - API: `https://withpersona.com/api/v1`

**Communications (Microservice):**
- Twilio - SMS notifications, phone number masking, call routing
  - SDK/Client: `twilio==8.10.0` in `services/core/notification-service/requirements.txt`
  - Call masking service: `services/core/call-service/main.py` (port 8019), uses Twilio Proxy
  - Auth env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (in notification/call services)

**AI/ML (Local Tooling):**
- Ollama - Local AI model for anti-hallucination lookups
  - Training data: `.claude/training/` (Modelfile + JSONL training files)
  - Model: `dollor-customer`
  - Used by: `.claude/tools/ask-dollor.sh`

## Data Storage

**Primary Database:**
- PostgreSQL on AWS RDS `db.t3.micro`
  - Connection: `DATABASE_URL` env var → AWS Secrets Manager `dollor/production/database-v2-*`
  - Client: SQLAlchemy 2.0.36 ORM (`apps/web/p2p-platform/backend/database.py`)
  - Pool: 5 connections, max_overflow=7, pool_pre_ping=True, pool_recycle=1800s
  - SSL: required in production (`sslmode=require`)
  - Statement timeout: 30 seconds
  - 22+ indexes added via `_run_startup_migrations()` in `main_new.py`

**Android Local Database:**
- Room 2.8.3 SQLite - Offline caching
  - Location: `apps/android/shared/src/main/java/com/eatfair/shared/data/dao/`
  - Used for: address storage (`AddressDao`), order caching (`OrderEntity`)

**Caching:**
- Redis (AWS ElastiCache) - `dollor-redis.uwva3u.0001.use1.cache.amazonaws.com:6379`
  - Client: `redis[hiredis]==5.0.1` (`apps/web/p2p-platform/backend/cache.py`)
  - Use cases: vendor list cache (30s TTL), menu cache (60s TTL), rate limiting (sliding window), password reset codes (900s TTL), WebSocket pub/sub
  - TLS enabled in production (`ssl=True`, `ssl_cert_reqs="none"` for AWS-managed certs)
  - Fallback: app continues working if Redis unavailable (all ops return None/False)

**File Storage:**
- AWS S3 bucket `dollor-ai-uploads` - Driver/vendor documents, menu images
  - Client: `boto3==1.35.80` (`apps/web/p2p-platform/backend/s3_service.py`)
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
  - CDN URL: `https://cdn.dollor.ai` (prod) via CloudFront
  - Fallback: local disk `/tmp/dollor_uploads` when S3 not configured

**Firestore (Firebase):**
- Used for FCM token storage and real-time notification routing
  - iOS: `db.collection("users").document(userId).setData(["fcmToken": token])` (`apps/ios/customer/eatfaircustomer/eatfaircustomerApp.swift:208`)
  - Android: `DollorFirebaseMessagingService.kt` in `apps/android/shared/`

## Authentication & Identity

**Firebase Authentication:**
- Provider: Firebase project `dollorai-production` (account: `support@dollor.ai`, project #65740760476)
- iOS: `FirebaseAuth` from firebase-ios-sdk 12.0.0 (SPM)
- Android: `firebase-auth-ktx` from Firebase BOM 32.7.0
- Use: Firebase handles Google Sign-In OAuth flow; the resulting Firebase UID / Google ID token is then exchanged with the Dollor.ai backend to issue a JWT
- Backend role: Verifies Google tokens, creates platform-specific JWTs
  - Customer: `POST /api/customer/google-auth`
  - Vendor: `POST /api/vendors/google-auth`
  - Driver: `POST /api/erp/drivers/login` (email/password + Google)

**JWT (Platform Auth):**
- Library: `python-jose[cryptography]==3.4.0`
- Secret: `JWT_SECRET_KEY` env var (from AWS Secrets Manager)
- Issued per user role (customer, driver, vendor, admin)
- Bearer token in `Authorization` header

**Google Sign-In:**
- iOS: `GoogleSignIn` (bundled via Firebase) + `GIDSignIn.sharedInstance.handle(url)` (`apps/ios/customer/eatfaircustomer/eatfaircustomerApp.swift:94`)
- Android: `play-services-auth 21.3.0` + `GoogleSignInHelper.kt` in `apps/android/shared/`

**Admin Auth:**
- Dual-mode middleware (`apps/web/p2p-platform/backend/main_new.py:176-188`):
  - Bearer JWT with admin role, OR
  - `ADMIN_SECRET_KEY` query param (for ops/migration endpoints)
- All `POST /api/admin/*` endpoints secured by default middleware

## Push Notifications

**Firebase Cloud Messaging (FCM):**
- Backend push sender: `firebase-admin==6.4.0` SDK
  - Credentials: `FIREBASE_CREDENTIALS_JSON` env var (from AWS Secrets Manager)
  - Invoked via `send_push_notification()` in `apps/web/p2p-platform/backend/order_flow.py`
- iOS: `FirebaseMessaging` framework, token registered via `Messaging.messaging().apnsToken`
- Android: `DollorFirebaseMessagingService` in `apps/android/shared/src/main/java/com/eatfair/shared/notifications/`
- Notification types: order status updates, driver assigned, ride events (bid, counter-offer, started, completed, cancelled), payment processed, promotions

## Email

**SMTP (AWS SES):**
- Host: `email-smtp.us-east-1.amazonaws.com:587` (configured in ECS task definition)
- From: `noreply@dollor.ai`
- Client: Python `smtplib` with TLS (`apps/web/p2p-platform/backend/email_service.py`)
- Auth: `SMTP_USER`, `SMTP_PASSWORD` (from AWS Secrets Manager)
- Sends: order confirmations, vendor approvals, driver approvals, password resets, delivery receipts
- Retry: 3 attempts with exponential backoff (1s, 2s, 4s)
- Strict mode: Only sends to registered users in DB

## Monitoring & Observability

**Logging:**
- Backend: Python `logging` module (structlog in microservices)
- CloudWatch Logs: `/ecs/dollor-api` log group (configured in `infrastructure/ecs/task-definition.json:76-82`)

**Metrics (Microservices):**
- Prometheus + OpenTelemetry in all `services/core/` microservices
- `prometheus-client==0.19.0`, `opentelemetry-api==1.22.0`

**Health Checks:**
- ECS health check: `GET /health` → must return 200 within 5s, every 30s, 3 retries
- Container starts with 60s start period

**Error Tracking:**
- Not detected (no Sentry or similar in requirements.txt)

## CI/CD & Deployment

**Hosting:**
- Backend API: AWS ECS Fargate, cluster `dollor-production`, task family `dollor-api`
- Staging Backend: AWS EKS cluster `dollor-staging`
- Frontend (Admin Portal): AWS S3 + CloudFront distribution `E1TL8YTTU1SF3A`
- iOS apps: Apple TestFlight → App Store (Team `PRKZ4UVCD7`)
- Android apps: Google Play Store

**CI Pipeline:**
- GitHub Actions (`.github/workflows/`)
- Primary deploy workflow: `deploy-dollar-ai.yml` - triggers on push to `main` for `apps/web/p2p-platform/**`
  - Step 1: Build + deploy frontend to S3 + CloudFront invalidation
  - Step 2: Build Docker image (`--target production`) → push to ECR → update ECS task definition → deploy
  - Step 3: (optional) Update EKS staging deployment
- iOS: Fastlane (`apps/ios/fastlane/Fastfile`) - `customer_testflight`, `driver_testflight`, `restaurant_testflight` lanes
- Android: Fastlane (`apps/android/fastlane/Fastfile`) + Gradle build commands

**Container Registry:**
- AWS ECR: `134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api`
- Build requires `--platform linux/amd64` on Apple Silicon

**Infrastructure as Code:**
- Terraform modules: `infrastructure/terraform/modules/` (rds, eks, ecr, vpc, s3, cloudwatch, secrets)
- Kubernetes manifests: `infrastructure/kubernetes/`
- Helm charts: `infrastructure/helm/backend/`
- ArgoCD: `infrastructure/argocd/`

## Webhooks & Callbacks

**Incoming:**
- `POST /api/payments/webhook` - Stripe payment events (order paid, ride payment succeeded/failed)
  - Verified via `STRIPE_WEBHOOK_SECRET` (Stripe signature header)
  - Handlers in `apps/web/p2p-platform/backend/stripe_integration.py`
- Persona document verification webhook - `POST /api/documents/webhook` (via `verification_routes.py`)

**Outgoing:**
- Not detected (backend calls Stripe, Firebase, Google Maps, Persona APIs directly)

## Environment Configuration

**Required Production Env Vars (from AWS Secrets Manager):**
- `DATABASE_URL` - PostgreSQL
- `JWT_SECRET_KEY` - Token signing
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `SMTP_USER` / `SMTP_PASSWORD`
- `FIREBASE_CREDENTIALS_JSON`
- `PERSONA_API_KEY` / `PERSONA_TEMPLATE_ID`
- `ADMIN_SECRET_KEY` / `DASHBOARD_SECRET`

**Non-secret Config (in ECS task definition env):**
- `REDIS_URL` - ElastiCache endpoint
- `ENVIRONMENT=production`
- `SMTP_HOST=email-smtp.us-east-1.amazonaws.com`
- `SMTP_PORT=587`
- `FROM_EMAIL=noreply@dollor.ai`
- `DOCUMENT_VERIFICATION_PROVIDER=persona`

**Secrets Location:**
- All production secrets: AWS Secrets Manager under `dollor/production/` prefix
- iOS API keys: xcconfig files (`apps/ios/Config/`)
- Android API keys: `local.properties` (not committed to git)

---

*Integration audit: 2026-02-18*
