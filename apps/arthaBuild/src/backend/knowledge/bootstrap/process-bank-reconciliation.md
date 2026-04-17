---
source: Oracle NetSuite Official Documentation — Bank Reconciliation
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Bank Reconciliation

## Overview

Bank Reconciliation matches NetSuite's bank register to external bank statements,
ensuring all cash transactions are accurately recorded. It identifies uncleared items,
bank fees, and errors that require adjusting entries.

---

## Setup

### Enable Bank Reconciliation

Navigate: Setup > Accounting > Accounting Preferences > check "Enable Reconcile Bank Statements"

### Bank Account Setup

Each reconcilable bank account needs:
- Account Type: Bank
- Currency: Account's native currency
- Opening Balance entered on a specific start date

---

## Import Bank Statement

NetSuite can auto-import bank statements via:

**Navigation:** Setup > Accounting > Banking > Import Bank Statements

### Supported Import Formats

| Format  | Description                              |
|---------|------------------------------------------|
| OFX     | Open Financial Exchange (US banks)       |
| QFX     | Quicken Financial Exchange               |
| CSV     | Comma-separated values (custom mapping)  |
| SWIFT   | MT940/MT942 format (international banks) |
| BAI2    | Bank Administration Institute format     |

### Import Process

1. Navigate to Setup > Accounting > Banking > Import Bank Statements
2. Select Bank Account
3. Choose import format and upload the statement file
4. Map fields if using CSV format
5. NetSuite creates unmatched statement lines for review

---

## Matching Rules (Auto-Match)

NetSuite auto-matches statement lines to NetSuite transactions using:

| Rule                | Match Criteria                                        |
|---------------------|-------------------------------------------------------|
| Amount + Date       | Exact amount match within date tolerance (±3 days)   |
| Amount + Check#     | Exact amount + check number match                    |
| Amount + Reference  | Exact amount + reference/memo text match             |
| Fuzzy Match         | Amount match + similar date/reference                |

---

## Manual Reconciliation Process

**Navigation:** Transactions > Financial > Reconcile Bank Statement

1. Open the Reconcile Bank Statement screen
2. Select Bank Account
3. Enter Statement Date and Closing Balance from bank statement
4. NetSuite shows two lists:
   - **Left side:** Bank statement lines (imported)
   - **Right side:** NetSuite transactions (uncleared)

5. Match each bank statement line to its NetSuite transaction:
   - Check the checkbox on matching rows in both lists
   - Use "Match" button to link them
   - NetSuite marks matched transactions as "Cleared"

6. When all items are matched:
   - Difference = Closing Balance - Deposits + Withdrawals = should be $0
   - If $0 difference: Save to complete the reconciliation

---

## Handling Unmatched Items

### Bank Statement Line Without NetSuite Transaction

These represent transactions in the bank not yet recorded in NetSuite:
- Bank service charge → create journal entry: DR Bank Fees / CR Bank Account
- Interest earned → create journal entry: DR Bank Account / CR Interest Income
- NSF returned check → create reversal of original customer payment

```javascript
define(['N/record'], function(record) {
    // Record bank service charge not in NetSuite
    var je = record.create({ type: record.Type.JOURNAL_ENTRY, isDynamic: true });
    je.setValue({ fieldId: 'trandate', value: new Date('2024-01-31') });
    je.setValue({ fieldId: 'memo', value: 'Bank service charge Jan 2024' });

    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 640 }); // Bank Fees
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: 25 });
    je.commitLine({ sublistId: 'line' });

    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 150 }); // Bank Account
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: 25 });
    je.commitLine({ sublistId: 'line' });

    je.save();
});
```

### NetSuite Transaction Without Bank Line

Outstanding items — not yet cleared the bank:
- Uncleared checks (issued but not cashed)
- Deposits in transit (deposited but not yet shown on statement)

These are expected — leave them as uncleared until next statement.

---

## Cleared vs Uncleared Transactions

```javascript
// Check if a transaction is cleared
define(['N/search'], function(search) {
    var unclearedChecks = search.create({
        type: search.Type.VENDOR_PAYMENT,
        filters: [
            search.createFilter({ name: 'cleared', operator: search.Operator.IS, values: ['F'] }),
            search.createFilter({ name: 'account', operator: search.Operator.IS, values: ['150'] }) // Bank account
        ],
        columns: [
            search.createColumn({ name: 'tranid' }),
            search.createColumn({ name: 'amount' }),
            search.createColumn({ name: 'trandate' })
        ]
    }).run().getRange({ start: 0, end: 100 });
});
```

---

## Foreign Currency Bank Accounts

For foreign currency bank accounts:
- Statement is in foreign currency (e.g., EUR)
- NetSuite stores amounts in both foreign currency and base currency equivalent
- During reconciliation, match using foreign currency amounts (not base currency)
- Any difference due to exchange rate changes is posted as unrealized FX gain/loss

---

## Bank Reconciliation Report

After completing reconciliation:

**Navigation:** Reports > Financial > Bank Reconciliation

Shows:
- Closing balance per bank statement
- Outstanding deposits in transit
- Outstanding checks/payments not yet cleared
- Adjusted book balance (should match)

---

## SuiteQL for Bank Reconciliation

```sql
-- Uncleared transactions older than 30 days
SELECT t.id, t.tranId, t.amount, t.tranDate, t.type,
       a.name AS bankAccount
FROM transaction t
JOIN account a ON t.account = a.id
WHERE t.cleared = 'F'
  AND a.type = 'Bank'
  AND t.tranDate < SYSDATE - 30
ORDER BY t.tranDate ASC
```
