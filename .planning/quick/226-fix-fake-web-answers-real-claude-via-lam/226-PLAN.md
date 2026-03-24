---
phase: quick-226
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /tmp/ask-question/ask_question.py
  - /tmp/get-app-config/get_app_config.py
  - /Users/jeet/Downloads/offerletter-ai/interview.html
  - /Users/jeet/Downloads/interview-assistant/interview_assistant.py
  - /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py
  - /Users/jeet/Downloads/interview-assistant/interview_server.py
autonomous: true
requirements: []

must_haves:
  truths:
    - "interview.html Type Mode tab calls real Claude (not demoAnswers) for session-verified users"
    - "Unpaid users see a purchase-required message, not a fake answer"
    - "No API keys are hardcoded in any Python source file"
    - "Python app fetches OpenAI + Anthropic keys at startup from Secrets Manager via Lambda"
    - "offerletter-ask-question Lambda exists and returns Claude answers"
    - "offerletter-get-app-config Lambda exists and returns keys to authenticated apps"
  artifacts:
    - path: "/tmp/ask-question/ask_question.py"
      provides: "Lambda source for real Claude Q&A"
    - path: "/tmp/get-app-config/get_app_config.py"
      provides: "Lambda source for app config key fetch"
    - path: "/Users/jeet/Downloads/offerletter-ai/interview.html"
      provides: "Web UI with real Lambda call in askManual()"
    - path: "/Users/jeet/Downloads/interview-assistant/interview_assistant.py"
      provides: "Python source with keys fetched at startup"
  key_links:
    - from: "interview.html askManual()"
      to: "offerletter-ask-question Lambda"
      via: "POST https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/ask-question"
    - from: "interview_assistant.py _fetch_api_keys()"
      to: "offerletter-get-app-config Lambda"
      via: "POST https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/get-app-config"
    - from: "offerletter-ask-question Lambda"
      to: "offerletter-verified-sessions DynamoDB"
      via: "table.get_item(Key={'session_id': ...})"
---

<objective>
Fix two production problems in the Interview Assistant product:

1. The web "Type Mode" tab returns fake hardcoded answers — replace with real Claude calls via a new Lambda that verifies the user's Stripe session first.
2. OpenAI and Anthropic API keys are hardcoded in the Python desktop app source — move keys to AWS Secrets Manager and fetch them at app startup via a new config Lambda.

Purpose: Paying users get real AI answers; API keys are no longer stored in source code or distributed binaries.
Output: Two new Lambdas deployed, interview.html updated and deployed to S3/CloudFront, all three Python source files updated, Mac app rebuilt.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Infrastructure verified by task author:
- API Gateway ID: 0q8mtozfra (HTTP API, us-east-1)
- Lambda role: arn:aws:iam::134607809447:role/offerletter-lambda-role (has Secrets Manager access)
- Existing secret: offerletter/production/anthropic-key (key: "key")
- DynamoDB table: offerletter-verified-sessions (key: session_id)
- S3 bucket: offerletter.ai (interview.html)
- CloudFront distribution: separate from Dollor.ai — find with: aws cloudfront list-distributions --query "DistributionList.Items[?contains(Origins.Items[*].DomainName,'offerletter')].Id"
</context>

<tasks>

<task type="auto">
  <name>Wave 1a — Deploy offerletter-ask-question Lambda + API GW route</name>
  <files>/tmp/ask-question/ask_question.py</files>
  <action>
Create /tmp/ask-question/ directory, write ask_question.py with this exact content:

```python
"""
Real-time Claude answer for interview.html manual Q&A.
Verifies session_id via DynamoDB, then calls Claude with resume context.
"""
import json
import os
import boto3
import anthropic

REGION = os.environ.get("AWS_REGION", "us-east-1")
TABLE_NAME = "offerletter-verified-sessions"
ANTHROPIC_SECRET = "offerletter/production/anthropic-key"
MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 400

CORS = {
    "Access-Control-Allow-Origin": "https://www.offerletter.ai",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}

_anthropic_key = None

def get_anthropic_key():
    global _anthropic_key
    if _anthropic_key:
        return _anthropic_key
    sm = boto3.client("secretsmanager", region_name=REGION)
    resp = sm.get_secret_value(SecretId=ANTHROPIC_SECRET)
    _anthropic_key = json.loads(resp["SecretString"])["key"]
    return _anthropic_key

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
        question   = (body.get("question") or "").strip()
        resume_text = (body.get("resume_text") or "").strip()

        if not session_id or not question:
            return {
                "statusCode": 400,
                "headers": CORS,
                "body": json.dumps({"error": "session_id and question required"}),
            }

        # Verify payment
        ddb = boto3.resource("dynamodb", region_name=REGION)
        table = ddb.Table(TABLE_NAME)
        resp = table.get_item(Key={"session_id": session_id})
        if "Item" not in resp:
            return {
                "statusCode": 403,
                "headers": CORS,
                "body": json.dumps({"error": "Purchase required"}),
            }

        # Build system prompt
        if resume_text:
            system = f"""You are a real-time interview coach. The user has uploaded their resume.
Answer the interview question in FIRST PERSON as this candidate.
Be CONCISE — 3-5 sentences they can speak naturally.
Use STAR format for behavioral questions.
Start with the strongest point.

CANDIDATE RESUME:
{resume_text[:3000]}

FORMAT:
\U0001f4ac ANSWER: [spoken answer — 3-5 sentences]
\U0001f4cc KEY POINT: [one-line differentiator to emphasize]"""
        else:
            system = """You are a real-time interview coach.
Answer the interview question concisely in first person.
Be CONCISE — 3-5 sentences. Use STAR format for behavioral questions.

FORMAT:
\U0001f4ac ANSWER: [spoken answer — 3-5 sentences]
\U0001f4cc KEY POINT: [one-line differentiator to emphasize]"""

        client = anthropic.Anthropic(api_key=get_anthropic_key())
        msg = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": f"Interview question: {question}"}],
        )
        answer = msg.content[0].text

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"answer": answer}),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS,
            "body": json.dumps({"error": str(e)}),
        }
```

Then run these commands in order:

```bash
pip install anthropic -t /tmp/ask-question/ -q
cd /tmp/ask-question && zip -r /tmp/ask-question.zip . -q

# Create Lambda (if it already exists, use update-function-code instead)
aws lambda create-function \
  --function-name offerletter-ask-question \
  --runtime python3.12 \
  --handler ask_question.handler \
  --role arn:aws:iam::134607809447:role/offerletter-lambda-role \
  --zip-file fileb:///tmp/ask-question.zip \
  --timeout 30 \
  --memory-size 256 \
  --region us-east-1 2>&1 | grep -E "(FunctionArn|ResourceConflictException)" || true

# If ResourceConflictException, update instead:
# aws lambda update-function-code --function-name offerletter-ask-question --zip-file fileb:///tmp/ask-question.zip --region us-east-1

# Add invoke permission for API Gateway
aws lambda add-permission \
  --function-name offerletter-ask-question \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:134607809447:0q8mtozfra/*/*" \
  --region us-east-1 2>&1 | grep -v "ResourceConflictException" || true

# Create API Gateway integration
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id 0q8mtozfra \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:134607809447:function:offerletter-ask-question \
  --payload-format-version 2.0 \
  --query IntegrationId --output text \
  --region us-east-1)
echo "Integration ID: $INTEGRATION_ID"

# Create POST and OPTIONS routes
aws apigatewayv2 create-route --api-id 0q8mtozfra --route-key "POST /ask-question" \
  --target "integrations/$INTEGRATION_ID" --region us-east-1
aws apigatewayv2 create-route --api-id 0q8mtozfra --route-key "OPTIONS /ask-question" \
  --target "integrations/$INTEGRATION_ID" --region us-east-1
```
  </action>
  <verify>
```bash
# Confirm Lambda exists
aws lambda get-function --function-name offerletter-ask-question --region us-east-1 --query 'Configuration.FunctionArn'

# Confirm routes registered
aws apigatewayv2 get-routes --api-id 0q8mtozfra --region us-east-1 --query 'Items[?contains(RouteKey,`ask-question`)].RouteKey'

# Test the endpoint (without valid session, expect 403)
curl -s -X POST https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/ask-question \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-invalid","question":"Tell me about yourself"}' | python3 -m json.tool
# Expected: {"error": "Purchase required"}
```
  </verify>
  <done>Lambda exists, POST /ask-question and OPTIONS /ask-question routes registered, curl with invalid session returns {"error": "Purchase required"} (403 from DynamoDB verify step).</done>
</task>

<task type="auto">
  <name>Wave 1b — Store OpenAI key in Secrets Manager + deploy offerletter-get-app-config Lambda</name>
  <files>/tmp/get-app-config/get_app_config.py</files>
  <action>
Run in parallel with Wave 1a (no dependency).

Step 1 — Store OpenAI key in Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name "offerletter/production/openai-key" \
  --secret-string '{"key":"REDACTED_KEY_STORED_IN_SECRETS_MANAGER"}' \
  --region us-east-1 2>&1 | grep -E "(ARN|ResourceExistsException)" || true
# If ResourceExistsException: secret already exists — skip, it's fine
```

Step 2 — Write get_app_config.py to /tmp/get-app-config/:

```python
"""
Returns API keys for the Interview Assistant desktop app.
Authenticated via static APP_TOKEN — rate limited to prevent abuse.
No CORS needed (called from Python, not browser).
"""
import json, os, boto3

REGION = os.environ.get("AWS_REGION", "us-east-1")
APP_TOKEN = "ia-token-8f3k2p9x"  # static token embedded in app binary
ANTHROPIC_SECRET = "offerletter/production/anthropic-key"
OPENAI_SECRET = "offerletter/production/openai-key"

def handler(event, context):
    try:
        raw = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            import base64
            raw = base64.b64decode(raw).decode("utf-8")
        body = json.loads(raw)

        if body.get("app_token") != APP_TOKEN:
            return {"statusCode": 403, "body": json.dumps({"error": "Invalid token"})}

        sm = boto3.client("secretsmanager", region_name=REGION)
        anthropic_key = json.loads(sm.get_secret_value(SecretId=ANTHROPIC_SECRET)["SecretString"])["key"]
        openai_key = json.loads(sm.get_secret_value(SecretId=OPENAI_SECRET)["SecretString"])["key"]

        return {
            "statusCode": 200,
            "body": json.dumps({"anthropic_key": anthropic_key, "openai_key": openai_key}),
        }
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
```

Step 3 — Package and deploy:
```bash
mkdir -p /tmp/get-app-config
# (write the file above to /tmp/get-app-config/get_app_config.py)
cd /tmp/get-app-config && zip -r /tmp/get-app-config.zip . -q

aws lambda create-function \
  --function-name offerletter-get-app-config \
  --runtime python3.12 \
  --handler get_app_config.handler \
  --role arn:aws:iam::134607809447:role/offerletter-lambda-role \
  --zip-file fileb:///tmp/get-app-config.zip \
  --timeout 15 \
  --memory-size 128 \
  --region us-east-1 2>&1 | grep -E "(FunctionArn|ResourceConflictException)" || true

aws lambda add-permission \
  --function-name offerletter-get-app-config \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:134607809447:0q8mtozfra/*/*" \
  --region us-east-1 2>&1 | grep -v "ResourceConflictException" || true

CONFIG_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id 0q8mtozfra \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:134607809447:function:offerletter-get-app-config \
  --payload-format-version 2.0 \
  --query IntegrationId --output text \
  --region us-east-1)

aws apigatewayv2 create-route --api-id 0q8mtozfra --route-key "POST /get-app-config" \
  --target "integrations/$CONFIG_INTEGRATION_ID" --region us-east-1
```
  </action>
  <verify>
```bash
# Confirm secret exists
aws secretsmanager describe-secret --secret-id "offerletter/production/openai-key" \
  --region us-east-1 --query 'ARN'

# Confirm Lambda exists
aws lambda get-function --function-name offerletter-get-app-config \
  --region us-east-1 --query 'Configuration.FunctionArn'

# Confirm route registered
aws apigatewayv2 get-routes --api-id 0q8mtozfra --region us-east-1 \
  --query 'Items[?contains(RouteKey,`get-app-config`)].RouteKey'

# Test with wrong token (expect 403)
curl -s -X POST https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/get-app-config \
  -H "Content-Type: application/json" \
  -d '{"app_token":"wrong-token"}' | python3 -m json.tool
# Expected: {"error": "Invalid token"}

# Test with correct token (expect 200 with keys)
curl -s -X POST https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/get-app-config \
  -H "Content-Type: application/json" \
  -d '{"app_token":"ia-token-8f3k2p9x"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('anthropic_key present:', bool(d.get('anthropic_key'))); print('openai_key present:', bool(d.get('openai_key')))"
```
  </verify>
  <done>Secret offerletter/production/openai-key exists in Secrets Manager, offerletter-get-app-config Lambda deployed, POST /get-app-config route registered, wrong token returns 403, correct token returns both keys.</done>
</task>

<task type="auto">
  <name>Wave 2a — Replace askManual() in interview.html with real Lambda call</name>
  <files>/Users/jeet/Downloads/offerletter-ai/interview.html</files>
  <action>
Read /Users/jeet/Downloads/offerletter-ai/interview.html. Locate the `askManual()` function (approximately lines 1568-1608) and the `demoAnswers` object.

Replace the entire `askManual()` function body with:

```javascript
function askManual() {
    const q = document.getElementById('manualQ').value.trim();
    if (!q) return;
    const btn = document.querySelector('[onclick="askManual()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Thinking...'; }
    const box = document.getElementById('answerBox');
    const text = document.getElementById('answerText');
    box.classList.remove('show');
    text.textContent = '';

    const sessionId = localStorage.getItem('ol_session_id') || '';
    const resumeText = localStorage.getItem('ol_resume_text') || '';

    if (!sessionId) {
        box.classList.add('show');
        text.textContent = '\u26a0\ufe0f Purchase required to use AI answers. Click the Purchase button above.';
        if (btn) { btn.disabled = false; btn.textContent = 'Ask'; }
        return;
    }

    fetch('https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/ask-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, question: q, resume_text: resumeText })
    })
    .then(r => r.json())
    .then(data => {
        box.classList.add('show');
        if (data.answer) {
            typeWriter(text, data.answer);
        } else {
            text.textContent = '\u26a0\ufe0f ' + (data.error || 'Failed to get answer. Try again.');
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Ask'; }
    })
    .catch(() => {
        box.classList.add('show');
        text.textContent = '\u26a0\ufe0f Network error. Check your connection and try again.';
        if (btn) { btn.disabled = false; btn.textContent = 'Ask'; }
    });
}
```

Also remove the `demoAnswers` object (the const/let/var block that defines it) — it is no longer referenced.

After editing, deploy to S3 and invalidate CloudFront:
```bash
aws s3 cp /Users/jeet/Downloads/offerletter-ai/interview.html \
  s3://offerletter.ai/interview.html \
  --content-type "text/html" \
  --cache-control "no-cache" \
  --region us-east-1

# Find the offerletter CloudFront distribution ID
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(to_string(Origins.Items[*].DomainName),'offerletter')].Id" \
  --output text)
echo "Distribution ID: $DIST_ID"

aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/interview.html" \
  --region us-east-1
```

Wait for the invalidation to complete (typically 30-60 seconds) before verifying.
  </action>
  <verify>
```bash
# Confirm demoAnswers is gone from deployed file
curl -s "https://www.offerletter.ai/interview.html" | grep -c "demoAnswers"
# Expected: 0

# Confirm real fetch endpoint is present
curl -s "https://www.offerletter.ai/interview.html" | grep -c "ask-question"
# Expected: 1 or more

# Confirm no hardcoded fake answer strings remain (e.g. "I have X years of experience")
# grep for the askManual function to see it now calls fetch
curl -s "https://www.offerletter.ai/interview.html" | grep -A5 "function askManual"
# Should show fetch call to execute-api endpoint
```
  </verify>
  <done>interview.html deployed to S3, CloudFront invalidation complete, deployed page contains real fetch to /ask-question endpoint, demoAnswers object removed.</done>
</task>

<task type="auto">
  <name>Wave 2b — Remove hardcoded API keys from all 3 Python source files + rebuild Mac app</name>
  <files>
    /Users/jeet/Downloads/interview-assistant/interview_assistant.py
    /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py
    /Users/jeet/Downloads/interview-assistant/interview_server.py
  </files>
  <action>
For each of the three Python files, replace the hardcoded key assignments with a startup fetch function.

**Pattern to find and replace** (varies slightly per file):

Find lines like:
```python
OPENAI_API_KEY = "sk-proj-..."
ANTHROPIC_API_KEY = "sk-ant-api03-..."
```
or the `try: from config import ... except ModuleNotFoundError: ...` block in interview_server.py.

Replace with (add near top of file, after existing imports):
```python
import urllib.request as _urllib_request
import json as _json

APP_TOKEN = "ia-token-8f3k2p9x"
CONFIG_URL = "https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/get-app-config"

def _fetch_api_keys():
    """Fetch API keys from config server at startup."""
    try:
        req = _urllib_request.Request(
            CONFIG_URL,
            data=_json.dumps({"app_token": APP_TOKEN}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with _urllib_request.urlopen(req, timeout=10) as resp:
            data = _json.loads(resp.read())
        return data["openai_key"], data["anthropic_key"]
    except Exception as e:
        print(f"\u26a0\ufe0f  Could not fetch API config: {e}")
        raise SystemExit("Cannot start: failed to load API configuration. Check your internet connection.")

OPENAI_API_KEY, ANTHROPIC_API_KEY = _fetch_api_keys()
```

Then replace the existing client initializations (wherever they reference the old hardcoded variables):
```python
openai_client    = OpenAI(api_key=OPENAI_API_KEY)
anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
```
These lines likely already exist — just ensure they come AFTER the `_fetch_api_keys()` call.

For `interview_server.py` specifically: remove the `try: from config import ... except ModuleNotFoundError: OPENAI_API_KEY = "..."` block entirely and replace with the pattern above.

After updating all 3 source files, verify no hardcoded keys remain:
```bash
grep -n "sk-proj-\|sk-ant-api03-" \
  /Users/jeet/Downloads/interview-assistant/interview_assistant.py \
  /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py \
  /Users/jeet/Downloads/interview-assistant/interview_server.py
# Expected: no output (zero matches)
```

Then rebuild the Mac app:
```bash
cd /Users/jeet/Downloads/interview-assistant
pyinstaller InterviewAssistant.spec --clean --noconfirm 2>&1 | tail -20
# Confirm dist/ output exists
ls -la dist/
```

If a `sign_notarize_upload.sh` script exists, run it to sign, notarize, and upload the new DMG:
```bash
ls /Users/jeet/Downloads/interview-assistant/sign_notarize_upload.sh && \
  bash /Users/jeet/Downloads/interview-assistant/sign_notarize_upload.sh
```

Note: The Windows EXE (`interview_assistant_windows.py`) source has been updated but rebuilding the Windows binary requires a Windows machine or cross-compilation environment — that rebuild is out of scope for this task. The source file is clean; rebuild when Windows build environment is available.
  </action>
  <verify>
```bash
# Zero hardcoded keys in all 3 files
grep -c "sk-proj-\|sk-ant-api03-" \
  /Users/jeet/Downloads/interview-assistant/interview_assistant.py \
  /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py \
  /Users/jeet/Downloads/interview-assistant/interview_server.py
# All counts should be 0

# _fetch_api_keys present in all 3 files
grep -l "_fetch_api_keys" \
  /Users/jeet/Downloads/interview-assistant/interview_assistant.py \
  /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py \
  /Users/jeet/Downloads/interview-assistant/interview_server.py
# Should list all 3 files

# Mac build exists
ls /Users/jeet/Downloads/interview-assistant/dist/ 2>/dev/null
```
  </verify>
  <done>All 3 Python source files contain zero hardcoded API key strings, all 3 contain _fetch_api_keys() startup fetch, Mac app rebuilt successfully from clean source.</done>
</task>

</tasks>

<verification>
End-to-end verification checklist:

1. Lambda ask-question: `curl -X POST .../ask-question -d '{"session_id":"invalid","question":"test"}' → {"error":"Purchase required"}` (DynamoDB gate working)
2. Lambda get-app-config: `curl -X POST .../get-app-config -d '{"app_token":"ia-token-8f3k2p9x"}' → {"anthropic_key":"sk-ant-...","openai_key":"sk-proj-..."}` (keys retrieved from Secrets Manager)
3. interview.html deployed: `curl https://www.offerletter.ai/interview.html | grep ask-question` → endpoint URL present; `grep demoAnswers` → 0 matches
4. Python sources clean: `grep -r "sk-proj-\|sk-ant-api03-" interview_assistant*.py interview_server.py` → 0 matches
5. Mac binary rebuilt: `ls dist/` shows new artifact
</verification>

<success_criteria>
- Paying web users (valid ol_session_id) receive real Claude answers in the Type Mode tab
- Unpaid web users see a purchase-required prompt instead of fake answers
- No API key strings appear in any Python source file
- Desktop app fetches keys at startup from the config Lambda (verified by grep)
- Both new Lambdas deployed and reachable via API Gateway
- Mac app rebuilt from clean source
</success_criteria>

<output>
After completion, create `.planning/quick/226-fix-fake-web-answers-real-claude-via-lam/226-SUMMARY.md` with what was built, files changed, and verification proof.
</output>
