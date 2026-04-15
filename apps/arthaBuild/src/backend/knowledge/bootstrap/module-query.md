---
source: SuiteScript 2.x API Reference — N/query Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/query Module

The N/query module provides two approaches to querying NetSuite data:
1. **SuiteQL** — Direct SQL-like queries against NetSuite's analytics data source
2. **Structured Query Builder** — Programmatic query construction via API

Available in server-side scripts only.

## Loading the Module

```javascript
define(['N/query'], function(query) { ... });
```

## SuiteQL — Direct SQL Execution

SuiteQL is NetSuite's SQL dialect for the analytics data source. It supports standard SQL
SELECT syntax including JOINs, aggregates, subqueries, and aliases.

### query.runSuiteQL(options)
Runs a SuiteQL string and returns all results immediately.

```javascript
var resultSet = query.runSuiteQL({
  query: 'SELECT id, tranId, entity, amount FROM transaction WHERE type = ? AND status = ?',
  params: ['SalesOrd', 'B']  // parameterized queries recommended
});

resultSet.results.forEach(function(result) {
  var id = result.values[0];
  var tranId = result.values[1];
  var entity = result.values[2];
  var amount = result.values[3];
  log.debug({ title: 'Row', details: tranId + ' / ' + amount });
});
```

- Returns: `SuiteQLResultSet` with `.results` array
- Each result has `.values` array (positional, matching SELECT column order)
- `.asMappedResults()` returns array of objects with column-name keys

### query.runSuiteQLPaged(options)
Paginated version for large result sets.

```javascript
var pagedResult = query.runSuiteQLPaged({
  query: 'SELECT id, companyName, email FROM customer WHERE isinactive = ?',
  params: ['F'],
  pageSize: 1000
});

log.debug({ title: 'Total rows', details: pagedResult.count });

pagedResult.pageRanges.forEach(function(range) {
  var page = pagedResult.fetch({ index: range.index });
  page.data.forEach(function(row) {
    log.debug({ title: 'Customer', details: JSON.stringify(row.values) });
  });
});
```

## SuiteQL Column Aliases — asMappedResults()

```javascript
var results = query.runSuiteQL({
  query: 'SELECT id, tranId AS orderNumber, amount AS totalAmount FROM transaction WHERE type = ?',
  params: ['SalesOrd']
}).asMappedResults();

results.forEach(function(row) {
  log.debug({ title: 'Order', details: row.orderNumber + ' = ' + row.totalAmount });
});
```

## Common SuiteQL Tables

| Table Name | NetSuite Record |
|-----------|-----------------|
| `transaction` | All transaction types (filter by `type` column) |
| `transactionline` | Transaction line items |
| `customer` | Customer records |
| `vendor` | Vendor records |
| `employee` | Employee records |
| `item` | All item types |
| `account` | Chart of accounts |
| `department` | Departments |
| `location` | Locations |
| `subsidiary` | Subsidiaries |
| `currency` | Currencies |
| `customrecord_{scriptId}` | Custom record type |
| `customfield` | Custom field definitions |

## Transaction Type Values

```sql
-- Common `type` column values in the transaction table:
-- 'SalesOrd'   = Sales Order
-- 'PurchOrd'   = Purchase Order
-- 'CustInvc'   = Invoice
-- 'VendBill'   = Vendor Bill
-- 'Journal'    = Journal Entry
-- 'CashSale'   = Cash Sale
-- 'CustCred'   = Credit Memo
-- 'ItemShip'   = Item Fulfillment
-- 'ItemRcpt'   = Item Receipt
-- 'Estimate'   = Estimate
-- 'CustPymt'   = Customer Payment
-- 'VendPymt'   = Vendor Payment
```

## SuiteQL JOIN Examples

```javascript
// Join transaction with customer
var sql = `
  SELECT t.id, t.tranId, t.amount, c.companyName, c.email
  FROM transaction t
  INNER JOIN customer c ON t.entity = c.id
  WHERE t.type = 'SalesOrd'
    AND t.status = 'B'
  ORDER BY t.trandate DESC
`;

// Join transactionline with item
var linesSql = `
  SELECT tl.transaction, tl.linesequencenumber, tl.item, tl.quantity, tl.netamount, i.itemid
  FROM transactionline tl
  INNER JOIN item i ON tl.item = i.id
  WHERE tl.transaction IN (
    SELECT id FROM transaction WHERE type = 'SalesOrd' AND status = 'B'
  )
`;
```

## Structured Query Builder

The structured API is an alternative to raw SuiteQL strings. Useful when building queries
dynamically from user input.

```javascript
// Create a query
var q = query.create({ type: query.Type.CUSTOMER });

// Add a condition
var condition = q.createCondition({
  fieldId: 'isinactive',
  operator: query.Operator.IS,
  values: [false]
});
q.condition = condition;

// Add columns
q.columns = [
  q.createColumn({ fieldId: 'id' }),
  q.createColumn({ fieldId: 'companyname' }),
  q.createColumn({ fieldId: 'email' })
];

// Run
var result = q.run();
result.results.forEach(function(row) {
  log.debug({ title: 'Customer', details: JSON.stringify(row.values) });
});
```

## query.Operator Constants

```javascript
query.Operator.IS
query.Operator.IS_NOT
query.Operator.CONTAINS
query.Operator.DOES_NOT_CONTAIN
query.Operator.STARTS_WITH
query.Operator.GREATER_THAN
query.Operator.LESS_THAN
query.Operator.GREATER_THAN_OR_EQUAL_TO
query.Operator.LESS_THAN_OR_EQUAL_TO
query.Operator.EMPTY
query.Operator.NOT_EMPTY
query.Operator.ANY_OF
query.Operator.NONE_OF
query.Operator.BETWEEN
query.Operator.NOT_BETWEEN
```

## SuiteQL vs. N/search Comparison

| Feature | N/query (SuiteQL) | N/search |
|---------|------------------|---------|
| Syntax | SQL-like | Structured API |
| JOINs | Native SQL JOIN | Via join parameter |
| Aggregates | SUM, COUNT, etc. | search.Summary types |
| Saved searches | No | Yes (search.load) |
| Best for | Reporting, complex JOINs | Dynamic filters, saved searches |
| Governance | 10 units per page fetch | 10 units + 1 per 1000 results |
| Max rows | No built-in limit (use paging) | 4000 without paging |

## Governance

- `query.runSuiteQL()` = 10 units
- `query.runSuiteQLPaged()` = 10 units per page fetch
- `query.create().run()` = 10 units

## Error Handling

```javascript
try {
  var results = query.runSuiteQL({
    query: 'SELECT id FROM transaction WHERE type = ?',
    params: ['SalesOrd']
  });
} catch (e) {
  log.error({ title: 'SuiteQL Error', details: e.message + '\n' + e.stack });
}
```

Common errors:
- `INVALID_COLUMN` — column name doesn't exist in the table
- `SYNTAX_ERROR` — malformed SQL
- `REQUIRED_CONTEXT` — query.runSuiteQL called from client script (not allowed)
