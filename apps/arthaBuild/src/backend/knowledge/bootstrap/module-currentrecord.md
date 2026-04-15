---
source: SuiteScript 2.x API Reference — N/currentRecord Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/currentRecord Module

The N/currentRecord module provides access to the record currently displayed in the NetSuite
UI. It is available **only in client-side scripts** (Client Scripts). It is NOT available in
server-side scripts (User Event, Scheduled, Map/Reduce, Suitelet, RESTlet).

## Key Distinction

| Module | Context | Access |
|--------|---------|--------|
| N/currentRecord | Client scripts | Record open in the browser UI |
| N/record | Server-side scripts | Load any record from the database |

N/currentRecord does NOT make a server round-trip — it reads the record data already in the page.

## Loading the Module

```javascript
// SuiteScript 2.1 (Client Script)
define(['N/currentRecord'], function(currentRecord) { ... });
```

## Getting the Current Record

```javascript
// Inside any client script entry point:
function pageInit(context) {
  var rec = currentRecord.get();
  // rec is a CurrentRecord object
}
```

`currentRecord.get()` returns the `CurrentRecord` object — a live reference to the record
the user has open in the browser.

## Body Field Methods

### getValue(options)
```javascript
var entityId = rec.getValue({ fieldId: 'entity' });
var amount = rec.getValue({ fieldId: 'amount' });
var isApproved = rec.getValue({ fieldId: 'approved' }); // returns boolean for checkboxes
```

### setValue(options)
```javascript
rec.setValue({ fieldId: 'memo', value: 'Updated memo' });
rec.setValue({ fieldId: 'custbody_myfield', value: 'Custom field value' });
```

### getText(options)
Returns the display text of a select/list field instead of its internal ID.
```javascript
var statusText = rec.getText({ fieldId: 'status' });
// Returns e.g. "Pending Fulfillment" instead of "B"
```

### setText(options)
Sets a field value by display text.
```javascript
rec.setText({ fieldId: 'terms', text: 'Net 30' });
```

## Sublist Methods

### getSublistValue(options)
Gets the value of a field on a specific sublist line.
```javascript
var itemId = rec.getSublistValue({
  sublistId: 'item',
  fieldId: 'item',
  line: 0   // 0-indexed
});
```

### setCurrentSublistValue(options)
Sets the value on the **currently selected** sublist line.
```javascript
rec.setCurrentSublistValue({
  sublistId: 'item',
  fieldId: 'quantity',
  value: 5
});
```

### getCurrentSublistValue(options)
Gets the value from the **currently selected** sublist line.
```javascript
var qty = rec.getCurrentSublistValue({
  sublistId: 'item',
  fieldId: 'quantity'
});
```

### selectLine(options)
Selects a specific line in a sublist for editing.
```javascript
rec.selectLine({ sublistId: 'item', line: 2 });
```

### selectNewLine(options)
Selects a new blank line at the end of the sublist.
```javascript
rec.selectNewLine({ sublistId: 'item' });
```

### commitLine(options)
Commits the currently edited line back to the sublist.
```javascript
rec.commitLine({ sublistId: 'item' });
```

### cancelLine(options)
Cancels changes to the currently edited line.
```javascript
rec.cancelLine({ sublistId: 'item' });
```

### getLineCount(options)
Returns the number of lines in a sublist.
```javascript
var lines = rec.getLineCount({ sublistId: 'item' });
```

### removeLine(options)
Removes a line from the sublist.
```javascript
rec.removeLine({ sublistId: 'item', line: 1 });
```

## Record Metadata

```javascript
var recType = rec.type;       // e.g. 'salesorder'
var recId = rec.id;           // internal ID (number or null for new records)
var isDynamic = rec.isDynamic; // always true for currentRecord
```

## Common Client Script Pattern

### fieldChanged Entry Point
```javascript
function fieldChanged(context) {
  var rec = context.currentRecord;
  var fieldId = context.fieldId;

  if (fieldId === 'entity') {
    // Retrieve the selected customer's internal ID
    var customerId = rec.getValue({ fieldId: 'entity' });
    log.debug({ title: 'Customer changed', details: customerId });
  }
}
```

### saveRecord Entry Point (Validation)
```javascript
function saveRecord(context) {
  var rec = context.currentRecord;
  var memo = rec.getValue({ fieldId: 'memo' });
  if (!memo) {
    alert('Memo is required before saving.');
    return false;  // Prevents save
  }
  return true;
}
```

### Adding a Line in pageInit
```javascript
function pageInit(context) {
  var rec = context.currentRecord;
  if (context.mode === 'create') {
    rec.selectNewLine({ sublistId: 'item' });
    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 100 });
    rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
    rec.commitLine({ sublistId: 'item' });
  }
}
```

## Modules Available in Client Scripts

Client scripts can load these N/ modules (server-side modules are NOT available):
- `N/currentRecord` — the current UI record
- `N/url` — resolve URLs
- `N/ui/dialog` — dialog boxes
- `N/ui/message` — in-page messages
- `N/format` — format/parse values
- `N/runtime` — current user, execution context
- `N/search` — client-side search (limited governance)
- `N/record` — read-only lookups ONLY (cannot create/save in client context)

NOT available in client scripts:
- `N/https` — all HTTP calls are server-side only
- `N/file` — server-side only
- `N/email` — server-side only
- `N/task` — server-side only

## Notes

- N/currentRecord always reflects the **live state of the form** — changes via setValue are
  immediately visible in the UI without requiring a page reload.
- Calling `rec.save()` is NOT valid on a CurrentRecord — saves are triggered by the user
  clicking Save (which fires `saveRecord` entry point).
- For reading field values without triggering field-change logic, use `getSublistValue` for
  non-selected lines and `getCurrentSublistValue` for the active editing line.
