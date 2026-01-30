# Dollor.ai Technology Stack

> Comprehensive documentation of programming languages, frameworks, dependencies, and build tools used across the Dollor.ai platform.

---

## Programming Languages

| Language | Version | Usage |
|----------|---------|-------|
| **Swift** | 5.5+ | iOS applications (Customer, Driver, Restaurant apps) |
| **Python** | 3.8+ | Backend API, microservices, automation scripts |
| **TypeScript** | 5.5.3 | Admin Portal frontend |
| **Ruby** | 3.x | Build automation (Fastlane, CocoaPods) |

---

## iOS Applications

### Minimum Deployment Targets

| Target | Version |
|--------|---------|
| iOS | 15.0 |
| macOS (for development) | 10.15 (Catalina) |
| Swift Tools | 5.5 |

### Package Managers

#### Swift Package Manager (SPM)

Primary package manager for iOS dependencies. Managed via Xcode project settings.

**Shared Package (`EatFairShared`):**
```swift
// Package.swift - swift-tools-version:5.5
dependencies: [
    .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "12.0.0")
]
```

**SPM Dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| Firebase iOS SDK | 12.0.0+ | Authentication, Firestore, Messaging |
| Stripe iOS SPM | Latest | Payment processing |
| Google Sign-In iOS | Latest | Google authentication |
| Swift Protobuf | Latest | Protocol buffer support |

#### CocoaPods

Used for Google Maps SDK (not available via SPM).

**Podfile (all 3 apps):**
```ruby
platform :ios, '15.0'
use_frameworks!

target 'App' do
  pod 'GoogleMaps', '~> 9.0'
  pod 'GooglePlaces', '~> 9.0'
end
```

**Pod Dependencies:**
| Pod | Version | Purpose |
|-----|---------|---------|
| GoogleMaps | ~> 9.0 | Maps rendering, location display |
| GooglePlaces | ~> 9.0 | Address search, place autocomplete |

### Build Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Xcode** | 15.0+ | Primary IDE and build system |
| **Fastlane** | ~> 2.219 | Automated builds, TestFlight uploads |
| **CocoaPods** | ~> 1.14 | Pod dependency management |
| **xcodebuild** | Built-in | Command-line builds |

**Gemfile (Ruby dependencies):**
```ruby
source "https://rubygems.org"

gem "fastlane", "~> 2.219"
gem "cocoapods", "~> 1.14"

# Ruby 4.0 compatibility
gem "ostruct"
gem "logger"
gem "csv"
gem "base64"
gem "bigdecimal"
```

### iOS SDK Dependencies (via SPM + Pods)

| SDK | Purpose | Integration |
|-----|---------|-------------|
| FirebaseAuth | User authentication | SPM |
| FirebaseFirestore | Cloud database | SPM |
| FirebaseMessaging | Push notifications | SPM |
| Stripe | Payments (Apple Pay, Cards) | SPM |
| GoogleMaps | Map rendering | CocoaPods |
| GooglePlaces | Location autocomplete | CocoaPods |
| GoogleSignIn | Google OAuth | SPM |

---

## Backend (Python)

### Main Backend (`apps/web/p2p-platform/backend`)

**Python Version:** 3.8+

**requirements.txt:**
```
# Core Framework
fastapi==0.104.1
uvicorn[standard]==0.32.0
python-dotenv==1.0.0

# Database & ORM
sqlalchemy==2.0.23
psycopg2-binary==2.9.9

# Authentication & Security
passlib[bcrypt]==1.7.4
bcrypt==4.1.2
python-jose[cryptography]==3.4.0
python-multipart==0.0.12

# Validation
pydantic==2.5.0
pydantic-settings==2.1.0
email-validator==2.1.0

# Payments
stripe==11.3.0

# Document Generation
reportlab==4.0.7

# HTTP Clients
httpx==0.25.2
requests==2.31.0

# Web Scraping
beautifulsoup4==4.12.2
lxml==4.9.3

# File Handling
aiofiles==23.2.1
pillow==10.4.0

# AWS Integration
boto3==1.35.0

# Scheduling
apscheduler==3.10.4

# Date/Time
python-dateutil==2.8.2

# Testing
pytest==8.3.4
pytest-cov==5.0.0
pytest-asyncio==0.24.0
pytest-xdist==3.5.0
coverage[toml]>=7.0,<7.7
```

### Microservices Dependencies

Common dependencies across microservices in `services/core/`:

| Category | Packages | Purpose |
|----------|----------|---------|
| **Framework** | fastapi==0.109.0, uvicorn==0.27.0 | Web API framework |
| **Database** | sqlalchemy==2.0.25, psycopg2-binary==2.9.9, asyncpg==0.29.0 | PostgreSQL ORM |
| **Migrations** | alembic==1.13.1 | Database migrations |
| **Security** | python-jose==3.3.0, passlib==1.7.4, bcrypt==4.0.1 | JWT, password hashing |
| **Validation** | pydantic==2.5.3, email-validator==2.1.0 | Data validation |
| **CQRS** | aiokafka==0.10.0, elasticsearch==8.11.0, redis==5.0.1 | Event sourcing, read models |
| **Observability** | opentelemetry-api==1.22.0, prometheus-client==0.19.0 | Distributed tracing, metrics |
| **Logging** | structlog==24.1.0 | Structured logging |
| **HTTP** | httpx==0.26.0 | Async HTTP client |

### Database

| Database | Usage |
|----------|-------|
| **PostgreSQL** | Primary relational database (via SQLAlchemy) |
| **Redis** | Caching, session storage |
| **Elasticsearch** | Search, read model optimization (CQRS) |

---

## Frontend (Admin Portal)

**Location:** `apps/web/p2p-platform/frontend`

### package.json Dependencies

**Production Dependencies:**
```json
{
  "@headlessui/react": "^1.7.17",
  "antd": "^5.27.4",
  "axios": "^1.12.2",
  "chart.js": "^4.4.0",
  "date-fns": "^2.30.0",
  "file-saver": "^2.0.5",
  "html-to-image": "^1.11.13",
  "lucide-react": "^0.344.0",
  "moment": "^2.30.1",
  "react": "^18.3.1",
  "react-chartjs-2": "^5.2.0",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.18.0"
}
```

**Dev Dependencies:**
```json
{
  "@eslint/js": "^9.9.1",
  "@testing-library/jest-dom": "^6.4.0",
  "@testing-library/react": "^14.2.0",
  "@testing-library/user-event": "^14.5.0",
  "@types/react": "^18.3.5",
  "@types/react-dom": "^18.3.0",
  "@vitejs/plugin-react": "^4.3.1",
  "@vitest/coverage-v8": "^1.3.0",
  "autoprefixer": "^10.4.18",
  "eslint": "^9.9.1",
  "eslint-plugin-react-hooks": "^5.1.0-rc.0",
  "eslint-plugin-react-refresh": "^0.4.11",
  "globals": "^15.9.0",
  "happy-dom": "^13.3.0",
  "postcss": "^8.4.35",
  "tailwindcss": "^3.4.1",
  "typescript": "^5.5.3",
  "typescript-eslint": "^8.3.0",
  "vite": "^7.2.4",
  "vitest": "^1.3.0"
}
```

### Build Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Vite** | 7.2.4 | Build tool, dev server |
| **TypeScript** | 5.5.3 | Type checking |
| **ESLint** | 9.9.1 | Code linting |
| **Vitest** | 1.3.0 | Unit testing |
| **PostCSS** | 8.4.35 | CSS processing |
| **Tailwind CSS** | 3.4.1 | Utility-first CSS |
| **Autoprefixer** | 10.4.18 | CSS vendor prefixes |

---

## Environment Configurations

### iOS xcconfig Files

Located in `/apps/ios/Config/`:

| Environment | API URL | Features |
|-------------|---------|----------|
| **Development** | `https://dev-api.dollor.ai` | Debug logging, mock data, dummy payments |
| **Staging** | `https://d3kuu45w6kl8hr.cloudfront.net` | Debug logging, real payments |
| **Production** | `https://api.dollor.ai` | No debug, real payments, analytics |

### Backend Environment Variables

Key environment variables (from `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `ENVIRONMENT` - production/staging/development
- `STRIPE_SECRET_KEY` - Stripe API key
- `AWS_*` - AWS credentials for S3
- `FIREBASE_*` - Firebase credentials for push notifications

---

## CI/CD & Deployment

### iOS

| Tool | Purpose |
|------|---------|
| **Fastlane** | Automated builds and TestFlight uploads |
| **Match** | Certificate and profile management |
| **App Store Connect API** | Programmatic uploads |

### Backend

| Tool | Purpose |
|------|---------|
| **Docker** | Containerization |
| **AWS CloudFront** | CDN and staging deployment |
| **uvicorn** | ASGI server |

---

## Summary by Component

| Component | Languages | Key Frameworks | Package Manager |
|-----------|-----------|----------------|-----------------|
| **Customer App** | Swift | SwiftUI, Firebase, Stripe | SPM, CocoaPods |
| **Driver App** | Swift | SwiftUI, Firebase, GoogleMaps | SPM, CocoaPods |
| **Restaurant App** | Swift | SwiftUI, Firebase | SPM, CocoaPods |
| **Shared Package** | Swift | Firebase | SPM |
| **Main Backend** | Python | FastAPI, SQLAlchemy | pip |
| **Microservices** | Python | FastAPI, Kafka, Redis | pip |
| **Admin Portal** | TypeScript | React, Vite, Tailwind | npm |

---

*Last Updated: January 2026*
