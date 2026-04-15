---
source: SuiteScript 2.x API Reference — Invoice Record Schema
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Invoice Record (record.Type.INVOICE)

Internal record type ID: `'invoice'`

An Invoice is a billing document sent to customers. It can be created from a Sales Order
(transform) or directly. Paid by applying a Customer Payment.

## Record Constant

```javascript
record.Type.INVOICE   // 'invoice'
search.Type.INVOICE   // 'invoice'
```

## Body Fields

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `tranId` | Invoice # | Text | System-assigned. Format: INV-XXXX |
| `entity` | Customer | Select | Customer internal ID |
| `subsidiary` | Subsidiary | Select | Required for OneWorld |
| `tranDate` | Date | Date | Invoice date |
| `status` | Status | Select | 'open' or 'paidInFull' |
| `amount` | Amount | Currency | Total invoice amount (calculated) |
| `amountremaining` | Amount Due | Currency | Unpaid balance (read-only) |
| `amountpaid` | Amount Paid | Currency | Total payments applied (read-only) |
| `subtotal` | Subtotal | Currency | Before tax and shipping |
| `taxtotal` | Tax Total | Currency | Calculated tax amount |
| `shippingcost` | Shipping | Currency | Shipping charge |
| `duedate` | Due Date | Date | Payment due date (from terms) |
| `terms` | Terms | Select | Payment terms |
| `memo` | Memo | Text | Internal notes |
| `message` | Message | Text | Customer-facing message on invoice |
| `salesrep` | Sales Rep | Select | Employee |
| `department` | Department | Select | Department |
| `location` | Location | Select | Location |
| `class` | Class | Select | Class |
| `currency` | Currency | Select | Invoice currency |
| `exchangeRate` | Exchange Rate | Float | FX rate |
| `otherRefNum` | PO # | Text | Customer PO reference |
| `createdfrom` | Created From | Select | Source Sales Order ID |
| `custbody_*` | Custom Fields | Various | Custom body fields |

## Status Values

```javascript
// Invoice status field values:
'open'        // Unpaid or partially paid
'paidInFull'  // Fully paid
```

## Sublists

### item (Invoice Lines)

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `item` | Item | Select | Item internal ID |
| `quantity` | Qty | Float | Billed quantity |
| `rate` | Unit Price | Currency | Price per unit |
| `amount` | Amount | Currency | Calculated line amount |
| `description` | Description | Text | Line description |
| `taxcode` | Tax Code | Select | Tax code |
| `taxrate1` | Tax Rate | Percent | Tax percentage |
| `units` | Unit | Select | Unit of measure |
| `department` | Department | Select | Line department override |

### apply (Payment Application)
Shows payments, credits, and deposits applied to this invoice.

| Field ID | Label | Notes |
|----------|-------|-------|
| `internalid` | ID | Payment/credit internal ID |
| `type` | Type | 'Payment', 'Credit Memo', 'Deposit' |
| `total` | Amount | Total amount of applied payment |
| `amount` | Applied | Amount applied to this invoice |
| `apply` | Apply | Boolean — whether this payment is applied |
| `refnum` | Ref # | Reference number of payment |
| `doc` | Date | Date of payment |

## Creating an Invoice

### Direct creation (standalone invoice)
```javascript
var inv = record.create({
  type: record.Type.INVOICE,
  isDynamic: true
});
inv.setValue({ fieldId: 'entity', value: customerId });
inv.setValue({ fieldId: 'tranDate', value: new Date() });
inv.setValue({ fieldId: 'memo', value: 'Services rendered January 2024' });

inv.selectNewLine({ sublistId: 'item' });
inv.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: serviceItemId });
inv.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 10 });
inv.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 150 });
inv.commitLine({ sublistId: 'item' });

var invId = inv.save();
```

### From Sales Order (transform)
```javascript
var inv = record.transform({
  fromType: record.Type.SALES_ORDER,
  fromId: soId,
  toType: record.Type.INVOICE
});
var invId = inv.save();
```

### Load and check balance
```javascript
var inv = record.load({ type: record.Type.INVOICE, id: invId });
var status = inv.getValue({ fieldId: 'status' });  // 'open' or 'paidInFull'
var totalAmount = inv.getValue({ fieldId: 'amount' });
var amountDue = inv.getValue({ fieldId: 'amountremaining' });
var dueDate = inv.getValue({ fieldId: 'duedate' });

log.debug({
  title: 'Invoice ' + inv.getValue({ fieldId: 'tranId' }),
  details: 'Amount: $' + totalAmount + ', Due: $' + amountDue + ', Due Date: ' + dueDate
});
```

## Search for Open Invoices

```javascript
var openInvSearch = search.create({
  type: search.Type.INVOICE,
  filters: [
    ['status', search.Operator.IS, 'open'],
    'AND',
    ['amountremaining', search.Operator.GREATER_THAN, '0'],
    'AND',
    ['duedate', search.Operator.BEFORE, new Date()]  // Overdue
  ],
  columns: [
    search.createColumn({ name: 'tranId' }),
    search.createColumn({ name: 'entity' }),
    search.createColumn({ name: 'amount' }),
    search.createColumn({ name: 'amountremaining' }),
    search.createColumn({ name: 'duedate' })
  ]
});

openInvSearch.run().each(function(result) {
  log.debug({
    title: 'Overdue invoice',
    details: result.getValue({ name: 'tranId' }) + ' - Due: $' +
             result.getValue({ name: 'amountremaining' })
  });
  return true;
});
```

## Applying a Customer Payment

Customer Payments are created separately and reference invoice(s):

```javascript
var payment = record.create({
  type: record.Type.CUSTOMER_PAYMENT,
  isDynamic: true,
  defaultValues: { entity: customerId }
});
payment.setValue({ fieldId: 'tranDate', value: new Date() });
payment.setValue({ fieldId: 'payment', value: 1500 }); // Payment amount

// Apply to a specific invoice
var applyCount = payment.getLineCount({ sublistId: 'apply' });
for (var i = 0; i < applyCount; i++) {
  var applyInvId = payment.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
  if (applyInvId == targetInvoiceId) {
    payment.selectLine({ sublistId: 'apply', line: i });
    payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
    payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: 1500 });
    payment.commitLine({ sublistId: 'apply' });
    break;
  }
}
var paymentId = payment.save();
```

## Common Search Filters

| Field | Operator | Use Case |
|-------|----------|----------|
| `status` | IS | 'open' or 'paidInFull' |
| `amountremaining` | GREATER_THAN | Find invoices with balance due |
| `duedate` | BEFORE | Find overdue invoices |
| `entity` | IS | Filter by customer |
| `tranDate` | WITHIN | Date range |
| `mainline` | IS | 'T' for header-only results |
| `createdfrom` | IS | Filter by source Sales Order |
