---
quick: 356
description: Fix order creation bug — pass customer Depends through to erp_create_order; expanded scope to cover entire P2P lifecycle alias pattern
status: Verified
started: 2026-06-04T01:54Z
completed: 2026-06-04T03:28Z
duration: 1h 34min (across 2 sessions, 1 session-limit interruption)
commits:
  - 0e1c0239  # fix: order creation (initial scope)
  - 0d492a89  # fix: restaurant-accept + assign-driver + picked-up + delivered + restaurant-decline
  - 09770b61  # fix: available-for-delivery + delivery-photo + restaurant-accept-delivery + decline-delivery + complete-delivery + unassign-driver + update-status
ci_runs:
  - 26925431236  # success — Customer Cart fix
  - 26927715808  # success — lifecycle aliases (5)
  - 26928084276  # success — remaining aliases (7)
  - 26925435006  # failure (harmless) — redundant workflow_dispatch raced push trigger, ECS circuit breaker rolled back
---

# Summary

## Goal

Insurance underwriter demo tomorrow morning was blocked by HTTP 500 on every order-related endpoint. Root cause was a Depends-not-forwarded pattern across 12 alias functions in `apps/web/p2p-platform/backend/main_new.py`. Original scope was 1 endpoint (order creation). Discovered during smoke testing that the same pattern broke the entire lifecycle. Expanded scope to fix all 12 in three deploys.

## Root cause (one sentence)

Every alias function in main_new.py:15996-16075 declared a generic `_auth: dict = Depends(require_any_auth)` instead of a typed `Customer/Driver/Vendor` Depends, then called the downstream `order_flow.py` function without forwarding the typed param — so the downstream's `customer.id` / `driver.id` / `vendor.id` lookups hit an unresolved FastAPI Depends object → `AttributeError: 'Depends' object has no attribute 'id'` → HTTP 500.

## The 12 fixes (all in `apps/web/p2p-platform/backend/main_new.py`)

| Wave | Line | Alias | Required type | Status |
|------|------|-------|---------------|--------|
| 1 | 16114 | `create_order_ios_alias` | Customer | ✅ |
| 1 | 16537 | `android_create_order` | Customer | ✅ |
| 2 | 16002 | `assign_driver_alias` | _auth (positional pass) | ✅ |
| 2 | 16007 | `picked_up_alias` | Driver | ✅ |
| 2 | 16029 | `order_delivered_alias` | Driver | ✅ |
| 2 | 16048 | `restaurant_accept_alias` | Vendor | ✅ |
| 2 | 16056 | `restaurant_decline_alias` | Vendor | ✅ |
| 3 | 15997 | `get_available_orders_alias` | Driver | ✅ |
| 3 | 16012 | `complete_delivery_alias` | Driver | ✅ |
| 3 | 16017 | `unassign_driver_alias` | User (admin) | ✅ |
| 3 | 16022 | `update_order_status_alias` | User (admin) | ✅ |
| 3 | 16036 | `delivery_photo_alias` | Driver | ✅ |
| 3 | 16064 | `restaurant_accept_delivery_alias` | Vendor | ✅ |
| 3 | 16071 | `restaurant_decline_delivery_alias` | Vendor | ✅ |

No imports added. `Customer`, `Driver`, `Vendor`, `User` were already imported at main_new.py:33. `require_customer`, `require_driver`, `require_vendor`, `require_admin` already at line 34. `order_flow.py` untouched.

## E2E verification (DOLL2026406, 2026-06-04T03:25:24Z)

Walked the complete lifecycle live against prod with 3 demo accounts:

```
1. Customer place order  → 200, DOLL2026406, total $36.84
2. Vendor accept         → 200 ("KitchenBot Beta", "Ready in ~15 min")
3. Driver list           → 200, DOLL2026406 visible with status "preparing"
4. Driver assign         → 200 ("DispatchBot Gamma", "Marcus Johnson en route")
5. Driver picked-up      → 200, status "Out for Delivery"
6. Driver delivered      → 200, awaiting photo proof
7. Photo upload          → 200, FINAL status "Delivered", accounting created
```

Final accounting (JE-20260604-00112):
- Restaurant payout: $24.97
- Driver payout: $7.99 (100% of delivery + tip)
- Platform revenue: $2.00 (matches the "$1 customer + $1 restaurant" matchmaking model)
- Tax collected: $1.88
- Email confirmation: `email_sent: true`

## CR ticket

CR-0021 referenced in commit `0e1c0239`. CR API not separately verified — not load-bearing for tomorrow's demo. Best-effort fallback per ticketed-task SKILL.md.

## Out of scope (NOT fixed, documented as follow-ups)

1. **Frontend Checkout fallback**: `apps/web/p2p-platform/frontend/src/app/screens/customer/Checkout.tsx:208` shows fake success on backend error (`setOrderId(`ORD-${Date.now()}`)`). This MASKED the bug for ~2 months. Should be hardened to surface failures rather than fake success.
2. **Background scheduler jobs**: still spamming `password authentication failed for ... database "dollor_staging"` — separate connection string pointing at staging DB with old password. Distinct from the API path (which we fixed via Secrets Manager + RDS resync earlier). Functional impact: scheduler jobs (timeout cleanup, ride expiry) don't run. Same pattern as the original outage — addressable via SM rotation Lambda + dual-secret resync, see `~/.claude/projects/-Users-jeet-doordash-p2p/memory/reference_aws_secrets_manager_rotation_without_rds_modify.md`.
3. **`notification_sent: false`** in the delivery response — FCM push tokens not registering on prod. Email works fine. Push is iOS/Android native only — not relevant for browser demo tomorrow.
4. **Customer dashboard `customer_id: None` in some responses** — cosmetic; the order persists correctly with the right customer link in DB. Frontend doesn't show this field.
5. **Status string casing inconsistency**: backend returns mix of "Out for Delivery" / "pending_restaurant" / "Delivered" — works functionally but a future cleanup.

## Net change

| | Before | After |
|--|--|--|
| `/api/orders/create` | 500 | 200 |
| Full lifecycle endpoints (10 of them) | 500 or empty | 200 |
| Customer can place real order via www.dollor.ai | No (fake success) | Yes |
| Restaurant can accept | No (500) | Yes |
| Driver sees available orders | No (empty list — 500 silenced) | Yes |
| Driver can pick up + deliver | No (500) | Yes |
| Confirmation email fires | No (order never saved) | Yes |
| Accounting ledger entry created | No | Yes — full P&L per order |
| Tomorrow's underwriter demo | BLOCKED | READY |

## Demo flow that works tomorrow

Open 3 browser windows on laptop:
- `www.dollor.ai/customer/login` → `demo.customer@dollor.ai / DemoCustomer2025!`
- `www.dollor.ai/vendor/login` → `demo.restaurant@dollor.ai / DemoRestaurant2025!`
- `www.dollor.ai/driver/login` → `demo.driver@dollor.ai / DemoDriver2025!`
- Optional 4th: `www.dollor.ai/admin` → `support@dollor.ai / AdminTest123` for accounting ledger view

For Stripe checkout, use test card `4242 4242 4242 4242`, any future expiry, any CVC. Demo accounts bypass real charge via backend bypass at `main_new.py:19629`.

Walk lifecycle:
1. Customer → Restaurants → Apple Test Restaurant → add Cheeseburger + Wings + Coffee → Checkout → Place order ($36 total)
2. Vendor tab → see order → Accept
3. Driver tab → see order in Available → Accept
4. Driver → Mark Picked Up → Mark Delivered → Upload proof photo
5. Customer tab → see "Delivered" with full receipt
6. Admin tab → Orders / Accounting tab → see journal entry JE-... with $2 platform revenue line

Talking point: "Platform took $2 of a $36.84 order. Driver got 100% of tip + delivery fee. Restaurant kept 96%+ of food sale. That's matchmaking — fixed fee, transparent at every layer, full audit trail."
