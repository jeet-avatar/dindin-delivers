---
source: Oracle NetSuite Official Documentation — Returns and RMA
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Returns and RMA (Return Merchandise Authorization)

## Overview

NetSuite handles both customer returns (from customers back to company) and
vendor returns (from company back to vendor). The process involves Return
Authorizations, Item Receipts or Fulfillments, and Credit Memos or Vendor Credits.

---

## Customer Return Process Flow

```
Invoice (original sale)
     ↓
Return Authorization (RA)
(record.Type.RETURN_AUTHORIZATION)
     ↓
Item Receipt on RA (customer returning items)
(record.Type.ITEM_RECEIPT — but from RA)
     ↓
Credit Memo (refund or credit to customer account)
(record.Type.CREDIT_MEMO)
```

---

## Creating a Return Authorization from Invoice

**Navigation:** Open the Invoice > Actions > Create Return Authorization

**Record Type:** `record.Type.RETURN_AUTHORIZATION`

```javascript
define(['N/record'], function(record) {
    var ra = record.transform({
        fromType: record.Type.INVOICE,
        fromId: invoiceId,
        toType: record.Type.RETURN_AUTHORIZATION,
        isDynamic: true
    });

    ra.setValue({ fieldId: 'memo', value: 'Customer return — wrong item shipped' });
    ra.setValue({ fieldId: 'department', value: 5 });

    // Only return line 0 (one of multiple lines)
    ra.selectLine({ sublistId: 'item', line: 1 });
    ra.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: 0  // Don't return this line
    });
    ra.commitLine({ sublistId: 'item' });

    var raId = ra.save();
});
```

---

## Return Authorization Fields

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| entity             | Customer making the return                               |
| createdFrom        | Source invoice                                           |
| returnedDate       | Expected or actual return date                           |
| status             | ReturnAuth:A=Open, ReturnAuth:B=Pending Receipt         |
| memo               | Return reason                                            |
| refundMethod       | How to refund: Credit, Check, Credit Card               |

---

## Receiving Returned Items

When items come back from the customer, record an Item Receipt against the RA:

```javascript
define(['N/record'], function(record) {
    var itemReceipt = record.transform({
        fromType: record.Type.RETURN_AUTHORIZATION,
        fromId: raId,
        toType: record.Type.ITEM_RECEIPT,
        isDynamic: true
    });

    itemReceipt.setValue({ fieldId: 'trandate', value: new Date() });
    itemReceipt.setValue({ fieldId: 'location', value: 3 }); // Returns warehouse

    // Inspect condition
    itemReceipt.setValue({ fieldId: 'memo', value: 'Returned in good condition — restock' });

    itemReceipt.save();
});
```

This increases inventory at the returns location.

---

## Credit Memo from Return Authorization

After items are received, create a credit memo to refund the customer:

```javascript
define(['N/record'], function(record) {
    var creditMemo = record.transform({
        fromType: record.Type.RETURN_AUTHORIZATION,
        fromId: raId,
        toType: record.Type.CREDIT_MEMO,
        isDynamic: true
    });

    creditMemo.setValue({ fieldId: 'trandate', value: new Date() });

    var creditMemoId = creditMemo.save();
    // Apply the credit memo to: open invoices (as offset) or issue a cash refund
});
```

---

## Vendor Return Process Flow

```
Item Receipt (original receipt from vendor)
     ↓
Return Authorization to Vendor
(Transactions > Purchases > Enter Return Authorizations)
     ↓
Item Fulfillment (shipping items back to vendor)
     ↓
Vendor Credit
(record.Type.VENDOR_CREDIT)
```

---

## Creating Vendor Return Authorization

**Navigation:** Transactions > Purchases > Enter Return Authorizations

```javascript
define(['N/record'], function(record) {
    var vendorRA = record.create({ type: record.Type.RETURN_AUTHORIZATION, isDynamic: true });
    vendorRA.setValue({ fieldId: 'entity', value: 789 });   // Vendor
    vendorRA.setValue({ fieldId: 'istaxable', value: false });
    vendorRA.setValue({ fieldId: 'memo', value: 'Defective components from PO-2024-100' });

    vendorRA.selectNewLine({ sublistId: 'item' });
    vendorRA.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 456 });
    vendorRA.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 10 });
    vendorRA.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 25 });
    vendorRA.commitLine({ sublistId: 'item' });

    var vendorRAId = vendorRA.save();
});
```

---

## Vendor Credit

After vendor confirms the return:

```javascript
define(['N/record'], function(record) {
    var credit = record.create({ type: record.Type.VENDOR_CREDIT, isDynamic: true });
    credit.setValue({ fieldId: 'entity', value: 789 }); // Vendor
    credit.setValue({ fieldId: 'trandate', value: new Date() });
    credit.setValue({ fieldId: 'memo', value: 'Credit from vendor for defective returns' });

    credit.selectNewLine({ sublistId: 'item' });
    credit.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 456 });
    credit.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 10 });
    credit.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 25 });
    credit.commitLine({ sublistId: 'item' });

    var creditId = credit.save();
    // Apply this vendor credit in the next Vendor Payment to offset a bill
});
```

---

## Return Reason Codes

Custom field `custbody_return_reason` on Return Authorization — common values:
- Wrong item shipped
- Damaged in transit
- Customer changed mind
- Defective/not working
- Duplicate order
- Not as described

---

## Restocking Inspection

After receiving returned items, inspect before restocking:
- Restock good condition items: adjust to sellable inventory
- Quarantine defective items: adjust to non-sellable location
- Write off damaged beyond repair: inventory adjustment to shrinkage

---

## RMA Reports

| Report                        | Navigation                                              |
|-------------------------------|----------------------------------------------------------|
| Open Return Authorizations    | Reports > Sales > Return Authorizations > Open          |
| Returns by Reason             | Custom saved search on Return Authorization             |
| Return Rate by Item           | Custom saved search: returns / total sales per item     |
