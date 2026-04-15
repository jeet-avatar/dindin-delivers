---
source: SuiteScript 2.x API Reference — Map/Reduce Script
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Map/Reduce Script

Map/Reduce scripts process large datasets efficiently using distributed parallel execution.
They are modeled after the MapReduce programming paradigm: input data is split into chunks,
each chunk is processed in parallel, results are aggregated, and a summary stage finalizes
the run. Use for processing 10,000+ records.

## Script Header (Required JSDoc)

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log'], function(record, search, runtime, log) {

  function getInputData(inputContext) { ... }
  function map(mapContext) { ... }
  function reduce(reduceContext) { ... }
  function summarize(summaryContext) { ... }

  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize
  };
});
```

## Entry Points

### getInputData(inputContext)
**Stage 1** — Defines the input dataset. Returns data that will be chunked and fed to `map()`.

```javascript
function getInputData(inputContext) {
  // Option 1: Return a search (most common)
  return search.create({
    type: search.Type.SALES_ORDER,
    filters: [['status', search.Operator.IS, 'pendingFulfillment']],
    columns: [
      search.createColumn({ name: 'internalid' }),
      search.createColumn({ name: 'entity' }),
      search.createColumn({ name: 'amount' })
    ]
  });
  // NetSuite iterates the search and feeds results to map() in chunks

  // Option 2: Return an array of objects
  // return [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];

  // Option 3: Return a file (CSV processing)
  // return file.load({ id: '/SuiteScripts/import.csv' });

  // Option 4: Return a query
  // return query.create({ type: query.Type.SALES_ORDER });
}
```

### map(mapContext)
**Stage 2** — Processes each input item. Runs in parallel across available threads.

```javascript
function map(mapContext) {
  // mapContext.key   — Sequential key assigned by NetSuite (string)
  // mapContext.value — JSON string of the input item from getInputData

  var searchResult = JSON.parse(mapContext.value);

  // Extract fields from the search result
  var orderId = searchResult.id;
  var amount = searchResult.values.amount;
  var entityId = searchResult.values.entity;

  // Process the item
  try {
    var processedData = processOrder(orderId);

    // Emit key-value pair to reduce stage
    mapContext.write({
      key: entityId,          // Key used to group reduce calls
      value: JSON.stringify({
        orderId: orderId,
        amount: amount,
        status: processedData.status
      })
    });
  } catch (e) {
    log.error({ title: 'Map error - Order ' + orderId, details: e.message });
    // Don't re-throw — map errors are captured in summarize.mapSummary.errors
  }
}
```

### reduce(reduceContext)
**Stage 3** — Aggregates all values with the same key from `map()`. Optional.
If not exported, all map output goes directly to summarize.

```javascript
function reduce(reduceContext) {
  // reduceContext.key    — The key emitted from map()
  // reduceContext.values — Array of values (strings) with this key from all map() calls

  var entityId = reduceContext.key;
  var orders = reduceContext.values.map(function(v) { return JSON.parse(v); });

  var totalAmount = orders.reduce(function(sum, o) { return sum + parseFloat(o.amount); }, 0);
  var orderCount = orders.length;

  // Emit summary to the output iterator
  reduceContext.write({
    key: entityId,
    value: JSON.stringify({ entityId: entityId, totalAmount: totalAmount, orderCount: orderCount })
  });
}
```

### summarize(summaryContext)
**Stage 4** — Runs once after all map and reduce stages complete.
Used for final reporting, sending notifications, and error handling.

```javascript
function summarize(summaryContext) {
  // Check map stage errors
  var mapErrors = 0;
  summaryContext.mapSummary.errors.iterator().each(function(key, error) {
    log.error({ title: 'Map error - Key: ' + key, details: error });
    mapErrors++;
    return true;
  });

  // Check reduce stage errors
  var reduceErrors = 0;
  summaryContext.reduceSummary.errors.iterator().each(function(key, error) {
    log.error({ title: 'Reduce error - Key: ' + key, details: error });
    reduceErrors++;
    return true;
  });

  // Process reduce output
  var outputCount = 0;
  summaryContext.output.iterator().each(function(key, value) {
    var data = JSON.parse(value);
    log.debug({ title: 'Output', details: 'Customer ' + key + ': ' + data.totalAmount });
    // Write final results to a record or file...
    outputCount++;
    return true;
  });

  // Summary report
  log.audit({
    title: 'Map/Reduce Complete',
    details: [
      'Map errors: ' + mapErrors,
      'Reduce errors: ' + reduceErrors,
      'Output records: ' + outputCount,
      'Total seconds: ' + summaryContext.seconds,
      'Total usage: ' + summaryContext.usage
    ].join('\n')
  });
}
```

## summaryContext Properties

```javascript
summaryContext.seconds              // Total elapsed time (number)
summaryContext.usage                // Total governance units consumed (number)
summaryContext.concurrency          // Number of parallel map instances used
summaryContext.yields               // Number of times script yielded (rescheduled)
summaryContext.mapSummary           // Summary of map stage
summaryContext.reduceSummary        // Summary of reduce stage
summaryContext.output               // Iterator over reduce output (or map output if no reduce)

// Error iterators — use .iterator().each(function(key, error) {...})
summaryContext.mapSummary.errors
summaryContext.reduceSummary.errors
```

## Governance per Stage

| Stage | Governance per Invocation |
|-------|--------------------------|
| getInputData | 10,000 units |
| map (each call) | 10,000 units |
| reduce (each call) | 10,000 units |
| summarize | 10,000 units |

Each **map call** and **reduce call** has its own 10,000-unit budget — independent of other
parallel invocations. This is NOT a total budget across all calls.

## Chunk Size

- Default: NetSuite processes **~5,000 search results** per map invocation
- For array input: each array element becomes one map call
- Governance-heavy operations: reduce chunk size by splitting your search into smaller batches

## Deployment

- Script Type: Map/Reduce Script
- Status: Not Scheduled (trigger via N/task) or Scheduled
- Queue: Assign a specific queue to control parallelism
- Parameters: Defined on the Deployment record, read in getInputData via `runtime.getCurrentScript().getParameter()`

## Full Example: Update All Active Customers

```javascript
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {

  function getInputData(inputContext) {
    return search.create({
      type: search.Type.CUSTOMER,
      filters: [['isinactive', search.Operator.IS, 'F']],
      columns: [search.createColumn({ name: 'internalid' })]
    });
  }

  function map(mapContext) {
    var result = JSON.parse(mapContext.value);
    var customerId = result.id;
    try {
      record.submitFields({
        type: record.Type.CUSTOMER,
        id: customerId,
        values: { custentity_last_batch_update: new Date() }
      });
      mapContext.write({ key: 'success', value: customerId });
    } catch (e) {
      log.error({ title: 'Customer update failed', details: customerId + ': ' + e.message });
    }
  }

  function summarize(summaryContext) {
    var success = 0;
    summaryContext.output.iterator().each(function(k, v) { success++; return true; });
    summaryContext.mapSummary.errors.iterator().each(function(k, e) {
      log.error({ title: 'Map error', details: e }); return true;
    });
    log.audit({ title: 'Done', details: 'Updated: ' + success + ' | Time: ' + summaryContext.seconds + 's' });
  }

  return { getInputData: getInputData, map: map, summarize: summarize };
});
```

## When to Use Map/Reduce

- Processing 10,000+ records (scheduled script hits governance)
- Parallel processing needed for speed
- Complex aggregation (group by customer, sum by period)
- Large data transformations with error isolation per record
- Reading and transforming files with thousands of rows
