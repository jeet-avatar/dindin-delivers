---
source: Oracle NetSuite Official Documentation — Plan to Produce (Manufacturing)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Plan to Produce (Manufacturing)

## Overview

Plan to Produce covers NetSuite's manufacturing module:
Bill of Materials (BOM) defines what to build, Routing defines how to build it,
Work Orders trigger production, and Assembly Builds record completion.

---

## Bill of Materials (BOM)

A BOM defines the components required to build one unit of a finished good.

**Navigation:** Lists > Manufacturing > Bill of Materials > New

**Record Type:** `record.Type.BOM`

### Key BOM Fields

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| name               | BOM name (usually = parent item name)                   |
| memo               | Description                                             |
| includeChildren    | Include child assembly components in flat BOM           |
| isDefault          | This is the default BOM for the assembly item            |

### BOM Components (component sublist)

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| item               | Component item                                           |
| quantity           | Quantity per parent unit                                 |
| units              | Unit of measure                                         |
| internalId         | BOM line internal ID                                    |

---

## Creating a BOM (SuiteScript)

```javascript
define(['N/record'], function(record) {
    var bom = record.create({ type: record.Type.BOM, isDynamic: true });
    bom.setValue({ fieldId: 'name', value: 'Widget Assembly BOM Rev-A' });

    // Add component
    bom.selectNewLine({ sublistId: 'component' });
    bom.setCurrentSublistValue({ sublistId: 'component', fieldId: 'item', value: 100 }); // Frame
    bom.setCurrentSublistValue({ sublistId: 'component', fieldId: 'quantity', value: 1 });
    bom.commitLine({ sublistId: 'component' });

    bom.selectNewLine({ sublistId: 'component' });
    bom.setCurrentSublistValue({ sublistId: 'component', fieldId: 'item', value: 101 }); // Motor
    bom.setCurrentSublistValue({ sublistId: 'component', fieldId: 'quantity', value: 2 });
    bom.commitLine({ sublistId: 'component' });

    var bomId = bom.save();
});
```

---

## Routing

Routing defines the manufacturing process steps.

**Navigation:** Lists > Manufacturing > Routings > New

**Record Type:** `record.Type.ROUTING`

### Routing Fields

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| name               | Routing name                                            |
| memo               | Description                                             |
| item               | Assembly item this routing applies to                   |

### Routing Steps (steps sublist)

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| sequence           | Step order number (10, 20, 30...)                       |
| operationName      | Name of this operation (e.g., "Cut", "Weld", "Paint")   |
| workCenter         | Work center/machine center where work is done           |
| setupTime          | Setup time in hours (per batch)                         |
| runTime            | Run time in hours (per unit)                            |
| machineTime        | Machine time in hours (per unit)                        |

---

## Work Order

A Work Order triggers production of a finished good.

**Navigation:** Transactions > Manufacturing > Work Orders > New

**Record Type:** `record.Type.WORK_ORDER`

```javascript
define(['N/record'], function(record) {
    var wo = record.create({ type: record.Type.WORK_ORDER, isDynamic: true });
    wo.setValue({ fieldId: 'assemblyitem', value: 200 }); // Finished good item
    wo.setValue({ fieldId: 'quantity', value: 50 });       // Build 50 units
    wo.setValue({ fieldId: 'startdate', value: new Date() });
    wo.setValue({ fieldId: 'enddate', value: new Date(Date.now() + 5*86400000) });
    wo.setValue({ fieldId: 'location', value: 3 });        // Manufacturing location
    wo.setValue({ fieldId: 'billofmaterials', value: bomId }); // BOM to use
    wo.setValue({ fieldId: 'routing', value: routingId });  // Routing to use

    var woId = wo.save();
});
```

---

## Work Order from Sales Order

Sales Orders with "Assembly" type items can auto-generate Work Orders:

1. SO created with assembly item
2. NetSuite checks if it should auto-create a WO (based on item settings)
3. WO created with quantity = SO line quantity
4. WO linked to SO via `salesOrder` field

---

## Assembly Build

When production is complete, an Assembly Build records the completed goods.

**Record Type:** `record.Type.ASSEMBLY_BUILD`

```javascript
define(['N/record'], function(record) {
    // Complete a work order — creates Assembly Build
    var build = record.transform({
        fromType: record.Type.WORK_ORDER,
        fromId: woId,
        toType: record.Type.ASSEMBLY_BUILD,
        isDynamic: true
    });

    build.setValue({ fieldId: 'quantity', value: 45 }); // Completed 45 of 50 planned
    build.setValue({ fieldId: 'trandate', value: new Date() });

    var buildId = build.save();
});
```

Assembly Build:
- Increases finished goods inventory
- Decreases component inventory
- Creates COGS-type accounting entries

---

## Costing Methods

| Method           | Description                                              |
|------------------|----------------------------------------------------------|
| Standard Cost    | Pre-defined cost per unit; variances tracked separately  |
| Average Cost     | Running average based on all receipts                    |
| FIFO             | First In, First Out — oldest cost used first             |
| LIFO             | Last In, First Out — newest cost used first              |

Set on the Item record: Inventory tab > Costing Method

---

## Production Variances

When using Standard Costing, variances are tracked:

| Variance Type    | Cause                                                    |
|------------------|----------------------------------------------------------|
| Material Variance | Actual material cost ≠ standard material cost          |
| Labor Variance   | Actual labor hours × rate ≠ standard labor cost        |
| Machine Variance | Actual machine time ≠ standard machine time             |
| Overhead Variance| Actual overhead ≠ applied overhead                     |

Variances post to variance accounts in the GL.

---

## Manufacturing Reports

| Report                        | Navigation                                              |
|-------------------------------|----------------------------------------------------------|
| Open Work Orders              | Reports > Manufacturing > Work Orders > Open            |
| Work Order Status             | Reports > Manufacturing > Work Order Status             |
| Production Variance           | Reports > Manufacturing > Production Variance           |
| BOM Cost Detail               | Reports > Manufacturing > BOM Cost Detail               |
| Routing Efficiency            | Reports > Manufacturing > Routing Efficiency            |
