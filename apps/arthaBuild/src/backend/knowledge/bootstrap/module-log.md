---
source: SuiteScript 2.x API Reference — N/log Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/log Module

The N/log module writes diagnostic and operational information to the NetSuite Script
Execution Log. It is available in all script types and does NOT consume governance units.

## Loading the Module

The N/log module is available globally in SuiteScript 2.x — no require/define needed.
However, it can also be loaded explicitly:

```javascript
define(['N/log'], function(log) { ... });
// Or simply use log.debug(), log.audit() etc. directly (auto-loaded)
```

## Log Methods

### log.debug(options)
Development-level logging. Written ONLY when the script deployment's log level is set
to DEBUG or higher.

```javascript
log.debug({
  title: 'Processing Record',
  details: 'Record ID: ' + recId
});

// details can be any type — auto-serialized
log.debug({ title: 'Config', details: { key: 'value', count: 10 } });
log.debug({ title: 'Array', details: [1, 2, 3] });
```

- Use for: Development troubleshooting, variable inspection, flow tracing
- Production impact: NOT written unless debug log level is active
- Best practice: Remove or keep debug logs — they are zero governance cost

### log.audit(options)
Operational-level logging. Written ALWAYS regardless of log level setting.

```javascript
log.audit({
  title: 'Order Processed',
  details: 'Sales Order #SO-1234 created for Customer 100'
});

log.audit({
  title: 'Script Start',
  details: 'Scheduled script executing at ' + new Date().toISOString()
});
```

- Use for: Key business events, script start/end, important state changes
- Written: Always (even in production with ERROR log level)
- Best practice: Use for critical milestones, not for every loop iteration

### log.error(options)
Error-level logging. Written ALWAYS. Use for caught exceptions and error states.

```javascript
try {
  var rec = record.load({ type: record.Type.CUSTOMER, id: customerId });
} catch (e) {
  log.error({
    title: 'Failed to load customer',
    details: 'ID: ' + customerId + '\nError: ' + e.message + '\nStack: ' + e.stack
  });
}
```

- Use for: Caught exceptions, validation failures, unexpected states
- Written: Always
- Best practice: Include the error message AND stack trace in details

### log.emergency(options)
Critical-level logging. Written ALWAYS. Can trigger alert notifications in some configurations.

```javascript
log.emergency({
  title: 'CRITICAL: Integration Failure',
  details: 'Unable to connect to external API. Data sync stopped at ' + new Date().toISOString()
});
```

- Use for: System-level failures, data integrity issues, integration outages
- Written: Always

## Log Level Hierarchy

```
DEBUG < AUDIT < ERROR < EMERGENCY
```

Script deployment log level controls which messages are written:
- DEBUG → writes all 4 types
- AUDIT → writes audit, error, emergency (not debug)
- ERROR → writes error, emergency only
- EMERGENCY → writes emergency only

## Parameters

```javascript
log.debug({
  title: string,    // Max 99 characters. Required.
  details: any      // Auto-serialized to string. Objects/arrays become JSON. Optional.
});
```

- `title`: String up to 99 characters. Shown in the Title column of the log viewer.
- `details`: Any value. Objects and arrays are JSON.stringify'd automatically. Max ~3000 chars.

## Where to View Logs

**UI Path:** Setup > Log & Diagnostics > Script Execution Log

**Filter options:**
- By script
- By script type
- By date range
- By log level
- By user

**Log entry fields visible in UI:**
- Type (DEBUG/AUDIT/ERROR/EMERGENCY)
- Date
- Time
- Script
- Script Type
- Deployment ID
- Title
- Details

## Governance

ALL log methods = **0 governance units** — no cost regardless of how many log calls are made.

## Best Practices

### Pattern: Log script boundaries
```javascript
function execute(context) {
  log.audit({ title: 'Script Start', details: context.type });
  try {
    // ... processing ...
    log.audit({ title: 'Script Complete', details: 'Processed X records' });
  } catch (e) {
    log.error({ title: 'Script Failed', details: e.message + '\n' + e.stack });
    throw e; // re-throw so NetSuite marks the deployment as failed
  }
}
```

### Pattern: Log loop progress
```javascript
var processed = 0;
var errors = 0;
resultSet.each(function(result) {
  try {
    // ... process record ...
    processed++;
  } catch (e) {
    errors++;
    log.error({ title: 'Row error', details: 'ID: ' + result.id + ' - ' + e.message });
  }
  return true;
});
log.audit({ title: 'Summary', details: 'Processed: ' + processed + ', Errors: ' + errors });
```

### Pattern: Conditional debug
```javascript
var DEBUG_MODE = runtime.getCurrentScript().getParameter({ name: 'custscript_debug_mode' });
if (DEBUG_MODE) {
  log.debug({ title: 'Field value', details: fieldValue });
}
```

## Common Mistakes

1. **Using log.debug for critical events** — debug logs disappear in production log level
2. **Logging inside tight loops** — even at 0 governance, excessive logging can slow execution
3. **Truncated details** — details over ~3000 chars are truncated; log key parts only
4. **Not logging the stack trace** — always include `e.stack` in error details, not just `e.message`
5. **Over-logging in production** — use log.audit sparingly for key events only
