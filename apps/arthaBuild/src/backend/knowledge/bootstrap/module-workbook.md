---
source: SuiteScript 2.x API Reference — N/workbook Module (SuiteAnalytics)
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/workbook Module

The N/workbook module provides the SuiteAnalytics Workbook API — a programmatic interface
for creating analytics workbooks, datasets, pivots, and charts. Available in server-side
scripts only.

## Loading the Module

```javascript
define(['N/workbook'], function(workbook) { ... });
```

## Core Concepts

A Workbook consists of:
- **Dataset** — A set of records and fields (like a database view)
- **Pivot** — A cross-tabulation view over a dataset
- **Chart** — A visual representation of data
- **Table** — A flat grid view of a dataset

## Creating a Workbook

### workbook.create(options)
Creates a new workbook in memory.

```javascript
var wb = workbook.create({
  name: 'Sales Analysis',
  datasets: [myDataset],       // Array of Dataset objects
  pivots: [myPivot],           // Optional: Array of Pivot objects
  charts: [myChart],           // Optional: Array of Chart objects
  tables: [myTable]            // Optional: Array of Table objects
});

var workbookId = wb.save();   // Saves to NetSuite, returns internal ID
```

## Creating Datasets

### workbook.createDataset(options)
```javascript
var ds = workbook.createDataset({
  name: 'Sales Orders Dataset',
  type: 'salesorder',         // Record type
  columns: [
    workbook.createColumn({ fieldId: 'tranId', label: 'Order #' }),
    workbook.createColumn({ fieldId: 'entity', label: 'Customer' }),
    workbook.createColumn({ fieldId: 'amount', label: 'Amount' }),
    workbook.createColumn({ fieldId: 'tranDate', label: 'Date' }),
    workbook.createColumn({ fieldId: 'status', label: 'Status' })
  ],
  joins: [
    workbook.createJoin({
      fieldId: 'entity',         // The field to join on
      join: workbook.createJoinTable({
        type: 'customer',
        alias: 'customer'
      })
    })
  ],
  filters: [
    workbook.createCondition({
      column: workbook.createColumn({ fieldId: 'status' }),
      operator: workbook.Operator.IS,
      values: ['pendingFulfillment']
    })
  ]
});
```

## Creating Columns

### workbook.createColumn(options)
```javascript
// Simple field column
var col = workbook.createColumn({
  fieldId: 'amount',
  label: 'Order Amount'   // Optional display label
});

// Join field column
var joinCol = workbook.createColumn({
  fieldId: 'email',
  join: 'customer',
  label: 'Customer Email'
});

// Formula column
var formulaCol = workbook.createColumn({
  fieldId: 'formuladecimal',
  formula: '{amount} * 0.15',
  label: 'Commission (15%)'
});
```

## Creating Pivots

### workbook.createPivot(options)
```javascript
var pivot = workbook.createPivot({
  name: 'Sales by Customer',
  dataset: ds,
  rowAxis: workbook.createPivotAxis({
    items: [
      workbook.createPivotItem({
        column: workbook.createColumn({ fieldId: 'entity', label: 'Customer' })
      })
    ]
  }),
  columnAxis: workbook.createPivotAxis({
    items: [
      workbook.createPivotItem({
        column: workbook.createColumn({ fieldId: 'tranDate', label: 'Month' }),
        format: workbook.DatetimeHierarchy.MONTH_IN_YEAR
      })
    ]
  }),
  measures: [
    workbook.createMeasure({
      column: workbook.createColumn({ fieldId: 'amount' }),
      aggregation: workbook.Aggregation.SUM,
      label: 'Total Sales'
    }),
    workbook.createMeasure({
      column: workbook.createColumn({ fieldId: 'internalid' }),
      aggregation: workbook.Aggregation.COUNT,
      label: 'Order Count'
    })
  ]
});
```

## Aggregation Types (workbook.Aggregation)

```javascript
workbook.Aggregation.SUM      // Sum of values
workbook.Aggregation.COUNT    // Count of rows
workbook.Aggregation.MIN      // Minimum value
workbook.Aggregation.MAX      // Maximum value
workbook.Aggregation.AVG      // Average value
workbook.Aggregation.MEDIAN   // Median value
```

## Creating Charts

### workbook.createChart(options)
```javascript
var chart = workbook.createChart({
  name: 'Revenue by Month',
  dataset: ds,
  type: workbook.ChartType.BAR,
  xAxis: workbook.createChartAxis({
    items: [
      workbook.createChartItem({
        column: workbook.createColumn({ fieldId: 'tranDate' }),
        format: workbook.DatetimeHierarchy.MONTH_IN_YEAR
      })
    ]
  }),
  series: [
    workbook.createChartSeries({
      column: workbook.createColumn({ fieldId: 'amount' }),
      aggregation: workbook.Aggregation.SUM,
      label: 'Revenue'
    })
  ]
});
```

## Chart Types (workbook.ChartType)

```javascript
workbook.ChartType.BAR      // Vertical bar chart
workbook.ChartType.COLUMN   // Horizontal bar chart
workbook.ChartType.LINE     // Line chart
workbook.ChartType.AREA     // Area chart
workbook.ChartType.PIE      // Pie chart
workbook.ChartType.SCATTER  // Scatter plot
```

## Loading an Existing Workbook

### workbook.load(options)
```javascript
var existingWb = workbook.load({ id: 1234 });
// Returns Workbook object with datasets, pivots, charts accessible
```

## Operators (workbook.Operator)

```javascript
workbook.Operator.IS
workbook.Operator.IS_NOT
workbook.Operator.CONTAINS
workbook.Operator.STARTS_WITH
workbook.Operator.GREATER_THAN
workbook.Operator.LESS_THAN
workbook.Operator.BETWEEN
workbook.Operator.EMPTY
workbook.Operator.NOT_EMPTY
workbook.Operator.ANY_OF
workbook.Operator.NONE_OF
```

## Datetime Hierarchy (workbook.DatetimeHierarchy)

```javascript
workbook.DatetimeHierarchy.YEAR
workbook.DatetimeHierarchy.QUARTER_OF_YEAR
workbook.DatetimeHierarchy.MONTH_IN_YEAR
workbook.DatetimeHierarchy.WEEK_OF_YEAR
workbook.DatetimeHierarchy.DAY_OF_MONTH
```

## Governance

| Operation | Governance Units |
|-----------|-----------------|
| `workbook.create()` | 5 units |
| `workbook.load()` | 5 units |
| `wb.save()` | 10 units |
| `workbook.createDataset()` | 5 units |

## Complete Example

```javascript
define(['N/workbook'], function(workbook) {

  function createSalesWorkbook() {
    var ds = workbook.createDataset({
      name: 'Orders',
      type: 'salesorder',
      columns: [
        workbook.createColumn({ fieldId: 'tranId' }),
        workbook.createColumn({ fieldId: 'entity' }),
        workbook.createColumn({ fieldId: 'amount' }),
        workbook.createColumn({ fieldId: 'tranDate' })
      ]
    });

    var pivot = workbook.createPivot({
      name: 'Monthly Sales',
      dataset: ds,
      rowAxis: workbook.createPivotAxis({
        items: [workbook.createPivotItem({
          column: workbook.createColumn({ fieldId: 'entity' })
        })]
      }),
      columnAxis: workbook.createPivotAxis({
        items: [workbook.createPivotItem({
          column: workbook.createColumn({ fieldId: 'tranDate' }),
          format: workbook.DatetimeHierarchy.MONTH_IN_YEAR
        })]
      }),
      measures: [workbook.createMeasure({
        column: workbook.createColumn({ fieldId: 'amount' }),
        aggregation: workbook.Aggregation.SUM,
        label: 'Total'
      })]
    });

    var wb = workbook.create({
      name: 'Sales Dashboard',
      datasets: [ds],
      pivots: [pivot]
    });

    return wb.save();
  }
});
```

## Notes

- N/workbook is only available in SuiteScript 2.0+ (not 1.0)
- Workbooks are visible in the SuiteAnalytics interface under Reports > SuiteAnalytics Workbook
- Dataset filters restrict data shown in all views (pivots, charts, tables) based on that dataset
- For simple data retrieval, prefer N/search or N/query — N/workbook is for building reusable analytics views
