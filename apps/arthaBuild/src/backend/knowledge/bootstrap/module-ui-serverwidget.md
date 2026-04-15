---
source: SuiteScript 2.x API Reference — N/ui/serverWidget Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/ui/serverWidget Module

The N/ui/serverWidget module builds server-rendered HTML forms, sublists, and UI components
for Suitelets. Available in Suitelets only (server-side). Used to create custom UI pages
within the NetSuite interface.

## Loading the Module

```javascript
define(['N/ui/serverWidget'], function(serverWidget) { ... });
```

## Creating Forms

### serverWidget.createForm(options)
Creates a new Form object.

```javascript
var form = serverWidget.createForm({
  title: 'My Custom Form',
  hideNavBar: false   // Optional: hides top navigation bar
});
```

## Form Methods

### form.addField(options)
Adds an input field to the form body.

```javascript
var nameField = form.addField({
  id: 'custpage_name',            // Must begin with 'custpage_'
  type: serverWidget.FieldType.TEXT,
  label: 'Customer Name',
  container: 'MAINGROUP'          // Optional: field group to place in
});

nameField.defaultValue = 'Default Value';   // Set default
nameField.isMandatory = true;               // Mark required
nameField.isReadOnly = false;               // Editable
nameField.maxLength = 100;                  // Max chars for text fields
```

### form.addFieldGroup(options)
Adds a collapsible section to organize fields.

```javascript
var group = form.addFieldGroup({
  id: 'ORDERINFO',
  label: 'Order Information'
});
group.isCollapsible = true;
group.isCollapsed = false;
```

### form.addSublist(options)
Adds a sublist (multi-row table) to the form.

```javascript
var sublist = form.addSublist({
  id: 'custpage_items',
  type: serverWidget.SublistType.LIST,   // or INLINEEDITOR, EDITOR
  label: 'Line Items',
  tab: 'items'   // Optional: add to a specific tab
});

// Add columns to the sublist
sublist.addField({
  id: 'custpage_item_name',
  type: serverWidget.FieldType.TEXT,
  label: 'Item Name'
});
sublist.addField({
  id: 'custpage_qty',
  type: serverWidget.FieldType.INTEGER,
  label: 'Quantity'
});
sublist.addField({
  id: 'custpage_price',
  type: serverWidget.FieldType.CURRENCY,
  label: 'Price'
});

// Set data in sublist rows
sublist.setSublistValue({ id: 'custpage_item_name', line: 0, value: 'Widget' });
sublist.setSublistValue({ id: 'custpage_qty', line: 0, value: '5' });
```

### form.addTab(options)
Adds a tab to organize the form into sections.

```javascript
var orderTab = form.addTab({
  id: 'items',
  label: 'Order Items'
});
```

### form.addButton(options)
Adds a custom button to the form.

```javascript
form.addButton({
  id: 'custpage_btn_approve',
  label: 'Approve Order',
  functionName: 'onApproveClick'   // Client script function name
});
```

### form.addSubmitButton(options)
Adds the primary submit button.

```javascript
form.addSubmitButton({ label: 'Save' });
```

### form.addResetButton(options)
Adds a reset button that clears form values.

```javascript
form.addResetButton({ label: 'Clear' });
```

### form.clientScriptModulePath
Attaches a client script to the form for client-side event handling.

```javascript
form.clientScriptModulePath = './customscript_my_client_script.js';
// or use the script ID:
form.clientScriptFileId = fileId;
```

### context.response.writePage()
Sends the form as the Suitelet response.

```javascript
context.response.writePage({ pageObject: form });
```

## serverWidget.FieldType Constants

```javascript
serverWidget.FieldType.TEXT            // Single-line text input
serverWidget.FieldType.TEXTAREA        // Multi-line text area
serverWidget.FieldType.INTEGER         // Whole number
serverWidget.FieldType.FLOAT           // Decimal number
serverWidget.FieldType.CURRENCY        // Currency amount
serverWidget.FieldType.PERCENT         // Percentage
serverWidget.FieldType.DATE            // Date picker
serverWidget.FieldType.DATETIME        // Date + time
serverWidget.FieldType.DATETIMETZ      // Date + time + timezone
serverWidget.FieldType.CHECKBOX        // Checkbox (true/false)
serverWidget.FieldType.SELECT          // Single-select dropdown
serverWidget.FieldType.MULTISELECT     // Multi-select list
serverWidget.FieldType.FILE            // File upload
serverWidget.FieldType.IMAGE           // Image display
serverWidget.FieldType.INLINEHTML      // Raw HTML content (read-only display)
serverWidget.FieldType.LABEL           // Static text label
serverWidget.FieldType.LONGTEXT        // Long text (same as TEXTAREA)
serverWidget.FieldType.RADIO           // Radio button group
serverWidget.FieldType.RICHTEXT        // Rich text editor
serverWidget.FieldType.URL             // URL field
serverWidget.FieldType.HELP            // Help text (tooltip)
```

## serverWidget.SublistType Constants

```javascript
serverWidget.SublistType.LIST          // Read-only list (data display)
serverWidget.SublistType.INLINEEDITOR  // Editable inline table
serverWidget.SublistType.EDITOR        // Editable with Save/Cancel per row
serverWidget.SublistType.STATICLIST    // Static (non-interactive) list
```

## SELECT Field Options

```javascript
var selectField = form.addField({
  id: 'custpage_status',
  type: serverWidget.FieldType.SELECT,
  label: 'Status'
});

// Add options
selectField.addSelectOption({ value: '', text: '-- Select --' });
selectField.addSelectOption({ value: 'PENDING', text: 'Pending' });
selectField.addSelectOption({ value: 'APPROVED', text: 'Approved' });
selectField.addSelectOption({ value: 'REJECTED', text: 'Rejected', isSelected: true });
```

## Complete Suitelet Example

```javascript
define(['N/ui/serverWidget', 'N/search'], function(serverWidget, search) {

  function onRequest(context) {
    if (context.request.method === 'GET') {
      var form = serverWidget.createForm({ title: 'Order Management' });

      // Fields
      var dateField = form.addField({
        id: 'custpage_startdate',
        type: serverWidget.FieldType.DATE,
        label: 'Start Date'
      });
      dateField.defaultValue = new Date().toISOString().split('T')[0];

      // Submit button
      form.addSubmitButton({ label: 'Run Report' });

      // Results sublist
      var sublist = form.addSublist({
        id: 'custpage_results',
        type: serverWidget.SublistType.LIST,
        label: 'Results'
      });
      sublist.addField({ id: 'custpage_order', type: serverWidget.FieldType.TEXT, label: 'Order #' });
      sublist.addField({ id: 'custpage_amount', type: serverWidget.FieldType.CURRENCY, label: 'Amount' });

      // Populate sublist with search results
      var line = 0;
      search.create({ type: 'salesorder', filters: [], columns: [{ name: 'tranId' }, { name: 'amount' }] })
        .run().each(function(result) {
          sublist.setSublistValue({ id: 'custpage_order', line: line, value: result.getValue({ name: 'tranId' }) });
          sublist.setSublistValue({ id: 'custpage_amount', line: line, value: result.getValue({ name: 'amount' }) });
          line++;
          return line < 100; // max 100 rows
        });

      context.response.writePage({ pageObject: form });
    }
  }

  return { onRequest: onRequest };
});
```
