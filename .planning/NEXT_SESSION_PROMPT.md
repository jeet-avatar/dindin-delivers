# Next Session: Anti-Hallucination API Alignment Audit + App Store Submission

## Context

Quick tasks 73-78 completed in this session:
- **73**: Fixed 4 stress test warnings (coord validation, vendor search, demo rate limit)
- **75-76**: Fixed fare estimate auth (endpoint requires auth, iOS sends Bearer token)
- **77**: Fixed fare estimate flash/wrong price (3 root causes: race condition, recalculation mismatch, overlay)
- **78**: Reconciled dual pricing engines (order_flow.py now matches pricing_config.py), fixed Android MINIMUM_FARE

All pricing is now unified:
| Constant | Value | Files |
|----------|-------|-------|
| BASE_FARE | $2.50 | pricing_config.py:18, order_flow.py:516, AppConfig.swift:265, AppConfig.kt:184 |
| PER_MILE_RATE | $1.15 | pricing_config.py:19, order_flow.py:517, AppConfig.swift:266, AppConfig.kt:185 |
| PER_MINUTE_RATE | $0.18 | pricing_config.py:20, order_flow.py:518, AppConfig.swift:267, AppConfig.kt:186 |
| MINIMUM_FARE | $8.00 | pricing_config.py:21, order_flow.py:521, AppConfig.swift:268, AppConfig.kt:187 |

## Task 1: Full-Stack API Alignment Audit (Anti-Hallucination)

This was started but interrupted in the previous session. Run it now.

```
/gsd:quick --full Anti-hallucination full-stack API alignment audit for Customer app (iOS + Android). Verify EVERY API call in both customer apps hits a real backend endpoint with correct path, method, auth, and request/response shape. No hallucinated endpoints, no duplicates, no dead calls.

1. EXTRACT ALL API CALLS from iOS Customer app (P2PAPIService.swift + views/viewmodels)
2. EXTRACT ALL API CALLS from Android Customer app (Retrofit annotations in /Users/jeet/StudioProjects/eatfair-android/app/)
3. VERIFY each endpoint exists in backend (grep + API_REGISTRY.md)
4. CHECK for misalignments: iOS vs Android paths, field name mismatches, dead calls, duplicate calls
5. VERIFY auth patterns: public vs customer-auth endpoints
6. Run ask-dollor.sh for critical fields
7. Output: CUSTOMER_API_ALIGNMENT_AUDIT.md with PASS/FAIL per endpoint
```

## Task 2: Rerun Stress Test (39 checks)

```
/gsd:quick --full Rerun the quick-72 stress test (39 checks) against production after all fixes (quick-73 through quick-78). Verify:
- All 4 previous warnings are now PASS
- Demo login works without rate limiter blocking
- Fare estimate returns correct price with auth
- Vendor search filtering works
- Coordinate validation rejects invalid coords
- Pricing matches across estimate and payment
Output updated FINAL_STRESS_TEST_REPORT_v2.md. Must be GO with 0 FAIL and 0 WARNING.
```

## Task 3: Submit Customer App to App Store (after user approval)

```
/gsd:quick Submit iOS Customer app (build 1111) to App Store for review via App Store Connect API. DO NOT proceed without explicit user approval.

Steps:
1. Generate ASC JWT token
2. Verify version state is still PREPARE_FOR_SUBMISSION
3. Verify build 1111 is attached
4. Submit for review: POST https://api.appstoreconnect.apple.com/v1/appStoreVersionSubmissions
   Body: {"data":{"type":"appStoreVersionSubmissions","relationships":{"appStoreVersion":{"data":{"type":"appStoreVersions","id":"30ad500d-cdf6-47fb-98e2-314fe6fd68dc"}}}}}
5. Verify version state changes to WAITING_FOR_REVIEW
6. Report submission confirmation
```

## Current State
| Item | Status |
|------|--------|
| iOS Customer build | 1111 on TestFlight (attached to ASC version) |
| iOS Driver build | 213 on TestFlight |
| iOS Restaurant build | 183 on TestFlight |
| Android Customer | vC=34 on Firebase |
| Android Driver | vC=31 on Firebase |
| Android Partner | vC=27 on Firebase |
| ASC version state | PREPARE_FOR_SUBMISSION |
| Backend | Production deployed (pricing reconciled) |
| 1305 backend tests | All passing |
| Pricing engines | UNIFIED (estimate = payment = $2.50/$1.15/$0.18/$8.00) |
| Demo login | Rate limiter exempted for demo accounts |
| Fare estimate | Requires auth, iOS sends Bearer token, uses backend total |
| Vendor search | Server-side ilike filtering on name/cuisine |
| Coordinate validation | Rejects lat outside [-90,90], lng outside [-180,180] |

## App Store Connect IDs
- App ID: `6758230264`
- Version ID: `30ad500d-cdf6-47fb-98e2-314fe6fd68dc`
- Build 1111 ID: (check via ASC API — was attached in quick-77)

## API Auth
```python
import jwt, time
key = open("/Users/jeet/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8").read()
token = jwt.encode(
    {"iss": "80d10e49-f379-462f-9668-5ea53016812e", "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
    key, algorithm="ES256", headers={"kid": "9K626GB728"}
)
```

## Anti-Hallucination Checklist (run at start of session)
```bash
# Regenerate API registry
python scripts/extract-api-endpoints.py

# Verify pricing constants match
.claude/tools/ask-dollor.sh "What is the rideshare platform fee?"
.claude/tools/ask-dollor.sh "What is the customer service fee?"
.claude/tools/ask-dollor.sh "What fields does fare estimate return?"

# Verify demo login works
curl -s -X POST https://api.dollor.ai/api/auth/customer/login \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" \
  -H "Content-Type: application/x-www-form-urlencoded" | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if d.get('access_token') else 'FAIL:', json.dumps(d)[:100])"
```

## Commands
```bash
# API alignment audit
/gsd:quick --full Anti-hallucination full-stack API alignment audit for Customer app

# Rerun stress test
/gsd:quick --full Rerun 39-check stress test, verify 0 FAIL 0 WARNING

# Submit (after approval)
/gsd:quick Submit Customer app build 1111 to App Store via ASC API
```
