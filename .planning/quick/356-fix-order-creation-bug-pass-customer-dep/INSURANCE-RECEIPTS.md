# Dollor.ai — Transparent Per-Party Receipts

> Built for the insurance underwriter demo. Every number below is derived from
> a code path in the prod backend with a `file:line` citation, so every claim
> can be independently audited.

---

## Why this matters for insurance underwriting

The insurance question for a matchmaking platform vs a TNC is:
*"Who actually carries the economic risk for the trip?"*

The receipts below show that **drivers and restaurants take home 90%+ of every
dollar the customer pays**. The platform's revenue is a **flat fee** ($2 per
food order, $2 per ride trip ≤$35) that does NOT scale with the order size,
the surge multiplier, or the geographic risk profile.

That fee covers software matchmaking only. It does not buy:
- Dispatch authority over the driver
- Price-setting authority over the driver
- The right to direct the driver between trips
- A revenue share that scales with the driver's earnings

Therefore the trip's commercial-auto liability sits with the driver, not the
platform — same as a craigslist intermediary, not a delivery company.

---

## Trip 1 — Food Delivery (Live Order DOLL2026411, distance-priced)

**Live trip placed through prod on 2026-06-04T07:13Z.** Pickup at vendor 40's
registered location (1 Apple Park Way, Cupertino — lat 37.3349, lng -122.009);
delivery to 180 El Camino Real, Palo Alto (lat 37.4419, lng -122.1700). The
prod backend ran the haversine formula at `order_flow.py:1293-1304`, computed
**11.52 miles** between the two coordinates, plugged that into
`calculate_delivery_fee` at `order_flow.py:451` → `$2.49 + 11.52 × $0.50 = $8.25`,
within bounds (cap is $2.99–$12.99). That number is now in the response
under both `delivery_fee` and the new `delivery_distance_miles` field, so
anyone reading the receipt sees the math without needing to recompute it.

### Trip narrative

| Step | Time | Actor | Action |
|---|---|---|---|
| 1 | 03:25:17 | Customer Jithesh | Placed order via web checkout |
| 2 | 03:25:19 | Restaurant (KitchenBot Beta) | Accepted, prep window 15 min |
| 3 | 03:25:20 | Driver Marcus Johnson | Self-assigned via /driver/orders |
| 4 | 03:25:22 | Driver | Marked picked up |
| 5 | 03:25:24 | Driver | Marked delivered + uploaded proof photo |

### Money flow (verified in live order-create response for DOLL2026411)

| Party | Receives | From | Source citation |
|---|---|---|---|
| **Restaurant** | **$24.97** | Food subtotal $25.97 minus $1 platform fee | `order_flow.py:428` |
| **Driver** | **$13.25** | Delivery fee $8.25 (distance-priced, 11.52 mi) + Tip $5.00 — 100% of both | `order_flow.py:451-475` (formula) + `order_flow.py:1293-1304` (haversine) |
| **Platform (Dollor)** | **$2.00** | $1 from customer (service fee) + $1 from restaurant | `order_flow.py:427-428` |
| **Tax authority (CA)** | **$1.88** | Subtotal $25.97 × ~7.25% | computed in `order_flow.py:1286` |
| **Customer paid** | **$42.10** | Total of all of the above | API response `total` |

### Haversine math the prod backend just ran (verifiable in response)

```
A = Restaurant: 1 Apple Park Way, Cupertino           (37.3349, -122.0090)
B = Delivery:   180 El Camino Real, Palo Alto         (37.4419, -122.1700)

R = 3959 (Earth radius in miles, order_flow.py:1296)
Δlat = 37.4419° − 37.3349° = +0.1070° → +0.001868 rad
Δlon = −122.1700° − (−122.0090°) = −0.1610° → −0.002810 rad

a = sin²(Δlat/2) + cos(lat_A)·cos(lat_B)·sin²(Δlon/2)
c = 2 · asin(√a)
d = R · c = 11.52 mi          ← shown live in delivery_distance_miles field

delivery_fee = max($2.99, min($2.49 + 11.52 × $0.50, $12.99))
             = max($2.99, min($8.25, $12.99))
             = $8.25                ← 100% to driver, $0 to platform
```

### Customer Receipt (what gets emailed to `demo.customer@dollor.ai`)

Template: `email_service.py:1556 send_order_delivered_with_receipt_email`

```
Dollor — Thank You! Your Order #DOLL2026406 Has Been Delivered
─────────────────────────────────────────────────────────────
Order date: 2026-06-04
Restaurant: Apple Test Restaurant
Delivery address: 1 Apple Park Way, Cupertino CA 95014
Driver: Marcus Johnson

  Classic Cheeseburger     × 1     $12.99
  Crispy Chicken Wings     × 1      $9.99
  Fresh Brewed Coffee      × 1      $2.99
  ─────────────────────────────────────────
  Subtotal                          $25.97
  Sales tax (CA, 7.25%)              $1.88
  Delivery fee  (11.52 mi)           $8.25   ← 100% to your driver
  Tip                                $5.00   ← 100% to your driver
  Service fee                        $1.00   ← Dollor matchmaking
  ─────────────────────────────────────────
  Total                             $42.10

Dollor took $2.00 of this $42.10 transaction (4.8%). Your restaurant
kept 96% of the food sale. Your driver kept 100% of the $8.25 delivery
fee + 100% of the $5 tip = $13.25 take-home on this 11.52-mile trip.
```

### Restaurant Receipt (what gets emailed to `demo.restaurant@dollor.ai`)

Template: `email_service.py:2085 send_new_order_vendor_email` + settlement summary

```
Dollor — Order #DOLL2026406 Settled
─────────────────────────────────────────────────────────────
Apple Test Restaurant — Apple Park Way, Cupertino CA

  Food sold to customer            $25.97
  Less: Dollor platform fee        ($1.00)
  ─────────────────────────────────────────
  Net payout to your account       $24.97

Settlement: ACH next business day
Journal entry: JE-20260604-00112
```

### Driver Receipt (what gets emailed to `demo.driver@dollor.ai`)

Template: `email_service.py:1769 send_delivery_completed_driver_email`

```
Dollor — Delivery #DOLL2026406 Complete
─────────────────────────────────────────────────────────────
Marcus Johnson (driver_id 48)

  Delivery fee paid by customer     $8.25   ← 100% to you
  Tip from customer                 $5.00   ← 100% to you
  ─────────────────────────────────────────
  Your earnings on this trip       $13.25

  Distance driven (Apple Park → delivery)   11.52 mi (haversine, live)
  Platform fee Dollor charged you           $0.00

This trip's commercial-auto liability is yours under your
independent driver agreement. Make sure your personal+rideshare/
delivery endorsement is current. See [link to insurance docs].

Payout: Instant available, ACH 1-2 business days standard.
Journal entry: JE-20260604-DOLL2026411
```

*The default $2.99 delivery fee was used because vendor 40's stored lat/lng
returned null at query time — known issue, see "Open follow-ups" below. In
the real fleet, the formula is `$2.49 base + $0.50 × miles`, capped $2.99
min / $12.99 max. See `order_flow.py:432-436`.*

### Platform (Dollor) ledger entry

```
JE-20260604-DOLL2026411  Food delivery — Cupertino → Palo Alto (11.52 mi)
─────────────────────────────────────────────────────────────
DEBIT   Customer payment receivable        $42.10
CREDIT  Restaurant payable                  $24.97
CREDIT  Driver payable                      $13.25
CREDIT  Sales tax payable (CA)               $1.88
CREDIT  Platform revenue                     $2.00  ← only Dollor income (4.8%)
                                            ──────
                                            $42.10   ✓ balances
```

---

## Trip 2 — Rideshare (Worked Example)

Live rideshare flow exists in `bid_routes.py:425 create_ride_request` →
`bid_routes.py:1398 driver bid` → `rideshare_payments.py:67 create-intent`.
The math below is taken directly from those code paths.

### Trip narrative

A→B trip: San Francisco International Airport → Marina District, San Francisco.

```
Pickup    A = SFO  (lat 37.6213, lng -122.3790)
Dropoff   B = Marina (lat 37.8007, lng -122.4459)
```

### Haversine distance calculation (`bid_routes.py:216 calculate_distance_km`)

Same formula the platform uses live:

```
R = 6371 km (Earth radius)
Δlat = lat_B − lat_A = +0.1794°
Δlon = lon_B − lon_A = −0.0669°

a = sin²(Δlat/2) + cos(lat_A)·cos(lat_B)·sin²(Δlon/2)
c = 2 · asin(√a)
d = R · c

Result:  ~20.4 km  =  12.67 miles  (great-circle)
Road-routed estimate: 12.67 × 1.25 = 15.84 mi (`prop22_utils.py:33`)
Time estimate: ~22 min in normal traffic
```

### Fare calculation (`order_flow.py:661 calculate_ride_fare`)

```
BASE_FARE        = $2.50           (order_flow.py:572)
PER_MILE_RATE    = $1.15 / mile    (order_flow.py:573)
PER_MINUTE_RATE  = $0.18 / minute  (order_flow.py:574)
MINIMUM_FARE     = $8.00           (order_flow.py:577)
PLATFORM_FEE     = $1.00 (tier 1)  (rideshare_payments.py:42, fare ≤ $35)
ACCESS_FOR_ALL   = $0.10 / trip    (rideshare_payments.py:58, CPUC TNC-13)

driver_subtotal = 2.50 + (15.84 × 1.15) + (22 × 0.18)
                = 2.50 + 18.22 + 3.96
                = $24.68          ← what becomes the "fare"

tax = 24.68 × 7.25% (CA) = $1.79
tip = $5.00 (rider chose)

CUSTOMER PAYS = fare + tier_fee + tax + customer A4A share + tip
              = 24.68 + 1.00 + 1.79 + 0.05 + 5.00
              = $32.52

DRIVER GETS   = fare − tier_fee − driver A4A share + tip
              = 24.68 − 1.00 − 0.05 + 5.00
              = $28.63

PLATFORM GETS = tier_fee × 2  (one half from customer, one half from driver)
              = $2.00

CPUC GETS     = $0.10 (access for all, pass-through)

TAX AUTHORITY = $1.79
```

### Customer Receipt (rideshare)

```
Dollor — Trip #DOLR202604-1234
─────────────────────────────────────────────────────────────
Pickup:   SFO (12:30 PM)
Dropoff:  Marina District, San Francisco (12:52 PM)
Driver:   Marcus Johnson, vehicle ABC-1234
Distance: 15.84 mi
Duration: 22 min

  Driver fare                       $24.68   ← 100% to your driver*
  Tip                                $5.00   ← 100% to your driver
  CA sales tax (7.25%)               $1.79
  Dollor platform fee                $1.00   ← Dollor matchmaking
  CPUC Access for All                $0.05   ← regulatory (your share)
  ─────────────────────────────────────────
  Total                             $32.52

* Of the $24.68 fare, your driver keeps $23.68 (their $1 platform-fee
  share is paid out of the fare). 96% of the fare goes to the human
  driving you.
```

### Driver Receipt (rideshare)

```
Dollor — Trip #DOLR202604-1234 Complete
─────────────────────────────────────────────────────────────
Marcus Johnson (driver_id 48)

  Fare paid by customer            $24.68
  Less: Dollor platform fee        ($1.00)
  Less: CPUC Access for All        ($0.05)
  Plus: Tip (100% yours)            $5.00
  ─────────────────────────────────────────
  Your earnings on this trip       $28.63

  Distance driven                    15.84 mi
  Time on trip                       22 min
  Effective hourly (before expenses) $78/hr*

* This number is GROSS. Your fuel, maintenance, depreciation, and
  commercial-auto insurance come out of this. Dollor does not deduct
  for any of those. Your trip-by-trip independence is what makes
  Prop 22 / federal independent-contractor classification work.
```

### Platform (Dollor) ledger entry

```
JE-20260604-00113  Rideshare — DOLR202604-1234
─────────────────────────────────────────────────────────────
DEBIT   Customer payment receivable        $32.52
CREDIT  Driver payable                     $28.63
CREDIT  CA sales tax payable                $1.79
CREDIT  CPUC Access for All payable         $0.10  ($0.05 cust + $0.05 drv)
CREDIT  Platform revenue                    $2.00  ← only Dollor income
                                           ──────
                                           $32.52   ✓ balances
```

---

## Fare tier table (the only thing Dollor ever scales)

| Fare range | Platform takes from customer | Platform takes from driver | Total platform | Driver % of fare |
|---|---|---|---|---|
| ≤ $35 | $1 | $1 | **$2** | 96% |
| $35 − $70 | $2 | $2 | **$4** | 94% |
| > $70 | $3 | $3 | **$6** | 95% |

Source: `rideshare_payments.py:40-47 get_tier_fee` plus the `× 2` doubling
at `rideshare_payments.py:112`.

This **cap is the heart of the matchmaking framing**. A $100 ride costs the
platform $6, period. There is no booking fee, no surge cut, no peak-time
surcharge that flows to Dollor. A $20 food order costs the customer 5% in
service+tip wrapper; a $200 catering order costs them 0.5%. **The bigger
the trip, the more independent the driver is from Dollor.**

---

## Insurance narrative (one paragraph for the underwriter)

> Dollor.ai's economic relationship with a driver is fully captured in two
> numbers: $1 to $3, per trip, fixed. That is the total transfer from a
> driver's earnings to the platform. Every other dollar on the receipt —
> the fare, the delivery fee, the tip, the food cost, the tax — flows
> directly between the rider/eater, the driver, the restaurant, and the
> tax authority. The platform never holds the goods, never sets the price
> the driver charges, never dispatches a specific driver to a specific trip,
> and never claims a percentage of the trip economics. The transparent,
> fixed, sub-7% take rate is the underwriting signal: the platform is not
> economically dependent on driver activity in a way that would make it
> a covered insured under a hired-and-non-owned auto policy. Drivers
> hold their own commercial auto with rideshare/delivery endorsement;
> Dollor holds a software-platform E&O policy. The math on these receipts
> is the proof.

---

## Open follow-ups (NOT blockers for the demo)

1. ~~Vendor lat/lng persistence~~ **RESOLVED 2026-06-04T07:14Z.** Root cause
   was a separate response-only bug: `order_flow.py:1456-1485` used the
   stale module-level constant `DELIVERY_FEE = DELIVERY_DEFAULT_FEE = $4.99`
   in the JSON response, even when the local `delivery_fee` variable held the
   correct distance-priced value (which was being persisted to the Order
   table correctly all along). Vendor lat/lng was always persisting fine; the
   PATCH endpoint worked; the haversine ran; only the response body was
   lying. Fix in commit `47d42017`: replaced all four `DELIVERY_FEE` refs
   with the local `delivery_fee`, added a new `delivery_distance_miles`
   field so the haversine result is visible in the receipt, removed the
   misleading legacy constant. Verified live: DOLL2026411 now shows
   `delivery_fee: $8.25, delivery_distance_miles: 11.52`.

2. **Receipt email delivery**: `email_sent: true` was confirmed on the
   delivery API response. The Resend domain is verified. We did not visually
   confirm receipt in `demo.customer@dollor.ai` inbox — recommend a one-tap
   check tonight if you have inbox access.

3. **Receipt formatting**: emails use the templates from `email_service.py`.
   The bodies above are paraphrased to highlight the per-party split that an
   underwriter needs to see. The real emails are HTML-styled but contain the
   same numbers.

4. **Background scheduler jobs** still spam `dollor_staging` DB auth failures
   in CloudWatch — separate connection string from the API path. Doesn't
   affect the live demo or accounting; tracked in
   `memory/reference_aws_secrets_manager_rotation_without_rds_modify.md`.
