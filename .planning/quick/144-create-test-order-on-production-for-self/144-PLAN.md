---
phase: quick
plan: 144
type: api-task
autonomous: true
---

# Quick Task 144: Create Test Order on Production for Self-Delivery Navigation Testing

## Objective
Create a test food delivery order on production (api.dollor.ai) for Apple Restaurant (vendor_id=40) so the user can test self-delivery navigation flow (Quick-142).

## Context
- Quick-142 added self-delivery navigation to the iOS Restaurant app
- Need a real order in "pending" or "confirmed" state for the restaurant to pick up and deliver
- Using demo customer credentials

## Tasks

### Task 1: Login as demo customer
- `POST https://api.dollor.ai/api/auth/customer/login` with form-encoded credentials
- Extract access_token

### Task 2: Create test order
- `POST https://api.dollor.ai/api/erp/orders/create` with auth header and order payload
- Vendor: Apple Restaurant (vendor_id=40)
- Items: Classic Cheeseburger + Onion Rings
- Delivery address: 12 Teberry, Rancho Santa Margarita, CA 92688

### Task 3: Report results
- Document order ID, order code, status, total

## Verification
- Order created successfully (HTTP 200/201)
- Order ID and code returned in response
- Order visible in restaurant dashboard

## Output
- Summary: `.planning/quick/144-create-test-order-on-production-for-self/144-SUMMARY.md`
- No code changes needed
