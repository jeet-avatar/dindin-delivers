---
source: SuiteScript 2.x API Reference — N/ui/dialog Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/ui/dialog Module

The N/ui/dialog module displays modal dialog boxes in the NetSuite UI. All dialog methods
are **Promise-based** and available in **Client Scripts only**. Not available server-side.

## Loading the Module

```javascript
define(['N/ui/dialog'], function(dialog) { ... });
```

## Core Methods

### dialog.alert(options)
Displays an alert dialog with an OK button. Returns a Promise that resolves when OK is clicked.

```javascript
dialog.alert({
  title: 'Order Saved',
  message: 'Your sales order has been successfully created.'
}).then(function() {
  // Executes after user clicks OK
  log.debug({ title: 'Alert dismissed', details: 'User acknowledged' });
});
```

**Parameters:**
- `title` (string): Required. Dialog title
- `message` (string): Required. Dialog body message

**Returns:** Promise<void> — resolves when user clicks OK

### dialog.confirm(options)
Displays a confirmation dialog with OK and Cancel buttons. Returns a Promise that resolves
to `true` (OK) or `false` (Cancel).

```javascript
dialog.confirm({
  title: 'Delete Record?',
  message: 'Are you sure you want to delete this order? This action cannot be undone.'
}).then(function(confirmed) {
  if (confirmed) {
    // User clicked OK
    log.debug({ title: 'Confirmed', details: 'Proceeding with delete' });
    deleteRecord();
  } else {
    // User clicked Cancel
    log.debug({ title: 'Cancelled', details: 'User cancelled delete' });
  }
});
```

**Returns:** Promise<boolean> — `true` if OK, `false` if Cancel

### dialog.prompt(options)
Displays an input dialog with a text field, OK, and Cancel buttons.

```javascript
dialog.prompt({
  title: 'Enter Reason',
  message: 'Please provide a reason for the rejection:',
  defaultValue: ''   // Optional: pre-filled input value
}).then(function(userInput) {
  if (userInput !== null) {
    // User clicked OK — userInput contains the entered text
    log.debug({ title: 'Reason entered', details: userInput });
    rec.setValue({ fieldId: 'custbody_rejection_reason', value: userInput });
  } else {
    // User clicked Cancel — userInput is null
    log.debug({ title: 'Prompt cancelled', details: 'No reason entered' });
  }
});
```

**Parameters:**
- `title` (string): Required. Dialog title
- `message` (string): Required. Prompt message
- `defaultValue` (string): Optional. Pre-filled text in the input field

**Returns:** Promise<string|null> — the entered text if OK, `null` if Cancel

## Promise Chain Patterns

### Chaining dialogs
```javascript
dialog.confirm({
  title: 'Confirm Action',
  message: 'Process all selected orders?'
}).then(function(confirmed) {
  if (!confirmed) return;

  return dialog.prompt({
    title: 'Processing Note',
    message: 'Enter a processing note (optional):',
    defaultValue: 'Batch processed on ' + new Date().toLocaleDateString()
  });
}).then(function(note) {
  if (note !== undefined) {  // undefined means the chain was skipped (cancelled)
    processOrders(note || '');
  }
});
```

### With async/await (SuiteScript 2.1)
```javascript
// @NApiVersion 2.1

async function saveRecord(context) {
  var rec = context.currentRecord;
  var totalAmount = rec.getValue({ fieldId: 'amount' });

  if (totalAmount > 10000) {
    var confirmed = await dialog.confirm({
      title: 'Large Order Warning',
      message: 'This order exceeds $10,000. Proceed?'
    });
    if (!confirmed) return false; // Cancel the save
  }

  return true; // Allow the save
}
```

### Error handling with .catch()
```javascript
dialog.alert({
  title: 'Warning',
  message: 'Your session is about to expire.'
}).then(function() {
  refreshSession();
}).catch(function(err) {
  log.error({ title: 'Dialog error', details: err.message });
});
```

## Common Use Cases

### Validation in saveRecord
```javascript
function saveRecord(context) {
  var rec = context.currentRecord;
  var supervisor = rec.getValue({ fieldId: 'supervisor' });

  if (!supervisor) {
    dialog.alert({
      title: 'Validation Error',
      message: 'Supervisor is required before saving.'
    });
    return false; // Prevent save
  }

  return true;
}
```

### Confirm before deleting a line
```javascript
function validateDelete(context) {
  var rec = context.currentRecord;
  var lineItem = rec.getCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'item'
  });

  if (lineItem) {
    dialog.confirm({
      title: 'Remove Line',
      message: 'Remove line item "' + lineItem + '"?'
    }).then(function(confirmed) {
      // Note: validateDelete must return synchronously
      // For truly blocking behavior, use native window.confirm (not recommended)
    });
    return true; // Allow delete (dialog is async, can't block here)
  }
  return true;
}
```

### Prompt for input in fieldChanged
```javascript
function fieldChanged(context) {
  if (context.fieldId === 'custbody_status' &&
      context.currentRecord.getValue({ fieldId: 'custbody_status' }) === 'REJECTED') {

    dialog.prompt({
      title: 'Rejection Reason',
      message: 'Enter the rejection reason:'
    }).then(function(reason) {
      if (reason) {
        context.currentRecord.setValue({
          fieldId: 'custbody_rejection_reason',
          value: reason
        });
      }
    });
  }
}
```

## Notes

- All dialog methods are **asynchronous** — they return Promises and do NOT block code execution
- In `saveRecord`, returning `false` prevents the save synchronously — dialog.confirm cannot be
  awaited unless using `async/await` in SuiteScript 2.1
- For simple synchronous blocking alerts, `window.alert()` and `window.confirm()` work in browsers
  but are NOT recommended in SuiteScript (blocked by some browser policies)
- Dialogs are modal — they block all UI interaction until dismissed
- Multiple dialogs cannot be open simultaneously — queue them sequentially with `.then()` chains
