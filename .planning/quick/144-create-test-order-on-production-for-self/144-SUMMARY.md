---
phase: quick
plan: 144
subsystem: api-operations
tags: [test-order, production, self-delivery, quick-142]
key-files:
  created: []
  modified: []
decisions:
  - Used /api/erp/orders/create endpoint (verified in main_new.py)
  - Used demo customer credentials (demo.customer@dollor.ai)
  - Ordered from Apple Test Restaurant (vendor_id=40)
metrics:
  duration: 355s
  completed: 2026-03-11T01:47:48Z
---

# Quick Task 144: Create Test Order on Production for Self-Delivery Navigation Testing

**One-liner:** Created test order DOLL2026270 on production for Apple Restaurant self-delivery navigation testing (Quick-142)

## Order Details

| Field | Value |
|-------|-------|
| **Order ID** | 270 |
| **Order Number** | DOLL2026270 |
| **Status** | Pending Payment |
| **Restaurant** | Apple Test Restaurant (vendor_id=40) |
| **Customer** | Demo Customer (customer_id=74) |

### Items
| Item | Qty | Price |
|------|-----|-------|
| Classic Cheeseburger (menu_item_id=469) | 1 | $12.99 |
| Onion Rings (menu_item_id=475) | 1 | $4.99 |

### Pricing Breakdown
| Component | Amount |
|-----------|--------|
| Subtotal | $17.98 |
| Tax | $1.30 |
| Service Fee | $1.00 |
| Delivery Fee | $4.99 |
| Tip | $3.00 |
| **Total** | **$36.27** |

### Fee Distribution
| Recipient | Amount |
|-----------|--------|
| Restaurant payout | $16.98 |
| Driver receives | $7.99 (delivery fee + tip) |
| Platform revenue | $2.00 ($1 service + $1 restaurant) |
| Platform fee (restaurant) | $1.00 |

### Delivery Address
12 Teberry, Rancho Santa Margarita, CA 92688 (33.6409, -117.6031)

## Execution Steps

1. **Customer login** - POST `/api/auth/customer/login` with form-encoded credentials - 200 OK, got JWT token
2. **Order creation** - POST `/api/erp/orders/create` with auth header and JSON payload - 200 OK, order created

## Notes for Quick-142 Testing

- Order is in **"Pending Payment"** status -- the restaurant app should show this order
- To test self-delivery flow, the restaurant needs to accept the order, then choose self-delivery within the 3-minute decision window
- Vendor login: `demo.restaurant@dollor.ai` / `DemoRestaurant2025!`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- Order created on production: VERIFIED (order_id=270, order_number=DOLL2026270)
- No code changes made: VERIFIED (API-only task)
- No git commits needed for code changes
