# DOLLOR.AI - AI EMPLOYEE GUIDE

> **You are a TechCloudPro AI Employee** operating Dollor.ai autonomously.
> This is the core instruction file. Detailed docs are in `.claude/docs/`

---

## CRITICAL RULES

1. **NEVER HALLUCINATE** - If unsure, run `.claude/tools/ask-dollor.sh "YOUR QUESTION"` first.
2. **DEV → STAGING → PRODUCTION** - Never skip environments. Never touch production directly.
3. **WE ARE A MATCHMAKING SERVICE** - Not a delivery company, not a TNC. This is legally critical.
4. **ASK BEFORE MAJOR CHANGES** - Get approval before architectural changes or new dependencies.
5. **⚠️ ALWAYS USE CI/CD — NEVER MANUAL DEPLOY ⚠️**
   - **NEVER** run manual `aws ecs`, `docker build`, `docker push`, or direct ECR/ECS commands
   - **Step 1 — Push code**: `git push origin main` (always push to remote BEFORE triggering workflows)
   - **Step 2 — Deploy staging**: `gh workflow run deploy-staging.yml --ref main`
   - **Step 3 — Deploy production**: `gh workflow run deploy-dollar-ai.yml` (runs tests → Docker build → ECR push → ECS deploy)
   - **Promote staging→prod**: `gh workflow run promote-staging-to-production.yml -f confirm_promotion=PROMOTE`
   - **Monitor**: `gh run list --workflow=deploy-dollar-ai.yml --limit 5` then `gh run watch <run-id>`
   - **Verify**: `gh run view <run-id>` to confirm all jobs passed before moving on

### API Endpoint Verification (MANDATORY for GSD plans)
| Rule | Details |
|------|---------|
| **NEVER invent API endpoints** | Before including ANY endpoint in a plan, smoke test, or summary, verify it exists with: `grep -rn "the/path" apps/web/p2p-platform/backend/*.py` |
| **Canonical registry** | Run `python scripts/extract-api-endpoints.py` to regenerate `.planning/API_REGISTRY.md` after any backend route changes |
| **Known confusions** | `/api/vendors/published` = vendor listings (real), `/api/promotions/featured` = promo deals (real), `/api/vendors/featured` = DOES NOT EXIST |
| **Smoke test rule** | Every endpoint in a smoke test plan MUST have a `grep` verification in the plan's action block proving the route exists in the backend code |

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
| API endpoints | Guess from memory | Verify with `grep` in backend `*.py` | `scripts/extract-api-endpoints.py` |

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
| **Staging** | `https://d34u5ixl0bulv4.cloudfront.net` | Testing, development |
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
├── services/core/                    # Microservices (16 total)
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

### Build iOS Apps
```bash
cd /Users/jeet/doordash-p2p

# Customer App
xcodebuild -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatfaircustomer -configuration Staging \
  -destination 'generic/platform=iOS' build

# Driver App
xcodebuild -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatffairdelivery -configuration Staging \
  -destination 'generic/platform=iOS' build

# Restaurant App (NOTE: scheme may not be shared in workspace;
# if "scheme not found", use -project apps/ios/restaurant/eatffairrestaurant.xcodeproj instead of -workspace)
xcodebuild -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatffairrestaurant -configuration Staging \
  -destination 'generic/platform=iOS' build
```

Configs: `apps/ios/Config/` (Development, Staging, Production)
Bundle IDs: `com.dollorai.customer`, `com.dollorai.delivery`, `com.dollorai.restaurant`

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

## SECURITY ARCHITECTURE

### Authentication Stack (Phase 02 -- Feb 2026)

| Layer | File | Purpose |
|-------|------|---------|
| Global middleware | `main_new.py:367` (`require_auth_middleware`) | Safety net -- blocks unauthenticated requests to non-allowlisted paths |
| Admin middleware | `main_new.py:196` (`admin_auth_middleware`) | All `/api/admin/*` endpoints require admin JWT or ADMIN_SECRET_KEY |
| Auth utilities | `auth_utils.py` | Reusable Depends() functions for router/endpoint-level auth |
| iOS guard-let | `P2PAPIService.swift` | Hard-fail without token (no silent fallback) |

### Auth Utility Functions (`auth_utils.py`)

| Function | Returns | Use Case |
|----------|---------|----------|
| `require_any_auth` | JWT payload dict | Router-level -- any valid JWT accepted |
| `require_customer` | Customer ORM object | Customer-only endpoints |
| `require_driver` | Driver ORM object | Driver-only endpoints |
| `require_vendor` | Vendor ORM object | Vendor-only endpoints |
| `require_admin` | User ORM object | Admin-only endpoints (403 if wrong role) |

### Required Environment Variables

| Variable | Purpose | Crash Behavior |
|----------|---------|----------------|
| `JWT_SECRET_KEY` | JWT signing/verification | `RuntimeError` at startup (`main_new.py:848`) |
| `STRIPE_SECRET_KEY` | Payment processing | Stripe calls fail |
| `ADMIN_SECRET_KEY` | Admin API access | Admin auth fallback disabled |
| `DATABASE_URL` | PostgreSQL connection | App won't start |

---

## DETAILED DOCUMENTATION

For detailed information, see `.claude/docs/`:

| File | Contents |
|------|----------|
| `API_ENDPOINTS.md` | API endpoints, auth patterns, demo credentials |
| `GROUND_TRUTH.md` | **Backend-verified facts with file:line refs (anti-hallucination)** |

### Ollama Training (`.claude/training/`)
| File | Purpose |
|------|---------|
| `Modelfile` | Enterprise production training (240 lines) |
| `customer-app-training.jsonl` | 65 Q&A pairs for general knowledge |
| `customer-app-code.jsonl` | 45 actual Kotlin code snippets |
| `README.md` | Model creation and testing instructions |

---

## AI EMPLOYEE PROTOCOLS

### ⚠️ ALL work goes through GSD — NO exceptions

**EVERY task — trivial or complex — MUST use a GSD command.** No direct code edits, no ad-hoc fixes, no "just this once" shortcuts.

#### Quick tasks (bug fixes, small changes, one-off edits)
```
/gsd:quick <description>
```
Uses GSD guarantees (atomic commits, state tracking) but skips research/discuss/verify agents.

#### Bug investigation
```
/gsd:debug <description>
```
Systematic debugging with persistent state across context resets.

#### Non-trivial tasks (features, multi-file changes, security work)
Full pipeline end-to-end:

| Step | Command | What Happens |
|------|---------|-------------|
| 1. **Research** | `/gsd:research-phase N` | Investigate unknowns, study codebase |
| 2. **Discuss** | `/gsd:discuss-phase N` | Gather context, clarify requirements with user |
| 3. **Plan** | `/gsd:plan-phase N` | Create PLAN.md with tasks, deps, verification criteria |
| 4. **Execute** | `/gsd:execute-phase N` | Implement with atomic commits, state tracking |
| 5. **Test** | `pytest tests/ -v` | Run full test suite, fix any regressions |
| 6. **Verify** | `/gsd:verify-work N` | Goal-backward verification + UAT |
| 7. **QA** | `scripts/qa-runner.sh` | Run QA agents, challenger agents, smoke tests |
| 8. **Push** | `git push origin main` | Push to remote — code MUST be on remote before deploy |
| 9. **Deploy staging** | `gh workflow run deploy-staging.yml --ref main` | CI/CD builds + deploys to staging ECS |
| 10. **Smoke test staging** | Curl staging endpoints | Verify staging is healthy before production |
| 11. **Deploy production** | `gh workflow run deploy-dollar-ai.yml` | CI/CD runs tests → Docker build → ECR → ECS |
| 12. **Monitor** | `gh run watch <run-id>` | Confirm all jobs pass, tasks HEALTHY |
| 13. **Complete** | `/gsd:complete-milestone` | Archive phases, update PROJECT.md |

**Skip nothing. NEVER run manual `docker build`, `aws ecs`, `docker push`, or direct ECR/ECS commands.**

### GSD Command Reference
| Need | Command |
|------|---------|
| **Any small task** | `/gsd:quick <what to do>` |
| **Any bug** | `/gsd:debug <what's broken>` |
| Resume previous session | `/gsd:resume-work` |
| Check progress | `/gsd:progress` |
| Insert urgent work | `/gsd:insert-phase N` |
| Pause mid-session | `/gsd:pause-work` |
| Review todos | `/gsd:check-todos` |
| Map codebase | `/gsd:map-codebase` |

### When Unsure
1. Check `.claude/docs/` for detailed documentation
2. Check existing code for established patterns
3. **ASK the user** — better to ask than guess wrong

---

## ADMIN PORTAL ACCESS

```
URL:      http://localhost:5173/admin (local)
Email:    support@dollor.ai
Password: AdminTest123

Routes:
- /admin              Dashboard
- /admin/invoices     Invoice Management
- /admin/orders       Order Management
- /admin/accounting   Vendor Payouts, Platform Revenue
```

---

*Last Updated: February 20, 2026*
*Token Count: ~800 (down from 33,000)*
