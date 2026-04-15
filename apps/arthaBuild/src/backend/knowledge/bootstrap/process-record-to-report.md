---
source: Oracle NetSuite Official Documentation — Record to Report (Period Close)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Record to Report (R2R) — Period Close Process

## Overview

Record to Report (R2R) encompasses the financial closing process — reconciling
all accounts, posting period-end entries, and producing financial reports.
NetSuite uses Accounting Periods to control which periods are open for posting.

---

## Accounting Periods

**Navigation:** Setup > Accounting > Manage Accounting Periods

Accounting Periods define fiscal calendars. Each period has:
- **Start Date / End Date** — the date range
- **Status:** Open (can post), Locked (admin only), Closed (no posting)
- **Period Type:** Month, Quarter, Year

### Period Status Flow

```
Created → Open → Locked (period-end review) → Closed (archived)
```

**Locked:** Only administrators can post with override. Use for period-end review.
**Closed:** No transactions can be posted. Prior period adjustments require reopening.

---

## Period Close Checklist

Standard month-end close steps:

### 1. Reconcile Bank Accounts

- Import bank statement
- Match transactions in NetSuite to bank statement lines
- Investigate and resolve unmatched items
- Post adjusting entries for bank fees, interest, errors

**Navigation:** Transactions > Financial > Reconcile Bank Statement

### 2. Reconcile Accounts Receivable

- Review A/R Aging report — identify old outstanding invoices
- Apply unapplied payments
- Write off uncollectable balances (bad debt)
- Ensure AR sub-ledger matches GL control account

**Navigation:** Reports > Customers > A/R Aging

### 3. Reconcile Accounts Payable

- Review A/P Aging — identify bills due this period
- Ensure all received goods are billed (accrue unbilled receipts if needed)
- Apply unapplied vendor credits
- Ensure AP sub-ledger matches GL control account

**Navigation:** Reports > Vendors > A/P Aging

### 4. Post Depreciation

- Run depreciation for all fixed assets
- **Navigation:** Transactions > Financial > Post Depreciation

### 5. Post Prepaid Amortization

- Amortize prepaid expenses to the current period
- **Navigation:** Transactions > Financial > Amortize Prepaid Expenses

### 6. Revenue Recognition

- Run revenue recognition for all active arrangements
- **Navigation:** Transactions > Financial > Run Revenue Recognition

### 7. Review GL

- Run Trial Balance report — verify all accounts balance
- Review unusual items, large variances from prior period
- Approve journal entries that are pending

### 8. Lock the Period

- Prevent new postings to the period
- **Navigation:** Setup > Accounting > Manage Accounting Periods > Edit > Set to Locked

### 9. Close the Period

- After final review, close the period
- **Navigation:** Same as above — set status to Closed

---

## Posting an Adjusting Journal Entry

```javascript
define(['N/record'], function(record) {
    var je = record.create({ type: record.Type.JOURNAL_ENTRY, isDynamic: true });
    je.setValue({ fieldId: 'subsidiary', value: 1 });
    je.setValue({ fieldId: 'trandate', value: new Date() });
    je.setValue({ fieldId: 'memo', value: 'Month-end accrual — prepaid rent' });
    je.setValue({ fieldId: 'approved', value: true }); // Auto-approve

    // Debit Rent Expense
    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 500 }); // Rent Expense
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: 5000 });
    je.commitLine({ sublistId: 'line' });

    // Credit Prepaid Rent
    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 200 }); // Prepaid Rent
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: 5000 });
    je.commitLine({ sublistId: 'line' });

    je.save();
});
```

---

## Financial Reports

| Report                    | Navigation                                        |
|---------------------------|---------------------------------------------------|
| Trial Balance             | Reports > Financial > Trial Balance               |
| Balance Sheet             | Reports > Financial > Balance Sheet               |
| Income Statement          | Reports > Financial > Income Statement            |
| Cash Flow Statement       | Reports > Financial > Cash Flow Statement         |
| General Ledger Detail     | Reports > Financial > General Ledger Detail       |
| Budget vs Actual          | Reports > Financial > Budget vs Actual            |

---

## Consolidated Reporting (OneWorld)

For multi-subsidiary organizations:
- All financial reports have a "Consolidate" option
- Selects which subsidiaries to include
- Converts each subsidiary's currency to the consolidation currency
- Eliminates intercompany transactions

**Navigation:** Reports > Financial > [Any report] > check "Consolidate" checkbox

---

## Intercompany Elimination

Setup: Setup > Accounting > Elimination Rules > New

Define:
- Source subsidiary (e.g., Sub A)
- Source account (e.g., Due From Sub B)
- Eliminating subsidiary (e.g., Sub B)
- Eliminating account (e.g., Due To Sub A)

NetSuite creates elimination journal entries when running consolidated reports.

---

## Locking Periods (SuiteScript)

```javascript
define(['N/accountingperiod'], function(accountingperiod) {
    // Lock accounting period
    var period = accountingperiod.getOperatingPeriod({ date: new Date('2024-01-31') });
    accountingperiod.lockFiscalYear({
        fiscalYear: period.parent.id
    });
});
```

---

## Period Close Governance

- When a period is Closed, any script that tries to save a transaction to that period
  gets an error: `PERIOD_LOCKED`
- To post to a closed period (rare): reopen → post → re-close
- Use `isLocked` check before posting from scripts:

```javascript
define(['N/accountingperiod'], function(accountingperiod) {
    var period = accountingperiod.getOperatingPeriod({ date: tranDate });
    if (period.isLocked || period.isClosed) {
        throw error.create({ name: 'PERIOD_CLOSED', message: 'Cannot post to a locked period' });
    }
});
```
