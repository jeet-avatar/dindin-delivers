---
source: SuiteScript 2.x API Reference — N/crypto Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/crypto Module

The N/crypto module provides cryptographic operations including HMAC signing, hash generation,
and secure key management. Use it to sign webhook payloads, implement OAuth signatures,
and generate message authentication codes. Available in server-side scripts.

## Loading the Module

```javascript
define(['N/crypto'], function(crypto) { ... });
```

## Secret Keys

Before performing cryptographic operations, create a SecretKey from a credential stored
in NetSuite's credential store (Setup > Integration > OAuth Credentials).

### crypto.createSecretKey(options)
Creates a SecretKey object from a stored credential GUID.

```javascript
var secretKey = crypto.createSecretKey({
  guid: '{{customsecret_webhook_signing_key}}',  // GUID of stored credential
  encoding: encode.Encoding.UTF_8                 // Key encoding
});
```

**Parameters:**
- `guid` (string): Required. The GUID placeholder for the credential (uses `{{...}}` syntax)
- `encoding` (string): Optional. The encoding of the key — use `encode.Encoding` constants

## HMAC Operations

HMAC (Hash-based Message Authentication Code) is used for webhook signature verification
and OAuth request signing.

### crypto.createHmac(options)
Creates an HMAC generator.

```javascript
require(['N/crypto', 'N/encode'], function(crypto, encode) {

  var secretKey = crypto.createSecretKey({
    guid: '{{customsecret_api_signing_key}}',
    encoding: encode.Encoding.UTF_8
  });

  var hmac = crypto.createHmac({
    algorithm: crypto.HashAlg.SHA256,  // HMAC algorithm
    key: secretKey
  });

  // Feed data into the HMAC
  hmac.update({ input: 'data to sign', inputEncoding: encode.Encoding.UTF_8 });

  // Get the final digest
  var signature = hmac.digest({ outputEncoding: encode.Encoding.BASE_64 });
  // Returns: base64-encoded HMAC-SHA256 signature string
});
```

### Chained update (multiple data chunks)
```javascript
var hmac = crypto.createHmac({ algorithm: crypto.HashAlg.SHA256, key: secretKey });
hmac.update({ input: timestampStr });
hmac.update({ input: '\n' });
hmac.update({ input: payloadBody });
var sig = hmac.digest({ outputEncoding: encode.Encoding.HEX });
```

## Hash Algorithms (crypto.HashAlg)

```javascript
crypto.HashAlg.SHA1     // SHA-1 (deprecated for new use; legacy only)
crypto.HashAlg.SHA256   // SHA-256 (recommended)
crypto.HashAlg.SHA512   // SHA-512
crypto.HashAlg.MD5      // MD5 (legacy; not for security-sensitive use)
```

## Hash Generation (no key)

For generating non-keyed hashes:

```javascript
var hashObj = crypto.createHash({ algorithm: crypto.HashAlg.SHA256 });
hashObj.update({ input: 'data to hash', inputEncoding: encode.Encoding.UTF_8 });
var hexHash = hashObj.digest({ outputEncoding: encode.Encoding.HEX });
// Returns: hex string of SHA-256 hash
```

## Common Patterns

### Verify incoming webhook signature
```javascript
require(['N/crypto', 'N/encode'], function(crypto, encode) {

  function verifyWebhookSignature(requestBody, receivedSignature, signingKeyGuid) {
    var secretKey = crypto.createSecretKey({
      guid: signingKeyGuid,
      encoding: encode.Encoding.UTF_8
    });

    var hmac = crypto.createHmac({
      algorithm: crypto.HashAlg.SHA256,
      key: secretKey
    });
    hmac.update({ input: requestBody, inputEncoding: encode.Encoding.UTF_8 });
    var expectedSig = hmac.digest({ outputEncoding: encode.Encoding.BASE_64 });

    return expectedSig === receivedSignature;
  }

  // In a RESTlet:
  function post(context) {
    var body = JSON.stringify(context);
    var signature = context.headers['X-Signature'];

    if (!verifyWebhookSignature(body, signature, '{{customsecret_webhook_key}}')) {
      throw error.create({ name: 'INVALID_SIGNATURE', message: 'Webhook signature mismatch' });
    }
    // Process the webhook...
  }
});
```

### OAuth 1.0 HMAC-SHA1 signature (for external APIs)
```javascript
require(['N/crypto', 'N/encode'], function(crypto, encode) {

  function signOAuthRequest(method, url, params, consumerSecretGuid, tokenSecretGuid) {
    // Build parameter string
    var sortedParams = Object.keys(params).sort().map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');

    var signatureBase = method.toUpperCase() + '&' +
                        encodeURIComponent(url) + '&' +
                        encodeURIComponent(sortedParams);

    // Signing key = consumerSecret&tokenSecret
    // Note: for composite keys, use a pre-combined secret stored as one credential
    var consumerKey = crypto.createSecretKey({
      guid: consumerSecretGuid,
      encoding: encode.Encoding.UTF_8
    });

    var hmac = crypto.createHmac({ algorithm: crypto.HashAlg.SHA1, key: consumerKey });
    hmac.update({ input: signatureBase });
    return hmac.digest({ outputEncoding: encode.Encoding.BASE_64 });
  }
});
```

### Generate record fingerprint for audit
```javascript
require(['N/crypto', 'N/encode'], function(crypto, encode) {

  function generateRecordHash(recData) {
    var hashStr = JSON.stringify(recData);
    var hash = crypto.createHash({ algorithm: crypto.HashAlg.SHA256 });
    hash.update({ input: hashStr, inputEncoding: encode.Encoding.UTF_8 });
    return hash.digest({ outputEncoding: encode.Encoding.HEX });
  }

  var orderData = {
    id: rec.id,
    amount: rec.getValue({ fieldId: 'amount' }),
    entity: rec.getValue({ fieldId: 'entity' }),
    tranDate: rec.getValue({ fieldId: 'tranDate' }).toISOString()
  };

  var fingerprint = generateRecordHash(orderData);
  log.audit({ title: 'Order fingerprint', details: fingerprint });
});
```

## Governance

| Operation | Governance Units |
|-----------|-----------------|
| `crypto.createSecretKey()` | 0 units |
| `crypto.createHmac()` | 0 units |
| `hmac.update()` | 0 units |
| `hmac.digest()` | 0 units |
| `crypto.createHash()` | 0 units |

## Notes

- The `guid` parameter uses NetSuite's `{{...}}` credential placeholder syntax — never
  hardcode secret values directly in script code
- Credentials are set up in Setup > Integration > OAuth Credentials in the NetSuite UI
- `hmac.update()` can be called multiple times to feed data in chunks
- Once `hmac.digest()` is called, the HMAC object cannot be reused — create a new one
- For comparing signatures, use constant-time comparison to prevent timing attacks:
  convert both to hex before comparing character by character
