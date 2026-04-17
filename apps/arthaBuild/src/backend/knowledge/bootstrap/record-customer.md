---
source: SuiteScript 2.x API Reference — Customer Record Schema
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Customer Record (record.Type.CUSTOMER)

Internal record type ID: `'customer'`

The Customer record represents companies or individuals who purchase from you.
It is the `entity` on Sales Orders, Invoices, and Customer Payments.

## Record Constant

```javascript
record.Type.CUSTOMER   // 'customer'
search.Type.CUSTOMER   // 'customer'
```

## Body Fields

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `entityId` | Customer ID | Text | Auto-assigned or manually set. Format: CUST-XXX |
| `companyName` | Company Name | Text | Company name (isPerson=false) |
| `salutation` | Salutation | Select | Mr./Ms./Dr. (isPerson=true) |
| `firstName` | First Name | Text | Individual's first name |
| `middleName` | Middle Name | Text | |
| `lastName` | Last Name | Text | Individual's last name |
| `isPerson` | Individual | Checkbox | True = individual, False = company |
| `email` | Email | Email | Primary email address |
| `phone` | Phone | Phone | Primary phone |
| `altPhone` | Alt. Phone | Phone | Secondary phone |
| `fax` | Fax | Phone | Fax number |
| `website` | Website | URL | Company website |
| `subsidiary` | Subsidiary | Select | Primary subsidiary |
| `currency` | Currency | Select | Default billing currency |
| `terms` | Terms | Select | Default payment terms |
| `creditLimit` | Credit Limit | Currency | Maximum allowed credit |
| `credithold` | Credit Hold | Select | 'Auto' = auto-hold on overdue |
| `balance` | Balance | Currency | Outstanding balance (read-only) |
| `overdueBalance` | Overdue Balance | Currency | Overdue amount (read-only) |
| `unbilledOrders` | Unbilled Orders | Currency | Open SO value (read-only) |
| `salesrep` | Sales Rep | Select | Primary sales representative |
| `partner` | Partner | Select | Partner/referral entity |
| `category` | Category | Select | Customer category |
| `taxItem` | Tax Item | Select | Default tax code |
| `vatregNumber` | VAT Reg # | Text | VAT/tax registration number |
| `priceLevel` | Price Level | Select | Default pricing tier |
| `isinactive` | Inactive | Checkbox | True = inactive customer |
| `comments` | Comments | Text | Internal notes |
| `custentity_*` | Custom Fields | Various | Custom entity fields |

## Contact Sublist (contact)

| Field ID | Label | Notes |
|----------|-------|-------|
| `contact` | Contact | Linked Contact record internal ID |
| `role` | Role | Contact role (e.g., Primary, Billing) |
| `email` | Email | Contact's email |
| `phone` | Phone | Contact's phone |

## Address Book Sublist (addressbook)

| Field ID | Label | Notes |
|----------|-------|-------|
| `addressid` | Address ID | Internal ID of address |
| `label` | Label | Address label (e.g., 'Billing', 'Shipping') |
| `defaultbilling` | Default Billing | Boolean — primary billing address |
| `defaultshipping` | Default Shipping | Boolean — primary shipping address |
| `addr1` | Address 1 | Street address |
| `addr2` | Address 2 | Suite/unit |
| `city` | City | |
| `state` | State | State/province |
| `zip` | Zip | Postal code |
| `country` | Country | ISO country code |

## Currency Sublist (currency)

For multi-currency: lists currencies available for this customer.

| Field ID | Label | Notes |
|----------|-------|-------|
| `currency` | Currency | Currency internal ID |
| `balance` | Balance | Balance in this currency (read-only) |
| `overduebalance` | Overdue | Overdue balance in this currency |

## Common Operations

### Create a company customer
```javascript
var customer = record.create({
  type: record.Type.CUSTOMER,
  isDynamic: true
});
customer.setValue({ fieldId: 'isPerson', value: false });
customer.setValue({ fieldId: 'companyName', value: 'Acme Corporation' });
customer.setValue({ fieldId: 'email', value: 'billing@acme.com' });
customer.setValue({ fieldId: 'phone', value: '555-100-2000' });
customer.setValue({ fieldId: 'subsidiary', value: 1 });
customer.setValue({ fieldId: 'terms', value: 2 }); // Net 30 internal ID
customer.setValue({ fieldId: 'creditLimit', value: 25000 });
var custId = customer.save();
```

### Create an individual customer
```javascript
var customer = record.create({
  type: record.Type.CUSTOMER,
  isDynamic: true
});
customer.setValue({ fieldId: 'isPerson', value: true });
customer.setValue({ fieldId: 'firstName', value: 'Jane' });
customer.setValue({ fieldId: 'lastName', value: 'Smith' });
customer.setValue({ fieldId: 'email', value: 'jane.smith@email.com' });
var custId = customer.save();
```

### Load and update customer
```javascript
var customer = record.load({ type: record.Type.CUSTOMER, id: custId });
var name = customer.getValue({ fieldId: 'companyName' });
var balance = customer.getValue({ fieldId: 'balance' });
customer.setValue({ fieldId: 'creditLimit', value: 50000 });
customer.save();
```

### submitFields for single-field update
```javascript
record.submitFields({
  type: record.Type.CUSTOMER,
  id: custId,
  values: {
    email: 'newemail@customer.com',
    phone: '555-200-3000'
  }
});
```

### Search customers
```javascript
var custSearch = search.create({
  type: search.Type.CUSTOMER,
  filters: [
    ['isinactive', search.Operator.IS, 'F'],
    'AND',
    ['subsidiary', search.Operator.IS, '1']
  ],
  columns: [
    search.createColumn({ name: 'entityId' }),
    search.createColumn({ name: 'companyName' }),
    search.createColumn({ name: 'email' }),
    search.createColumn({ name: 'balance' }),
    search.createColumn({ name: 'salesrep' })
  ]
});
```

### Look up customer fields quickly
```javascript
var custData = search.lookupFields({
  type: search.Type.CUSTOMER,
  id: custId,
  columns: ['email', 'phone', 'creditLimit', 'balance', 'terms']
});
var email = custData.email;
var balance = custData.balance;
```

## Common Search Filters

| Field | Operator | Use Case |
|-------|----------|----------|
| `isinactive` | IS | 'F' = active customers only |
| `balance` | GREATER_THAN | Customers with open balance |
| `overduebalance` | GREATER_THAN | Customers with overdue balance |
| `subsidiary` | IS | Filter by subsidiary |
| `salesrep` | IS | Filter by sales rep |
| `category` | IS | Filter by customer category |
| `terms` | IS | Filter by payment terms |
| `email` | CONTAINS | Search by email domain |

## Notes

- `entityId` is separate from `internalid` — `entityId` is the display ID (e.g., 'CUST-001')
  while `internalid` is the numeric database ID
- When `isPerson = true`: use `firstName`/`lastName` fields. When false: use `companyName`
- `balance` and `overdueBalance` are calculated fields — read-only via getValue()
- The `credithold = 'Auto'` setting automatically places the customer on hold when their
  overdue balance exceeds their credit limit
