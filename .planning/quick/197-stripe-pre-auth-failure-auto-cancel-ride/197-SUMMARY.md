---
phase: quick-197
plan: "01"
subsystem: backend
tags: [rideshare, stripe, payments, notifications, bug-fix]
dependency_graph:
  requires: [bid_routes.py, models.py, order_flow.py]
  provides: [blocking-stripe-failure-path, pre-auth-auto-cancel]
  affects: [accept_bid endpoint, ride status lifecycle]
tech_stack:
  added: []
  patterns: [stripe.error.StripeError split-except, auto-cancel on payment failure]
key_files:
  modified:
    - apps/web/p2p-platform/backend/bid_routes.py
decisions:
  - "Split bare except Exception into stripe.error.StripeError (blocking) + Exception (non-blocking fallback)"
  - "Clean unmatch on StripeError: clear matched_bid_id, matched_driver_id, final_price"
  - "Notification errors wrapped in try/except so notification failure never suppresses the 402 raise"
metrics:
  duration: "~10 min"
  completed: "2026-03-18"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-197 Plan 01: Stripe Pre-Auth Failure Auto-Cancel Summary

**One-liner:** Stripe card decline during bid acceptance now auto-cancels the ride (CANCELLED + pre_auth_failed), sends push to both customer and driver, and returns HTTP 402 — replacing a silent non-blocking swallow.

## What Was Changed

### `apps/web/p2p-platform/backend/bid_routes.py`

**Function:** `accept_bid` (lines 789-840 after edit)

**Before:** Single bare `except Exception as e` caught all errors from the Stripe PaymentIntent creation block (lines 749-790). On any Stripe error, the ride stayed in `MATCHED` status with no `stripe_payment_intent_id` — permanently stuck. No notification was sent, and the API returned 200 (success) to the customer app.

**After:** Two separate except clauses:

1. `except stripe.error.StripeError as stripe_err:` — **blocking path:**
   - Logs: `"Ride {id} Stripe pre-auth FAILED ({type}): {err} — auto-cancelling"`
   - Sets `ride_request.status = RideRequestStatus.CANCELLED`
   - Sets `ride_request.cancelled_at = datetime.utcnow()`
   - Sets `ride_request.payment_status = "pre_auth_failed"`
   - Clears `ride_request.matched_bid_id = None`, `matched_driver_id = None`, `final_price = None`
   - Commits to DB
   - Sends push to customer: "Payment Failed — update your payment method"
   - Creates in-app notification for customer via `_notify_customer`
   - Sends push to driver: "Ride Cancelled — customer's payment failed"
   - Commits notifications
   - Raises `HTTPException(status_code=402, detail={"error": "payment_failed", "message": "..."})`

2. `except Exception as e:` — **non-blocking fallback (unchanged behavior):**
   - Logs the error, ride stays MATCHED (existing infra-error behavior)

## Verification Output

### Grep: stripe.error.StripeError and pre_auth_failed present
```
bid_routes.py:789:        except stripe.error.StripeError as stripe_err:
bid_routes.py:794:            ride_request.payment_status = "pre_auth_failed"
bid_routes.py:804:                    "Payment Failed",
bid_routes.py:806:                    data={"type": "payment_failed", ...}
bid_routes.py:836:                status_code=402,
bid_routes.py:837:                detail={"error": "payment_failed", "message": "..."}
```

### Grep: RideRequestStatus.CANCELLED in accept_bid block
```
bid_routes.py:792:            ride_request.status = RideRequestStatus.CANCELLED
```

### Python syntax check
```
python -m py_compile bid_routes.py && echo "syntax OK"
syntax OK
```

### Tests
Backend test suite requires `JWT_SECRET_KEY` + `DATABASE_URL` env vars not available in local context. CI/CD runs full suite on deploy. `py_compile` confirms no syntax errors.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `apps/web/p2p-platform/backend/bid_routes.py` modified (verified via Read + grep)
- [x] Commit cb567272 exists (verified via git log)
- [x] `stripe.error.StripeError` caught separately at line 789
- [x] `payment_status = "pre_auth_failed"` at line 794
- [x] `RideRequestStatus.CANCELLED` set at line 792
- [x] HTTP 402 raised at line 835-838
- [x] `except Exception as e` non-blocking fallback preserved at line 839
- [x] Python syntax: `py_compile` exits 0
