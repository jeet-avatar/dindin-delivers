---
source: Oracle NetSuite Official Documentation — Cash Management
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Cash Management

## Overview

Cash Management in NetSuite encompasses bank account setup, cash positioning,
fund transfers, bank reconciliation, and foreign currency cash management.
It provides real-time visibility into cash across all bank accounts and subsidiaries.

---

## Bank Account Setup

**Navigation:** Lists > Accounting > Accounts > New (Type = Bank)

### Key Bank Account Fields

| Field            | Description                                              |
|------------------|----------------------------------------------------------|
| name             | Account name (e.g., "Chase Checking - Operations")      |
| accountType      | Bank (mandatory)                                         |
| acctNumber       | Bank account number (last 4 digits recommended for UI)  |
| currency         | Account's native currency                                |
| subsidiary       | Subsidiary (OneWorld)                                    |
| includeInCSV     | Include in cash position reports                         |
| bankRoutingNumber| ABA routing number (for ACH/direct deposit)             |
| openingBalance   | Opening balance when account added to NetSuite           |
| openingBalanceDate | Date for opening balance entry                         |

---

## Cash Position Report

**Navigation:** Reports > Cash > Cash Position

Provides a consolidated view of all bank balances across the organization:
- Current balance per bank account
- Pending transactions (checks not yet cleared, deposits in transit)
- Projected balance

---

## Fund Transfers Between Bank Accounts

**Navigation:** Transactions > Financial > Transfer Funds

**Record Type:** `record.Type.BANK_TRANSFER`

```javascript
define(['N/record'], function(record) {
    var transfer = record.create({ type: record.Type.BANK_TRANSFER, isDynamic: true });
    transfer.setValue({ fieldId: 'account', value: 150 });       // From account (Operating)
    transfer.setValue({ fieldId: 'toAccount', value: 155 });     // To account (Savings)
    transfer.setValue({ fieldId: 'amount', value: 100000 });     // Transfer amount
    transfer.setValue({ fieldId: 'trandate', value: new Date() });
    transfer.setValue({ fieldId: 'memo', value: 'Monthly transfer to savings reserve' });

    var transferId = transfer.save();
});
```

**GL Entries:**
```
DR  Savings Account (155)    $100,000
CR  Operating Account (150)  $100,000
```

---

## Undeposited Funds

Payments received but not yet deposited to the bank:

1. Customer Payment created → posted to "Undeposited Funds" staging account
2. Group payments for daily bank deposit
3. Create Deposit record: Transactions > Financial > Make Deposits
4. Bank Deposit moves funds from Undeposited Funds → Bank Account

```javascript
// Create customer payment to Undeposited Funds
var payment = record.create({ type: record.Type.CUSTOMER_PAYMENT });
payment.setValue({ fieldId: 'customer', value: 456 });
payment.setValue({ fieldId: 'payment', value: 5000 });
payment.setValue({ fieldId: 'undepositedFunds', value: true });  // Stage here
payment.save();

// Later: create bank deposit to consolidate
var deposit = record.create({ type: record.Type.DEPOSIT });
deposit.setValue({ fieldId: 'account', value: 150 });   // Target bank account
// Deposit sublist shows all undeposited payments to include
deposit.save();
```

---

## Lockbox Import

Lockbox is a bank service where customer remittances are processed automatically:

**Navigation:** Setup > Accounting > Banking > Lockbox Import

1. Bank processes customer payments and provides a file (BAI2, CSV, etc.)
2. Import file into NetSuite
3. NetSuite auto-matches payment amounts to open invoices
4. Unmatched items require manual review

---

## Petty Cash Management

For small, in-office cash purchases:

1. Set up a Petty Cash account (type = Cash)
2. Replenish via check from main bank account
3. Record petty cash expenses via Expense Report or Cash Sale
4. Replenish when balance runs low

---

## Foreign Currency Bank Accounts

Accounts in non-base currencies:

```javascript
define(['N/record'], function(record) {
    // Create a EUR bank account
    var eurAccount = record.create({ type: record.Type.ACCOUNT });
    eurAccount.setValue({ fieldId: 'accttype', value: 'Bank' });
    eurAccount.setValue({ fieldId: 'acctname', value: 'Deutsche Bank EUR Account' });
    eurAccount.setValue({ fieldId: 'currency', value: 3 });  // EUR currency ID
    eurAccount.setValue({ fieldId: 'subsidiary', value: 2 }); // EU subsidiary
    eurAccount.save();
});
```

**Key rules:**
- All transactions to this account must be in EUR
- Balance is maintained in EUR
- NetSuite converts to base currency for consolidated reporting
- Revalue periodically: Transactions > Financial > Revalue Open Currency Balances

---

## Cash Flow Forecasting

**Navigation:** Reports > Cash > Cash Flow Forecast

Shows projected cash position based on:
- Open invoices (expected cash in)
- Open bills due (expected cash out)
- Scheduled subscription charges
- Open POs (expected future payments)

---

## Bank Reconciliation (Summary)

See `process-bank-reconciliation.md` for full details.

Quick reference:
1. Import bank statement: Setup > Accounting > Banking > Import Bank Statements
2. Reconcile: Transactions > Financial > Reconcile Bank Statement
3. Mark transactions as cleared
4. Investigate unmatched items
5. Post adjusting JEs for bank charges, errors

---

## Cash Management SuiteQL

```sql
-- Cash position by bank account
SELECT a.name, a.type, a.currency, c.symbol,
       SUM(CASE WHEN tl.debit IS NOT NULL THEN tl.debit ELSE 0 END -
           CASE WHEN tl.credit IS NOT NULL THEN tl.credit ELSE 0 END) AS balance
FROM account a
JOIN currency c ON a.currency = c.id
LEFT JOIN transactionaccountingline tl ON a.id = tl.account
WHERE a.type = 'Bank'
GROUP BY a.name, a.type, a.currency, c.symbol
ORDER BY a.name

-- Undeposited funds balance
SELECT SUM(CASE WHEN t.type = 'CustPymt' AND t.undepositedFunds = 'T'
               THEN t.amount ELSE 0 END) AS undepositedBalance
FROM transaction t
WHERE t.type = 'CustPymt'
```
