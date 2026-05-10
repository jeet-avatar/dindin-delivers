---
phase: quick-334
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - aws/iam/inline-policy (zietra-api-lambda-role)
  - aws/lambda/zietra-tracker (new Lambda function)
  - aws/apigateway/zietra-tracker-api (new HTTP API)
  - s3://turion-demo-static/shells/app-chrome.js
  - aws/lambda/marquee-hourly-report (code update)
  - aws/lambda/marquee-visitor-alert (code update)
autonomous: true
requirements: []
must_haves:
  truths:
    - "marquee-hourly-report Lambda executes without AccessDeniedException and sends the email report"
    - "turionspace.zietra.com pages fire a beacon POST on load — visible as [visitor] logs in zietra-tracker log group"
    - "marquee-hourly-report covers all three sites: marquee-app, asc606-app, zietra-tracker"
    - "marquee-visitor-alert covers turion watched paths"
  artifacts:
    - path: "aws/iam inline policy allow-zietra-demo-logs on zietra-api-lambda-role"
      provides: "logs:FilterLogEvents + logs:GetLogEvents on all three log groups"
    - path: "aws/lambda/zietra-tracker"
      provides: "Public POST /track endpoint logging [visitor] JSON, returns CORS headers"
    - path: "s3://turion-demo-static/shells/app-chrome.js"
      provides: "Beacon script appended — fires fetch to zietra-tracker on every page load"
    - path: "aws/lambda/marquee-hourly-report"
      provides: "Reads all three log groups, graceful try/except per group, sends report"
  key_links:
    - from: "turionspace.zietra.com HTML pages"
      to: "zietra-tracker APIGW POST /track"
      via: "app-chrome.js beacon fetch"
    - from: "marquee-hourly-report"
      to: "/aws/lambda/marquee-app + /aws/lambda/asc606-app + /aws/lambda/zietra-tracker"
      via: "CloudWatch FilterLogEvents with role allow-zietra-demo-logs policy"
---

<objective>
Fix universal Zietra demo monitoring across all three sites.

Purpose: The hourly report Lambda crashes before sending (AccessDeniedException on marquee-app logs). Turionspace has no visitor tracking. This task closes both gaps and wires all three sites into the existing monitoring infrastructure.

Output:
1. IAM inline policy grants CloudWatch log read on all three log groups
2. New `zietra-tracker` Lambda + APIGW HTTP API provides a public POST /track beacon endpoint
3. Turion Space `app-chrome.js` sends a beacon on every page load (all 72 pages, deferred load)
4. `marquee-hourly-report` and `marquee-visitor-alert` cover all three sites with per-group try/except
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md

## Key facts from orchestrator research

### Sites and Lambdas
- marquee.zietra.com → Lambda `marquee-app` → log group `/aws/lambda/marquee-app`
- asc606.zietra.com → Lambda `asc606-app` → log group `/aws/lambda/asc606-app`
- turionspace.zietra.com → S3 `turion-demo-static` + CloudFront — NO Lambda, NO visitor tracking

### IAM
- Role: `zietra-api-lambda-role`
- `aws iam list-role-policies` and `list-attached-role-policies` are BLOCKED by shell deny rules
- `aws iam put-role-policy` IS allowed — use this to add inline policy

### Monitoring Lambdas
- `marquee-hourly-report` — role `zietra-api-lambda-role`, reads marquee-app + asc606-app log groups, sends HTML email via Resend SMTP, crashes on first FilterLogEvents call (no try/except)
- `marquee-visitor-alert` — same role, same permission issue, has try/except so continues but misses marquee data
- Both filter out `JITESH_IP = "184.189.123.74"` and use `ipinfo.io` for geo
- Both email via Resend SMTP: `smtp.resend.com:587`, env var `RESEND_KEY`

### Visitor log format (must match exactly)
```
[visitor] {"at":"...","ip":"...","ua":"...","path":"...","referrer":"...","host":"turionspace.zietra.com","site":"turionspace.zietra.com"}
```

### Lambda Function URL constraint (from MEMORY.md)
"Lambda Function URL is 403-blocked at account level — use APIGW"

### AWS account + region
- Account: `134607809447`
- Region: `us-east-1`
- CloudFront distribution for turion: serves S3 `turion-demo-static`
- turion CloudFront invalidation: use `aws cloudfront create-invalidation`
- turion-demo-api Lambda exists at APIGW `rjydekliee.execute-api.us-east-1.amazonaws.com` — its IAM execution role name needs to be looked up before reuse
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix IAM — grant CloudWatch log read on all three log groups</name>
  <files>aws/iam inline policy `allow-zietra-demo-logs` on role `zietra-api-lambda-role`</files>
  <action>
Apply an inline IAM policy via `aws iam put-role-policy` granting `logs:FilterLogEvents` and `logs:GetLogEvents` on all three log groups (including the new zietra-tracker group which will exist after Task 2):

```bash
aws iam put-role-policy \
  --role-name zietra-api-lambda-role \
  --policy-name allow-zietra-demo-logs \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "logs:FilterLogEvents",
          "logs:GetLogEvents",
          "logs:DescribeLogStreams"
        ],
        "Resource": [
          "arn:aws:logs:us-east-1:134607809447:log-group:/aws/lambda/marquee-app:*",
          "arn:aws:logs:us-east-1:134607809447:log-group:/aws/lambda/asc606-app:*",
          "arn:aws:logs:us-east-1:134607809447:log-group:/aws/lambda/zietra-tracker:*"
        ]
      }
    ]
  }'
```

Note: If the policy already exists with the same name, `put-role-policy` replaces it atomically — no need to delete first.
  </action>
  <verify>
```bash
# Confirm policy was applied (get-role-policy IS allowed even if list is not)
aws iam get-role-policy \
  --role-name zietra-api-lambda-role \
  --policy-name allow-zietra-demo-logs \
  | python3 -c "import sys,json,urllib.parse; d=json.load(sys.stdin); print(json.dumps(json.loads(urllib.parse.unquote(d['PolicyDocument'])), indent=2))"
```
Expect: JSON showing the three log group ARNs with FilterLogEvents + GetLogEvents.
  </verify>
  <done>Policy `allow-zietra-demo-logs` exists on `zietra-api-lambda-role` with all three log group ARNs. marquee-hourly-report can now call FilterLogEvents on marquee-app without AccessDeniedException.</done>
</task>

<task type="auto">
  <name>Task 2: Deploy zietra-tracker Lambda + APIGW HTTP API</name>
  <files>
    /tmp/zietra-tracker/handler.py
    /tmp/zietra-tracker/zietra-tracker.zip
    aws/lambda/zietra-tracker (new Lambda)
    aws/apigateway (new HTTP API)
  </files>
  <action>
**Step 1: Write the Lambda handler.**

Create `/tmp/zietra-tracker/handler.py`:

```python
import json
import datetime

JITESH_IP = "184.189.123.74"

def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")

    # Handle CORS preflight
    if method == "OPTIONS":
        return {
            "statusCode": 204,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": ""
        }

    # Parse body
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        body = {}

    # Extract IP from x-forwarded-for (first non-private IP)
    fwd = (event.get("headers") or {}).get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else ""

    # Filter owner IP — return ok but don't log
    if ip == JITESH_IP:
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"ok": True})
        }

    ua = (event.get("headers") or {}).get("user-agent", "")
    path = body.get("path", "")
    referrer = body.get("referrer", "")
    site = body.get("site", "turionspace.zietra.com")
    host = "turionspace.zietra.com"
    at = datetime.datetime.utcnow().isoformat() + "Z"

    record = {
        "at": at,
        "ip": ip,
        "ua": ua,
        "path": path,
        "referrer": referrer,
        "host": host,
        "site": site
    }

    print(f"[visitor] {json.dumps(record)}")

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        },
        "body": json.dumps({"ok": True})
    }
```

**Step 2: Zip and create/update Lambda.**

```bash
cd /tmp/zietra-tracker
zip zietra-tracker.zip handler.py

# Check if Lambda exists
aws lambda get-function --function-name zietra-tracker --region us-east-1 2>/dev/null \
  && EXISTS=true || EXISTS=false

if [ "$EXISTS" = "true" ]; then
  aws lambda update-function-code \
    --function-name zietra-tracker \
    --zip-file fileb:///tmp/zietra-tracker/zietra-tracker.zip \
    --region us-east-1
else
  aws lambda create-function \
    --function-name zietra-tracker \
    --runtime python3.12 \
    --handler handler.lambda_handler \
    --role arn:aws:iam::134607809447:role/zietra-api-lambda-role \
    --zip-file fileb:///tmp/zietra-tracker/zietra-tracker.zip \
    --timeout 10 \
    --memory-size 128 \
    --region us-east-1
fi
```

Wait for function to be Active:
```bash
aws lambda wait function-active --function-name zietra-tracker --region us-east-1
```

**Step 3: Create APIGW HTTP API with POST /track route.**

Check if API already exists:
```bash
EXISTING_API=$(aws apigatewayv2 get-apis --region us-east-1 \
  --query "Items[?Name=='zietra-tracker-api'].ApiId" --output text)
```

If not found (`None` or empty), create:
```bash
API_ID=$(aws apigatewayv2 create-api \
  --name zietra-tracker-api \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="*",AllowMethods="POST,OPTIONS",AllowHeaders="Content-Type" \
  --region us-east-1 \
  --query ApiId --output text)
```

Otherwise use the existing API ID.

Get Lambda ARN:
```bash
LAMBDA_ARN=$(aws lambda get-function \
  --function-name zietra-tracker \
  --region us-east-1 \
  --query Configuration.FunctionArn --output text)
```

Create Lambda integration:
```bash
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri $LAMBDA_ARN \
  --payload-format-version 2.0 \
  --region us-east-1 \
  --query IntegrationId --output text)
```

Create POST /track route:
```bash
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "POST /track" \
  --target "integrations/$INTEGRATION_ID" \
  --region us-east-1
```

Create $default stage with auto-deploy:
```bash
aws apigatewayv2 create-stage \
  --api-id $API_ID \
  --stage-name '$default' \
  --auto-deploy \
  --region us-east-1
```

Grant APIGW permission to invoke Lambda:
```bash
aws lambda add-permission \
  --function-name zietra-tracker \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:134607809447:$API_ID/*/*/track" \
  --region us-east-1 2>/dev/null || echo "Permission may already exist"
```

**Step 4: Record the tracker endpoint URL.**

```bash
TRACKER_URL="https://${API_ID}.execute-api.us-east-1.amazonaws.com/track"
echo "TRACKER_URL=$TRACKER_URL"
```

Save this URL — it's needed for Task 3.
  </action>
  <verify>
```bash
# Smoke test the tracker endpoint
curl -s -X POST "$TRACKER_URL" \
  -H "Content-Type: application/json" \
  -d '{"site":"turionspace.zietra.com","path":"/satellite/test","referrer":""}' \
  | python3 -m json.tool

# Expect: {"ok": true}

# Check OPTIONS preflight
curl -s -X OPTIONS "$TRACKER_URL" \
  -H "Origin: https://turionspace.zietra.com" \
  -H "Access-Control-Request-Method: POST" \
  -I | grep -E "Access-Control|HTTP/"

# Expect: HTTP/2 204 + Access-Control-Allow-Origin: *

# Wait ~30s then check CloudWatch for [visitor] log
sleep 30
aws logs filter-log-events \
  --log-group-name /aws/lambda/zietra-tracker \
  --filter-pattern "[visitor]" \
  --start-time $(($(date +%s) - 120))000 \
  --region us-east-1 \
  --query "events[*].message" --output text | head -5
```
Expect: At least one `[visitor] {"at":...}` line from the smoke test POST.
  </verify>
  <done>POST to TRACKER_URL returns `{"ok": true}` with `Access-Control-Allow-Origin: *`. CloudWatch log group `/aws/lambda/zietra-tracker` contains `[visitor]` entries. OPTIONS returns 204 with CORS headers.</done>
</task>

<task type="auto">
  <name>Task 3: Add beacon to Turion Space app-chrome.js + update both monitoring Lambdas</name>
  <files>
    /tmp/turion-app-chrome.js (local working copy)
    s3://turion-demo-static/shells/app-chrome.js (upload target)
    /tmp/marquee-hourly-report/ (Lambda code update)
    /tmp/marquee-visitor-alert/ (Lambda code update)
  </files>
  <action>
**Step 1: Download current app-chrome.js from S3.**

```bash
aws s3 cp s3://turion-demo-static/shells/app-chrome.js /tmp/turion-app-chrome.js
```

**Step 2: Append beacon code.**

Append to `/tmp/turion-app-chrome.js` (replace TRACKER_URL_HERE with the actual URL from Task 2):

```javascript

// Visitor beacon — fires on every page load, silent fail
(function(){
  var TRACKER = 'TRACKER_URL_HERE';
  if (typeof fetch === 'undefined') return;
  try {
    fetch(TRACKER, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        site: 'turionspace.zietra.com',
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || ''
      }),
      keepalive: true
    }).catch(function(){});
  } catch(e){}
})();
```

Replace `TRACKER_URL_HERE` with the actual APIGW URL (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com/track`).

**Step 3: Upload to S3 and invalidate CloudFront.**

```bash
aws s3 cp /tmp/turion-app-chrome.js \
  s3://turion-demo-static/shells/app-chrome.js \
  --content-type "application/javascript"

# Get turion CloudFront distribution ID
TURION_CF_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Origins.Items[*].DomainName, 'turion-demo-static.s3')].Id" \
  --output text | head -1)

aws cloudfront create-invalidation \
  --distribution-id $TURION_CF_ID \
  --paths "/shells/app-chrome.js"
```

**Step 4: Download, patch, and redeploy marquee-hourly-report Lambda.**

```bash
mkdir -p /tmp/marquee-hourly-report-patch
cd /tmp/marquee-hourly-report-patch

# Download current deployment package
aws lambda get-function \
  --function-name marquee-hourly-report \
  --region us-east-1 \
  --query Code.Location --output text \
  | xargs curl -s -o current.zip

unzip -o current.zip
```

Open the handler Python file (likely `handler.py` or `lambda_function.py`) and make these changes:

**Change 1:** Add `zietra-tracker` to the log groups dict. Find the dict/list defining which log groups to query (contains `marquee-app` and `asc606-app`). Add:
```python
'/aws/lambda/zietra-tracker': 'Turion Space'
```
(or similar — match the existing pattern for the site label)

**Change 2:** Wrap each `logs.filter_log_events(...)` call in its own `try/except`. The current code crashes because the first group fails without a try/except. Restructure so each group is queried independently:

```python
# Pattern to apply around each log group query:
try:
    response = logs.filter_log_events(
        logGroupName=log_group,
        ...
    )
    # process response
except Exception as e:
    print(f"[warn] Could not read {log_group}: {e}")
    # continue to next group — do NOT re-raise
```

If the existing code already has the structure in a loop, add try/except inside the loop around the filter_log_events call.

**Change 3:** Ensure the `[visitor]` filter pattern covers all three groups. If the filter pattern is hardcoded per-group, add the same pattern for `zietra-tracker`.

Rezip and update:
```bash
zip -r updated.zip .
aws lambda update-function-code \
  --function-name marquee-hourly-report \
  --zip-file fileb:///tmp/marquee-hourly-report-patch/updated.zip \
  --region us-east-1
aws lambda wait function-updated --function-name marquee-hourly-report --region us-east-1
```

**Step 5: Download, patch, and redeploy marquee-visitor-alert Lambda.**

```bash
mkdir -p /tmp/marquee-visitor-alert-patch
cd /tmp/marquee-visitor-alert-patch

aws lambda get-function \
  --function-name marquee-visitor-alert \
  --region us-east-1 \
  --query Code.Location --output text \
  | xargs curl -s -o current.zip

unzip -o current.zip
```

Make these changes:

**Change 1:** Add `zietra-tracker` to the GROUPS/WATCHED dict with turion-specific high-value paths:
```python
'/aws/lambda/zietra-tracker': [
    '/satellite/',
    '/parts/',
    '/work-orders/',
    '/bom/',
    '/cost',
]
```
Match the existing pattern for how watched paths are defined per group.

**Change 2:** Verify the existing try/except wraps the filter_log_events call for zietra-tracker the same as other groups.

Rezip and update:
```bash
zip -r updated.zip .
aws lambda update-function-code \
  --function-name marquee-visitor-alert \
  --zip-file fileb:///tmp/marquee-visitor-alert-patch/updated.zip \
  --region us-east-1
aws lambda wait function-updated --function-name marquee-visitor-alert --region us-east-1
```
  </action>
  <verify>
```bash
# 1. Verify beacon in app-chrome.js on CloudFront (after invalidation propagates ~60s)
curl -s "https://turionspace.zietra.com/shells/app-chrome.js" | grep -c "zietra-tracker"
# Expect: 1 (the TRACKER = '...' line)

# 2. Verify marquee-hourly-report includes zietra-tracker in its log groups
#    by invoking it manually and checking the response/logs
aws lambda invoke \
  --function-name marquee-hourly-report \
  --region us-east-1 \
  /tmp/hourly-response.json
cat /tmp/hourly-response.json
# Expect: {"statusCode": 200} or similar success — NOT a crash/error

# Check Lambda logs for the invocation
aws logs filter-log-events \
  --log-group-name /aws/lambda/marquee-hourly-report \
  --filter-pattern "ERROR" \
  --start-time $(($(date +%s) - 300))000 \
  --region us-east-1 \
  --query "events[*].message" --output text | head -10
# Expect: no AccessDeniedException lines (may still have [warn] for groups with no recent logs)

# 3. Test full beacon flow: visit a turion page and confirm [visitor] log appears
curl -s -X POST "$TRACKER_URL" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -d '{"site":"turionspace.zietra.com","path":"/satellite/","referrer":""}' \
  | python3 -m json.tool
# Expect: {"ok": true}
```
  </verify>
  <done>
- `app-chrome.js` on CloudFront contains the beacon script pointing at the APIGW URL.
- `marquee-hourly-report` invocation completes without AccessDeniedException and covers all three sites.
- `marquee-visitor-alert` covers turion high-value paths.
- A test POST to the tracker returns `{"ok": true}` and produces a `[visitor]` CloudWatch log entry.
  </done>
</task>

</tasks>

<verification>
End-to-end checks:

1. **IAM policy applied:** `aws iam get-role-policy --role-name zietra-api-lambda-role --policy-name allow-zietra-demo-logs` returns policy with all three log group ARNs.

2. **Tracker endpoint live:** `curl -X POST https://{api-id}.execute-api.us-east-1.amazonaws.com/track -d '{...}'` returns `{"ok": true}` with `Access-Control-Allow-Origin: *`.

3. **Beacon deployed:** `curl https://turionspace.zietra.com/shells/app-chrome.js | grep zietra-tracker` returns the tracker URL.

4. **Hourly report no longer crashes:** Manual Lambda invoke returns success, no AccessDeniedException in log output.

5. **[visitor] logs appear:** After test POST to tracker, CloudWatch log group `/aws/lambda/zietra-tracker` shows `[visitor] {"at":...,"ip":...,"path":...,"site":"turionspace.zietra.com"}`.
</verification>

<success_criteria>
- IAM: `allow-zietra-demo-logs` inline policy on `zietra-api-lambda-role` grants FilterLogEvents on all three log groups
- Tracker: `zietra-tracker` Lambda + APIGW HTTP API endpoint responds with `{"ok": true}` and CORS headers
- Beacon: `turionspace.zietra.com/shells/app-chrome.js` contains beacon fetch targeting the tracker URL
- Hourly report: manual invoke completes without error, covers all three sites
- Visitor alert: includes turion high-value paths in watched list
</success_criteria>

<output>
After completion, create `.planning/quick/334-universal-zietra-demo-monitoring-fix-iam/334-SUMMARY.md` with:
- Tracker APIGW endpoint URL
- CloudFront distribution ID used for turion invalidation
- Confirmation of IAM policy applied
- Any deviations from this plan
</output>
