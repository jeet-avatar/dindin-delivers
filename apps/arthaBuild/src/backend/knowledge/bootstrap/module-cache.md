---
source: SuiteScript 2.x API Reference — N/cache Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/cache Module

The N/cache module provides an in-memory key-value cache for storing computed values across
script invocations. Use it to avoid redundant record loads, search results, or expensive
computations. Available in server-side scripts.

## Loading the Module

```javascript
define(['N/cache'], function(cache) { ... });
```

## Getting a Cache Instance

### cache.getCache(options)
Returns a named cache instance with a specified scope.

```javascript
var myCache = cache.getCache({
  name: 'order_data_cache',       // Cache name (unique identifier)
  scope: cache.Scope.GLOBAL       // Cache scope
});
```

**Parameters:**
- `name` (string): Required. Name of the cache. Used to retrieve the same cache across invocations.
- `scope` (cache.Scope): Required. Visibility scope of the cache.

**Returns:** Cache object

## cache.Scope Constants

```javascript
cache.Scope.GLOBAL     // Cache shared across ALL scripts in the account
cache.Scope.MODULE     // Cache shared across deployments of the SAME script
cache.Scope.PROTECTED  // Same as GLOBAL but values are encrypted at rest
```

| Scope | Shared Across | Use Case |
|-------|--------------|---------|
| GLOBAL | All scripts, all users | Lookup data, configuration, exchange rates |
| MODULE | This script only | Per-script computed values |
| PROTECTED | All scripts (encrypted) | Sensitive data (tokens, keys) |

## Cache Object Methods

### cacheObj.get(options)
Retrieves a value from the cache by key.

```javascript
var value = myCache.get({ key: 'exchange_rate_USD_EUR' });
// Returns: cached string value, or null if not found or expired
```

**Returns:** string | null (never returns non-string types — always serialize to JSON)

### cacheObj.put(options)
Stores a value in the cache.

```javascript
myCache.put({
  key: 'exchange_rate_USD_EUR',
  value: '1.0823',               // Must be a string
  ttl: 3600                      // Time-to-live in seconds (max 43200 = 12 hours)
});
```

**Parameters:**
- `key` (string): Required. Cache key (max 300 chars)
- `value` (string): Required. Value to store. Must be a string — serialize objects to JSON.
- `ttl` (number): Optional. Time-to-live in seconds. Default 3600 (1 hour). Max 43200 (12 hours).

### cacheObj.remove(options)
Removes a value from the cache.

```javascript
myCache.remove({ key: 'exchange_rate_USD_EUR' });
```

## Governance

| Operation | Governance Units |
|-----------|-----------------|
| `cache.getCache()` | 0 units |
| `cacheObj.get()` | 0 units |
| `cacheObj.put()` | 0 units |
| `cacheObj.remove()` | 0 units |

## Common Patterns

### Cache with fallback (load-or-fetch pattern)
```javascript
require(['N/cache', 'N/search'], function(cache, search) {

  var configCache = cache.getCache({
    name: 'app_configuration',
    scope: cache.Scope.GLOBAL
  });

  function getConfiguration() {
    var cached = configCache.get({ key: 'config_v1' });
    if (cached) {
      return JSON.parse(cached);
    }

    // Not in cache — load from NetSuite
    var config = loadConfigFromRecord();

    // Cache it for 1 hour
    configCache.put({
      key: 'config_v1',
      value: JSON.stringify(config),
      ttl: 3600
    });

    return config;
  }

  function loadConfigFromRecord() {
    var result = search.lookupFields({
      type: 'customrecord_app_config',
      id: 1,
      columns: ['custrecord_api_endpoint', 'custrecord_timeout', 'custrecord_max_retries']
    });
    return {
      apiEndpoint: result.custrecord_api_endpoint,
      timeout: parseInt(result.custrecord_timeout || '30'),
      maxRetries: parseInt(result.custrecord_max_retries || '3')
    };
  }
});
```

### Cache exchange rates (expensive lookup)
```javascript
require(['N/cache', 'N/currency'], function(cache, currency) {

  var rateCache = cache.getCache({ name: 'exchange_rates', scope: cache.Scope.GLOBAL });

  function getRate(sourceCurrency, targetCurrency) {
    var key = sourceCurrency + '_' + targetCurrency + '_' + new Date().toDateString();
    var cached = rateCache.get({ key: key });
    if (cached) return parseFloat(cached);

    var rate = currency.exchangeRate({ source: sourceCurrency, target: targetCurrency });
    rateCache.put({ key: key, value: rate.toString(), ttl: 86400 }); // 24 hours
    return rate;
  }
});
```

### Cache search results for Suitelet
```javascript
require(['N/cache', 'N/search'], function(cache, search) {

  var resultCache = cache.getCache({ name: 'suitelet_search_cache', scope: cache.Scope.MODULE });

  function getCachedCustomerList() {
    var cached = resultCache.get({ key: 'active_customers' });
    if (cached) return JSON.parse(cached);

    var customers = [];
    search.create({
      type: search.Type.CUSTOMER,
      filters: [['isinactive', search.Operator.IS, 'F']],
      columns: [{ name: 'internalid' }, { name: 'companyname' }, { name: 'email' }]
    }).run().each(function(result) {
      customers.push({
        id: result.id,
        name: result.getValue({ name: 'companyname' }),
        email: result.getValue({ name: 'email' })
      });
      return customers.length < 500;
    });

    // Cache for 5 minutes — short TTL for frequently changing data
    resultCache.put({ key: 'active_customers', value: JSON.stringify(customers), ttl: 300 });
    return customers;
  }
});
```

### Invalidate cache on record save (User Event)
```javascript
function afterSubmit(context) {
  require(['N/cache'], function(cache) {
    // When configuration changes, invalidate the cached config
    if (context.newRecord.type === 'customrecord_app_config') {
      var configCache = cache.getCache({
        name: 'app_configuration',
        scope: cache.Scope.GLOBAL
      });
      configCache.remove({ key: 'config_v1' });
      log.audit({ title: 'Cache invalidated', details: 'Configuration record updated' });
    }
  });
}
```

## Notes

- Cache values must be **strings** — serialize objects and arrays with `JSON.stringify()`
  and deserialize with `JSON.parse()`
- Cache is not persistent — values expire per TTL and are cleared when the cache server restarts
- `cache.Scope.GLOBAL` caches are visible across ALL scripts — use specific cache names to
  prevent key collisions between different scripts
- Maximum key length: 300 characters
- Maximum value size: varies, but keep values small (< 10KB) for optimal performance
- `cacheObj.get()` returns `null` for missing, expired, or never-set keys
- Always check for `null` return value and implement a fallback
- Do NOT cache sensitive data like passwords — use `cache.Scope.PROTECTED` if caching tokens
