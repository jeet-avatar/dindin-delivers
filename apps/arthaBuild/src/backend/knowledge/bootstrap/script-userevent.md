---
source: SuiteScript 2.x API Reference — User Event Script
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# User Event Script

User Event scripts execute when users or processes interact with NetSuite records through
the UI, web services, or CSV import. They run at key points in the record save lifecycle.

## Script Header (Required JSDoc)

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/search'], function(record, log, search) {

  function beforeLoad(context) { ... }
  function beforeSubmit(context) { ... }
  function afterSubmit(context) { ... }

  return {
    beforeLoad: beforeLoad,
    beforeSubmit: beforeSubmit,
    afterSubmit: afterSubmit
  };
});
```

## Entry Points

### beforeLoad(context)
Runs BEFORE the record is loaded into the UI or returned via web services.
Use to modify the form, add custom fields, hide fields, or redirect.

```javascript
function beforeLoad(context) {
  // Only modify the form when loading in the UI
  if (context.type === context.UserEventType.VIEW || context.type === context.UserEventType.EDIT) {
    var form = context.form;
    // Add a custom field to the form
    form.addField({ id: 'custpage_note', type: 'text', label: 'Processing Note' });
    // Hide a standard field
    form.getField({ id: 'tranId' }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN
    });
  }
}
```

### beforeSubmit(context)
Runs BEFORE the record is saved to the database. Used for validation and value modification.
Changes made to `context.newRecord` ARE saved. Throwing an error cancels the save.

```javascript
function beforeSubmit(context) {
  // Ignore VIEW and other non-modify operations
  if (context.type === context.UserEventType.VIEW) return;

  var newRecord = context.newRecord;

  // Validation — throw to cancel save
  var entity = newRecord.getValue({ fieldId: 'entity' });
  if (!entity) {
    throw error.create({ name: 'VALIDATION_ERROR', message: 'Customer is required.', notifyOff: true });
  }

  // Auto-set a field based on another value
  var amount = newRecord.getValue({ fieldId: 'amount' });
  if (amount > 10000) {
    newRecord.setValue({ fieldId: 'custbody_needs_approval', value: true });
  }

  // Compare old and new values
  if (context.type === context.UserEventType.EDIT) {
    var oldStatus = context.oldRecord.getValue({ fieldId: 'status' });
    var newStatus = newRecord.getValue({ fieldId: 'status' });
    if (oldStatus !== newStatus) {
      log.audit({ title: 'Status Changed', details: oldStatus + ' → ' + newStatus });
    }
  }
}
```

### afterSubmit(context)
Runs AFTER the record is saved. Used to trigger downstream actions and create related records.
Changes to `context.newRecord` are NOT saved (record is already committed).

```javascript
function afterSubmit(context) {
  // Trigger on CREATE only
  if (context.type !== context.UserEventType.CREATE) return;

  var newRecord = context.newRecord;
  var recId = newRecord.id;
  var entity = newRecord.getValue({ fieldId: 'entity' });

  // Create a related activity record
  require(['N/record', 'N/email'], function(record, email) {
    // Send confirmation email
    email.send({
      author: 5,
      recipients: [{ entityId: entity }],
      subject: 'Order Confirmed: ' + newRecord.getValue({ fieldId: 'tranId' }),
      body: 'Your order has been created.',
      relatedRecords: { transactionId: recId, entityId: entity }
    });
  });
}
```

## context.type Values (UserEventType)

```javascript
context.type === context.UserEventType.CREATE         // New record
context.type === context.UserEventType.EDIT           // Edit existing record
context.type === context.UserEventType.VIEW           // View record (no save)
context.type === context.UserEventType.COPY           // Copy from existing
context.type === context.UserEventType.DELETE         // Delete record
context.type === context.UserEventType.PRINT          // Print record
context.type === context.UserEventType.EMAIL          // Email record from UI
context.type === context.UserEventType.QUICKADD       // Quick add from sublist
context.type === context.UserEventType.DROPSHIP       // Drop ship order
context.type === context.UserEventType.SPECIALORDER   // Special order
context.type === context.UserEventType.ORDERITEMS     // Order items from SO
context.type === context.UserEventType.PACK           // Pack for fulfillment
context.type === context.UserEventType.SHIP           // Ship fulfillment
context.type === context.UserEventType.APPROVE        // Approve (workflow)
context.type === context.UserEventType.REJECT         // Reject (workflow)
context.type === context.UserEventType.CANCEL         // Cancel
context.type === context.UserEventType.XEDIT          // Inline edit
```

## context Properties

```javascript
context.newRecord    // Record object being saved (read/write in beforeSubmit, read-only in afterSubmit)
context.oldRecord    // Previous state (null for CREATE; read-only)
context.form         // serverWidget.Form object (beforeLoad only)
context.type         // UserEventType constant string
context.UserEventType // Enum of all UserEventType values
context.request      // HTTP request object (web service context only)
```

## Governance

- Each User Event invocation = **1000 governance units**
- Scripts run synchronously — they block the user's save operation
- Keep execution time under 5 seconds for good UI response

## Key Rules

1. **DO NOT redirect in afterSubmit** — the response is already committed. Do redirects in
   `beforeLoad` instead.
2. **DO NOT use context.newRecord.save()** — the record is already being saved.
3. **oldRecord is null for CREATE** — always check `context.type` before accessing `context.oldRecord`.
4. **Form modifications in beforeLoad only** — `context.form` is not available in beforeSubmit/afterSubmit.
5. **Throw in beforeSubmit to cancel save** — the thrown error message is shown to the user in the UI.

## Deployment

- Script Type: User Event Script
- Deployment: Attach to one or more record types
- All three entry points are optional — export only the ones needed
- Deployment log level: DEBUG (development), AUDIT or ERROR (production)
- Multiple User Event scripts can run on the same record — execution order follows deployment priority number

## Common Anti-Pattern

```javascript
// WRONG: Saving the record inside afterSubmit
function afterSubmit(context) {
  var rec = record.load({ type: context.newRecord.type, id: context.newRecord.id });
  rec.setValue({ fieldId: 'memo', value: 'updated' });
  rec.save(); // THIS triggers another afterSubmit → infinite loop!
}

// CORRECT: Use record.submitFields (does NOT trigger the same User Event)
function afterSubmit(context) {
  record.submitFields({
    type: context.newRecord.type,
    id: context.newRecord.id,
    values: { memo: 'updated' }
  });
  // submitFields triggers User Event, but the context.type will be EDIT not CREATE
  // Guard against this: check context.type at the top of afterSubmit
}
```
