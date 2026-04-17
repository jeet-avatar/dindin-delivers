---
source: Oracle NetSuite Official Documentation — Bulk Operations Patterns
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Bulk Operations Patterns

## Overview

When processing large datasets (10,000+ records), standard scripts hit governance
limits. This document covers proven patterns: MapReduce for scalable processing,
CSV Import for data loads, and paginated search for memory-efficient iteration.

---

## Pattern 1: MapReduce Script

MapReduce is the recommended approach for processing 10K+ records.

```javascript
/**
 * @NScriptType MapReduceScript
 * @NApiVersion 2.1
 */
define(['N/search', 'N/record', 'N/log', 'N/email'], function(search, record, log, email) {

    /**
     * getInputData: Return a search (NOT an array).
     * NetSuite auto-paginates — no governance hit for 1M records.
     */
    function getInputData(context) {
        return search.create({
            type: search.Type.SALES_ORDER,
            filters: [
                search.createFilter({ name: 'status', operator: search.Operator.IS, values: ['SalesOrd:B'] }),
                search.createFilter({ name: 'mainline', operator: search.Operator.IS, values: ['T'] })
            ],
            columns: [
                search.createColumn({ name: 'tranid' }),
                search.createColumn({ name: 'entity' }),
                search.createColumn({ name: 'total' }),
                search.createColumn({ name: 'custbody_approval_status' })
            ]
        });
    }

    /**
     * map: Process one record at a time.
     * Emit key-value pairs for the reduce stage.
     */
    function map(context) {
        var searchResult = JSON.parse(context.value);
        var id = searchResult.id;
        var customerId = searchResult.values['entity'].value;
        var total = searchResult.values['total'];

        try {
            // Process the record
            var so = record.load({ type: record.Type.SALES_ORDER, id: id, isDynamic: true });
            so.setValue({ fieldId: 'custbody_processed_flag', value: true });
            so.save();

            // Emit: key = customer ID, value = processed SO details
            context.write({
                key: customerId,
                value: JSON.stringify({ soId: id, total: total, status: 'processed' })
            });
        } catch (e) {
            log.error('Map error', 'SO ' + id + ': ' + e.message);
            context.write({
                key: 'errors',
                value: JSON.stringify({ soId: id, error: e.message })
            });
        }
    }

    /**
     * reduce: Aggregate results per key (per customer).
     * Called once per unique key.
     */
    function reduce(context) {
        var customerId = context.key;
        var results = context.values.map(function(v) { return JSON.parse(v); });

        // Aggregate: total processed amount per customer
        var totalAmount = results.reduce(function(sum, r) {
            return sum + (parseFloat(r.total) || 0);
        }, 0);

        var errors = results.filter(function(r) { return r.error; });

        context.write({
            key: customerId,
            value: JSON.stringify({
                customer: customerId,
                processedCount: results.length,
                totalAmount: totalAmount,
                errorCount: errors.length
            })
        });
    }

    /**
     * summarize: Called once after all map/reduce stages complete.
     * Log results, send notification.
     */
    function summarize(context) {
        var totalProcessed = 0;
        var totalErrors = 0;
        var summaryLines = [];

        context.output.iterator().each(function(key, value) {
            var data = JSON.parse(value);
            totalProcessed += data.processedCount;
            totalErrors += data.errorCount;
            summaryLines.push('Customer ' + key + ': ' + data.processedCount + ' orders, $' + data.totalAmount);
            return true;
        });

        log.audit('MapReduce Complete', totalProcessed + ' processed, ' + totalErrors + ' errors');

        // Send completion email
        email.send({
            author: -5,
            recipients: 'admin@company.com',
            subject: 'Bulk Process Complete: ' + totalProcessed + ' records',
            body: summaryLines.join('\n')
        });
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
```

---

## MapReduce Best Practices

| Practice                         | Why                                                     |
|----------------------------------|---------------------------------------------------------|
| Return `search.create()` from getInputData | Auto-paginated, no governance hit                |
| Don't load records in getInputData | Too expensive — load in map stage                   |
| Keep map() atomic                | If map fails for one record, others still process       |
| Use JSON.stringify for context.write | Values must be strings                            |
| Handle errors in map()           | Emit to 'errors' key — don't throw                      |
| Check input size in summarize    | `context.inputSummary.error` for getInputData failures  |

---

## Pattern 2: CSV Import via Task

For bulk data loads from external systems:

```javascript
/**
 * @NScriptType ScheduledScript
 * @NApiVersion 2.1
 */
define(['N/task', 'N/file', 'N/log'], function(task, file, log) {
    function execute(context) {
        // Find the CSV file in File Cabinet
        var csvFileId = findCsvFile(); // Helper that returns file ID

        // Create CSV import task
        var importTask = task.create({
            taskType: task.TaskType.CSV_IMPORT,
            mappingId: 'custimport_customer_update', // Saved CSV import mapping
            importFile: file.load({ id: csvFileId }),
            linkedFiles: {} // Optional linked file references
        });

        var taskId = importTask.submit();
        log.audit('CSV Import submitted', taskId);

        // Can check status later
        var taskStatus = task.checkStatus({ taskId: taskId });
        log.audit('Task status', taskStatus.status);
    }
    return { execute: execute };
});
```

### CSV Import Mapping

1. Navigate: Setup > Import/Export > Import CSV Records > New
2. Select Record Type
3. Map CSV columns to NetSuite fields
4. Set primary key for upsert (internal ID, external ID, or custom field)
5. Save with a scriptId for programmatic reference

---

## Pattern 3: Paginated Search (server-side)

For searches returning >1000 results, use `runPaged()`:

```javascript
define(['N/search', 'N/log'], function(search, log) {
    function processAllResults(savedSearchId) {
        var mySearch = search.load({ id: savedSearchId });

        var pagedData = mySearch.runPaged({ pageSize: 1000 }); // Max 1000/page

        log.audit('Total results', pagedData.count);

        pagedData.pageRanges.forEach(function(pageRange) {
            var page = pagedData.fetch({ index: pageRange.index });

            page.data.forEach(function(result) {
                var id = result.id;
                var tranId = result.getValue({ name: 'tranid' });
                var entity = result.getValue({ name: 'entity' });

                // Process this result
                processRecord(id, tranId, entity);
            });
        });
    }
});
```

---

## Pattern 4: Chunked Mass Update

For updates that don't need MapReduce but are too large for a single execution:

```javascript
/**
 * @NScriptType ScheduledScript
 * @NApiVersion 2.1
 */
define(['N/search', 'N/record', 'N/runtime', 'N/task', 'N/log'], function(search, record, runtime, task, log) {
    function execute(context) {
        var startId = context.NLAPIGetContext ? parseInt(context.getSetting('SCRIPT', 'startId') || '0') : 0;

        var results = search.create({
            type: search.Type.CUSTOMER,
            filters: [
                search.createFilter({ name: 'internalid', operator: search.Operator.GREATER_THAN, values: [startId] }),
                search.createFilter({ name: 'custentity_needs_update', operator: search.Operator.IS, values: ['T'] })
            ],
            columns: [search.createColumn({ name: 'internalid', sort: search.Sort.ASC })]
        }).runPaged({ pageSize: 1000 }).fetch({ index: 0 });

        var lastProcessedId = startId;
        results.data.forEach(function(result) {
            if (runtime.getCurrentScript().getRemainingUsage() < 200) {
                // Not enough governance — re-submit from this point
                task.create({
                    taskType: task.TaskType.SCHEDULED,
                    scriptId: runtime.getCurrentScript().id,
                    params: { startId: lastProcessedId }
                }).submit();
                return;
            }
            var cust = record.load({ type: record.Type.CUSTOMER, id: result.id });
            cust.setValue({ fieldId: 'custentity_needs_update', value: false });
            cust.save();
            lastProcessedId = parseInt(result.id);
        });
    }
    return { execute: execute };
});
```

---

## Pattern 5: Inline Editing for Simple Bulk Updates

For small updates (< 100 records), use `record.submitFields` — fastest option:

```javascript
define(['N/record'], function(record) {
    var recordIds = [123, 456, 789, 1011, 1213]; // Small batch

    recordIds.forEach(function(id) {
        record.submitFields({
            type: record.Type.SALES_ORDER,
            id: id,
            values: {
                custbody_processed_flag: true,
                custbody_process_date: new Date()
            },
            options: {
                enableSourcing: false,  // Skip sourcing for speed
                ignoreMandatoryFields: false
            }
        });
    });
});
```

`record.submitFields` is ~3× faster than `record.load` + `record.save` for field-only updates.
