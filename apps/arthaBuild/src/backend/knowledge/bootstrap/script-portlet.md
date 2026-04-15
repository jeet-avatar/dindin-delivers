---
source: SuiteScript 2.x API Reference — Portlet Script
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Portlet Script

Portlet scripts create custom dashboard portlets that appear on the NetSuite Home tab.
They render data, links, and lists directly on the user's dashboard without requiring
navigation to a separate page.

## Script Header (Required JSDoc)

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/url', 'N/log'], function(search, url, log) {

  function render(context) { ... }
  function onRefresh(context) { ... }
  function onDrilldown(context) { ... }

  return {
    render: render
  };
});
```

## Entry Points

### render(context)
Main entry point. Called when the portlet is displayed or refreshed.
`context.portlet` is the Portlet object used to build the portlet content.

```javascript
function render(context) {
  var portlet = context.portlet;

  // Set the portlet title
  portlet.title = 'My Pending Orders';

  // Add action links to the portlet header
  portlet.addLink({
    label: 'View All Orders',
    url: url.resolveTaskLink({ id: 'LIST_SALESORDER' })
  });
  portlet.addLink({
    label: 'Create Order',
    url: url.resolveTaskLink({ id: 'CREATE_SALESORDER' })
  });

  // Build a list-type portlet
  portlet.addColumn({ id: 'order', label: 'Order #', type: 'TEXT', link: true });
  portlet.addColumn({ id: 'customer', label: 'Customer', type: 'TEXT' });
  portlet.addColumn({ id: 'amount', label: 'Amount', type: 'TEXT', align: 'right' });
  portlet.addColumn({ id: 'date', label: 'Date', type: 'TEXT' });

  // Populate rows from a saved search
  var orderSearch = search.create({
    type: search.Type.SALES_ORDER,
    filters: [['status', search.Operator.IS, 'pendingFulfillment']],
    columns: [
      search.createColumn({ name: 'tranId' }),
      search.createColumn({ name: 'entity' }),
      search.createColumn({ name: 'amount' }),
      search.createColumn({ name: 'tranDate' })
    ]
  });

  var rowCount = 0;
  orderSearch.run().each(function(result) {
    portlet.addRow({
      order: {
        value: result.getValue({ name: 'tranId' }),
        url: url.resolveRecord({ recordType: 'salesorder', recordId: result.id })
      },
      customer: result.getText({ name: 'entity' }),
      amount: '$' + parseFloat(result.getValue({ name: 'amount' }) || 0).toFixed(2),
      date: result.getValue({ name: 'tranDate' })
    });
    rowCount++;
    return rowCount < 20; // Limit to 20 rows
  });
}
```

## context.portlet Properties and Methods

```javascript
// Properties
portlet.title         // Portlet header title (string)
portlet.html          // Set raw HTML content (use instead of columns/rows for custom HTML)

// Methods
portlet.addLink({ label, url })                     // Add header action link
portlet.addColumn({ id, label, type, link, align }) // Add table column
portlet.addRow({ [columnId]: { value, url } })      // Add table row
portlet.setRefreshableContentArea({ columnSpan })   // Mark refreshable area
```

## Column Type Values

```javascript
// Column type parameter values:
'TEXT'     // Plain text
'DATE'     // Date value
'CURRENCY' // Currency (right-aligned by default)
'INTEGER'  // Integer
'CHECKBOX' // Boolean checkbox display
```

## HTML Portlet (Custom Content)

For completely custom HTML content instead of a structured table:

```javascript
function render(context) {
  var portlet = context.portlet;
  portlet.title = 'Key Metrics';

  // Fetch metrics
  var orderCount = getOrderCount();
  var revenue = getTodayRevenue();

  // Set HTML directly
  portlet.html = [
    '<div style="padding: 10px;">',
    '<table width="100%">',
    '<tr><td><strong>Open Orders:</strong></td><td align="right">' + orderCount + '</td></tr>',
    '<tr><td><strong>Today Revenue:</strong></td><td align="right">$' + revenue.toFixed(2) + '</td></tr>',
    '</table>',
    '<p><a href="' + url.resolveTaskLink({ id: 'LIST_SALESORDER' }) + '">View Orders</a></p>',
    '</div>'
  ].join('');
}
```

### onRefresh(context)
Called when the user clicks the portlet's Refresh button. Rarely needed — the `render`
function is called again automatically on full refresh.

```javascript
function onRefresh(context) {
  log.debug({ title: 'Portlet refreshed', details: 'User triggered refresh' });
  render(context); // Re-render with fresh data
}
```

### onDrilldown(context)
Called when the user clicks a drill-down link within the portlet.

```javascript
function onDrilldown(context) {
  var customerId = context.portlet.entityId;
  // Navigate to customer detail
  redirect.toRecord({ type: 'customer', id: customerId });
}
```

## Governance

- **1,000 units per invocation**
- Portlet render runs each time the dashboard loads

## Deployment

| Setting | Description |
|---------|-------------|
| Script Type | Portlet |
| Portlet Type | LIST (tabular data) or HTML (free-form HTML) |
| Portlet Size | SMALL (1 column), MEDIUM (2 columns), LARGE (3 columns) |
| Assigned To | Users who can add this portlet to their dashboard |

## Portlet Types

```javascript
// LIST portlet — structured table with columns and rows
portlet.addColumn(...)
portlet.addRow(...)

// HTML portlet — set portlet.html directly
portlet.html = '<p>Custom content here</p>';
```

## Common Patterns

### Summary statistics portlet
```javascript
function render(context) {
  var portlet = context.portlet;
  portlet.title = 'Sales Summary — Today';

  var stats = calculateDailyStats(); // { orders: 15, amount: 45000, customers: 8 }

  portlet.html = '<table style="width:100%;padding:8px">' +
    '<tr><td>New Orders</td><td align="right"><strong>' + stats.orders + '</strong></td></tr>' +
    '<tr><td>Revenue</td><td align="right"><strong>$' + stats.amount.toLocaleString() + '</strong></td></tr>' +
    '<tr><td>Customers</td><td align="right"><strong>' + stats.customers + '</strong></td></tr>' +
    '</table>';
}
```

## Notes

- Portlet scripts require a deployed portlet before it appears in the "Personalize Dashboard" list
- Users with the appropriate role can add portlets to their Home dashboard
- Keep portlets fast — they load on the user's home page and should render in under 2 seconds
- Use `search.runPaged()` for large data sets to stay within governance limits
