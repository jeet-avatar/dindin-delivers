---
source: Oracle NetSuite Official Documentation — Procure to Pay Process
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Procure to Pay (P2P) — Process Overview

## Overview

Procure to Pay (P2P) is NetSuite's end-to-end procurement cycle — from identifying
a purchase need through purchase order, goods receipt, vendor bill, and final payment.

---

## P2P Process Flow

```
Purchase Requisition
(record.Type.PURCHASE_REQUISITION)
         ↓
    Purchase Order
  (record.Type.PURCHASE_ORDER)
         ↓
    Item Receipt
  (record.Type.ITEM_RECEIPT)
         ↓
    Vendor Bill
  (record.Type.VENDOR_BILL)
         ↓
   Vendor Payment
 (record.Type.VENDOR_PAYMENT)
```

---

## Record Types at Each Step

| Step                 | Record Type                    | Created From                     |
|----------------------|--------------------------------|----------------------------------|
| Purchase Requisition | `record.Type.PURCHASE_REQUISITION` | Manually or from demand planning |
| Purchase Order       | `record.Type.PURCHASE_ORDER`   | From PR or manually              |
| Item Receipt         | `record.Type.ITEM_RECEIPT`     | From Purchase Order              |
| Vendor Bill          | `record.Type.VENDOR_BILL`      | From Purchase Order              |
| Vendor Prepayment    | `record.Type.VENDOR_PREPAYMENT`| Manually (advance payment)       |
| Vendor Credit        | `record.Type.VENDOR_CREDIT`    | From Vendor Bill or manually     |
| Vendor Payment       | `record.Type.VENDOR_PAYMENT`   | Applied to Vendor Bills          |

---

## Record Transforms

```javascript
define(['N/record'], function(record) {
    // Purchase Requisition → Purchase Order
    var po = record.transform({
        fromType: record.Type.PURCHASE_REQUISITION,
        fromId: prId,
        toType: record.Type.PURCHASE_ORDER
    });
    var poId = po.save();

    // Purchase Order → Item Receipt
    var receipt = record.transform({
        fromType: record.Type.PURCHASE_ORDER,
        fromId: poId,
        toType: record.Type.ITEM_RECEIPT,
        isDynamic: true
    });
    var receiptId = receipt.save();

    // Purchase Order → Vendor Bill
    var bill = record.transform({
        fromType: record.Type.PURCHASE_ORDER,
        fromId: poId,
        toType: record.Type.VENDOR_BILL,
        isDynamic: true
    });
    var billId = bill.save();
});
```

---

## 3-Way Match

3-Way Match validates that three documents agree before paying a vendor:

```
PO Quantity/Price == Receipt Quantity == Vendor Bill Quantity/Price
```

If any of the three don't match, NetSuite flags the bill for review.

| Match Point | Check                                                    |
|-------------|----------------------------------------------------------|
| PO vs Bill  | Bill quantity ≤ PO quantity? Bill price ≈ PO price?     |
| PO vs Receipt | Receipt quantity ≤ PO quantity?                       |
| Bill vs Receipt | Bill quantity ≤ receipt quantity?                   |

**Tolerance rules:** You can set price/quantity tolerance percentages to allow
small discrepancies without blocking payment.

---

## Approval Workflow Points in P2P

| Stage              | Typical Approval Rule                                    |
|--------------------|----------------------------------------------------------|
| Purchase Requisition | Department manager approval required                   |
| Purchase Order      | Finance approval for POs > $10K                         |
| Vendor Bill         | AP manager approves before payment                      |
| Vendor Payment      | Treasurer/CFO approves payment batches                   |

---

## Prepayments

Vendor Prepayments handle advance payments to vendors:

1. Create Vendor Prepayment: `record.Type.VENDOR_PREPAYMENT`
2. Specify vendor, amount, posting account
3. When Vendor Bill arrives, apply the prepayment in the bill's apply tab

```javascript
define(['N/record'], function(record) {
    var prepay = record.create({ type: record.Type.VENDOR_PREPAYMENT });
    prepay.setValue({ fieldId: 'entity', value: 789 });     // Vendor
    prepay.setValue({ fieldId: 'account', value: 100 });    // Prepaid Expenses
    prepay.setValue({ fieldId: 'amount', value: 5000 });
    prepay.setValue({ fieldId: 'trandate', value: new Date() });
    prepay.save();
});
```

---

## P2P Status Values

### Purchase Order Status

| Status Code  | Status Label          | Meaning                                       |
|--------------|-----------------------|-----------------------------------------------|
| PurchOrd:A   | Pending Supervisor    | Awaiting approval                             |
| PurchOrd:B   | Pending Receipt       | Approved, awaiting delivery                   |
| PurchOrd:C   | Pending Bill/Partially Received | Partial receipt, not yet fully billed |
| PurchOrd:D   | Fully Billed          | All lines received and billed                 |
| PurchOrd:E   | Closed                | Manually closed                               |

---

## P2P Reports

| Report                      | Navigation                                              |
|-----------------------------|----------------------------------------------------------|
| Open Purchase Orders        | Reports > Vendors > Purchase Orders > Open Orders        |
| A/P Aging (unpaid bills)    | Reports > Vendors > A/P Aging                           |
| Vendor Payment History      | Reports > Vendors > Payment History                     |
| PO vs Bill Variance         | Reports > Vendors > Purchase Price Variance              |
| Items on Order              | Reports > Inventory > Items on Order                    |

---

## P2P SuiteQL

```sql
-- Open purchase orders
SELECT t.id, t.tranId, v.companyName AS vendor, t.total, t.tranDate, t.status
FROM transaction t
JOIN vendor v ON t.entity = v.id
WHERE t.type = 'PurchOrd'
  AND t.status IN ('PurchOrd:B', 'PurchOrd:C')
ORDER BY t.tranDate ASC

-- Unpaid vendor bills
SELECT t.id, t.tranId, v.companyName, t.total, t.amountRemaining, t.dueDate
FROM transaction t
JOIN vendor v ON t.entity = v.id
WHERE t.type = 'VendBill'
  AND t.amountRemaining > 0
ORDER BY t.dueDate ASC
```
