---
source: SuiteScript 2.x API Reference — Item Record Schemas
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Item Record (Multiple Types)

NetSuite has several item record types. The most common are:

| Record Type Constant | Internal ID | Description |
|---------------------|-------------|-------------|
| `record.Type.INVENTORY_ITEM` | `'inventoryitem'` | Physical goods with inventory tracking |
| `record.Type.NON_INVENTORY_ITEM` | `'noninventoryitem'` | Items without inventory tracking |
| `record.Type.SERVICE_ITEM` | `'serviceitem'` | Services (labor, consulting) |
| `record.Type.ASSEMBLY_ITEM` | `'assemblyitem'` | Bill of Materials (kit/assembly) |
| `record.Type.KIT_ITEM` | `'kititem'` | Kit items (similar to assembly) |

## Common Body Fields (All Item Types)

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `itemId` | Item Name/Number | Text | Item identifier (SKU) — required |
| `displayName` | Display Name | Text | Customer-facing name |
| `salesDescription` | Sales Description | Text | Description on sales transactions |
| `purchaseDescription` | Purchase Desc. | Text | Description on purchase transactions |
| `subsidiary` | Subsidiary | Select | Multi-select for OneWorld |
| `taxSchedule` | Tax Schedule | Select | Default tax schedule |
| `unitsType` | Units Type | Select | Unit of measure type |
| `baseUnit` | Base Unit | Select | Base unit of measure |
| `saleUnit` | Sale Unit | Select | Unit used on sales |
| `purchaseUnit` | Purchase Unit | Select | Unit used on purchases |
| `isinactive` | Inactive | Checkbox | Deactivated items |
| `class` | Class | Select | Classification |
| `department` | Department | Select | Department classification |
| `location` | Location | Select | Location |
| `custitem_*` | Custom Fields | Various | Custom item fields |

## Inventory Item Additional Fields

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `isSerialized` | Serialized | Checkbox | Track by serial number |
| `isLotItem` | Lot Numbered | Checkbox | Track by lot number |
| `trackLandedCost` | Track Landed Cost | Checkbox | Include freight in cost |
| `costingMethod` | Costing Method | Select | AVERAGE, FIFO, LIFO, SPECIFIC |
| `cost` | Purchase Price | Currency | Default purchase cost |
| `quantityOnHand` | Qty On Hand | Float | Current stock (read-only) |
| `quantityAvailable` | Qty Available | Float | Available to sell (read-only) |
| `quantityCommitted` | Qty Committed | Float | Committed to open orders (read-only) |
| `quantityOnOrder` | Qty On Order | Float | Open PO quantities (read-only) |
| `reorderPoint` | Reorder Point | Float | Min stock before reorder |
| `preferredStockLevel` | Preferred Level | Float | Target stock level |
| `assetAccount` | Asset Account | Select | Inventory GL account |
| `cogsAccount` | COGS Account | Select | Cost of Goods Sold GL account |
| `incomeAccount` | Income Account | Select | Revenue GL account |
| `mpn` | MPN | Text | Manufacturer Part Number |
| `vendorName` | Preferred Vendor | Select | Default supplier |
| `vendorCode` | Vendor Code | Text | Vendor's part number |

## Pricing Sublist (pricing)

Defines prices per price level and currency:

| Field ID | Label | Notes |
|----------|-------|-------|
| `pricelevel` | Price Level | Price level internal ID |
| `currency` | Currency | Currency for this price |
| `unitprice` | Unit Price | Price for this combination |
| `minimumquantity` | Min Qty | Minimum quantity for this price |

### Reading/Writing Pricing
```javascript
// Read price for a specific level
var basePrice = rec.getMatrixSublistValue({
  sublistId: 'pricing',
  fieldId: 'price',
  column: 0,  // Column index corresponding to price level
  line: 0
});

// Standard approach — search for pricing
var pricingSearch = search.create({
  type: 'pricebook',
  filters: [['item', search.Operator.IS, itemId]],
  columns: [{ name: 'pricelevel' }, { name: 'unitprice' }]
});
```

## Members Sublist (for Assembly/Kit Items)

| Field ID | Label | Notes |
|----------|-------|-------|
| `item` | Component Item | Internal ID of component |
| `quantity` | Quantity | Qty per assembly |
| `memberdescription` | Description | Component description |
| `itemsource` | Source | 'STOCK', 'GHOST', 'PURCHASE' |

## Common Operations

### Load an item
```javascript
var item = record.load({
  type: record.Type.INVENTORY_ITEM,
  id: itemId
});
var sku = item.getValue({ fieldId: 'itemId' });
var description = item.getValue({ fieldId: 'salesDescription' });
var qtyOnHand = item.getValue({ fieldId: 'quantityOnHand' });
var qtyAvailable = item.getValue({ fieldId: 'quantityAvailable' });
```

### Create a service item
```javascript
var serviceItem = record.create({
  type: record.Type.SERVICE_ITEM,
  isDynamic: true
});
serviceItem.setValue({ fieldId: 'itemId', value: 'CONSULT-001' });
serviceItem.setValue({ fieldId: 'displayName', value: 'Consulting Services' });
serviceItem.setValue({ fieldId: 'salesDescription', value: 'Professional consulting services, billed per hour' });
serviceItem.setValue({ fieldId: 'incomeAccount', value: serviceIncomeAccountId });
serviceItem.setValue({ fieldId: 'taxSchedule', value: 1 });
var itemId = serviceItem.save();
```

### Create an inventory item
```javascript
var invItem = record.create({
  type: record.Type.INVENTORY_ITEM,
  isDynamic: true
});
invItem.setValue({ fieldId: 'itemId', value: 'WIDGET-001' });
invItem.setValue({ fieldId: 'displayName', value: 'Premium Widget' });
invItem.setValue({ fieldId: 'salesDescription', value: 'High-quality widget' });
invItem.setValue({ fieldId: 'costingMethod', value: 'AVERAGE' });
invItem.setValue({ fieldId: 'assetAccount', value: inventoryAssetId });
invItem.setValue({ fieldId: 'cogsAccount', value: cogsAccountId });
invItem.setValue({ fieldId: 'incomeAccount', value: salesIncomeId });
invItem.setValue({ fieldId: 'reorderPoint', value: 10 });
invItem.setValue({ fieldId: 'preferredStockLevel', value: 50 });
var itemId = invItem.save();
```

### Search all active items
```javascript
var itemSearch = search.create({
  type: search.Type.ITEM,
  filters: [['isinactive', search.Operator.IS, 'F']],
  columns: [
    search.createColumn({ name: 'itemId' }),
    search.createColumn({ name: 'displayName' }),
    search.createColumn({ name: 'type' }),
    search.createColumn({ name: 'quantityOnHand' }),
    search.createColumn({ name: 'quantityAvailable' })
  ]
});
```

### Search items with low stock
```javascript
var lowStockSearch = search.create({
  type: search.Type.INVENTORY_ITEM,
  filters: [
    ['isinactive', search.Operator.IS, 'F'],
    'AND',
    ['quantityAvailable', search.Operator.LESS_THAN, '{reorderPoint}']
  ],
  columns: [
    search.createColumn({ name: 'itemId' }),
    search.createColumn({ name: 'quantityAvailable' }),
    search.createColumn({ name: 'reorderPoint' })
  ]
});
```

## Common Search Filters

| Field | Operator | Use Case |
|-------|----------|----------|
| `isinactive` | IS | 'F' = active items |
| `type` | IS | Filter by item type |
| `quantityAvailable` | LESS_THAN | Low stock alert |
| `vendor` | IS | Items from specific vendor |
| `department` | IS | Items by department |
| `class` | IS | Items by class |

## Costing Methods

```javascript
// costingMethod field values:
'AVERAGE'   // Average cost (weighted average)
'FIFO'      // First In, First Out
'LIFO'      // Last In, First Out
'SPECIFIC'  // Specific Identification (serialized items)
'STANDARD'  // Standard costing
```
