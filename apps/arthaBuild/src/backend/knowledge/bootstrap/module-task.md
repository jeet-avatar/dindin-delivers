---
source: SuiteScript 2.x API Reference — N/task Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/task Module

The N/task module enables submitting and monitoring asynchronous tasks in NetSuite.
Use it to trigger Scheduled Scripts, Map/Reduce scripts, CSV imports, and query tasks
from other scripts. Available in server-side scripts.

## Loading the Module

```javascript
define(['N/task'], function(task) { ... });
```

## Task Types

```javascript
task.TaskType.SCHEDULED_SCRIPT   // Trigger a scheduled script
task.TaskType.MAP_REDUCE         // Trigger a map/reduce script
task.TaskType.CSV_IMPORT         // Submit a CSV import
task.TaskType.QUERY              // Run a saved search export
task.TaskType.RECORD_ACTION      // Execute a workflow record action
task.TaskType.PIVOT_EXECUTION    // Execute a pivot table
```

## Creating and Submitting Tasks

### task.create(options)
Creates a task configuration object.

```javascript
// Create a Scheduled Script task
var scheduledTask = task.create({
  taskType: task.TaskType.SCHEDULED_SCRIPT,
  scriptId: 'customscript_process_orders',
  deploymentId: 'customdeploy1',   // Optional — uses next available if omitted
  params: {
    custscript_start_date: '2024-01-01',
    custscript_filter: 'pending'
  }
});
```

### scheduledTask.submit()
Submits the task for asynchronous execution. Returns a taskId string.

```javascript
var taskId = scheduledTask.submit();
log.audit({ title: 'Task submitted', details: 'Task ID: ' + taskId });
// Store taskId for later status checking
```

## Map/Reduce Task

```javascript
var mrTask = task.create({
  taskType: task.TaskType.MAP_REDUCE,
  scriptId: 'customscript_bulk_update',
  deploymentId: 'customdeploy_bulk_update',
  params: {
    custscript_batch_size: '500'
  }
});

var mrTaskId = mrTask.submit();
```

## CSV Import Task

```javascript
require(['N/task', 'N/file'], function(task, file) {
  var csvFile = file.load({ id: '/SuiteScripts/imports/customers.csv' });

  var importTask = task.create({
    taskType: task.TaskType.CSV_IMPORT,
    importFile: csvFile,
    mappingId: 'customimport_customer_map',   // Import map script ID
    name: 'Monthly Customer Import',          // Optional label
    linkedFile: null                          // Optional: second file for two-file import
  });

  var importTaskId = importTask.submit();
  log.audit({ title: 'CSV Import started', details: importTaskId });
});
```

## Checking Task Status

### task.checkStatus(options)
Returns the current status of a submitted task.

```javascript
var status = task.checkStatus({ taskId: taskId });

status.taskId          // Same taskId string
status.status          // Status constant string
status.percentComplete // Number 0-100
```

### task.TaskStatus Constants

```javascript
task.TaskStatus.PENDING     // 'PENDING' — queued, not yet started
task.TaskStatus.PROCESSING  // 'PROCESSING' — currently executing
task.TaskStatus.COMPLETE    // 'COMPLETE' — finished successfully
task.TaskStatus.FAILED      // 'FAILED' — execution failed
```

## Status Polling Pattern

Common pattern: submit from UserEvent afterSubmit, poll from a separate scheduled script.

```javascript
// In UserEvent afterSubmit — submit the task
function afterSubmit(context) {
  require(['N/task', 'N/record'], function(task, record) {
    var processTask = task.create({
      taskType: task.TaskType.SCHEDULED_SCRIPT,
      scriptId: 'customscript_process_order',
      params: {
        custscript_order_id: context.newRecord.id.toString()
      }
    });

    var taskId = processTask.submit();

    // Save taskId to record for monitoring
    record.submitFields({
      type: context.newRecord.type,
      id: context.newRecord.id,
      values: { custbody_task_id: taskId }
    });
  });
}
```

```javascript
// In a monitoring scheduled script — check status
function execute(context) {
  require(['N/task', 'N/search'], function(task, search) {
    // Find records with pending tasks
    var pendingSearch = search.create({
      type: 'salesorder',
      filters: [
        ['custbody_task_id', search.Operator.IS_NOT, ''],
        'AND',
        ['custbody_task_status', search.Operator.IS_NOT, 'COMPLETE']
      ],
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'custbody_task_id' })
      ]
    });

    pendingSearch.run().each(function(result) {
      var recId = result.id;
      var taskId = result.getValue({ name: 'custbody_task_id' });

      var status = task.checkStatus({ taskId: taskId });
      log.debug({ title: 'Task ' + taskId, details: status.status + ' (' + status.percentComplete + '%)' });

      if (status.status === task.TaskStatus.COMPLETE) {
        record.submitFields({
          type: 'salesorder',
          id: recId,
          values: { custbody_task_status: 'COMPLETE' }
        });
      } else if (status.status === task.TaskStatus.FAILED) {
        log.error({ title: 'Task failed', details: 'Record: ' + recId + ' | Task: ' + taskId });
      }
      return true;
    });
  });
}
```

## Reschedule Pattern (Self-chaining)

When a scheduled script needs to process more records than fit in one invocation:

```javascript
function execute(context) {
  var script = runtime.getCurrentScript();
  var startId = script.getParameter({ name: 'custscript_start_id' }) || 0;
  var processed = 0;
  var lastId = startId;

  // Process records until governance is low
  while (script.getRemainingUsage() > 500) {
    var batch = getNextBatch(lastId, 100);
    if (!batch.length) break;
    batch.forEach(function(item) { processItem(item); });
    lastId = batch[batch.length - 1].id;
    processed += batch.length;
  }

  log.audit({ title: 'Batch complete', details: 'Processed: ' + processed + ', Last ID: ' + lastId });

  // If there are more records, reschedule
  if (hasMoreRecords(lastId)) {
    var nextTask = task.create({
      taskType: task.TaskType.SCHEDULED_SCRIPT,
      scriptId: script.id,
      deploymentId: script.deploymentId,
      params: { custscript_start_id: lastId.toString() }
    });
    nextTask.submit();
    log.audit({ title: 'Rescheduled', details: 'Starting from ID: ' + lastId });
  }
}
```

## Notes

- `task.submit()` is asynchronous — it returns immediately and the task runs in the background
- Tasks are queued; PENDING status means waiting for an available execution slot
- Map/Reduce tasks require a deployed Map/Reduce script with at least one deployment set to "Not Scheduled" or "On Demand"
- CSV import tasks require an existing import map (Setup > Import/Export > Saved CSV Imports)
- `task.checkStatus()` is 0 governance units — safe to call frequently
