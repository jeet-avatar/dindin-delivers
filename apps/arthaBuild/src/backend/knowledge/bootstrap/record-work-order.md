---
source: SuiteScript 2.x API Reference — Work Order Record Schema
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Work Order Record (record.Type.WORK_ORDER)

Internal record type ID: `'workorder'`

A Work Order authorizes and tracks the manufacturing of an Assembly Item. It specifies
the item to build, quantity, components consumed, and operations performed.

## Record Constant

```javascript
record.Type.WORK_ORDER   // 'workorder'
search.Type.WORK_ORDER   // 'workorder'
```

## Body Fields

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `tranId` | WO # | Text | System-assigned. Format: WO-XXXX |
| `assemblyItem` | Assembly Item | Select | The item being manufactured (Assembly Item type) |
| `quantity` | Build Qty | Float | Quantity to manufacture |
| `subsidiary` | Subsidiary | Select | Required for OneWorld |
| `location` | Location | Select | Manufacturing location |
| `tranDate` | Date | Date | Work Order date |
| `startDate` | Start Date | Date | Manufacturing start date |
| `endDate` | End Date | Date | Expected completion date |
| `status` | Status | Select | See status values below |
| `buildable` | Buildable | Float | Quantity that can be built given current inventory (read-only) |
| `quantityBuilt` | Qty Built | Float | Completed quantity to date (read-only) |
| `memo` | Memo | Text | Internal notes |
| `department` | Department | Select | Manufacturing department |
| `class` | Class | Select | Classification |
| `custbody_*` | Custom Fields | Various | Custom body fields |

## Status Values

| Status | Description |
|--------|-------------|
| `'A'` | Planned |
| `'B'` | Released |
| `'C'` | In Process |
| `'D'` | Completed |
| `'E'` | Closed |

## Component Sublist (component)

Lists the raw materials and sub-assemblies consumed by this work order.

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `item` | Component | Select | Component item internal ID |
| `quantity` | Quantity | Float | Required quantity |
| `issueMethod` | Issue Method | Select | 'Manual', 'Backflush' |
| `inventorydetail` | Inventory Detail | Detail | Lot/serial details |
| `quantityissued` | Issued | Float | Quantity already issued (read-only) |
| `quantityavailable` | Available | Float | Available stock (read-only) |
| `description` | Description | Text | Component description |
| `units` | Unit | Select | Unit of measure |

### Issue Methods

```javascript
'Manual'    // Operator manually issues from inventory
'Backflush' // Components automatically deducted when WO is completed
```

## Operation Sublist (operation)

Defines manufacturing steps and routing (requires Manufacturing module):

| Field ID | Label | Notes |
|----------|-------|-------|
| `operationsequence` | Sequence | Order of operations |
| `operationname` | Operation | Name of the operation step |
| `workcenter` | Work Center | Work center for this operation |
| `setuptime` | Setup Time | Setup duration in minutes |
| `runrate` | Run Rate | Units per hour |
| `laborresource` | Labor Resource | Employee/resource |

## Assembly Build (related record)

When work is complete, create an Assembly Build to record the completion:

```javascript
// Create an Assembly Build from a Work Order
var assemblyBuild = record.transform({
  fromType: record.Type.WORK_ORDER,
  fromId: workOrderId,
  toType: record.Type.ASSEMBLY_BUILD,
  isDynamic: true
});

assemblyBuild.setValue({ fieldId: 'quantity', value: quantityBuilt });
assemblyBuild.setValue({ fieldId: 'tranDate', value: new Date() });

var buildId = assemblyBuild.save();
log.audit({ title: 'Assembly Build created', details: 'Build ID: ' + buildId });
```

## Common Operations

### Create a Work Order
```javascript
var wo = record.create({
  type: record.Type.WORK_ORDER,
  isDynamic: true
});

wo.setValue({ fieldId: 'assemblyItem', value: assemblyItemId });
wo.setValue({ fieldId: 'quantity', value: 50 });
wo.setValue({ fieldId: 'subsidiary', value: 1 });
wo.setValue({ fieldId: 'location', value: warehouseLocationId });
wo.setValue({ fieldId: 'tranDate', value: new Date() });
wo.setValue({ fieldId: 'startDate', value: new Date() });
wo.setValue({ fieldId: 'endDate', value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }); // +7 days
wo.setValue({ fieldId: 'memo', value: 'Production run for Q1 order' });

var woId = wo.save();
```

### Load and check buildable quantity
```javascript
var wo = record.load({ type: record.Type.WORK_ORDER, id: woId });
var tranId = wo.getValue({ fieldId: 'tranId' });
var buildableQty = wo.getValue({ fieldId: 'buildable' });
var targetQty = wo.getValue({ fieldId: 'quantity' });
var statusText = wo.getText({ fieldId: 'status' });

log.debug({
  title: tranId,
  details: 'Target: ' + targetQty + ', Buildable: ' + buildableQty + ', Status: ' + statusText
});
```

### Read component list
```javascript
var wo = record.load({ type: record.Type.WORK_ORDER, id: woId });
var compCount = wo.getLineCount({ sublistId: 'component' });

for (var i = 0; i < compCount; i++) {
  var comp = wo.getSublistValue({ sublistId: 'component', fieldId: 'item', line: i });
  var qty = wo.getSublistValue({ sublistId: 'component', fieldId: 'quantity', line: i });
  var available = wo.getSublistValue({ sublistId: 'component', fieldId: 'quantityavailable', line: i });
  log.debug({ title: 'Component ' + i, details: 'Item: ' + comp + ', Req: ' + qty + ', Available: ' + available });
}
```

### Search Work Orders
```javascript
var woSearch = search.create({
  type: search.Type.WORK_ORDER,
  filters: [
    ['status', search.Operator.ANY_OF, ['Released', 'InProcess']],
    'AND',
    ['startdate', search.Operator.BEFORE, new Date()]
  ],
  columns: [
    search.createColumn({ name: 'tranId' }),
    search.createColumn({ name: 'assemblyItem' }),
    search.createColumn({ name: 'quantity' }),
    search.createColumn({ name: 'buildable' }),
    search.createColumn({ name: 'status' }),
    search.createColumn({ name: 'startdate' }),
    search.createColumn({ name: 'enddate' })
  ]
});
```

## Common Search Filters

| Field | Operator | Use Case |
|-------|----------|----------|
| `status` | ANY_OF | Filter by build status |
| `assemblyItem` | IS | Filter by specific assembly |
| `location` | IS | Filter by production location |
| `startdate` | BEFORE | Find overdue work orders |
| `enddate` | WITHIN | Work orders due in date range |
| `subsidiary` | IS | Filter by subsidiary |

## Notes

- Work Orders require the Manufacturing module or at minimum the Assembly Build feature
- `buildable` is calculated: min of (required qty × ratio) for each component that has sufficient stock
- Setting status to 'Released' makes the WO active for shop floor scheduling
- Assembly Builds consume the components from inventory and add the finished goods
- Close a WO after completion to finalize and prevent further assembly builds against it
