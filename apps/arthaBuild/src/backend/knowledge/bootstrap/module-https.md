---
source: SuiteScript 2.x API Reference — N/https Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/https Module

The N/https module enables outbound HTTP/HTTPS requests from NetSuite to external services.
Available in **server-side scripts only** — NOT available in client scripts.

## Loading the Module

```javascript
define(['N/https'], function(https) { ... });
```

## Core Methods

### https.get(options)
Performs a GET request.

```javascript
var response = https.get({
  url: 'https://api.example.com/data',
  headers: {
    'Authorization': 'Bearer ' + apiToken,
    'Accept': 'application/json',
    'X-Custom-Header': 'value'
  }
});

log.debug({ title: 'HTTP Status', details: response.code });
log.debug({ title: 'Response Body', details: response.body });
```

### https.post(options)
Performs a POST request.

```javascript
var payload = JSON.stringify({
  name: 'New Customer',
  email: 'customer@example.com'
});

var response = https.post({
  url: 'https://api.example.com/customers',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + apiToken
  },
  body: payload
});

if (response.code === 201) {
  var created = JSON.parse(response.body);
  log.audit({ title: 'Customer created', details: created.id });
}
```

### https.put(options)
Performs a PUT request.

```javascript
var response = https.put({
  url: 'https://api.example.com/customers/' + customerId,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + apiToken
  },
  body: JSON.stringify({ email: 'updated@example.com' })
});
```

### https.delete(options)
Performs a DELETE request.

```javascript
var response = https.delete({
  url: 'https://api.example.com/customers/' + customerId,
  headers: {
    'Authorization': 'Bearer ' + apiToken
  }
});
```

### https.request(options)
Generic method supporting any HTTP method.

```javascript
var response = https.request({
  method: https.Method.PATCH,
  url: 'https://api.example.com/orders/' + orderId,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'shipped' })
});
```

## https.Method Constants

```javascript
https.Method.GET
https.Method.POST
https.Method.PUT
https.Method.DELETE
https.Method.PATCH
https.Method.HEAD
```

## ClientResponse Object

All HTTPS methods return a `ClientResponse` object:

```javascript
response.code     // HTTP status code (number): 200, 201, 400, 404, 500, etc.
response.body     // Response body as string
response.headers  // Response headers object (key: value pairs)
```

**Checking status:**
```javascript
if (response.code >= 200 && response.code < 300) {
  // Success
  var data = JSON.parse(response.body);
} else if (response.code === 401) {
  log.error({ title: 'Auth failed', details: response.body });
} else if (response.code === 429) {
  log.error({ title: 'Rate limited', details: 'Retry after: ' + response.headers['Retry-After'] });
} else {
  log.error({ title: 'HTTP Error ' + response.code, details: response.body });
}
```

## Secure Credentials — https.createSecureString

For storing and using credentials securely (never in plain text in code):

```javascript
// Store credential value using a GUID from Setup > Integration > OAuth Credentials
var secureToken = https.createSecureString({ input: '{{customsecret_my_api_key}}' });

// Use in headers (value is masked in logs)
https.post({
  url: 'https://api.example.com/endpoint',
  headers: { 'Authorization': 'Bearer ' + secureToken.toString() }
});
```

## Governance

| Operation | Governance Units |
|-----------|-----------------|
| Any HTTPS call | 10 units per call |

**Note:** This is one of the most expensive governance operations. Minimize HTTPS calls
in loops. Batch requests where possible.

## Error Handling

```javascript
try {
  var response = https.get({ url: 'https://api.example.com/data', headers: {} });
  if (response.code !== 200) {
    throw error.create({
      name: 'EXTERNAL_API_ERROR',
      message: 'API returned ' + response.code + ': ' + response.body
    });
  }
  return JSON.parse(response.body);
} catch (e) {
  if (e.name === 'SSS_REQUEST_LIMIT_EXCEEDED') {
    log.error({ title: 'Governance exceeded', details: e.message });
  } else if (e.name === 'CONNECTION_TIMEOUT') {
    log.error({ title: 'Timeout', details: 'External API did not respond' });
  } else {
    log.error({ title: 'HTTPS Error', details: e.message + '\n' + e.stack });
  }
  throw e;
}
```

Common HTTPS-related errors:
- `CONNECTION_TIMEOUT` — Request timed out (default timeout: 30 seconds)
- `SSS_REQUEST_LIMIT_EXCEEDED` — Governance units exhausted
- `HTTPS_CALL_FAILED` — Network-level failure (DNS, TCP)
- `UNEXPECTED_ERROR` — Generic HTTPS failure

## SSL / TLS

- NetSuite HTTPS module respects the system trust store
- Modern TLS (1.2+) is required; TLS 1.0/1.1 endpoints may fail
- Self-signed certificates require the cert to be added to Setup > Integration > TLS/SSL Certificates

## Common Integration Patterns

### REST API integration with error handling
```javascript
function callExternalApi(endpoint, method, payload) {
  var BASE_URL = 'https://api.thirdparty.com/v1';
  var API_KEY = '{{customsecret_thirdparty_api_key}}';

  var options = {
    url: BASE_URL + endpoint,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    }
  };
  if (payload) options.body = JSON.stringify(payload);

  var response;
  if (method === 'GET') response = https.get(options);
  else if (method === 'POST') response = https.post(options);
  else if (method === 'PUT') response = https.put(options);

  if (response.code < 200 || response.code >= 300) {
    throw error.create({
      name: 'API_ERROR',
      message: 'Status ' + response.code + ': ' + response.body
    });
  }
  return response.body ? JSON.parse(response.body) : null;
}
```

### Webhook delivery
```javascript
function sendWebhook(webhookUrl, eventType, payload) {
  var body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload
  });

  var response = https.post({
    url: webhookUrl,
    headers: {
      'Content-Type': 'application/json',
      'X-Event-Type': eventType
    },
    body: body
  });

  log.audit({
    title: 'Webhook sent',
    details: 'URL: ' + webhookUrl + ' | Status: ' + response.code
  });
  return response.code >= 200 && response.code < 300;
}
```

## Restrictions

- Available in: Scheduled Script, User Event, Suitelet, RESTlet, Map/Reduce, Portlet
- NOT available in: Client Script, Workflow Actions
- Timeout: 30 seconds per request
- Response body size limit: 10 MB
