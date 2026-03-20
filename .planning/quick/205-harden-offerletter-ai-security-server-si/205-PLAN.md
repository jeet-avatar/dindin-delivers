---
phase: quick-205
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /tmp/lambda_inspect/offer_analysis.py
  - /tmp/lambda_verify_payment/verify_payment.py (new)
  - /Users/jeet/Downloads/offerletter-ai/interview.html
autonomous: true
requirements: [Q-205]

must_haves:
  truths:
    - "offer_analysis Lambda rejects inputs exceeding size caps with HTTP 400"
    - "API GW POST /analyze has usage plan throttling (10 req/day, burst 5)"
    - "POST /verify-payment returns {verified: true} only when Stripe confirms payment_status=paid"
    - "Verified session_id is cached in DynamoDB with 24h TTL so repeat calls skip Stripe"
    - "interview.html paywall calls /verify-payment on ?session_id= redirect and only unlocks download on verified: true"
    - "localStorage fast-path skips API call for returning users"
    - "CSP connect-src includes API GW URL, GTM, GA, and Stripe JS"
  artifacts:
    - path: "/tmp/lambda_inspect/offer_analysis.py"
      provides: "offer analysis handler with input size caps"
    - path: "/tmp/lambda_verify_payment/verify_payment.py"
      provides: "Stripe session verification Lambda"
    - path: "/Users/jeet/Downloads/offerletter-ai/interview.html"
      provides: "server-side paywall gate"
  key_links:
    - from: "interview.html ?session_id param"
      to: "POST https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/verify-payment"
      via: "fetch() in paywall JS block"
    - from: "verify_payment Lambda"
      to: "stripe.checkout.Session.retrieve(session_id)"
      via: "Stripe Python SDK using secret from Secrets Manager"
    - from: "verify_payment Lambda"
      to: "offerletter-verified-sessions DynamoDB"
      via: "dynamodb:PutItem on verified, GetItem for cache lookup"
---

<objective>
Harden offerletter.ai against abuse: add Lambda input caps + API GW throttle, build a
server-side Stripe payment verification Lambda backed by DynamoDB, replace the forgeable
?purchased=true paywall in interview.html with a real /verify-payment API call, and fix
the CSP to allow the new origins.

Purpose: The current paywall is bypassable by anyone who sets ?purchased=true or
localStorage manually. Server-side verification against Stripe makes payment unforgeable.
Output: 3 Lambda functions (offer-analysis updated, verify-payment new), DynamoDB table,
API GW route, updated interview.html, updated CloudFront CSP.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md

Infrastructure confirmed:
- AWS account: 134607809447, region: us-east-1
- Lambda IAM role: arn:aws:iam::134607809447:role/offerletter-lambda-role
- API GW HTTP v2 ID: 0q8mtozfra (https://0q8mtozfra.execute-api.us-east-1.amazonaws.com)
  - Existing route: POST /analyze → offerletter-offer-analysis
- Lambda: offerletter-offer-analysis (Python 3.12, 256MB, 30s)
- Stripe payment link: plink_1TBqshJePbhql2pNTKDnISFo ($19 one-time)
- CloudFront dist: E319UG6B4QE97L (offerletter.ai static site)
- S3 bucket: offerletter.ai
- CloudFront response headers policy: d929723b-8cda-4d7c-be8c-3a9857262f85
  (offerletter-ai-security-headers)
- Current CSP connect-src: 'self' https://cognito-idp.us-east-1.amazonaws.com https://api.anthropic.com
- Stripe secret in Secrets Manager: dollor/production/stripe (key: sk_live_...)
  ⚠️ STRIPE KEY NOTE: offerletter/production/stripe-secret does NOT exist yet.
  The plan reads the Stripe sk_live_* value from dollor/production/stripe and stores a
  copy at offerletter/production/stripe-secret. If you do not have access to read
  dollor/production/stripe, you MUST pause and ask the user for the sk_live_* value
  before continuing Task 2.
- Current interview.html paywall: reads ?purchased=true param → sets localStorage
  ol_purchased (FORGEABLE — no server check)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Lambda DoS input caps + API GW usage plan throttle</name>
  <files>/tmp/lambda_inspect/offer_analysis.py</files>
  <action>
    ## Create Change Request ticket first
    ```bash
    CR=$(curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{"title":"Q-205: Harden offerletter.ai security","description":"Lambda input caps, API GW throttle, server-side Stripe verification, updated CSP","change_type":"infrastructure","priority":"High","requested_by":"support@dollor.ai"}')
    CR_ID=$(echo $CR | python3 -c "import sys,json; print(json.load(sys.stdin)['cr_id'])")
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/$CR_ID/submit?secret_key=$ADMIN_SECRET_KEY"
    ```

    ## Edit /tmp/lambda_inspect/offer_analysis.py
    In the `handler` function, after parsing body (after line ~103 where role/city are stripped),
    add input size caps BEFORE the `if not offer_text:` check:

    ```python
    # DoS input caps
    if len(offer_text) > 50000:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "offer_text exceeds maximum length (50000 chars)"}),
        }
    if len(role) > 200:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "role exceeds maximum length (200 chars)"}),
        }
    if len(city) > 100:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "city exceeds maximum length (100 chars)"}),
        }
    ```

    ## Zip and redeploy offer-analysis Lambda
    ```bash
    mkdir -p /tmp/lambda_offer_build
    cp /tmp/lambda_inspect/offer_analysis.py /tmp/lambda_offer_build/
    # Copy any other files that were in the existing deployment package
    # (check: aws lambda get-function --function-name offerletter-offer-analysis
    #  to find existing layer/package structure)
    cd /tmp/lambda_offer_build
    pip install anthropic boto3 -t . -q
    zip -r /tmp/offer_analysis_updated.zip . -q
    aws lambda update-function-code \
      --function-name offerletter-offer-analysis \
      --zip-file fileb:///tmp/offer_analysis_updated.zip \
      --region us-east-1
    aws lambda wait function-updated \
      --function-name offerletter-offer-analysis \
      --region us-east-1
    ```

    ## Add API GW usage plan with throttle
    API GW HTTP v2 does not support usage plans natively (that's REST API v1 feature).
    For HTTP v2, use a Lambda-level throttle via reserved concurrency + stage-level throttle:

    ```bash
    # Stage-level throttle on the API GW HTTP v2 (stage: $default)
    aws apigatewayv2 update-stage \
      --api-id 0q8mtozfra \
      --stage-name '$default' \
      --route-settings '{"POST /analyze":{"ThrottlingBurstLimit":5,"ThrottlingRateLimit":0.000116}}' \
      --region us-east-1
    # ThrottlingRateLimit 0.000116 req/s ≈ 10 req/day (10/86400)
    # ThrottlingBurstLimit 5 = max concurrent burst
    ```
  </action>
  <verify>
    ```bash
    # Confirm Lambda updated with size checks
    aws lambda invoke \
      --function-name offerletter-offer-analysis \
      --cli-binary-format raw-in-base64-out \
      --payload '{"requestContext":{"http":{"method":"POST"}},"body":"{\"offer_text\":\"'"$(python3 -c "print('x'*50001)")"'\"}","isBase64Encoded":false}' \
      /tmp/lambda_dos_test.json && cat /tmp/lambda_dos_test.json
    # Expect: {"error": "offer_text exceeds maximum length (50000 chars)"} with statusCode 400

    # Confirm API GW stage throttle
    aws apigatewayv2 get-stage --api-id 0q8mtozfra --stage-name '$default' \
      --query "RouteSettings" --output json --region us-east-1
    ```
  </verify>
  <done>
    - Lambda invoke with 50001-char offer_text returns HTTP 400 with error message
    - API GW stage shows POST /analyze route with ThrottlingBurstLimit=5
  </done>
</task>

<task type="auto">
  <name>Task 2: DynamoDB table + verify-payment Lambda + API GW route + Stripe redirect</name>
  <files>/tmp/lambda_verify_payment/verify_payment.py</files>
  <action>
    ## Step 1 — Store Stripe secret in dedicated Secrets Manager entry
    ```bash
    # Read existing Stripe key from dollor/production/stripe
    STRIPE_KEY=$(aws secretsmanager get-secret-value \
      --secret-id dollor/production/stripe \
      --region us-east-1 \
      --query SecretString --output text | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('STRIPE_SECRET_KEY') or d.get('secret_key') or d.get('key') or list(d.values())[0])")
    echo "Got Stripe key: ${STRIPE_KEY:0:12}..."

    # Store at offerletter/production/stripe-secret
    aws secretsmanager create-secret \
      --name offerletter/production/stripe-secret \
      --description "Stripe secret key for offerletter.ai payment verification" \
      --secret-string "{\"key\":\"$STRIPE_KEY\"}" \
      --region us-east-1
    ```
    If the above fails because key field name is unknown, inspect the secret:
    ```bash
    aws secretsmanager get-secret-value --secret-id dollor/production/stripe \
      --region us-east-1 --query SecretString --output text | python3 -m json.tool
    ```
    Then extract the sk_live_* value manually and store it.

    ⚠️ If you cannot read dollor/production/stripe due to IAM permissions, STOP and ask the
    user: "Please provide the Stripe sk_live_* secret key so I can store it at
    offerletter/production/stripe-secret."

    ## Step 2 — Create DynamoDB table
    ```bash
    aws dynamodb create-table \
      --table-name offerletter-verified-sessions \
      --attribute-definitions AttributeName=session_id,AttributeType=S \
      --key-schema AttributeName=session_id,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --region us-east-1

    # Enable TTL
    aws dynamodb wait table-exists \
      --table-name offerletter-verified-sessions \
      --region us-east-1
    aws dynamodb update-time-to-live \
      --table-name offerletter-verified-sessions \
      --time-to-live-specification "Enabled=true,AttributeName=expires_at" \
      --region us-east-1
    ```

    ## Step 3 — Grant IAM permissions to offerletter-lambda-role
    ```bash
    TABLE_ARN=$(aws dynamodb describe-table --table-name offerletter-verified-sessions \
      --region us-east-1 --query "Table.TableArn" --output text)
    SECRET_ARN=$(aws secretsmanager describe-secret \
      --secret-id offerletter/production/stripe-secret \
      --region us-east-1 --query ARN --output text)

    aws iam put-role-policy \
      --role-name offerletter-lambda-role \
      --policy-name offerletter-verify-payment-policy \
      --policy-document "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [
          {
            \"Effect\": \"Allow\",
            \"Action\": [\"dynamodb:PutItem\", \"dynamodb:GetItem\"],
            \"Resource\": \"$TABLE_ARN\"
          },
          {
            \"Effect\": \"Allow\",
            \"Action\": \"secretsmanager:GetSecretValue\",
            \"Resource\": \"$SECRET_ARN\"
          }
        ]
      }"
    ```

    ## Step 4 — Create verify_payment.py Lambda source
    Write to /tmp/lambda_verify_payment/verify_payment.py:

    ```python
    """
    Verify Stripe checkout session payment for offerletter.ai.
    Caches verified session_ids in DynamoDB with 24h TTL.
    """
    import json, os, time, boto3, stripe

    REGION = os.environ.get("AWS_REGION", "us-east-1")
    TABLE_NAME = "offerletter-verified-sessions"
    STRIPE_SECRET_NAME = "offerletter/production/stripe-secret"
    DOWNLOAD_URL = "https://www.offerletter.ai/downloads/Interview Assistant.dmg"

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
                return {"statusCode": 400, "headers": CORS,
                        "body": json.dumps({"verified": False, "error": "Invalid session_id"})}

            ddb = boto3.resource("dynamodb", region_name=REGION)
            table = ddb.Table(TABLE_NAME)

            # Fast-path: check DynamoDB cache first
            resp = table.get_item(Key={"session_id": session_id})
            if "Item" in resp:
                return {"statusCode": 200, "headers": CORS,
                        "body": json.dumps({"verified": True, "download_url": DOWNLOAD_URL})}

            # Verify via Stripe API
            stripe.api_key = get_stripe_key()
            try:
                session = stripe.checkout.Session.retrieve(session_id)
            except stripe.error.InvalidRequestError:
                return {"statusCode": 200, "headers": CORS,
                        "body": json.dumps({"verified": False, "error": "Session not found"})}

            if session.get("payment_status") != "paid":
                return {"statusCode": 200, "headers": CORS,
                        "body": json.dumps({"verified": False, "error": "Payment not completed"})}

            # Cache verified session (TTL: 24h)
            table.put_item(Item={
                "session_id": session_id,
                "verified_at": int(time.time()),
                "expires_at": int(time.time()) + 86400,
            })

            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps({"verified": True, "download_url": DOWNLOAD_URL})}

        except Exception as e:
            return {"statusCode": 500, "headers": CORS,
                    "body": json.dumps({"verified": False, "error": str(e)})}
    ```

    ## Step 5 — Deploy verify-payment Lambda
    ```bash
    mkdir -p /tmp/lambda_verify_payment
    # (verify_payment.py already written above)
    cd /tmp/lambda_verify_payment
    pip install stripe boto3 -t . -q
    zip -r /tmp/verify_payment.zip . -q

    aws lambda create-function \
      --function-name offerletter-verify-payment \
      --runtime python3.12 \
      --role arn:aws:iam::134607809447:role/offerletter-lambda-role \
      --handler verify_payment.handler \
      --zip-file fileb:///tmp/verify_payment.zip \
      --timeout 10 \
      --memory-size 128 \
      --region us-east-1

    aws lambda wait function-active \
      --function-name offerletter-verify-payment \
      --region us-east-1
    ```

    ## Step 6 — Add API GW route POST /verify-payment
    ```bash
    # Create Lambda integration
    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
      --api-id 0q8mtozfra \
      --integration-type AWS_PROXY \
      --integration-uri "arn:aws:lambda:us-east-1:134607809447:function:offerletter-verify-payment" \
      --payload-format-version "2.0" \
      --region us-east-1 \
      --query IntegrationId --output text)

    # Create route
    aws apigatewayv2 create-route \
      --api-id 0q8mtozfra \
      --route-key "POST /verify-payment" \
      --target "integrations/$INTEGRATION_ID" \
      --region us-east-1

    # Also add OPTIONS /verify-payment for CORS preflight
    aws apigatewayv2 create-route \
      --api-id 0q8mtozfra \
      --route-key "OPTIONS /verify-payment" \
      --target "integrations/$INTEGRATION_ID" \
      --region us-east-1

    # Grant API GW permission to invoke the Lambda
    aws lambda add-permission \
      --function-name offerletter-verify-payment \
      --statement-id apigw-invoke-verify-payment \
      --action lambda:InvokeFunction \
      --principal apigateway.amazonaws.com \
      --source-arn "arn:aws:execute-api:us-east-1:134607809447:0q8mtozfra/*" \
      --region us-east-1
    ```

    ## Step 7 — Update Stripe payment link redirect URL
    Use Stripe CLI or Dashboard to update plink_1TBqshJePbhql2pNTKDnISFo:
    - After payment success URL → https://www.offerletter.ai/interview.html?session_id={CHECKOUT_SESSION_ID}

    Via Stripe API:
    ```bash
    curl -s -X POST "https://api.stripe.com/v1/payment_links/plink_1TBqshJePbhql2pNTKDnISFo" \
      -u "$STRIPE_KEY:" \
      -d "after_completion[type]=redirect" \
      -d "after_completion[redirect][url]=https://www.offerletter.ai/interview.html?session_id={CHECKOUT_SESSION_ID}"
    ```
    Note: {CHECKOUT_SESSION_ID} is a Stripe template variable — pass it literally.
  </action>
  <verify>
    ```bash
    # Confirm DynamoDB table exists with TTL enabled
    aws dynamodb describe-table --table-name offerletter-verified-sessions \
      --region us-east-1 --query "Table.TableStatus" --output text
    aws dynamodb describe-time-to-live --table-name offerletter-verified-sessions \
      --region us-east-1 --query "TimeToLiveDescription" --output json

    # Confirm Lambda exists
    aws lambda get-function --function-name offerletter-verify-payment \
      --region us-east-1 --query "Configuration.State" --output text

    # Confirm API GW route exists
    aws apigatewayv2 get-routes --api-id 0q8mtozfra --region us-east-1 \
      --query "Items[?RouteKey=='POST /verify-payment'].RouteKey" --output text

    # Smoke test with bogus session_id (should return verified: false)
    curl -s -X POST https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/verify-payment \
      -H "Content-Type: application/json" \
      -d '{"session_id":"cs_test_bogus123"}' | python3 -m json.tool
    # Expect: {"verified": false, "error": "Session not found"}
    ```
  </verify>
  <done>
    - DynamoDB table ACTIVE with TTL on expires_at
    - offerletter-verify-payment Lambda State=Active
    - API GW route POST /verify-payment returns {verified: false} for bogus session_id
    - Stripe payment link redirect URL updated to include ?session_id={CHECKOUT_SESSION_ID}
  </done>
</task>

<task type="auto">
  <name>Task 3: Update interview.html paywall + fix CSP + deploy to S3/CloudFront</name>
  <files>/Users/jeet/Downloads/offerletter-ai/interview.html</files>
  <action>
    ## Edit /Users/jeet/Downloads/offerletter-ai/interview.html

    Replace the entire PAYWALL GATE script block (lines ~1039-1082, from
    `// ── PAYWALL GATE ──` to closing `})();`) with:

    ```javascript
    // ── PAYWALL GATE ──────────────────────────────────────────────
    (function() {
      var VERIFY_URL = 'https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/verify-payment';
      var LS_KEY = 'ol_purchased';

      function unlockDownload() {
        var downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
          downloadBtn.href = '/downloads/Interview Assistant.dmg';
          downloadBtn.setAttribute('download', '');
          downloadBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Mac App';
          downloadBtn.style.background = '';
        }
        document.querySelectorAll('a[href*="Interview Assistant.dmg"]').forEach(function(link) {
          link.href = '/downloads/Interview Assistant.dmg';
          link.setAttribute('download', '');
          link.textContent = 'Download Interview Assistant.dmg';
          link.style.background = '';
        });
        var notice = document.getElementById('purchaseNotice');
        if (notice) notice.style.display = 'none';
      }

      function lockDownload() {
        var downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
          downloadBtn.href = 'https://buy.stripe.com/4gM00k8Gb20Td3B9kH6kg03';
          downloadBtn.removeAttribute('download');
          downloadBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Purchase — $19';
          downloadBtn.style.background = '#F97316';
        }
        document.querySelectorAll('a[href*="Interview Assistant.dmg"]').forEach(function(link) {
          link.href = 'https://buy.stripe.com/4gM00k8Gb20Td3B9kH6kg03';
          link.removeAttribute('download');
          link.textContent = 'Purchase — $19 to unlock download';
          link.style.background = '#F97316';
        });
        var notice = document.getElementById('purchaseNotice');
        if (notice) notice.style.display = 'block';
      }

      var params = new URLSearchParams(window.location.search);
      var sessionId = params.get('session_id');

      // Fast-path: returning user with localStorage already set
      if (localStorage.getItem(LS_KEY) === 'true') {
        unlockDownload();
        return;
      }

      // Server-side verification: new purchase returning from Stripe
      if (sessionId) {
        // Clean URL immediately (cosmetic)
        history.replaceState(null, '', window.location.pathname);

        fetch(VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.verified) {
            localStorage.setItem(LS_KEY, 'true');
            unlockDownload();
          } else {
            lockDownload();
            // Show a subtle error under the purchase notice
            var notice = document.getElementById('purchaseNotice');
            if (notice) {
              notice.innerHTML += '<div style="margin-top:8px;font-size:12px;color:#DC2626;">Payment verification failed. If you just paid, please wait a moment and refresh. Contact support@offerletter.ai if this persists.</div>';
              notice.style.display = 'block';
            }
          }
        })
        .catch(function() {
          // Network error — fail closed (locked)
          lockDownload();
        });
      } else {
        // No session_id, not in localStorage → locked
        lockDownload();
      }
    })();
    ```

    ## Update CloudFront Response Headers Policy CSP
    ```bash
    # Get current ETag
    ETAG=$(aws cloudfront get-response-headers-policy \
      --id d929723b-8cda-4d7c-be8c-3a9857262f85 \
      --query ETag --output text --region us-east-1)

    aws cloudfront update-response-headers-policy \
      --id d929723b-8cda-4d7c-be8c-3a9857262f85 \
      --if-match "$ETAG" \
      --response-headers-policy-config '{
        "Comment": "Security headers for offerletter.ai",
        "Name": "offerletter-ai-security-headers",
        "SecurityHeadersConfig": {
          "XSSProtection": {"Override": true, "Protection": true, "ModeBlock": true},
          "FrameOptions": {"Override": true, "FrameOption": "DENY"},
          "ReferrerPolicy": {"Override": true, "ReferrerPolicy": "strict-origin-when-cross-origin"},
          "ContentSecurityPolicy": {
            "Override": true,
            "ContentSecurityPolicy": "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\'' https://fonts.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com; style-src '\''self'\'' '\''unsafe-inline'\'' https://fonts.googleapis.com; font-src '\''self'\'' https://fonts.gstatic.com; img-src '\''self'\'' data: https:; connect-src '\''self'\'' https://0q8mtozfra.execute-api.us-east-1.amazonaws.com https://cognito-idp.us-east-1.amazonaws.com https://api.anthropic.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://js.stripe.com; frame-src https://js.stripe.com; frame-ancestors '\''none'\''; base-uri '\''self'\''; form-action '\''self'\''"
          },
          "ContentTypeOptions": {"Override": true},
          "StrictTransportSecurity": {
            "Override": true, "IncludeSubdomains": true, "Preload": true,
            "AccessControlMaxAgeSec": 31536000
          }
        },
        "CustomHeadersConfig": {
          "Quantity": 2,
          "Items": [
            {"Header": "Permissions-Policy", "Value": "camera=(), microphone=(self), geolocation=(), payment=()", "Override": true},
            {"Header": "X-Robots-Tag", "Value": "noarchive", "Override": true}
          ]
        }
      }' \
      --region us-east-1
    ```

    ## Sync to S3 and invalidate CloudFront
    ```bash
    aws s3 cp /Users/jeet/Downloads/offerletter-ai/interview.html \
      s3://offerletter.ai/interview.html \
      --content-type "text/html" \
      --cache-control "no-cache"

    aws cloudfront create-invalidation \
      --distribution-id E319UG6B4QE97L \
      --paths "/interview.html"
    ```
  </action>
  <verify>
    ```bash
    # Confirm interview.html is live on S3
    aws s3 ls s3://offerletter.ai/interview.html

    # Confirm CloudFront returns updated file (check for 'verify-payment' in script)
    curl -s https://www.offerletter.ai/interview.html | grep -c "verify-payment"
    # Expect: 1 (or more)

    # Confirm CSP is updated (check connect-src has new origins)
    curl -sI https://www.offerletter.ai/interview.html | grep -i "content-security-policy"
    # Should include: 0q8mtozfra.execute-api.us-east-1.amazonaws.com AND googletagmanager.com

    # Manual paywall test
    # 1. Open https://www.offerletter.ai/interview.html in private window
    #    → download button should say "Purchase — $19" (locked)
    # 2. Open https://www.offerletter.ai/interview.html?session_id=cs_fake123
    #    → fetch fires, returns verified:false, button remains locked
    # 3. Set localStorage.setItem('ol_purchased','true') in console
    #    → reload → download button should say "Download Mac App" (unlocked, no API call)
    ```
  </verify>
  <done>
    - interview.html on S3 contains fetch() call to /verify-payment (no more ?purchased=true check)
    - CSP connect-src includes API GW URL + GTM + GA + Stripe domains
    - Locked state: download button shows "Purchase — $19" for unauthenticated visitors
    - Fast-path: localStorage ol_purchased=true skips API call and unlocks immediately
    - Error state: bogus session_id shows error message, button stays locked
  </done>
</task>

</tasks>

<verification>
End-to-end security checks:

1. **Input cap**: Lambda invoke with 50001-char body → HTTP 400
2. **Throttle**: API GW stage shows ThrottlingBurstLimit=5 on POST /analyze
3. **DynamoDB**: Table ACTIVE, TTL enabled on expires_at
4. **verify-payment**: curl with bogus session_id → {verified: false}
5. **Paywall integrity**: interview.html no longer contains `?purchased=true` grant logic
6. **CSP**: curl -I returns connect-src with 0q8mtozfra.execute-api.us-east-1.amazonaws.com
7. **Stripe redirect**: plink_1TBqshJePbhql2pNTKDnISFo after_completion URL contains {CHECKOUT_SESSION_ID}
</verification>

<success_criteria>
- Submitting >50000-char offer text returns HTTP 400 (DoS cap working)
- POST /verify-payment with a real paid Stripe session_id returns {verified: true, download_url: ...}
- POST /verify-payment with a fake session_id returns {verified: false}
- interview.html paywall is locked for new visitors, unlocks only after server verification
- CloudFront CSP does not block the /verify-payment fetch call (no CSP violations in DevTools)
</success_criteria>

<output>
After completion, create `.planning/quick/205-harden-offerletter-ai-security-server-si/205-SUMMARY.md`
with: what was built, AWS resource ARNs created, Stripe payment link redirect URL, and any
deviations from plan.
</output>
