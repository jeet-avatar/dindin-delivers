---
source: Oracle NetSuite Official Documentation — Journal Entries
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Journal Entries

## Overview

Journal Entries (JEs) are the fundamental accounting records in NetSuite's General Ledger.
They record financial transactions by debiting and crediting specific accounts.
JEs must always balance (total debits = total credits).

---

## Manual Journal Entry

**Navigation:** Transactions > Financial > Make Journal Entries

**Record Type:** `record.Type.JOURNAL_ENTRY`

---

## Key Header Fields

| Field            | Description                                              |
|------------------|----------------------------------------------------------|
| tranDate         | Posting date (determines which accounting period)        |
| subsidiary       | Subsidiary (OneWorld)                                    |
| memo             | Description / purpose of the JE                          |
| currency         | Currency of the JE (default = base currency)             |
| approved         | T/F — requires approval before posting                   |
| approvalStatus   | 1=Pending, 2=Approved                                    |
| reversalDate     | Auto-reverse on this date (for accruals)                 |
| reversalDefer    | T = defer posting reversal until period opens            |

---

## Key Line Fields

| Field            | Description                                              |
|------------------|----------------------------------------------------------|
| account          | GL account internal ID (required)                        |
| debit            | Debit amount (leave empty if credit)                     |
| credit           | Credit amount (leave empty if debit)                     |
| memo             | Line-level description                                   |
| entity           | Customer/vendor/employee for sub-ledger tracking         |
| department       | Department allocation                                    |
| class            | Class allocation                                         |
| location         | Location allocation                                      |
| subsidiary       | Line-level subsidiary (intercompany JEs)                 |

---

## Creating a Journal Entry (SuiteScript)

```javascript
define(['N/record', 'N/log'], function(record, log) {
    var je = record.create({
        type: record.Type.JOURNAL_ENTRY,
        isDynamic: true
    });

    // Header
    je.setValue({ fieldId: 'subsidiary', value: 1 });
    je.setValue({ fieldId: 'trandate', value: new Date() });
    je.setValue({ fieldId: 'memo', value: 'Accrual for Q4 bonuses' });
    je.setValue({ fieldId: 'approved', value: true }); // Skip approval

    // Line 1: Debit Bonus Expense
    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 600 }); // Bonus Expense
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: 50000 });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: 'Q4 bonus accrual' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: 5 }); // Sales dept
    je.commitLine({ sublistId: 'line' });

    // Line 2: Credit Accrued Liabilities
    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 300 }); // Accrued Liabilities
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: 50000 });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: 'Q4 bonus accrual' });
    je.commitLine({ sublistId: 'line' });

    var jeId = je.save();
    log.audit('JE Created', 'ID: ' + jeId);
});
```

---

## Balancing Rule

A JE cannot be saved if total debits ≠ total credits:

```
Total Debit Lines = Total Credit Lines (required for save)
```

NetSuite validates this on save and throws `FIELD_DEFICIENCY` if unbalanced.

---

## Recurring Journal Entries

Automate monthly accruals or amortization entries:

**Navigation:** Transactions > Financial > Make Journal Entries > check "Create Recurring"

Configure:
- Start Date / End Date
- Frequency: Monthly, Quarterly, Annually
- Fixed amount or varies

NetSuite auto-creates the JE on each recurrence date.

---

## Reversing Journal Entries

Accruals are commonly reversed at the start of the next period:

```javascript
define(['N/record'], function(record) {
    var je = record.create({ type: record.Type.JOURNAL_ENTRY, isDynamic: true });
    je.setValue({ fieldId: 'trandate', value: new Date('2024-01-31') }); // Period end
    je.setValue({ fieldId: 'reversaldate', value: new Date('2024-02-01') }); // Auto-reverse
    // ... add debit/credit lines
    je.save();
});
```

The reversed JE is automatically created with debit/credit swapped on `reversalDate`.

---

## Intercompany Journal Entries

JEs that span multiple subsidiaries (OneWorld):

```javascript
define(['N/record'], function(record) {
    var je = record.create({ type: record.Type.JOURNAL_ENTRY, isDynamic: true });
    je.setValue({ fieldId: 'subsidiary', value: 1 }); // Parent subsidiary for header

    // Line 1: Sub A debit (management fee expense)
    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'subsidiary', value: 1 }); // Sub A
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 700 }); // Mgmt Fee Expense
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: 10000 });
    je.commitLine({ sublistId: 'line' });

    // Line 2: Sub B credit (management fee revenue)
    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'subsidiary', value: 2 }); // Sub B
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 800 }); // Mgmt Fee Revenue
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: 10000 });
    je.commitLine({ sublistId: 'line' });

    je.save();
});
```

---

## Statistical Journal Entries

Statistical JEs record non-monetary metrics (headcount, square footage):
- Debit/credit are in "statistical" units, not currency
- Used for allocations based on headcount or area

Enable: Setup > Accounting > Statistical Accounts

---

## JE Approval Workflow

Companies often require approval before JEs are posted:

1. JE saved with `approved = false`
2. Workflow sends email to controller/CFO
3. Controller reviews and approves
4. JE `approved` field set to `true` → JE is now posted to GL

---

## Journal Entry SuiteQL

```sql
-- Manual journal entries this period
SELECT t.id, t.tranId, t.tranDate, t.memo, tl.account, a.name AS accountName,
       tl.debit, tl.credit
FROM transaction t
JOIN transactionline tl ON t.id = tl.transaction
JOIN account a ON tl.account = a.id
WHERE t.type = 'Journal'
  AND t.tranDate >= TO_DATE('2024-01-01', 'YYYY-MM-DD')
ORDER BY t.tranDate DESC, tl.id ASC
```
