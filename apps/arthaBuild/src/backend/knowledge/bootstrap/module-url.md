---
source: SuiteScript 2.x API Reference — N/url Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/url Module

The N/url module generates URLs to NetSuite records, Suitelets, task links, and other
NetSuite pages. Available in both server-side and client-side scripts.

## Loading the Module

```javascript
define(['N/url'], function(url) { ... });
```

## Core Methods

### url.resolveScript(options)
Generates a URL for a Suitelet or RESTlet deployment.

```javascript
// Relative URL (for internal use, e.g., in iframes or UI links)
var relativeUrl = url.resolveScript({
  scriptId: 'customscript_my_suitelet',
  deploymentId: 'customdeploy_my_suitelet',
  returnExternalUrl: false  // default false = relative URL
});
// Returns: '/app/site/hosting/scriptlet.nl?script=XXX&deploy=XXX'

// External/absolute URL (for emails, webhooks, external links)
var externalUrl = url.resolveScript({
  scriptId: 'customscript_my_suitelet',
  deploymentId: 'customdeploy_my_suitelet',
  returnExternalUrl: true,
  params: {
    orderId: 1234,
    action: 'view'
  }
});
// Returns: 'https://{accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=XXX&deploy=XXX&orderId=1234&action=view'
```

**Parameters:**
- `scriptId` (string): Required. Script script ID (not internal ID)
- `deploymentId` (string): Required. Deployment script ID
- `returnExternalUrl` (boolean): Optional. Default false. If true, returns full absolute URL
- `params` (Object): Optional. Additional query string parameters

**Returns:** string URL

### url.resolveRecord(options)
Generates a URL for viewing or editing a specific NetSuite record.

```javascript
// View mode URL
var viewUrl = url.resolveRecord({
  recordType: 'salesorder',
  recordId: 1234,
  isEditMode: false   // false = view mode (default)
});

// Edit mode URL
var editUrl = url.resolveRecord({
  recordType: record.Type.CUSTOMER,
  recordId: 500,
  isEditMode: true
});

// Returns: '/app/accounting/transactions/salesord.nl?id=1234'
// or      '/app/common/entity/custjob.nl?id=500&e=T'
```

**Parameters:**
- `recordType` (string): Required. Record type internal ID (e.g., 'salesorder', 'customer')
- `recordId` (number|string): Required. Internal ID of the record
- `isEditMode` (boolean): Optional. Default false

**Returns:** string (relative URL)

### url.resolveTaskLink(options)
Generates a URL for standard NetSuite task links (navigation shortcuts).

```javascript
var taskUrl = url.resolveTaskLink({
  id: 'LIST_SALESORDER',   // Task ID from NetSuite task link system
  params: {
    searchtype: 'B'         // Optional additional parameters
  }
});
```

Common task link IDs:
- `'LIST_SALESORDER'` — Sales Order list
- `'LIST_PURCHASEORDER'` — Purchase Order list
- `'LIST_CUSTOMER'` — Customer list
- `'CREATE_SALESORDER'` — New Sales Order form
- `'CREATE_CUSTOMER'` — New Customer form

**Returns:** string (relative URL)

## Return Values

- `returnExternalUrl: false` → Returns relative URL starting with `/app/...`
- `returnExternalUrl: true` → Returns absolute URL with full domain

## Usage in Different Script Types

### In Suitelet (write links in HTML response)
```javascript
function onRequest(context) {
  var editLink = url.resolveRecord({
    recordType: 'salesorder',
    recordId: orderId,
    isEditMode: true
  });
  context.response.write({
    output: '<a href="' + editLink + '">Edit Order</a>'
  });
}
```

### In User Event afterSubmit (include URL in email)
```javascript
function afterSubmit(context) {
  var recId = context.newRecord.id;
  var recordUrl = url.resolveRecord({
    recordType: 'salesorder',
    recordId: recId,
    isEditMode: false
  });
  // Use full URL in email
  var fullUrl = 'https://' + runtime.accountId + '.app.netsuite.com' + recordUrl;
  email.send({ ..., body: 'View your order: ' + fullUrl });
}
```

### In Client Script (navigate on button click)
```javascript
function onButtonClick() {
  var suiteletUrl = url.resolveScript({
    scriptId: 'customscript_my_suitelet',
    deploymentId: 'customdeploy1',
    params: { action: 'export' }
  });
  window.open(suiteletUrl, '_blank');
}
```

## Notes

- `url.resolveScript` is the correct method for Suitelet and RESTlet URLs
- For RESTlet external URLs, use the pattern:
  `https://{accountId}.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=X&deploy=Y`
- The `params` object values are URL-encoded automatically
- `returnExternalUrl: true` requires the script to be deployed as "Available Without Login"
  for the URL to be accessible without a NetSuite session
