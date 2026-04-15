---
source: SuiteScript 2.x API Reference — Vendor Record Schema
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Vendor Record (record.Type.VENDOR)

Internal record type ID: `'vendor'`

The Vendor record represents companies or individuals from whom you purchase goods or services.
It is the `entity` on Purchase Orders, Vendor Bills, and Vendor Payments.

## Record Constant

```javascript
record.Type.VENDOR   // 'vendor'
search.Type.VENDOR   // 'vendor'
```

## Body Fields

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `entityId` | Vendor ID | Text | Auto-assigned or manually set |
| `companyName` | Company Name | Text | Vendor company name |
| `isPerson` | Individual | Checkbox | True = individual, False = company |
| `firstName` | First Name | Text | For individual vendors |
| `lastName` | Last Name | Text | For individual vendors |
| `email` | Email | Email | Primary email address |
| `phone` | Phone | Phone | Primary phone |
| `altPhone` | Alt. Phone | Phone | Secondary phone |
| `fax` | Fax | Phone | Fax number |
| `website` | Website | URL | Vendor website |
| `subsidiary` | Subsidiary | Select | Primary subsidiary |
| `currency` | Currency | Select | Vendor's default currency |
| `terms` | Terms | Select | Default payment terms |
| `balance` | Balance | Currency | Outstanding AP balance (read-only) |
| `unbilledOrders` | Unbilled POs | Currency | Open PO value (read-only) |
| `defaultTaxReg` | Default Tax Reg | Select | Default tax registration |
| `taxIdNum` | Tax ID | Text | Federal tax ID / EIN |
| `vatRegNumber` | VAT Reg # | Text | VAT registration number |
| `is1099Eligible` | 1099 Eligible | Checkbox | Mark for 1099 reporting (US) |
| `laborCost` | Labor Cost | Currency | Default hourly rate |
| `category` | Category | Select | Vendor category |
| `purchaseOrderContact` | PO Contact | Select | Default contact for POs |
| `expenseAccount` | Expense Acct | Select | Default expense GL account |
| `payablesAccount` | Payables Acct | Select | Override AP account |
| `isinactive` | Inactive | Checkbox | True = inactive vendor |
| `comments` | Comments | Text | Internal notes |
| `custentity_*` | Custom Fields | Various | Custom entity fields |

## Address Book Sublist (addressbook)

| Field ID | Label | Notes |
|----------|-------|-------|
| `addressid` | Address ID | Internal address ID |
| `label` | Label | Address label (e.g., 'Remit To', 'Shipping') |
| `defaultbilling` | Default Billing | Primary remit-to address |
| `defaultshipping` | Default Shipping | Primary ship-from address |
| `addr1` | Address 1 | Street address |
| `addr2` | Address 2 | Suite/floor |
| `city` | City | |
| `state` | State | State/province |
| `zip` | Zip | Postal code |
| `country` | Country | ISO country code |

## Currency Sublist (currency)

Currencies for which the vendor can invoice:

| Field ID | Label | Notes |
|----------|-------|-------|
| `currency` | Currency | Currency internal ID |
| `balance` | Balance | AP balance in this currency (read-only) |

## Contact Sublist (contact)

| Field ID | Label | Notes |
|----------|-------|-------|
| `contact` | Contact | Linked Contact record |
| `role` | Role | Contact role |
| `email` | Email | Contact email |
| `phone` | Phone | Contact phone |

## Common Operations

### Create a vendor
```javascript
var vendor = record.create({
  type: record.Type.VENDOR,
  isDynamic: true
});
vendor.setValue({ fieldId: 'companyName', value: 'Office Supplies Co.' });
vendor.setValue({ fieldId: 'email', value: 'billing@officesupplies.com' });
vendor.setValue({ fieldId: 'phone', value: '800-555-0100' });
vendor.setValue({ fieldId: 'subsidiary', value: 1 });
vendor.setValue({ fieldId: 'terms', value: 3 }); // Net 60 internal ID
vendor.setValue({ fieldId: 'currency', value: 1 }); // USD internal ID
vendor.setValue({ fieldId: 'is1099Eligible', value: false });
var vendorId = vendor.save();
```

### Load and check AP balance
```javascript
var vendor = record.load({ type: record.Type.VENDOR, id: vendorId });
var vendorName = vendor.getValue({ fieldId: 'companyName' });
var apBalance = vendor.getValue({ fieldId: 'balance' });
var openPOs = vendor.getValue({ fieldId: 'unbilledOrders' });
log.debug({ title: vendorName, details: 'AP Balance: ' + apBalance + ', Open POs: ' + openPOs });
```

### Update vendor details
```javascript
record.submitFields({
  type: record.Type.VENDOR,
  id: vendorId,
  values: {
    phone: '800-555-0200',
    email: 'newcontact@supplier.com',
    terms: netThirtyTermsId
  }
});
```

### Search for active vendors
```javascript
var vendorSearch = search.create({
  type: search.Type.VENDOR,
  filters: [
    ['isinactive', search.Operator.IS, 'F'],
    'AND',
    ['subsidiary', search.Operator.IS, '1']
  ],
  columns: [
    search.createColumn({ name: 'entityId' }),
    search.createColumn({ name: 'companyName' }),
    search.createColumn({ name: 'email' }),
    search.createColumn({ name: 'phone' }),
    search.createColumn({ name: 'balance' }),
    search.createColumn({ name: 'terms' })
  ]
});
```

### Search 1099-eligible vendors
```javascript
var vendor1099Search = search.create({
  type: search.Type.VENDOR,
  filters: [
    ['isinactive', search.Operator.IS, 'F'],
    'AND',
    ['is1099eligible', search.Operator.IS, 'T']
  ],
  columns: [
    search.createColumn({ name: 'entityId' }),
    search.createColumn({ name: 'companyName' }),
    search.createColumn({ name: 'taxIdNum' })
  ]
});
```

### Quick lookup
```javascript
var vendorData = search.lookupFields({
  type: search.Type.VENDOR,
  id: vendorId,
  columns: ['email', 'phone', 'companyName', 'terms', 'balance']
});
```

## Vendor Bill Creation (from PO)

```javascript
// Create vendor bill from PO via transform
var bill = record.transform({
  fromType: record.Type.PURCHASE_ORDER,
  fromId: poId,
  toType: record.Type.VENDOR_BILL
});
bill.setValue({ fieldId: 'tranDate', value: new Date() });
bill.setValue({ fieldId: 'duedate', value: calculateDueDate() });
var billId = bill.save();
```

## Common Search Filters

| Field | Operator | Use Case |
|-------|----------|----------|
| `isinactive` | IS | 'F' = active vendors only |
| `balance` | GREATER_THAN | Vendors with outstanding AP balance |
| `is1099eligible` | IS | 'T' = 1099 vendors |
| `subsidiary` | IS | Filter by subsidiary |
| `terms` | IS | Filter by payment terms |
| `currency` | IS | Filter by currency |
| `category` | IS | Filter by vendor category |

## Notes

- Like Customer, `entityId` (display ID) is distinct from `internalid` (numeric DB ID)
- `balance` is read-only — shows outstanding Vendor Bill balance
- `is1099Eligible` flag is used for US tax reporting — 1099 payments must be tracked
- For 1099 reporting, use NetSuite's built-in 1099 forms under Reports > Tax Reports
- `payablesAccount` overrides the default AP account for this vendor's transactions
