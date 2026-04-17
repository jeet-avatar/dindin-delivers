---
source: SuiteScript 2.x API Reference — N/error Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/error Module

The N/error module creates custom SuiteScript error objects. Use it to throw typed errors
with identifiable names, user-friendly messages, and optional notification suppression.
Available in all script types.

## Loading the Module

```javascript
define(['N/error'], function(error) { ... });
```

## Core Method

### error.create(options)
Creates a new SuiteScriptError object. Does NOT throw — you must explicitly throw it.

```javascript
throw error.create({
  name: 'INVALID_CUSTOMER',          // Error identifier (max 30 chars, uppercase with underscores)
  message: 'Customer ID is required', // Human-readable message
  notifyOff: false                    // Optional: false = NetSuite sends email notification
});
```

**Parameters:**
- `name` (string): Required. Error identifier. Use uppercase with underscores. Max 30 chars.
- `message` (string): Required. Error message (displayed to users and in logs)
- `notifyOff` (boolean): Optional. Default false. If false, error triggers email notification
  to the script owner when it propagates. Set to true to suppress notification for expected errors.

**Returns:** SuiteScriptError object (must be thrown)

## SuiteScriptError Properties

```javascript
var err = error.create({ name: 'MY_ERROR', message: 'Something failed' });

err.name     // 'MY_ERROR' — the error identifier
err.message  // 'Something failed' — the message
err.stack    // Stack trace string
err.type     // 'error.SuiteScriptError' — always
```

## Common Error Names (Standard NetSuite Errors)

These are built-in NetSuite error codes you may encounter when catching errors:

```javascript
// Governance
'SSS_REQUEST_LIMIT_EXCEEDED'     // Script governance units exhausted
'SSS_USAGE_LIMIT_EXCEEDED'       // Execution time limit exceeded
'SSS_SANDBOX_NOT_SUPPORTED'      // Feature not available in sandbox

// Record operations
'RCRD_DOES_NOT_EXIST'            // record.load() — record not found
'INVALID_RECORD_TYPE'            // Invalid record type constant
'FIELD_DOES_NOT_EXIST'           // Invalid field ID
'SUBLIST_DOES_NOT_EXIST'         // Invalid sublist ID
'INVALID_FLD_VALUE'              // Invalid field value type

// Network/integration
'CONNECTION_TIMEOUT'             // HTTPS request timed out
'HTTPS_CALL_FAILED'             // HTTP call network failure
'SSS_INVALID_URL'               // Malformed URL

// Auth / access
'INSUFFICIENT_PERMISSION'        // User doesn't have required role/permission
'INVALID_LOGIN'                  // Authentication failure

// General
'UNEXPECTED_ERROR'               // Catch-all for unclassified errors
'INVALID_TYPE_ARG'              // Wrong argument type passed to API
'NULL_ARGUMENT'                  // Required argument missing/null
```

## Custom Error Naming Conventions

```javascript
// Domain-specific errors (recommended pattern)
'VALIDATION_ERROR'       // Field validation failures
'USER_ERROR'             // User-facing validation (shows to user in UI)
'INTEGRATION_ERROR'      // External API/integration failures
'DATA_NOT_FOUND'         // Expected record/data not present
'DUPLICATE_RECORD'       // Attempt to create duplicate
'INVALID_STATE'          // Business logic state violation
'PERMISSION_DENIED'      // Custom authorization failure
```

## Error Handling Patterns

### Basic try/catch with typed error
```javascript
require(['N/record', 'N/error'], function(record, error) {

  function loadOrder(orderId) {
    if (!orderId || isNaN(orderId)) {
      throw error.create({
        name: 'INVALID_ARGUMENT',
        message: 'Order ID must be a valid number. Received: ' + orderId,
        notifyOff: true  // Expected validation error — suppress email
      });
    }

    try {
      return record.load({ type: record.Type.SALES_ORDER, id: orderId });
    } catch (e) {
      if (e.name === 'RCRD_DOES_NOT_EXIST') {
        throw error.create({
          name: 'ORDER_NOT_FOUND',
          message: 'Sales Order ' + orderId + ' does not exist',
          notifyOff: true
        });
      }
      throw e; // Re-throw unexpected errors
    }
  }
});
```

### RESTlet error response
```javascript
// RESTlets: return error objects as JSON responses
function post(context) {
  try {
    var result = processRequest(context);
    return { success: true, data: result };
  } catch (e) {
    log.error({ title: 'RESTlet Error', details: e.name + ': ' + e.message + '\n' + e.stack });
    return {
      success: false,
      error: e.name,
      message: e.message
    };
  }
}
```

### Suitelet validation with user-facing error
```javascript
function onRequest(context) {
  if (context.request.method === 'POST') {
    var amount = parseFloat(context.request.parameters.amount);

    if (isNaN(amount) || amount <= 0) {
      throw error.create({
        name: 'USER_ERROR',
        message: 'Amount must be a positive number.',
        notifyOff: true  // User entry error — no notification needed
      });
    }
    // Process the valid amount...
  }
}
```

### Governance-aware error with rescheduling
```javascript
function execute(context) {
  var script = runtime.getCurrentScript();

  try {
    processAllRecords();
  } catch (e) {
    if (e.name === 'SSS_REQUEST_LIMIT_EXCEEDED') {
      log.audit({ title: 'Governance limit reached', details: 'Scheduling continuation task' });
      // Reschedule instead of failing
      task.create({ taskType: task.TaskType.SCHEDULED_SCRIPT, scriptId: script.id }).submit();
      return; // Do not re-throw — normal flow
    }
    log.error({ title: 'Unexpected error', details: e.name + ': ' + e.message + '\n' + e.stack });
    throw e;
  }
}
```

### Error with cause chain (SuiteScript 2.1)
```javascript
// In SuiteScript 2.1, you can include cause in error create
throw error.create({
  name: 'INTEGRATION_FAILURE',
  message: 'Failed to sync customer: ' + customerId + '. Cause: ' + originalError.message,
  notifyOff: false  // Unexpected — email the script owner
});
```

## Governance

`error.create()` = **0 governance units**

## Notes

- `error.create()` creates the error object — it does NOT throw automatically. Always `throw`.
- `notifyOff: false` (the default) causes NetSuite to send an email notification to the
  script deployment's notification contacts when the error reaches the top-level handler.
  Set to `true` for validation errors and expected business logic exceptions.
- Error `name` values appear in the Script Execution Log's Error column — use descriptive
  names to make log filtering easier.
- When catching errors by name, match exactly: `if (e.name === 'RCRD_DOES_NOT_EXIST')`.
  NetSuite error names are stable across versions.
- In User Event beforeSubmit, throwing an error cancels the save and shows the message
  to the user in the UI — this is the correct way to implement validation.
