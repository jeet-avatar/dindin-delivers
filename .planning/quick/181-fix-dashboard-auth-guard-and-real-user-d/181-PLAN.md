---
phase: quick-181
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Downloads/offerletter-ai/dashboard.html
  - /Users/jeet/Downloads/offerletter-ai/offer.html
  - /Users/jeet/Downloads/offerletter-ai/lambda/offer_analysis.py
  - /Users/jeet/Downloads/offerletter-ai/lambda/requirements.txt
  - /Users/jeet/Downloads/offerletter-ai/lambda/deploy.sh
  - /Users/jeet/Downloads/offerletter-ai/lambda/setup-aws.sh
  - /Users/jeet/Downloads/offerletter-ai/.github/workflows/deploy-production.yml
autonomous: true
requirements: [QUICK-181]

must_haves:
  truths:
    - "dashboard.html redirects unauthenticated users to /login.html"
    - "dashboard.html shows real first name from Cognito in welcome heading and avatar"
    - "offer.html has no API key bar, modal, or KEY_STORE logic"
    - "offer.html posts to a Lambda endpoint instead of direct Anthropic API"
    - "Lambda function exists at lambda/offer_analysis.py and reads Anthropic key from Secrets Manager"
    - "setup-aws.sh automates IAM role + Lambda + API Gateway creation from scratch"
    - "deploy.sh handles subsequent Lambda code updates"
    - "deploy-production.yml includes a Lambda deploy step after S3 sync"
  artifacts:
    - path: "/Users/jeet/Downloads/offerletter-ai/dashboard.html"
      provides: "Auth guard + real user display"
      contains: "Auth.requireAuth()"
    - path: "/Users/jeet/Downloads/offerletter-ai/offer.html"
      provides: "Lambda-backed offer analysis, no user API key needed"
      contains: "ANALYZE_API"
    - path: "/Users/jeet/Downloads/offerletter-ai/lambda/offer_analysis.py"
      provides: "Server-side Claude analysis via Secrets Manager"
      exports: ["handler"]
    - path: "/Users/jeet/Downloads/offerletter-ai/lambda/setup-aws.sh"
      provides: "One-shot AWS infrastructure setup"
    - path: "/Users/jeet/Downloads/offerletter-ai/lambda/deploy.sh"
      provides: "Subsequent Lambda code deploys"
  key_links:
    - from: "dashboard.html bottom script"
      to: "auth.js Auth.requireAuth()"
      via: "direct JS call"
    - from: "offer.html callClaude()"
      to: "ANALYZE_API Lambda endpoint"
      via: "fetch POST with {offer_text, role, city}"
    - from: "offer_analysis.py handler"
      to: "Secrets Manager offerletter/production/anthropic-key"
      via: "boto3 get_secret_value"
---

<objective>
Fix dashboard auth guard to redirect unauthenticated visitors, show real Cognito user name/avatar, and remove the user-facing API key requirement from offer.html by moving Claude calls server-side into a Lambda function.

Purpose: Dashboard currently shows hardcoded "J" avatar with no auth guard — any URL visitor sees it. Offer analyzer currently requires users to obtain and paste their own Anthropic API key — a conversion killer. Lambda solves both problems.

Output: dashboard.html with auth guard + real user display. offer.html with API key UI removed and Lambda endpoint wired in. lambda/ directory with deployable function + infrastructure scripts. deploy-production.yml updated with Lambda deploy step.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
All files are in /Users/jeet/Downloads/offerletter-ai/ — NOT in the doordash-p2p repo.

Key facts from reading the source files:
- dashboard.html line 128: `<script src="consent.js"></script>` — this is the last script before </body>. Auth script block goes BEFORE this line (auth.js is NOT currently loaded in dashboard.html — it must be added as a <script src="auth.js"></script> tag first).
- dashboard.html line 49: `<span class="trial-badge">Free Trial — 7 days left</span>`
- dashboard.html line 50: `<div class="avatar">J</div>`
- dashboard.html line 56: `<h1>Welcome back 👋</h1>`
- auth.js: Auth.requireAuth() at line 376, Auth.getUser() at line 188, Auth.signOut() at line 143. getUser() returns object with Cognito attributes. Name attribute is stored as `name` (single field, full name).
- offer.html line 571-582: apikey-bar div (to remove)
- offer.html line 805-827: keyModal div (to remove)
- offer.html line 896-939: KEY_STORE, loadKey, saveKey, updateKeyBar, openKeyModal, closeKeyModal functions (to remove)
- offer.html line 1078-1113: callClaude() — currently calls api.anthropic.com directly (to replace)
- offer.html line 1128-1129: `const key = loadKey(); if (!key) { openKeyModal(); return; }` in runAnalysis() (to remove)
- offer.html line 1257-1262: NO_KEY and INVALID_KEY error cases in showError() (to remove/update)
- offer.html line 1347: `updateKeyBar();` init call (to remove)
- deploy-production.yml: S3 sync is jobs.deploy, steps end at line ~119. Lambda deploy step goes after the "Deploy static assets" step and before the CloudFront invalidation step.
- CORS origin for Lambda: https://www.offerletter.ai
- AWS account ID: 134607809447 (from MEMORY.md ECR URL)
- Region: us-east-1 (from auth.js COGNITO_REGION)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add auth guard + real user display to dashboard.html</name>
  <files>/Users/jeet/Downloads/offerletter-ai/dashboard.html</files>
  <action>
dashboard.html currently has NO auth.js loaded and NO auth guard. Make these changes:

1. Before `<script src="consent.js"></script>` (line 128), insert a script tag to load auth.js:
   ```html
   <script src="auth.js"></script>
   ```

2. After the auth.js script tag and before `<script src="consent.js"></script>`, insert a new inline script block:
   ```html
   <script>
     // Auth guard — redirect to login if not authenticated
     if (!Auth.requireAuth()) {
       // requireAuth() already redirected — stop here
       throw new Error('redirect');
     }

     // Load real user from Cognito
     Auth.getUser().then(function(user) {
       if (!user) {
         Auth.signOut();
         return;
       }

       var fullName = (user.name || user.email || '').trim();
       var firstName = fullName
         ? fullName.split(' ')[0]
         : (user.email ? user.email.split('@')[0] : 'there');

       var initial = firstName[0] ? firstName[0].toUpperCase() : '?';

       document.querySelector('.welcome h1').textContent = 'Welcome back, ' + firstName + ' \uD83D\uDC4B';
       document.querySelector('.avatar').textContent = initial;
       document.querySelector('.trial-badge').textContent = 'Free Trial';
     }).catch(function() {
       Auth.signOut();
     });
   </script>
   ```

Note on Auth.getUser() return shape: getUser() returns the Cognito GetUser response which includes a UserAttributes array. The auth.js getUser method (line 188) likely returns a flat object — check auth.js getUser implementation. If it returns `{name, email, sub, ...}` use `user.name`. If it returns raw Cognito `{UserAttributes: [...]}`, extract with `UserAttributes.find(a => a.Name === 'name').Value`. Read auth.js getUser() body (lines 188-215) before writing to confirm the return shape, then use the correct field.

The emoji in the welcome heading uses a unicode escape `\uD83D\uDC4B` (the waving hand) to avoid any encoding issues in the file.
  </action>
  <verify>
    Open dashboard.html in a browser while NOT logged in — should redirect to /login.html.
    Log in as a test user, navigate to dashboard.html — should show real first name in h1 and correct initial in avatar circle.
    Check browser console — no JS errors.
  </verify>
  <done>
    Unauthenticated visit redirects to /login.html. Authenticated visit shows "Welcome back, [FirstName]" and correct avatar initial from Cognito name attribute.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create Lambda files (offer_analysis.py, requirements.txt, deploy.sh, setup-aws.sh)</name>
  <files>
    /Users/jeet/Downloads/offerletter-ai/lambda/offer_analysis.py
    /Users/jeet/Downloads/offerletter-ai/lambda/requirements.txt
    /Users/jeet/Downloads/offerletter-ai/lambda/deploy.sh
    /Users/jeet/Downloads/offerletter-ai/lambda/setup-aws.sh
  </files>
  <action>
Create /Users/jeet/Downloads/offerletter-ai/lambda/ directory and four files:

**offer_analysis.py** — exact code from spec (see planning_context Task 2a). The build_prompt() function must use the same system + user message structure as the existing offer.html SYSTEM_PROMPT (lines 1020-1076 in offer.html) and callClaude() (lines 1078-1113). Read those lines first to copy the exact prompt text. Key difference: Lambda version puts both system instructions and role/city context into a single user message since the spec shows a single-message structure. The model should be `claude-haiku-4-5-20251001` (cheaper than sonnet for this use case per spec).

**requirements.txt** — exact content from spec (Task 2b):
```
anthropic==0.40.0
boto3==1.35.0
```

**deploy.sh** — exact content from spec (Task 2c). Make executable with chmod +x. The ROLE_ARN uses account 134607809447.

**setup-aws.sh** — create this script per spec (Task 2d). Full script that:
1. Creates IAM role `offerletter-lambda-role` with lambda.amazonaws.com trust policy
2. Attaches AWSLambdaBasicExecutionRole managed policy
3. Adds inline policy granting `secretsmanager:GetSecretValue` on `arn:aws:secretsmanager:us-east-1:134607809447:secret:offerletter/production/anthropic-key*`
4. Sleeps 10s for IAM propagation
5. Runs the Lambda create (same logic as deploy.sh create branch)
6. Creates API Gateway v2 HTTP API named `offerletter-offer-analysis-api`
7. Creates Lambda integration (payload format version 1.0 for event.httpMethod compatibility)
8. Creates POST /analyze route with Lambda integration
9. Creates $default stage with auto-deploy true
10. Adds Lambda resource-based permission for API Gateway invoke
11. Creates Secrets Manager secret `offerletter/production/anthropic-key` with value `{"key": "REPLACE_ME"}` — uses `--secret-string` flag. If secret already exists, skip with `|| true`
12. Prints the final invoke URL: `https://{api-id}.execute-api.us-east-1.amazonaws.com/analyze`
13. Prints reminder: "Update ANALYZE_API in offer.html with the URL above, then set the real key: aws secretsmanager put-secret-value --secret-id offerletter/production/anthropic-key --secret-string '{\"key\":\"sk-ant-...\"}'"

Make setup-aws.sh executable with chmod +x.
  </action>
  <verify>
    ls -la /Users/jeet/Downloads/offerletter-ai/lambda/ — all 4 files present, deploy.sh and setup-aws.sh are executable.
    python3 -c "import ast; ast.parse(open('lambda/offer_analysis.py').read()); print('syntax OK')" — no syntax errors.
    grep "offerletter/production/anthropic-key" /Users/jeet/Downloads/offerletter-ai/lambda/offer_analysis.py — secret name present.
    grep "ANALYZE_API\|execute-api" /Users/jeet/Downloads/offerletter-ai/lambda/setup-aws.sh — URL output step present.
  </verify>
  <done>
    Four files exist in lambda/. offer_analysis.py has valid Python syntax. setup-aws.sh creates the full AWS infrastructure in one run. deploy.sh handles code-only updates.
  </done>
</task>

<task type="auto">
  <name>Task 3: Remove API key UI from offer.html and wire Lambda endpoint</name>
  <files>
    /Users/jeet/Downloads/offerletter-ai/offer.html
    /Users/jeet/Downloads/offerletter-ai/.github/workflows/deploy-production.yml
  </files>
  <action>
**offer.html changes** (read the full file before editing to get exact line numbers):

1. Remove the `.apikey-bar { ... }` CSS block (around lines 124-136 — find by searching `.apikey-bar {`). Also remove `.apikey-bar-left`, `.apikey-status-dot`, `.apikey-label`, `.apikey-hint`, `.apikey-change-btn` CSS rules that follow it.

2. Remove the HTML `<div class="apikey-bar" id="apikeyBar">...</div>` block (lines 571-582).

3. Remove the HTML `<div class="modal-backdrop" id="keyModal" ...>...</div>` block (lines 805-827) and any CSS rules for `.modal-backdrop`, `.modal`, `.modal-title`, `.modal-sub`, `.modal-input`, `.modal-note`, `.modal-actions`, `.modal-cancel`, `.modal-save`.

4. In the `<script>` block, remove these JS sections:
   - `const KEY_STORE = 'ol_api_key';` and the `loadKey()` function
   - `saveKey()` function
   - `updateKeyBar()` function
   - `openKeyModal()` function
   - `closeKeyModal()` function
   - The `document.getElementById('keyModal').addEventListener(...)` click-outside handler
   - The `updateKeyBar();` init call at line 1347

5. Add `const ANALYZE_API = 'https://LAMBDA_URL.execute-api.us-east-1.amazonaws.com/analyze';` at the top of the script block, just after the opening `<script>` tag. (Placeholder — user updates after running setup-aws.sh.)

6. Replace the entire `callClaude(offerText, role, city)` function with a new version that POSTs to ANALYZE_API:
   ```javascript
   async function callClaude(offerText, role, city) {
     const resp = await fetch(ANALYZE_API, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ offer_text: offerText, role: role, city: city })
     });
     if (!resp.ok) {
       const err = await resp.json().catch(() => ({}));
       if (resp.status === 429) throw new Error('RATE_LIMIT');
       throw new Error(err.error || 'API error ' + resp.status);
     }
     const data = await resp.json();
     // Lambda returns the parsed result directly
     return data;
   }
   ```

7. In `runAnalysis()`, remove the two lines:
   ```javascript
   const key = loadKey();
   if (!key) { openKeyModal(); return; }
   ```

8. In `showError()`, remove the `NO_KEY` and `INVALID_KEY` error branches (they no longer apply). Keep the RATE_LIMIT and JSON parse error branches.

**deploy-production.yml changes:**

After the "Deploy static assets" step (which ends around line 98) and BEFORE the "Invalidate CloudFront cache" step, insert a new step:

```yaml
      # ── Deploy Lambda (offer analysis) ────────────────────────────────────────
      - name: Deploy Lambda (offer analysis)
        run: |
          cd lambda
          pip install -r requirements.txt -t package/ --quiet
          cp offer_analysis.py package/
          cd package && zip -r ../function.zip . -x "*.pyc" -x "__pycache__/*" > /dev/null && cd ..
          aws lambda update-function-code \
            --function-name offerletter-offer-analysis \
            --zip-file fileb://function.zip \
            --region ${{ secrets.AWS_REGION }} || echo "Lambda not yet created — run lambda/setup-aws.sh first"
```
  </action>
  <verify>
    grep -n "apikey-bar\|KEY_STORE\|openKeyModal\|saveKey\|updateKeyBar" /Users/jeet/Downloads/offerletter-ai/offer.html — should return 0 results.
    grep -n "ANALYZE_API\|callClaude" /Users/jeet/Downloads/offerletter-ai/offer.html — ANALYZE_API constant and updated callClaude() present.
    grep -n "Deploy Lambda" /Users/jeet/Downloads/offerletter-ai/.github/workflows/deploy-production.yml — Lambda step present.
    Open offer.html in browser — no API key bar visible, no modal. Click "Analyze" on sample text — request goes to ANALYZE_API (will fail with network error since Lambda not deployed yet, which is expected).
  </verify>
  <done>
    offer.html has zero references to apikey-bar, KEY_STORE, openKeyModal. callClaude() POSTs to ANALYZE_API. deploy-production.yml Lambda step present. User can run lambda/setup-aws.sh to provision infrastructure, update ANALYZE_API constant, and set the real Anthropic key in Secrets Manager.
  </done>
</task>

</tasks>

<verification>
1. dashboard.html — `grep -n "requireAuth\|getUser\|auth.js" /Users/jeet/Downloads/offerletter-ai/dashboard.html` shows auth.js script tag and both auth calls.
2. offer.html — `grep -c "apikey\|KEY_STORE\|openKeyModal" /Users/jeet/Downloads/offerletter-ai/offer.html` returns 0.
3. offer.html — `grep -n "ANALYZE_API" /Users/jeet/Downloads/offerletter-ai/offer.html` returns the constant and the fetch call.
4. lambda/ — all 4 files exist, deploy.sh and setup-aws.sh are executable.
5. deploy-production.yml — `grep -n "Deploy Lambda" /Users/jeet/Downloads/offerletter-ai/.github/workflows/deploy-production.yml` returns the step.
</verification>

<success_criteria>
- dashboard.html: unauthenticated users are redirected to /login.html; authenticated users see their real first name and initial
- offer.html: zero API key UI elements remain; callClaude() POSTs to ANALYZE_API constant
- lambda/offer_analysis.py: valid Python, reads key from Secrets Manager, returns structured JSON
- lambda/setup-aws.sh: creates IAM role + Lambda + API Gateway in one run, outputs final URL
- lambda/deploy.sh: updates Lambda code only (for CI/CD use)
- deploy-production.yml: Lambda deploy step present, gracefully skips if Lambda not yet created via setup-aws.sh
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/181-fix-dashboard-auth-guard-and-real-user-d/181-SUMMARY.md` with what was done, files changed, and the ANALYZE_API placeholder reminder for the user.

Commit changes to the offerletter-ai git repo (cd /Users/jeet/Downloads/offerletter-ai && git add -A && git commit).
Do NOT commit to the doordash-p2p repo.
</output>
