# Next Session Prompt

> Run `/gsd:resume-work` to restore context, then work through items below.

---

## Session Summary (Mar 13, 2026 — Late Night Session)

### Completed This Session

| Quick | What | Commits |
|-------|------|---------|
| 140 | Verify STATE.md deduplication — 164→143 lines, 1490 tests pass | `3b5e7a45` |
| 164 | Combo deals + bestseller features (backend + iOS restaurant + iOS customer) | `4d6b0831` |
| 141 | Build + upload all 3 iOS apps to TestFlight v1.1 (Customer 1114, Driver 216, Restaurant 206) | `ea2b07c9` |
| — | Fix prominent Create Combo Deal button (was icon-only, now green banner) | `93560806` |
| — | CRITICAL FIX: Add combo/bestseller columns to startup migrations (menu 500 fix) | `4dcbec4a` |

**Deployments:**
- Backend staging: Succeeded (run 23033779943) — includes migration fix
- Backend production: Succeeded (run 23033982090) — includes migration fix
- iOS Customer 1114 v1.1: TestFlight (uploaded)
- iOS Driver 216 v1.1: TestFlight (uploaded)
- iOS Restaurant 206 v1.1: TestFlight (uploaded)

**New Features Deployed:**
- **Combo Deals**: Vendors create combos from existing menu items, auto-pricing suggestions (10-15% discount), customer sees "Combo Deal" badge + included items + savings
- **Bestseller**: Vendors toggle bestseller on items, customer sees "Bestseller" badge, sorted first per category
- **Marketing version bumped**: 1.0 → 1.1 (Apple required it — v1.0 was previously approved)

---

## PRIORITY 0 — CRITICAL: SSL Certificate Issue (BLOCKING)

**Symptom:** Apple is flagging the website as "unsafe connection" — certificate appears invalid/expired.

**Anti-hallucination investigation steps (MANDATORY):**
```bash
# Check SSL cert expiry for dollor.ai
openssl s_client -connect api.dollor.ai:443 -servername api.dollor.ai 2>/dev/null | openssl x509 -noout -dates -subject -issuer

# Check www.dollor.ai too
openssl s_client -connect www.dollor.ai:443 -servername www.dollor.ai 2>/dev/null | openssl x509 -noout -dates -subject -issuer

# Check bare domain
openssl s_client -connect dollor.ai:443 -servername dollor.ai 2>/dev/null | openssl x509 -noout -dates -subject -issuer

# Check ACM cert in AWS (if above shows expired)
aws acm list-certificates --region us-east-1 --query 'CertificateSummaryList[?DomainName==`dollor.ai` || DomainName==`*.dollor.ai`]'

# Check CloudFront distribution cert
aws cloudfront get-distribution --id E3LB9SMG1YD9ZL --query 'Distribution.DistributionConfig.ViewerCertificate'
```

**Context from memory:**
- SSL pinning uses root CA pins ONLY (Amazon Root CA 1-4 + Starfield Services Root G2)
- ACM cert was set to expire Dec 31, 2026 with auto-renewal ~Nov 1, 2026
- Root-only pinning means ACM renewals should NOT require app updates
- Runbook: `.planning/runbooks/ssl-pinning-rotation.md`
- If cert actually expired early or was revoked, this breaks ALL iOS API calls (182 calls go through secureSession with SSL pinning)

**Fix approach:**
```
/gsd:debug "Apple showing unsafe connection — SSL certificate appears invalid on dollor.ai"
```

---

## PRIORITY 1 — CRITICAL: Stripe Payment Not Working on Demo Account

**Symptom:** Stripe payment fails when trying to complete an order on the demo customer account.

**Anti-hallucination investigation steps (MANDATORY):**
```bash
# Verify demo customer can login
curl -s -X POST "https://api.dollor.ai/api/auth/customer/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.customer@dollor.ai","password":"DemoCustomer2025!"}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("Token:", d.get("access_token","FAIL")[:20])'

# Check if Stripe key is live or test
grep -n "STRIPE" apps/web/p2p-platform/backend/main_new.py | head -10

# Check Stripe payment intent creation endpoint
grep -n "payment.intent\|create_payment\|stripe.*payment" apps/web/p2p-platform/backend/main_new.py | head -10

# Verify Stripe secret is loaded (staging vs production)
curl -s "https://api.dollor.ai/api/health" 2>&1 | head -5

# Check if demo customer has Stripe customer ID
# (need token from login above)
curl -s "https://api.dollor.ai/api/customers/profile" \
  -H "Authorization: Bearer TOKEN" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("stripe_customer_id:", d.get("stripe_customer_id", "NONE")); print("has_payment:", d.get("has_payment_method", "NONE"))'
```

**Possible causes (verify each):**
1. Demo account has no Stripe customer ID (never set up payment)
2. Stripe test key on production (should be `sk_live_*`)
3. Payment intent endpoint returns error
4. iOS app sends wrong payment data format
5. Stripe webhook not configured for payment confirmation

**Fix approach:**
```
/gsd:debug "Stripe payment not working on demo customer account — cannot complete order"
```

---

## PRIORITY 2: Rebuild iOS Apps After Fixes

**After fixing SSL + Stripe, rebuild and re-upload to TestFlight:**
- Customer: bump to 1115
- Driver: bump to 217
- Restaurant: bump to 207

```
/gsd:quick "Bump iOS builds and upload to TestFlight — Customer 1115, Driver 217, Restaurant 207"
```

---

## PRIORITY 3: Verify Combo + Bestseller Features on Device

**Runtime testing from Quick-164 verification (4 items need manual check):**

| # | Test | How |
|---|------|-----|
| 1 | Bestseller toggle persists | Restaurant app → Menu → Edit item → toggle Bestseller → save → re-open |
| 2 | Create Combo end-to-end | Restaurant app → Menu → Create Combo Deal → select 2+ items → save |
| 3 | Bestseller sort in Customer app | Customer app → restaurant → verify bestseller item at top of category |
| 4 | Combo display in Customer app | Customer app → restaurant → verify Combo Deal badge + items list + savings |

**If any fail:**
```
/gsd:debug "Combo/bestseller feature [#] fails — [describe]"
```

---

## PRIORITY 4: Previous Session Carryover

From previous session (still pending):

### Apple App Store Cleanup → Customer Build
1. Remove `NSContactsUsageDescription` from Info.plist (unused)
2. Remove `NSLocationAlwaysAndWhenInUseUsageDescription` from Info.plist (unused)
3. Set `ENABLE_AI_FEATURES=NO` in Production.xcconfig (dead flag)
4. Delete `ACHPaymentService.swift` (dead code)
5. Verify ASC privacy labels match actual SDK data collection
6. Fill "What's New" text in ASC
7. Set privacy URL in version localization

### iOS Restaurant Screenshots + Submit
- Build 206 on TestFlight has ALL fixes (combo, bestseller, seeding, recommendations)
- Minimum: iPhone 6.7" display screenshots
- Key screens: Dashboard, Menu (with combo badge), Orders, AI Tab, Settings, Promotions

### iOS Driver App — Prepare + Submit
- Demo: demo.driver@dollor.ai / DemoDriver2025!
- State: PREPARE_FOR_SUBMISSION

---

## Current Build Versions (Updated Mar 13, 2026)

| Platform | App | Build | Version | Distribution |
|----------|-----|-------|---------|-------------|
| iOS | Customer | 1114 | 1.1 | TestFlight Mar 13 |
| iOS | Driver | 216 | 1.1 | TestFlight Mar 13 |
| iOS | Restaurant | 206 | 1.1 | TestFlight Mar 13 |
| Android | Customer | vC=38 | 1.0.37 | Firebase Mar 11 |
| Android | Driver | vC=33 | 1.0.32 | Firebase Mar 6 |
| Android | Partner | vC=33 | 1.0.32 | Firebase Mar 11 |

---

## Suggested Session Flow

```
/gsd:resume-work
→ PRIORITY 0: /gsd:debug "SSL cert unsafe connection"
  → Run openssl checks, verify ACM, fix cert if expired
  → If root CA changed: update SSL pins in NetworkSecurity.swift
→ PRIORITY 1: /gsd:debug "Stripe payment not working demo account"
  → Run anti-hallucination curl commands
  → Fix payment flow
  → Verify order completion end-to-end
→ Deploy backend if any fixes needed
→ PRIORITY 2: Rebuild iOS apps → TestFlight
→ PRIORITY 3: Test combo + bestseller on device
→ PRIORITY 4: Apple cleanup + screenshots if time permits
```
