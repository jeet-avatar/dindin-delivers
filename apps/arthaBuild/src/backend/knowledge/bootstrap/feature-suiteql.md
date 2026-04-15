---
source: Oracle NetSuite Official Documentation — SuiteQL
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# SuiteQL

## Overview

SuiteQL is NetSuite's SQL dialect for querying the NetSuite data model. It supports
standard SQL constructs: SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT, OFFSET.

SuiteQL is available via:
1. **SuiteScript 2.1** — `N/query` module (`query.runSuiteQL()`)
2. **REST API** — `POST /query/v1/suiteql`
3. **SuiteAnalytics Connect** — JDBC/ODBC driver

---

## Core SQL Syntax

### Basic SELECT

```sql
SELECT id, tranId, entity, total
FROM transaction
WHERE type = 'SalesOrd'
  AND status = 'SalesOrd:B'
ORDER BY tranDate DESC
LIMIT 100
```

### JOINs

```sql
-- Inner join: transactions with customer company name
SELECT t.id, t.tranId, c.companyName, t.total
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE t.type = 'SalesOrd'
  AND t.status = 'SalesOrd:B'
```

```sql
-- Transaction lines with item name
SELECT t.id, t.tranId, tl.item, i.itemId, tl.quantity, tl.amount
FROM transaction t
JOIN transactionline tl ON t.id = tl.transaction
JOIN item i ON tl.item = i.id
WHERE t.type = 'SalesOrd'
```

---

## Key Tables

| Table Name                | Description                                      |
|---------------------------|--------------------------------------------------|
| transaction               | All transaction headers (SO, PO, Invoice, etc.)  |
| transactionline           | Line items for transactions                       |
| transactionAccountingLine | GL line entries for transactions                  |
| customer                  | Customer records                                 |
| vendor                    | Vendor records                                   |
| item                      | Item/Product records                             |
| employee                  | Employee records                                 |
| account                   | Chart of accounts                                |
| department                | Departments                                      |
| subsidiary                | Subsidiaries (OneWorld)                          |
| location                  | Locations/warehouses                             |
| class                     | Class classification                             |
| currency                  | Currency master                                  |
| customrecord_{scriptId}   | Custom record types (replace scriptId with name) |

---

## Transaction Types (type field values)

| Type Field Value | Record Type              |
|-----------------|--------------------------|
| SalesOrd        | Sales Order              |
| PurchOrd        | Purchase Order           |
| CustInvc        | Invoice                  |
| VendBill        | Vendor Bill              |
| CustPymt        | Customer Payment         |
| VendPymt        | Vendor Payment           |
| Journal         | Journal Entry            |
| ItemShip        | Item Fulfillment         |
| ItemRcpt        | Item Receipt             |
| CustCred        | Credit Memo              |
| VendCred        | Vendor Credit            |
| Estimate        | Estimate/Quote           |
| ReturnAuth      | Return Authorization     |

---

## Custom Fields in SuiteQL

```sql
-- Custom body field on transaction
SELECT id, tranId, custbody_approval_status, custbody_territory
FROM transaction
WHERE type = 'SalesOrd'

-- Custom column field on transaction line
SELECT tl.id, tl.quantity, tl.custcol_line_notes
FROM transactionline tl
WHERE tl.transaction = 12345

-- Custom fields on customer
SELECT id, companyName, custentity_account_tier
FROM customer
WHERE custentity_account_tier = 'Enterprise'
```

---

## Date Functions

```sql
-- Convert string to date
WHERE tranDate >= TO_DATE('2024-01-01', 'YYYY-MM-DD')

-- Truncate to month (for grouping)
SELECT TRUNC(tranDate, 'MONTH') AS month, SUM(total) AS revenue
FROM transaction
WHERE type = 'CustInvc'
GROUP BY TRUNC(tranDate, 'MONTH')
ORDER BY month

-- Current date
WHERE tranDate = SYSDATE

-- Date arithmetic (N days ago)
WHERE tranDate >= SYSDATE - 30
```

---

## Aggregation and Grouping

```sql
-- Sales by customer
SELECT c.companyName, SUM(t.total) AS totalSales, COUNT(t.id) AS orderCount
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE t.type = 'SalesOrd'
  AND t.status IN ('SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E')
GROUP BY c.companyName
ORDER BY totalSales DESC

-- Monthly revenue
SELECT TRUNC(tranDate, 'MONTH') AS month, SUM(total) AS revenue
FROM transaction
WHERE type = 'CustInvc'
GROUP BY TRUNC(tranDate, 'MONTH')
```

---

## Pagination (LIMIT/OFFSET)

Max 5000 rows per query. Use LIMIT + OFFSET for pagination:

```sql
-- Page 1
SELECT id, tranId FROM transaction WHERE type = 'SalesOrd' ORDER BY id LIMIT 1000 OFFSET 0
-- Page 2
SELECT id, tranId FROM transaction WHERE type = 'SalesOrd' ORDER BY id LIMIT 1000 OFFSET 1000
```

---

## Using SuiteQL in SuiteScript 2.1

```javascript
/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/log'], function(query, log) {
    function runQuery() {
        // Basic query — returns ResultSet
        var resultSet = query.runSuiteQL({
            query: "SELECT id, tranId, total FROM transaction WHERE type = 'SalesOrd' LIMIT 10"
        });

        // Iterate results
        resultSet.results.forEach(function(row) {
            var id = row.values[0];
            var tranId = row.values[1];
            var total = row.values[2];
            log.debug('Row', id + ' | ' + tranId + ' | ' + total);
        });

        // Get as mapped objects
        var mapped = resultSet.asMappedResults();
        mapped.forEach(function(obj) {
            log.debug('Mapped', obj.tranid + ': ' + obj.total);
        });
    }
    return { runQuery: runQuery };
});
```

---

## Using SuiteQL via REST API

```
POST https://{accountId}.suiteql.api.netsuite.com/query/v1/suiteql
Authorization: OAuth realm="...", ...
Content-Type: application/json
prefer: transient

Body:
{
  "q": "SELECT id, tranId, total FROM transaction WHERE type = 'SalesOrd' LIMIT 10"
}
```

Response format:
```json
{
  "links": [],
  "count": 10,
  "hasMore": false,
  "items": [{"id": "123", "tranid": "SO-001", "total": "1500.00"}],
  "offset": 0,
  "totalResults": 10
}
```

---

## Common SuiteQL Queries

### Open Sales Orders

```sql
SELECT t.id, t.tranId, c.companyName, t.total, t.tranDate
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE t.type = 'SalesOrd'
  AND t.status = 'SalesOrd:B'
ORDER BY t.tranDate DESC
```

### Unpaid Invoices (Overdue)

```sql
SELECT t.id, t.tranId, c.companyName, t.total, t.amountRemaining, t.dueDate
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE t.type = 'CustInvc'
  AND t.amountRemaining > 0
  AND t.dueDate < SYSDATE
ORDER BY t.dueDate ASC
```

### Custom Record Query

```sql
SELECT id, custrecord_project_name, custrecord_status, custrecord_budget
FROM customrecord_project_tracker
WHERE custrecord_status = 'Active'
ORDER BY custrecord_budget DESC
```

---

## SuiteQL vs N/search

| Feature             | SuiteQL                              | N/search                                 |
|---------------------|--------------------------------------|------------------------------------------|
| Syntax              | Standard SQL                         | Structured API (filters array)           |
| JOINs               | Yes — full SQL JOINs                 | Limited (join fields in columns)         |
| Aggregation         | Full GROUP BY support                | Summary types (SUM, COUNT, etc.)         |
| Custom fields       | Yes (`custbody_`, `custcol_` etc.)   | Yes                                      |
| Best for            | Reporting, data exports, analytics   | Dynamic filters, saved searches, UI      |
| Max rows            | 5000 per call (paginate with OFFSET) | 1000 per page (use runPaged())           |
| Governance units    | 10 per runSuiteQL call               | 10 per search.run call                   |
| Available via REST  | Yes (suiteql endpoint)               | Yes (records endpoint)                   |
