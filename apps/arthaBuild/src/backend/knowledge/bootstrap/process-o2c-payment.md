---
source: Oracle NetSuite Official Documentation — O2C Customer Payment
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# O2C: Customer Payment and AR Management

## Overview

Customer Payment records cash received from customers and applies it to
outstanding invoices. This is the final step in the O2C cycle, closing the
AR loop. Payments can be auto-applied or manually matched to invoices.

---

## Customer Payment

**Navigation:** Transactions > Sales > Accept Customer Payments

**Record Type:** `record.Type.CUSTOMER_PAYMENT`

### Key Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| customer           | Customer receiving credit                               |
| payment            | Total payment amount received                           |
| tranDate           | Payment date                                            |
| paymentMethod      | Check, ACH, Credit Card, Wire, etc.                    |
| checkNum           | Check number (for check payments)                       |
| undepositedFunds   | T = post to Undeposited Funds (staging account)        |
| account            | Bank account to deposit to (if undepositedFunds = F)   |
| currency           | Payment currency                                        |
| memo               | Internal reference                                      |

---

## Apply Sublist (Linking to Invoices)

The `apply` sublist links the payment to specific invoices:

```javascript
define(['N/record'], function(record) {
    var payment = record.create({
        type: record.Type.CUSTOMER_PAYMENT,
        isDynamic: true
    });

    payment.setValue({ fieldId: 'customer', value: 456 }); // Customer ID
    payment.setValue({ fieldId: 'payment', value: 2500 });  // Amount received
    payment.setValue({ fieldId: 'trandate', value: new Date() });
    payment.setValue({ fieldId: 'paymentmethod', value: 1 }); // 1 = Check

    // Apply to invoice
    // First, get the apply sublist to find the invoice
    var lineCount = payment.getLineCount({ sublistId: 'apply' });
    for (var i = 0; i < lineCount; i++) {
        var invoiceId = payment.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
        var invoiceAmount = payment.getSublistValue({ sublistId: 'apply', fieldId: 'total', line: i });
        if (invoiceId == 789) { // Target invoice
            payment.selectLine({ sublistId: 'apply', line: i });
            payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
            payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: 2500 });
            payment.commitLine({ sublistId: 'apply' });
        }
    }

    var paymentId = payment.save();
});
```

---

## Cash Application Strategies

### Auto-Apply

NetSuite can auto-apply incoming payments to oldest invoices first:

Navigate: Setup > Accounting > Accounting Preferences
Check: "Automatically Apply Credits/Payments to Oldest Transactions First"

When enabled, customer payments auto-populate the apply sublist with matching invoices.

### Manual Apply

For complex matching (partial payments, dispute adjustments):
1. Create payment
2. In the Apply tab, uncheck auto-applied invoices
3. Manually check specific invoices and set partial amounts
4. Total applied must equal payment amount

### Unapplied Payments

If payment amount exceeds total of matched invoices, the excess remains as
an **unapplied payment** — appears as a credit on the customer's account.

---

## A/R Aging Report

Monitor outstanding receivables:

**Navigation:** Reports > Customers > A/R Aging

The A/R Aging report shows invoices grouped by how overdue they are:

| Column  | Description                                      |
|---------|--------------------------------------------------|
| Current | Not yet due                                      |
| 1-30    | 1-30 days past due date                          |
| 31-60   | 31-60 days past due                              |
| 61-90   | 61-90 days past due                              |
| 90+     | Over 90 days past due                            |

---

## Customer Deposits

Customer Deposits record advance payments before an order is fulfilled/invoiced.

**Record Type:** `record.Type.DEPOSIT`

```javascript
define(['N/record'], function(record) {
    var deposit = record.create({
        type: record.Type.DEPOSIT,
        isDynamic: true
    });
    deposit.setValue({ fieldId: 'entity', value: 456 });      // Customer
    deposit.setValue({ fieldId: 'payment', value: 5000 });    // Deposit amount
    deposit.setValue({ fieldId: 'trandate', value: new Date() });
    deposit.setValue({ fieldId: 'account', value: 150 });     // Undeposited Funds
    var depositId = deposit.save();
});
```

Deposits appear in the Apply tab of a Customer Payment, allowing them to be
applied to invoices when the sale is completed.

---

## Linking Payments to Bank Deposits

The Deposit process consolidates individual customer payments into a single
bank deposit entry (matches your bank statement):

**Navigation:** Transactions > Financial > Make Deposits

1. Select the bank account
2. Check payments to include in this deposit
3. Save — creates a bank deposit record grouping the payments

This makes bank reconciliation easier — one deposit line on the bank statement
corresponds to one Deposit record in NetSuite.

---

## Payment Write-offs / Bad Debt

For invoices that won't be collected:

1. Create a credit memo for the uncollectable amount
2. Apply the credit memo to the invoice
3. Post the write-off to "Bad Debt Expense" account

Or use the **Write-Off** function (if enabled):
Navigate: Customer record > Related Records > Write Off > enter amount and GL account

---

## Customer Payment SuiteQL

```sql
-- Customer payments by customer with applied invoices
SELECT t.id, t.tranId, c.companyName, t.amount, t.tranDate,
       t.paymentmethod
FROM transaction t
JOIN customer c ON t.customer = c.id
WHERE t.type = 'CustPymt'
  AND t.tranDate >= TO_DATE('2024-01-01', 'YYYY-MM-DD')
ORDER BY t.tranDate DESC

-- AR aging (open invoices)
SELECT t.id, t.tranId, c.companyName, t.amountRemaining, t.dueDate,
       (SYSDATE - t.dueDate) AS daysPastDue
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE t.type = 'CustInvc'
  AND t.amountRemaining > 0
ORDER BY daysPastDue DESC
```
