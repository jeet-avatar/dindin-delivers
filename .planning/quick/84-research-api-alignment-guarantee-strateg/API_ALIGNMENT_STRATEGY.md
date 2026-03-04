# API Alignment Guarantee Strategy

## Date: 2026-03-04
## Problem: How to ensure iOS, Android, and Backend APIs stay in sync going forward

---

## What We Already Have

| Asset | Location | What It Does |
|-------|----------|-------------|
| `extract-api-endpoints.py` | `scripts/` | Regex-extracts all backend routes → Markdown table |
| `API_REGISTRY.md` | `.planning/` | Auto-generated backend route registry |
| FastAPI OpenAPI schema | Runtime `/openapi.json` | **528 paths** auto-generated with full request/response models |
| CI/CD pipeline | `.github/workflows/ci-complete.yml` | Runs tests on PR/push, but no API contract checks |

## Current Gap

No automated check ensures that iOS/Android API calls match backend routes. The quick-79 audit was manual, took ~8 minutes agent time, and produced false positives because it didn't account for Retrofit base URL resolution. We need an automated, CI-integrated check.

---

## Options Evaluated

### Option 1: OpenAPI Spec + CI Contract Validator (RECOMMENDED)

**How it works:**
1. FastAPI already generates OpenAPI 3.1 spec with 528 paths at startup
2. Add a CI step that exports the OpenAPI spec and extracts all valid paths
3. Add a script that extracts all client API paths from iOS (`P2PAPIService.swift`) and Android (`DollorApiService.kt`)
4. Compare: every client path must exist in the OpenAPI spec → FAIL CI if not

**Implementation:**
```
scripts/
  extract-api-endpoints.py      # Already exists (backend)
  validate-api-contracts.py     # NEW — extracts client paths, compares to OpenAPI
```

The new script would:
- Load OpenAPI spec (export from FastAPI at test time — no live server needed)
- Extract iOS paths via regex: `URL(string: ".*?/api/(.+?)"` patterns from P2PAPIService.swift
- Extract Android paths via regex: `@(GET|POST|PUT|DELETE)\("(.+?)"\)` from DollorApiService.kt
- Resolve Android paths with base URL prefix `/api/`
- Compare each client path against OpenAPI `paths` keys
- Report: PASS/FAIL per endpoint, exit code 1 if any FAIL

**Effort:** 1-2 hours (single Python script + CI step)
**Maintenance:** Zero — OpenAPI spec auto-updates when backend changes, client extraction is regex-based
**False positive risk:** LOW — resolves base URLs correctly, accounts for path params (`{id}` patterns)
**CI integration:** Add one step to `ci-complete.yml`

### Option 2: Pact Contract Testing

**How it works:** Consumer-driven contract tests where each client defines expected API interactions, provider (backend) verifies them.

**Pros:** Industry standard, bidirectional verification, catches request/response shape mismatches
**Cons:**
- Heavy setup: Pact broker, Ruby/Node pact tooling, separate test suites per client
- **Does not fit**: iOS (Swift) and Android (Kotlin) Pact libraries are poorly maintained
- Each new endpoint needs explicit Pact contract definition — high maintenance
- Overkill for our 79-endpoint customer app

**Effort:** 1-2 weeks
**Maintenance:** HIGH — every API change needs contract updates in 3 places
**Verdict:** Too heavy for our team size and stack

### Option 3: OpenAPI Code Generation (Swift/Kotlin clients)

**How it works:** Generate API client code from OpenAPI spec → replace hand-written P2PAPIService.swift and DollorApiService.kt

**Tools:** `openapi-generator` → Swift5, Kotlin Retrofit2
**Pros:** Single source of truth, zero drift by definition
**Cons:**
- **Massive migration**: Replace 363 iOS URL constructions and 166 Android Retrofit annotations
- Generated code is hard to customize (auth headers, error handling, retry logic)
- Our iOS service uses custom `secureSession` with SSL pinning — generated clients won't have this
- Generated Kotlin doesn't understand our `TokenRefreshInterceptor` pattern
- Breaking change for the entire codebase

**Effort:** 2-3 weeks + ongoing maintenance of generator config
**Maintenance:** MEDIUM — but migration risk is very high
**Verdict:** Right idea, wrong stage. Worth revisiting when rebuilding from scratch, not for a shipping product.

### Option 4: Enhanced Registry Script (Lightweight)

**How it works:** Extend existing `extract-api-endpoints.py` to also extract client paths and cross-reference.

**Pros:** Builds on what exists, no new tooling
**Cons:**
- Same as Option 1 but without OpenAPI (less accurate — regex vs actual FastAPI routing)
- Doesn't catch request/response shape mismatches
- No path parameter normalization

**Effort:** 1 hour
**Maintenance:** LOW
**Verdict:** Good quick win but Option 1 is barely more effort and much more accurate

---

## RECOMMENDATION: Option 1 — OpenAPI Spec + CI Contract Validator

### Why This Is the Right Choice

1. **FastAPI gives us the spec for free** — 528 paths, zero extra work
2. **Single script** — `validate-api-contracts.py` (~150 lines)
3. **CI gate** — add to `ci-complete.yml`, fails the build if client calls nonexistent endpoint
4. **Accounts for base URLs** — resolves Retrofit's `/api/` prefix correctly (avoids the false positive trap)
5. **Zero ongoing maintenance** — backend spec auto-updates, client extraction is regex-based
6. **Catches real issues early** — new client code calling removed/renamed endpoints fails CI

### Implementation Plan

#### Script: `scripts/validate-api-contracts.py`

```python
# Pseudocode

1. Export OpenAPI spec from FastAPI app (import at module level, no server needed)
2. Normalize all paths: /api/rides/{ride_id}/track → /api/rides/{}/track
3. Extract iOS paths from P2PAPIService.swift:
   - Regex: URL patterns containing /api/...
   - Normalize path params: {rideId} → {}
4. Extract Android paths from DollorApiService.kt:
   - Regex: @POST("rides/estimate") → /api/rides/estimate
   - Apply base URL prefix: /api/
   - Normalize path params
5. Also extract from CustomerRideshareApiService.kt (OkHttp calls)
6. Compare: every client path must match at least one OpenAPI path
7. Report table: endpoint, iOS status, Android status, backend status
8. Exit code: 0 = all match, 1 = mismatches found
```

#### CI Integration: `.github/workflows/ci-complete.yml`

```yaml
  api-contracts:
    name: API Contract Validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install fastapi pydantic sqlalchemy
      - name: Validate API contracts
        run: python scripts/validate-api-contracts.py
        env:
          DATABASE_URL: sqlite:///tmp/test.db
          JWT_SECRET_KEY: ci-test-key
```

#### Expected Output
```
API Contract Validation Report
================================
Backend paths (OpenAPI): 528
iOS client paths: ~180
Android client paths: ~166

✓ iOS: 180/180 paths match backend
✓ Android: 162/166 paths match backend
✗ Android: 4 paths NOT in backend (dead shared services — ChatService, etc.)

RESULT: PASS (4 known dead-code exclusions)
```

### What This Catches Going Forward

| Scenario | Detection |
|----------|-----------|
| Dev adds iOS API call to endpoint that doesn't exist | CI FAILS on PR |
| Dev renames backend route but forgets to update Android | CI FAILS on PR |
| Dev removes backend endpoint still called by iOS | CI FAILS on PR |
| Dev adds new backend endpoint (no client calls) | No alert (correct — client may not need it yet) |
| Request/response shape mismatch | NOT caught (would need Pact for this) |

### Exclusion List

Dead-code endpoints that should be excluded from validation (aspirational services):
- `ChatService.kt` — 5 endpoints (live chat, not implemented)
- `NegotiationService.kt` — 4 endpoints (price negotiation service, not implemented)
- `CallService.kt` — 6 endpoints (voice call service, not implemented)

These are in the Android `shared` module but never called from any app. Exclude via config file or inline annotations.

---

## Timeline

| Step | Effort | Priority |
|------|--------|----------|
| Write `validate-api-contracts.py` | 1-2 hours | HIGH |
| Add CI step to `ci-complete.yml` | 15 minutes | HIGH |
| Add exclusion config for dead services | 15 minutes | MEDIUM |
| Test against current codebase (should pass) | 15 minutes | HIGH |
| Document in CLAUDE.md | 10 minutes | LOW |

**Total: ~2-3 hours to permanent API alignment guarantee.**
