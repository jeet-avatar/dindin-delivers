---
source: Oracle NetSuite Official Documentation — Advanced Revenue Management (ARM)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Revenue Recognition (Advanced Revenue Management — ARM)

## Overview

NetSuite's Advanced Revenue Management (ARM) module automates revenue recognition
for complex arrangements. It handles time-based recognition (ratable over a period),
event-based recognition (on delivery, project milestone), and multi-element arrangements
with VSOE allocation.

ARM is a module add-on. Basic revenue recognition is available in base NetSuite.

---

## Key Concepts

| Term                    | Description                                                        |
|-------------------------|--------------------------------------------------------------------|
| Revenue Arrangement     | Groups related revenue elements for allocation and recognition     |
| Revenue Recognition Rule| Defines HOW revenue is recognized (time-based, event-based)       |
| Deferred Revenue        | Revenue received/invoiced but not yet recognized (liability)       |
| Revenue Commitment      | A scheduled plan of future recognition entries                     |
| VSOE                    | Vendor-Specific Objective Evidence — fair value for bundle items   |
| Recognition Schedule    | The actual schedule of JEs created for future recognition          |

---

## Revenue Recognition Setup

### Enable ARM

Navigate: Setup > Company > Enable Features > Accounting tab > check "Advanced Revenue Management (ARM)"

### Configure Revenue Recognition Rules

Navigate: Setup > Accounting > Revenue Recognition > Revenue Recognition Rules > New

**Rule types:**

| Rule Type              | When Revenue Is Recognized                              |
|------------------------|---------------------------------------------------------|
| Time-Based (Straight Line) | Evenly over a date range (e.g., monthly ratable)  |
| Event-Based            | On a specific event (delivery, acceptance, milestone)   |
| Percent Complete       | Proportional to project completion percentage           |
| Usage                  | Based on actual usage quantities reported               |

---

## Transaction Line Fields for Revenue Recognition

Every line on a revenue-bearing transaction can have:

| Field                      | Description                                         |
|----------------------------|-----------------------------------------------------|
| `revRecStartDate`          | Start date for recognition schedule                 |
| `revRecEndDate`            | End date for recognition schedule                   |
| `revenueRecognitionRule`   | Which rule to apply (internal ID)                   |
| `deferrerevenue`           | Amount of deferred revenue on this line             |
| `recognizedrevenue`        | Amount already recognized from this line            |
| `vsoeallocation`           | VSOE allocated amount for bundle components         |

```javascript
define(['N/record'], function(record) {
    var invoice = record.load({ type: record.Type.INVOICE, id: 1234 });

    // Get rev rec fields on a line
    var startDate = invoice.getSublistValue({
        sublistId: 'item',
        fieldId: 'revrecstartdate',
        line: 0
    });
    var endDate = invoice.getSublistValue({
        sublistId: 'item',
        fieldId: 'revrecenddate',
        line: 0
    });
    var rule = invoice.getSublistValue({
        sublistId: 'item',
        fieldId: 'revenuerecognitionrule',
        line: 0
    });
});
```

---

## Revenue Arrangements

ARM creates a Revenue Arrangement for each invoice/order with rev rec lines.

**Navigation:** Navigate to: Transactions > Financial > Revenue Arrangements

A Revenue Arrangement contains:
- **Elements:** one per transaction line with rev rec rules
- **Recognition Schedule:** the planned JE schedule (debit Deferred Revenue, credit Revenue)
- **Status:** Open, In Progress, Closed

---

## Deferred Revenue Accounts

ARM uses two accounts:
1. **Deferred Revenue** (Liability) — revenue collected but not yet recognized
2. **Revenue** (Income) — recognized revenue

When an invoice is posted:
- DR: Accounts Receivable
- CR: **Deferred Revenue** (not revenue yet)

When recognition runs (on schedule):
- DR: **Deferred Revenue**
- CR: **Revenue** (now recognized)

---

## Recognition Schedule Journal Entries

ARM automatically creates the JE schedule based on the recognition rule:

**Example: 12-month time-based rule**
- Invoice date: Jan 1, 2024
- Amount: $12,000
- Rule: Monthly ratable over 12 months
- Result: $1,000/month for Jan-Dec 2024

Each month, ARM creates:
```
DR Deferred Revenue   $1,000
CR Revenue            $1,000
```

---

## VSOE for Bundled Sales

When selling bundles (e.g., software + maintenance + training):

1. Enable VSOE: Setup > Accounting > Accounting Preferences > check "VSOE"
2. Set VSOE fair values on each item
3. ARM allocates the total bundle price to components based on fair values

**Example:**
- Bundle price: $10,000
- Software VSOE: $8,000
- Maintenance VSOE: $2,000
- Allocation: Software $8,000 (recognized on delivery), Maintenance $2,000 (ratable over 1 year)

---

## Running the Recognition Process

**Automated:** ARM can auto-run recognition at period close.

**Manual:** Navigate to: Transactions > Financial > Run Revenue Recognition

Options:
- Run for all arrangements up to: [end date]
- Run for specific arrangement
- Preview before posting

---

## Revenue Commitments

A Revenue Commitment is a less formal recognition schedule for simpler cases.
Used when the full ARM module is not licensed.

Navigate: Transactions > Financial > Revenue Commitments > New

Fields: entity, item, amount, recognition start/end date, recognition rule.

---

## Reporting

| Report                        | Navigation                                            |
|-------------------------------|-------------------------------------------------------|
| Deferred Revenue by Period    | Reports > Financial > Deferred Revenue Schedule       |
| Revenue Arrangement Summary   | Reports > Financial > Revenue Arrangements            |
| Recognized Revenue by Period  | Reports > Financial > Recognized Revenue              |

---

## Integration with Project Milestones

For event-based recognition tied to project milestones:
1. Set rule type to "Event-Based"
2. Define trigger event: Project Task completion, custom event
3. When project task is marked complete, ARM triggers recognition for that element
