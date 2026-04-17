---
source: SuiteScript 2.x API Reference — Purchase Order Record Schema
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Purchase Order Record (record.Type.PURCHASE_ORDER)

Internal record type ID: `'purchaseorder'`

The Purchase Order is the primary transaction for purchasing goods and services from vendors.
It drives the receiving and vendor bill process.

## Record Constant

```javascript
record.Type.PURCHASE_ORDER   // 'purchaseorder'
search.Type.PURCHASE_ORDER   // 'purchaseorder'
```

## Body Fields

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `tranId` | PO # | Text | System-assigned. Format: PO-XXXX |
| `entity` | Vendor | Select | Internal ID of vendor record |
| `subsidiary` | Subsidiary | Select | Required for OneWorld |
| `tranDate` | Date | Date | Transaction date |
| `status` | Status | Select | See status values below |
| `approvalStatus` | Approval Status | Select | For workflow-based approval |
| `amount` | Amount | Currency | Total PO amount (calculated) |
| `subtotal` | Subtotal | Currency | Before tax and shipping |
| `taxTotal` | Tax Total | Currency | Calculated from line tax codes |
| `shippingCost` | Freight | Currency | Shipping/freight charge |
| `memo` | Memo | Text | Internal notes |
| `terms` | Terms | Select | Payment terms from vendor |
| `department` | Department | Select | Requesting department |
| `location` | Location | Select | Receiving location |
| `class` | Class | Select | Class classification |
| `currency` | Currency | Select | Vendor's billing currency |
| `exchangeRate` | Exchange Rate | Float | FX rate to base currency |
| `shipDate` | Ship Date | Date | Expected receipt date |
| `shipTo` | Ship To | Select | Receiving address |
| `incoterm` | Incoterm | Select | International trade terms |
| `dueDate` | Due Date | Date | Derived from terms |
| `custbody_*` | Custom Fields | Various | Custom body fields |

## Status Values

| Status Code | Display Label |
|------------|---------------|
| `'A'` | Pending Supervisor Approval |
| `'B'` | Pending Receipt |
| `'C'` | Rejected |
| `'D'` | Partially Received |
| `'E'` | Pending Bill/Partially Received |
| `'F'` | Fully Received |
| `'G'` | Closed |
| `'H'` | Fully Billed |

## Approval Status Values

```javascript
// approvalStatus field values:
'1' // Pending Approval
'2' // Approved
'3' // Rejected
```

## Sublists

### item (Line Items)

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `item` | Item | Select | Item internal ID |
| `quantity` | Qty | Float | Ordered quantity |
| `rate` | Unit Price | Currency | Price per unit |
| `amount` | Amount | Currency | Calculated line amount |
| `description` | Description | Text | Line description |
| `taxcode` | Tax Code | Select | Tax code for this line |
| `units` | Unit | Select | Unit of measure |
| `department` | Department | Select | Line-level department |
| `location` | Location | Select | Line-level receiving location |
| `quantityreceived` | Received | Float | Received to date (read-only) |
| `quantitybilled` | Billed | Float | Billed to date (read-only) |
| `expectedreceiptdate` | Expected | Date | Expected receipt date per line |

### expense (Expense Lines)
For non-item expenses on a PO:

| Field ID | Label | Notes |
|----------|-------|-------|
| `account` | Account | GL account for expense |
| `amount` | Amount | Expense amount |
| `memo` | Memo | Line note |
| `department` | Department | Department override |

## Record Transforms

```javascript
// Purchase Order → Item Receipt (receiving goods)
record.transform({
  fromType: record.Type.PURCHASE_ORDER,
  fromId: poId,
  toType: record.Type.ITEM_RECEIPT,
  isDynamic: true
});

// Purchase Order → Vendor Bill
record.transform({
  fromType: record.Type.PURCHASE_ORDER,
  fromId: poId,
  toType: record.Type.VENDOR_BILL
});
```

## Common Operations

### Create a Purchase Order
```javascript
var po = record.create({
  type: record.Type.PURCHASE_ORDER,
  isDynamic: true
});
po.setValue({ fieldId: 'entity', value: vendorId });
po.setValue({ fieldId: 'tranDate', value: new Date() });
po.setValue({ fieldId: 'memo', value: 'Monthly supply order' });

po.selectNewLine({ sublistId: 'item' });
po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 100 });
po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 5.99 });
po.commitLine({ sublistId: 'item' });

var poId = po.save();
log.audit({ title: 'PO created', details: 'PO ID: ' + poId });
```

### Load and check status
```javascript
var po = record.load({ type: record.Type.PURCHASE_ORDER, id: poId });
var status = po.getText({ fieldId: 'status' });
var amount = po.getValue({ fieldId: 'amount' });
var entity = po.getText({ fieldId: 'entity' });
```

### Create Item Receipt from PO
```javascript
var receipt = record.transform({
  fromType: record.Type.PURCHASE_ORDER,
  fromId: poId,
  toType: record.Type.ITEM_RECEIPT,
  isDynamic: true
});

// Set received quantities per line
var lineCount = receipt.getLineCount({ sublistId: 'item' });
for (var i = 0; i < lineCount; i++) {
  receipt.selectLine({ sublistId: 'item', line: i });
  receipt.setCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'quantity',
    value: actualReceivedQty[i]
  });
  receipt.commitLine({ sublistId: 'item' });
}

var receiptId = receipt.save();
```

### Search for open POs
```javascript
var poSearch = search.create({
  type: search.Type.PURCHASE_ORDER,
  filters: [
    ['status', search.Operator.ANY_OF, ['pendingReceipt', 'partiallyReceived']],
    'AND',
    ['tranDate', search.Operator.WITHIN, 'lastMonth']
  ],
  columns: [
    search.createColumn({ name: 'tranId' }),
    search.createColumn({ name: 'entity', label: 'Vendor' }),
    search.createColumn({ name: 'amount' }),
    search.createColumn({ name: 'status' }),
    search.createColumn({ name: 'tranDate' })
  ]
});
```

## Common Search Filters

| Field | Operator | Use Case |
|-------|----------|----------|
| `status` | ANY_OF | Filter by receipt/billing status |
| `entity` | IS | Filter by specific vendor |
| `approvalstatus` | IS | Filter pending/approved/rejected |
| `tranDate` | WITHIN | Date range filtering |
| `item` | IS | Filter by item being ordered |
| `subsidiary` | IS | Filter by subsidiary |
| `mainline` | IS | 'T' for header-only results |

## Notes

- Purchase Orders require vendor approval workflows if `approvalStatus` field is used
- `quantityreceived` and `quantitybilled` on line items are read-only — updated by transforms
- Vendor Bill creation via `record.transform()` creates a Vendor Bill referencing the PO
- Item Receipt marks goods as received and updates inventory (if inventory tracking is enabled)
- Closed POs cannot be modified or received against
