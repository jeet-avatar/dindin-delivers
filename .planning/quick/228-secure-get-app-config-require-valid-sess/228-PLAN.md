---
phase: quick-228
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /tmp/gac-lambda/get_app_config.py
  - /Users/jeet/Downloads/interview-assistant/interview_assistant.py
  - /Users/jeet/Downloads/interview-assistant/interview_server.py
  - /Users/jeet/doordash-p2p/apps/interview-assistant/interview_assistant_windows.py
  - /Users/jeet/Downloads/offerletter-ai/interview.html
autonomous: true
requirements: [Q-228]

must_haves:
  truths:
    - "Lambda returns 403 with helpful message when session_id is missing or not in DynamoDB"
    - "Lambda returns 403 when session_id exists but expires_at is in the past"
    - "Lambda returns 200 with API keys only when session_id is valid and unexpired"
    - "Mac desktop app reads license from ~/.oa-license, prompts tkinter dialog if missing, saves on success"
    - "Windows desktop app does the same with tkinter dialog"
    - "Phone server prompts via stdin if no license file"
    - "interview.html shows license key section after purchase, with copy button"
  artifacts:
    - path: "/tmp/gac-lambda/get_app_config.py"
      provides: "Lambda handler with DynamoDB session validation"
      contains: "offerletter-verified-sessions"
    - path: "/Users/jeet/Downloads/interview-assistant/interview_assistant.py"
      provides: "Mac app license key fetch"
      contains: "_get_license_key"
    - path: "/Users/jeet/Downloads/interview-assistant/interview_server.py"
      provides: "Phone server license key fetch"
      contains: "_get_license_key"
    - path: "/Users/jeet/doordash-p2p/apps/interview-assistant/interview_assistant_windows.py"
      provides: "Windows app license key fetch"
      contains: "_get_license_key"
    - path: "/Users/jeet/Downloads/offerletter-ai/interview.html"
      provides: "Post-purchase license key display UI"
      contains: "licenseKeySection"
  key_links:
    - from: "interview_assistant.py _fetch_api_keys()"
      to: "Lambda /get-app-config"
      via: "POST with session_id in body"
      pattern: "session_id.*session_id"
    - from: "Lambda handler"
      to: "DynamoDB offerletter-verified-sessions"
      via: "db.get_item"
      pattern: "get_item.*TABLE_NAME"
    - from: "interview.html unlockDownload()"
      to: "licenseKeySection"
      via: "localStorage.getItem('ol_session_id')"
      pattern: "ol_session_id"
---

<objective>
Secure the get-app-config Lambda so it requires a valid DynamoDB session_id (from Stripe purchase) alongside the static app_token. Update all four app entry points to read/prompt for the license key and pass it. Display the license key on interview.html after purchase.

Purpose: The static app_token is embedded in every binary — any user can extract it and steal API keys. Tying access to a per-purchase session_id means only paid users can retrieve keys.
Output: Lambda that validates sessions, four client files that pass session_id, interview.html that shows the key post-purchase, Windows EXE rebuild triggered.
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
  <name>Task 1: Update Lambda to validate session_id against DynamoDB</name>
  <files>/tmp/gac-lambda/get_app_config.py</files>
  <action>
Replace the entire contents of `/tmp/gac-lambda/get_app_config.py` with the new handler that:
1. Checks `app_token` as before (returns 403 "Invalid token" if wrong)
2. Reads `session_id` from the request body — if missing or empty, returns 403 with message: "License key required. Get yours at offerletter.ai/interview after purchasing."
3. Calls `boto3.client("dynamodb").get_item(TableName="offerletter-verified-sessions", Key={"session_id": {"S": session_id}})` — if no item found, returns 403 "License key not found. Purchase at offerletter.ai to get yours."
4. Checks `expires_at` TTL field: if `time.time() > expires_at`, returns 403 "License key expired. Contact support@offerletter.ai"
5. On valid session: fetches Anthropic + OpenAI keys from Secrets Manager as before and returns 200

Full replacement code is provided verbatim in the planning context above. Use it exactly.

After writing the file, re-zip and deploy:
```
cd /tmp/gac-lambda && zip -r ../gac-new.zip . && aws lambda update-function-code --function-name offerletter-get-app-config --zip-file fileb:///tmp/gac-new.zip
```

Wait for the update to complete, then smoke-test:
```bash
# Should return 403 (no session_id)
curl -s -X POST "https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/get-app-config" \
  -H "Content-Type: application/json" \
  -d '{"app_token":"ia-token-8f3k2p9x"}' | python3 -m json.tool

# Should return 403 (wrong token)
curl -s -X POST "https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/get-app-config" \
  -H "Content-Type: application/json" \
  -d '{"app_token":"wrong","session_id":"fake"}' | python3 -m json.tool

# Should return 403 (session not in DynamoDB)
curl -s -X POST "https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/get-app-config" \
  -H "Content-Type: application/json" \
  -d '{"app_token":"ia-token-8f3k2p9x","session_id":"cs_fake_session_999"}' | python3 -m json.tool
```
  </action>
  <verify>
All three curl commands above return 403 with the correct error messages. Lambda update-function-code shows "State": "Active" or similar success output. No 500 errors.
  </verify>
  <done>Lambda returns 403 for missing session_id, wrong token, and invalid session. Lambda update deployed successfully.</done>
</task>

<task type="auto">
  <name>Task 2: Update all four client files to send session_id</name>
  <files>
    /Users/jeet/Downloads/interview-assistant/interview_assistant.py
    /Users/jeet/Downloads/interview-assistant/interview_server.py
    /Users/jeet/doordash-p2p/apps/interview-assistant/interview_assistant_windows.py
  </files>
  <action>
For each file, locate the existing `_fetch_api_keys()` function (and any `_APP_TOKEN`/`_CONFIG_URL` constants at module level) and replace with the new versions provided in the planning context. Do NOT touch any other functions.

**File 1: `/Users/jeet/Downloads/interview-assistant/interview_assistant.py`**
- Add/update module-level constants: `_APP_TOKEN`, `_CONFIG_URL`, `_LICENSE_FILE = os.path.expanduser("~/.oa-license")`
- Add new function `_get_license_key()` — reads `~/.oa-license`, falls back to tkinter `simpledialog.askstring`, saves on success, raises `SystemExit` if cancelled
- Replace `_fetch_api_keys()` — calls `_get_license_key()`, POSTs `{"app_token": _APP_TOKEN, "session_id": session_id}` to `_CONFIG_URL`, handles errors
- The file already uses tkinter so no new imports needed at the top level

**File 2: `/Users/jeet/Downloads/interview-assistant/interview_server.py`**
- Same constants and `_LICENSE_FILE`
- Add `_get_license_key()` — stdin prompt version (no tkinter), saves to `~/.oa-license`
- Replace `_fetch_api_keys()` with same pattern

**File 3: `/Users/jeet/doordash-p2p/apps/interview-assistant/interview_assistant_windows.py`**
- Same constants and `_LICENSE_FILE`
- Add `_get_license_key()` — tkinter simpledialog version (same as Mac, Windows-compatible)
- Replace `_fetch_api_keys()` with same pattern

Use the exact code from the planning context for all three files. After editing, verify each file has `_get_license_key` defined and `session_id` in the POST body:
```bash
grep -n "_get_license_key\|session_id\|_LICENSE_FILE" \
  /Users/jeet/Downloads/interview-assistant/interview_assistant.py \
  /Users/jeet/Downloads/interview-assistant/interview_server.py \
  /Users/jeet/doordash-p2p/apps/interview-assistant/interview_assistant_windows.py
```
  </action>
  <verify>
grep output shows `_get_license_key`, `session_id`, and `_LICENSE_FILE` present in all three files. No syntax errors: `python3 -m py_compile /Users/jeet/Downloads/interview-assistant/interview_assistant.py && python3 -m py_compile /Users/jeet/Downloads/interview-assistant/interview_server.py && python3 -m py_compile /Users/jeet/doordash-p2p/apps/interview-assistant/interview_assistant_windows.py && echo "all OK"`
  </verify>
  <done>All three Python files compile cleanly and contain _get_license_key() + session_id in the POST body. Windows file committed to repo.</done>
</task>

<task type="auto">
  <name>Task 3: Add license key UI to interview.html, deploy to S3, and trigger Windows build</name>
  <files>/Users/jeet/Downloads/offerletter-ai/interview.html</files>
  <action>
**Step 1 — Edit interview.html:**
Open `/Users/jeet/Downloads/offerletter-ai/interview.html` and make two additions:

1. Add the `licenseKeySection` HTML block (green card with license key display and Copy Key button) inside the Mac panel, after the download card and before the walkthrough video section. Use the exact HTML from the planning context.

2. In the existing `unlockDownload()` JS function, add the license key reveal snippet at the end: reads `localStorage.getItem('ol_session_id')`, sets `licenseKeyValue` textContent, shows `licenseKeySection`. Use the exact JS from the planning context.

3. Add the `copyLicenseKey()` JS function near `unlockDownload()`. Use the exact code from the planning context.

Verify the additions:
```bash
grep -n "licenseKeySection\|licenseKeyValue\|copyLicenseKey\|ol_session_id" \
  /Users/jeet/Downloads/offerletter-ai/interview.html
```

**Step 2 — Deploy interview.html to S3:**
```bash
aws s3 cp /Users/jeet/Downloads/offerletter-ai/interview.html \
  s3://offerletter-static/interview.html \
  --content-type "text/html" \
  --cache-control "no-cache, max-age=0"
```
If the bucket name differs, check with: `aws s3 ls | grep offerletter`

**Step 3 — CloudFront invalidation:**
```bash
# Find the offerletter distribution
aws cloudfront list-distributions --query "DistributionList.Items[?contains(Origins.Items[0].DomainName,'offerletter')].{ID:Id,Domain:DomainName}" --output table

# Invalidate (replace DIST_ID with the correct ID)
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/interview.html"
```

**Step 4 — Commit Windows file and trigger rebuild:**
```bash
cd /Users/jeet/doordash-p2p
git add apps/interview-assistant/interview_assistant_windows.py
git commit -m "feat(Q-228): secure get-app-config with DynamoDB session validation — Windows app updated"
git push origin main
gh workflow run build-interview-assistant-windows.yml --ref main
```

Monitor: `gh run list --workflow=build-interview-assistant-windows.yml --limit 3`
  </action>
  <verify>
1. `grep -c "licenseKeySection" /Users/jeet/Downloads/offerletter-ai/interview.html` returns ≥ 2 (HTML element + JS reference)
2. S3 upload returns success (no error output)
3. CloudFront invalidation shows "InProgress" or "Completed" status
4. `gh run list --workflow=build-interview-assistant-windows.yml --limit 3` shows a new run triggered
  </verify>
  <done>interview.html deployed to S3 with license key UI. Windows EXE rebuild triggered via GitHub Actions. Git commit pushed with Windows Python file.</done>
</task>

</tasks>

<verification>
Full verification checklist:

- [ ] Lambda smoke test: missing session_id → 403 "License key required"
- [ ] Lambda smoke test: invalid session → 403 "License key not found"
- [ ] Lambda smoke test: wrong token → 403 "Invalid token"
- [ ] grep confirms _get_license_key + session_id in all 3 Python files
- [ ] python3 -m py_compile passes on all 3 Python files
- [ ] grep confirms licenseKeySection + ol_session_id in interview.html
- [ ] S3 upload succeeded, CloudFront invalidation triggered
- [ ] Windows build workflow running in GitHub Actions
- [ ] Git commit with Windows file pushed to main
</verification>

<success_criteria>
- Any request to get-app-config without a valid paid session_id receives a 403 with a user-friendly message pointing to offerletter.ai/interview
- Paid users: app reads ~/.oa-license, prompts once on first launch, then works silently
- Post-purchase page shows the session_id as a copyable license key
- Windows EXE rebuild queued so next distributable enforces the new flow
</success_criteria>

<output>
After completion, create `.planning/quick/228-secure-get-app-config-require-valid-sess/228-SUMMARY.md`
</output>
