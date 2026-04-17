---
source: Oracle NetSuite Official Documentation — Custom Record Types
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Custom Record Types

## Overview

Custom Record Types extend the NetSuite data model with application-specific tables.
They are fully integrated: they appear in the UI, support workflows, saved searches,
SuiteScript access, and RESTlet APIs.

**Navigation:** Setup > Customization > Lists, Records & Fields > Record Types > New

---

## Creating a Custom Record Type

1. Navigate to Setup > Customization > Lists, Records & Fields > Record Types > New
2. Fill in the name (e.g., "Approval Log") — NetSuite generates the scriptId
3. Set `scriptId` — automatically formatted as `customrecord_approval_log` (lowercase, underscores)
4. Configure permissions: which roles can view/create/edit/delete
5. Add fields (see Field Types below)
6. Optionally enable: allow numbering, allow instant add, has sublists

---

## Script ID Convention

The scriptId is your programmatic identifier:
- Name "Approval Log" → scriptId: `customrecord_approval_log`
- Name "Project Budget" → scriptId: `customrecord_project_budget`

Always use the scriptId (not the record type name) in SuiteScript.

---

## Field Types

| Field Type       | NetSuite Constant     | Description                              |
|------------------|-----------------------|------------------------------------------|
| Free Form Text   | FREE_FORM_TEXT        | Short text (up to 4000 chars)            |
| Long Text        | LONG_TEXT             | Multi-line text                          |
| Integer          | INTEGER               | Whole number                             |
| Decimal Number   | FLOAT                 | Decimal / floating point                 |
| Currency         | CURRENCY              | Monetary amount with currency code       |
| Date             | DATE                  | Date without time                        |
| Date/Time        | DATETIME              | Date with time                           |
| Checkbox         | CHECKBOX              | Boolean (T/F)                            |
| List/Record      | SELECT                | Dropdown linked to a list or record type |
| Multi-Select     | MULTISELECT           | Multiple values from a list              |
| Document         | DOCUMENT              | File attachment (links to File Cabinet)  |
| Image            | IMAGE                 | Image file                               |
| Email            | EMAIL                 | Validated email address field            |
| URL              | URL                   | Web address                              |
| Phone            | PHONE                 | Phone number                             |
| Rich Text        | RICH_TEXT             | HTML editor (WYSIWYG)                    |

Custom field scriptIds on custom records use `custrecord_` prefix:
e.g., `custrecord_approval_status`, `custrecord_approved_by`

---

## Accessing Custom Records in SuiteScript 2.1

```javascript
define(['N/record', 'N/log'], function(record, log) {
    // Load a custom record — use string, not record.Type constant
    var approvalLog = record.load({
        type: 'customrecord_approval_log',
        id: 123
    });

    var status = approvalLog.getValue({ fieldId: 'custrecord_approval_status' });
    var approver = approvalLog.getValue({ fieldId: 'custrecord_approved_by' });
    log.debug('Approval', status + ' by ' + approver);

    // Create a new custom record
    var newRecord = record.create({
        type: 'customrecord_approval_log'
    });
    newRecord.setValue({ fieldId: 'custrecord_transaction_id', value: 456 });
    newRecord.setValue({ fieldId: 'custrecord_approval_status', value: 'Pending' });
    newRecord.setValue({ fieldId: 'custrecord_requested_by', value: runtime.getCurrentUser().id });
    var savedId = newRecord.save();
    log.debug('Created record', savedId);

    // Delete
    record.delete({ type: 'customrecord_approval_log', id: savedId });
});
```

**Important:** `record.Type.CUSTOM_RECORD_TYPE` does NOT work for custom records.
Always use the scriptId string directly: `'customrecord_approval_log'`.

---

## Querying Custom Records

### With SuiteQL

```sql
SELECT id, custrecord_status, custrecord_transaction_id, custrecord_approved_by
FROM customrecord_approval_log
WHERE custrecord_status = 'Pending'
ORDER BY id DESC
LIMIT 50
```

### With N/search

```javascript
define(['N/search'], function(search) {
    var results = search.create({
        type: 'customrecord_approval_log',
        filters: [
            search.createFilter({
                name: 'custrecord_status',
                operator: search.Operator.IS,
                values: ['Pending']
            })
        ],
        columns: [
            search.createColumn({ name: 'custrecord_status' }),
            search.createColumn({ name: 'custrecord_transaction_id' }),
            search.createColumn({ name: 'custrecord_approved_by' })
        ]
    }).run().getRange({ start: 0, end: 100 });
});
```

---

## Custom Records as Sublists on Standard Records

A custom record can appear as a sublist on a standard record (e.g., show approval history on a Sales Order):

1. Create a custom record type "Approval Log"
2. Add a field: Type = List/Record, linked to "Sales Order" — this creates the relationship
3. On the Sales Order record, the custom record appears as a related sublist

---

## Permissions Setup

By default, custom records are not accessible to any role:
1. Navigate to Setup > Users/Roles > Manage Roles
2. Open the role
3. Under "Custom Record" tab, add the new record type
4. Set permission level: VIEW, CREATE, EDIT, or FULL

Or on the custom record definition:
- Under the "Permissions" tab, add roles with their access levels

---

## REST/RESTlet Access

Custom records are accessible via the SuiteScript Record API in RESTlets:

```javascript
// GET: return custom record
function get(params) {
    var rec = record.load({
        type: 'customrecord_approval_log',
        id: params.id
    });
    return {
        id: rec.id,
        status: rec.getValue({ fieldId: 'custrecord_approval_status' })
    };
}
```

Also accessible via REST Record API:
```
GET https://{accountId}.suiteql.api.netsuite.com/record/v1/customrecord_approval_log/{id}
```

---

## Custom Lists vs Custom Record Types

| Feature             | Custom List               | Custom Record Type                      |
|---------------------|---------------------------|-----------------------------------------|
| Complexity          | Simple key/value pairs    | Full record with multiple fields        |
| Fields              | Name only (fixed)         | Multiple field types                    |
| Relationships       | No                        | Can link to any other record            |
| Workflows           | No                        | Yes                                     |
| SuiteScript         | `search.Type.CUSTOM_LIST` | `'customrecord_{scriptId}'`             |
| Use Case            | Status dropdown values    | Approval logs, project tasks, audit trail|
