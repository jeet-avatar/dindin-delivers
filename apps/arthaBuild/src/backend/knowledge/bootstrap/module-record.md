---
source: SuiteScript 2.x API Reference — N/record Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/record Module

The N/record module is the primary server-side module for creating, loading, editing, copying,
transforming, and deleting NetSuite records. It is available in all server-side script types.

## Loading the Module

```javascript
// SuiteScript 2.0
define(['N/record'], function(record) { ... });

// SuiteScript 2.1
require(['N/record'], (record) => { ... });
```

## Core Methods

### record.load(options)
Loads an existing NetSuite record.

```javascript
var rec = record.load({
  type: record.Type.SALES_ORDER,
  id: 1234,
  isDynamic: false   // optional; default false
});
```

- `type` (string|record.Type): Required. The record type internal ID.
- `id` (number|string): Required. The internal ID of the record.
- `isDynamic` (boolean): Optional. If true, record is loaded in dynamic mode.
- Returns: `Record` object

### record.create(options)
Creates a new record instance (not yet saved to DB).

```javascript
var rec = record.create({
  type: record.Type.SALES_ORDER,
  isDynamic: true,
  defaultValues: {
    entity: 100   // pre-populate customer
  }
});
```

- `type` (string|record.Type): Required. The record type.
- `isDynamic` (boolean): Optional. Default false.
- `defaultValues` (Object): Optional. Key-value pairs for pre-populated field values.
- Returns: `Record` object (unsaved)

### record.save(options) / rec.save()
Saves the record to the database.

```javascript
var newId = rec.save({
  enableSourcing: true,      // optional; default true
  ignoreMandatoryFields: false // optional; default false
});
// Returns internal ID (number)
```

### record.submitFields(options)
Updates specific fields on a record without loading the full record. More efficient for partial updates.

```javascript
var submittedId = record.submitFields({
  type: record.Type.CUSTOMER,
  id: 500,
  values: {
    custentity_myfield: 'new value',
    email: 'new@email.com'
  },
  options: {
    enableSourcing: false,
    ignoreMandatoryFields: true
  }
});
```

- Returns internal ID (number)

### record.copy(options)
Creates a copy of an existing record.

```javascript
var copiedRec = record.copy({
  type: record.Type.SALES_ORDER,
  id: 1234
});
```

### record.transform(options)
Transforms one record type into another (e.g., Estimate → Sales Order).

```javascript
var soRec = record.transform({
  fromType: record.Type.ESTIMATE,
  fromId: 567,
  toType: record.Type.SALES_ORDER,
  isDynamic: true,
  defaultValues: {}
});
```

### record.delete(options)
Deletes a record permanently.

```javascript
record.delete({
  type: record.Type.SALES_ORDER,
  id: 1234
});
```

## Field Access Methods (on Record object)

```javascript
// Get value
var value = rec.getValue({ fieldId: 'entity' });

// Set value
rec.setValue({ fieldId: 'memo', value: 'Updated memo' });

// Get display text (for select/list fields)
var text = rec.getText({ fieldId: 'status' });

// Set by display text
rec.setText({ fieldId: 'terms', text: 'Net 30' });
```

## Sublist Access Methods

```javascript
// Get value from a sublist line
var lineItem = rec.getSublistValue({
  sublistId: 'item',
  fieldId: 'item',
  line: 0   // 0-indexed
});

// Set value in a sublist line
rec.setSublistValue({
  sublistId: 'item',
  fieldId: 'quantity',
  line: 0,
  value: 5
});

// Get number of lines
var lineCount = rec.getLineCount({ sublistId: 'item' });

// Insert a new line
rec.insertLine({ sublistId: 'item', line: 0 });

// Remove a line
rec.removeLine({ sublistId: 'item', line: 2 });
```

## Dynamic Mode Sublist Methods

In dynamic mode, you must select a line before editing:

```javascript
// Select line for editing
rec.selectLine({ sublistId: 'item', line: 1 });

// Set value on the currently selected line
rec.setCurrentSublistValue({
  sublistId: 'item',
  fieldId: 'quantity',
  value: 10
});

// Get value from currently selected line
var qty = rec.getCurrentSublistValue({
  sublistId: 'item',
  fieldId: 'quantity'
});

// Commit changes to the line
rec.commitLine({ sublistId: 'item' });

// Select new line (appends at end)
rec.selectNewLine({ sublistId: 'item' });
```

## record.Type Constants

```javascript
record.Type.SALES_ORDER           // 'salesorder'
record.Type.PURCHASE_ORDER        // 'purchaseorder'
record.Type.INVOICE               // 'invoice'
record.Type.CUSTOMER              // 'customer'
record.Type.VENDOR                // 'vendor'
record.Type.EMPLOYEE              // 'employee'
record.Type.ESTIMATE              // 'estimate'
record.Type.CASH_SALE             // 'cashsale'
record.Type.CREDIT_MEMO           // 'creditmemo'
record.Type.VENDOR_BILL           // 'vendorbill'
record.Type.ITEM_FULFILLMENT      // 'itemfulfillment'
record.Type.ITEM_RECEIPT          // 'itemreceipt'
record.Type.JOURNAL_ENTRY         // 'journalentry'
record.Type.INVENTORY_ADJUSTMENT  // 'inventoryadjustment'
record.Type.OPPORTUNITY           // 'opportunity'
record.Type.RETURN_AUTHORIZATION  // 'returnauthorization'
record.Type.DEPOSIT               // 'deposit'
record.Type.CUSTOMER_PAYMENT      // 'customerpayment'
record.Type.VENDOR_PAYMENT        // 'vendorpayment'
record.Type.WORK_ORDER            // 'workorder'
record.Type.ASSEMBLY_BUILD        // 'assemblybuild'
record.Type.PROJECT               // 'job'
record.Type.INVENTORY_ITEM        // 'inventoryitem'
record.Type.NON_INVENTORY_ITEM    // 'noninventoryitem'
record.Type.SERVICE_ITEM          // 'serviceitem'
record.Type.ASSEMBLY_ITEM         // 'assemblyitem'
```

## Dynamic vs. Standard Mode

| Feature | Standard Mode | Dynamic Mode |
|---------|--------------|--------------|
| Line editing | setSublistValue() direct | selectLine() → set → commitLine() |
| Performance | Faster for bulk | Slower but triggers sourcing |
| Sourcing | Manual | Automatic (like UI) |
| Default values | No | Yes (defaultValues param) |
| Use case | Bulk data import | Mimicking user interaction |

## N/transaction Module

Related module for transaction-specific operations:

```javascript
require(['N/transaction'], function(transaction) {

  // Void a transaction
  transaction.void({
    type: transaction.Type.SALES_ORDER,
    id: 1234
  });

  // Find base currency amount
  var amount = transaction.findBaseCurrencyAmount({
    transactionId: 1234,
    fxAmount: 100.00,
    currency: 'EUR'
  });
});
```

## Common Patterns

### Load, Edit, Save
```javascript
require(['N/record'], function(record) {
  var rec = record.load({
    type: record.Type.CUSTOMER,
    id: 100
  });
  rec.setValue({ fieldId: 'email', value: 'new@example.com' });
  var id = rec.save();
  log.audit({ title: 'Saved', details: 'Customer ID: ' + id });
});
```

### Create a Sales Order
```javascript
var so = record.create({
  type: record.Type.SALES_ORDER,
  isDynamic: true
});
so.setValue({ fieldId: 'entity', value: 200 });
so.setValue({ fieldId: 'tranDate', value: new Date() });
so.selectNewLine({ sublistId: 'item' });
so.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 50 });
so.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 2 });
so.commitLine({ sublistId: 'item' });
var newId = so.save();
```
