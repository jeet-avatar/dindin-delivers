---
source: Oracle NetSuite Official Documentation — Custom GL Lines Plugin
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Custom GL Lines Plugin

## Overview

The Custom GL Lines Plugin allows SuiteScript to programmatically add, modify,
or redistribute GL entries when a transaction is saved. This is the standard
mechanism for fee allocation, intercompany charges, cost center splitting,
and revenue distribution that NetSuite's standard GL impact cannot handle natively.

---

## Script Type and Setup

**Script Type:** `customglplugin`

**Navigation:** Setup > Customization > Scripts > Scripts > New > Script Type = Custom GL Plugin

---

## Full Script Structure

```javascript
/**
 * @NScriptType customglplugin
 * @NApiVersion 2.1
 */
define(['N/record', 'N/log'], function(record, log) {

    /**
     * customizeGlImpact
     * Called by NetSuite when a transaction is being saved/posted.
     * @param {Object} context - Contains transaction record and GL line access
     */
    function customizeGlImpact(context) {
        var transactionRecord = context.transactionRecord;   // The transaction being saved
        var standardLines = context.standardLines;           // Existing GL entries (read-only)
        var customLines = context.customLines;               // GL lines to add/modify

        var transactionType = transactionRecord.type;
        log.debug('customizeGlImpact', 'Processing: ' + transactionType + ' ID: ' + transactionRecord.id);

        // Only process on invoices
        if (transactionType !== 'CustInvc') return;

        // Read values from the transaction
        var total = parseFloat(transactionRecord.getValue({ fieldId: 'total' })) || 0;
        var subsidiary = transactionRecord.getValue({ fieldId: 'subsidiary' });
        var department = transactionRecord.getValue({ fieldId: 'department' });

        if (total <= 0) return;

        // Calculate a platform fee (2% of invoice total)
        var feeAmount = Math.round(total * 0.02 * 100) / 100;

        // Add custom GL line: Debit the platform fee expense
        var newLine = customLines.addNewLine();
        newLine.accountId = 600;            // Platform Fee Expense account internal ID
        newLine.debitAmount = feeAmount;
        newLine.memo = 'Platform fee: 2% of ' + total;
        newLine.subsidiaryId = subsidiary;
        newLine.departmentId = department;

        // Add offsetting credit (to accrued liabilities)
        var offsetLine = customLines.addNewLine();
        offsetLine.accountId = 300;         // Accrued Platform Fees account internal ID
        offsetLine.creditAmount = feeAmount;
        offsetLine.memo = 'Accrued platform fee';
        offsetLine.subsidiaryId = subsidiary;

        log.debug('Custom GL', 'Added $' + feeAmount + ' platform fee entries');
    }

    return { customizeGlImpact: customizeGlImpact };
});
```

---

## Context Object Properties

### `context.transactionRecord`

The transaction being saved (read-only access):

| Property/Method    | Description                                             |
|--------------------|---------------------------------------------------------|
| `type`             | Transaction type string (e.g., `'CustInvc'`, `'PurchOrd'`) |
| `id`               | Transaction internal ID                                 |
| `getValue({fieldId})` | Get field value from the transaction header           |
| `getSublistValue({sublistId, fieldId, line})` | Get line item field value         |
| `getLineCount({sublistId})` | Number of lines in a sublist                    |

### `context.standardLines`

Existing GL entries created by NetSuite's standard GL impact (read-only):

```javascript
var lineCount = standardLines.getCount();
for (var i = 0; i < lineCount; i++) {
    var line = standardLines.getLine(i);
    log.debug('Standard Line ' + i, JSON.stringify({
        accountId: line.accountId,
        debit: line.debitAmount,
        credit: line.creditAmount,
        memo: line.memo
    }));
}
```

### `context.customLines` — Adding Lines

```javascript
var line = customLines.addNewLine();
line.accountId = 600;        // Required: GL account internal ID
line.debitAmount = 100;      // Debit amount (leave credit = 0)
line.creditAmount = 0;
// -- OR --
line.creditAmount = 100;     // Credit amount
line.debitAmount = 0;

line.memo = 'Custom GL entry description';
line.subsidiaryId = 1;       // Required in OneWorld
line.departmentId = 5;       // Optional
line.classId = 3;            // Optional
line.locationId = 2;         // Optional
line.entityId = 456;         // Optional: link to customer/vendor
```

---

## Use Cases

### 1. Fee Allocation

Automatically split revenue between cost centers:

```javascript
// Invoice line 0: $10,000 revenue
// Split 70% to Sales department, 30% to Partnerships
var revenueLine = transactionRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: 0 });
var revenue = parseFloat(revenueLine);

var salesLine = customLines.addNewLine();
salesLine.accountId = 800;      // Revenue - Sales
salesLine.creditAmount = revenue * 0.70;
salesLine.departmentId = salesDeptId;

var partnerLine = customLines.addNewLine();
partnerLine.accountId = 801;    // Revenue - Partnerships
partnerLine.creditAmount = revenue * 0.30;
partnerLine.departmentId = partnerDeptId;

// Offset the standard revenue line (if needed — check standard lines first)
```

### 2. Intercompany Charge

Automatically create the intercompany receivable entry:

```javascript
var icChar = customLines.addNewLine();
icChar.accountId = 150;           // Due from Subsidiary B
icChar.debitAmount = managementFee;
icChar.subsidiaryId = 1;          // Sub A

var icPayable = customLines.addNewLine();
icPayable.accountId = 300;        // Due to Subsidiary A
icPayable.creditAmount = managementFee;
icPayable.subsidiaryId = 2;       // Sub B
```

### 3. Cost Center Splitting

Split costs across departments based on headcount allocation:

```javascript
var totalCost = 5000;
var allocations = [
    { deptId: 5, pct: 0.40 },  // Sales 40%
    { deptId: 6, pct: 0.35 },  // Engineering 35%
    { deptId: 7, pct: 0.25 }   // Marketing 25%
];

allocations.forEach(function(alloc) {
    var splitLine = customLines.addNewLine();
    splitLine.accountId = 700;   // Shared Services Expense
    splitLine.debitAmount = Math.round(totalCost * alloc.pct * 100) / 100;
    splitLine.departmentId = alloc.deptId;
    splitLine.memo = 'Cost allocation: ' + (alloc.pct * 100) + '%';
});
```

---

## Script Deployment

The Custom GL Plugin is deployed to specific transaction types:

In the Script Deployment record:
- **Record Types:** Specify which transaction types trigger the plugin
- **Status:** Released
- **Applies To All Roles:** T (typically)

The plugin is called on every save of the matching transaction type.

---

## Governance

Custom GL Plugin scripts have governance limits:
- 1000 units per execution
- 100 HTTPS calls maximum
- Cannot create/modify records (only add GL lines via customLines)
- For complex logic, do pre-computation in `standardLines` read pass, then add lines
