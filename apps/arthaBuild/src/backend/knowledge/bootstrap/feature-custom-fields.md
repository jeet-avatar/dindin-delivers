---
source: Oracle NetSuite Official Documentation — Custom Fields
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Custom Fields

## Overview

Custom Fields extend standard NetSuite records with additional data fields.
They are added via Setup > Customization without code. Once created, they appear
on the record form, are searchable, and accessible via SuiteScript.

**Navigation:** Setup > Customization > Lists, Records & Fields > [Field Type] > New

---

## Field Types by Location

| Field Type       | Navigation Path                                                        | Prefix        |
|------------------|------------------------------------------------------------------------|---------------|
| Transaction Body | Setup > Customization > L,R&F > Transaction Body Fields > New         | `custbody_`   |
| Transaction Column | Setup > Customization > L,R&F > Transaction Column Fields > New    | `custcol_`    |
| Entity Field     | Setup > Customization > L,R&F > Entity Fields > New                   | `custentity_` |
| Item Field       | Setup > Customization > L,R&F > Item Fields > New                     | `custitem_`   |
| CRM Field        | Setup > Customization > L,R&F > CRM Fields > New                      | `custentity_` |
| Other Field      | Setup > Customization > L,R&F > Other Fields > New                    | `custbody_`   |

### Field Type Details

- **Transaction Body Fields** — appear on the main header of transactions (SO, PO, Invoice, etc.)
- **Transaction Column Fields** — appear on the line items sublist of transactions
- **Entity Fields** — apply to Customer, Vendor, Employee, Partner, Contact records
- **Item Fields** — apply to inventory items, non-inventory items, service items, etc.

---

## Data Types

| Display Type     | NetSuite Constant   | Description                                   |
|------------------|---------------------|-----------------------------------------------|
| Free Form Text   | FREE_FORM_TEXT      | Short text string (up to 4000 chars)          |
| Text Area        | TEXTAREA            | Multi-line long text                          |
| Integer          | INTEGER             | Whole numbers only                            |
| Decimal Number   | FLOAT               | Decimal/floating point numbers                |
| Currency         | CURRENCY            | Monetary value with currency symbol           |
| Percent          | PERCENT             | Percentage (0-100, displays as %)             |
| Date             | DATE                | Date picker (date without time)               |
| Date/Time        | DATETIME            | Date and time picker                          |
| Checkbox         | CHECKBOX            | Boolean true/false (T/F in DB)                |
| List/Record      | SELECT              | Dropdown linked to list or record type        |
| Multi-Select     | MULTISELECT         | Multiple selections from a list               |
| Document         | DOCUMENT            | File Cabinet attachment                       |
| Email            | EMAIL               | Email address (validated format)              |
| Phone            | PHONE               | Phone number                                  |
| URL              | URL                 | Web address (hyperlinked)                     |
| Image            | IMAGE               | Image display                                 |
| Rich Text        | RICH_TEXT           | HTML WYSIWYG editor                           |
| Help             | HELP                | Display-only informational text               |

---

## Sourcing (Auto-populate)

Sourcing automatically copies a field value from a related record:

**Example:** Source the Customer's Payment Terms to the Sales Order
1. On Transaction Body Field: `custbody_customer_terms`
2. Set "Sourced From" = Customer
3. Set "Source Field" = Terms

When a customer is selected on the SO, the terms field is auto-populated.

**Common sourcing patterns:**
- Customer → Salesperson, Territory, Currency
- Item → Preferred Vendor, Cost
- Department → Manager
- Vendor → Payment Method, Terms

---

## Filtering (Conditional Dropdowns)

Filtering narrows dropdown options based on another field's value:

**Example:** Show only items in the category selected by another field
1. Create `custbody_product_category` (List/Record = Item Category)
2. Create `custbody_filtered_item` (List/Record = Item)
3. On `custbody_filtered_item`: set Filter = `custbody_product_category`

Only items matching the selected category will appear in the dropdown.

---

## Validation

Custom fields support:
- **Mandatory:** field must have a value before record can be saved
- **Default Value:** pre-populated value when record is created
- **Regex Validation:** pattern matching for text fields
  - e.g., `^[A-Z]{2}-\d{4}$` validates format like "AB-1234"
- **Min/Max Value:** for numeric fields

---

## Accessing Custom Fields in SuiteScript 2.1

```javascript
define(['N/record', 'N/log'], function(record, log) {
    var soRecord = record.load({ type: record.Type.SALES_ORDER, id: 1234 });

    // Get body field
    var status = soRecord.getValue({ fieldId: 'custbody_approval_status' });
    var approver = soRecord.getValue({ fieldId: 'custbody_approver_name' });
    var isVIP = soRecord.getValue({ fieldId: 'custbody_is_vip_customer' }); // checkbox = true/false

    // Set body field
    soRecord.setValue({ fieldId: 'custbody_approval_status', value: 'Approved' });

    // Get line (column) field
    var lineCount = soRecord.getLineCount({ sublistId: 'item' });
    for (var i = 0; i < lineCount; i++) {
        var lineNote = soRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_line_note',
            line: i
        });
        log.debug('Line ' + i, lineNote);
    }

    // Set line field
    soRecord.setSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_line_note',
        line: 0,
        value: 'Expedite this line'
    });

    soRecord.save();
});
```

---

## Accessing Entity Custom Fields

```javascript
// Customer record
var customer = record.load({ type: record.Type.CUSTOMER, id: 5678 });

var tier = customer.getValue({ fieldId: 'custentity_account_tier' });        // List/Record
var revenue = customer.getValue({ fieldId: 'custentity_annual_revenue' });    // Currency
var vertical = customer.getValue({ fieldId: 'custentity_industry_vertical' }); // Free Form Text

customer.setValue({ fieldId: 'custentity_account_tier', value: '2' }); // Internal ID of list item
customer.save();
```

---

## List/Record Fields (Relationships)

LIST/RECORD fields link to:
- **Standard lists:** e.g., Terms, Currencies, Employees
- **Custom lists:** manually created key/value lists
- **Custom record types:** full record relationships

When getting/setting a List/Record field, use the **internal ID** (integer):

```javascript
// Set a list field — pass internal ID as string or number
record.setValue({ fieldId: 'custbody_approval_status', value: '3' }); // ID 3 = "Approved"

// Get the text value (displayed label)
var statusText = record.getText({ fieldId: 'custbody_approval_status' });
// Returns: "Approved" (the display label, not the internal ID)
```

---

## Custom Field Applies To

Transaction Body and Column fields specify which record types they apply to:
- Sales Order only
- All transactions
- Sales transactions (SO, Invoice, Credit Memo)
- Purchase transactions (PO, Vendor Bill, Vendor Credit)
- Journal Entry

Configure in "Applies To" tab on the field definition.

---

## Searching by Custom Fields

```javascript
// SuiteScript: filter on custom field
search.create({
    type: search.Type.SALES_ORDER,
    filters: [
        search.createFilter({
            name: 'custbody_approval_status',
            operator: search.Operator.IS,
            values: ['Pending']
        })
    ]
});
```

```sql
-- SuiteQL: query by custom field
SELECT id, tranId, custbody_approval_status, custbody_territory
FROM transaction
WHERE type = 'SalesOrd'
  AND custbody_approval_status = 'Pending'
```
