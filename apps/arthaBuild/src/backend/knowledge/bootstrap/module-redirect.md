---
source: SuiteScript 2.x API Reference — N/redirect Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/redirect Module

The N/redirect module sends browser redirects to different NetSuite pages, records,
Suitelets, or external URLs. Available in **Suitelets and Client Scripts only**.

## Script Type Availability

| Script Type | Available |
|-------------|-----------|
| Suitelet | YES |
| Client Script | YES |
| User Event | NO (throws error — use beforeLoad to modify form instead) |
| Scheduled | NO |
| Map/Reduce | NO |
| RESTlet | NO |

## Loading the Module

```javascript
define(['N/redirect'], function(redirect) { ... });
```

## Core Methods

### redirect.toRecord(options)
Redirects the browser to view or edit a NetSuite record.

```javascript
// View a Sales Order
redirect.toRecord({
  type: 'salesorder',
  id: 1234,
  isEditMode: false   // Optional; default false = view mode
});

// Edit a Customer
redirect.toRecord({
  type: record.Type.CUSTOMER,
  id: 500,
  isEditMode: true
});
```

**Parameters:**
- `type` (string): Record type internal ID
- `id` (number|string): Internal ID of the record
- `isEditMode` (boolean): Optional. Default false

### redirect.toSuitelet(options)
Redirects to another Suitelet deployment.

```javascript
redirect.toSuitelet({
  scriptId: 'customscript_my_suitelet',
  deploymentId: 'customdeploy1',
  isExternal: false,   // Optional; false = stay in NetSuite frame
  params: {
    action: 'confirm',
    orderId: 1234
  }
});
```

**Parameters:**
- `scriptId` (string): Required. Suitelet script ID
- `deploymentId` (string): Required. Deployment script ID
- `isExternal` (boolean): Optional. If true, redirects to the external-facing URL
- `params` (Object): Optional. Query string parameters passed to the Suitelet

### redirect.toURL(options)
Redirects to an arbitrary URL (NetSuite internal or external).

```javascript
// Internal NetSuite URL
redirect.toURL({ url: '/app/accounting/transactions/salesord.nl?id=1234' });

// External URL
redirect.toURL({ url: 'https://www.example.com/confirmation' });
```

**Parameters:**
- `url` (string): Required. Any valid URL (relative or absolute)

### redirect.toTaskLink(options)
Redirects to a standard NetSuite task link (list views, create forms, etc.).

```javascript
// Go to Sales Order list
redirect.toTaskLink({
  id: 'LIST_SALESORDER'
});

// Create a new Customer
redirect.toTaskLink({
  id: 'CREATE_CUSTOMER',
  params: {}
});
```

Common task link IDs:
- `'LIST_SALESORDER'` — Sales Order list
- `'LIST_PURCHASEORDER'` — Purchase Order list
- `'LIST_INVOICE'` — Invoice list
- `'LIST_CUSTOMER'` — Customer list
- `'CREATE_SALESORDER'` — New Sales Order form
- `'CREATE_CUSTOMER'` — New Customer form
- `'CREATE_JOURNALENTRY'` — New Journal Entry form

## Common Patterns

### Suitelet POST → redirect to created record
```javascript
function onRequest(context) {
  if (context.request.method === 'GET') {
    // Show the form
    var form = serverWidget.createForm({ title: 'Create Order' });
    form.addSubmitButton({ label: 'Create' });
    context.response.writePage({ pageObject: form });

  } else if (context.request.method === 'POST') {
    // Process the form submission
    var params = context.request.parameters;
    var newId = createOrder(params);  // Creates the order

    // Redirect to the newly created record
    redirect.toRecord({
      type: 'salesorder',
      id: newId,
      isEditMode: false
    });
  }
}
```

### Client Script redirect on button click
```javascript
function onApproveClick(context) {
  var rec = context.currentRecord;
  var recId = rec.id;

  // Validate before redirecting
  if (!rec.getValue({ fieldId: 'supervisor' })) {
    dialog.alert({ title: 'Validation Error', message: 'Supervisor is required.' });
    return;
  }

  // Redirect to the record in view mode after save
  redirect.toRecord({
    type: rec.type,
    id: recId
  });
}
```

### Suitelet: redirect based on action parameter
```javascript
function onRequest(context) {
  var action = context.request.parameters.action;
  var orderId = parseInt(context.request.parameters.orderId);

  if (action === 'view') {
    redirect.toRecord({ type: 'salesorder', id: orderId });
  } else if (action === 'list') {
    redirect.toTaskLink({ id: 'LIST_SALESORDER' });
  } else if (action === 'external') {
    redirect.toURL({ url: 'https://customer-portal.example.com/order/' + orderId });
  }
}
```

## Important Notes

1. **redirect stops execution** — After calling any redirect method, code execution ends for
   the current request. Any code after the redirect call will NOT execute.

2. **DO NOT use redirect in afterSubmit** — User Event afterSubmit runs server-side after the
   response is already sent. Use `beforeLoad` to modify the form or add buttons that trigger
   client-side redirects.

3. **redirect in Client Scripts** — Works by updating `window.location`. Avoid calling redirect
   inside async callbacks where the context may be stale.

4. **params encoding** — The `params` object values are automatically URL-encoded. You do not
   need to call `encodeURIComponent()` manually.

5. **toURL with external URLs** — When redirecting to external sites, ensure the URL uses HTTPS.
   NetSuite may block redirects to non-HTTPS external URLs in some configurations.
