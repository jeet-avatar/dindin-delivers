---
source: SuiteScript 2.x API Reference — Sales Order Record Schema
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Sales Order Record (record.Type.SALES_ORDER)

Internal record type ID: `'salesorder'`

The Sales Order is the primary transaction for customer orders. It drives the fulfillment
and invoicing process.

## Record Constant

```javascript
record.Type.SALES_ORDER   // 'salesorder'
search.Type.SALES_ORDER   // 'salesorder'
```

## Body Fields

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `tranId` | Order # | Text | System-assigned. Format: SO-XXXX |
| `entity` | Customer | Select | Internal ID of customer record |
| `subsidiary` | Subsidiary | Select | Required for OneWorld accounts |
| `tranDate` | Date | Date | Transaction date |
| `status` | Status | Select | See status values below |
| `amount` | Amount | Currency | Total order amount (read-only calculated) |
| `subtotal` | Subtotal | Currency | Before tax and shipping |
| `taxTotal` | Tax Total | Currency | Calculated from tax codes on lines |
| `shippingCost` | Shipping | Currency | Shipping charge |
| `otherRefNum` | PO # | Text | Customer's PO reference number |
| `memo` | Memo | Text | Internal notes |
| `terms` | Terms | Select | Payment terms (e.g., Net 30) |
| `salesrep` | Sales Rep | Select | Employee internal ID |
| `department` | Department | Select | Department classification |
| `location` | Location | Select | Fulfillment location |
| `class` | Class | Select | Class classification |
| `currency` | Currency | Select | Transaction currency |
| `exchangeRate` | Exchange Rate | Float | FX rate to base currency |
| `dueDate` | Payment Due | Date | Calculated from terms |
| `shipDate` | Ship Date | Date | Expected ship date |
| `shipMethod` | Ship Method | Select | Shipping carrier/method |
| `shipTo` | Ship To | Select | Shipping address (from addressbook) |
| `billTo` | Bill To | Select | Billing address (from addressbook) |
| `custbody_*` | Custom Fields | Various | Customer-defined body fields |

## Status Values

| Status Code | Display Label |
|------------|---------------|
| `'A'` | Pending Approval |
| `'B'` | Pending Fulfillment |
| `'C'` | Cancelled |
| `'D'` | Partially Fulfilled |
| `'E'` | Pending Billing/Partially Fulfilled |
| `'F'` | Pending Billing |
| `'G'` | Billed |
| `'H'` | Fully Billed |

## Sublists

### item (Line Items)

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `item` | Item | Select | Item internal ID |
| `quantity` | Qty | Float | Ordered quantity |
| `rate` | Unit Price | Currency | Price per unit |
| `amount` | Amount | Currency | quantity × rate (calculated) |
| `description` | Description | Text | Item description |
| `taxcode` | Tax Code | Select | Tax code for this line |
| `taxrate1` | Tax Rate | Percent | Tax percentage |
| `units` | Unit | Select | Unit of measure (if enabled) |
| `department` | Department | Select | Override line-level department |
| `location` | Location | Select | Override line-level location |
| `commitinventory` | Commit | Select | Inventory commitment type |
| `quantitycommitted` | Committed | Float | Committed quantity (read-only) |
| `quantityfulfilled` | Fulfilled | Float | Fulfilled quantity (read-only) |
| `quantitybilled` | Billed | Float | Billed quantity (read-only) |

### shipping (Shipping Lines)

| Field ID | Label | Notes |
|----------|-------|-------|
| `shippingmethod` | Ship Method | Carrier selection |
| `shippingcost` | Ship Cost | Shipping line amount |

### partner (Partners)

Linked partner records for commission tracking.

### salesteam (Sales Team)

Sales team members and commission splits.

## Address Sublists

### billingaddress / shippingaddress
Address fields accessible via:
```javascript
var addr = rec.getSublistValue({ sublistId: 'billingaddress', fieldId: 'addr1', line: 0 });
// Fields: addr1, addr2, city, state, zip, country
```

## Record Transforms

```javascript
// Estimate → Sales Order
record.transform({
  fromType: record.Type.ESTIMATE,
  fromId: estimateId,
  toType: record.Type.SALES_ORDER
});

// Sales Order → Item Fulfillment (ship)
record.transform({
  fromType: record.Type.SALES_ORDER,
  fromId: soId,
  toType: record.Type.ITEM_FULFILLMENT,
  isDynamic: true
});

// Sales Order → Invoice
record.transform({
  fromType: record.Type.SALES_ORDER,
  fromId: soId,
  toType: record.Type.INVOICE
});

// Sales Order → Credit Memo
record.transform({
  fromType: record.Type.SALES_ORDER,
  fromId: soId,
  toType: record.Type.CREDIT_MEMO
});
```

## Common Operations

### Load a Sales Order
```javascript
var so = record.load({
  type: record.Type.SALES_ORDER,
  id: orderId,
  isDynamic: true
});
var tranId = so.getValue({ fieldId: 'tranId' });
var status = so.getText({ fieldId: 'status' });
var amount = so.getValue({ fieldId: 'amount' });
```

### Create a Sales Order
```javascript
var so = record.create({
  type: record.Type.SALES_ORDER,
  isDynamic: true
});
so.setValue({ fieldId: 'entity', value: customerId });
so.setValue({ fieldId: 'tranDate', value: new Date() });
so.setValue({ fieldId: 'memo', value: 'Web order' });
so.selectNewLine({ sublistId: 'item' });
so.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
so.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 2 });
so.commitLine({ sublistId: 'item' });
var newId = so.save();
```

### Search for Sales Orders
```javascript
var soSearch = search.create({
  type: search.Type.SALES_ORDER,
  filters: [
    ['status', search.Operator.ANY_OF, ['pendingFulfillment', 'partiallyFulfilled']],
    'AND',
    ['tranDate', search.Operator.WITHIN, 'thisMonth']
  ],
  columns: [
    search.createColumn({ name: 'tranId' }),
    search.createColumn({ name: 'entity', label: 'Customer' }),
    search.createColumn({ name: 'amount' }),
    search.createColumn({ name: 'status' })
  ]
});
```

### Read line items
```javascript
var lineCount = so.getLineCount({ sublistId: 'item' });
for (var i = 0; i < lineCount; i++) {
  var item = so.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
  var qty = so.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
  var amount = so.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i });
  log.debug({ title: 'Line ' + i, details: item + ': ' + qty + ' x $' + amount });
}
```

## Common Search Filters

| Field | Operator | Common Values |
|-------|----------|---------------|
| `status` | ANY_OF | pendingFulfillment, partiallyFulfilled |
| `tranDate` | WITHIN | today, thisWeek, thisMonth |
| `entity` | IS | customer internal ID |
| `salesrep` | IS | sales rep internal ID |
| `subsidiary` | IS | subsidiary internal ID |
| `amount` | GREATER_THAN | amount threshold |
| `mainline` | IS | 'T' (use to get header-only results, not lines) |
