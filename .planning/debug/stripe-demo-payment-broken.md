---
status: fixing
trigger: "Stripe payment not working on demo customer account on production"
created: 2026-03-12T00:00:00Z
updated: 2026-03-12T00:00:00Z
---

## Current Focus

hypothesis: recreate-customer endpoint (line 19185) sets password to "DemoCustomer2025" (no !), but login expects "DemoCustomer2025!" (with !). If recreate was called last, the hash won't match.
test: Check all demo password references in code and standardize
expecting: After fix, all demo password references use "DemoCustomer2025!" consistently
next_action: Fix the password in recreate-customer endpoint, then reset passwords on production

## Symptoms

expected: Demo customer can log in and place orders with payment bypass on production
actual: Login returns "Incorrect email or password". Password hash mismatch.
errors: {"detail":"Incorrect email or password"} from POST /api/auth/customer/login
reproduction: curl -s -X POST "https://api.dollor.ai/api/auth/customer/login" -H "Content-Type: application/x-www-form-urlencoded" -d 'username=demo.customer@dollor.ai&password=DemoCustomer2025!'
started: Unknown - demo accounts were set up previously

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-12T00:01:00Z
  checked: main_new.py:19185 recreate-customer endpoint
  found: Uses "DemoCustomer2025" (NO exclamation mark)
  implication: If this endpoint was called, the password hash won't match "DemoCustomer2025!"

- timestamp: 2026-03-12T00:02:00Z
  checked: main_new.py:19228 force-reset-passwords endpoint
  found: Uses "DemoCustomer2025!" (WITH exclamation mark)
  implication: This is the canonical password per CLAUDE.md

- timestamp: 2026-03-12T00:03:00Z
  checked: main_new.py:2121 demo-login endpoint
  found: Uses "DemoCustomer2025!" (WITH exclamation mark), also resets hash on existing customer
  implication: Consistent with force-reset, but inconsistent with recreate-customer

- timestamp: 2026-03-12T00:04:00Z
  checked: main_new.py:18228-18247 payment intent demo bypass
  found: Correctly checks customer.email against DEMO_CUSTOMER_EMAILS list
  implication: Payment bypass will work IF customer can log in and get a token

## Resolution

root_cause: Password inconsistency in recreate-customer endpoint (line 19185) uses "DemoCustomer2025" without "!" while all other endpoints and docs use "DemoCustomer2025!". If recreate-customer was the last endpoint called on production, the stored hash won't match the documented password.
fix: Standardize password to "DemoCustomer2025!" in recreate-customer endpoint. Then force-reset passwords on production.
verification: pending
files_changed:
- apps/web/p2p-platform/backend/main_new.py
