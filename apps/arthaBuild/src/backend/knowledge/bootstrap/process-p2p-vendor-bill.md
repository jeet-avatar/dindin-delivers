---
source: Oracle NetSuite Official Documentation — P2P Vendor Bill
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# P2P: Vendor Bill

## Overview

The Vendor Bill records the vendor's invoice — the formal request for payment.
In 3-way match environments, it should agree with the PO quantities/prices and
the Item Receipt quantities before payment is authorized.

---

## Creating a Vendor Bill from PO

**Navigation:** Open the Purchase Order > Actions > Bill

**Record Type:** `record.Type.VENDOR_BILL`

```javascript
define(['N/record'], function(record) {
    var bill = record.transform({
        fromType: record.Type.PURCHASE_ORDER,
        fromId: poId,
        toType: record.Type.VENDOR_BILL,
        isDynamic: true
    });

    bill.setValue({ fieldId: 'trandate', value: new Date() });
    bill.setValue({ fieldId: 'otherrefnum', value: 'VENDOR-INV-2024-5678' }); // Vendor's invoice number
    bill.setValue({ fieldId: 'memo', value: 'Q1 2024 supplies' });

    var billId = bill.save();
});
```

---

## Key Vendor Bill Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| entity             | Vendor (required)                                       |
| tranDate           | Bill date (vendor's invoice date)                       |
| dueDate            | Payment due date (auto-calculated from terms)           |
| terms              | Payment terms from vendor record                        |
| otherrefnum        | Vendor's invoice number (vendor ref)                    |
| memo               | Internal memo                                           |
| approvalStatus     | 1=Pending, 2=Approved, 3=Rejected                      |
| amountRemaining    | Balance unpaid                                          |
| total              | Total amount of the bill                                |
| account            | AP account (auto from vendor default)                   |

### Line Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| item               | Item being billed (from PO)                             |
| quantity           | Billed quantity (should match receipt)                  |
| rate               | Billed unit price (should match PO)                     |
| amount             | Line total                                              |
| department         | Department allocation                                   |
| class              | Class allocation                                        |

---

## 3-Way Match Verification

When a Vendor Bill is created from a PO, NetSuite automatically checks:

1. **Bill Quantity ≤ Receipt Quantity** — cannot bill for more than received
2. **Bill Price vs PO Price** — flags if price differs beyond tolerance

If a discrepancy is detected:
- A warning message is shown on the bill
- Bill can be placed on hold (`approvalStatus = 1`) pending resolution
- AP manager review is required before processing payment

```javascript
// Check if bill has match discrepancy
var bill = record.load({ type: record.Type.VENDOR_BILL, id: billId });
var approvalStatus = bill.getValue({ fieldId: 'approvalstatus' });
if (approvalStatus == '1') { // Pending Approval
    log.audit('Bill pending', 'Bill ' + billId + ' requires approval before payment');
}
```

---

## Bill Approval Workflow

Typical setup for bill approval:

```
Bill created → status = Pending Approval
    ↓
Workflow sends email to AP Manager
    ↓
AP Manager reviews → Approves or Rejects
    ↓
If Approved → status = Approved (can be paid)
If Rejected → status = Rejected (sent back to AP clerk)
```

Custom fields often used:
- `custbody_bill_approval_status` — workflow-managed status
- `custbody_bill_approver` — employee assigned to approve
- `custbody_match_exception_notes` — explanation of price/qty discrepancy

---

## Payment Terms and Due Date

```javascript
// Due date is auto-calculated when terms are set
var bill = record.load({ type: record.Type.VENDOR_BILL, id: billId });
var terms = bill.getValue({ fieldId: 'terms' });     // Terms internal ID
var tranDate = bill.getValue({ fieldId: 'trandate' }); // Invoice date
var dueDate = bill.getValue({ fieldId: 'duedate' });   // Auto-calculated
log.debug('Payment due', dueDate);
```

---

## Vendor Credits

Vendor credits reduce amounts owed to the vendor:

```javascript
define(['N/record'], function(record) {
    // Create vendor credit from vendor bill
    var credit = record.transform({
        fromType: record.Type.VENDOR_BILL,
        fromId: billId,
        toType: record.Type.VENDOR_CREDIT,
        isDynamic: true
    });

    // Reduce to credit amount
    credit.selectLine({ sublistId: 'item', line: 0 });
    credit.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: 5  // Credit for 5 units returned
    });
    credit.commitLine({ sublistId: 'item' });

    var creditId = credit.save();
});
```

Vendor credits are applied against open bills in the Vendor Payment's apply sublist.

---

## Vendor Prepayments

Prepayments are advance payments made before receiving a bill:

```javascript
define(['N/record'], function(record) {
    var prepay = record.create({ type: record.Type.VENDOR_PREPAYMENT });
    prepay.setValue({ fieldId: 'entity', value: 789 });        // Vendor
    prepay.setValue({ fieldId: 'account', value: 200 });       // Prepaid Expenses account
    prepay.setValue({ fieldId: 'amount', value: 10000 });      // Advance payment
    prepay.setValue({ fieldId: 'postingaccount', value: 201 }); // AP account
    prepay.setValue({ fieldId: 'trandate', value: new Date() });
    prepay.save();
});
```

When the vendor bill arrives, apply the prepayment in the bill's Apply tab.

---

## Vendor Bill SuiteQL

```sql
-- All unpaid vendor bills with vendor name
SELECT t.id, t.tranId, v.companyName AS vendor, t.total,
       t.amountRemaining, t.dueDate, t.otherrefnum AS vendorInvoiceRef
FROM transaction t
JOIN vendor v ON t.entity = v.id
WHERE t.type = 'VendBill'
  AND t.amountRemaining > 0
ORDER BY t.dueDate ASC

-- Bill vs PO price discrepancies
SELECT vb.id, vb.tranId, vb.total AS billAmount,
       po.id AS poId, po.total AS poAmount
FROM transaction vb
JOIN transaction po ON vb.createdfrom = po.id
WHERE vb.type = 'VendBill'
  AND po.type = 'PurchOrd'
  AND ABS(vb.total - po.total) > 0.01
```

---

## Accounting Impact of Vendor Bill

When a Vendor Bill is saved and posted:

| Account              | Debit   | Credit  |
|----------------------|---------|---------|
| Expense / Inventory  | Amount  |         |
| Accounts Payable     |         | Amount  |
