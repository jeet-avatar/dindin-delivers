# NEXT SESSION PROMPT - Dollor.ai iOS Go-Live

**Last Updated**: 2026-02-05 07:25 UTC
**Status**: DEEP AUDIT REQUIRED - QA Passes but 70 Edge Case Issues Found

---

## CRITICAL FINDING: QA Runner vs Deep Code Audit

```
┌───────────────────────────────────────┬────────────────┬───────────────────────────────┐
│              Check Type               │   QA Runner    │        Deep Code Audit        │
├───────────────────────────────────────┼────────────────┼───────────────────────────────┤
│ API endpoints working                 │ ✅ Covered     │ -                             │
│ Authentication flows                  │ ✅ Covered     │ -                             │
│ Data bindings exist                   │ ✅ Covered     │ -                             │
│ Security basics                       │ ✅ Covered     │ -                             │
│ Force unwraps/crashes                 │ ❌ Not checked │ ✅ 70 issues found            │
│ Silent error handling                 │ ❌ Not checked │ ✅ Found extensive try? usage │
│ State consistency                     │ ❌ Not checked │ ✅ Race conditions found      │
│ Edge cases (empty arrays, 0,0 coords) │ ❌ Not checked │ ✅ Multiple issues            │
└───────────────────────────────────────┴────────────────┴───────────────────────────────┘
```

**Conclusion**: QA Runner confirms app works for happy-path scenarios. Deep audit identified 70 potential runtime failure points that could cause crashes or silent failures in production edge cases.

---

## ENVIRONMENTS

| Environment | URL | Status |
|-------------|-----|--------|
| **Local** | `http://localhost:8080` | For development |
| **Staging** | `https://d3kuu45w6kl8hr.cloudfront.net` | ✅ Working |
| **Production** | `https://api.dollor.ai` | ✅ Deployed (v1.0.8) |

---

## DEMO CREDENTIALS

| App | Email | Password | ID |
|-----|-------|----------|-----|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! | 74 |
| Vendor | demo.restaurant@dollor.ai | DemoRestaurant2025! | 40 |
| Driver | demo.driver@dollor.ai | DemoDriver2025! | 48 |

---

## SESSION 2026-02-04/05 SUMMARY

### Commits Pushed to Production:
| Commit | Description |
|--------|-------------|
| `0da19956` | Driver ETA: Send ETA when accepting orders |
| `c17c97f0` | Debug: Add debug-customer-login endpoint |
| `3d70c4a3` | High severity: Silent failures and user feedback |
| `bcc8b3b2` | Critical: Security (vendorId leak) and reliability fixes |
| `eb844808` | P1/P2: Alert modifiers, order ID truncation |
| `e9f32543` | Backend: Stacked decorators (60 removed), active orders filter |

### What Was FIXED (✅):

| Severity | Issue | File | Fix |
|----------|-------|------|-----|
| **CRITICAL** | VendorId fallback to 1 → Data leakage | AnalyticsViewModel.swift:48 | Now returns error if not logged in |
| **CRITICAL** | Array zip mismatch → Incomplete orders | OrderSuccessView.swift:141 | Safe array bounds checking |
| **HIGH** | Empty restaurant ID → Silent order failure | MultiRestaurantCartViewModel.swift:351 | Validate IDs before placement |
| **HIGH** | State not rollback on failure | DeliveryViewModel.swift:372 | Rollback myDeliveries on API error |
| **HIGH** | Timer race condition | EnhancedDashboardView.swift:422 | Added hasTriggered flag |
| **HIGH** | try? silently fails → empty menus | MenuViewModel.swift:202 | Proper error handling with logging |
| **HIGH** | MKDirections failures ignored | PickupDropoffView.swift:340 | Added onRouteError callback |
| **HIGH** | Int(idString) fails silently | OrdersViewModel.swift:249 | Better error messages, DEBUG logging |
| **P1** | Error alert missing | PickupDropoffView.swift | Added .alert() modifier |
| **P1** | Active orders returning delivered | order_flow.py:3166 | Filter excludes DELIVERED/CANCELLED |
| **P1** | Missing alerts | 3 Driver views | Added .alert() modifiers |
| **P2** | Order # truncated | 3 files | Removed .prefix() calls |
| **P1** | Driver ETA not sent → "soon" | P2PAPIService+DeliveryVM | Calculate & send driver_eta_minutes |
| **Backend** | 60 stacked decorators | main_new.py | Replaced with app.add_api_route() |

---

## REMAINING ISSUES TO FIX (From Deep Audit)

### CRITICAL/HIGH Severity (Unfixed):

| App | File:Line | Issue | Risk |
|-----|-----------|-------|------|
| Customer | DeliveryTrackingView.swift:275 | Unvalidated coordinates (0,0) | Map shows wrong location |
| Driver | PickupDropoffView.swift:340-349 | MKDirections failures only logged in DEBUG | ETA shows "--" forever |
| All Apps | Multiple files | Silent JSON decode failures with try? | Missing data |

### MEDIUM Severity (26 Issues):

| App | Issue | Count |
|-----|-------|-------|
| Customer | Silent JSON decode failures with try? | 5 |
| Customer | Timer/resource leaks | 2 |
| Customer | Coordinate validation (OR instead of AND) | 1 |
| Driver | Location update failures not shown to user | 3 |
| Driver | Phone number parsing for tel:// URLs | 1 |
| Restaurant | Timer not invalidated on logout | 1 |
| Restaurant | Error message set but showError flag not set | 2 |
| Restaurant | Network failure doesn't rollback order state | 1 |

### Files with try? Silent Failures (Need Error Handling):

```
apps/ios/eatfair-ios-shared/.../AIEmployeeService.swift:96
apps/ios/eatfair-ios-shared/.../AIEmployeeService.swift:530
apps/ios/restaurant/.../EnhancedMenuView.swift:792
apps/ios/restaurant/.../AIEmployeesView.swift:754
apps/ios/delivery/.../ChatManager.swift:101
apps/ios/delivery/.../ChatManager.swift:139
apps/ios/delivery/.../EarningsViewModel.swift:545
apps/ios/delivery/.../EarningsViewModel.swift:593
```

### Systemic Patterns to Address:

1. **Silent Failures** - Extensive use of `try?` hides real errors from users
2. **String-Based Status Comparisons** - No enums; typos cause missed cases
3. **Empty String Fallbacks** - `id ?? ""` creates invalid IDs that fail later
4. **Timer Leaks** - Timers not always invalidated on view disappear/logout
5. **No Unified Error Handling** - Each API call handles errors differently
6. **Coordinate Validation** - Only checks for (0,0), not NaN or out-of-range

---

## DEEP AUDIT CHECKS TO ADD TO QA RUNNER

```bash
# 1. Check for silent try? failures
grep -rn "try?" apps/ios/ --include="*.swift" | wc -l

# 2. Check for force unwraps
grep -rn "\\!" apps/ios/ --include="*.swift" | grep -v "//\|/\*\|!=\|<!--" | wc -l

# 3. Check for empty string fallbacks on IDs
grep -rn '\.id ?? ""' apps/ios/ --include="*.swift"

# 4. Check for timers without invalidation
grep -rn "Timer.scheduledTimer" apps/ios/ --include="*.swift"

# 5. Check for string status comparisons (should use enums)
grep -rn '\.status == "' apps/ios/ --include="*.swift"
grep -rn '\.status.lowercased()' apps/ios/ --include="*.swift"

# 6. Check coordinate validation
grep -rn "latitude.*0.*longitude\|longitude.*0.*latitude" apps/ios/ --include="*.swift"
```

---

## VERIFICATION COMMANDS

### 1. Run QA (Happy Path)
```bash
./scripts/qa-runner.sh staging pre-deploy
```

### 2. Run Deep Audit (Edge Cases)
```bash
# Count potential issues
echo "Silent try? failures:"
grep -rn "try?" apps/ios/ --include="*.swift" | wc -l

echo "Force unwraps:"
grep -rn '!\.' apps/ios/ --include="*.swift" | grep -v "//" | wc -l

echo "Empty ID fallbacks:"
grep -rn '\.id ?? ""' apps/ios/ --include="*.swift" | wc -l

echo "Unprotected timers:"
grep -rn "Timer.scheduledTimer" apps/ios/ --include="*.swift" -l | wc -l
```

### 3. Test Demo Logins
```bash
# Staging
curl -s -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/customer/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('✅' if 'access_token' in d else '❌', d)"

# Production
curl -s -X POST "https://api.dollor.ai/api/auth/customer/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('✅' if 'access_token' in d else '❌', d)"
```

### 4. Check Production Health
```bash
curl -s "https://api.dollor.ai/health" | python3 -m json.tool
```

---

## ISSUE SEVERITY BY COUNT

| Severity | Customer | Driver | Restaurant | Total |
|----------|----------|--------|------------|-------|
| Critical | 4 | 0 | 1 | **5** |
| High | 6 | 2 | 5 | **13** |
| Medium | 8 | 9 | 9 | **26** |
| Low | 6 | 14 | 6 | **26** |
| **Total** | **24** | **25** | **21** | **70** |

---

## TOP 10 REMAINING FIXES BY IMPACT

1. ~~Customer: OrderSuccessView array zip~~ ✅ FIXED
2. ~~Restaurant: Timer race condition~~ ✅ FIXED
3. ~~Customer: Empty restaurant ID fallback~~ ✅ FIXED
4. ~~Restaurant: Order ID Int conversion~~ ✅ FIXED (improved messages)
5. ~~Driver: State consistency during accept~~ ✅ FIXED
6. ~~Customer: Menu item decode failures~~ ✅ FIXED
7. ~~Restaurant: VendorId fallback to 1~~ ✅ FIXED (CRITICAL)
8. All Apps: Error flag not set after errorMessage → **TODO**
9. ~~Driver: Route calculation failures~~ ✅ FIXED
10. All Apps: Timer cleanup on logout → **TODO**

---

## SOURCE OF TRUTH FILES

| Purpose | Path |
|---------|------|
| Backend API | `apps/web/p2p-platform/backend/main_new.py` |
| Order Flow | `apps/web/p2p-platform/backend/order_flow.py` |
| Models | `apps/web/p2p-platform/backend/models.py` |
| iOS API | `apps/ios/eatfair-ios-shared/.../P2PAPIService.swift` |
| QA Runner | `scripts/qa-runner.sh` |
| This File | `apps/ios/NEXT_SESSION_PROMPT.md` |
| Source of Truth | `.claude/SOURCE_OF_TRUTH.md` |

---

## BUSINESS RULES (NEVER CHANGE)

1. **MATCHMAKING SERVICE** - Not delivery company, not TNC
2. **FLAT FEES ONLY** - $1-$3, never percentage commission
3. **DRIVERS KEEP 100%** - of delivery fee + tips
4. **MULTI-RESTAURANT** - up to 3 restaurants per order

---

## QA LAST RUN

```
✅ PASS - 21/21 agents passed (Happy Path)
⚠️  70 edge case issues identified by Deep Audit
Reports: .planning/qa-reports/2026-02-04_23-00-46_pre-deploy/
```

---

## NEXT SESSION PRIORITIES

### Immediate (Before App Store):
1. ☐ Fix remaining "error flag not set" issues (2 in Restaurant app)
2. ☐ Add timer cleanup on logout/view disappear
3. ☐ Add deep audit checks to QA runner
4. ☐ Test iOS builds compile

### Before Go-Live:
5. ☐ Address remaining try? silent failures
6. ☐ Convert string status comparisons to enums
7. ☐ Validate all coordinate checks use AND not OR
8. ☐ Full regression test on device

### Nice to Have:
9. ☐ Unified error handling across all apps
10. ☐ Add retry logic for network failures

---

## AGENTS AVAILABLE

```bash
# Full QA (21 agents) - Happy Path
./scripts/qa-runner.sh staging pre-deploy

# Go-Live Check
./.claude/agents/ios-go-live-agent.sh staging

# Business Analyst Validator
./.claude/agents/business-analyst-validator.sh staging
```

---

*Do not assume - verify everything with commands above.*
*QA passing does NOT mean edge cases are handled.*
