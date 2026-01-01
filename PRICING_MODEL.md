# Dollor.AI Platform Pricing Model

## OFFICIAL PRICING - DO NOT CHANGE

This document is the **single source of truth** for all platform fees.

---

## Food Delivery

| Party | Fee | Description |
|-------|-----|-------------|
| **Customer** | $1.00 | Flat matchmaking fee per order |
| **Restaurant** | $1.00 | Flat platform listing fee per order (deducted from payout) |
| **Driver** | $0.00 | NO fee - keeps 100% of delivery fee + 100% of tips |

**Platform Revenue per Order: $2.00**

### Order Breakdown Example
```
Food subtotal:     $25.00  → Restaurant (minus $1 fee = $24.00 net)
Tax (8%):          $2.00   → Collected for tax authority
Delivery fee:      $5.99   → 100% to Driver
Platform fee:      $1.00   → Platform revenue (from customer)
Tip:               $5.00   → 100% to Driver
─────────────────────────
Customer pays:     $38.99

Platform collects: $2.00 ($1 from customer + $1 from restaurant)
Restaurant nets:   $24.00 ($25.00 - $1.00 fee)
Driver nets:       $10.99 ($5.99 delivery + $5.00 tip)
```

---

## Rideshare (P2P)

| Distance | Customer Fee | Driver Fee | Platform Revenue |
|----------|--------------|------------|------------------|
| **Tier 1** (0-10 miles) | $1.00 | $1.00 | $2.00 |
| **Tier 2** (10-20 miles) | $2.00 | $2.00 | $4.00 |
| **Tier 3** (20+ miles) | $3.00 | $3.00 | $6.00 |

### Ride Breakdown Example (15 miles = Tier 2)
```
Base fare:         $2.50
Distance (15mi):   $17.25  (15 × $1.15/mile)
Time estimate:     $3.60   (20 min × $0.18/min)
─────────────────────────
Ride fare:         $23.35

Customer pays:     $25.35  (fare + $2 platform fee)
Driver receives:   $21.35  (fare - $2 platform fee)
Platform revenue:  $4.00   ($2 from customer + $2 from driver)

If customer tips $5:
Driver total:      $26.35  ($21.35 + $5.00 tip - driver keeps 100% of tips)
```

---

## What We Are NOT

| Wrong Assumption | Reality |
|------------------|---------|
| 15% commission | **NO** - $1 flat fee |
| 25-30% like competitors | **NO** - $1-$3 tiered |
| Variable percentage | **NO** - Fixed flat fees |
| Hidden fees | **NO** - Transparent pricing |

---

## Code Reference

When implementing fees, use these constants:

```python
# Food Delivery
CUSTOMER_PLATFORM_FEE = 1.00      # $1 from customer
RESTAURANT_PLATFORM_FEE = 1.00    # $1 from restaurant (deducted from payout)
DRIVER_PLATFORM_FEE = 0.00        # Driver pays nothing

# Rideshare - by distance tier
def get_rideshare_fee(distance_miles: float) -> float:
    if distance_miles <= 10:
        return 1.00  # Tier 1
    elif distance_miles <= 20:
        return 2.00  # Tier 2
    else:
        return 3.00  # Tier 3
```

---

## Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM REVENUE                         │
├─────────────────────────────────────────────────────────────┤
│  FOOD DELIVERY:  $2 per order ($1 customer + $1 restaurant) │
│  RIDESHARE:      $2-$6 per ride (tiered by distance)        │
├─────────────────────────────────────────────────────────────┤
│  Driver keeps:   100% of delivery fees + 100% of tips       │
│  NO percentage-based commissions                            │
└─────────────────────────────────────────────────────────────┘
```

---

*Last updated: 2025-12-31*
*This pricing model is final and should not be modified without executive approval.*
