---
source: Oracle NetSuite Official Documentation — Token-Based Authentication (TBA)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Token-Based Authentication (TBA)

## Overview

Token-Based Authentication (TBA) is NetSuite's implementation of OAuth 1.0a for
programmatic API access. It is the recommended authentication method for all
server-to-server integrations, RESTlets, and SuiteQL REST API calls.

TBA requires four credential pairs: Consumer Key/Secret (per integration) and
Token Key/Secret (per user-integration-role combination).

---

## Setup — Step-by-Step

### Step 1: Enable TBA Feature

Navigate to: Setup > Company > Enable Features > SuiteCloud tab

Check: **Token-Based Authentication** under the "SuiteCloud" section.

### Step 2: Create an Integration Record

Navigate to: Setup > Integration > Manage Integrations > New

Fill in:
- **Name:** e.g., "My Integration App"
- **State:** Enabled
- **Authentication tab:** Check "Token-Based Authentication" checkbox (OAuth 1.0)

After saving, NetSuite generates:
- **Consumer Key** (also called Client ID)
- **Consumer Secret** (also called Client Secret)

**Save these immediately** — the Consumer Secret is shown only once.

### Step 3: Create an Access Token

Navigate to: Setup > Security > Access Tokens > New

Fill in:
- **Application Name:** Select your integration (created in Step 2)
- **User:** Select the employee/user this token acts as
- **Role:** Select the role this token will use

After saving, NetSuite generates:
- **Token ID** (also called Token Key)
- **Token Secret**

**Save these immediately** — the Token Secret is shown only once.

---

## Required Credentials

| Credential       | Source                    | Description                                   |
|------------------|---------------------------|-----------------------------------------------|
| Account ID       | Company Settings          | NetSuite account ID (e.g., `1234567`)         |
| Consumer Key     | Integration record        | Identifies the integration application        |
| Consumer Secret  | Integration record        | Signs the integration's requests              |
| Token Key        | Access Token record       | Identifies the token (user+role+integration)  |
| Token Secret     | Access Token record       | Signs token-specific requests                 |

---

## Authorization Header Format

TBA uses OAuth 1.0a with HMAC-SHA256 signing.

```
Authorization: OAuth
  realm="{accountId}",
  oauth_consumer_key="{consumerKey}",
  oauth_token="{tokenKey}",
  oauth_signature_method="HMAC-SHA256",
  oauth_timestamp="{unixTimestamp}",
  oauth_nonce="{randomNonce}",
  oauth_version="1.0",
  oauth_signature="{signature}"
```

All values are URL-encoded. The header is a single line with `, ` separating parameters.

---

## Signature Calculation

The OAuth signature is computed as:

### Step 1: Build Parameter String

Collect and sort all OAuth parameters + query parameters (ASCII order):
```
oauth_consumer_key={consumerKey}&oauth_nonce={nonce}&oauth_signature_method=HMAC-SHA256&oauth_timestamp={ts}&oauth_token={tokenKey}&oauth_version=1.0
```

### Step 2: Build Signature Base String

```
{METHOD}&{URL-encoded base URL}&{URL-encoded parameter string}
```

Example:
```
POST&https%3A%2F%2F1234567.suiteql.api.netsuite.com%2Fquery%2Fv1%2Fsuiteql&oauth_consumer_key%3D...%26oauth_nonce%3D...
```

### Step 3: Compute HMAC-SHA256

Signing key: `{consumerSecret}&{tokenSecret}` (both URL-encoded, joined with `&`)

```python
import hmac, hashlib, base64
signing_key = f"{consumer_secret}&{token_secret}"
signature = base64.b64encode(
    hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha256).digest()
).decode()
```

---

## REST API Base URLs

| API                    | Base URL                                              |
|------------------------|-------------------------------------------------------|
| SuiteQL                | `https://{accountId}.suiteql.api.netsuite.com`        |
| Record API             | `https://{accountId}.suiteql.api.netsuite.com/record/v1/` |
| RESTlet                | `https://{accountId}.restlets.api.netsuite.com/app/site/hosting/restlet.nl` |
| SuiteAnalytics Connect | `{accountId}.connect.api.netsuite.com:1708`           |

---

## Using TBA in SuiteScript (N/https Module)

Within SuiteScript, TBA is handled automatically for RESTlet and SuiteQL calls
when using the built-in `N/https` module. For external HTTPS calls:

```javascript
define(['N/https', 'N/crypto', 'N/encode'], function(https, crypto, encode) {
    // Generate HMAC-SHA256 signature
    function sign(baseString, signingKey) {
        var key = crypto.createSecretKey({
            secret: encode.convert({
                string: signingKey,
                inputEncoding: encode.Encoding.UTF_8,
                outputEncoding: encode.Encoding.BASE_64
            }),
            encoding: encode.Encoding.BASE_64
        });
        var hmac = crypto.createHmac({
            algorithm: crypto.HashAlg.SHA256,
            key: key
        });
        hmac.update({ input: baseString });
        return hmac.digest({ outputEncoding: encode.Encoding.BASE_64 });
    }
});
```

---

## Python Integration Example

```python
import requests
import hmac
import hashlib
import base64
import time
import uuid
import urllib.parse

def build_tba_header(method, url, account_id, consumer_key, consumer_secret, token_key, token_secret):
    timestamp = str(int(time.time()))
    nonce = uuid.uuid4().hex

    params = {
        'oauth_consumer_key': consumer_key,
        'oauth_nonce': nonce,
        'oauth_signature_method': 'HMAC-SHA256',
        'oauth_timestamp': timestamp,
        'oauth_token': token_key,
        'oauth_version': '1.0'
    }

    sorted_params = '&'.join(f"{urllib.parse.quote(k)}={urllib.parse.quote(v)}"
                             for k, v in sorted(params.items()))
    base_string = f"{method}&{urllib.parse.quote(url, safe='')}&{urllib.parse.quote(sorted_params, safe='')}"
    signing_key = f"{urllib.parse.quote(consumer_secret)}&{urllib.parse.quote(token_secret)}"
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha256).digest()
    ).decode()

    params['oauth_signature'] = signature
    header_params = ', '.join(f'{k}="{urllib.parse.quote(v)}"' for k, v in params.items())
    return f'OAuth realm="{account_id}", {header_params}'

# Usage
url = f'https://{ACCOUNT_ID}.suiteql.api.netsuite.com/query/v1/suiteql'
auth_header = build_tba_header('POST', url, ACCOUNT_ID, CONSUMER_KEY, CONSUMER_SECRET, TOKEN_KEY, TOKEN_SECRET)
response = requests.post(url, headers={'Authorization': auth_header, 'Content-Type': 'application/json'},
                         json={'q': 'SELECT id, tranId FROM transaction WHERE type=\'SalesOrd\' LIMIT 5'})
```

---

## Security Best Practices

- **Never commit credentials** to version control
- Store in environment variables or secrets manager
- Create tokens with **least-privilege roles** (read-only for reporting integrations)
- Rotate tokens periodically (revoke old tokens via Setup > Security > Access Tokens)
- One integration per consuming application — do not share integration records
- For ArthaBuild: credentials live in `session_store.py` in RAM only — NEVER in SQLite or files
