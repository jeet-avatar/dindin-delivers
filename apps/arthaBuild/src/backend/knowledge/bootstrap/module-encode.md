---
source: SuiteScript 2.x API Reference — N/encode Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/encode Module

The N/encode module converts strings between different encodings: Base64, hexadecimal,
and UTF-8. Essential for working with binary data, API payloads, and cryptographic
operations. Available in all script types.

## Loading the Module

```javascript
define(['N/encode'], function(encode) { ... });
```

## Core Method

### encode.convert(options)
Converts a string from one encoding to another.

```javascript
var result = encode.convert({
  string: inputString,
  inputEncoding: encode.Encoding.UTF_8,     // Source encoding
  outputEncoding: encode.Encoding.BASE_64   // Target encoding
});
```

**Parameters:**
- `string` (string): Required. The string to convert
- `inputEncoding` (encode.Encoding): Required. Encoding of the input string
- `outputEncoding` (encode.Encoding): Required. Desired output encoding

**Returns:** string in the target encoding

## encode.Encoding Constants

```javascript
encode.Encoding.UTF_8           // Standard UTF-8 text encoding
encode.Encoding.BASE_64         // Standard Base64 encoding
encode.Encoding.BASE_64_URL_SAFE // URL-safe Base64 (replaces +/ with -_)
encode.Encoding.HEX             // Hexadecimal encoding
```

## Common Conversions

### UTF-8 to Base64
```javascript
var textToEncode = 'Hello, NetSuite!';
var base64 = encode.convert({
  string: textToEncode,
  inputEncoding: encode.Encoding.UTF_8,
  outputEncoding: encode.Encoding.BASE_64
});
// Returns: 'SGVsbG8sIE5ldFN1aXRlIQ=='
```

### Base64 to UTF-8
```javascript
var base64String = 'SGVsbG8sIE5ldFN1aXRlIQ==';
var decoded = encode.convert({
  string: base64String,
  inputEncoding: encode.Encoding.BASE_64,
  outputEncoding: encode.Encoding.UTF_8
});
// Returns: 'Hello, NetSuite!'
```

### UTF-8 to Hex
```javascript
var hexEncoded = encode.convert({
  string: 'abc',
  inputEncoding: encode.Encoding.UTF_8,
  outputEncoding: encode.Encoding.HEX
});
// Returns: '616263'
```

### Hex to UTF-8
```javascript
var hexString = '48656c6c6f';
var utf8String = encode.convert({
  string: hexString,
  inputEncoding: encode.Encoding.HEX,
  outputEncoding: encode.Encoding.UTF_8
});
// Returns: 'Hello'
```

### Base64 to Hex (via intermediary)
```javascript
// NetSuite doesn't support direct Base64 → Hex
// Convert Base64 → UTF-8 → Hex
var utf8 = encode.convert({
  string: base64Input,
  inputEncoding: encode.Encoding.BASE_64,
  outputEncoding: encode.Encoding.UTF_8
});
var hex = encode.convert({
  string: utf8,
  inputEncoding: encode.Encoding.UTF_8,
  outputEncoding: encode.Encoding.HEX
});
```

## Governance

All encode operations = **0 governance units**

## Common Patterns

### Encode API credentials for Basic Auth
```javascript
require(['N/encode', 'N/https'], function(encode, https) {

  var username = 'apiuser@company.com';
  var password = 'mypassword'; // In practice, use crypto.createSecretKey

  var credentials = username + ':' + password;
  var encoded = encode.convert({
    string: credentials,
    inputEncoding: encode.Encoding.UTF_8,
    outputEncoding: encode.Encoding.BASE_64
  });

  var response = https.get({
    url: 'https://api.example.com/endpoint',
    headers: {
      'Authorization': 'Basic ' + encoded,
      'Content-Type': 'application/json'
    }
  });
});
```

### Encode binary file contents for transfer
```javascript
require(['N/encode', 'N/file'], function(encode, file) {

  // Load a file and encode contents to Base64 for embedding in JSON payload
  var pdfFile = file.load({ id: '/SuiteScripts/reports/invoice.pdf' });
  var pdfContents = pdfFile.getContents(); // Binary contents as string

  var base64Content = encode.convert({
    string: pdfContents,
    inputEncoding: encode.Encoding.UTF_8,
    outputEncoding: encode.Encoding.BASE_64
  });

  var payload = JSON.stringify({
    filename: 'invoice.pdf',
    content: base64Content,
    contentType: 'application/pdf'
  });

  // Send to external API
});
```

### URL-safe Base64 for token generation
```javascript
require(['N/encode'], function(encode) {

  // Generate a URL-safe token from a random string
  var token = encode.convert({
    string: 'user:' + userId + ':' + Date.now(),
    inputEncoding: encode.Encoding.UTF_8,
    outputEncoding: encode.Encoding.BASE_64_URL_SAFE
  });
  // Safe to use in URLs without additional encoding
});
```

### Decode webhook payload
```javascript
require(['N/encode'], function(encode) {

  // Some webhooks send Base64-encoded body
  function decodeWebhookPayload(base64Body) {
    return encode.convert({
      string: base64Body,
      inputEncoding: encode.Encoding.BASE_64,
      outputEncoding: encode.Encoding.UTF_8
    });
  }

  var rawPayload = decodeWebhookPayload(context.body);
  var payloadObj = JSON.parse(rawPayload);
});
```

## Notes

- `encode.convert()` is a pure string transformation — it does NOT validate that the input
  is valid for the specified inputEncoding
- URL-safe Base64 uses `-` and `_` instead of `+` and `/` — use this when Base64 values
  appear in URLs or JWT tokens
- For cryptographic operations (HMAC, hash), the N/crypto module accepts `encode.Encoding`
  constants directly — use encode.convert when you need to manipulate the encoded strings
  programmatically
- Standard Base64 may include `+`, `/`, and `=` padding characters which must be URL-encoded
  if used in query strings — prefer `BASE_64_URL_SAFE` for URL contexts
