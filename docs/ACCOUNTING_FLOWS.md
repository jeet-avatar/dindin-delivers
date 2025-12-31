# DOLLOR.AI - ACCOUNTING FLOWS & JOURNAL ENTRIES
## Matchmaking Service Financial Operations (Phase 1)

> **Document Version**: 1.0
> **Last Updated**: December 16, 2025
> **Business Model**: Matchmaking Service (NOT delivery company)
> **Accounting Basis**: Accrual

---

## CRITICAL: MATCHMAKING SERVICE ACCOUNTING

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MATCHMAKING SERVICE REVENUE RECOGNITION                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  KEY PRINCIPLE:                                                                  │
│  We are a MATCHMAKING SERVICE, not a delivery company.                          │
│  We do NOT take possession of goods or provide delivery services.               │
│                                                                                  │
│  REVENUE RECOGNITION (ASC 606):                                                 │
│  • We recognize revenue for MATCHMAKING FEES only                               │
│  • Food/ride costs are PASS-THROUGH (not our revenue)                          │
│  • Driver delivery fees are PASS-THROUGH (not our revenue)                      │
│  • Tips are PASS-THROUGH (100% to driver)                                       │
│                                                                                  │
│  WHAT IS OUR REVENUE:                                                           │
│  ✓ Customer matchmaking fee: $1.00 per order/ride                              │
│  ✓ Restaurant platform fee: $1.00 per order                                    │
│  ✓ Driver platform fee: $1.00 per ride (rideshare only)                        │
│                                                                                  │
│  WHAT IS NOT OUR REVENUE:                                                       │
│  ✗ Food cost (belongs to restaurant)                                           │
│  ✗ Delivery fee (belongs to driver)                                            │
│  ✗ Ride fare (belongs to driver)                                               │
│  ✗ Tips (belongs to driver/restaurant)                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## CHART OF ACCOUNTS

### Assets (1xxx)
| Account | Code | Description |
|---------|------|-------------|
| Cash - Operating | 1010 | Main operating bank account |
| Cash - Stripe Balance | 1020 | Funds held in Stripe |
| Cash - Payouts Pending | 1030 | Funds awaiting payout |
| Accounts Receivable | 1100 | Amounts owed by customers |
| Stripe Receivable | 1110 | Pending Stripe transfers |
| Prepaid Expenses | 1200 | Prepaid costs |

### Liabilities (2xxx)
| Account | Code | Description |
|---------|------|-------------|
| Accounts Payable - Drivers | 2010 | Amounts owed to drivers |
| Accounts Payable - Restaurants | 2020 | Amounts owed to restaurants |
| Customer Deposits | 2030 | Prepaid customer credits |
| Accrued Refunds | 2040 | Estimated refund liability |
| Sales Tax Payable | 2050 | Collected sales tax |
| Stripe Fees Payable | 2060 | Accrued Stripe fees |

### Equity (3xxx)
| Account | Code | Description |
|---------|------|-------------|
| Retained Earnings | 3010 | Accumulated profits |
| Current Year Earnings | 3020 | Current period P&L |

### Revenue (4xxx)
| Account | Code | Description |
|---------|------|-------------|
| Platform Fee Revenue - Customer | 4010 | $1 matchmaking fee from customers |
| Platform Fee Revenue - Restaurant | 4020 | $1 platform fee from restaurants |
| Platform Fee Revenue - Driver | 4030 | $1 fee from drivers (rideshare) |
| Promotional Revenue | 4040 | Sponsored listings, ads |

### Expenses (5xxx)
| Account | Code | Description |
|---------|------|-------------|
| Payment Processing Fees | 5010 | Stripe fees (2.9% + $0.30) |
| Refund Expense | 5020 | Platform-absorbed refunds |
| Customer Credits Expense | 5030 | Promotional credits issued |
| Server & Hosting | 5040 | AWS, infrastructure costs |
| Customer Support | 5050 | Support operations |
| Marketing | 5060 | Customer acquisition |

---

## FOOD DELIVERY FLOWS

### Flow 1: Standard Food Delivery Order

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    FOOD DELIVERY ORDER FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Customer places order:                                                          │
│  ├── Food subtotal: $45.00                                                      │
│  ├── Delivery fee (to driver): $5.99                                            │
│  ├── Platform matchmaking fee: $1.00                                            │
│  ├── Tax: $3.60                                                                 │
│  ├── Tip (to driver): $5.00                                                     │
│  └── TOTAL CHARGED: $60.59                                                      │
│                                                                                  │
│  Money distribution:                                                             │
│  ├── Restaurant receives: $45.00 - $1.00 fee - Stripe fees = $42.45            │
│  ├── Driver receives: $5.99 + $5.00 tip = $10.99                               │
│  ├── Platform revenue: $1.00 (customer) + $1.00 (restaurant) = $2.00           │
│  ├── Tax collected: $3.60 (remitted to government)                             │
│  └── Stripe fees: ~$2.06 (2.9% + $0.30)                                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Journal Entry: Order Placed (Payment Captured)

```
Date: [Order Date]
Reference: ORD-12345
Description: Food delivery order - Customer payment captured

DEBIT:
  1020 Cash - Stripe Balance              $60.59

CREDIT:
  2020 Accounts Payable - Restaurants     $45.00  (food cost)
  2010 Accounts Payable - Drivers         $10.99  (delivery + tip)
  2050 Sales Tax Payable                   $3.60  (tax collected)
  4010 Platform Fee Revenue - Customer     $1.00  (our revenue)

---

Date: [Order Date]
Reference: ORD-12345-FEE
Description: Restaurant platform fee recognition

DEBIT:
  2020 Accounts Payable - Restaurants      $1.00

CREDIT:
  4020 Platform Fee Revenue - Restaurant   $1.00  (our revenue)

---

Date: [Order Date]
Reference: ORD-12345-STRIPE
Description: Stripe payment processing fee

DEBIT:
  5010 Payment Processing Fees             $2.06

CREDIT:
  1020 Cash - Stripe Balance               $2.06
```

#### Journal Entry: Driver Payout

```
Date: [Payout Date]
Reference: PAY-DRV-789
Description: Weekly driver payout

DEBIT:
  2010 Accounts Payable - Drivers        $500.00  (accumulated earnings)

CREDIT:
  1010 Cash - Operating                  $500.00
```

#### Journal Entry: Restaurant Payout

```
Date: [Payout Date]
Reference: PAY-REST-456
Description: Weekly restaurant payout

DEBIT:
  2020 Accounts Payable - Restaurants   $2,000.00  (accumulated, net of fees)

CREDIT:
  1010 Cash - Operating                 $2,000.00
```

---

### Flow 2: Order with Refund (Customer Issue)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    REFUND FLOW - MISSING ITEM                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Original order: $60.59 (same as Flow 1)                                        │
│                                                                                  │
│  Issue: Missing $12 item                                                        │
│                                                                                  │
│  Refund breakdown:                                                              │
│  ├── Item refund to customer: $12.00                                           │
│  ├── Tax refund: $0.96                                                         │
│  └── TOTAL REFUND: $12.96                                                      │
│                                                                                  │
│  Who bears the cost?                                                            │
│  ├── Restaurant fault (forgot item): Restaurant                                │
│  ├── Driver fault (lost item): Driver (rare)                                   │
│  ├── Platform fault (system error): Platform                                   │
│  └── Unknown: Platform absorbs (goodwill)                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Journal Entry: Refund - Restaurant Fault

```
Date: [Refund Date]
Reference: REF-12345-A
Description: Refund for missing item - Restaurant fault

DEBIT:
  2020 Accounts Payable - Restaurants     $12.00  (reduce restaurant payout)
  2050 Sales Tax Payable                   $0.96  (reverse tax)

CREDIT:
  1020 Cash - Stripe Balance              $12.96  (refund to customer)
```

#### Journal Entry: Refund - Platform Absorbs (Goodwill)

```
Date: [Refund Date]
Reference: REF-12345-B
Description: Refund for missing item - Platform goodwill

DEBIT:
  5020 Refund Expense                     $12.00  (platform cost)
  2050 Sales Tax Payable                   $0.96  (reverse tax)

CREDIT:
  1020 Cash - Stripe Balance              $12.96  (refund to customer)
```

---

### Flow 3: Full Order Cancellation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ORDER CANCELLATION SCENARIOS                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SCENARIO A: Customer cancels before restaurant accepts                         │
│  ├── Full refund to customer                                                   │
│  ├── No charges to anyone                                                      │
│  └── Platform fee refunded                                                     │
│                                                                                  │
│  SCENARIO B: Customer cancels after restaurant starts                          │
│  ├── Customer charged: Food prep cost (varies)                                │
│  ├── Restaurant receives: Prep cost - fee                                     │
│  ├── Driver: $0 (not yet assigned)                                            │
│  └── Platform: May waive fee as goodwill                                      │
│                                                                                  │
│  SCENARIO C: Restaurant cancels                                                │
│  ├── Full refund to customer                                                   │
│  ├── Restaurant may be penalized (repeated cancellations)                     │
│  └── Platform fee refunded                                                     │
│                                                                                  │
│  SCENARIO D: Driver cancels after pickup                                       │
│  ├── Reassign to another driver                                               │
│  ├── If no driver available: Full refund + credits                           │
│  └── Original driver may be penalized                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Journal Entry: Full Cancellation (Before Restaurant Accepts)

```
Date: [Cancel Date]
Reference: CAN-12345
Description: Order cancelled - before restaurant acceptance

DEBIT:
  4010 Platform Fee Revenue - Customer     $1.00  (reverse revenue)
  2050 Sales Tax Payable                   $3.60  (reverse tax)
  2020 Accounts Payable - Restaurants     $45.00  (reverse payable)
  2010 Accounts Payable - Drivers         $10.99  (reverse payable)

CREDIT:
  1020 Cash - Stripe Balance              $60.59  (full refund)
```

---

## RIDESHARE FLOWS

### Flow 4: Standard Ride

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RIDESHARE RIDE FLOW                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Rider requests ride:                                                           │
│  ├── Base fare: $5.00                                                          │
│  ├── Distance (8.3 mi × $1.50): $12.45                                         │
│  ├── Time (20 min × $0.175): $3.50                                             │
│  ├── Platform matchmaking fee: $1.00                                           │
│  ├── Booking fee: $0.00 (included in platform fee)                             │
│  ├── Tax: $1.76                                                                │
│  ├── Tip (to driver): $4.00                                                    │
│  └── TOTAL CHARGED: $27.71                                                     │
│                                                                                  │
│  Money distribution:                                                             │
│  ├── Driver receives: $20.95 - $1.00 fee + $4.00 tip = $23.95                 │
│  ├── Platform revenue: $1.00 (rider) + $1.00 (driver) = $2.00                 │
│  ├── Tax collected: $1.76 (remitted to government)                             │
│  └── Stripe fees: ~$1.10 (2.9% + $0.30)                                        │
│                                                                                  │
│  Note: Unlike competitors (Uber takes 25%), we take flat $2                    │
│  Driver keeps ~86% of fare (vs ~75% at Uber)                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Journal Entry: Ride Completed

```
Date: [Ride Date]
Reference: RIDE-67890
Description: Rideshare ride completed - Payment captured

DEBIT:
  1020 Cash - Stripe Balance              $27.71

CREDIT:
  2010 Accounts Payable - Drivers         $23.95  (fare - fee + tip)
  2050 Sales Tax Payable                   $1.76  (tax collected)
  4010 Platform Fee Revenue - Customer     $1.00  (rider fee - our revenue)
  4030 Platform Fee Revenue - Driver       $1.00  (driver fee - our revenue)

---

Date: [Ride Date]
Reference: RIDE-67890-STRIPE
Description: Stripe payment processing fee

DEBIT:
  5010 Payment Processing Fees             $1.10

CREDIT:
  1020 Cash - Stripe Balance               $1.10
```

### Flow 5: Ride Cancellation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RIDE CANCELLATION SCENARIOS                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SCENARIO A: Rider cancels within 2 minutes of request                         │
│  ├── Full refund                                                               │
│  ├── No cancellation fee                                                       │
│  └── Driver: $0                                                                │
│                                                                                  │
│  SCENARIO B: Rider cancels after 2 minutes / driver en route                   │
│  ├── Cancellation fee: $5.00                                                   │
│  ├── Driver receives: $5.00 (compensation)                                     │
│  └── Platform: $0 (no platform fee on cancellation)                           │
│                                                                                  │
│  SCENARIO C: Driver cancels                                                    │
│  ├── No charge to rider                                                        │
│  ├── Auto-rematch to another driver                                           │
│  └── Driver penalty: Affects acceptance rate                                  │
│                                                                                  │
│  SCENARIO D: Driver no-show (> 5 min late)                                    │
│  ├── Rider can cancel free                                                    │
│  ├── Driver penalized                                                         │
│  └── Auto-rematch offered                                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Journal Entry: Rider Cancellation with Fee

```
Date: [Cancel Date]
Reference: CAN-RIDE-123
Description: Ride cancelled by rider - cancellation fee applied

DEBIT:
  1020 Cash - Stripe Balance               $5.00

CREDIT:
  2010 Accounts Payable - Drivers          $5.00  (driver compensation)
```

---

## PROMOTIONAL & CREDITS FLOWS

### Flow 6: Customer Credit Issued

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER CREDIT SCENARIOS                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CREDIT TYPES:                                                                  │
│  ├── Refund Credit: Issue credit instead of cash refund                        │
│  ├── Promotional Credit: New user signup bonus                                 │
│  ├── Goodwill Credit: Compensation for bad experience                          │
│  ├── Referral Credit: Reward for referring friends                             │
│  └── Expiring Credit: Promotional with expiration date                         │
│                                                                                  │
│  ACCOUNTING TREATMENT:                                                          │
│  • Credit issued = Liability (we owe customer)                                 │
│  • Credit redeemed = Reduce liability, expense the cost                        │
│  • Credit expired = Reverse liability, recognize as other income               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Journal Entry: Issue Customer Credit

```
Date: [Issue Date]
Reference: CRD-001
Description: Issue $10 promotional credit to customer

DEBIT:
  5030 Customer Credits Expense           $10.00

CREDIT:
  2030 Customer Deposits                  $10.00  (liability)
```

#### Journal Entry: Customer Redeems Credit

```
Date: [Order Date]
Reference: ORD-99999
Description: Order with $10 credit applied

DEBIT:
  1020 Cash - Stripe Balance              $50.59  (total - credit)
  2030 Customer Deposits                  $10.00  (credit used)

CREDIT:
  2020 Accounts Payable - Restaurants     $45.00
  2010 Accounts Payable - Drivers         $10.99
  2050 Sales Tax Payable                   $3.60
  4010 Platform Fee Revenue - Customer     $1.00
```

#### Journal Entry: Credit Expires

```
Date: [Expiry Date]
Reference: CRD-001-EXP
Description: Unused promotional credit expired

DEBIT:
  2030 Customer Deposits                  $10.00

CREDIT:
  4040 Other Income - Expired Credits     $10.00
```

---

## TAX FLOWS

### Flow 7: Sales Tax Collection & Remittance

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    SALES TAX HANDLING                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  WHAT WE COLLECT TAX ON (varies by jurisdiction):                               │
│  ├── Food cost: Yes (most states)                                              │
│  ├── Delivery fee: Varies                                                      │
│  ├── Platform fee: Varies (usually yes)                                        │
│  ├── Tips: No                                                                  │
│  └── Rideshare fare: Varies by city/state                                      │
│                                                                                  │
│  TAX REMITTANCE:                                                                │
│  ├── Monthly filing in most jurisdictions                                      │
│  ├── Quarterly filing in smaller jurisdictions                                 │
│  ├── Annual filing where allowed                                               │
│  └── Use tax automation (TaxJar, Avalara)                                      │
│                                                                                  │
│  MATCHMAKING NOTE:                                                              │
│  As a matchmaking service, we collect tax on behalf of restaurants             │
│  and remit. We are the "marketplace facilitator" in most states.               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Journal Entry: Monthly Tax Remittance

```
Date: [15th of following month]
Reference: TAX-2025-12
Description: December sales tax remittance - California

DEBIT:
  2050 Sales Tax Payable                $15,000.00

CREDIT:
  1010 Cash - Operating                 $15,000.00
```

---

## DRIVER TAX REPORTING (1099)

### Flow 8: Annual 1099-K Generation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    1099-K REQUIREMENTS                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  WHO GETS A 1099-K:                                                             │
│  Drivers who earned > $600 in calendar year (2024 threshold)                   │
│                                                                                  │
│  WHAT'S REPORTED:                                                               │
│  ├── Gross payments (before platform fees)                                     │
│  ├── Includes delivery fees                                                    │
│  ├── Includes tips                                                             │
│  └── Does NOT include platform fee deductions                                  │
│                                                                                  │
│  TIMELINE:                                                                      │
│  ├── January 31: 1099-K sent to drivers                                        │
│  ├── January 31: 1099-K filed with IRS                                         │
│  └── Year-round: Track W-9 information                                         │
│                                                                                  │
│  DRIVER TAX DEDUCTIONS (inform drivers):                                        │
│  ├── Platform fees paid                                                        │
│  ├── Vehicle expenses (mileage)                                                │
│  ├── Phone/data plan                                                           │
│  ├── Insulated bags                                                            │
│  └── Other business expenses                                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## MONTHLY CLOSE PROCESS

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MONTH-END CLOSE CHECKLIST                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  DAY 1-2: RECONCILIATION                                                        │
│  ☐ Reconcile Stripe balance to GL                                              │
│  ☐ Reconcile bank accounts                                                     │
│  ☐ Verify all payouts processed                                                │
│  ☐ Review open A/P balances                                                    │
│                                                                                  │
│  DAY 3-4: ACCRUALS & ADJUSTMENTS                                               │
│  ☐ Accrue unbilled Stripe fees                                                 │
│  ☐ Accrue estimated refunds                                                    │
│  ☐ Review deferred revenue                                                     │
│  ☐ Record depreciation                                                         │
│                                                                                  │
│  DAY 5: REVIEW & APPROVAL                                                       │
│  ☐ Generate trial balance                                                      │
│  ☐ Review P&L vs budget                                                        │
│  ☐ Review balance sheet                                                        │
│  ☐ Investigate variances > 10%                                                 │
│                                                                                  │
│  DAY 6-7: REPORTING                                                             │
│  ☐ Generate financial statements                                               │
│  ☐ Update KPI dashboard                                                        │
│  ☐ Prepare management report                                                   │
│  ☐ Close period in system                                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## FINANCIAL REPORTS

### Daily Report

| Metric | Calculation |
|--------|-------------|
| Total Orders | Count of completed orders |
| Total Rides | Count of completed rides |
| GMV (Orders) | Sum of food subtotals |
| GMV (Rides) | Sum of ride fares |
| Platform Revenue | (Orders × $2) + (Rides × $2) |
| Refunds Issued | Sum of refunds |
| Net Revenue | Platform Revenue - Refunds |

### Monthly P&L Structure

```
DOLLOR.AI - PROFIT & LOSS
Month Ending: [Date]

REVENUE
  Platform Fees - Customer (Orders)      $XX,XXX
  Platform Fees - Restaurant             $XX,XXX
  Platform Fees - Customer (Rides)       $XX,XXX
  Platform Fees - Driver (Rides)         $XX,XXX
  Other Revenue                          $X,XXX
                                         ─────────
  TOTAL REVENUE                          $XXX,XXX

COST OF REVENUE
  Payment Processing (Stripe)            ($XX,XXX)
  Refunds Absorbed                       ($X,XXX)
  Customer Credits Issued                ($X,XXX)
                                         ─────────
  GROSS PROFIT                           $XXX,XXX
  Gross Margin                           XX.X%

OPERATING EXPENSES
  Server & Hosting                       ($XX,XXX)
  Customer Support                       ($X,XXX)
  Marketing & Acquisition                ($XX,XXX)
  General & Administrative               ($X,XXX)
                                         ─────────
  TOTAL OPERATING EXPENSES               ($XX,XXX)

NET INCOME                               $XX,XXX
Net Margin                               XX.X%
```

---

## KEY ACCOUNTING POLICIES

### Revenue Recognition (ASC 606)

| Element | Policy |
|---------|--------|
| **Performance Obligation** | Matchmaking service completed when order delivered / ride completed |
| **Transaction Price** | Fixed $1 fee per transaction per party |
| **Recognition Timing** | At point of delivery/ride completion |
| **Principal vs Agent** | We are AGENT (not principal) - report net revenue |

### Refund Accrual

| Metric | Rate | Basis |
|--------|------|-------|
| Estimated Refund Rate | 2-3% | Historical average |
| Accrual Calculation | GMV × Refund Rate × Platform Share | Monthly |
| Review Frequency | Monthly | Adjust based on actuals |

### Bad Debt (Chargebacks)

| Metric | Rate | Policy |
|--------|------|--------|
| Chargeback Rate | < 1% | Target |
| Write-off Threshold | $50 | Auto write-off below |
| Collection Period | 90 days | Before write-off |

---

## AUDIT TRAIL REQUIREMENTS

All financial transactions must include:

```
Transaction Record:
├── Transaction ID (unique)
├── Timestamp (UTC)
├── Transaction Type
├── Amount
├── Currency
├── Related Entities
│   ├── Customer ID
│   ├── Driver ID
│   ├── Restaurant ID
│   └── Order/Ride ID
├── Payment Method
├── Stripe Transaction ID
├── Status
├── Created By (system/user)
└── Modification History
```

---

## INTEGRATION POINTS

### Stripe Integration

| Event | Webhook | Action |
|-------|---------|--------|
| `payment_intent.succeeded` | Capture | Record revenue, create payables |
| `charge.refunded` | Refund | Reverse entries, update payables |
| `payout.paid` | Payout | Clear A/P, record bank movement |
| `charge.dispute.created` | Dispute | Create reserve, flag transaction |

### Accounting System Integration

```
Backend API                    Accounting System
     │                              │
     │  Order Completed             │
     ├─────────────────────────────►│ Create Journal Entry
     │                              │
     │  Refund Processed            │
     ├─────────────────────────────►│ Reversal Entry
     │                              │
     │  Payout Initiated            │
     ├─────────────────────────────►│ Clear Payable
     │                              │
     │  Daily Close                 │
     ├─────────────────────────────►│ Reconciliation Report
     │                              │
```

---

*Document End*
*For questions: Contact Accounting Bot (dollor-accounting)*
