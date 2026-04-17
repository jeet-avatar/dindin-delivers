---
source: Oracle NetSuite Official Documentation — Revenue Recognition Accounting Process
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Revenue Recognition — Accounting Process

## Overview

This document covers the accounting entries created by NetSuite's revenue recognition
process, focusing on the GL impact at each stage. For ARM configuration, see
`feature-revenue-recognition.md`.

Revenue recognition follows accounting standards (ASC 606 / IFRS 15):
revenue is recognized when (or as) performance obligations are satisfied.

---

## The Two Key Accounts

| Account Type        | Account Name Example      | Balance Sheet Effect   |
|---------------------|---------------------------|------------------------|
| Deferred Revenue    | "Deferred Revenue"        | Liability (credit)     |
| Recognized Revenue  | "Software License Revenue"| Income Statement (credit)|

---

## Stage 1: Invoice Creation (Billing Event)

When an invoice is created for a subscription/service:

**Before recognition happens:**
```
DR  Accounts Receivable        $12,000
CR  Deferred Revenue           $12,000   ← Revenue not yet earned
```

The revenue is NOT recognized at invoice time — it is deferred until earned.

---

## Stage 2: Recognition Event Triggers

Depending on the rule type, recognition occurs:

### Time-Based Recognition (Monthly Ratable)

On each month-end close run:
```
DR  Deferred Revenue           $1,000    ← Move from deferred
CR  Software License Revenue   $1,000    ← Now recognized
```

For a $12,000 annual subscription: $1,000/month for 12 months.

### Event-Based Recognition (Delivery)

When the delivery event fires (e.g., Item Fulfillment shipped):
```
DR  Deferred Revenue           $12,000
CR  Software License Revenue   $12,000
```

Full amount recognized on delivery.

### Milestone-Based

When project milestone is marked complete:
```
DR  Deferred Revenue           $3,000    ← 25% milestone
CR  Professional Services Revenue $3,000
```

---

## Stage 3: Payment Receipt

When customer pays:
```
DR  Bank Account               $12,000
CR  Accounts Receivable        $12,000
```

Payment does NOT affect revenue recognition — it only affects AR/Cash.

---

## Balance Sheet Impact Over Time

For a $12,000 annual subscription starting Jan 1:

| Date    | Deferred Revenue | Revenue Recognized | Cumulative |
|---------|-------------------|-------------------|------------|
| Jan 1   | $12,000           | $0                | $0         |
| Jan 31  | $11,000           | $1,000            | $1,000     |
| Feb 28  | $10,000           | $1,000            | $2,000     |
| ...     | ...               | $1,000/mo         | ...        |
| Dec 31  | $0                | $1,000            | $12,000    |

---

## Revenue Recognition in NetSuite (Process Steps)

### 1. Setup

Navigate: Setup > Accounting > Revenue Recognition Rules > New

Create rule:
- Name: "Annual Subscription - Monthly Ratable"
- Recognition Rule: Time-Based
- Method: Straight Line
- Frequency: Monthly

### 2. Attach Rule to Invoice Line

On the invoice line:
- `revRecStartDate`: Jan 1, 2024
- `revRecEndDate`: Dec 31, 2024
- `revenueRecognitionRule`: ID of the monthly ratable rule

### 3. Run Recognition

Navigate: Transactions > Financial > Run Revenue Recognition
- Select date range: January 1 - January 31
- Click "Preview" to see JEs before posting
- Click "Run" to post

### 4. View Revenue Arrangements

Navigate: Transactions > Financial > Revenue Arrangements
- Shows all arrangements and their schedules
- Progress: $1,000 recognized of $12,000 total
- Status: In Progress

---

## Multi-Element Arrangements (VSOE)

When selling bundles (software + maintenance + training):

1. Each element has a Standalone Selling Price (SSP / VSOE)
2. Total bundle price is allocated proportionally:
   - Software SSP: $8,000 → Recognized on delivery
   - Maintenance SSP: $3,000 → Ratable over 1 year
   - Training SSP: $1,000 → Recognized when training delivered

3. ARM creates separate schedules per element

---

## Revenue Recognition Adjustment

If a customer cancels mid-period:
1. Create a Credit Memo for the unearned portion
2. Revenue arrangement is updated — remaining recognition schedule removed
3. Deferred Revenue is reduced by the credited amount

---

## Deferred Revenue Report

**Navigation:** Reports > Financial > Deferred Revenue Schedule

Shows:
- By customer / by arrangement / by period
- Opening deferred revenue balance
- New deferrals this period
- Recognized this period
- Closing deferred revenue balance

---

## Revenue Recognition SuiteQL

```sql
-- Deferred revenue by customer
SELECT c.companyName, SUM(t.total - t.recognizedrevenue) AS deferredAmount
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE t.type = 'CustInvc'
  AND (t.total - t.recognizedrevenue) > 0
GROUP BY c.companyName
ORDER BY deferredAmount DESC
```
