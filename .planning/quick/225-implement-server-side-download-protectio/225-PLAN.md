---
phase: quick-225
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /tmp/verify-payment/verify_payment.py
  - /Users/jeet/Downloads/offerletter-ai/interview.html
autonomous: true
requirements: [Q-225]
must_haves:
  truths:
    - "Direct GET to www.offerletter.ai/downloads/* returns 403 Forbidden"
    - "Lambda returns mac_url and win_url as pre-signed S3 URLs on verified response"
    - "interview.html source shows href='#' on both download buttons — no real URL in page source"
    - "Returning buyer re-calls Lambda with stored session_id to get fresh signed URLs"
    - "Signed URLs open the actual file from S3 (HTTP 200)"
  artifacts:
    - path: "/tmp/verify-payment/verify_payment.py"
      provides: "Updated Lambda — pre-signed URL generation for both files"
      contains: "generate_download_urls"
    - path: "/Users/jeet/Downloads/offerletter-ai/interview.html"
      provides: "Patched paywall JS — no hardcoded download paths in source"
      contains: "href=\"#\""
  key_links:
    - from: "interview.html paywall JS"
      to: "API Gateway verify-payment"
      via: "fetch POST with session_id"
      pattern: "fetch.*verify-payment"
    - from: "Lambda verify_payment.py"
      to: "S3 offerletter.ai/downloads/*"
      via: "generate_presigned_url"
      pattern: "generate_presigned_url"
    - from: "S3 bucket policy DenyCloudFrontDownloads"
      to: "CloudFront OAC"
      via: "Deny s3:GetObject on downloads/*"
      pattern: "DenyCloudFrontDownloads"
---

<objective>
Block direct CloudFront access to download files and replace hardcoded download hrefs with
Lambda-generated pre-signed S3 URLs (15 min TTL). After this change, the download path is:
browser -> Lambda (verify) -> S3 pre-signed URL -> file download. No real URL ever appears
in page source.

Purpose: Eliminate the bypass where anyone can fetch /downloads/* via CloudFront without payment.
Output: Patched S3 bucket policy, updated Lambda, updated interview.html deployed to S3.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Block CloudFront from /downloads/* and grant Lambda pre-sign IAM</name>
  <files>/tmp/s3-policy-patch.json (ephemeral), IAM inline policy applied inline</files>
  <action>
**Step 1 — Read current bucket policy:**
```bash
aws s3api get-bucket-policy --bucket offerletter.ai --query Policy --output text > /tmp/current-policy.json
cat /tmp/current-policy.json
```

**Step 2 — Build new policy** by appending the Deny statement. The current policy has one
statement (AllowCloudFrontOAC). Patch it to add a second statement:

```json
{
  "Sid": "DenyCloudFrontDownloads",
  "Effect": "Deny",
  "Principal": {"Service": "cloudfront.amazonaws.com"},
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::offerletter.ai/downloads/*"
}
```

Use Python to parse current policy, append the new statement, and write new policy:
```bash
python3 - <<'EOF'
import json, sys
with open('/tmp/current-policy.json') as f:
    pol = json.load(f)
deny = {
    "Sid": "DenyCloudFrontDownloads",
    "Effect": "Deny",
    "Principal": {"Service": "cloudfront.amazonaws.com"},
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::offerletter.ai/downloads/*"
}
pol["Statement"].append(deny)
with open('/tmp/new-policy.json', 'w') as f:
    json.dump(pol, f, indent=2)
print("New policy written. Statements:", [s["Sid"] for s in pol["Statement"]])
EOF
```

**Step 3 — Apply new bucket policy:**
```bash
aws s3api put-bucket-policy --bucket offerletter.ai --policy file:///tmp/new-policy.json
```

**Step 4 — Grant Lambda role s3:GetObject on downloads/* (inline IAM policy):**
```bash
aws iam put-role-policy \
  --role-name offerletter-lambda-role \
  --policy-name offerletter-downloads-presign \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::offerletter.ai/downloads/*"
    }]
  }'
```

Note: The Deny in the bucket policy uses `Effect: Deny` which overrides the existing Allow
for CloudFront OAC. Lambda uses its execution role (IAM principal), not the CloudFront service
principal, so the Deny does NOT affect Lambda's ability to generate pre-signed URLs.
  </action>
  <verify>
```bash
# Confirm Deny statement is present
aws s3api get-bucket-policy --bucket offerletter.ai --query Policy --output text | python3 -c "import json,sys; p=json.load(sys.stdin); print([s['Sid'] for s in p['Statement']])"
# Expected: ['AllowCloudFrontOAC', 'DenyCloudFrontDownloads'] (or similar existing + new)

# Confirm IAM inline policy applied
aws iam get-role-policy --role-name offerletter-lambda-role --policy-name offerletter-downloads-presign
# Expected: policy document with s3:GetObject on offerletter.ai/downloads/*
```
  </verify>
  <done>S3 bucket policy contains DenyCloudFrontDownloads statement. Lambda role has inline policy granting s3:GetObject on downloads/*.</done>
</task>

<task type="auto">
  <name>Task 2: Update Lambda to return pre-signed URLs + deploy</name>
  <files>/tmp/verify-payment/verify_payment.py</files>
  <action>
**Step 1 — Write new verify_payment.py** (complete replacement — adds `generate_download_urls`,
returns `mac_url` + `win_url` in both the DynamoDB cache-hit path and new-purchase path,
removes old `DOWNLOAD_URL` constant):

```python
"""
Verify Stripe checkout session payment for offerletter.ai.
Caches verified session_ids in DynamoDB with 24h TTL.
Returns pre-signed S3 URLs (15 min) for both Mac and Windows downloads.
"""
import json
import os
import time
import boto3
import stripe

REGION = os.environ.get("AWS_REGION", "us-east-1")
TABLE_NAME = "offerletter-verified-sessions"
STRIPE_SECRET_NAME = "offerletter/production/stripe-secret"
S3_BUCKET = "offerletter.ai"
S3_KEY_MAC = "downloads/Interview Assistant.dmg"
S3_KEY_WIN = "downloads/Interview Assistant.exe"
PRESIGN_EXPIRY = 900  # 15 minutes

CORS = {
    "Access-Control-Allow-Origin": "https://www.offerletter.ai",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}

_stripe_key = None


def get_stripe_key():
    global _stripe_key
    if _stripe_key:
        return _stripe_key
    sm = boto3.client("secretsmanager", region_name=REGION)
    resp = sm.get_secret_value(SecretId=STRIPE_SECRET_NAME)
    _stripe_key = json.loads(resp["SecretString"])["key"]
    return _stripe_key


def generate_download_urls():
    s3 = boto3.client("s3", region_name=REGION)
    mac_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": S3_KEY_MAC},
        ExpiresIn=PRESIGN_EXPIRY,
    )
    win_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": S3_KEY_WIN},
        ExpiresIn=PRESIGN_EXPIRY,
    )
    return mac_url, win_url


def handler(event, context):
    method = (event.get("requestContext") or {}).get("http", {}).get("method", "")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    try:
        raw = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            import base64
            raw = base64.b64decode(raw).decode("utf-8")
        body = json.loads(raw)

        session_id = (body.get("session_id") or "").strip()
        if not session_id or len(session_id) > 200:
            return {
                "statusCode": 400,
                "headers": CORS,
                "body": json.dumps({"verified": False, "error": "Invalid session_id"}),
            }

        ddb = boto3.resource("dynamodb", region_name=REGION)
        table = ddb.Table(TABLE_NAME)

        # Fast-path: check DynamoDB cache first
        resp = table.get_item(Key={"session_id": session_id})
        if "Item" in resp:
            mac_url, win_url = generate_download_urls()
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({"verified": True, "mac_url": mac_url, "win_url": win_url}),
            }

        # Verify via Stripe API
        stripe.api_key = get_stripe_key()
        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.InvalidRequestError:
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({"verified": False, "error": "Session not found"}),
            }

        if session.get("payment_status") != "paid":
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({"verified": False, "error": "Payment not completed"}),
            }

        # Cache verified session (TTL: 24h)
        table.put_item(Item={
            "session_id": session_id,
            "verified_at": int(time.time()),
            "expires_at": int(time.time()) + 86400,
        })

        mac_url, win_url = generate_download_urls()
        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"verified": True, "mac_url": mac_url, "win_url": win_url}),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS,
            "body": json.dumps({"verified": False, "error": str(e)}),
        }
```

**Step 2 — Write file and repackage:**
```bash
# Write new source (use Write tool above, then):
cd /tmp/verify-payment
zip -r /tmp/verify-payment-new.zip .
```

**Step 3 — Deploy to Lambda:**
```bash
aws lambda update-function-code \
  --function-name offerletter-verify-payment \
  --zip-file fileb:///tmp/verify-payment-new.zip
```

**Step 4 — Wait for update to propagate:**
```bash
aws lambda wait function-updated --function-name offerletter-verify-payment
```
  </action>
  <verify>
```bash
# Confirm new code deployed — check for generate_download_urls in active code
aws lambda get-function --function-name offerletter-verify-payment \
  --query 'Configuration.LastModified' --output text
# Should show today's timestamp

# Test with a known-cached session_id from DynamoDB (if available):
# aws dynamodb scan --table-name offerletter-verified-sessions --limit 1 --query 'Items[0].session_id.S' --output text
# Then: curl -s -X POST https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/verify-payment \
#   -H 'Content-Type: application/json' \
#   -d '{"session_id":"<id>"}' | python3 -m json.tool
# Expected: {"verified": true, "mac_url": "https://s3.amazonaws.com/...", "win_url": "..."}

# Confirm generate_download_urls function exists in deployed zip
unzip -p /tmp/verify-payment-new.zip verify_payment.py | grep "generate_download_urls"
```
  </verify>
  <done>Lambda deployed with generate_download_urls. DynamoDB cache-hit path and new-purchase path both return mac_url and win_url. No DOWNLOAD_URL constant remains.</done>
</task>

<task type="auto">
  <name>Task 3: Patch interview.html JS paywall + upload to S3</name>
  <files>/Users/jeet/Downloads/offerletter-ai/interview.html</files>
  <action>
Read the current interview.html and apply the following targeted changes:

**Change 1 — Line 560**: `href="/downloads/Interview Assistant.dmg"` → `href="#"`

**Change 2 — Line 836**: `href="/downloads/Interview Assistant.exe"` → `href="#"`

**Change 3 — `unlockDownload` function** (lines 1641-1670 approx):
Replace `function unlockDownload()` with `function unlockDownload(macUrl, winUrl)`.
Replace the two hardcoded href assignments:
- `downloadBtn.href = '/downloads/Interview Assistant.dmg';` → `downloadBtn.href = macUrl || '#';`
- `downloadBtnWin.href = '/downloads/Interview Assistant.exe';` → `downloadBtnWin.href = winUrl || '#';`

**Change 4 — localStorage fast-path** (lines 1707-1709):
Replace the simple `unlockDownload()` call in the `if (localStorage.getItem(LS_KEY) === 'true')` block
with a Lambda re-verify call to get fresh signed URLs. Also add `ol_session_id` storage.

Replace:
```javascript
    if (localStorage.getItem(LS_KEY) === 'true') {
      unlockDownload();
      return;
    }
```
With:
```javascript
    var storedSession = localStorage.getItem('ol_session_id');
    if (localStorage.getItem(LS_KEY) === 'true' && storedSession) {
      fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: storedSession })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.verified) {
          unlockDownload(data.mac_url, data.win_url);
        } else {
          localStorage.removeItem(LS_KEY);
          localStorage.removeItem('ol_session_id');
          lockDownload();
        }
      })
      .catch(function() { lockDownload(); });
      return;
    }
```

**Change 5 — New purchase success block** (lines 1724-1726 approx):
Replace:
```javascript
          localStorage.setItem(LS_KEY, 'true');
          unlockDownload();
```
With:
```javascript
          localStorage.setItem(LS_KEY, 'true');
          localStorage.setItem('ol_session_id', sessionId);
          unlockDownload(data.mac_url, data.win_url);
```

**Step 6 — Upload updated HTML to S3 and invalidate CloudFront:**
```bash
aws s3 cp /Users/jeet/Downloads/offerletter-ai/interview.html \
  s3://offerletter.ai/interview.html \
  --content-type "text/html" --cache-control "no-cache"

aws cloudfront create-invalidation \
  --distribution-id E319UG6B4QE97L \
  --paths "/interview.html"
```
  </action>
  <verify>
```bash
# Confirm both buttons have href="#" in source
grep -n 'id="downloadBtn"' /Users/jeet/Downloads/offerletter-ai/interview.html
grep -n 'id="downloadBtnWin"' /Users/jeet/Downloads/offerletter-ai/interview.html
# Both lines should show href="#"

# Confirm no hardcoded /downloads/ path in unlockDownload function
grep -n '/downloads/Interview' /Users/jeet/Downloads/offerletter-ai/interview.html
# Expected: zero results (all removed)

# Confirm ol_session_id stored alongside purchase
grep -n 'ol_session_id' /Users/jeet/Downloads/offerletter-ai/interview.html
# Expected: 3 lines (setItem in new purchase, setItem in fast-path not needed, getItem, removeItem)

# Confirm S3 upload completed
aws s3 ls s3://offerletter.ai/interview.html
# Should show today's date

# Confirm CloudFront 403 on direct download (after ~1 min propagation)
curl -I "https://www.offerletter.ai/downloads/Interview%20Assistant.exe" 2>/dev/null | head -5
# Expected: HTTP/2 403
```
  </verify>
  <done>
- Both download buttons have href="#" in page source
- unlockDownload(macUrl, winUrl) sets hrefs from Lambda response
- Returning buyers re-call Lambda with stored session_id for fresh pre-signed URLs
- HTML uploaded to S3 and CloudFront invalidation triggered
- Direct CloudFront requests to /downloads/* return 403
  </done>
</task>

</tasks>

<verification>
Full end-to-end verification sequence:

```bash
# 1. S3 policy blocks CloudFront on /downloads/*
curl -I "https://www.offerletter.ai/downloads/Interview%20Assistant.exe"
# Expected: HTTP/2 403

# 2. Lambda returns pre-signed URLs (use a real cached session_id from DynamoDB)
SESSION=$(aws dynamodb scan --table-name offerletter-verified-sessions \
  --limit 1 --query 'Items[0].session_id.S' --output text)
RESPONSE=$(curl -s -X POST \
  https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/verify-payment \
  -H 'Content-Type: application/json' \
  -d "{\"session_id\":\"$SESSION\"}")
echo $RESPONSE | python3 -m json.tool
# Expected: {"verified": true, "mac_url": "https://offerletter.ai.s3.amazonaws.com/downloads/...", "win_url": "..."}

# 3. Pre-signed URL actually downloads the file
MAC_URL=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['mac_url'])")
curl -I "$MAC_URL" 2>/dev/null | head -3
# Expected: HTTP/1.1 200 OK

# 4. Page source shows no real download path
grep 'href="/downloads' /Users/jeet/Downloads/offerletter-ai/interview.html | wc -l
# Expected: 0
```
</verification>

<success_criteria>
- `curl -I https://www.offerletter.ai/downloads/Interview%20Assistant.exe` returns 403 Forbidden
- Lambda POST with valid session_id returns `{verified: true, mac_url: "...", win_url: "..."}`
- Pre-signed URLs return HTTP 200 and serve the actual file
- `grep 'href="/downloads' interview.html` returns zero matches
- Returning buyer flow re-calls Lambda (no stale signed URL stored in localStorage)
</success_criteria>

<output>
After completion, create `.planning/quick/225-implement-server-side-download-protectio/225-SUMMARY.md`
</output>
