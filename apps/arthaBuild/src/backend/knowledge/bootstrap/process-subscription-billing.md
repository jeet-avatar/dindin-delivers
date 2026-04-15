---
source: Oracle NetSuite Official Documentation — Subscription Billing (SuiteBilling)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Subscription Billing (SuiteBilling)

## Overview

SuiteBilling is NetSuite's subscription management module for recurring revenue models
(SaaS, maintenance contracts, service subscriptions). It automates billing, handles
upgrades/downgrades, calculates proration, and manages contract renewals.

**License:** SuiteBilling is a separate module — must be enabled and licensed.

---

## Key Concepts

| Term                  | Description                                                    |
|-----------------------|----------------------------------------------------------------|
| Subscription Plan     | Template defining pricing, billing frequency, and items       |
| Subscription          | A customer's active subscription (instance of a plan)         |
| Subscription Line     | Each recurring item/charge within a subscription              |
| Charge Run            | The process that generates invoices for due subscription lines |
| ARR/MRR               | Annual/Monthly Recurring Revenue — calculated from active subs |
| Proration             | Partial period charges for mid-period changes                  |

---

## Subscription Plans

**Navigation:** Lists > SuiteBilling > Subscription Plans > New

**Record Type:** `record.Type.SUBSCRIPTION_PLAN`

### Key Plan Fields

| Field               | Description                                              |
|---------------------|----------------------------------------------------------|
| name                | Plan name (e.g., "Professional Monthly")                |
| billingMode         | In Advance / In Arrears                                 |
| frequency           | MONTHLY, QUARTERLY, ANNUAL, WEEKLY                      |
| defaultInitialTerm  | Commitment term in months (12, 24, etc.)                |
| autoRenewalTerm     | Renewal term after initial (often monthly)              |

### Plan Lines (items)

Each plan line defines a recurring charge:

| Field               | Description                                              |
|---------------------|----------------------------------------------------------|
| item                | Service/subscription item                                |
| recurringAmount     | Base monthly/billing-period price                       |
| chargeType          | FLAT_FEE, QUANTITY_BASED, USAGE_BASED                   |

---

## Subscriptions

**Navigation:** Lists > SuiteBilling > Subscriptions > New

**Record Type:** `record.Type.SUBSCRIPTION`

```javascript
define(['N/record'], function(record) {
    var subscription = record.create({
        type: record.Type.SUBSCRIPTION,
        isDynamic: true
    });

    subscription.setValue({ fieldId: 'customer', value: 456 });
    subscription.setValue({ fieldId: 'subscriptionplan', value: planId });
    subscription.setValue({ fieldId: 'startdate', value: new Date() });
    subscription.setValue({ fieldId: 'initialterm', value: 12 }); // 12 months
    subscription.setValue({ fieldId: 'autorenewal', value: true });
    subscription.setValue({ fieldId: 'billingschedule', value: scheduleId });

    var subscriptionId = subscription.save();
});
```

---

## Subscription Lines

Each subscription has billing lines that define specific recurring charges:

```javascript
// Add a subscription line (add-on feature)
subscription.selectNewLine({ sublistId: 'subscriptionline' });
subscription.setCurrentSublistValue({
    sublistId: 'subscriptionline',
    fieldId: 'item',
    value: 300  // Add-on service item ID
});
subscription.setCurrentSublistValue({
    sublistId: 'subscriptionline',
    fieldId: 'quantity',
    value: 5  // 5 licenses
});
subscription.setCurrentSublistValue({
    sublistId: 'subscriptionline',
    fieldId: 'startdate',
    value: new Date()
});
subscription.commitLine({ sublistId: 'subscriptionline' });
```

---

## Billing Frequency

| Frequency   | Billing Period                          |
|-------------|------------------------------------------|
| MONTHLY     | Bill once per month                     |
| QUARTERLY   | Bill once per quarter                   |
| ANNUAL      | Bill once per year                      |
| SEMI_ANNUAL | Bill every 6 months                     |
| WEEKLY      | Bill weekly                             |

---

## Proration

When a subscription is changed mid-period:
- **Upgrade:** Customer pays prorated difference for remaining days in period
- **Downgrade:** Customer receives prorated credit for remaining days
- **New subscription mid-period:** Charge for remaining days in current period

### Proration Calculation Example

- Monthly plan: $100/month
- Upgrade on the 15th of a 30-day month
- Remaining days: 15/30 = 50%
- Prorated charge: $100 × 50% = $50

NetSuite calculates this automatically when lines are added/changed.

---

## Charge Run Process

The Charge Run generates invoices for all subscriptions with charges due.

**Navigation:** Transactions > SuiteBilling > Charge Run

1. Schedule or run manually
2. Specify billing date range
3. NetSuite identifies all subscription lines with charges due
4. Creates invoices (or pending charges) per customer
5. Invoices are reviewed, then posted

---

## ARR/MRR Calculation

```javascript
define(['N/search', 'N/query'], function(search, query) {
    // MRR via SuiteQL
    var result = query.runSuiteQL({
        query: `
            SELECT SUM(recurringamount) AS MRR
            FROM subscriptionline sl
            JOIN subscription s ON sl.subscription = s.id
            WHERE s.status = 'ACTIVE'
              AND sl.frequency = 'MONTHLY'
        `
    });
    var mrr = result.results[0].values[0];
    var arr = mrr * 12;
});
```

---

## Contract Renewals

Before a subscription expires:
1. NetSuite can auto-send renewal notification (configurable lead time)
2. Sales rep reviews renewal terms with customer
3. If renewed: subscription extended (same or new terms)
4. If not renewed: subscription marked Inactive on expiry date

**Auto-renewal:** Set `autorenewal = true` on subscription — renews automatically
for the `autoRenewalTerm` period unless cancelled.

---

## Mid-Period Changes (Change Orders)

When a customer upgrades, downgrades, or modifies their subscription:
1. Navigate to Subscription record > Create Change Order
2. Specify change type: Add Line, Remove Line, Change Quantity, Change Item
3. Specify effective date
4. NetSuite calculates proration and creates appropriate charges

---

## Reports

| Report                        | Navigation                                              |
|-------------------------------|----------------------------------------------------------|
| MRR/ARR Summary               | Reports > SuiteBilling > MRR/ARR                        |
| Active Subscriptions          | Reports > SuiteBilling > Active Subscriptions           |
| Subscription Renewal Forecast | Reports > SuiteBilling > Renewals Due                   |
| Churn Analysis                | Reports > SuiteBilling > Churn                          |
