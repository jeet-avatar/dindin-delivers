---
source: Oracle NetSuite Official Documentation — P2P Purchasing
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# P2P: Purchasing (Requisitions and Purchase Orders)

## Overview

The Purchasing phase of P2P covers the identification of a need (PR),
approval, and creation of a legal commitment to a vendor (PO).

---

## Purchase Requisition (PR)

**Navigation:** Transactions > Purchases > Enter Purchase Requisitions

**Record Type:** `record.Type.PURCHASE_REQUISITION`

A PR captures an internal request to purchase. It must be approved before
a PO is issued to the vendor.

### Key PR Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| memo               | Purpose / justification for the purchase                |
| requestor          | Employee making the request                             |
| entity             | Suggested vendor (optional)                             |
| expectedReceiptDate| When goods are needed                                   |
| department         | Requesting department                                   |
| location           | Delivery location                                       |

---

## PR Approval Workflow

Typical PR approval setup using SuiteFlow:

1. PR created → status = "Pending Supervisor Approval"
2. Workflow sends email to department manager
3. Manager approves → PR status = "Open"
4. PR can now be converted to PO

```javascript
// Check PR approval status in script
var pr = record.load({ type: record.Type.PURCHASE_REQUISITION, id: prId });
var approvalStatus = pr.getValue({ fieldId: 'approvalstatus' });
// 1 = Pending, 2 = Approved, 3 = Rejected
```

---

## Converting PR to Purchase Order

```javascript
define(['N/record'], function(record) {
    var po = record.transform({
        fromType: record.Type.PURCHASE_REQUISITION,
        fromId: prId,
        toType: record.Type.PURCHASE_ORDER,
        isDynamic: true
    });

    // Set vendor if not already set on PR
    po.setValue({ fieldId: 'entity', value: 789 }); // Vendor ID

    var poId = po.save();
});
```

---

## Purchase Order

**Navigation:** Transactions > Purchases > Enter Purchase Orders

**Record Type:** `record.Type.PURCHASE_ORDER`

### Key Header Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| entity             | Vendor internal ID (required)                           |
| tranDate           | PO date                                                 |
| expectedReceiptDate| Expected delivery date                                  |
| terms              | Vendor payment terms (Net 30, etc.)                    |
| memo               | Internal note                                           |
| otherrefnum        | Vendor's quote reference                                |
| department         | Cost center/department                                  |
| location           | Delivery location                                       |
| subsidiary         | Subsidiary (OneWorld)                                   |
| shipAddress        | Ship-to address                                         |
| shipMethod         | Shipping method requested                               |

### Key Line Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| item               | Item or expense category                                |
| quantity           | Ordered quantity                                        |
| rate               | Unit price (from vendor pricing)                        |
| amount             | Line total (quantity × rate)                            |
| expectedReceiptDate| Line-level expected receipt date                        |
| taxCode            | Tax code for the line                                   |
| department         | Line-level department override                          |

---

## Creating a Purchase Order (SuiteScript)

```javascript
define(['N/record'], function(record) {
    var po = record.create({
        type: record.Type.PURCHASE_ORDER,
        isDynamic: true
    });

    po.setValue({ fieldId: 'entity', value: 789 });                    // Vendor
    po.setValue({ fieldId: 'trandate', value: new Date() });
    po.setValue({ fieldId: 'expectedreceiptdate', value: new Date(Date.now() + 14*86400000) });
    po.setValue({ fieldId: 'memo', value: 'Q1 2024 office supplies' });

    // Add item line
    po.selectNewLine({ sublistId: 'item' });
    po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 100 }); // Item ID
    po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 50 });
    po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 25 }); // Unit price
    po.commitLine({ sublistId: 'item' });

    var poId = po.save();
});
```

---

## Blanket POs (Cumulative Ordering)

A Blanket PO is an agreement with a vendor for a total quantity/amount over time,
fulfilled by multiple releases (partial receipts):

1. Create PO with total estimated quantity
2. Receive partial shipments over time — each receipt reduces remaining PO balance
3. PO remains open until fully received or manually closed

**Key setting:** "Open" means more receipts can be made against it.

```javascript
// Check remaining quantity on PO line
var po = record.load({ type: record.Type.PURCHASE_ORDER, id: poId });
var orderedQty = po.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: 0 });
var receivedQty = po.getSublistValue({ sublistId: 'item', fieldId: 'quantityreceived', line: 0 });
var remaining = orderedQty - receivedQty;
```

---

## Drop Ship POs

A drop ship PO ships directly from the vendor to the customer:

1. Create SO with "Drop Ship" fulfillment type
2. NetSuite automatically creates a linked PO with the customer's ship address
3. Vendor ships to customer — Item Receipt is generated on the PO
4. SO is marked as fulfilled

**Linked fields:**
- PO field: `dropshipso` — internal ID of linked Sales Order
- SO field: `purchaseorder` — internal ID of linked PO

---

## Special Order POs

Special Order POs are created specifically for a customer order for a non-stocked item:

1. Mark item as "Special Order" on the SO line
2. NetSuite creates a PO with vendor and item details
3. Item is received directly to the SO fulfillment (not to general stock)

---

## Vendor Pricing

NetSuite supports vendor-specific pricing:
- Navigate to Item record > Vendor tab > Add vendor
- Set vendor item name, vendor item description, purchase price per unit

When creating a PO for that vendor and item, the vendor price auto-populates.

---

## Subsidiary Requirement

In OneWorld, the PO's subsidiary must match the vendor's assigned subsidiary.
If a vendor is available in multiple subsidiaries, set the `subsidiary` field on the PO
to the appropriate subsidiary before selecting the vendor.
