---
source: SuiteScript 2.x API Reference — N/search Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/search Module

The N/search module enables creating, loading, and running NetSuite searches (Saved Searches)
programmatically. Available in all server-side and client-side script types.

## Loading the Module

```javascript
define(['N/search'], function(search) { ... });
```

## Core Methods

### search.create(options)
Creates a new search dynamically (not saved to NetSuite).

```javascript
var mySearch = search.create({
  type: search.Type.SALES_ORDER,
  filters: [
    ['status', search.Operator.IS, 'pendingFulfillment'],
    'AND',
    ['entity', search.Operator.IS, '100']
  ],
  columns: [
    search.createColumn({ name: 'tranId', label: 'Order Number' }),
    search.createColumn({ name: 'entity', label: 'Customer' }),
    search.createColumn({ name: 'amount', label: 'Amount' })
  ]
});
```

### search.load(options)
Loads an existing saved search by ID or script ID.

```javascript
// Load by internal ID
var saved = search.load({ id: 1234 });

// Load by script ID (recommended — portable across accounts)
var saved = search.load({ id: 'customsearch_my_saved_search' });
```

### search.createFilter(options)
Creates a SearchFilter object for complex filter expressions.

```javascript
var filter = search.createFilter({
  name: 'status',
  operator: search.Operator.IS,
  values: ['pendingFulfillment']
});
```

### search.createColumn(options)
Creates a SearchColumn object.

```javascript
var col = search.createColumn({
  name: 'amount',
  join: null,           // optional — join to related record
  summary: search.Summary.SUM,  // optional — aggregate function
  formula: null,        // optional — formula string
  label: 'Total Amount' // optional — column label
});
```

## Filter Operators (search.Operator)

```javascript
search.Operator.IS              // Exact match (string/number/date)
search.Operator.IS_NOT          // Not equal
search.Operator.CONTAINS        // String contains substring
search.Operator.DOES_NOT_CONTAIN
search.Operator.STARTS_WITH     // String starts with
search.Operator.DOES_NOT_START_WITH
search.Operator.WITHIN          // Date within a period
search.Operator.NOT_WITHIN
search.Operator.AFTER           // Date after
search.Operator.BEFORE          // Date before
search.Operator.ON              // Date on exact date
search.Operator.NOT_ON
search.Operator.GREATER_THAN    // Number > value
search.Operator.GREATER_THAN_OR_EQUAL_TO
search.Operator.LESS_THAN
search.Operator.LESS_THAN_OR_EQUAL_TO
search.Operator.EMPTY           // Field is empty/null
search.Operator.NOT_EMPTY
search.Operator.ANY_OF          // In list of values
search.Operator.NONE_OF         // Not in list
```

## Summary Types (search.Summary)

```javascript
search.Summary.COUNT   // COUNT(*)
search.Summary.SUM     // SUM(field)
search.Summary.MIN     // MIN(field)
search.Summary.MAX     // MAX(field)
search.Summary.AVG     // AVG(field)
search.Summary.GROUP   // GROUP BY field
```

## Running Searches

### search.run() — ResultSet
Returns a ResultSet for up to 4000 rows.

```javascript
var resultSet = mySearch.run();

// Iterate with .each() callback — stops when callback returns false
resultSet.each(function(result) {
  var id = result.id;
  var type = result.recordType;
  var ordNum = result.getValue({ name: 'tranId' });
  var custText = result.getText({ name: 'entity' });
  log.debug({ title: 'Result', details: ordNum + ' - ' + custText });
  return true; // return true to continue; false to stop
});

// Get a range of results (0-based, max 1000 per getRange call)
var results = resultSet.getRange({ start: 0, end: 100 });
results.forEach(function(result) {
  log.debug({ title: 'Order', details: result.getValue({ name: 'tranId' }) });
});
```

### search.runPaged(options) — PagedData
Recommended for large result sets. Avoids governance issues with runPaged.

```javascript
var pagedSearch = mySearch.runPaged({ pageSize: 1000 }); // max 1000

log.debug({ title: 'Total count', details: pagedSearch.count });

pagedSearch.pageRanges.forEach(function(pageRange) {
  var page = pagedSearch.fetch({ index: pageRange.index });
  page.data.forEach(function(result) {
    var val = result.getValue({ name: 'amount' });
    // process result...
  });
});
```

## Result Object Methods

```javascript
result.id                           // Internal ID of the result record (string)
result.recordType                   // Record type string
result.getValue({ name: 'field' })  // Get field value
result.getValue({ name: 'field', join: 'customer' })  // Get join field value
result.getText({ name: 'field' })   // Get display text for list/select fields
result.getValue({ name: 'field', summary: search.Summary.SUM })  // Summary value
```

## Search Types (search.Type)

```javascript
search.Type.TRANSACTION        // All transaction types
search.Type.SALES_ORDER        // 'salesorder'
search.Type.PURCHASE_ORDER     // 'purchaseorder'
search.Type.INVOICE            // 'invoice'
search.Type.ESTIMATE           // 'estimate'
search.Type.CUSTOMER           // 'customer'
search.Type.VENDOR             // 'vendor'
search.Type.EMPLOYEE           // 'employee'
search.Type.ITEM               // 'item'
search.Type.INVENTORY_ITEM     // 'inventoryitem'
search.Type.JOURNAL_ENTRY      // 'journalentry'
search.Type.VENDOR_BILL        // 'vendorbill'
search.Type.CUSTOMER_PAYMENT   // 'customerpayment'
search.Type.OPPORTUNITY        // 'opportunity'
search.Type.WORK_ORDER         // 'workorder'
search.Type.PROJECT            // 'job'
search.Type.SUPPORT_CASE       // 'supportcase'
search.Type.CUSTOM_RECORD      // + type: 'customrecord_xxxx'
```

## Join Searches

Access fields from related records using the `join` parameter.

```javascript
var searchWithJoin = search.create({
  type: search.Type.SALES_ORDER,
  columns: [
    search.createColumn({ name: 'tranId' }),
    search.createColumn({ name: 'email', join: 'customer' }),      // Customer email
    search.createColumn({ name: 'phone', join: 'customer' }),      // Customer phone
    search.createColumn({ name: 'name', join: 'salesperson' })     // Sales rep name
  ]
});
```

## Formula Columns

Use NetSuite formula syntax for computed columns.

```javascript
var formulaCol = search.createColumn({
  name: 'formulacurrency',
  formula: '{amount} * 1.1',   // 10% markup
  label: 'Amount with Markup'
});

var textFormulaCol = search.createColumn({
  name: 'formulatext',
  formula: "CONCAT({firstname}, ' ', {lastname})",
  label: 'Full Name'
});
```

## Filter Expression Syntax

Two equivalent ways to write filters:

```javascript
// Array shorthand
filters: [
  ['amount', search.Operator.GREATER_THAN, '1000'],
  'AND',
  ['status', search.Operator.ANY_OF, ['pendingFulfillment', 'partiallyFulfilled']],
  'AND',
  [['subsidiary', search.Operator.IS, '1'], 'OR', ['subsidiary', search.Operator.IS, '2']]
]

// SearchFilter objects
filters: [
  search.createFilter({ name: 'amount', operator: search.Operator.GREATER_THAN, values: ['1000'] }),
  search.createFilter({ name: 'status', operator: search.Operator.ANY_OF, values: ['pendingFulfillment'] })
]
```

## Governance

- `search.create()` = 0 units
- `search.run()` = 10 units + 1 per 1000 results
- `search.runPaged()` = 10 units per page fetch
- `search.load()` = 5 units

## Common Patterns

### Count Records
```javascript
var countSearch = search.create({
  type: search.Type.CUSTOMER,
  filters: [['isinactive', search.Operator.IS, 'F']],
  columns: [search.createColumn({ name: 'internalid', summary: search.Summary.COUNT })]
});
var count = countSearch.run().getRange({ start: 0, end: 1 })[0].getValue({
  name: 'internalid',
  summary: search.Summary.COUNT
});
```

### Search Custom Record
```javascript
var customSearch = search.create({
  type: 'customrecord_my_record',
  filters: [['custrecord_status', search.Operator.IS, '1']],
  columns: [
    search.createColumn({ name: 'name' }),
    search.createColumn({ name: 'custrecord_amount' })
  ]
});
```
