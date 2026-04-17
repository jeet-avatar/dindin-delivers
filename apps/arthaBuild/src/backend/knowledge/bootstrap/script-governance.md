---
source: SuiteScript 2.x API Reference — Script Governance
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# SuiteScript Governance

NetSuite governance is a unit-based system that limits the amount of work a script can
perform in a single invocation. Each API operation consumes a defined number of units.
When units are exhausted, the script throws `SSS_REQUEST_LIMIT_EXCEEDED`.

## Governance Units Per Script Type

| Script Type | Units Per Invocation |
|-------------|---------------------|
| User Event Script | 1,000 |
| Client Script | 1,000 (per page load) |
| Suitelet | 1,000 |
| RESTlet | 1,000 |
| Portlet | 1,000 |
| Mass Update (per record) | 1,000 |
| Workflow Action | 1,000 |
| Scheduled Script | **10,000** |
| Map/Reduce (per stage call) | **10,000** |

## Governance Units Per Operation

### Record Operations

| Operation | Units |
|-----------|-------|
| `record.load()` | 10 |
| `record.create()` (in memory, unsaved) | 0 |
| `rec.save()` / `record.save()` | 20 |
| `record.submitFields()` | 10 |
| `record.copy()` | 10 |
| `record.transform()` | 10 |
| `record.delete()` | 20 |

### Search Operations

| Operation | Units |
|-----------|-------|
| `search.create()` (object creation) | 0 |
| `search.load()` | 5 |
| `search.run()` execution | 10 + 1 per 1,000 results |
| `search.runPaged()` per page fetch | 10 |
| `search.lookupFields()` | 10 |

### Query Operations

| Operation | Units |
|-----------|-------|
| `query.runSuiteQL()` | 10 |
| `query.runSuiteQLPaged()` per page | 10 |
| `query.create().run()` | 10 |

### Network / External Operations

| Operation | Units |
|-----------|-------|
| `https.get()` | 10 |
| `https.post()` | 10 |
| `https.put()` | 10 |
| `https.delete()` | 10 |
| SFTP `connection.download()` | 10 |
| SFTP `connection.upload()` | 10 |

### File Operations

| Operation | Units |
|-----------|-------|
| `file.load()` | 10 |
| `file.create()` (in memory) | 0 |
| `fileObj.save()` | 10 |
| `file.delete()` | 10 |
| `compress.archiver.toFile()` | 10 |
| `compress.gunzip()` | 10 |

### Email / Communication

| Operation | Units |
|-----------|-------|
| `email.send()` | 1 |
| `email.sendBulk()` | 1 |

### Logging

| Operation | Units |
|-----------|-------|
| `log.debug()` | 0 |
| `log.audit()` | 0 |
| `log.error()` | 0 |
| `log.emergency()` | 0 |

### Cache / Format / Encode / Crypto

| Operation | Units |
|-----------|-------|
| All `cache.*` operations | 0 |
| All `format.*` operations | 0 |
| All `encode.*` operations | 0 |
| All `crypto.*` operations | 0 |
| `error.create()` | 0 |
| `task.checkStatus()` | 0 |

### Workbook

| Operation | Units |
|-----------|-------|
| `workbook.create()` | 5 |
| `workbook.load()` | 5 |
| `wb.save()` | 10 |

## Checking Remaining Governance

```javascript
var script = runtime.getCurrentScript();
var remaining = script.getRemainingUsage();
log.debug({ title: 'Governance remaining', details: remaining });
```

**Always check before expensive operations in loops:**

```javascript
function execute(context) {
  var script = runtime.getCurrentScript();
  var results = getDataToProcess();

  results.forEach(function(item) {
    if (script.getRemainingUsage() < 100) {
      log.audit({ title: 'Stopping', details: 'Governance too low for next operation' });
      return; // Stop processing
    }
    processItem(item); // ~30 units: load (10) + save (20)
  });
}
```

## Governance Calculation Examples

### Scheduled Script processing 100 orders: load + submitFields
```
100 × record.load()         = 100 × 10 = 1,000 units
100 × record.submitFields() = 100 × 10 = 1,000 units
1 × search.run()            = 10 + (100/1000) ≈ 10 units
Total ≈ 2,010 units (within 10,000 limit)
```

### User Event processing a Sales Order with email
```
1 × record.load() (customer lookup) = 10 units
1 × email.send()                    = 1 unit
Total ≈ 11 units (well within 1,000 limit)
```

### Hitting governance with HTTPS calls
```
100 × https.post() = 100 × 10 = 1,000 units
(User Event would hit limit at ~90 calls; Scheduled at ~900 calls)
```

## Governance Optimization Strategies

### 1. Use submitFields instead of load+save
```javascript
// EXPENSIVE: 10 + 20 = 30 units
var rec = record.load({ type: 'salesorder', id: id });
rec.setValue({ fieldId: 'custbody_flag', value: true });
rec.save();

// EFFICIENT: 10 units
record.submitFields({
  type: 'salesorder',
  id: id,
  values: { custbody_flag: true }
});
```

### 2. Use search.runPaged() for large result sets
```javascript
// EFFICIENT: 10 per page × ceil(5000/1000) = 50 units for 5000 results
var paged = mySearch.runPaged({ pageSize: 1000 });
paged.pageRanges.forEach(function(range) {
  paged.fetch({ index: range.index }).data.forEach(function(result) {
    // process...
  });
});
```

### 3. Batch HTTPS calls — one call vs. many
```javascript
// EXPENSIVE: 10 per record × 50 records = 500 units
records.forEach(function(rec) { https.post({ url: apiUrl, body: JSON.stringify(rec) }); });

// EFFICIENT: 10 units total
https.post({ url: apiUrl + '/batch', body: JSON.stringify({ records: records }) });
```

### 4. Cache expensive lookups
```javascript
var rateCache = {};
function getExchangeRate(currency) {
  if (!rateCache[currency]) {
    rateCache[currency] = currency.exchangeRate({ source: currency, target: 'USD' });
  }
  return rateCache[currency];
}
```

### 5. Use SuiteQL for complex data retrieval
```javascript
// EXPENSIVE: search.run() per join
// EFFICIENT: one SuiteQL JOIN = 10 units
var results = query.runSuiteQL({
  query: 'SELECT t.id, t.tranId, c.companyName FROM transaction t JOIN customer c ON t.entity = c.id WHERE t.type = ?',
  params: ['SalesOrd']
});
```

## Error on Governance Exceeded

```javascript
// Thrown automatically when limit is hit:
// SuiteScriptError: SSS_REQUEST_LIMIT_EXCEEDED

// Handle in scheduled scripts:
try {
  processAllRecords();
} catch (e) {
  if (e.name === 'SSS_REQUEST_LIMIT_EXCEEDED') {
    log.audit({ title: 'Governance exceeded', details: 'Rescheduling...' });
    reschedule();  // Submit a new task to continue
    return;
  }
  throw e;
}
```
