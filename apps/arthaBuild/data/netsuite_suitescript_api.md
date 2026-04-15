## NetSuite SuiteScript 2.1 — API Reference

This document covers correct SuiteScript 2.1 API syntax, module names, entry points, and common patterns. Focuses on what the model gets WRONG in pre-training.

---

### File Header (REQUIRED)
Every SuiteScript 2.1 file MUST start with these JSDoc tags:
```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType [ScriptType]
 * @NModuleScope SameAccount
 */
```

Script types: UserEventScript, ScheduledScript, Suitelet, ClientScript, RESTlet, MapReduceScript, MassUpdateScript, WorkflowActionScript, PortletScript

### Module Import (AMD define syntax)
```javascript
define(['N/record', 'N/search', 'N/log', 'N/email', 'N/runtime', 'N/url', 'N/https', 'N/file', 'N/redirect', 'N/ui/serverWidget'],
  function(record, search, log, email, runtime, url, https, file, redirect, serverWidget) {
    // module code here
    return { beforeSubmit, afterSubmit }; // export entry points
  }
);
```

---

### Core Modules

#### N/record
```javascript
// Load an existing record
var rec = record.load({ type: record.Type.SALES_ORDER, id: 123, isDynamic: true });

// Create a new record
var newRec = record.create({ type: record.Type.SALES_ORDER, isDynamic: true });

// Get/Set field values
var custId = rec.getValue({ fieldId: 'entity' });
rec.setValue({ fieldId: 'memo', value: 'Updated via script' });

// Get/Set sublist (line) values
var qty = rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: 0 });
rec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: 0, value: 10 });

// Save record
var savedId = rec.save({ enableSourcing: true, ignoreMandatoryFields: false });

// Delete record
record.delete({ type: record.Type.SALES_ORDER, id: 123 });
```

#### record.Type constants (CORRECT values)
| Record | Correct Constant | Correct String ID |
|--------|-----------------|-------------------|
| Sales Order | record.Type.SALES_ORDER | 'salesorder' |
| Invoice | record.Type.INVOICE | 'invoice' |
| Customer | record.Type.CUSTOMER | 'customer' |
| Vendor | record.Type.VENDOR | 'vendor' |
| Purchase Order | record.Type.PURCHASE_ORDER | 'purchaseorder' |
| Inventory Item | record.Type.INVENTORY_ITEM | 'inventoryitem' |
| Service Item | record.Type.SERVICE_ITEM | 'serviceitem' |
| Employee | record.Type.EMPLOYEE | 'employee' |
| Assembly Item | record.Type.ASSEMBLY_ITEM | 'assemblyitem' |
| Item Fulfillment | record.Type.ITEM_FULFILLMENT | 'itemfulfillment' |
| Item Receipt | record.Type.ITEM_RECEIPT | 'itemreceipt' |
| Vendor Bill | record.Type.VENDOR_BILL | 'vendorbill' |
| Bill Payment | record.Type.VENDOR_PAYMENT | 'vendorpayment' |
| Customer Payment | record.Type.CUSTOMER_PAYMENT | 'customerpayment' |
| Credit Memo | record.Type.CREDIT_MEMO | 'creditmemo' |
| Estimate/Quote | record.Type.ESTIMATE | 'estimate' |
| Return Authorization | record.Type.RETURN_AUTHORIZATION | 'returnauthorization' |
| Cash Sale | record.Type.CASH_SALE | 'cashsale' |
| Journal Entry | record.Type.JOURNAL_ENTRY | 'journalentry' |
| Opportunity | record.Type.OPPORTUNITY | 'opportunity' |
| Contact | record.Type.CONTACT | 'contact' |

#### N/search
```javascript
// Create and run a search
var mySearch = search.create({
  type: search.Type.SALES_ORDER,
  filters: [
    search.createFilter({ name: 'status', operator: search.Operator.ANYOF, values: ['SalesOrd:A'] }),
    search.createFilter({ name: 'customer', operator: search.Operator.IS, values: [customerId] })
  ],
  columns: [
    search.createColumn({ name: 'tranid' }),
    search.createColumn({ name: 'entity' }),
    search.createColumn({ name: 'amount' }),
    search.createColumn({ name: 'trandate', sort: search.Sort.DESC })
  ]
});

// Iterate results (handles paging automatically)
mySearch.run().each(function(result) {
  var orderId = result.getValue({ name: 'tranid' });
  var amount  = result.getValue({ name: 'amount' });
  return true; // return true to continue iterating
});

// Load a saved search by ID
var saved = search.load({ id: 'customsearch_my_search' });
```

#### N/log
```javascript
// CORRECT usage:
log.debug({ title: 'My Title', details: myVariable });
log.error({ title: 'Error', details: error.message });
log.audit({ title: 'Audit', details: 'Record saved: ' + recordId });

// WRONG (pre-training hallucination):
// console.log(...)  <- does NOT work in SuiteScript
// log.debug('title', 'details')  <- 1.0 syntax, wrong in 2.x
```

#### N/email
```javascript
// CORRECT: email.send() — NOT email.create()
email.send({
  author: runtime.getCurrentUser().id,
  recipients: ['user@example.com'],
  subject: 'Subject here',
  body: 'Email body text'
});
// WRONG: email.create() does NOT exist in N/email
```

#### N/runtime
```javascript
var user = runtime.getCurrentUser();
log.debug({ title: 'User', details: user.name + ' role: ' + user.role });
var execCtx = runtime.executionContext; // 'USERINTERFACE', 'SCHEDULED', 'WEBSERVICES', etc.
var env = runtime.envType; // 'PRODUCTION', 'SANDBOX', 'BETA'
```

#### N/url
```javascript
var soUrl = url.resolveRecord({ recordType: 'salesorder', recordId: 123, isEditMode: false });
var suiteletUrl = url.resolveScript({ scriptId: 'customscript_my_suitelet', deploymentId: 'customdeploy_my_suitelet' });
```

#### N/https (server-side HTTP)
```javascript
var response = https.get({ url: 'https://api.example.com/endpoint' });
var data = JSON.parse(response.body);

var postResponse = https.post({
  url: 'https://api.example.com/submit',
  body: JSON.stringify({ key: 'value' }),
  headers: { 'Content-Type': 'application/json' }
});
```

---

### Entry Points by Script Type

#### UserEventScript
```javascript
return {
  beforeLoad:   function(context) { /* context.newRecord, context.type, context.form */ },
  beforeSubmit: function(context) { /* context.newRecord, context.oldRecord, context.type */ },
  afterSubmit:  function(context) { /* context.newRecord, context.oldRecord, context.type */ }
};
// context.type values: 'create', 'edit', 'delete', 'copy', 'print', 'view'
```

#### ScheduledScript
```javascript
return {
  execute: function(context) { /* runs on schedule */ }
};
```

#### Suitelet
```javascript
return {
  onRequest: function(context) {
    if (context.request.method === 'GET') {
      var form = serverWidget.createForm({ title: 'My Form' });
      context.response.writePage(form);
    } else {
      var value = context.request.parameters.myParam;
      context.response.write({ output: JSON.stringify({ status: 'ok' }) });
    }
  }
};
```

#### RESTlet
```javascript
return {
  get:    function(requestParams) { return { data: 'value' }; },
  post:   function(requestBody)   { return { id: 123 }; },
  put:    function(requestBody)   { return { updated: true }; },
  delete: function(requestParams) { return { deleted: true }; }
};
```

#### ClientScript
```javascript
return {
  pageInit:       function(context) { /* runs when record loads in UI */ },
  fieldChanged:   function(context) { /* context.fieldId changed */ },
  saveRecord:     function(context) { return true; /* return false to abort save */ },
  validateField:  function(context) { return true; }
};
```

---

### SuiteScript Deployment
After uploading a script file to File Cabinet:
1. Navigate to: Customization > Scripting > Scripts > New
2. Select the script file from File Cabinet
3. NetSuite auto-detects script type from @NScriptType
4. Click "Deploy Script" — creates a Script Deployment record
5. Set status to "Testing" or "Released"
6. Set "Execute As Role" (default: Administrator)

---

### Common Mistakes to Avoid
| Wrong | Correct |
|-------|---------|
| `console.log()` | `log.debug({ title, details })` |
| `email.create()` | `email.send({ author, recipients, subject, body })` |
| `log.debug('title', 'value')` | `log.debug({ title: 'title', details: 'value' })` |
| `require(['N/record'])` | `define(['N/record'], function(record) {...})` |
| `record.Type.SALES_ORDER` in 2.0 style | Always use 2.1 with `define` |
| `@NApiVersion 2` | `@NApiVersion 2.1` (preferred) |
| Hardcode internal IDs | Use record.Type constants |
