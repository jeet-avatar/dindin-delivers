---
source: Oracle NetSuite Official Documentation — P2P Vendor Payment
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# P2P: Vendor Payment

## Overview

Vendor Payment records the actual disbursement of funds to vendors.
Payments are applied to open Vendor Bills, reducing the AP balance.
NetSuite supports individual and batch payments via check, ACH/EFT, and wire transfer.

---

## Vendor Payment

**Navigation:** Transactions > Payables > Pay Bills

**Record Type:** `record.Type.VENDOR_PAYMENT`

### Key Fields

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| entity             | Vendor being paid                                        |
| account            | Bank account payment is made from                        |
| tranDate           | Payment date                                             |
| paymentMethod      | Check, ACH/EFT, Wire Transfer, Cash                     |
| checkNum           | Check number (if paying by check)                        |
| amount             | Total payment amount                                     |
| memo               | Internal reference                                       |
| toBePrinted        | T = check needs to be printed                            |
| toBeEmailed        | T = payment remittance to be emailed                    |

---

## Apply Sublist (Linking to Vendor Bills)

```javascript
define(['N/record'], function(record) {
    var payment = record.create({
        type: record.Type.VENDOR_PAYMENT,
        isDynamic: true
    });

    payment.setValue({ fieldId: 'entity', value: 789 });       // Vendor
    payment.setValue({ fieldId: 'account', value: 150 });      // Bank account
    payment.setValue({ fieldId: 'trandate', value: new Date() });
    payment.setValue({ fieldId: 'paymentmethod', value: 2 });  // ACH

    // Apply to specific vendor bill
    var lineCount = payment.getLineCount({ sublistId: 'apply' });
    for (var i = 0; i < lineCount; i++) {
        var internalId = payment.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
        if (internalId == 456) { // Target bill
            payment.selectLine({ sublistId: 'apply', line: i });
            payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
            payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: 2500 });
            payment.commitLine({ sublistId: 'apply' });
        }
    }

    payment.save();
});
```

---

## Payment Methods

| Method     | Use Case                                     | NetSuite Field Value |
|------------|----------------------------------------------|----------------------|
| Check      | Paper check printed and mailed               | paymentMethod = 1    |
| ACH/EFT    | Electronic bank-to-bank transfer             | paymentMethod = 2    |
| Wire       | Same-day international/large transfers       | paymentMethod = 3    |
| Cash       | Petty cash disbursements                     | paymentMethod = 4    |
| Credit Card| Corporate card purchases                     | paymentMethod = 5    |

---

## Payment Batch (Pay Multiple Bills)

The "Pay Bills" screen allows paying multiple vendors/bills in one session:

**Navigation:** Transactions > Payables > Pay Bills

1. Set payment date, bank account, payment method
2. Check the bills to pay
3. Set amounts (full or partial per bill)
4. Click "Save" — creates individual Vendor Payment records per vendor

---

## Check Printing

For paper checks:

1. Set `toBePrinted = true` on the Vendor Payment
2. Navigate: Transactions > Payables > Print Checks
3. Select bank account and unprinted checks
4. Print the check run (check number auto-assigned sequentially)
5. Void and reprint if check is lost/damaged

---

## ACH/EFT Payments

Setup required:
1. Vendor record > Financial tab > set Routing Number + Account Number
2. Enable Electronic Payments: Setup > Accounting > Electronic Payments Setup
3. Create payments with paymentMethod = ACH/EFT
4. Export payment file: Transactions > Payables > Generate ACH File
5. Upload ACH file to bank

---

## A/P Aging Report

Monitor outstanding payables:

**Navigation:** Reports > Vendors > A/P Aging

| Column  | Description                                      |
|---------|--------------------------------------------------|
| Current | Bills not yet due                                |
| 1-30    | 1-30 days past due date                          |
| 31-60   | 31-60 days past due                              |
| 61-90   | 61-90 days past due                              |
| 90+     | Over 90 days past due                            |

---

## Cash Discount / Early Payment

Some vendor terms offer discounts for early payment (e.g., 2/10 Net 30):

```javascript
// Apply discount on vendor payment
var payment = record.create({ type: record.Type.VENDOR_PAYMENT });
payment.setValue({ fieldId: 'entity', value: 789 });
payment.setValue({ fieldId: 'trandate', value: new Date() });

// Apply with discount (pay by discount date)
payment.selectLine({ sublistId: 'apply', line: 0 });
payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'disc', value: true }); // Take discount
payment.setCurrentSublistValue({
    sublistId: 'apply',
    fieldId: 'amount',
    value: 980  // $1000 bill - 2% discount = $980
});
payment.commitLine({ sublistId: 'apply' });
payment.save();
```

---

## Bank Reconciliation Impact

When vendor payments are posted:
- Bank account balance decreases
- Cleared vs uncleared: check if payment has cleared the bank
- During bank reconciliation, mark payments as "Cleared" when they appear on the bank statement

**Navigation:** Transactions > Financial > Reconcile Bank Statement

---

## Accounting Impact

When a Vendor Payment is saved and posted:

| Account          | Debit   | Credit  |
|------------------|---------|---------|
| Accounts Payable | Amount  |         |
| Bank Account     |         | Amount  |

---

## Vendor Payment SuiteQL

```sql
-- Recent vendor payments
SELECT t.id, t.tranId, v.companyName AS vendor, t.amount, t.tranDate, t.paymentmethod
FROM transaction t
JOIN vendor v ON t.entity = v.id
WHERE t.type = 'VendPymt'
  AND t.tranDate >= TO_DATE('2024-01-01', 'YYYY-MM-DD')
ORDER BY t.tranDate DESC

-- Payments pending bank clearing
SELECT t.id, t.tranId, v.companyName AS vendor, t.amount, t.tranDate
FROM transaction t
JOIN vendor v ON t.entity = v.id
WHERE t.type = 'VendPymt'
  AND t.cleared = 'F'  -- Not yet cleared the bank
  AND t.tranDate < SYSDATE - 30
ORDER BY t.tranDate ASC
```
