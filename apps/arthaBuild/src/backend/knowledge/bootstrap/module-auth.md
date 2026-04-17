---
source: SuiteScript 2.x API Reference — N/auth Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/auth Module

The N/auth module provides OAuth 2.0 authentication utilities for NetSuite integrations.
Use it to exchange authorization codes for access tokens in server-side OAuth 2.0 flows.
Available in server-side scripts.

## Loading the Module

```javascript
define(['N/auth'], function(auth) { ... });
```

## OAuth 2.0 Token Exchange

### auth.exchangeAuthCodeForToken(options)
Exchanges an OAuth 2.0 authorization code for an access token (Authorization Code flow).

```javascript
var tokenResponse = auth.exchangeAuthCodeForToken({
  credentials: {
    clientId: '{{customsecret_oauth_client_id}}',
    clientSecret: '{{customsecret_oauth_client_secret}}'
  },
  code: authorizationCode,       // The code from the OAuth redirect
  redirectUri: 'https://myapp.netsuite.com/callback'
});

var accessToken = tokenResponse.accessToken;
var refreshToken = tokenResponse.refreshToken;
var expiresIn = tokenResponse.expiresIn; // seconds
```

**Parameters:**
- `credentials` (Object): Required. OAuth client credentials
  - `clientId`: Client ID from the OAuth app registration
  - `clientSecret`: Client secret (use credential placeholder)
- `code` (string): Required. The authorization code from the OAuth redirect
- `redirectUri` (string): Required. Must match the URI registered with the OAuth provider

**Returns:** Object with:
- `accessToken` (string): The access token for API calls
- `refreshToken` (string): Token for obtaining new access tokens
- `expiresIn` (number): Token lifetime in seconds
- `tokenType` (string): Token type (usually 'Bearer')

## NetSuite OAuth 2.0 Scopes

When configuring OAuth 2.0 integration records in NetSuite, the following scopes are
available for access control:

```
rest_webservices      — Access to REST API endpoints (/services/rest/)
suite_analytics       — SuiteAnalytics Workbook and query access
accounting            — Accounting data access
purchases             — Purchase order and vendor bill access
sales                 — Sales order and customer data access
```

## TBA Authentication (NetSuite-Specific)

For token-based authentication (TBA) — NetSuite's own OAuth 1.0-based system — see N/https
with manually constructed OAuth 1.0 Authorization headers. TBA credentials are:

```
Account ID + Consumer Key + Consumer Secret + Token Key + Token Secret
```

TBA header format:
```
Authorization: OAuth realm="ACCOUNT_ID",
  oauth_consumer_key="CONSUMER_KEY",
  oauth_token="TOKEN_KEY",
  oauth_signature_method="HMAC-SHA256",
  oauth_timestamp="TIMESTAMP",
  oauth_nonce="NONCE",
  oauth_version="1.0",
  oauth_signature="SIGNATURE"
```

## Common OAuth 2.0 Integration Pattern

### Suitelet as OAuth Callback Handler
```javascript
define(['N/auth', 'N/record', 'N/redirect', 'N/url'], function(auth, record, redirect, url) {

  function onRequest(context) {
    if (context.request.method === 'GET') {
      var action = context.request.parameters.action;

      if (action === 'callback') {
        // Handle the OAuth callback
        var code = context.request.parameters.code;
        var state = context.request.parameters.state;
        var error = context.request.parameters.error;

        if (error) {
          log.error({ title: 'OAuth Error', details: error + ': ' + context.request.parameters.error_description });
          context.response.write({ output: '<html><body>Authorization failed: ' + error + '</body></html>' });
          return;
        }

        try {
          var tokenResponse = auth.exchangeAuthCodeForToken({
            credentials: {
              clientId: '{{customsecret_oauth_client_id}}',
              clientSecret: '{{customsecret_oauth_client_secret}}'
            },
            code: code,
            redirectUri: url.resolveScript({
              scriptId: 'customscript_oauth_handler',
              deploymentId: 'customdeploy1',
              returnExternalUrl: true,
              params: { action: 'callback' }
            })
          });

          // Store tokens securely in a custom record
          record.create({
            type: 'customrecord_oauth_token',
            isDynamic: true
          });
          // ... set fields, save ...

          log.audit({ title: 'OAuth Complete', details: 'Token obtained, expires in ' + tokenResponse.expiresIn + 's' });
          context.response.write({ output: '<html><body>Authorization successful! You may close this window.</body></html>' });

        } catch (e) {
          log.error({ title: 'Token exchange failed', details: e.message });
          context.response.write({ output: '<html><body>Authorization failed.</body></html>' });
        }

      } else {
        // Show authorize button
        var authUrl = buildOAuthAuthorizationUrl();
        context.response.write({
          output: '<html><body><a href="' + authUrl + '">Authorize</a></body></html>'
        });
      }
    }
  }

  function buildOAuthAuthorizationUrl() {
    var params = {
      client_id: 'YOUR_CLIENT_ID',
      redirect_uri: encodeURIComponent('YOUR_CALLBACK_URL'),
      response_type: 'code',
      scope: encodeURIComponent('rest_webservices accounting'),
      state: Date.now().toString()
    };
    return 'https://oauth.provider.com/authorize?' +
      Object.keys(params).map(function(k) { return k + '=' + params[k]; }).join('&');
  }

  return { onRequest: onRequest };
});
```

## Notes

- `auth.exchangeAuthCodeForToken()` is for **external** OAuth 2.0 providers (Google, Salesforce,
  QuickBooks, etc.) — it's NOT for NetSuite's own TBA system
- NetSuite TBA (Token-Based Authentication) uses OAuth 1.0 — build the Authorization header
  manually using N/crypto for HMAC-SHA256 signing
- Store received OAuth tokens in encrypted custom record fields — never in plain text
- Access tokens expire — implement refresh token logic using the stored refreshToken
- The `credentials.clientId` and `credentials.clientSecret` should always use NetSuite
  credential placeholder syntax (`{{customsecret_...}}`) — never hardcode
