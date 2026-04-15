---
source: Oracle NetSuite Official Documentation — Inventory Replenishment
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Inventory Replenishment

## Overview

Inventory Replenishment ensures adequate stock levels by automatically
suggesting or creating purchase orders when inventory falls below defined thresholds.
NetSuite supports reorder point-based replenishment and demand planning.

---

## Reorder Points

Reorder points define when to re-order an item.

**Set on the Item record:** Inventory tab

| Field                | Description                                             |
|----------------------|---------------------------------------------------------|
| Reorder Point        | Minimum quantity on-hand; trigger replenishment below this |
| Preferred Stock Level| Maximum/target stock quantity to maintain               |
| Lead Time (Days)     | Days from PO creation to receipt                        |
| Purchase Description | Default description on PO line                          |
| Preferred Vendor     | Default vendor for replenishment POs                    |

---

## Reorder Items Screen

**Navigation:** Lists > Supply > Reorder Items

Shows all items below their reorder point:
- Item name
- Current quantity on-hand
- Quantity on order (from open POs)
- Reorder point
- Suggested order quantity (preferred level - current qty)

From this screen, create POs for selected items with one click.

---

## Demand Planning

Demand Planning generates replenishment suggestions based on historical demand.

**Navigation:** Transactions > Demand Planning > Generate Purchase Orders

Process:
1. NetSuite analyzes historical sales (past N months)
2. Calculates average demand + safety stock
3. Suggests order quantities and timing
4. Review and approve suggested POs

---

## Transfer Orders for Internal Replenishment

When stock is available in one warehouse but needed in another:

```javascript
define(['N/record'], function(record) {
    var to = record.create({ type: record.Type.TRANSFER_ORDER, isDynamic: true });
    to.setValue({ fieldId: 'transferlocation', value: 5 }); // Source warehouse
    to.setValue({ fieldId: 'location', value: 8 });          // Destination warehouse
    to.setValue({ fieldId: 'trandate', value: new Date() });
    to.setValue({ fieldId: 'memo', value: 'Store replenishment from main warehouse' });

    to.selectNewLine({ sublistId: 'item' });
    to.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 456 });
    to.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 100 });
    to.commitLine({ sublistId: 'item' });

    var toId = to.save();
    // Transfer Order status: Pending Fulfillment
    // Next step: Create Item Fulfillment from TO, then Item Receipt at destination
});
```

---

## Bin Management for Replenishment

In WMS-enabled locations, bins have replenishment rules:

**Bin Types:**
- **Active Pick:** High-frequency access for order picking
- **Bulk Storage:** Reserve stock for replenishing pick bins
- **Receiving:** Incoming goods staging area
- **Packing:** Outbound order staging

**Replenishment Rule:** When active pick bin quantity falls below minimum,
automatically replenish from bulk storage:

1. System detects active pick bin below minimum quantity
2. Creates internal replenishment task (move between bins)
3. Warehouse worker moves items from bulk to active pick
4. Bin quantities are updated

---

## Multi-Location Inventory

In multi-location setups, each location maintains its own inventory levels:

```javascript
define(['N/search'], function(search) {
    // Check inventory by location
    var invSearch = search.create({
        type: search.Type.INVENTORY_ITEM,
        filters: [
            search.createFilter({ name: 'internalid', operator: search.Operator.IS, values: ['456'] })
        ],
        columns: [
            search.createColumn({ name: 'quantityonhand', label: 'On Hand' }),
            search.createColumn({ name: 'quantityavailable', label: 'Available' }),
            search.createColumn({ name: 'quantityonorder', label: 'On Order' }),
            search.createColumn({ name: 'locationquantityonhand', join: 'inventorylocation' }),
            search.createColumn({ name: 'location', join: 'inventorylocation' })
        ]
    }).run().getRange({ start: 0, end: 10 });
});
```

---

## Automated Replenishment Script Pattern

```javascript
/**
 * @NScriptType ScheduledScript
 * @NApiVersion 2.1
 */
define(['N/search', 'N/record', 'N/log'], function(search, record, log) {
    function execute(context) {
        // Find all items below reorder point
        var lowStockSearch = search.create({
            type: search.Type.INVENTORY_ITEM,
            filters: [
                search.createFilter({ name: 'quantityonhand', operator: search.Operator.LESS_THAN_OR_EQUAL_TO, values: [0] })
                // More specific: use a saved search with reorder point comparison
            ],
            columns: [
                search.createColumn({ name: 'itemid' }),
                search.createColumn({ name: 'quantityonhand' }),
                search.createColumn({ name: 'reorderpoint' }),
                search.createColumn({ name: 'preferredvendor' })
            ]
        });

        lowStockSearch.run().each(function(result) {
            var itemId = result.id;
            var qty = result.getValue('quantityonhand');
            var reorderPoint = result.getValue('reorderpoint');
            var vendor = result.getValue('preferredvendor');

            if (parseFloat(qty) <= parseFloat(reorderPoint) && vendor) {
                // Create PO
                var po = record.create({ type: record.Type.PURCHASE_ORDER });
                po.setValue({ fieldId: 'entity', value: vendor });
                po.selectNewLine({ sublistId: 'item' });
                po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
                po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: reorderPoint * 2 });
                po.commitLine({ sublistId: 'item' });
                var poId = po.save();
                log.audit('Replenishment PO', 'Item: ' + itemId + ' PO: ' + poId);
            }
            return true; // continue iteration
        });
    }
    return { execute: execute };
});
```

---

## Inventory Reports

| Report                        | Navigation                                              |
|-------------------------------|----------------------------------------------------------|
| Items Below Reorder Point     | Lists > Supply > Reorder Items                          |
| Inventory Valuation Summary   | Reports > Inventory > Inventory Valuation Summary       |
| Stock Status by Location      | Reports > Inventory > Stock Status                      |
| Days Sales of Inventory (DSI) | Reports > Inventory > Inventory Days of Supply          |
| Items on Order (from POs)     | Reports > Inventory > Items on Order                    |
