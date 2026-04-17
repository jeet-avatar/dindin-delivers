---
source: Oracle NetSuite Official Documentation — O2C Item Fulfillment
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# O2C: Item Fulfillment

## Overview

Item Fulfillment records the physical shipment of goods to the customer.
It is created from a Sales Order and triggers inventory decrements.
The fulfillment status drives the SO status from "Pending Fulfillment" to "Pending Billing."

---

## Creating an Item Fulfillment

**Navigation:** Open the Sales Order > Actions > Fulfill

**Record Type:** `record.Type.ITEM_FULFILLMENT`

```javascript
define(['N/record'], function(record) {
    var fulfillment = record.transform({
        fromType: record.Type.SALES_ORDER,
        fromId: soId,
        toType: record.Type.ITEM_FULFILLMENT,
        isDynamic: true
    });

    // Set ship date and shipping details
    fulfillment.setValue({ fieldId: 'trandate', value: new Date() });
    fulfillment.setValue({ fieldId: 'shipstatus', value: 'C' }); // C = Shipped

    var fulfillmentId = fulfillment.save();
});
```

---

## Fulfillment Status Values

| Status Code | Status Label  | Description                               |
|-------------|---------------|-------------------------------------------|
| A           | Picked        | Items picked from warehouse               |
| B           | Packed        | Items packed, ready to ship               |
| C           | Shipped       | Items shipped to customer                 |

### Moving Through Pick/Pack/Ship

```javascript
// Set status on fulfillment
fulfillment.setValue({
    fieldId: 'shipstatus',
    value: 'A'  // Picked
    // value: 'B'  // Packed
    // value: 'C'  // Shipped
});
```

---

## Key Header Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| createdFrom        | Link to source Sales Order                              |
| entity             | Customer (inherited from SO)                            |
| tranDate           | Fulfillment/ship date                                   |
| shipStatus         | A=Picked, B=Packed, C=Shipped                           |
| shipMethod         | Carrier (UPS Ground, FedEx 2-Day, etc.)                |
| trackingNumbers    | Comma-separated tracking numbers                        |
| shipDate           | Scheduled ship date                                     |
| shipAddresslist    | Ship-to address                                         |

---

## Key Line Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| item               | Item being fulfilled                                    |
| quantity           | Quantity to fulfill (can be less than ordered — partial)|
| location           | Warehouse/location fulfilling from                      |
| inventorydetail    | Subrecord for lot/serial number assignment              |

---

## Partial Fulfillments

Only part of the order can be fulfilled:

```javascript
define(['N/record'], function(record) {
    var fulfillment = record.transform({
        fromType: record.Type.SALES_ORDER,
        fromId: soId,
        toType: record.Type.ITEM_FULFILLMENT,
        isDynamic: true
    });

    // Reduce quantity on line 0 (only ship 5 of 10 ordered)
    fulfillment.selectLine({ sublistId: 'item', line: 0 });
    fulfillment.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: 5  // Partially fulfill 5 of the 10 ordered
    });
    fulfillment.commitLine({ sublistId: 'item' });

    // Set line 1 to 0 quantity (don't fulfill this line)
    fulfillment.selectLine({ sublistId: 'item', line: 1 });
    fulfillment.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'itemreceive',  // For item fulfillment, use 'itemreceive'
        value: false
    });
    fulfillment.commitLine({ sublistId: 'item' });

    fulfillment.save();
});
```

After partial fulfillment, SO status becomes "Partially Fulfilled" (`SalesOrd:D`).

---

## Shipping Integration

NetSuite integrates with major carriers for real-time shipping rates and label printing.

### Carrier Fields on Fulfillment

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| shipMethod         | Carrier and service level (UPS Ground, FedEx Priority) |
| trackingNumbers    | Auto-populated after label print, or manual entry       |
| shippingCost       | Actual shipping cost charged                            |
| weight             | Total shipment weight                                   |

### FedEx/UPS Integration

Navigate: Setup > Shipping > Carrier Setup

After setup, when creating a fulfillment:
1. Select Ship Method = "FedEx Ground" (or other carrier/service)
2. Click "Get Rates" to fetch live rates
3. Click "Print Label" to generate shipping label and get tracking number
4. Tracking number is stored in `trackingNumbers` field

---

## Package Sublist

The `package` sublist tracks individual boxes in a shipment:

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| packageweight      | Weight of this package                                  |
| packagedescr       | Description/contents label                              |
| packagetrackingnumber | Individual package tracking number                 |
| packagelength      | Package length (for dimensional weight)                 |
| packagewidth       | Package width                                           |
| packageheight      | Package height                                          |

```javascript
// Add package to fulfillment
fulfillment.selectNewLine({ sublistId: 'package' });
fulfillment.setCurrentSublistValue({ sublistId: 'package', fieldId: 'packageweight', value: 5.5 });
fulfillment.setCurrentSublistValue({ sublistId: 'package', fieldId: 'packagedescr', value: 'Box 1 of 2' });
fulfillment.commitLine({ sublistId: 'package' });
```

---

## Lot/Serial Number Assignment During Fulfillment

For lot-tracked items, lot numbers must be assigned:

```javascript
define(['N/record'], function(record) {
    var fulfillment = record.transform({
        fromType: record.Type.SALES_ORDER,
        fromId: soId,
        toType: record.Type.ITEM_FULFILLMENT,
        isDynamic: true
    });

    // Access inventorydetail subrecord for line 0
    var invDetail = fulfillment.getSubrecord({
        sublistId: 'item',
        fieldId: 'inventorydetail',
        line: 0
    });

    // Assign from specific lot
    invDetail.selectNewLine({ sublistId: 'inventoryassignment' });
    invDetail.setCurrentSublistValue({
        sublistId: 'inventoryassignment',
        fieldId: 'issueinventorynumber',
        value: 'LOT-2024-001'
    });
    invDetail.setCurrentSublistValue({
        sublistId: 'inventoryassignment',
        fieldId: 'quantity',
        value: 50
    });
    invDetail.commitLine({ sublistId: 'inventoryassignment' });

    fulfillment.save();
});
```

---

## Impact on Inventory

When an Item Fulfillment is saved with status "Shipped":
- Inventory quantity on-hand decreases at the source location
- Inventory committed quantity decreases on the Sales Order
- COGS (Cost of Goods Sold) journal entry is created automatically

---

## Fulfillment and Billing

After fulfillment, the SO status changes:
- All lines fulfilled → status = "Pending Billing" (`SalesOrd:F`)
- Invoice can now be created from the SO
- Fulfillment is linked to the Invoice for 2-way match reporting
