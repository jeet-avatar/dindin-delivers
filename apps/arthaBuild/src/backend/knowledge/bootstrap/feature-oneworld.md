---
source: Oracle NetSuite Official Documentation — OneWorld (Multi-Subsidiary)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# NetSuite OneWorld (Multi-Subsidiary)

## Overview

NetSuite OneWorld enables organizations to manage multiple legal entities (subsidiaries)
within a single NetSuite account. Each subsidiary has its own chart of accounts, currency,
tax configuration, and reporting. OneWorld provides consolidated reporting across all
subsidiaries.

**License:** OneWorld is a premium add-on feature — must be purchased separately.

**Navigation:** Setup > Company > Subsidiaries

---

## Subsidiary Field on Records

Every transaction and record type in a OneWorld account has a `subsidiary` field:

- **Transactions** (SO, PO, Invoice, etc.): subsidiary field in the header
- **Employees:** primary subsidiary assignment
- **Customers/Vendors:** subsidiary (can have multiple via "Subsidiaries" sublist)
- **Items:** subsidiary (or "Available to All Subsidiaries")
- **Bank Accounts:** per subsidiary

The subsidiary determines which entity owns the transaction for reporting.

---

## Getting Current User's Subsidiary in SuiteScript

```javascript
define(['N/runtime', 'N/log'], function(runtime, log) {
    var currentUser = runtime.getCurrentUser();
    var userSubsidiary = currentUser.subsidiary; // Internal ID of primary subsidiary

    log.debug('Subsidiary', 'User subsidiary ID: ' + userSubsidiary);
});
```

---

## Creating Transactions in a Specific Subsidiary

```javascript
define(['N/record'], function(record) {
    var so = record.create({ type: record.Type.SALES_ORDER });
    so.setValue({ fieldId: 'subsidiary', value: 2 }); // Subsidiary internal ID
    so.setValue({ fieldId: 'entity', value: 456 });    // Customer
    // ... add items
    so.save();
});
```

---

## Searching Across Multiple Subsidiaries

```javascript
define(['N/search'], function(search) {
    // Filter by specific subsidiary
    search.create({
        type: search.Type.SALES_ORDER,
        filters: [
            search.createFilter({
                name: 'subsidiary',
                operator: search.Operator.IS,
                values: ['3']  // Subsidiary internal ID
            })
        ],
        columns: [
            search.createColumn({ name: 'tranid' }),
            search.createColumn({ name: 'subsidiary' }),
            search.createColumn({ name: 'subsidiaryname', join: 'subsidiary' })
        ]
    });

    // Include all subsidiaries (no filter) — search returns all subsidiaries
    // user can see based on their role's subsidiary restrictions
});
```

---

## Intercompany Transactions

OneWorld supports transactions between subsidiaries:

### Intercompany Sales Order

```javascript
// Subsidiary A sells inventory to Subsidiary B
var icoSO = record.create({ type: record.Type.INTERCOMPANY_SALES_ORDER });
icoSO.setValue({ fieldId: 'subsidiary', value: 1 });     // Selling subsidiary
icoSO.setValue({ fieldId: 'tosubsidiary', value: 2 });   // Buying subsidiary
icoSO.setValue({ fieldId: 'entity', value: 789 });        // Intercompany customer
```

### Intercompany Transfer Order

```javascript
// Transfer inventory between subsidiaries
var ito = record.create({ type: record.Type.INTERCOMPANY_TRANSFER_ORDER });
ito.setValue({ fieldId: 'subsidiary', value: 1 });        // Source subsidiary
ito.setValue({ fieldId: 'transferlocation', value: 5 });  // Target location (other subsidiary)
```

---

## Intercompany Journal Entries

Manual intercompany JEs span two subsidiaries:

```javascript
var je = record.create({ type: record.Type.JOURNAL_ENTRY });
je.setValue({ fieldId: 'subsidiary', value: 1 });   // Primary subsidiary
je.setValue({ fieldId: 'memo', value: 'Intercompany charge Q1 2024' });

// Line 1: Subsidiary A debit
je.selectNewLine({ sublistId: 'line' });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'subsidiary', value: 1 });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 100 });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: 1000 });

// Line 2: Subsidiary B credit
je.selectNewLine({ sublistId: 'line' });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'subsidiary', value: 2 });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 200 });
je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: 1000 });

je.save();
```

---

## Consolidated Reporting

OneWorld provides:
- **Consolidated Trial Balance** — all subsidiaries combined in one report
- **Consolidated Income Statement** — revenue/expense across subsidiaries
- **Elimination entries** — removes intercompany revenue/expense for external reporting

**Navigation:** Reports > Financial Reports > (select report) > check "Consolidate" checkbox

### Elimination Rules

Configure which intercompany accounts offset each other:
Navigation: Setup > Accounting > Elimination Rules > New

Example: Subsidiary A's "Due from Subsidiaries" (asset) eliminates against
Subsidiary B's "Due to Subsidiaries" (liability).

---

## Multi-Subsidiary Customers/Vendors

Customers and vendors can transact with multiple subsidiaries:

1. Customer record > Subsidiaries sublist
2. Add each subsidiary the customer transacts with
3. When creating a transaction, choose the appropriate subsidiary

---

## Currency and Subsidiary

Each subsidiary has a default currency (functional currency).
Transactions in a subsidiary are recorded in that subsidiary's currency.
For consolidation, all subsidiaries are converted to the parent's currency
using translation adjustments.

---

## Subsidiary Hierarchy

Subsidiaries can be nested in a parent-child hierarchy:
- Parent Subsidiary: "Global Corp" (USD)
  - Child: "US Operations" (USD)
  - Child: "UK Operations" (GBP)
  - Child: "EU Operations" (EUR)

Consolidated reports roll up through the hierarchy.

Navigate: Setup > Company > Subsidiaries to view the tree structure.
