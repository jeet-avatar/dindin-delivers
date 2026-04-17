---
source: SuiteScript 2.x API Reference — Suitelet Script
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Suitelet Script

Suitelets are server-side scripts that render custom HTML pages or handle HTTP requests
within the NetSuite UI. They respond to GET and POST requests and can return HTML forms,
JSON, or plain text. Accessible via a generated URL within NetSuite's domain.

## Script Header (Required JSDoc)

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/url', 'N/redirect'], function(serverWidget, search, record, url, redirect) {

  function onRequest(context) { ... }

  return { onRequest: onRequest };
});
```

## Entry Point

### onRequest(context)
Single entry point. Called for every HTTP request (GET or POST).

```javascript
function onRequest(context) {
  var method = context.request.method; // 'GET' or 'POST'

  if (method === 'GET') {
    handleGet(context);
  } else if (method === 'POST') {
    handlePost(context);
  }
}
```

## context.request Properties

```javascript
context.request.method          // 'GET' or 'POST'
context.request.parameters      // URL query string parameters as object
context.request.body            // POST body as string (parse with JSON.parse for JSON)
context.request.headers         // Request headers object
context.request.clientIpAddress // Caller's IP address
context.request.files           // Uploaded files (POST with file upload)

// Get specific parameter
var orderId = context.request.parameters.orderId;
var action = context.request.parameters.action;
```

## context.response Methods

```javascript
// Write plain HTML/text string
context.response.write({ output: '<html><body>Hello</body></html>' });

// Write a serverWidget Form page
context.response.writePage({ pageObject: form });

// Set response headers
context.response.setHeader({ name: 'Content-Type', value: 'application/json' });
context.response.setHeader({ name: 'Access-Control-Allow-Origin', value: '*' });

// Send a file as download
context.response.writeFile({ file: myFile, isInline: false });
```

## Building a Form (GET handler)

```javascript
function handleGet(context) {
  var form = serverWidget.createForm({ title: 'Order Lookup' });

  // Add a field group
  form.addFieldGroup({ id: 'SEARCHPARAMS', label: 'Search Parameters' });

  // Add fields
  var dateField = form.addField({
    id: 'custpage_from_date',
    type: serverWidget.FieldType.DATE,
    label: 'From Date',
    container: 'SEARCHPARAMS'
  });
  dateField.isMandatory = true;

  var statusField = form.addField({
    id: 'custpage_status',
    type: serverWidget.FieldType.SELECT,
    label: 'Status',
    container: 'SEARCHPARAMS'
  });
  statusField.addSelectOption({ value: '', text: '-- All --' });
  statusField.addSelectOption({ value: 'pendingFulfillment', text: 'Pending Fulfillment' });
  statusField.addSelectOption({ value: 'fullyFulfilled', text: 'Fully Fulfilled' });

  form.addSubmitButton({ label: 'Search' });

  // Results sublist
  var sublist = form.addSublist({
    id: 'custpage_results',
    type: serverWidget.SublistType.LIST,
    label: 'Results'
  });
  sublist.addField({ id: 'custpage_order_num', type: serverWidget.FieldType.TEXT, label: 'Order #' });
  sublist.addField({ id: 'custpage_customer', type: serverWidget.FieldType.TEXT, label: 'Customer' });
  sublist.addField({ id: 'custpage_amount', type: serverWidget.FieldType.CURRENCY, label: 'Amount' });
  sublist.addField({ id: 'custpage_status', type: serverWidget.FieldType.TEXT, label: 'Status' });

  context.response.writePage({ pageObject: form });
}
```

## Processing a POST Request

```javascript
function handlePost(context) {
  var params = context.request.parameters;
  var fromDate = params.custpage_from_date;
  var statusFilter = params.custpage_status;

  // Run search with parameters
  var filters = [['tranDate', search.Operator.AFTER, fromDate]];
  if (statusFilter) {
    filters.push('AND');
    filters.push(['status', search.Operator.IS, statusFilter]);
  }

  var orderSearch = search.create({
    type: search.Type.SALES_ORDER,
    filters: filters,
    columns: [
      search.createColumn({ name: 'tranId' }),
      search.createColumn({ name: 'entity' }),
      search.createColumn({ name: 'amount' }),
      search.createColumn({ name: 'status' })
    ]
  });

  // Rebuild the form with results
  var form = serverWidget.createForm({ title: 'Order Search Results' });
  var sublist = form.addSublist({ id: 'custpage_results', type: serverWidget.SublistType.LIST, label: 'Results' });
  sublist.addField({ id: 'custpage_order_num', type: serverWidget.FieldType.TEXT, label: 'Order #' });
  sublist.addField({ id: 'custpage_amount', type: serverWidget.FieldType.CURRENCY, label: 'Amount' });

  var line = 0;
  orderSearch.run().each(function(result) {
    sublist.setSublistValue({ id: 'custpage_order_num', line: line, value: result.getValue({ name: 'tranId' }) });
    sublist.setSublistValue({ id: 'custpage_amount', line: line, value: result.getValue({ name: 'amount' }) });
    line++;
    return line < 1000;
  });

  context.response.writePage({ pageObject: form });
}
```

## Returning JSON (REST-like Suitelet)

```javascript
function onRequest(context) {
  context.response.setHeader({ name: 'Content-Type', value: 'application/json' });

  if (context.request.method === 'GET') {
    var id = context.request.parameters.id;
    try {
      var data = getOrderData(parseInt(id));
      context.response.write({ output: JSON.stringify({ success: true, data: data }) });
    } catch (e) {
      context.response.write({ output: JSON.stringify({ success: false, error: e.message }) });
    }
  }
}
```

## Generating the Suitelet URL

```javascript
// Relative URL (for links within NetSuite)
var relUrl = url.resolveScript({
  scriptId: 'customscript_order_suitelet',
  deploymentId: 'customdeploy1'
});

// External URL (for emails, external links) — must be "Available Without Login" or have session
var extUrl = url.resolveScript({
  scriptId: 'customscript_order_suitelet',
  deploymentId: 'customdeploy1',
  returnExternalUrl: true,
  params: { orderId: 1234 }
});
```

## Governance

- **1,000 units per invocation** (synchronous with the user's browser request)
- Timeout: 60 seconds (HTTP timeout; user sees error if exceeded)
- Large data operations should be offloaded to Scheduled or Map/Reduce scripts

## Deployment Settings

| Setting | Value |
|---------|-------|
| Script Type | Suitelet |
| Status | Released |
| Log Level | DEBUG (dev) / AUDIT or ERROR (prod) |
| Available Without Login | Check to allow public access (no NetSuite session required) |
| Deployed | Must have at least one deployment to generate URL |
