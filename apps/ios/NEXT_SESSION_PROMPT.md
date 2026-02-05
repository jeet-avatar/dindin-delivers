# NEXT SESSION PROMPT - Dollor.ai iOS Go-Live

**Last Updated**: 2026-02-04 22:15 UTC
**Status**: PARTIALLY COMPLETE - Continue Fixes

---

## ENVIRONMENTS (CRITICAL)

| Environment | URL | When to Use |
|-------------|-----|-------------|
| **Local** | `http://localhost:8080` | Development only |
| **Staging** | `https://d3kuu45w6kl8hr.cloudfront.net` | Testing BEFORE production |
| **Production** | `https://api.dollor.ai` | Live users - TEST ON STAGING FIRST |

### Start Local Backend
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
source venv/bin/activate  # if using venv
pip install pydantic==2.5.0  # ensure correct version
uvicorn main_new:app --reload --port 8080
```

### iOS App Config Location
```
apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
```

---

## DEMO CREDENTIALS (All Environments)

| App | Email | Password | ID |
|-----|-------|----------|-----|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! | 74 |
| Vendor | demo.restaurant@dollor.ai | DemoRestaurant2025! | 40 |
| Driver | demo.driver@dollor.ai | DemoDriver2025! | 48 |

---

## WHAT WAS FIXED (Session 2026-02-04)

| Issue | File | Status |
|-------|------|--------|
| P0: DriverStatus.ONLINE | models.py | ✅ FIXED (enum exists) |
| P1: Active orders filter | order_flow.py:3166 | ✅ FIXED |
| P1: Alert - AvailableOrdersView | AvailableOrdersView.swift | ✅ FIXED |
| P1: Alert - DriverDashboardView | DriverDashboardView.swift | ✅ FIXED |
| P1: Alert - MyDeliveriesView | MyDeliveriesView.swift | ✅ FIXED |
| Stacked decorators | main_new.py | ✅ FIXED (60 removed) |
| Pydantic version | - | ✅ FIXED (2.5.0) |

---

## WHAT REMAINS TO FIX

| Priority | Issue | File:Line | Fix |
|----------|-------|-----------|-----|
| **P1** | Error alert missing | PickupDropoffView.swift | Add .alert() modifier |
| **P2** | Order # truncated | ActiveDeliveryDetailView.swift:54 | Remove .prefix(8) |
| **P2** | Order # truncated | MyDeliveriesView.swift:250 | Remove .prefix(6) |
| **P2** | Order # truncated | PickupDropoffView.swift:780 | Remove .prefix(8) |
| **--** | Add QA checks | scripts/qa-runner.sh | Add issue detection |
| **--** | Add validator checks | .claude/agents/*.sh | Add compulsory checks |

---

## FIX COMMANDS

### 1. Add Alert to PickupDropoffView.swift
Find the NavigationView closing and add before it:
```swift
.alert("Error", isPresented: $viewModel.showError) {
    Button("OK", role: .cancel) { }
} message: {
    Text(viewModel.errorMessage)
}
```

### 2. Fix Order Number Truncation
```bash
# Find and replace .prefix() calls
grep -rn "\.prefix(6)\|\.prefix(8)" apps/ios/delivery/eatffairdelivery/Views/

# In each file, change:
# Text("Order #\(order.orderId.prefix(8))")
# To:
# Text("Order #\(order.orderId)")
```

### 3. Verify Active Orders Fix
```bash
# Get token first
TOKEN=$(curl -s -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/driver/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.driver@dollor.ai&password=DemoDriver2025!" | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

# Check no delivered orders returned
curl -s "https://d3kuu45w6kl8hr.cloudfront.net/api/erp/orders/driver/48/active" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; orders=json.load(sys.stdin); print([o['status'] for o in orders])"
```

---

## VERIFICATION WORKFLOW

### Step 1: Backend Import Test
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
python3 -c "from main_new import app; print(f'✅ Routes: {len(app.routes)}')"
```

### Step 2: Run QA on Staging
```bash
cd /Users/jeet/StudioProjects/eatfair-ios
./scripts/qa-runner.sh staging pre-deploy
```

### Step 3: Test Demo Logins
```bash
# Customer
curl -s -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/customer/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ Customer' if 'access_token' in d else '❌ Customer')"

# Vendor
curl -s -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/vendor/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.restaurant@dollor.ai&password=DemoRestaurant2025!" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ Vendor' if 'access_token' in d else '❌ Vendor')"

# Driver
curl -s -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/driver/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.driver@dollor.ai&password=DemoDriver2025!" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ Driver' if 'access_token' in d else '❌ Driver')"
```

### Step 4: iOS Build Test
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer
xcodebuild -workspace eatfaircustomer.xcworkspace -scheme eatfaircustomer -sdk iphonesimulator build 2>&1 | tail -5
```

---

## SOURCE OF TRUTH FILES

| Purpose | Path |
|---------|------|
| Backend API | `apps/web/p2p-platform/backend/main_new.py` |
| Order Flow | `apps/web/p2p-platform/backend/order_flow.py` |
| Models | `apps/web/p2p-platform/backend/models.py` |
| iOS API | `apps/ios/eatfair-ios-shared/.../P2PAPIService.swift` |
| QA Runner | `scripts/qa-runner.sh` |
| Issues Report | `apps/ios/SESSION_ISSUES_REPORT.md` |
| This File | `apps/ios/NEXT_SESSION_PROMPT.md` |
| Source of Truth | `.claude/SOURCE_OF_TRUTH.md` |

---

## AGENTS AVAILABLE

```bash
# Go-Live Check
./.claude/agents/ios-go-live-agent.sh staging

# Business Analyst Validator
./.claude/agents/business-analyst-validator.sh staging

# Full QA (21 agents)
./scripts/qa-runner.sh staging pre-deploy
```

---

## BUSINESS RULES (NEVER CHANGE)

1. **MATCHMAKING SERVICE** - Not delivery company, not TNC
2. **FLAT FEES ONLY** - $1-$3, never percentage commission
3. **DRIVERS KEEP 100%** - of delivery fee + tips
4. **MULTI-RESTAURANT** - up to 3 restaurants per order

---

## QA LAST RUN (22:07:58)

```
✅ PASS - 21/21 agents passed
Reports: .planning/qa-reports/2026-02-04_22-07-58_pre-deploy/
```

---

## NEXT STEPS

1. ☐ Fix PickupDropoffView.swift alert
2. ☐ Fix order number truncation (3 files)
3. ☐ Add checks to QA runner
4. ☐ Run full QA
5. ☐ Test iOS builds
6. ☐ Deploy to staging
7. ☐ Test on staging
8. ☐ Deploy to production
9. ☐ Submit to App Store

---

*Do not assume - verify everything with commands above.*
