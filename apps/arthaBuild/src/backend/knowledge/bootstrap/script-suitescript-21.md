---
source: SuiteScript 2.x API Reference — SuiteScript 2.1 Features
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# SuiteScript 2.1 Features

SuiteScript 2.1 is an enhanced version of the SuiteScript 2.0 API that adds support for
modern JavaScript syntax including async/await, ES2019 features, and improved module patterns.
Always prefer 2.1 for new scripts.

## Declaring SuiteScript 2.1

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
```

The `@NApiVersion 2.1` JSDoc tag is required to opt in to the 2.1 engine.

## Async/Await Support

SuiteScript 2.1 supports `async function` declarations and the `await` keyword.

### Async entry points
```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/https', 'N/log'], (record, https, log) => {

  const execute = async (context) => {
    log.audit({ title: 'Start', details: context.type });

    try {
      const result = await processOrders();
      log.audit({ title: 'Done', details: result.count + ' orders processed' });
    } catch (e) {
      log.error({ title: 'Failed', details: e.message });
      throw e;
    }
  };

  const processOrders = async () => {
    const orders = await fetchOrders();
    const results = await Promise.all(orders.map(o => processOrder(o)));
    return { count: results.length };
  };

  return { execute };
});
```

### Async/await in Client Scripts (saveRecord)
```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/ui/dialog'], (dialog) => {

  const saveRecord = async (context) => {
    const rec = context.currentRecord;
    const amount = rec.getValue({ fieldId: 'amount' });

    if (amount > 50000) {
      const confirmed = await dialog.confirm({
        title: 'Large Order',
        message: 'Amount exceeds $50,000. Proceed?'
      });
      if (!confirmed) return false;
    }
    return true;
  };

  return { saveRecord };
});
```

## ES2019 Language Features

SuiteScript 2.1 supports ES2019 natively:

### Arrow functions
```javascript
const items = results.map(r => ({
  id: r.id,
  amount: parseFloat(r.getValue({ name: 'amount' }))
}));
```

### Array.flat() and Array.flatMap()
```javascript
const nested = [[1, 2], [3, 4], [5, 6]];
const flat = nested.flat(); // [1, 2, 3, 4, 5, 6]

const doubled = nested.flatMap(arr => arr.map(x => x * 2));
// [2, 4, 6, 8, 10, 12]
```

### Object.fromEntries()
```javascript
const entries = [['name', 'John'], ['age', 30]];
const obj = Object.fromEntries(entries);
// { name: 'John', age: 30 }

// Convert Map to object
const map = new Map([['key1', 'val1'], ['key2', 'val2']]);
const fromMap = Object.fromEntries(map);
```

### Optional catch binding
```javascript
try {
  riskyOperation();
} catch {
  // No need to name the error variable if not using it
  log.error({ title: 'Error', details: 'Operation failed' });
}
```

### Template literals (ES6+ — available in 2.0 and 2.1)
```javascript
const message = `Order ${tranId} created for customer ${customerName}`;
const html = `
  <div class="order">
    <h2>${title}</h2>
    <p>Amount: $${amount.toFixed(2)}</p>
  </div>
`;
```

### Destructuring assignment
```javascript
// Object destructuring
const { id, name, email } = customerRecord;

// Array destructuring
const [first, ...rest] = resultsArray;

// Destructuring with defaults
const { timeout = 30, retries = 3 } = config;

// Destructuring in function parameters
function processResult({ id, name, values }) {
  log.debug({ title: name, details: id });
}
```

### Spread operator
```javascript
// Object spread
const base = { type: 'salesorder', enableSourcing: true };
const extended = { ...base, isDynamic: true };

// Array spread
const allFilters = [...baseFilters, ...additionalFilters];
```

### const and let (prefer over var)
```javascript
// const for values that don't change
const rec = record.load({ type: record.Type.SALES_ORDER, id: orderId });
const amount = rec.getValue({ fieldId: 'amount' });

// let for values that may be reassigned
let processedCount = 0;
let lastId = 0;
```

## Module Syntax (ES Modules vs. define)

Both `define()` (AMD) and arrow function modules work in 2.1:

```javascript
// AMD style (SuiteScript 2.0 and 2.1)
define(['N/record'], function(record) {
  return { execute: function(context) {} };
});

// Arrow function shorthand (2.1 only)
define(['N/record'], (record) => {
  const execute = (context) => {};
  return { execute };
});
```

## SuiteScript 2.0 vs. 2.1 Comparison

| Feature | SuiteScript 2.0 | SuiteScript 2.1 |
|---------|----------------|----------------|
| async/await | No | YES |
| Arrow functions | No | YES |
| Array.flat / flatMap | No | YES |
| Object.fromEntries | No | YES |
| Template literals | No | YES |
| const / let | No (var only) | YES |
| Destructuring | No | YES |
| Spread operator | No | YES |
| require() | YES | YES |
| define() | YES | YES |
| All N/ modules | YES | YES |

## Top-Level Patterns in 2.1

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/email'], (record, search, email) => {

  const AUTHOR_ID = 5;  // Centralized constant

  const getCustomerEmail = (customerId) => {
    const result = search.lookupFields({
      type: search.Type.CUSTOMER,
      id: customerId,
      columns: ['email']
    });
    return result.email;
  };

  const afterSubmit = async (context) => {
    if (context.type !== context.UserEventType.CREATE) return;

    const { newRecord } = context;
    const entity = newRecord.getValue({ fieldId: 'entity' });
    const customerEmail = getCustomerEmail(entity);

    await email.send({
      author: AUTHOR_ID,
      recipients: [customerEmail],
      subject: `Order ${newRecord.getValue({ fieldId: 'tranId' })} confirmed`,
      body: 'Your order has been confirmed.'
    });
  };

  return { afterSubmit };
});
```

## Notes

- `@NApiVersion 2.1` is required — without it, the script runs under the 2.0 engine
  which does not support async/await or ES2019 features
- Mixing `var` and `const`/`let` within the same file is valid but not recommended
- `async` entry points work in all server-side script types (Scheduled, UserEvent, RESTlet, etc.)
- For Client Scripts, `async saveRecord` requires SuiteScript 2.1 to use `await dialog.confirm()`
- All SuiteScript 2.0 code is fully compatible with 2.1 — no migration needed
