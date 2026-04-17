---
source: Oracle NetSuite Official Documentation — P2P Item Receipt
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# P2P: Receiving (Item Receipt)

## Overview

Item Receipts record the physical arrival of purchased goods.
They are created from Purchase Orders and trigger inventory increases.
Item Receipts are critical for 3-way matching (PO vs Receipt vs Bill).

---

## Creating an Item Receipt

**Navigation:** Open the Purchase Order > Receive

**Record Type:** `record.Type.ITEM_RECEIPT`

```javascript
define(['N/record'], function(record) {
    var receipt = record.transform({
        fromType: record.Type.PURCHASE_ORDER,
        fromId: poId,
        toType: record.Type.ITEM_RECEIPT,
        isDynamic: true
    });

    receipt.setValue({ fieldId: 'trandate', value: new Date() });
    receipt.setValue({ fieldId: 'memo', value: 'Received PO-2024-001 shipment 1 of 2' });

    var receiptId = receipt.save();
});
```

---

## Key Receipt Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| createdFrom        | Link to the source Purchase Order                       |
| entity             | Vendor (inherited from PO)                              |
| tranDate           | Date goods received                                     |
| location           | Receiving location/warehouse                            |
| memo               | Receipt memo/reference                                  |

### Key Line Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| item               | Item received                                           |
| quantity           | Quantity received (can be partial)                      |
| itemreceive        | T/F — check this line for receipt                       |
| location           | Line-level receiving location                           |
| inventorydetail    | Subrecord for lot/serial number assignment              |
| landedCost         | Flag to include in landed cost calculation              |

---

## Partial Receipts

Receive only a portion of the PO:

```javascript
define(['N/record'], function(record) {
    var receipt = record.transform({
        fromType: record.Type.PURCHASE_ORDER,
        fromId: poId,
        toType: record.Type.ITEM_RECEIPT,
        isDynamic: true
    });

    // Receive only 30 of 100 ordered units on line 0
    receipt.selectLine({ sublistId: 'item', line: 0 });
    receipt.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: 30
    });
    receipt.commitLine({ sublistId: 'item' });

    // Skip line 1 (don't receive)
    receipt.selectLine({ sublistId: 'item', line: 1 });
    receipt.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'itemreceive',
        value: false  // Don't receive this line
    });
    receipt.commitLine({ sublistId: 'item' });

    receipt.save();
});
```

After partial receipt, PO status becomes "Pending Bill/Partially Received" (`PurchOrd:C`).

---

## Lot/Serial Assignment During Receipt

```javascript
define(['N/record'], function(record) {
    var receipt = record.transform({
        fromType: record.Type.PURCHASE_ORDER,
        fromId: poId,
        toType: record.Type.ITEM_RECEIPT,
        isDynamic: true
    });

    // Assign lot number to received items on line 0
    var invDetail = receipt.getSubrecord({
        sublistId: 'item',
        fieldId: 'inventorydetail',
        line: 0
    });

    invDetail.selectNewLine({ sublistId: 'inventoryassignment' });
    invDetail.setCurrentSublistValue({
        sublistId: 'inventoryassignment',
        fieldId: 'receiptinventorynumber',   // For receipts (not issueinventorynumber)
        value: 'LOT-VENDOR-2024-A'           // Lot number from vendor's documentation
    });
    invDetail.setCurrentSublistValue({
        sublistId: 'inventoryassignment',
        fieldId: 'quantity',
        value: 30
    });
    // Optional: set expiry date on lot
    invDetail.setCurrentSublistValue({
        sublistId: 'inventoryassignment',
        fieldId: 'expirationdate',
        value: new Date(Date.now() + 365*86400000) // 1 year from now
    });
    invDetail.commitLine({ sublistId: 'inventoryassignment' });

    receipt.save();
});
```

---

## Landed Costs

Landed costs are additional costs allocated to received items:
- Import duties
- Freight charges
- Insurance
- Customs fees

### Adding Landed Costs

```javascript
define(['N/record'], function(record) {
    var receipt = record.transform({
        fromType: record.Type.PURCHASE_ORDER,
        fromId: poId,
        toType: record.Type.ITEM_RECEIPT,
        isDynamic: true
    });

    // Add freight landed cost
    receipt.selectNewLine({ sublistId: 'landedcostallocation' });
    receipt.setCurrentSublistValue({ sublistId: 'landedcostallocation', fieldId: 'costcategory', value: 5 }); // Freight
    receipt.setCurrentSublistValue({ sublistId: 'landedcostallocation', fieldId: 'costallocationmethod', value: 'QUANTITY' });
    receipt.setCurrentSublistValue({ sublistId: 'landedcostallocation', fieldId: 'amount', value: 250 }); // $250 freight
    receipt.commitLine({ sublistId: 'landedcostallocation' });

    receipt.save();
});
```

### Landed Cost Allocation Methods

| Method       | How Cost Is Distributed to Lines                    |
|--------------|------------------------------------------------------|
| QUANTITY     | Proportional to quantity received                    |
| WEIGHT       | Proportional to item weight × quantity               |
| VALUE        | Proportional to item cost × quantity                 |
| PER_LINE     | Equal amount per line item (regardless of quantity)  |

---

## Inventory Impact

When an Item Receipt is saved:
- Inventory on-hand increases at the receiving location
- If lot/serial tracked, the specific lot/serial is added to inventory
- PO's `quantityreceived` field is updated
- If landed costs added, item's average cost is updated

---

## Return to Vendor (After Receipt)

If received items need to be returned to vendor:

1. Create a **Return Authorization** from the Item Receipt:
   ```
   record.Type.RETURN_AUTHORIZATION — for customer returns
   For vendor returns, the process is:
   Item Receipt → Vendor Return Authorization (or Item Receipt -quantity-)
   ```

2. Navigate: Transactions > Purchases > Enter Return Authorizations (Vendor)
3. After vendor RA is approved: create Item Fulfillment (shipping items back)
4. After vendor confirms return: create Vendor Credit

---

## 3-Way Match Verification

After receipt, when creating the Vendor Bill, NetSuite verifies:

```
Receipt Quantity (30) ≤ PO Quantity (100) ✓
Bill Quantity (30) = Receipt Quantity (30) ✓
Bill Price ($25) = PO Price ($25) ✓
```

If discrepancies exist, the bill is flagged for review before payment authorization.
