---
source: SuiteScript 2.x API Reference — Mass Update Script
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Mass Update Script

Mass Update scripts execute custom logic against multiple records selected by the user
in a list view or via a saved search. The user initiates the mass update from the UI,
selects records, and the script runs for each selected record.

## Script Header (Required JSDoc)

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType MassUpdateScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/error'], function(record, log, error) {

  function each(context) { ... }

  return { each: each };
});
```

## Entry Point

### each(context)
Runs once for each record selected in the mass update. The function is called sequentially,
one record at a time.

```javascript
function each(context) {
  var recType = context.type;   // Record type string (e.g., 'salesorder')
  var recId = context.id;       // Internal ID of the current record (number)

  log.debug({ title: 'Processing', details: recType + ' #' + recId });

  try {
    // Load and modify the record
    var rec = record.load({ type: recType, id: recId });

    // Perform the update
    rec.setValue({ fieldId: 'custbody_processed_flag', value: true });
    rec.setValue({ fieldId: 'custbody_batch_date', value: new Date() });

    rec.save({ enableSourcing: false });
    log.audit({ title: 'Updated', details: recType + ' #' + recId });

  } catch (e) {
    log.error({ title: 'Failed: ' + recId, details: e.message + '\n' + e.stack });
    // Throwing here marks the record as failed and continues to the next record
    throw e;
  }
}
```

## context Properties

```javascript
context.type    // Record type string (e.g., 'salesorder', 'customer')
context.id      // Internal ID of the current record (number)
```

Note: There is no `context.newRecord` or `context.oldRecord` — you must explicitly load
the record with `record.load()` or update via `record.submitFields()`.

## Governance

- **1,000 units per record** — each `each()` call has its own 1,000-unit budget
- Total governance is 1,000 × number of records selected
- Use `record.submitFields()` instead of `record.load() + save()` to reduce unit usage:
  - `record.submitFields()` = 10 units
  - `record.load()` + `rec.save()` = 10 + 20 = 30 units

## Common Patterns

### Mass update with submitFields (efficient)
```javascript
function each(context) {
  try {
    record.submitFields({
      type: context.type,
      id: context.id,
      values: {
        custbody_approved_by_batch: true,
        custbody_approval_date: new Date()
      },
      options: { enableSourcing: false, ignoreMandatoryFields: true }
    });
    log.debug({ title: 'Updated', details: context.id });
  } catch (e) {
    log.error({ title: 'Update failed', details: context.id + ': ' + e.message });
    throw e; // Marks this record as failed in the mass update summary
  }
}
```

### Mass update with conditional logic
```javascript
function each(context) {
  var rec = record.load({ type: context.type, id: context.id });
  var amount = rec.getValue({ fieldId: 'amount' });
  var custEmail = rec.getValue({ fieldId: 'custbody_notify_email' });

  // Conditional logic based on record data
  if (amount > 5000) {
    rec.setValue({ fieldId: 'custbody_high_value_flag', value: true });
    rec.setValue({ fieldId: 'custbody_review_required', value: true });
  } else {
    rec.setValue({ fieldId: 'custbody_high_value_flag', value: false });
  }

  rec.save();
  log.audit({ title: 'Processed', details: context.id + ' (amount: ' + amount + ')' });
}
```

### Mass update with external notification
```javascript
function each(context) {
  require(['N/email', 'N/record'], function(email, record) {
    var rec = record.load({ type: context.type, id: context.id });
    var entity = rec.getValue({ fieldId: 'entity' });
    var tranId = rec.getValue({ fieldId: 'tranId' });

    // Update the record
    rec.setValue({ fieldId: 'custbody_batch_processed', value: true });
    rec.save();

    // Send notification (uses 1 governance unit for email)
    email.send({
      author: 5,
      recipients: [{ entityId: entity }],
      subject: 'Order ' + tranId + ' has been processed',
      body: 'Your order has been batch processed.',
      relatedRecords: { transactionId: context.id, entityId: entity }
    });
  });
}
```

## Deployment

| Setting | Description |
|---------|-------------|
| Script Type | Mass Update Script |
| Record Type | The record type this mass update applies to |
| Status | Released |
| Available To | Specify which roles can run this mass update |

## Using the Mass Update from the UI

1. Navigate to the list view of the record type (e.g., Transactions > Sales > Sales Orders)
2. Select one or more records using the checkboxes
3. Click **Actions > Mass Update** from the menu
4. Select the deployed Mass Update script from the list
5. Click **Preview** to see affected records, then **Submit** to run

## Mass Update vs. Map/Reduce

| Feature | Mass Update | Map/Reduce |
|---------|-------------|------------|
| Trigger | User selects records | Script-defined dataset |
| Context | context.type + context.id | Configurable getInputData |
| Parallelism | Sequential | Parallel |
| Governance | 1,000/record | 10,000/map invocation |
| Error handling | Per-record throw | Built-in mapSummary.errors |
| Best for | UI-driven ad-hoc bulk updates | Automated large-scale processing |

## Notes

- Mass Update scripts are the appropriate choice when you want the user to SELECT which
  records get updated from the UI, rather than defining the dataset in code
- Each `each()` invocation is independent — an error for one record does not stop others
- Returning `true` from `each()` is not required (unlike search `.each()` callbacks)
- The mass update shows a summary screen after completion with success/failure counts
- For server-triggered bulk updates, use Map/Reduce instead
