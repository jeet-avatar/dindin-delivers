---
source: Oracle NetSuite Official Documentation — SuiteAnalytics
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# SuiteAnalytics (Workbook, Connect, SuiteQL)

## Overview

SuiteAnalytics is NetSuite's unified analytics platform with three components:
1. **SuiteAnalytics Workbook** — in-app pivot tables, charts, and datasets
2. **SuiteAnalytics Connect** — JDBC/ODBC driver for external BI tools
3. **SuiteQL** — SQL-like query language for programmatic data access

---

## SuiteAnalytics Workbook

**Navigation:** Reports > New Workbook (or via Analytics > New Workbook)

A Workbook consists of:
- **Dataset** — defines the data source: record type, fields, joins, filters
- **Pivot** — drag-and-drop analysis of dataset rows/columns/measures
- **Chart** — visual representation linked to a dataset (bar, line, pie, area)

### Creating a Dataset

1. Reports > New Workbook > Start with Dataset
2. Choose Record Type (e.g., Transaction, Customer, Item)
3. Add Fields (columns), configure Joins to related records
4. Apply Filters to limit scope
5. Save the dataset — it becomes the data source for pivots and charts

### Creating a Pivot

1. Open a Workbook, click "New Pivot"
2. Select a Dataset as the data source
3. Drag fields to: Rows, Columns, Measures (SUM/COUNT/AVG)
4. Apply filters — interactive drill-down
5. Export to Excel or CSV via Actions > Export

### Creating a Chart

1. Open a Workbook, click "New Chart"
2. Select a Dataset
3. Choose chart type: Bar, Line, Pie, Area, Combo
4. Map X-axis, Y-axis (measure), and optional series (color grouping)
5. Charts auto-update when dataset data changes

---

## SuiteAnalytics Connect (JDBC/ODBC)

Connect allows external BI tools (Tableau, Power BI, Excel, etc.) to query
NetSuite data via standard SQL.

### JDBC Connection URL

```
jdbc:netsuite://{accountId}.connect.api.netsuite.com:1708;ServerDataSource=NetSuite.com;UID={email};PWD={password};RoleID={roleId};AccountID={accountId}
```

Replace `{accountId}` with your NetSuite account ID (e.g., `1234567`).

**Authentication:** Uses NetSuite credentials. For security, create a dedicated
Connect user with a role that has only necessary read permissions.

### Available Tables via Connect

| Table Category     | Example Tables                                              |
|--------------------|-------------------------------------------------------------|
| Transactions       | transaction, transactionline, transactionAccountingLine     |
| CRM                | customer, vendor, employee, contact                         |
| Items              | item, inventorynumber, inventorylocation                    |
| Financials         | account, accountperiod, currency, exchangerate              |
| Custom Records     | customrecord_{scriptId} (available after creation)          |

### SuiteQL via Connect

All SuiteQL queries available via JDBC are also available via REST API (see below).

---

## SuiteQL via REST API

Direct SuiteQL queries via HTTP — useful for integrations.

**Endpoint:**
```
POST https://{accountId}.suiteql.api.netsuite.com/query/v1/suiteql
```

**Authentication:** Token-Based Authentication (TBA) required (OAuth 1.0a header).

**Request body:**
```json
{
  "q": "SELECT id, tranId, entity, total FROM transaction WHERE type = 'SalesOrd' AND status = 'SalesOrd:B' LIMIT 10"
}
```

**Response:**
```json
{
  "links": [...],
  "count": 10,
  "hasMore": false,
  "items": [
    {"id": "1234", "tranId": "SO-1001", "entity": "456", "total": "5000.00"}
  ],
  "offset": 0,
  "totalResults": 10
}
```

**Pagination with OFFSET:**
```json
{"q": "SELECT id, tranId FROM transaction WHERE type = 'SalesOrd' ORDER BY id LIMIT 1000 OFFSET 1000"}
```

---

## N/workbook API (SuiteScript 2.1)

The `N/workbook` module allows programmatic creation of workbooks.

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/workbook', 'N/query'], function(workbook, query) {
    function execute(context) {
        // Create a dataset
        var dataset = workbook.createDataset({
            recordType: 'transaction',
            columns: [
                workbook.createColumn({ fieldId: 'tranid', label: 'Transaction ID' }),
                workbook.createColumn({ fieldId: 'entity', label: 'Customer' }),
                workbook.createColumn({ fieldId: 'amount', label: 'Amount' })
            ],
            condition: workbook.createCondition({
                operator: workbook.Operator.EQUAL,
                fields: ['type'],
                values: ['SalesOrd']
            })
        });

        // Create a pivot
        var pivot = workbook.createPivot({
            id: 'custpivot_sales_by_customer',
            label: 'Sales by Customer',
            datasetColumnAlias: [{ alias: 'entity', datasetColumn: 'entity' }],
            rowAxis: { fields: ['entity'] },
            columnAxis: {},
            measures: [{ measure: { fieldId: 'amount', aggregation: 'SUM' } }]
        });

        // Create a workbook
        var wb = workbook.create({
            name: 'Sales Overview',
            pivots: [pivot]
        });
        wb.save();
    }
    return { execute: execute };
});
```

---

## N/query Module for SuiteQL (SuiteScript 2.1)

```javascript
define(['N/query'], function(query) {
    var result = query.runSuiteQL({
        query: 'SELECT id, tranId, total FROM transaction WHERE type = \'SalesOrd\' LIMIT 10'
    });

    result.results.forEach(function(row) {
        log.debug('Row', JSON.stringify(row.values));
    });
});
```

---

## Common Analytics Use Cases

| Use Case                  | Recommended Tool                     |
|---------------------------|--------------------------------------|
| Ad-hoc executive reports  | SuiteAnalytics Workbook (Pivot)      |
| Operational dashboards    | Saved Search portlets                |
| External BI (Tableau/PBI) | SuiteAnalytics Connect (JDBC)        |
| Integration data pulls    | SuiteQL REST API                     |
| Script-generated reports  | N/query + N/workbook                 |

---

## Governance Notes

- SuiteQL via REST: no governance units consumed per query (counted outside SuiteScript)
- `N/query.runSuiteQL()` in SuiteScript: counts against script governance (10 units/call)
- Workbook pivots: UI-only, no governance impact
- Connect queries: run as the authenticated user's role permissions
