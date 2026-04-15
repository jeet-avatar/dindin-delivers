---
source: SuiteScript 2.x API Reference — Scheduled Script
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Scheduled Script

Scheduled Scripts run asynchronously on a defined schedule (cron-based) or on-demand
(triggered manually or via N/task). They process data in the background without blocking
the user interface.

## Script Header (Required JSDoc)

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log'], function(record, search, runtime, log) {

  function execute(context) {
    log.audit({ title: 'Script Start', details: 'Execution type: ' + context.type });

    try {
      doWork();
      log.audit({ title: 'Script Complete', details: 'Finished successfully' });
    } catch (e) {
      log.error({ title: 'Script Failed', details: e.message + '\n' + e.stack });
      throw e;
    }
  }

  return { execute: execute };
});
```

## Entry Point

### execute(context)
Single entry point for all scheduled script execution.

```javascript
function execute(context) {
  var executionType = context.type;
  // context.type values:
  // context.InvocationType.ON_DEMAND   — triggered manually or via N/task
  // context.InvocationType.SCHEDULED   — triggered by cron schedule
  // context.InvocationType.ABORTED     — previous run was stopped; this is a restart attempt
  // context.InvocationType.RESTARTED   — script rescheduled itself via N/task (chain continuation)
}
```

## context Properties

```javascript
context.type              // InvocationType constant
context.InvocationType    // Enum: ON_DEMAND, SCHEDULED, ABORTED, RESTARTED
```

## Governance Pattern

Always check remaining governance units before heavy operations:

```javascript
function execute(context) {
  var script = runtime.getCurrentScript();
  log.audit({ title: 'Start', details: 'Remaining units: ' + script.getRemainingUsage() });

  var results = loadDataToProcess(); // returns array

  for (var i = 0; i < results.length; i++) {
    // Check governance before each expensive operation
    if (script.getRemainingUsage() < 500) {
      log.audit({ title: 'Low governance', details: 'Stopping at index ' + i + '. Rescheduling.' });
      rescheduleFrom(i);  // Save position and reschedule
      return;
    }

    try {
      processRecord(results[i]);
    } catch (e) {
      log.error({ title: 'Error', details: 'ID: ' + results[i].id + ' - ' + e.message });
      // Continue processing remaining records
    }
  }

  log.audit({ title: 'Complete', details: 'Processed ' + results.length + ' records' });
}
```

## Progress Reporting

Set percentComplete to track script progress in the Scheduled Script Status screen:

```javascript
function execute(context) {
  var script = runtime.getCurrentScript();
  var totalRecords = getTotalCount();
  var processed = 0;

  getRecords().forEach(function(rec) {
    processRecord(rec);
    processed++;
    script.percentComplete = Math.round((processed / totalRecords) * 100);
  });
}
```

## Self-Rescheduling Pattern

For processing datasets larger than one invocation's governance allows:

```javascript
define(['N/runtime', 'N/task', 'N/search', 'N/record'], function(runtime, task, search, record) {

  function execute(context) {
    var script = runtime.getCurrentScript();
    var lastProcessedId = parseInt(script.getParameter({ name: 'custscript_last_id' }) || '0');
    var processedThisRun = 0;

    var mySearch = search.create({
      type: 'salesorder',
      filters: [
        ['internalid', search.Operator.GREATER_THAN, lastProcessedId.toString()],
        'AND',
        ['status', search.Operator.IS, 'pendingFulfillment']
      ],
      columns: [search.createColumn({ name: 'internalid' })]
    });

    var continueFrom = lastProcessedId;

    mySearch.run().each(function(result) {
      if (script.getRemainingUsage() < 1000) {
        log.audit({ title: 'Rescheduling', details: 'Continue from ID: ' + continueFrom });

        task.create({
          taskType: task.TaskType.SCHEDULED_SCRIPT,
          scriptId: script.id,
          deploymentId: script.deploymentId,
          params: { custscript_last_id: continueFrom.toString() }
        }).submit();

        return false; // Stop the each() loop
      }

      // Process the record
      processOrder(parseInt(result.id));
      continueFrom = parseInt(result.id);
      processedThisRun++;
      return true;
    });

    log.audit({ title: 'Run complete', details: 'Processed: ' + processedThisRun });
  }

  function processOrder(id) {
    record.submitFields({
      type: record.Type.SALES_ORDER,
      id: id,
      values: { custbody_processed: true }
    });
  }

  return { execute: execute };
});
```

## Reading Script Parameters

Script deployment parameters are defined in the Script record and Deployment record:

```javascript
function execute(context) {
  var script = runtime.getCurrentScript();

  // Read deployment parameters
  var batchSize = parseInt(script.getParameter({ name: 'custscript_batch_size' }) || '100');
  var filterDate = script.getParameter({ name: 'custscript_filter_date' });
  var isDebug = script.getParameter({ name: 'custscript_debug_mode' }) === 'T';

  log.audit({ title: 'Parameters', details: 'Batch: ' + batchSize + ', Date: ' + filterDate });
}
```

## Deployment Configuration

| Setting | Description |
|---------|-------------|
| Script Type | Scheduled Script |
| Status | Scheduled / Not Scheduled |
| Frequency | Every N minutes, Hourly, Daily, Weekly, Monthly, Custom cron |
| Start Date / End Date | Optional execution window |
| Catch-up | If checked, runs missed executions after downtime |
| Log Level | DEBUG (dev) / AUDIT (prod) |
| Queue | Default or custom queue (controls parallelism) |

## Governance Limits

| Limit | Value |
|-------|-------|
| Governance units per invocation | **10,000 units** |
| Maximum execution time | **3,600 seconds (1 hour)** |
| Memory limit | 50 MB (approximate) |

**Expensive operations:**
- `record.load()` = 10 units
- `record.save()` = 20 units
- `record.submitFields()` = 10 units
- `https.get/post()` = 10 units per call
- `search.run()` = 10 + 1 per 1000 results

## When to Use Scheduled Script vs. Map/Reduce

| Use Scheduled Script | Use Map/Reduce |
|---------------------|----------------|
| < 1,000 records | 10,000+ records |
| Sequential processing required | Parallel processing desired |
| Simple retry logic | Built-in error handling and retry |
| One-off or simple schedules | Large batch transforms |
| Time-sensitive (no queue wait) | Large datasets with progress tracking |
