---
source: Oracle NetSuite Official Documentation — Order to Cash Process
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Order to Cash (O2C) — Process Overview

## Overview

Order to Cash (O2C) is NetSuite's end-to-end sales fulfillment cycle — from the initial
customer inquiry through quote, order, fulfillment, invoicing, and final payment receipt.

---

## O2C Process Flow

```
Lead/Opportunity
     ↓
Estimate / Quote
(record.Type.ESTIMATE)
     ↓
Sales Order
(record.Type.SALES_ORDER)
     ↓
Item Fulfillment
(record.Type.ITEM_FULFILLMENT)
     ↓
Invoice
(record.Type.INVOICE)
     ↓
Customer Payment
(record.Type.CUSTOMER_PAYMENT)
     ↓
Deposit
(record.Type.DEPOSIT)
```

---

## Record Types at Each Step

| Step              | Record Type                   | Created From                     |
|-------------------|-------------------------------|----------------------------------|
| Quote             | `record.Type.ESTIMATE`        | Manually or from Opportunity     |
| Sales Order       | `record.Type.SALES_ORDER`     | From Estimate or manually        |
| Item Fulfillment  | `record.Type.ITEM_FULFILLMENT`| From Sales Order                 |
| Invoice           | `record.Type.INVOICE`         | From Sales Order or manually     |
| Credit Memo       | `record.Type.CREDIT_MEMO`     | From Invoice                     |
| Customer Payment  | `record.Type.CUSTOMER_PAYMENT`| Manually applied to Invoice      |
| Deposit           | `record.Type.DEPOSIT`         | From unapplied payments          |

---

## Record Transforms (Key Code Pattern)

```javascript
define(['N/record'], function(record) {
    // Estimate → Sales Order
    var so = record.transform({
        fromType: record.Type.ESTIMATE,
        fromId: estimateId,
        toType: record.Type.SALES_ORDER,
        isDynamic: true
    });
    var soId = so.save();

    // Sales Order → Item Fulfillment
    var fulfillment = record.transform({
        fromType: record.Type.SALES_ORDER,
        fromId: soId,
        toType: record.Type.ITEM_FULFILLMENT,
        isDynamic: true
    });
    var fulfillmentId = fulfillment.save();

    // Sales Order → Invoice
    var invoice = record.transform({
        fromType: record.Type.SALES_ORDER,
        fromId: soId,
        toType: record.Type.INVOICE,
        isDynamic: true
    });
    var invoiceId = invoice.save();

    // Invoice → Credit Memo
    var creditMemo = record.transform({
        fromType: record.Type.INVOICE,
        fromId: invoiceId,
        toType: record.Type.CREDIT_MEMO,
        isDynamic: true
    });
});
```

---

## Key Field Mapping Between Steps

### Estimate → Sales Order
| Estimate Field    | Sales Order Field  | Note                                     |
|-------------------|--------------------|------------------------------------------|
| entity (customer) | entity             | Carried over                             |
| item lines        | item lines         | All lines copied                         |
| rate / amount     | rate / amount      | Copied, can be overridden                |
| terms             | terms              | Carried from customer default            |
| tranDate          | tranDate           | Reset to current date by default         |

### Sales Order → Invoice
| SO Field          | Invoice Field      | Note                                     |
|-------------------|--------------------|------------------------------------------|
| entity            | entity             | Same customer                            |
| item lines        | item lines         | Only fulfilled/billed lines              |
| subsidiary        | subsidiary         | Same subsidiary                          |
| terms             | terms              | Drives dueDate calculation               |
| custbody_ fields  | custbody_ fields   | Custom fields not auto-copied            |

---

## Approval Workflow Points

Common places for approval workflows in O2C:

1. **Estimate (Quote):** approval before sending to customer
   - High-value quotes (> $50K) require VP approval
   - Discount > 20% requires manager approval

2. **Sales Order:** approval before fulfillment
   - Credit check: customer over credit limit → hold
   - Non-standard pricing: custom discount approval

3. **Invoice:** approval before sending to customer
   - Large invoice ($100K+) financial controller review

---

## Revenue Recognition Trigger Points

Revenue can be recognized at different stages:

| Recognition Trigger        | When Revenue Is Recognized                           |
|----------------------------|------------------------------------------------------|
| Invoice creation           | When invoice is created (no deferral)                |
| Item Fulfillment           | When items are shipped (delivery-based)              |
| Customer acceptance        | When customer signs off (event-based ARM)            |
| Time-based schedule        | Ratably over the service period (monthly)            |
| Project milestone          | Completion of project task/phase                     |

See: `feature-revenue-recognition.md` for ARM configuration details.

---

## Status Tracking

### Sales Order Status Values

| Status Code   | Status Label          | Meaning                                      |
|---------------|-----------------------|----------------------------------------------|
| SalesOrd:A    | Pending Approval      | Awaiting approval workflow                   |
| SalesOrd:B    | Pending Fulfillment   | Approved, ready to fulfill                   |
| SalesOrd:C    | Cancelled             | Cancelled by user                            |
| SalesOrd:D    | Partially Fulfilled   | Some lines fulfilled, some pending           |
| SalesOrd:E    | Pending Billing/Partially Fulfilled | Fulfilled but not fully billed  |
| SalesOrd:F    | Pending Billing       | All fulfilled, invoice not yet created       |
| SalesOrd:G    | Billed                | All lines invoiced                           |
| SalesOrd:H    | Closed                | Manually closed                              |

---

## O2C Reports

| Report                        | Navigation                                              |
|-------------------------------|----------------------------------------------------------|
| Open Sales Orders             | Reports > Sales > Sales Orders > Open Orders            |
| Sales Order Backlog           | Reports > Sales > Sales Orders > Backlog                |
| A/R Aging (open invoices)     | Reports > Customers > A/R Aging                         |
| Customer Sales History        | Reports > Customers > Sales by Customer                  |
| Revenue by Item               | Reports > Financial > Revenue by Item                   |
