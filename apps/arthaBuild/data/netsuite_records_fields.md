## NetSuite Records & Fields — Internal ID Reference

This document covers NetSuite record types, common field internal IDs, and sublist field IDs. Used to prevent hallucinating field names in SuiteScript and saved searches.

---

### Sales Order (salesorder / record.Type.SALES_ORDER)
#### Header Fields
| Field Label | Internal ID | Type |
|-------------|-------------|------|
| Customer | entity | List (Customer) |
| Order Date | trandate | Date |
| PO Number | otherrefnum | Text |
| Sales Rep | salesrep | List |
| Status | status | List |
| Memo | memo | Text |
| Subsidiary | subsidiary | List (OneWorld) |
| Currency | currency | List |
| Discount | discountitem | List |
| Shipping Method | shipmethod | List |
| Shipping Cost | shippingcost | Currency |

#### Item Sublist (sublistId: 'item')
| Field Label | Field Internal ID | Type |
|-------------|-------------------|------|
| Item | item | List |
| Description | description | Text |
| Quantity | quantity | Number |
| Units | units | List |
| Rate (Price) | rate | Currency |
| Amount | amount | Currency |
| Tax Code | taxcode | List |
| Tax Amount | tax1amt | Currency |
| Location | location | List |

---

### Customer (customer / record.Type.CUSTOMER)
#### Header Fields
| Field Label | Internal ID | Type |
|-------------|-------------|------|
| Name | companyname | Text |
| First Name | firstname | Text |
| Last Name | lastname | Text |
| Email | email | Email |
| Phone | phone | Phone |
| Address | defaultaddress | Address |
| Sales Rep | salesrep | List |
| Price Level | pricelevel | List |
| Credit Limit | creditlimit | Currency |
| Terms | terms | List |
| Subsidiary | subsidiary | List (OneWorld) |
| Customer ID | entityid | Text |

---

### Invoice (invoice / record.Type.INVOICE)
#### Header Fields
| Field Label | Internal ID | Type |
|-------------|-------------|------|
| Customer | entity | List |
| Invoice Date | trandate | Date |
| Due Date | duedate | Date |
| PO Number | otherrefnum | Text |
| Amount Due | amountdue | Currency |
| Memo | memo | Text |

#### Item Sublist (sublistId: 'item')
Same fields as Sales Order item sublist.

---

### Purchase Order (purchaseorder / record.Type.PURCHASE_ORDER)
#### Header Fields
| Field Label | Internal ID | Type |
|-------------|-------------|------|
| Vendor | entity | List |
| PO Date | trandate | Date |
| Expected Receipt Date | duedate | Date |
| Memo | memo | Text |

#### Item Sublist (sublistId: 'item')
| Field Label | Field Internal ID | Type |
|-------------|-------------------|------|
| Item | item | List |
| Quantity | quantity | Number |
| Rate | rate | Currency |
| Amount | amount | Currency |

---

### Vendor Bill (vendorbill / record.Type.VENDOR_BILL)
#### Header Fields
| Field Label | Internal ID | Type |
|-------------|-------------|------|
| Vendor | entity | List |
| Bill Date | trandate | Date |
| Due Date | duedate | Date |
| Reference Number | tranid | Text |
| Memo | memo | Text |
| Amount | usertotal | Currency |

---

### Inventory Item (inventoryitem / record.Type.INVENTORY_ITEM)
#### Header Fields
| Field Label | Internal ID | Type |
|-------------|-------------|------|
| Item Name | itemid | Text |
| Display Name | salesdescription | Text |
| Internal ID | id | Number |
| Price (Base) | baseprice | Currency |
| Cost (Average) | averagecost | Currency |
| Quantity On Hand | quantityonhand | Number |
| Preferred Location | preferredlocation | List |
| UOM | unitstype | List |
| Taxable | taxable | Checkbox |

---

### Employee (employee / record.Type.EMPLOYEE)
| Field Label | Internal ID | Type |
|-------------|-------------|------|
| First Name | firstname | Text |
| Last Name | lastname | Text |
| Email | email | Email |
| Department | department | List |
| Subsidiary | subsidiary | List (OneWorld) |
| Employee ID | entityid | Text |

---

### Custom Records
Custom record type internal IDs follow the pattern: `customrecord_[name]`
Custom field internal IDs follow the pattern:
- `custbody_[name]` — transaction body fields
- `custcol_[name]` — transaction column/sublist fields
- `custentity_[name]` — entity (customer/vendor/employee) fields
- `custitem_[name]` — item fields

---

### Saved Search Filter Operators (N/search)
| Operator Constant | Meaning |
|------------------|---------|
| search.Operator.IS | equals |
| search.Operator.ISNOT | not equals |
| search.Operator.ANYOF | in list |
| search.Operator.NONEOF | not in list |
| search.Operator.CONTAINS | contains text |
| search.Operator.STARTSWITH | starts with |
| search.Operator.GREATERTHAN | > |
| search.Operator.LESSTHAN | < |
| search.Operator.BETWEEN | between two values |
| search.Operator.ISEMPTY | is empty/null |
| search.Operator.ISNOTEMPTY | is not empty |
| search.Operator.ON | date is |
| search.Operator.ONORAFTER | date >= |
| search.Operator.ONORBEFORE | date <= |

---

### Sales Order Status Values
| Status | Internal Value |
|--------|---------------|
| Pending Approval | SalesOrd:A |
| Pending Fulfillment | SalesOrd:B |
| Cancelled | SalesOrd:C |
| Partially Fulfilled | SalesOrd:D |
| Pending Billing/Partially Fulfilled | SalesOrd:E |
| Pending Billing | SalesOrd:F |
| Billed | SalesOrd:G |
| Closed | SalesOrd:H |
