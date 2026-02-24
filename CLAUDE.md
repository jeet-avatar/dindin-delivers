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

# Release APKs (for distribution)
./gradlew :app:assembleRelease      # Customer APK
./gradlew :driver:assembleRelease   # Driver APK
./gradlew :partner:assembleRelease  # Restaurant APK
./gradlew :app:bundleRelease        # Customer AAB (Play Store)

# All release at once
./gradlew assembleRelease

# Tests
./gradlew :app:testDebugUnitTest :driver:testDebugUnitTest :partner:testDebugUnitTest
```

Android packages: `ai.dollor.customer`, `ai.dollor.driver`, `ai.dollor.partner`
Signing: `local.properties` → `RELEASE_KEYSTORE_PATH`, `RELEASE_KEYSTORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`
APK output: `{module}/build/outputs/apk/release/{module}-release.apk`
**Firebase App Distribution: NOT YET CONFIGURED** — needs Gradle plugin setup

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

### Upload iOS to TestFlight
```bash
cd /Users/jeet/doordash-p2p

# Archive (per app — replace {workspace}, {scheme}, {name})
xcodebuild archive \
  -workspace apps/ios/{app}/{workspace}.xcworkspace \
  -scheme {scheme} -configuration Release \
  -archivePath /tmp/dollor-archives/{name}.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

# Export + Upload (ExportOptions.plist has destination:upload — does BOTH)
xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/{name}.xcarchive \
  -exportOptionsPlist apps/ios/{app}/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/{name} \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
```

**App values:**
| App | Workspace Dir | Workspace | Scheme |
|-----|---------------|-----------|--------|
| Customer | `customer` | `eatfaircustomer` | `eatfaircustomer` |
| Driver | `delivery` | `eatffairdelivery` | `eatffairdelivery` |
| Restaurant | `restaurant` | `eatffairrestaurant` | `eatffairrestaurant` |

**Key facts:**
- Team ID: `PRKZ4UVCD7`
- API Key: `9K626GB728`, Issuer: `80d10e49-f379-462f-9668-5ea53016812e`
- Key path: `~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8`
- Fastlane is configured but needs `MATCH_PASSWORD` — use xcodebuild automatic signing as workaround
- Do NOT use separate `xcrun altool --upload-app` — the `-exportArchive` step handles upload when ExportOptions has `destination: upload`

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

### Current Build Versions (Feb 23, 2026)

| Platform | App | Build | Version | Bundle/Package | TestFlight/Firebase |
|----------|-----|-------|---------|----------------|---------------------|
| iOS | Customer | 1091 | 1.0 | `com.dollorai.customer` | Uploaded 2026-02-23 |
| iOS | Driver | 199 | 1.0 | `com.dollorai.delivery` | Uploaded 2026-02-23 |
| iOS | Restaurant | 167 | 1.0 | `com.dollorai.restaurant` | Uploaded 2026-02-23 |
| Android | Customer | vC=25 | 1.0.24 | `ai.dollor.customer` | Firebase 2026-02-23 |
| Android | Driver | vC=22 | 1.0.21 | `ai.dollor.driver` | Firebase 2026-02-23 |
| Android | Partner | vC=18 | 1.0.17 | `ai.dollor.partner` | Firebase 2026-02-23 |

### Production Deployment Status (Feb 23, 2026)
- **Backend**: All security fixes deployed to staging (smoke tested 12/12 pass) → production. CI/CD run `22328867724` succeeded.
- **iOS**: Builds 1091/199/167 on TestFlight include auth header fixes (19 methods), SSL pinning, jailbreak detection, print() wrapping.
- **Android**: Builds vC=24/21/17 on Firebase include VAPT fixes and rideshare API audit fixes.

### iOS API Verification (Phase 02 — Feb 23, 2026)
- **256 total API calls** audited across 3 apps: 205 OK, 51 mismatches
- **40 of 51** are dead code (aspirational services never wired to backend)
- **11 actionable fixes** needed (~40 min): 3 critical (driver), 8 medium
- FIX_PLAN: `.planning/phases/02-ios-api-verification/FIX_PLAN.md`
- **Phase 04 (iOS Distribution) BLOCKED** until critical fixes applied

### Post-Security Auth Regression (Feb 22-23, 2026 — FULLY RESOLVED)
- **`requestRide()` missing auth header** (FIXED): `P2PAPIService.swift:5039` was the ONLY ride method without `Authorization: Bearer` header. After Phase 02 global auth middleware deployed, `/api/rides/request` returned 401 → app showed "Unable to request ride". Fixed in commit `f867a81a`.
- **Full audit completed** (Quick Task 18): Found **18 additional methods** missing auth headers across all 3 iOS apps. Fixed in commit `b27315f7`. Breakdown: 10 vendorToken, 4 driverToken, 3 customerToken, 2 mixed. Auth header count: 140 → 158.
- **Critical methods fixed**: FCM token save (all 3 apps), driver location updates, driver online status, order tracking, delivery decisions, KOT print, menu verification, analytics.
- **Pattern rule**: After adding global auth middleware, audit ALL client API methods for missing auth headers — not just the ones flagged in API verification.

### iOS VAPT Audit (Feb 23, 2026 — FULLY RESOLVED)
- **16 findings** across OWASP Mobile Top 10: 0 CRITICAL, 2 HIGH, 5 MEDIUM, 4 LOW, 5 INFO
- **SSL certificate pinning** (HIGH → FIXED): Real SHA-256 pins for `dollor.ai` + `api.dollor.ai` in `NetworkSecurity.swift`. P2PAPIService migrated from `URLSession.shared` → `secureSession` (182 calls). Commit `420d9f7f`.
- **Production print() leak** (HIGH → FIXED): 10 bare `print()` statements wrapped in `#if DEBUG` blocks across customer app views. Commit `25fb8c1c`.
- **Jailbreak detection** (MEDIUM → FIXED): Wired `shouldRestrictFeatures()` into all 3 app root structs with SwiftUI `.alert`. Commit `6d6cdc33`.
- **VAPT report**: `.planning/quick/22-vapt-security-audit-on-all-3-ios-apps-ow/VAPT_REPORT.md`
- **Positive findings**: Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, no hardcoded secrets, HTTPS everywhere in xcconfig, Apple Sign-In uses nonce, CryptoKit only

### Network Security & Bot Attack Audit (Feb 23, 2026 — FULLY RESOLVED)
- **27 findings** across 6 categories: 3 CRITICAL, 7 HIGH, 8 MEDIUM, 5 LOW, 4 INFO
- **WebSocket auth** (CRITICAL → FIXED): `/ws/{client_id}` now requires JWT via `?token=` query param, validates client_id against claims. `main_new.py:17979`.
- **Swagger lockdown** (CRITICAL → FIXED): `/docs` and `/redoc` disabled in production via `_is_production` check. `main_new.py:86`.
- **X-Forwarded-For spoofing** (CRITICAL → FIXED): Rate limiter now uses `ips[-2]` (CloudFront's real client IP) instead of `ips[0]` (attacker-injectable). `cache.py:209`.
- **Bot protections** (HIGH → FIXED): Bidding duration capped 1-30 min, concurrent ride limit of 3, self-bidding prevented via email cross-check, in-memory rate limiter fallback with 10K key bound.
- **Account enumeration** (HIGH → FIXED): All 12 registration paths now return generic "Registration failed" message. No email/role leak.
- **Password policy** (HIGH → FIXED): `_validate_password()` enforced on all 4 registration endpoints (min 8 chars, upper+lower+digit).
- **Report**: `.planning/quick/26-network-security-and-bot-attack-audit-fi/NETWORK_SECURITY_REPORT.md`
- **Test suite**: 1278 passed, zero regressions from security fixes

### Firebase App IDs (Android)
| App | Firebase App ID |
|-----|-----------------|
| Customer | `1:65740760476:android:535885ca28086e6242d459` |
| Driver | `1:65740760476:android:7d9bed1ee685434c42d459` |
| Partner | `1:65740760476:android:8591cc17fa4f8d4c42d459` |

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

### Production Secret Management

All production and staging secrets are managed via AWS Secrets Manager. No secrets exist in the codebase.

| Secret | Source |
|--------|--------|
| `DATABASE_URL` | `dollor/production/database-v2-gd1oKf` |
| `JWT_SECRET_KEY` | `dollor/production/jwt-secret-kvk9j9` |
| `STRIPE_SECRET_KEY` | `dollor/production/stripe-vT8WRA` |
| `STRIPE_PUBLISHABLE_KEY` | `dollor/production/stripe-vT8WRA` |
| `ADMIN_SECRET_KEY` | `dollor/production/admin-yCDIFY` |
| `DASHBOARD_SECRET` | `dollor/production/admin-yCDIFY` |
| `SMTP_USER` | `dollor/production/smtp-credentials-eqAwat` |
| `SMTP_PASSWORD` | `dollor/production/smtp-credentials-eqAwat` |
| `PERSONA_API_KEY` | `dollor/production/persona-aqEOSX` |
| `PERSONA_TEMPLATE_ID` | `dollor/production/persona-aqEOSX` |
| `FIREBASE_CREDENTIALS_JSON` | `dollor/production/firebase-creds-DG9fC5` |

Staging uses separate ARNs under `dollor/staging/*`. ECS task definitions pull secrets at container start.

### Credential Rules

| Rule | Details |
|------|---------|
| **NEVER commit `.p8` files** | App Store Connect keys. `.gitignore` blocks them. Production key `9K626GB728` lives at `~/.appstoreconnect/private_keys/` only. |
| **NEVER commit `.env` files** | `.gitignore` blocks them. Use `.env.example` for templates. |
| **Pre-commit hook active** | `.git/hooks/pre-commit` blocks Stripe keys, AWS keys, private key PEM blocks, `.p8` files, and raw `.env` files. |
| **Staging URL** | `d34u5ixl0bulv4.cloudfront.net` ONLY. The old `d3kuu45w6kl8hr` URL is PRODUCTION, not staging. |

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

**EVERY task — trivial or complex, code or deploy — MUST use a GSD command.** No direct code edits, no ad-hoc fixes, no standalone deploys, no "just this once" shortcuts.

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
Full pipeline end-to-end — **deployment is part of the phase, not a separate step:**

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

#### ⚠️ Deploy rule: Deploys MUST be a task inside a GSD phase plan
- **NEVER deploy ad-hoc** — every deploy (staging or production) must be a planned task in a GSD phase
- Phase plans MUST include deploy tasks as their final wave (e.g., "Wave 3: Push, deploy staging, smoke test, deploy production")
- If a deploy fails, use `/gsd:debug` to investigate — do NOT retry manually outside GSD
- **Skip nothing. NEVER run manual `docker build`, `aws ecs`, `docker push`, or direct ECR/ECS commands.**

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

*Last Updated: February 23, 2026*
*Token Count: ~1000*
