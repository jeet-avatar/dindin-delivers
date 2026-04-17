---
source: SuiteScript 2.x API Reference — N/ui/message Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/ui/message Module

The N/ui/message module displays non-blocking notification banners within the NetSuite UI.
Messages appear at the top of the page and can auto-dismiss or be manually dismissed.
Available in **Client Scripts only**.

## Loading the Module

```javascript
define(['N/ui/message'], function(message) { ... });
```

## Creating Messages

### message.create(options)
Creates a message notification object.

```javascript
var msg = message.create({
  type: message.Type.CONFIRMATION,  // Message type
  title: 'Order Saved',             // Optional title
  message: 'Sales Order SO-1234 has been created successfully.',  // Body text
  duration: 3000                    // Optional: auto-hide after 3 seconds (ms)
});
```

**Parameters:**
- `type` (message.Type): Required. Visual style of the message
- `title` (string): Optional. Bold title displayed above the message
- `message` (string): Optional. Body text of the notification
- `duration` (number): Optional. Auto-hide delay in milliseconds. Omit for persistent messages.

**Returns:** Message object

## message.Type Constants

```javascript
message.Type.CONFIRMATION   // Green — success/completion messages
message.Type.INFORMATION    // Blue — informational notices
message.Type.WARNING        // Yellow — caution/advisory messages
message.Type.ERROR          // Red — error/failure messages
```

## Message Object Methods

### msg.show()
Displays the message banner in the UI.

```javascript
msg.show();
```

### msg.hide()
Hides and removes the message banner.

```javascript
msg.hide();
```

## Common Patterns

### Show success message after saving
```javascript
function saveRecord(context) {
  // Validate the record
  var rec = context.currentRecord;
  var orderId = rec.getValue({ fieldId: 'tranId' });

  if (!orderId) {
    var errorMsg = message.create({
      type: message.Type.ERROR,
      title: 'Validation Failed',
      message: 'Order number is required.',
      duration: 5000
    });
    errorMsg.show();
    return false; // Prevent save
  }

  return true; // Allow save
}

function pageInit(context) {
  if (context.mode === 'edit') {
    var infoMsg = message.create({
      type: message.Type.INFORMATION,
      title: 'Editing Mode',
      message: 'You are now editing this record. Click Save when done.',
      duration: 5000
    });
    infoMsg.show();
  }
}
```

### Show and auto-dismiss a confirmation
```javascript
function onApproveButtonClick(context) {
  var rec = context.currentRecord;

  // Show progress message while processing
  var processingMsg = message.create({
    type: message.Type.INFORMATION,
    title: 'Processing...',
    message: 'Approving order, please wait.'
    // No duration — stays until manually hidden
  });
  processingMsg.show();

  // Simulate async operation
  setTimeout(function() {
    processingMsg.hide();

    var successMsg = message.create({
      type: message.Type.CONFIRMATION,
      title: 'Approved',
      message: 'Order has been approved successfully.',
      duration: 4000  // Auto-dismiss after 4 seconds
    });
    successMsg.show();
  }, 2000);
}
```

### Warning on field change
```javascript
function fieldChanged(context) {
  if (context.fieldId === 'custbody_ship_date') {
    var rec = context.currentRecord;
    var shipDate = rec.getValue({ fieldId: 'custbody_ship_date' });
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    if (shipDate && shipDate < today) {
      message.create({
        type: message.Type.WARNING,
        title: 'Past Date',
        message: 'The selected ship date is in the past.',
        duration: 6000
      }).show();
    }
  }
}
```

### Inline feedback during validation
```javascript
var validationMessage;

function validateField(context) {
  if (context.fieldId === 'custbody_discount_percent') {
    var rec = context.currentRecord;
    var discount = rec.getValue({ fieldId: 'custbody_discount_percent' });

    if (discount > 50) {
      if (validationMessage) validationMessage.hide();
      validationMessage = message.create({
        type: message.Type.WARNING,
        title: 'High Discount',
        message: 'Discount exceeds 50%. Manager approval may be required.',
        duration: 8000
      });
      validationMessage.show();
    }
  }
  return true; // Allow the field change
}
```

## Multiple Simultaneous Messages

Multiple messages stack at the top of the page. Call `.show()` on multiple message objects
to display them simultaneously.

```javascript
function pageInit(context) {
  var rec = context.currentRecord;

  // Check multiple conditions
  if (!rec.getValue({ fieldId: 'entity' })) {
    message.create({
      type: message.Type.WARNING,
      message: 'Customer is not set.',
      duration: 0  // Persistent
    }).show();
  }

  if (!rec.getValue({ fieldId: 'memo' })) {
    message.create({
      type: message.Type.INFORMATION,
      message: 'Consider adding a memo for tracking.',
      duration: 5000
    }).show();
  }
}
```

## Governance

All message operations = **0 governance units**

## Notes

- Messages are non-blocking — unlike `dialog.alert()`, they do NOT prevent user interaction
- Set `duration: 0` or omit it for persistent messages that require manual dismissal
- Messages with `duration` auto-hide; no explicit `.hide()` is needed for timed messages
- `.hide()` can be called before the auto-dismiss timer expires
- Message display position is fixed at the top of the NetSuite page content area
- Available only in Client Scripts — use `context.response.write()` for Suitelet-based notifications
