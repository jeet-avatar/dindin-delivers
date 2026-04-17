---
source: SuiteScript 2.x API Reference — Journal Entry Record Schema
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Journal Entry Record (record.Type.JOURNAL_ENTRY)

Internal record type ID: `'journalentry'`

Journal Entries record manual accounting entries directly to the general ledger.
They must be balanced (total debits = total credits).

## Record Constant

```javascript
record.Type.JOURNAL_ENTRY   // 'journalentry'
search.Type.JOURNAL_ENTRY   // 'journalentry'
```

## Body Fields

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `tranId` | Journal # | Text | System-assigned. Format: JE-XXXX |
| `tranDate` | Date | Date | Entry date |
| `subsidiary` | Subsidiary | Select | Required for OneWorld |
| `currency` | Currency | Select | Transaction currency |
| `exchangeRate` | Exchange Rate | Float | FX rate to base currency |
| `memo` | Memo | Text | Journal description/purpose |
| `approved` | Approved | Checkbox | Whether entry is approved |
| `approvalStatus` | Approval Status | Select | Pending/Approved/Rejected |
| `isBookSpecific` | Book Specific | Checkbox | True = applies to one accounting book only |
| `accountingbook` | Accounting Book | Select | For multi-book entries |
| `tosubsidiary` | To Subsidiary | Select | For intercompany entries |
| `reversalDate` | Reversal Date | Date | Date for automatic reversal |
| `reversalDefer` | Defer Reversal | Checkbox | Defer the reversal entry |
| `custbody_*` | Custom Fields | Various | Custom body fields |

## Line (line) Sublist

Each journal entry must have at least two lines. Total debits must equal total credits.

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `account` | Account | Select | GL account internal ID (required) |
| `debit` | Debit | Currency | Debit amount (use OR credit, not both) |
| `credit` | Credit | Currency | Credit amount |
| `entity` | Name | Select | Customer/Vendor/Employee for AR/AP accounts |
| `memo` | Memo | Text | Line-level description |
| `department` | Department | Select | Department classification |
| `location` | Location | Select | Location classification |
| `class` | Class | Select | Class classification |
| `taxcode` | Tax Code | Select | Tax code (if applicable) |
| `taxrate1` | Tax Rate | Percent | Tax percentage |
| `amortizationsched` | Amort. Schedule | Select | Amortization schedule ID |
| `schedule` | Amort. Start Date | Date | Start of amortization |
| `scheduleperiod` | Periods | Integer | Number of amortization periods |

## Creating a Journal Entry

### Simple two-line entry
```javascript
var je = record.create({
  type: record.Type.JOURNAL_ENTRY,
  isDynamic: true
});

je.setValue({ fieldId: 'tranDate', value: new Date() });
je.setValue({ fieldId: 'memo', value: 'Prepaid expense adjustment January 2024' });
je.setValue({ fieldId: 'approved', value: true });

// Debit line — Debit Prepaid Expenses
je.selectNewLine({ sublistId: 'line' });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: prepaidExpenseAccountId });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: 5000 });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: 'Prepaid insurance - Jan' });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: financeDeptId });
je.commitLine({ sublistId: 'line' });

// Credit line — Credit Cash/Bank
je.selectNewLine({ sublistId: 'line' });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: cashAccountId });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: 5000 });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: 'Payment for insurance' });
je.commitLine({ sublistId: 'line' });

var jeId = je.save();
log.audit({ title: 'JE created', details: 'ID: ' + jeId });
```

### Multi-line entry with entity
```javascript
var je = record.create({
  type: record.Type.JOURNAL_ENTRY,
  isDynamic: true
});

je.setValue({ fieldId: 'tranDate', value: new Date() });
je.setValue({ fieldId: 'memo', value: 'Salary accrual' });

// Salary expense lines per department
var salaryLines = [
  { dept: 10, amount: 15000 },
  { dept: 20, amount: 12000 },
  { dept: 30, amount: 8000 }
];

var totalSalary = 0;
salaryLines.forEach(function(line) {
  je.selectNewLine({ sublistId: 'line' });
  je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: salaryExpenseAccountId });
  je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: line.amount });
  je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: line.dept });
  je.commitLine({ sublistId: 'line' });
  totalSalary += line.amount;
});

// Single offsetting credit
je.selectNewLine({ sublistId: 'line' });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: salaryPayableAccountId });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: totalSalary });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: 'Accrued salaries payable' });
je.commitLine({ sublistId: 'line' });

var jeId = je.save();
```

### Intercompany entry (OneWorld)
```javascript
var je = record.create({
  type: record.Type.JOURNAL_ENTRY,
  isDynamic: true
});
je.setValue({ fieldId: 'subsidiary', value: parentSubsidiaryId });
je.setValue({ fieldId: 'tosubsidiary', value: childSubsidiaryId });
je.setValue({ fieldId: 'tranDate', value: new Date() });
// ... add debit/credit lines as normal ...
```

## Searching Journal Entries

```javascript
var jeSearch = search.create({
  type: search.Type.JOURNAL_ENTRY,
  filters: [
    ['tranDate', search.Operator.WITHIN, 'thisMonth'],
    'AND',
    ['approved', search.Operator.IS, 'T']
  ],
  columns: [
    search.createColumn({ name: 'tranId' }),
    search.createColumn({ name: 'tranDate' }),
    search.createColumn({ name: 'memo' }),
    search.createColumn({ name: 'account', join: 'line' }),
    search.createColumn({ name: 'debit', join: 'line' }),
    search.createColumn({ name: 'credit', join: 'line' })
  ]
});
```

## Multi-Book Journal Entries

For NetSuite OneWorld with Multiple Accounting Books:

```javascript
// isBookSpecific = true → entry in specific book only
je.setValue({ fieldId: 'isBookSpecific', value: true });
je.setValue({ fieldId: 'accountingbook', value: secondaryBookId });
```

## Common Search Filters

| Field | Operator | Use Case |
|-------|----------|----------|
| `tranDate` | WITHIN | Date range filtering |
| `approved` | IS | 'T' for approved, 'F' for pending |
| `subsidiary` | IS | Filter by subsidiary |
| `account` | IS | Filter by specific GL account |
| `department` | IS | Filter by department |

## Notes

- Journal entries must balance: `SUM(debit) = SUM(credit)`
- The `approved` checkbox controls whether the entry impacts financial reports
- Unapproved entries appear as pending and don't affect the trial balance
- Automatic reversals: set `reversalDate` to create an offsetting entry on that date
- Intercompany JEs require OneWorld and proper intercompany account mapping
