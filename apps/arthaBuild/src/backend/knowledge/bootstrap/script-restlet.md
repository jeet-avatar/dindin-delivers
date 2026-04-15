---
source: SuiteScript 2.x API Reference — RESTlet Script
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# RESTlet Script

RESTlets expose custom REST API endpoints from NetSuite. They accept HTTP requests from
external systems and return JSON responses. Each HTTP method (GET, POST, PUT, DELETE) is
a separate named export function. Required for building NetSuite integrations.

## Script Header (Required JSDoc)

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType RESTlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/error', 'N/log'], function(record, search, error, log) {

  function get(requestParams) { ... }
  function post(requestBody) { ... }
  function put(requestBody) { ... }
  function doDelete(requestParams) { ... }

  return {
    get: get,
    post: post,
    put: put,
    'delete': doDelete
  };
});
```

## Entry Points

Each HTTP method maps to a named export. The `context` parameter is:
- **GET / DELETE**: Query string parameters object (already parsed, URL-decoded)
- **POST / PUT**: Request body (auto-parsed from JSON if `Content-Type: application/json`)

Return values are auto-serialized to JSON in the response.

### get(requestParams)
Handles GET requests. `requestParams` is an object of URL query parameters.

```javascript
function get(requestParams) {
  var id = requestParams.id;

  if (!id) {
    throw error.create({ name: 'MISSING_PARAM', message: 'id parameter is required', notifyOff: true });
  }

  try {
    var rec = record.load({
      type: record.Type.SALES_ORDER,
      id: parseInt(id)
    });

    return {
      id: rec.id,
      tranId: rec.getValue({ fieldId: 'tranId' }),
      entity: rec.getValue({ fieldId: 'entity' }),
      amount: rec.getValue({ fieldId: 'amount' }),
      status: rec.getText({ fieldId: 'status' })
    };
  } catch (e) {
    if (e.name === 'RCRD_DOES_NOT_EXIST') {
      throw error.create({ name: 'NOT_FOUND', message: 'Order ' + id + ' not found', notifyOff: true });
    }
    throw e;
  }
}
```

### post(requestBody)
Handles POST requests. `requestBody` is the parsed JSON body object.

```javascript
function post(requestBody) {
  // Validate input
  if (!requestBody.entity) {
    throw error.create({ name: 'INVALID_INPUT', message: 'entity is required', notifyOff: true });
  }

  try {
    var rec = record.create({ type: record.Type.SALES_ORDER, isDynamic: true });
    rec.setValue({ fieldId: 'entity', value: requestBody.entity });
    rec.setValue({ fieldId: 'tranDate', value: requestBody.tranDate ? new Date(requestBody.tranDate) : new Date() });

    if (requestBody.items && Array.isArray(requestBody.items)) {
      requestBody.items.forEach(function(item) {
        rec.selectNewLine({ sublistId: 'item' });
        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.itemId });
        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.quantity });
        rec.commitLine({ sublistId: 'item' });
      });
    }

    var newId = rec.save();
    log.audit({ title: 'Order created', details: 'ID: ' + newId });

    return { success: true, id: newId, message: 'Sales Order created' };
  } catch (e) {
    log.error({ title: 'Create failed', details: e.message + '\n' + e.stack });
    throw error.create({ name: 'CREATE_FAILED', message: e.message, notifyOff: false });
  }
}
```

### put(requestBody)
Handles PUT requests. `requestBody` contains the update payload.

```javascript
function put(requestBody) {
  if (!requestBody.id) {
    throw error.create({ name: 'MISSING_ID', message: 'id is required for update', notifyOff: true });
  }

  var updateValues = {};
  if (requestBody.memo !== undefined) updateValues.memo = requestBody.memo;
  if (requestBody.otherRefNum !== undefined) updateValues.otherRefNum = requestBody.otherRefNum;

  record.submitFields({
    type: record.Type.SALES_ORDER,
    id: parseInt(requestBody.id),
    values: updateValues
  });

  return { success: true, id: requestBody.id, message: 'Updated' };
}
```

### delete (doDelete)
Handles DELETE requests. `requestParams` contains URL parameters.

```javascript
function doDelete(requestParams) {
  if (!requestParams.id) {
    throw error.create({ name: 'MISSING_ID', message: 'id is required', notifyOff: true });
  }

  record.delete({ type: record.Type.SALES_ORDER, id: parseInt(requestParams.id) });
  log.audit({ title: 'Order deleted', details: 'ID: ' + requestParams.id });

  return { success: true, message: 'Deleted' };
}
```

## Authentication

RESTlet calls REQUIRE authentication on every request:

### Token-Based Authentication (TBA / OAuth 1.0) — Recommended

```
Authorization: OAuth realm="ACCOUNT_ID",
  oauth_consumer_key="CONSUMER_KEY",
  oauth_token="TOKEN",
  oauth_signature_method="HMAC-SHA256",
  oauth_timestamp="1234567890",
  oauth_nonce="randomstring",
  oauth_version="1.0",
  oauth_signature="BASE64SIGNATURE"
```

### NLAuth (Legacy — User Credentials)

```
Authorization: NLAuth nlauth_account=ACCOUNT_ID,nlauth_email=USER_EMAIL,nlauth_signature=PASSWORD,nlauth_role=ROLE_ID
```

## External URL Format

```
https://{accountId}.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script={scriptId}&deploy={deploymentId}
```

Example:
```
GET https://12345678.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=customscript_order_api&deploy=customdeploy1&id=1234
```

## Error Handling Convention

Return structured error objects — do NOT let raw exceptions propagate:

```javascript
try {
  return processRequest(requestBody);
} catch (e) {
  log.error({ title: 'RESTlet Error', details: e.name + ': ' + e.message });
  // Return error with appropriate status context
  throw error.create({
    name: e.name || 'INTERNAL_ERROR',
    message: e.message,
    notifyOff: (e.name === 'USER_ERROR' || e.name === 'NOT_FOUND')
  });
}
```

## Governance

- **1,000 units per invocation**
- Timeout: 60 seconds per request

## Deployment Settings

| Setting | Value |
|---------|-------|
| Script Type | RESTlet |
| Status | Released |
| Log Level | DEBUG (dev) / AUDIT (prod) |
| Execute as Role | The role defines data access permissions |

## Notes

- RESTlets support CORS headers — set `Access-Control-Allow-Origin` in response headers for
  browser-based clients
- For batch operations, use the `post` entry point with an array in the request body
- RESTlets do NOT support file upload (use multipart forms via Suitelets instead)
- All successful responses are HTTP 200 — NetSuite RESTlets do not support custom HTTP status codes
- Errors thrown propagate as HTTP 500 with error name and message in the response body
