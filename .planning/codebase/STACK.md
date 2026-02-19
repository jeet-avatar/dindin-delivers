# Technology Stack

**Analysis Date:** 2026-02-18

## Languages

**Primary:**
- Python 3.11 - Backend API (`apps/web/p2p-platform/backend/`)
- Swift 5.0 - iOS apps (`apps/ios/customer/`, `apps/ios/delivery/`, `apps/ios/restaurant/`)
- Kotlin 2.1.0 - Android apps (`apps/android/app/`, `apps/android/driver/`, `apps/android/partner/`)
- TypeScript 5.5.3 - Admin portal (`apps/web/p2p-platform/frontend/`)

**Secondary:**
- HCL (Terraform) - Infrastructure (`infrastructure/terraform/`)
- YAML - Kubernetes / GitHub Actions CI/CD
- SQL - Database migrations (inline via SQLAlchemy)

## Runtime

**Backend:**
- Python 3.11-slim-bookworm (Docker via `apps/web/p2p-platform/backend/Dockerfile.optimized`)
- 4 uvicorn workers with `--loop uvloop --http httptools` in production
- Port 8080

**Android:**
- minSdk 24 (Android 7.0), targetSdk/compileSdk 35 (Android 15)
- JVM 17

**iOS:**
- iOS 15.0 minimum (CocoaPods target), Xcode project targets iOS 17.0
- Swift Package Manager for Firebase SDK (via `apps/ios/eatfair-ios-shared/Package.swift`)
- CocoaPods for Google Maps/Places (via `apps/ios/customer/Podfile`)

**Frontend:**
- Node.js 20 (required for CI, declared in `apps/web/p2p-platform/frontend/package.json`)
- Vite 7.2.4 dev server / build tool

## Package Manager

**Backend:**
- pip with `requirements.txt`
- Lockfile: Not present (no `requirements.lock`)

**Frontend:**
- npm
- Lockfile: `package-lock.json` present

**iOS:**
- Swift Package Manager (Firebase) + CocoaPods (Google Maps/Places)

**Android:**
- Gradle 8.7.3 with `libs.versions.toml` version catalog

## Frameworks

**Backend Core:**
- FastAPI 0.115.0 - REST API framework (`apps/web/p2p-platform/backend/main_new.py`)
- SQLAlchemy 2.0.36 ORM - Database access (`apps/web/p2p-platform/backend/database.py`)
- Pydantic 2.10.0 - Request/response validation

**Microservices (16 services in `services/core/`):**
- Each uses FastAPI 0.109.0 + SQLAlchemy 2.0.25 independently
- Services: auth, driver, restaurant, order, ride, notification, payment, chat, call, negotiation, location, menu, pricing, rating, analytics, user-service

**iOS:**
- SwiftUI - All three apps use SwiftUI with MVVM
- Firebase iOS SDK 12.0.0 (SPM) - Auth, Firestore, Messaging
- GoogleMaps 9.0 / GooglePlaces 9.0 (CocoaPods)
- GoogleSignIn (bundled with Firebase)
- Stripe iOS SDK - `apps/ios/customer/eatfaircustomer/Services/PaymentService.swift`
- EatFairShared (local SPM package) - `apps/ios/eatfair-ios-shared/` (shared models, AppConfig, NotificationManager, Theme)

**Android:**
- Jetpack Compose (BOM 2025.10.01) - All three apps
- Hilt 2.57.2 - Dependency injection
- Retrofit 2.9.0 + OkHttp 4.12.0 - REST networking (`apps/android/shared/src/main/java/com/eatfair/shared/data/remote/`)
- Gson 2.10.1 - JSON deserialization
- Room 2.8.3 - Local SQLite database
- Firebase BOM 32.7.0 - Auth, Firestore, Messaging, Analytics
- Stripe Android 21.29.0 - Payments
- Google Maps Compose 6.12.1, Play Services Location 21.3.0
- Google Sign-In (play-services-auth 21.3.0)
- Accompanist 0.36.0 - Pager, Permissions
- Coil 2.7.0 - Image loading
- DataStore Preferences 1.1.7 - Local key-value storage
- Coroutines 1.9.0 - Async

**Frontend (Admin Portal):**
- React 18.3.1 with TypeScript
- React Router DOM 6.18.0
- Ant Design 5.27.4 - UI component library
- Tailwind CSS 3.4.1 - Utility CSS
- Chart.js 4.4.0 + react-chartjs-2 - Analytics charts
- Axios 1.12.2 - HTTP client

**Testing:**
- Backend: pytest 8.3.4, pytest-asyncio 0.25.0, pytest-cov 6.0.0
- Frontend: Vitest 1.3.0, @testing-library/react 14.2.0
- iOS: XCTest (built-in)
- Android: JUnit 4.13.2, Espresso 3.7.0

## Key Dependencies

**Critical Backend:**
- `stripe==11.3.0` - Payment processing and Stripe Connect payouts
- `firebase-admin==6.4.0` - Push notifications via FCM
- `redis[hiredis]==5.0.1` - Caching, rate limiting, password reset codes (`apps/web/p2p-platform/backend/cache.py`)
- `boto3==1.35.80` - AWS S3 file uploads (`apps/web/p2p-platform/backend/s3_service.py`)
- `python-jose[cryptography]==3.4.0` - JWT authentication
- `passlib[bcrypt]==1.7.4` + `bcrypt==4.2.1` - Password hashing
- `httpx==0.27.2` - Async HTTP client (Google Maps API calls)
- `reportlab==4.2.5` - PDF invoice generation
- `apscheduler==3.10.4` - Background task scheduling
- `pillow==11.0.0` - Image processing

**Infrastructure Libraries:**
- `psycopg2-binary==2.9.10` - PostgreSQL driver
- `uvicorn[standard]==0.32.0` - ASGI server (includes uvloop, httptools)
- `python-multipart==0.0.17` - File upload support
- `aiofiles==24.1.0` - Async file I/O

## Configuration

**Backend Environment Variables (loaded via `python-dotenv`):**
- `DATABASE_URL` - PostgreSQL connection string (required, from AWS Secrets Manager in prod)
- `JWT_SECRET_KEY` - JWT signing key
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY`
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `S3_BUCKET`
- `REDIS_URL` - ElastiCache URL (`redis://dollor-redis.uwva3u.0001.use1.cache.amazonaws.com:6379/0` in prod)
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `FROM_EMAIL`
- `FIREBASE_CREDENTIALS_JSON` - Firebase Admin SDK credentials
- `PERSONA_API_KEY` / `PERSONA_TEMPLATE_ID` - Document verification
- `ADMIN_SECRET_KEY` / `DASHBOARD_SECRET` - Admin auth
- `ENVIRONMENT` - `production` | `staging` | `development`
- `DOCUMENT_VERIFICATION_PROVIDER` - `persona` (default in prod)

**iOS xcconfig-based configuration:**
- `apps/ios/Config/Development.xcconfig` - dev-api.dollor.ai
- `apps/ios/Config/Staging.xcconfig` - d3kuu45w6kl8hr.cloudfront.net
- `apps/ios/Config/Production.xcconfig` - api.dollor.ai
- Keys: `API_BASE_URL`, `CDN_URL`
- `GOOGLE_MAPS_API_KEY` - loaded into GMSServices at launch
- Stripe publishable key - hardcoded in build or xcconfig

**Android - `local.properties` (not committed):**
- `GOOGLE_MAPS_API_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `RELEASE_KEYSTORE_PATH` / `RELEASE_KEYSTORE_PASSWORD` / `RELEASE_KEY_ALIAS` / `RELEASE_KEY_PASSWORD`
- Build flavors inject `API_BASE_URL` per environment (`apps/android/app/build.gradle.kts:79-88`)

**Build Config Files:**
- `apps/web/p2p-platform/backend/Dockerfile.optimized` - Production Docker build (multi-stage, use `--target production`)
- `apps/web/p2p-platform/backend/requirements.txt`
- `apps/android/gradle/libs.versions.toml`
- `apps/ios/EatFair.xcworkspace` - Xcode workspace

## Platform Requirements

**Development:**
- Python 3.11+, pip, virtualenv
- Xcode 15+ (Swift 5.0, iOS 17.0)
- Android Studio + JDK 17
- Node.js 20+
- Docker (for backend container builds)
- CocoaPods (iOS Google Maps)

**Production:**
- AWS ECS Fargate - Backend (cluster: `dollor-production`, service: `dollor-api-service`)
- AWS ECR - Container registry (`134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api`)
- AWS RDS PostgreSQL `db.t3.micro` (~112 max connections) - `dollor/production/database-v2-*` secret
- AWS ElastiCache Redis - `dollor-redis.uwva3u.0001.use1.cache.amazonaws.com:6379`
- AWS S3 - `dollor-ai-uploads` (uploads), `dollar-ai-frontend` (static assets)
- AWS CloudFront - CDN and API gateway (`cdn.dollor.ai`, staging: `d3kuu45w6kl8hr.cloudfront.net`)
- AWS Secrets Manager - All production secrets
- Apple App Store Connect - iOS distribution (Team ID: `PRKZ4UVCD7`)
- Google Play Store - Android distribution

---

*Stack analysis: 2026-02-18*
