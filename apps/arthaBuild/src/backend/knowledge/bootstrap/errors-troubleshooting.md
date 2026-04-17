---
source: Oracle NetSuite Official Documentation — Error Reference and Troubleshooting
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Errors and Troubleshooting Reference

## Overview

This document covers common NetSuite error codes, their causes, and remediation steps.
Also covers diagnostic tools: Script Debugger, Execution Log, and error handling patterns.

---

## Common SuiteScript Errors

### SSS_REQUEST_LIMIT_EXCEEDED

**Category:** Governance / Rate Limit

**Cause:** Too many HTTPS requests in a single script execution.
Scripts are limited to a certain number of outbound HTTP calls.

**Fix:**
- Cache results of HTTPS calls (use `N/cache` module)
- Implement exponential backoff with retry logic
- Move bulk HTTP calls to MapReduce script for parallel processing
- Reduce calls by batching (send one request with multiple records instead of one per record)

```javascript
// Bad: one call per record
records.forEach(function(rec) {
    https.post({ url: externalApi, body: JSON.stringify(rec) }); // Exceeds limit for 100+ records
});

// Better: batch
https.post({ url: externalApi, body: JSON.stringify(records) }); // One call
```

---

### SSS_TIME_LIMIT_EXCEEDED

**Category:** Governance / Time Limit

**Cause:** Script execution exceeded the time limit.
- Suitelet/RESTlet/UserEvent: 5 seconds (synchronous)
- Scheduled Script: 3600 seconds (60 min)
- MapReduce: 900 seconds per stage (map/reduce each)

**Fix:**
- Break large jobs into smaller batches using Scheduled or MapReduce scripts
- Use `runtime.getCurrentScript().getRemainingUsage()` to check remaining governance
- For time-intensive operations, submit a Map/Reduce script instead:

```javascript
// Submit async task instead of inline processing
define(['N/task'], function(task) {
    var mrTask = task.create({
        taskType: task.TaskType.MAP_REDUCE,
        scriptId: 'customscript_process_records_mr',
        deploymentId: 'customdeploy_process_records_mr',
        params: { records: JSON.stringify(recordIds) }
    });
    var taskId = mrTask.submit();
    log.debug('Submitted MR task', taskId);
});
```

---

### UNEXPECTED_ERROR

**Category:** Runtime Error

**Cause:** Unhandled JavaScript exception — check server-side execution log for stack trace.

**Fix:**
1. View the execution log: Setup > Customization > Scripts > Script Execution Log
2. Filter by script and date range
3. Look for ERROR entries — expand to see full stack trace
4. Add try/catch around the failing code:

```javascript
try {
    var result = record.load({ type: 'customrecord_approval_log', id: badId });
} catch (e) {
    log.error({
        title: 'Failed to load record',
        details: 'ID: ' + badId + ' | Error: ' + e.message + ' | Stack: ' + e.stack
    });
}
```

---

### RCRD_DSNT_EXIST

**Category:** Data Error

**Cause:** `record.load()` called with an ID that doesn't exist or was deleted.

**Fix:**
```javascript
try {
    var rec = record.load({ type: record.Type.SALES_ORDER, id: soId });
} catch (e) {
    if (e.name === 'RCRD_DSNT_EXIST') {
        log.error('Record not found', 'SO ID ' + soId + ' does not exist');
        return null;
    }
    throw e; // Re-throw unexpected errors
}
```

---

### YOU_DO_NOT_HAVE_PERMISSION

**Category:** Authorization Error

**Cause:** The script's execution role lacks the required permission for the operation.

**Fix:**
1. Check the script deployment: is the correct role assigned?
2. Check the user's role permissions: Setup > Users/Roles > Manage Roles > [role] > Permissions
3. If script needs elevated permissions, enable "Run as Administrator" on the deployment
4. Verify the access token role has the required permission (for REST/TBA calls)

---

### FIELD_DEFICIENCY

**Category:** Validation Error

**Cause:** A required field is missing when attempting to save a record.

**Fix:**
```javascript
// Check required fields before saving
var entity = soRecord.getValue({ fieldId: 'entity' });
if (!entity) {
    throw error.create({
        name: 'MISSING_ENTITY',
        message: 'Customer is required on Sales Order'
    });
}
```

**Common required fields:**
- Sales Order: `entity` (customer), `item` on at least one line
- Purchase Order: `entity` (vendor)
- Journal Entry: balanced debit/credit, at least two lines
- Invoice: `entity`, at least one item line

---

### SSS_MISSING_REQD_ARGUMENT

**Category:** API Usage Error

**Cause:** Required parameter not passed to a SuiteScript API function.

**Fix:** Check the function signature and ensure all required parameters are provided.

```javascript
// Wrong: missing required params
search.create({ type: 'salesorder' });  // 'filters' and 'columns' missing

// Correct
search.create({
    type: search.Type.SALES_ORDER,
    filters: [],
    columns: [search.createColumn({ name: 'tranid' })]
});
```

---

### INVALID_LOGIN_CREDENTIALS (TBA)

**Category:** Authentication Error (TBA)

**Cause:** One or more TBA credential values are incorrect.

**Diagnostic checklist:**
1. Verify `accountId` matches what's in Setup > Company > Company Information
2. Confirm Consumer Key/Secret match the Integration record
3. Confirm Token Key/Secret match the Access Token record (note: shown only once)
4. Ensure TBA is enabled: Setup > Company > Enable Features > SuiteCloud
5. Ensure the integration's "Token-Based Authentication" checkbox is checked
6. Check that the access token role has the required permissions

**Common mistake:** Using `--sandbox` account IDs for production or vice versa.
Sandbox account ID format: `{accountId}_SB1` or `{accountId}_SB2`.

---

### SSS_SECURITY_VIOLATION

**Category:** Security / Permission Error

**Cause:** Attempting to access a resource the current execution context doesn't permit.

**Examples:**
- Client script trying to access server-only modules (N/record in beforeLoad for server data)
- Accessing credentials/secrets from client-side scripts
- Script accessing records outside of its governance scope

---

## Suite Debugger

**Navigation:** Setup > Log and Diagnostics > Script Debugger

The Script Debugger allows setting breakpoints and inspecting variable values:

1. Open the Script Debugger
2. Navigate to the script being tested (or run a record save/Suitelet)
3. Set breakpoints by clicking line numbers in the debugger
4. Execute the action that triggers the script
5. Debugger pauses at breakpoints — inspect `context`, `record`, local variables

**Limitations:**
- Debugger only works in UI-triggered executions (not scheduled scripts)
- Cannot debug REST-triggered scripts directly
- Each account has limited concurrent debugger sessions

---

## Execution Log

**Navigation:** Setup > Customization > Scripts > Script Execution Log

Filters:
- Script Name
- Deployment ID
- Date/Time range
- Log Level: DEBUG, AUDIT, ERROR, EMERGENCY

**Best practice:** Use `log.audit()` for production scripts (not `log.debug()`)
— debug logs are filtered out in production if log level is set to AUDIT.

```javascript
log.debug('Variable value', JSON.stringify(myObj));  // Development only
log.audit('Record created', 'SO ID: ' + soId);       // Always logged
log.error('Save failed', e.message);                  // Always logged
log.emergency('Critical failure', e.stack);           // Always logged + alert sent
```

---

## Error Handling Patterns

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/error', 'N/log', 'N/email'], function(error, log, email) {
    function afterSubmit(context) {
        try {
            doWork(context.newRecord);
        } catch (e) {
            log.error({
                title: 'afterSubmit failed',
                details: 'Record: ' + context.newRecord.id + ' | ' + e.message
            });

            // Optionally notify admin
            if (e.name !== 'EXPECTED_BUSINESS_RULE_VIOLATION') {
                email.send({
                    author: -5,  // NetSuite system sender
                    recipients: 'admin@company.com',
                    subject: 'Script Error: ' + e.name,
                    body: 'Record: ' + context.newRecord.id + '\n' + e.stack
                });
            }
        }
    }
    return { afterSubmit: afterSubmit };
});
```

---

## Common Troubleshooting Checklist

| Symptom                        | Check                                                      |
|--------------------------------|------------------------------------------------------------|
| Script not running at all      | Deployment status = Released? Record type matches?        |
| Script runs but does nothing   | Trigger type correct? (Before vs After Submit)            |
| Record save fails silently     | Check execution log for BEFORESUBMIT errors               |
| Wrong field value being set    | Check fieldId spelling (`custbody_` prefix?)              |
| TBA auth fails                 | Verify all 5 credential fields, check account ID format   |
| Email not sent                 | Email audit log: Setup > Communications > Email Audit Log |
| Workflow not triggering        | Check workflow status = Released, record type matches     |
