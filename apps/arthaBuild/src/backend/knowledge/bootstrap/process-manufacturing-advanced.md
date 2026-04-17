---
source: Oracle NetSuite Official Documentation — Advanced Manufacturing
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Advanced Manufacturing

## Overview

Advanced Manufacturing extends the basic Plan to Produce process with
capacity planning, production scheduling, co-products/by-products,
outsourced operations, and detailed variance analysis.

---

## Work Center Capacity Planning

Work Centers define where operations occur (machines, assembly lines, labor groups).

**Navigation:** Lists > Manufacturing > Work Centers > New

### Work Center Fields

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| name               | Work center name (e.g., "Welding Station 1")            |
| subsidiary         | Subsidiary the work center belongs to                   |
| location           | Physical location                                       |
| capacity           | Available hours per shift                               |
| efficiencyFactor   | Efficiency percentage (e.g., 85 = 85% efficient)        |

### Capacity Check

Before scheduling production, check if work center has capacity:

```javascript
define(['N/record', 'N/search'], function(record, search) {
    // Find work orders scheduled to a specific work center
    var woSearch = search.create({
        type: search.Type.WORK_ORDER,
        filters: [
            search.createFilter({ name: 'workcenter', operator: search.Operator.IS, values: ['5'] }),
            search.createFilter({ name: 'status', operator: search.Operator.IS, values: ['WorkOrd:B'] }), // In Process
            search.createFilter({ name: 'startdate', operator: search.Operator.ON_OR_AFTER, values: [new Date()] })
        ],
        columns: [
            search.createColumn({ name: 'actualtime' }),    // Hours consumed
            search.createColumn({ name: 'remainingtime' })  // Hours remaining
        ]
    });
    var results = woSearch.run().getRange({ start: 0, end: 100 });
});
```

---

## Production Scheduling

**Navigation:** Transactions > Manufacturing > Scheduling

NetSuite Advanced Manufacturing provides finite capacity scheduling:
1. Routing defines work center and time requirements per step
2. Scheduler assigns production start/end times based on capacity
3. Conflicts are flagged and can be resolved by adjusting dates or routing

---

## Operation Times

Each routing step has three time components:

| Time Type    | Description                                              |
|--------------|----------------------------------------------------------|
| Setup Time   | Fixed time to prepare the work center (per batch/WO)    |
| Run Time     | Variable time per unit produced                          |
| Machine Time | Machine utilization time per unit (separate from labor) |

**Example:**
- Setup Time: 2 hours (one-time per work order)
- Run Time: 0.5 hours per unit
- Batch of 100 units: Total = 2 + (100 × 0.5) = 52 hours

---

## Co-Products and By-Products

Some manufacturing processes produce multiple outputs:

### Co-Products

Multiple primary outputs of equal planned value:
- Assembly Item record: add co-products in the "Co-Products" sublist
- Each co-product has a quantity and cost allocation percentage
- Assembly Build increases inventory for all co-products

### By-Products

Secondary outputs produced incidentally (lower value):
- Added to Assembly Item's "By-Products" sublist
- By-product quantity and item specified
- Can be assigned to specific accounts

---

## Scrap Percentage on BOM

Component lines can specify scrap allowance:

```javascript
// BOM component with scrap
bom.selectNewLine({ sublistId: 'component' });
bom.setCurrentSublistValue({ sublistId: 'component', fieldId: 'item', value: 100 });
bom.setCurrentSublistValue({ sublistId: 'component', fieldId: 'quantity', value: 1 });
bom.setCurrentSublistValue({ sublistId: 'component', fieldId: 'componentyield', value: 95 }); // 95% yield (5% scrap)
bom.commitLine({ sublistId: 'component' });
```

When building 100 units with 5% scrap on a component with qty=1:
- Planned consumption = 100 / 0.95 ≈ 105.3 units
- Scrap is tracked as a variance

---

## Outsourced Manufacturing

When part of the production process is done by an outside vendor:

1. Create a routing step with "Outsource" flag = true
2. Link to a vendor (supplier for this step)
3. When WO reaches the outsourced step:
   - NetSuite auto-creates a Purchase Order to the vendor
   - Vendor performs the work and returns the semi-finished goods
   - Item Receipt closes the PO and moves WO to next step

```javascript
// Check if routing step is outsourced
var step = routing.getSublistValue({
    sublistId: 'steps',
    fieldId: 'outsource',
    line: 0
});
// If true, a PO is generated for this step
```

---

## Production Variances in Advanced Manufacturing

| Variance                | Calculation                                                   |
|-------------------------|---------------------------------------------------------------|
| Material Price Variance | (Actual Price - Standard Price) × Actual Quantity            |
| Material Usage Variance | (Actual Qty - Standard Qty) × Standard Price                 |
| Labor Rate Variance     | (Actual Rate - Standard Rate) × Actual Hours                 |
| Labor Efficiency Variance | (Actual Hours - Standard Hours) × Standard Rate           |
| Machine Rate Variance   | (Actual Machine Rate - Standard) × Actual Machine Hours      |

Variances post to dedicated GL accounts configured in Setup > Accounting > Accounting Preferences.

---

## Disassembly

NetSuite supports unbuilding assembled items:

**Record Type:** `record.Type.ASSEMBLY_UNBUILD`

```javascript
define(['N/record'], function(record) {
    var unbuild = record.create({ type: record.Type.ASSEMBLY_UNBUILD, isDynamic: true });
    unbuild.setValue({ fieldId: 'assemblyitem', value: 200 }); // Item to unbuild
    unbuild.setValue({ fieldId: 'quantity', value: 10 });       // Unbuild 10 units
    unbuild.setValue({ fieldId: 'location', value: 3 });
    unbuild.setValue({ fieldId: 'trandate', value: new Date() });

    // This removes 10 finished goods and returns components to inventory
    unbuild.save();
});
```

---

## Manufacturing Reports

| Report                        | Navigation                                              |
|-------------------------------|----------------------------------------------------------|
| Production Schedule           | Reports > Manufacturing > Production Schedule           |
| Work Center Load              | Reports > Manufacturing > Work Center Load              |
| Component Availability        | Reports > Manufacturing > Component Availability        |
| Cost Variance Report          | Reports > Manufacturing > Cost Variance                 |
| Routing Performance           | Reports > Manufacturing > Routing Performance           |
