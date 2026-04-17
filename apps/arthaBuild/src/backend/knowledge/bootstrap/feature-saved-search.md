---
source: Oracle NetSuite Official Documentation — Saved Searches
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Saved Searches

## Overview

Saved Searches are NetSuite's primary ad-hoc reporting and data retrieval tool.
They can be used standalone, embedded as portlets on dashboards, used as workflow triggers,
and referenced in SuiteScript.

**Navigation:**
- Reports > Saved Searches > All Saved Searches > New
- Lists > Search > Saved Searches (alternate path)
- OR: directly from any list view using the "Customize" button

---

## Creating a Saved Search

### Step 1: Select Record Type

Choose what records to search: Transaction, Customer, Item, Employee, Custom Record, etc.

### Step 2: Criteria Tab (Filters)

Filters narrow which records appear in results.

| Filter Component  | Description                                          |
|-------------------|------------------------------------------------------|
| Field             | The field to filter on (body field or join field)    |
| Join              | Link to related record (e.g., Customer fields on SO) |
| Operator          | is, is not, contains, starts with, greater than, etc.|
| Value             | The comparison value                                 |

**AND/OR logic:** Multiple filters on the Criteria tab are ANDed by default.
Use the "Summary" tab for OR conditions in summary searches.

**Example criteria:**
- Type | is | Sales Order
- Status | is | Billed
- Ship Date | is within | this month

### Step 3: Results Tab (Columns)

Define which fields appear in the results.

| Column Component  | Description                                              |
|-------------------|----------------------------------------------------------|
| Field             | The field to display                                     |
| Join              | Pull from related record                                 |
| Summary Type      | COUNT, SUM, MIN, MAX, AVG, GROUP (for summary searches)  |
| Formula           | Computed column (formula text + type)                    |
| Label             | Custom column header text                               |
| Sort              | Ascending/Descending                                     |

---

## Formula Columns

Formulas create computed columns in search results.

**Numeric formula:**
```
Formula (Numeric): {amount} * 1.1
Label: Amount + 10%
```

**Text formula (CASE/WHEN):**
```
Formula (Text): CASE WHEN {status} = 'A' THEN 'Open' WHEN {status} = 'B' THEN 'Pending' ELSE 'Closed' END
Label: Status Label
```

**Date formula:**
```
Formula (Date): {trandate} + 30
Label: Due Date (+30 days)
```

**Conditional flag:**
```
Formula (Numeric): CASE WHEN {amount} > 10000 THEN 1 ELSE 0 END
Label: Is Large Order
```

---

## Summary Searches vs Detail Searches

| Feature            | Detail Search                    | Summary Search                       |
|--------------------|----------------------------------|--------------------------------------|
| Rows               | One row per matching record      | Grouped rows (GROUP BY behavior)     |
| Summary Types      | Not applicable                   | SUM, COUNT, AVG, MIN, MAX, GROUP     |
| Use Case           | List all transactions            | Aggregate totals by customer/period  |
| Filters tab        | Standard criteria                | Standard criteria                    |
| Summary Filters    | N/A                              | Filter on aggregated values (HAVING) |

To create a Summary Search: check "Summary Type" on one or more columns and set to GROUP for
the dimension fields and SUM/COUNT for the measures.

---

## Email Alerts

Saved searches can send email notifications when records match:

- **On Record Create:** send email when a new record meets criteria
- **On Record Edit:** send email when an existing record is changed
- **On Record Delete:** notify on deletion
- **Scheduled Digest:** daily or weekly email of all matching records

Set up via: Search results page > Email tab > check "Send Email Alerts"

---

## Using in SuiteScript 2.1

```javascript
define(['N/search', 'N/log'], function(search, log) {
    // Load a saved search by scriptId
    var mySavedSearch = search.load({
        id: 'customsearch_open_sales_orders'
    });

    // Modify filters dynamically
    mySavedSearch.filters.push(
        search.createFilter({
            name: 'entity',
            operator: search.Operator.IS,
            values: ['123']  // Customer internal ID
        })
    );

    // Run and iterate
    mySavedSearch.run().each(function(result) {
        log.debug('SO', result.id + ' | ' + result.getValue({name: 'tranid'}));
        return true; // continue iteration
    });

    // Paginated (for large result sets)
    var pagedData = mySavedSearch.runPaged({ pageSize: 1000 });
    pagedData.pageRanges.forEach(function(pageRange) {
        var page = pagedData.fetch({ index: pageRange.index });
        page.data.forEach(function(result) {
            log.debug('Page result', result.getValue({name: 'tranid'}));
        });
    });
});
```

---

## Creating Searches Programmatically

```javascript
define(['N/search'], function(search) {
    var so_search = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
            search.createFilter({ name: 'mainline', operator: search.Operator.IS, values: ['T'] }),
            search.createFilter({ name: 'status', operator: search.Operator.IS, values: ['SalesOrd:B'] })
        ],
        columns: [
            search.createColumn({ name: 'tranid', label: 'SO Number' }),
            search.createColumn({ name: 'entity', label: 'Customer' }),
            search.createColumn({
                name: 'formulanumeric',
                formula: '{quantity} - {quantitybackordered}',
                label: 'Qty Available'
            }),
            search.createColumn({
                name: 'amount',
                summary: search.Summary.SUM,
                label: 'Total Amount'
            })
        ]
    });

    // Save for reuse
    so_search.save();

    // Or run without saving
    var results = so_search.run().getRange({ start: 0, end: 100 });
});
```

---

## Joined Searches

Chain through relationships to access fields on related records:

```javascript
search.create({
    type: 'salesorder',
    columns: [
        search.createColumn({ name: 'tranid' }),
        // Join to customer record
        search.createColumn({ name: 'phone', join: 'customer' }),
        search.createColumn({ name: 'email', join: 'customer' }),
        // Join to line item → item record
        search.createColumn({ name: 'salesdescription', join: 'item' })
    ]
});
```

**Join depth:** Customer > Transactions > Line Items > Item (chained joins)

---

## Publishing and Portlets

Saved searches can be:
- **Published to roles:** available to specific roles as a list view
- **Dashboard portlet:** displayed on dashboards (Reports > New Portlet)
- **KPI:** numeric result displayed as a KPI tile
- **Reminder:** record count displayed as a reminder on the dashboard

Navigate to: search > Audience tab > check "Available as Portlet" to enable portlet use.

---

## Governance

- `search.load()`: 5 governance units
- `search.create()`: 10 governance units
- `search.run().each()`: 10 units per 1000 results iterated
- `search.runPaged()`: recommended for large datasets — better memory management
