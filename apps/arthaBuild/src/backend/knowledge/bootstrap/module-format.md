---
source: SuiteScript 2.x API Reference — N/format Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/format Module

The N/format module converts values between JavaScript native types and NetSuite's
string representation. Use it to format values for display and parse strings from
field values or external data sources. Available in all script types.

## Loading the Module

```javascript
define(['N/format'], function(format) { ... });
```

## Core Methods

### format.format(options)
Converts a JavaScript value to NetSuite's string representation for a given type.

```javascript
// Format a Date object to NetSuite date string
var dateStr = format.format({
  value: new Date('2024-06-15'),
  type: format.Type.DATE
});
// Returns: '06/15/2024' (based on account date format setting)

// Format a number to currency
var currency = format.format({
  value: 1234.5,
  type: format.Type.CURRENCY
});
// Returns: '1,234.50'

// Format a number to percentage
var pct = format.format({
  value: 0.15,
  type: format.Type.PERCENT
});
// Returns: '15.00%'
```

### format.parse(options)
Converts a NetSuite string representation to the corresponding JavaScript value.

```javascript
// Parse date string to Date object
var dateObj = format.parse({
  value: '06/15/2024',
  type: format.Type.DATE
});
// Returns: Date object for June 15, 2024

// Parse datetime string
var dtObj = format.parse({
  value: '06/15/2024 3:30 pm',
  type: format.Type.DATETIME
});

// Parse currency string to number
var amount = format.parse({
  value: '1,234.50',
  type: format.Type.CURRENCY
});
// Returns: 1234.5 (number)

// Parse integer
var intVal = format.parse({
  value: '42',
  type: format.Type.INTEGER
});
// Returns: 42
```

## format.Type Constants

```javascript
format.Type.DATE            // Date (e.g., '06/15/2024')
format.Type.DATETIME        // Date + time (e.g., '06/15/2024 3:30 pm')
format.Type.TIME            // Time only (e.g., '3:30 pm')
format.Type.INTEGER         // Whole number (e.g., '42')
format.Type.FLOAT           // Decimal number (e.g., '3.14')
format.Type.CURRENCY        // Currency amount (e.g., '1,234.50')
format.Type.CURRENCY2       // Currency with 4 decimal places
format.Type.PERCENT         // Percentage (stored as decimal, displayed as %)
format.Type.PERCENT_RAW     // Raw percentage (stored and displayed as %)
format.Type.EMAIL           // Email address (lowercase normalization)
format.Type.PHONE           // Phone number (formatted per account settings)
format.Type.CHECKMARK       // Checkbox ('T' or 'F' ↔ boolean)
format.Type.POSTALCODE      // Postal/zip code
format.Type.ADDRESS         // Address string
```

## Governance

All format methods = **0 governance units**

## Common Patterns

### Date arithmetic with format
```javascript
require(['N/format'], function(format) {

  // Parse a field value to work with it as a Date
  var dueDateStr = rec.getValue({ fieldId: 'duedate' });
  var dueDate = format.parse({ value: dueDateStr, type: format.Type.DATE });

  // Check if overdue
  var today = new Date();
  var isOverdue = dueDate < today;

  // Add 30 days
  var extendedDate = new Date(dueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  var extendedDateStr = format.format({ value: extendedDate, type: format.Type.DATE });

  // Set the new date back on the record
  rec.setValue({ fieldId: 'duedate', value: extendedDate });
  // Note: setValue accepts Date objects directly for date fields
  // format.format is most useful for display/output
});
```

### Parse CSV date values
```javascript
require(['N/format'], function(format) {

  var csvRow = { date: '2024-03-15', amount: '5,000.00' };

  // External dates may need parsing if they match account format
  // For ISO dates (YYYY-MM-DD), use JavaScript Date constructor directly
  var parsedDate = new Date(csvRow.date + 'T00:00:00');

  // Parse currency string to number
  var parsedAmount = format.parse({
    value: csvRow.amount,
    type: format.Type.CURRENCY
  });

  log.debug({ title: 'Parsed', details: parsedDate.toISOString() + ' / ' + parsedAmount });
});
```

### Format for display in Suitelet HTML
```javascript
require(['N/format', 'N/search'], function(format, search) {

  var orders = [];
  orderSearch.run().each(function(result) {
    orders.push({
      orderNum: result.getValue({ name: 'tranId' }),
      amount: format.format({
        value: parseFloat(result.getValue({ name: 'amount' }) || '0'),
        type: format.Type.CURRENCY
      }),
      date: result.getValue({ name: 'tranDate' })
    });
    return true;
  });

  // Render in HTML table
  var html = '<table><tr><th>Order</th><th>Amount</th><th>Date</th></tr>';
  orders.forEach(function(o) {
    html += '<tr><td>' + o.orderNum + '</td><td>' + o.amount + '</td><td>' + o.date + '</td></tr>';
  });
  html += '</table>';
});
```

### Checkbox / Boolean handling
```javascript
// NetSuite checkboxes are stored as 'T'/'F'
var isApproved = rec.getValue({ fieldId: 'approved' }); // returns boolean in SuiteScript 2.x

// When dealing with raw string values (e.g., from CSV or older patterns):
var checkStr = format.format({ value: true, type: format.Type.CHECKMARK }); // 'T'
var boolVal = format.parse({ value: 'T', type: format.Type.CHECKMARK });    // true
```

## Notes

- `format.format()` uses the account's regional settings for date format and number separators
- Always use `format.parse()` to convert field values before arithmetic — raw getValue() on
  number fields returns a string in some contexts
- For date fields, `setValue()` accepts both `Date` objects and formatted date strings —
  prefer `Date` objects to avoid format dependency issues
- `format.Type.PERCENT` — NetSuite stores percentages as decimals (5% = 0.05 in the DB)
  but displays them as 5.00 in the UI via format.format
