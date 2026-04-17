---
source: SuiteScript 2.x API Reference — N/action Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/action Module

The N/action module executes workflow actions, record actions, and mass update actions
programmatically. Use it to trigger actions defined in NetSuite workflows without
navigating the UI. Available in server-side scripts.

## Loading the Module

```javascript
define(['N/action'], function(action) { ... });
```

## Getting an Action

### action.get(options)
Returns a RecordAction object for a specific action on a record type.

```javascript
var approveAction = action.get({
  recordType: 'salesorder',
  actionId: 'approve'   // Action script ID or built-in action ID
});
```

**Parameters:**
- `recordType` (string): Required. Record type internal ID
- `actionId` (string): Required. Action script ID (for custom workflow actions) or
  built-in action ID (e.g., 'approve', 'reject', 'void')

**Returns:** RecordAction object

## Executing Actions

### action.execute(options)
Executes a workflow action on a single record.

```javascript
var result = action.execute({
  recordType: 'salesorder',
  id: 1234,              // Internal ID of the record
  actionId: 'approve',
  params: {              // Optional parameters passed to the action
    custscript_approval_note: 'Approved by scheduled script'
  }
});

log.audit({ title: 'Action result', details: JSON.stringify(result) });
// Returns: Object with action execution result
```

**Parameters:**
- `recordType` (string): Required. Record type
- `id` (number): Required. Internal ID of the specific record
- `actionId` (string): Required. Action ID
- `params` (Object): Optional. Parameters passed to the action script

**Returns:** Object with action result

### action.executeBulk(options)
Executes a workflow action on multiple records matching a condition.

```javascript
var results = action.executeBulk({
  recordType: 'salesorder',
  actionId: 'approve',
  condition: action.createCondition({
    fieldId: 'status',
    operator: action.Operator.IS,
    values: ['pendingApproval']
  }),
  params: { custscript_batch_approval: 'Y' },
  callback: function(result) {
    // Called for each record processed
    if (result.status === 'SUCCESS') {
      log.debug({ title: 'Approved', details: 'Record ID: ' + result.id });
    } else {
      log.error({ title: 'Failed', details: 'ID: ' + result.id + ' - ' + result.error });
    }
  }
});

log.audit({ title: 'Bulk action', details: 'Processed: ' + results.length });
```

**Parameters:**
- `recordType` (string): Required. Record type
- `actionId` (string): Required. Action ID
- `condition` (Condition): Optional. Filter condition to select target records
- `params` (Object): Optional. Parameters for the action
- `callback` (Function): Optional. Called per record with result: `{ id, status, error? }`

**Returns:** Array of result objects

## action.createCondition(options)
Creates a filter condition for bulk action execution.

```javascript
var condition = action.createCondition({
  fieldId: 'status',
  operator: action.Operator.ANY_OF,
  values: ['pendingApproval', 'pendingSupervisorApproval']
});
```

## action.Operator Constants

```javascript
action.Operator.IS
action.Operator.IS_NOT
action.Operator.CONTAINS
action.Operator.STARTS_WITH
action.Operator.GREATER_THAN
action.Operator.LESS_THAN
action.Operator.EMPTY
action.Operator.NOT_EMPTY
action.Operator.ANY_OF
action.Operator.NONE_OF
```

## Getting All Actions for a Record Type

### action.findAll(options)
Returns all available actions for a given record type.

```javascript
var actions = action.findAll({ recordType: 'salesorder' });
actions.forEach(function(act) {
  log.debug({ title: act.id, details: act.label });
});
```

## Common Patterns

### Approve all pending orders from a scheduled script
```javascript
define(['N/action', 'N/search'], function(action, search) {

  function execute(context) {
    // Get all pending approval orders
    var pendingSearch = search.create({
      type: 'salesorder',
      filters: [['status', search.Operator.IS, 'pendingApproval']],
      columns: [search.createColumn({ name: 'internalid' })]
    });

    var processedCount = 0;
    var errorCount = 0;

    pendingSearch.run().each(function(result) {
      try {
        action.execute({
          recordType: 'salesorder',
          id: parseInt(result.id),
          actionId: 'approve'
        });
        processedCount++;
      } catch (e) {
        errorCount++;
        log.error({ title: 'Approval failed', details: 'Order: ' + result.id + ' - ' + e.message });
      }
      return true;
    });

    log.audit({
      title: 'Bulk Approval Complete',
      details: 'Approved: ' + processedCount + ', Errors: ' + errorCount
    });
  }

  return { execute: execute };
});
```

### Trigger custom workflow action
```javascript
// Execute a custom workflow action script
var result = action.execute({
  recordType: 'customrecord_service_request',
  id: serviceRequestId,
  actionId: 'customaction_send_escalation_email',
  params: {
    custscript_escalation_reason: 'SLA exceeded',
    custscript_priority: 'HIGH'
  }
});
```

### Void transactions programmatically
```javascript
// Void a list of transactions
function voidTransactions(transactionIds, recordType) {
  transactionIds.forEach(function(txId) {
    try {
      action.execute({
        recordType: recordType,
        id: txId,
        actionId: 'void'
      });
      log.audit({ title: 'Voided', details: recordType + ' #' + txId });
    } catch (e) {
      log.error({ title: 'Void failed', details: txId + ': ' + e.message });
    }
  });
}
```

## Governance

| Operation | Governance Units |
|-----------|-----------------|
| `action.get()` | 0 units |
| `action.execute()` | Depends on action — typically 10-20 units |
| `action.executeBulk()` | 10-20 units per record processed |
| `action.findAll()` | 0 units |

## Notes

- `action.execute()` and `action.executeBulk()` trigger the full workflow action logic —
  including any validation, field updates, and downstream processes defined in the action
- Not all record types support all actions — use `action.findAll()` to discover available actions
- Built-in action IDs for common operations: `'approve'`, `'reject'`, `'void'`, `'close'`,
  `'cancel'` — these are record-type specific
- Custom workflow action scripts are identified by their script script ID
  (e.g., `'customscript_my_workflow_action'`)
- `executeBulk()` processes records asynchronously in some configurations — check results via callback
