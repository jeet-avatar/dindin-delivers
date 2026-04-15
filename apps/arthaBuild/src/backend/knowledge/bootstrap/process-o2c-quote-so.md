---
source: Oracle NetSuite Official Documentation — O2C Quote and Sales Order
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# O2C: Quote/Estimate and Sales Order

## Overview

The Quote (Estimate) and Sales Order are the first formal records in the O2C cycle.
Estimates capture the customer's intent; Sales Orders confirm the order and trigger
fulfillment and billing.

---

## Quote / Estimate

**Navigation:** Transactions > Sales > Enter Estimates

**Record Type:** `record.Type.ESTIMATE`

### Key Fields

| Field               | Description                                          |
|---------------------|------------------------------------------------------|
| entity              | Customer internal ID                                 |
| tranDate            | Quote date                                           |
| dueDate / validuntil| Expiry date for the quote                           |
| probability         | Likelihood of close (0-100%)                        |
| expectedclosedate   | Expected conversion date                            |
| status              | Estimate:A (Open), Estimate:B (Processed/Won)       |
| memo                | Internal notes                                      |
| message             | Customer-facing notes on the document               |
| otherrefnum         | Customer's PO number or reference                   |

### Creating an Estimate (SuiteScript)

```javascript
define(['N/record'], function(record) {
    var estimate = record.create({
        type: record.Type.ESTIMATE,
        isDynamic: true
    });

    estimate.setValue({ fieldId: 'entity', value: 456 });             // Customer
    estimate.setValue({ fieldId: 'trandate', value: new Date() });
    estimate.setValue({ fieldId: 'probability', value: 80 });
    estimate.setValue({ fieldId: 'expectedclosedate', value: new Date(Date.now() + 30*86400000) });
    estimate.setValue({ fieldId: 'memo', value: 'Enterprise deal - pending procurement approval' });

    // Add line item
    estimate.selectNewLine({ sublistId: 'item' });
    estimate.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 100 }); // Item ID
    estimate.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 10 });
    estimate.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 500 }); // Unit price
    estimate.commitLine({ sublistId: 'item' });

    var estimateId = estimate.save();
});
```

---

## Converting Quote to Sales Order

```javascript
define(['N/record'], function(record) {
    var so = record.transform({
        fromType: record.Type.ESTIMATE,
        fromId: estimateId,
        toType: record.Type.SALES_ORDER,
        isDynamic: true
    });

    // Override any fields as needed
    so.setValue({ fieldId: 'trandate', value: new Date() });
    so.setValue({ fieldId: 'custbody_po_number', value: 'PO-2024-1234' });
    so.setValue({ fieldId: 'custbody_approval_status', value: 'Pending' });

    var soId = so.save();
});
```

---

## Sales Order

**Navigation:** Transactions > Sales > Enter Sales Orders

**Record Type:** `record.Type.SALES_ORDER`

### Key Header Fields

| Field               | Description                                           |
|---------------------|-------------------------------------------------------|
| entity              | Customer internal ID (required)                       |
| tranDate            | Order date                                            |
| shipDate            | Requested ship/delivery date                          |
| commitmentDate      | Committed delivery date                               |
| billAddress         | Customer billing address                              |
| shipAddress         | Customer shipping address                             |
| terms               | Payment terms (Net 30, etc.)                         |
| shipMethod          | Shipping carrier (UPS Ground, etc.)                   |
| department          | Department for reporting                              |
| class               | Class classification                                  |
| subsidiary          | Subsidiary (OneWorld)                                 |
| memo                | Internal memo                                         |
| otherrefnum         | Customer's PO number                                  |
| approvalStatus      | 1=Pending, 2=Approved, 3=Rejected                    |

### Key Line Fields

| Field               | Description                                           |
|---------------------|-------------------------------------------------------|
| item                | Item internal ID                                      |
| quantity            | Ordered quantity                                      |
| rate                | Unit price                                            |
| amount              | Line total (quantity × rate)                          |
| taxCode             | Tax code (for VAT/sales tax)                         |
| commitinventory     | 1=Do Not Commit, 2=Available Qty, 3=All              |
| isclosed            | T = close this line (don't fulfill/bill)              |
| custcol_            | Custom line fields                                    |

---

## Pricing Rules

NetSuite pricing hierarchy (highest priority first):

1. **Manual override on the line** (user types a rate)
2. **Customer-specific pricing** (price level on customer record)
3. **Quantity discounts** (price schedule on item)
4. **Price level** (Base Price, Online Price, etc.)
5. **Base price on item**

### Price Schedules (Volume Discounts)

```
Item: Widget A
Price Schedule:
  Qty 1-9:   $100/unit
  Qty 10-49: $90/unit
  Qty 50+:   $80/unit
```

Price schedules auto-apply when quantity crosses thresholds on the SO line.

---

## Commitment Date and Available to Promise

**Commitment Date:** the date on which the order will be fulfilled

**Available to Promise (ATP):** checks current inventory + incoming POs to determine
when an item can be committed for delivery.

Set on the SO line: `commitinventory` field:
- `1` = Do Not Commit (no inventory hold)
- `2` = Available Qty (commit what's on-hand)
- `3` = All (commit full order qty, creates backorder if insufficient)

---

## Approval Workflow for Sales Orders

Common custom fields used in approval workflows:

| Field ScriptId             | Purpose                                          |
|----------------------------|--------------------------------------------------|
| `custbody_approval_status` | Status: Pending, Approved, Rejected              |
| `custbody_approver`        | Employee: who needs to approve                   |
| `custbody_approval_notes`  | Approver's comments                              |
| `custbody_approval_date`   | Date/time of approval                            |
| `custbody_po_number`       | Customer's PO reference                          |
| `custbody_territory`       | Sales territory for reporting                    |
| `custbody_commission_rate` | Custom commission override                       |

---

## Territory and Commission Fields

Common customizations:
- `custbody_sales_territory` — List/Record linked to Territory custom record
- `custbody_commission_rate` — Percentage override for commissioned sales reps
- Automatically sourced from Customer's territory field when SO is created

---

## SO Search: Open Orders Report

```javascript
define(['N/search'], function(search) {
    var openOrders = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
            search.createFilter({ name: 'mainline', operator: search.Operator.IS, values: ['T'] }),
            search.createFilter({ name: 'status', operator: search.Operator.ANY_OF,
                values: ['SalesOrd:B', 'SalesOrd:D'] })  // Pending Fulfillment + Partial
        ],
        columns: [
            search.createColumn({ name: 'tranid', label: 'SO Number' }),
            search.createColumn({ name: 'entity', label: 'Customer' }),
            search.createColumn({ name: 'total', label: 'Total' }),
            search.createColumn({ name: 'trandate', label: 'Order Date' }),
            search.createColumn({ name: 'shipdate', label: 'Ship Date' })
        ]
    });
    return openOrders.run().getRange({ start: 0, end: 100 });
});
```
