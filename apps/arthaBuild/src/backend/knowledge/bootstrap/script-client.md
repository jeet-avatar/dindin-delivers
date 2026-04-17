---
source: SuiteScript 2.x API Reference — Client Script
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Client Script

Client Scripts run in the user's browser and respond to UI events — page loads, field
changes, record saves, and sublist manipulations. They interact with the current record
via N/currentRecord (not N/record).

## Script Header (Required JSDoc)

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/url', 'N/ui/dialog', 'N/ui/message', 'N/format', 'N/log'], function(currentRecord, url, dialog, message, format, log) {

  function pageInit(context) { ... }
  function fieldChanged(context) { ... }
  function saveRecord(context) { ... }
  function lineInit(context) { ... }
  function validateField(context) { ... }
  function validateLine(context) { ... }
  function validateInsert(context) { ... }
  function validateDelete(context) { ... }
  function postSourcing(context) { ... }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    saveRecord: saveRecord
  };
});
```

## Entry Points

### pageInit(context)
Runs when the record page finishes loading in the browser.

```javascript
function pageInit(context) {
  var rec = context.currentRecord;
  var mode = context.mode; // 'create', 'edit', 'copy', 'view'

  if (mode === 'create') {
    // Set default values for new records
    rec.setValue({ fieldId: 'custbody_source', value: 'WEB' });
    message.create({
      type: message.Type.INFORMATION,
      message: 'Fill in all required fields before saving.',
      duration: 5000
    }).show();
  }

  if (mode === 'view') {
    // View mode — don't try to modify fields
    log.debug({ title: 'Record loaded (view)', details: rec.id });
  }
}
```

### fieldChanged(context)
Fires when a field value changes in the UI (including sublist fields).

```javascript
function fieldChanged(context) {
  var rec = context.currentRecord;
  var fieldId = context.fieldId;
  var sublistId = context.sublistId; // non-null for sublist fields
  var line = context.line;           // non-null for sublist fields

  if (fieldId === 'entity') {
    // Customer changed — populate related fields
    var customerId = rec.getValue({ fieldId: 'entity' });
    if (customerId) {
      // Use N/search (allowed in client scripts, limited governance)
      populateCustomerDefaults(rec, customerId);
    }
  }

  if (fieldId === 'quantity' && sublistId === 'item') {
    // Recalculate extended price when quantity changes
    var qty = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
    var rate = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate' });
    log.debug({ title: 'Line total', details: qty * rate });
  }
}
```

### saveRecord(context)
Fires when the user clicks Save. Return `false` to cancel the save with a message.

```javascript
function saveRecord(context) {
  var rec = context.currentRecord;

  // Validate required fields
  var entity = rec.getValue({ fieldId: 'entity' });
  if (!entity) {
    dialog.alert({ title: 'Validation Error', message: 'Customer is required.' });
    return false; // Cancel save
  }

  // Validate sublist has at least one line
  var lineCount = rec.getLineCount({ sublistId: 'item' });
  if (lineCount === 0) {
    dialog.alert({ title: 'Validation Error', message: 'At least one line item is required.' });
    return false;
  }

  return true; // Allow save
}
```

### lineInit(context)
Fires when a new sublist line is selected (before the user edits it).

```javascript
function lineInit(context) {
  var rec = context.currentRecord;
  var sublistId = context.sublistId;

  if (sublistId === 'item') {
    // Set default quantity for new lines
    rec.setCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'quantity',
      value: 1
    });
  }
}
```

### validateField(context)
Fires before a field value change is committed. Return `false` to reject the new value.

```javascript
function validateField(context) {
  var rec = context.currentRecord;
  var fieldId = context.fieldId;
  var sublistId = context.sublistId;

  if (fieldId === 'quantity' && sublistId === 'item') {
    var newQty = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
    if (newQty < 0) {
      message.create({ type: message.Type.ERROR, message: 'Quantity cannot be negative.', duration: 3000 }).show();
      return false; // Reject the value
    }
  }

  return true; // Accept the value
}
```

### validateLine(context)
Fires before a sublist line is committed (when user moves off the line). Return `false` to reject.

```javascript
function validateLine(context) {
  var rec = context.currentRecord;
  var sublistId = context.sublistId;

  if (sublistId === 'item') {
    var item = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
    if (!item) {
      dialog.alert({ title: 'Line Error', message: 'Item is required on each line.' });
      return false;
    }
  }
  return true;
}
```

### validateInsert(context)
Fires before a new sublist line is inserted. Return `false` to prevent.

```javascript
function validateInsert(context) {
  var rec = context.currentRecord;
  var lineCount = rec.getLineCount({ sublistId: context.sublistId });
  if (lineCount >= 50) {
    dialog.alert({ title: 'Limit Reached', message: 'Maximum 50 line items allowed.' });
    return false;
  }
  return true;
}
```

### validateDelete(context)
Fires before a sublist line is deleted. Return `false` to prevent.

```javascript
function validateDelete(context) {
  // context.line is the line index being deleted
  return true; // Allow delete
}
```

### postSourcing(context)
Fires after a field is sourced (auto-populated by a lookup, e.g., when item is set and
description is auto-filled). Good for adjusting sourced values.

```javascript
function postSourcing(context) {
  if (context.fieldId === 'item' && context.sublistId === 'item') {
    // After item is selected and description is sourced, override description
    rec.setCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'description',
      value: 'Custom description override'
    });
  }
}
```

## context Properties (All Events)

```javascript
context.currentRecord    // N/currentRecord object (NOT N/record)
context.mode             // 'create', 'edit', 'copy', 'view' (pageInit only)
context.fieldId          // Changed/validated field ID
context.sublistId        // Sublist ID (null for body fields)
context.line             // Sublist line index (fieldChanged, validateField)
context.column           // Column name (sublist field events)
```

## Available N/ Modules in Client Scripts

```javascript
// Available:
'N/currentRecord'  // Current UI record
'N/url'            // URL resolution
'N/ui/dialog'      // Modal dialogs (Promise-based)
'N/ui/message'     // In-page notifications
'N/format'         // Format/parse values
'N/runtime'        // Current user, execution context
'N/search'         // Saved search (limited)

// NOT available:
'N/https'          // Server-side only
'N/file'           // Server-side only
'N/email'          // Server-side only
'N/task'           // Server-side only
'N/sftp'           // Server-side only
```

## Governance

- **1,000 units per page load** — NOT per event
- Each event handler shares the same 1,000-unit budget for the page
- Keep client scripts lightweight — avoid heavy searches in fieldChanged

## Deployment

- Attach the Client Script deployment to specific record types
- Only one client script deployment per record type per script (but multiple scripts can deploy to same record type)
- `context.mode` in pageInit: `'view'` = read-only, `'edit'` = editing, `'create'` = new record
