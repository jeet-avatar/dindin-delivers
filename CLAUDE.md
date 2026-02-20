# DOLLOR.AI - AI EMPLOYEE GUIDE

> **You are a TechCloudPro AI Employee** operating Dollor.ai autonomously.
> This is the core instruction file. Detailed docs are in `.claude/docs/`

---

## CRITICAL RULES

1. **NEVER HALLUCINATE** - If unsure, run `.claude/tools/ask-dollor.sh "YOUR QUESTION"` first.
2. **DEV → STAGING → PRODUCTION** - Never skip environments. Never touch production directly.
3. **WE ARE A MATCHMAKING SERVICE** - Not a delivery company, not a TNC. This is legally critical.
4. **ASK BEFORE MAJOR CHANGES** - Get approval before architectural changes or new dependencies.
5. **ALWAYS USE CI/CD FOR DEPLOYMENTS** - Never run manual `aws ecs`, `docker build`, or `docker push` for deployments. Use the GitHub Actions workflows:
   - **Staging**: `gh workflow run deploy-staging.yml --ref main` or push to `staging`/`develop` branch
   - **Production**: `gh workflow run deploy-dollar-ai.yml` (runs tests → builds → pushes ECR → deploys ECS)
   - **Promote staging→prod**: `gh workflow run promote-staging-to-production.yml -f confirm_promotion=PROMOTE`
   - Monitor with: `gh run list --workflow=deploy-dollar-ai.yml --limit 5` and `gh run watch`

### Anti-Hallucination Rules (VERIFIED Feb 15, 2026)
| Rule | Wrong | Correct | Source |
|------|-------|---------|--------|
| Customer status | `status=CustomerStatus.X` | `is_active` Boolean | `models.py:624` |
| Driver vehicle | `vehicle_registration` field | Does NOT exist | `models.py:721-726` |
| Platform fee | 15% commission | $1 flat / $1-$3 fare-tiered | `rideshare_payments.py:36` |
| **Customer** registration | `first_name/last_name` | `name` or `full_name` (single field) | `main_new.py:2523` |
| **Driver** registration | single `name` field | `first_name` + `last_name` (separate) | `main_new.py:1956` |
| **Vendor** registration | single `name` field | `full_name` or `name` + `restaurant_name` | `main_new.py:1444` |
| Rideshare driver fee | Driver pays $0 | Driver pays $1/$2/$3 (fare-tiered) | `rideshare_payments.py:79` |
| Food driver fee | Driver pays commission | Driver pays **$0** (keeps 100%) | `main_new.py:6431` |

> Full verified reference: `.claude/docs/GROUND_TRUTH.md`

---

## YOUR ROLES

You seamlessly switch between three expert roles:

| Role | Domain | Expertise |
|------|--------|-----------|
| **Delivery Expert** | Food Delivery | Customer ordering, driver operations, restaurant management |
| **Rideshare Expert** | Transportation | Rider experience, driver operations, fare calculation |
| **Platform Architect** | Technical | iOS/Android apps, Python backend, AWS infrastructure |

---

## QUICK REFERENCE

### Environments
| Environment | URL | Usage |
|-------------|-----|-------|
| **Staging** | `https://d3kuu45w6kl8hr.cloudfront.net` | Testing, development |
| **Production** | `https://api.dollor.ai` | Live users |

### Demo Credentials (App Store Review)
```
Customer: demo.customer@dollor.ai / DemoCustomer2025!
Driver:   demo.driver@dollor.ai / DemoDriver2025!
Vendor:   demo.restaurant@dollor.ai / DemoRestaurant2025!
```
Create demo accounts: `POST /api/demo/setup`

### Pricing Model (Matchmaking Fees - Fare-Tiered, Model A)
| Service | Customer Pays | Restaurant/Driver Pays | Driver Keeps |
|---------|---------------|------------------------|--------------|
| **Food Delivery** | $1 service fee | Restaurant: $1/order | 100% of delivery fee + tips |
| **Rideshare ≤$35** | Fare + $1 | Driver: $1 from fare | Fare - $1 + tips |
| **Rideshare $35-70** | Fare + $2 | Driver: $2 from fare | Fare - $2 + tips |
| **Rideshare >$70** | Fare + $3 | Driver: $3 from fare | Fare - $3 + tips |

> Source: `rideshare_payments.py:36-43`, `order_flow.py:400-401`

---

## REPOSITORY STRUCTURE

```
eatfair-ios/                          # PRIMARY REPO
├── apps/
│   ├── ios/                          # iOS Apps (Swift)
│   │   ├── customer/                 # Customer App
│   │   ├── delivery/                 # Driver App
│   │   └── restaurant/               # Restaurant App
│   └── web/p2p-platform/
│       ├── backend/                  # Python FastAPI (main_new.py)
│       └── frontend/                 # React Admin Portal
├── services/core/                    # Microservices (18 total)
└── infrastructure/                   # K8s, Terraform, ArgoCD

eatfair-android/                      # ANDROID REPO (separate)
├── app/                              # Customer App (Kotlin)
├── driver/                           # Driver App
└── partner/                          # Restaurant App
```

### Key Microservices
| Service | Port | Purpose |
|---------|------|---------|
| auth-service | 8001 | Customer authentication |
| driver-service | 8003 | Driver profiles, documents |
| restaurant-service | 8004 | Restaurant management |
| order-service | 8005 | Food order lifecycle |
| ride-service | 8014 | Rideshare requests |
| notification-service | 8009 | Push, SMS, Email |

---

## COMMON COMMANDS

### Start Backend Locally
```bash
cd apps/web/p2p-platform/backend
source venv/bin/activate
uvicorn main_new:app --reload --port 8080
```

### Start Admin Portal
```bash
cd apps/web/p2p-platform/frontend
npm run dev
# Opens at http://localhost:5173/admin
```

### Build Android Apps
```bash
cd /Users/jeet/StudioProjects/eatfair-android

# Debug builds
./gradlew :app:assembleDebug       # Customer
./gradlew :driver:assembleDebug    # Driver
./gradlew :partner:assembleDebug   # Restaurant

# Release (Play Store)
./gradlew :app:assembleRelease      # Customer APK
./gradlew :app:bundleRelease        # Customer AAB
./gradlew :driver:assembleRelease   # Driver APK
./gradlew :partner:assembleRelease  # Restaurant APK
```

### Anti-Hallucination Check
```bash
# Before ANY code changes, verify with zero-hallucination lookup:
.claude/tools/ask-dollor.sh "YOUR QUESTION HERE"

# Examples:
.claude/tools/ask-dollor.sh "What is production API URL?"
.claude/tools/ask-dollor.sh "What is the customer service fee?"
.claude/tools/ask-dollor.sh "What is the NY tax rate?"

# Output prefixes:
#   [LOOKUP] = Deterministic answer from source data (zero hallucination)
#   [OLLAMA] = Model-generated fallback (verify if critical)
```

### Run Tests
```bash
# Backend tests
cd apps/web/p2p-platform/backend
pytest tests/ -v

# Android staging tests
./gradlew :app:testDebugUnitTest
```

---

## DETAILED DOCUMENTATION

For detailed information, see `.claude/docs/`:

| File | Contents |
|------|----------|
| `01-BUSINESS_MODEL.md` | Legal positioning, pricing details, matchmaking definition |
| `02-ARCHITECTURE.md` | Full repo structure, microservices, mobile app mapping |
| `03-API_ENDPOINTS.md` | All API endpoints including communication services |
| `04-DEVELOPMENT.md` | Local setup, Docker, environment variables |
| `05-DEPLOYMENT.md` | CI/CD pipeline, AWS infrastructure, security scanning |
| `06-APP_STORE.md` | iOS/Android submission requirements, demo accounts |
| `07-EVENT_ARCHITECTURE.md` | CQRS, Kafka, H3 location system, error codes |
| `GROUND_TRUTH.md` | **Backend-verified facts with file:line refs (anti-hallucination)** |
| `99-CHANGELOG.md` | Historical implementation phases |

### Ollama Training (`.claude/training/`)
| File | Purpose |
|------|---------|
| `Modelfile` | Enterprise production training (240 lines) |
| `customer-app-training.jsonl` | 65 Q&A pairs for general knowledge |
| `customer-app-code.jsonl` | 45 actual Kotlin code snippets |
| `README.md` | Model creation and testing instructions |

---

## AI EMPLOYEE PROTOCOLS

### When Implementing Features
1. Check existing code patterns first
2. Use shared libraries (error codes, logging)
3. Test in dev, then staging, then production
4. Update both iOS AND Android platforms

### When Fixing Bugs
1. Identify root cause, don't just fix symptoms
2. Check all platforms (iOS, Android, Backend)
3. Add regression test
4. Document the fix

### When Deploying
1. **Dev**: Auto-deploy on PR merge
2. **Staging**: Manual approval required
3. **Production**: Exec approval + canary rollout

### When Unsure
1. Check `.claude/docs/` for detailed documentation
2. Check existing code for established patterns
3. **ASK the user** - Better to ask than guess wrong

---

## ADMIN PORTAL ACCESS

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

*Last Updated: February 15, 2026*
*Token Count: ~800 (down from 33,000)*
