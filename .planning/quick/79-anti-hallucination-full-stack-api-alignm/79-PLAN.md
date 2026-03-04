---
phase: quick-79
plan: 79
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/79-anti-hallucination-full-stack-api-alignm/CUSTOMER_API_ALIGNMENT_AUDIT.md
autonomous: true
requirements: [ANTI-HALLUCINATION-AUDIT]
must_haves:
  truths:
    - "Every iOS Customer API call is verified against backend routes"
    - "Every Android Customer API call is verified against backend routes"
    - "Cross-platform mismatches (iOS vs Android) are identified"
    - "Dead/hallucinated endpoints are flagged with FAIL"
    - "Auth pattern correctness verified per endpoint"
  artifacts:
    - path: ".planning/quick/79-anti-hallucination-full-stack-api-alignm/CUSTOMER_API_ALIGNMENT_AUDIT.md"
      provides: "Full PASS/FAIL audit of every customer API call"
      min_lines: 200
  key_links: []
---

<objective>
Anti-hallucination full-stack API alignment audit for the Customer app across iOS and Android. Verify EVERY API call in both customer apps hits a real backend endpoint with correct path, method, auth header, and request/response shape.

Purpose: Ensure zero hallucinated endpoints ship to production. Catch path mismatches, dead calls, field name divergences, and auth pattern errors between iOS, Android, and backend.
Output: CUSTOMER_API_ALIGNMENT_AUDIT.md with PASS/FAIL per endpoint, cross-platform comparison, and actionable fix list.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/API_REGISTRY.md
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/auth/AuthViewModel.kt
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/cart/CartViewModel.kt
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/notification/NotificationViewModel.kt
@apps/web/p2p-platform/backend/main_new.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract and verify all Customer API calls from iOS and Android against backend</name>
  <files>.planning/quick/79-anti-hallucination-full-stack-api-alignm/CUSTOMER_API_ALIGNMENT_AUDIT.md</files>
  <action>
This is a READ-ONLY audit task. No code changes.

**Step 1 — Extract iOS Customer API calls:**
P2PAPIService.swift (14.5K lines) is shared across all 3 iOS apps. Filter to CUSTOMER-relevant calls only:
- Grep for functions that use `customerToken` or are in customer-facing sections (auth, orders, cart, rideshare, profile, notifications, restaurants, vendors, promotions, support)
- For each function, record: function name, HTTP method, URL path, auth pattern (customerToken/none/other), request body fields, response type
- SKIP functions that are clearly driver-only (driverToken) or vendor-only (vendorToken) — but flag any that seem ambiguous

**Step 2 — Extract Android Customer API calls:**
Search ALL .kt files under `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/` for API calls:
- CustomerRideshareApiService.kt (primary — 1233 lines, Retrofit-style)
- AuthViewModel.kt, CartViewModel.kt, NotificationViewModel.kt, and any other files making HTTP calls
- Also check for OkHttp/Retrofit interface definitions, URL string literals with "api/"
- For each call, record: function/annotation, HTTP method, URL path, auth header pattern, request body fields

**Step 3 — Verify each endpoint exists in backend:**
For EVERY extracted endpoint path:
- `grep -n "the/path" apps/web/p2p-platform/backend/main_new.py apps/web/p2p-platform/backend/*.py` to confirm route exists
- Cross-reference with .planning/API_REGISTRY.md
- Check HTTP method matches (GET vs POST etc.)
- Check if endpoint is in auth middleware allowlist (public) or requires JWT
- Mark as PASS (exists, method matches, auth correct) or FAIL (missing, wrong method, wrong auth)

**Step 4 — Cross-platform alignment check:**
- Compare iOS path vs Android path for same logical endpoint
- Flag any path divergences (e.g., iOS uses /api/customer/orders, Android uses /api/orders)
- Flag field name mismatches in request bodies (e.g., iOS sends `delivery_address` vs Android sends `deliveryAddress`)
- Flag duplicate calls (same endpoint called from multiple places unnecessarily)
- Flag dead calls (endpoint exists in client but returns 404/not implemented in backend)

**Step 5 — Auth pattern verification:**
For each endpoint, verify:
- Public endpoints (login, register, demo, vendor listings) have NO auth requirement
- Customer-auth endpoints use correct token header pattern
- No customer app calls driver-only or vendor-only endpoints

**Step 6 — Write CUSTOMER_API_ALIGNMENT_AUDIT.md:**
Structure the report as:

```
# Customer App API Alignment Audit
## Date: {today}
## Summary: X endpoints audited, Y PASS, Z FAIL, W WARNINGS

## Methodology
- iOS source: P2PAPIService.swift (customer-relevant functions)
- Android source: CustomerRideshareApiService.kt + ViewModels
- Backend: main_new.py + route files (grep-verified)
- Registry: API_REGISTRY.md cross-reference

## Results by Category

### Authentication
| Endpoint | Method | iOS | Android | Backend | Auth | Status |
|----------|--------|-----|---------|---------|------|--------|
| /api/auth/customer/login | POST | loginCustomer() | login() | main_new.py:XXXX | public | PASS |

### Food Ordering
(same table format)

### Rideshare
(same table format)

### Profile/Account
(same table format)

### Notifications
(same table format)

### Other
(same table format)

## Cross-Platform Mismatches
| Issue | iOS | Android | Severity | Fix Needed |
|-------|-----|---------|----------|-----------|

## Dead/Hallucinated Endpoints
| Endpoint | Platform | Why Dead | Action |
|----------|----------|----------|--------|

## Auth Pattern Issues
| Endpoint | Expected | Actual | Platform |
|----------|----------|--------|----------|

## Actionable Fixes
(Numbered list of specific fixes needed, sorted by severity)
```

Use `grep -n` to include line numbers for every backend route reference. This is the anti-hallucination guarantee — every claim must have a file:line citation.
  </action>
  <verify>
1. CUSTOMER_API_ALIGNMENT_AUDIT.md exists and has PASS/FAIL for every endpoint
2. Every PASS has a `grep` line number citation from backend code
3. Every FAIL has a clear reason and recommended action
4. Cross-platform comparison table is complete
5. Run: `grep -c "PASS\|FAIL" .planning/quick/79-anti-hallucination-full-stack-api-alignm/CUSTOMER_API_ALIGNMENT_AUDIT.md` shows total audited count
  </verify>
  <done>
Complete audit report with:
- Every iOS Customer API call verified against backend (PASS/FAIL with line citations)
- Every Android Customer API call verified against backend (PASS/FAIL with line citations)
- Cross-platform mismatch table showing any iOS vs Android divergences
- Dead endpoint list with recommended actions
- Auth pattern verification for all endpoints
- Actionable fix list sorted by severity
  </done>
</task>

</tasks>

<verification>
- Audit covers ALL customer-relevant API calls (not just a sample)
- Every PASS claim is backed by a grep line number from backend source
- No endpoint marked PASS without actual backend route verification
- Cross-platform comparison is complete (not just one platform)
</verification>

<success_criteria>
- CUSTOMER_API_ALIGNMENT_AUDIT.md exists with full PASS/FAIL results
- Zero unverified endpoint claims (every status backed by grep evidence)
- All cross-platform mismatches documented
- Actionable fix list ready for implementation
</success_criteria>

<output>
After completion, create `.planning/quick/79-anti-hallucination-full-stack-api-alignm/79-SUMMARY.md`
</output>
