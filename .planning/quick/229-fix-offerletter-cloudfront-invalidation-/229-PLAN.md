---
phase: quick-229
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/interview-assistant/InterviewAssistant_Windows.spec
  - .github/workflows/build-interview-assistant-windows.yml
autonomous: true
requirements: [Q-229]
must_haves:
  truths:
    - "S3 key has no space: downloads/InterviewAssistant.exe"
    - "CloudFront invalidation path /downloads/InterviewAssistant.exe succeeds (no InvalidArgument)"
    - "Lambda verify-payment generates pre-signed URL pointing to new no-space S3 key"
    - "GitHub Actions workflow builds, uploads, and invalidates using new filename"
    - "Windows users can download the EXE via the post-payment flow"
  artifacts:
    - path: "apps/interview-assistant/InterviewAssistant_Windows.spec"
      provides: "PyInstaller spec with name=InterviewAssistant (no space)"
      contains: "name='InterviewAssistant'"
    - path: ".github/workflows/build-interview-assistant-windows.yml"
      provides: "GitHub Actions workflow using InterviewAssistant.exe"
      contains: "InterviewAssistant.exe"
  key_links:
    - from: "Lambda offerletter-verify-payment"
      to: "s3://offerletter.ai/downloads/InterviewAssistant.exe"
      via: "S3_KEY_WIN constant updated in Lambda"
    - from: ".github/workflows/build-interview-assistant-windows.yml"
      to: "CloudFront E319UG6B4QE97L /downloads/InterviewAssistant.exe"
      via: "create-invalidation with no-space path"
---

<objective>
Fix CloudFront cache invalidation failure caused by a space in the EXE filename. Rename the S3 object from `downloads/Interview Assistant.exe` to `downloads/InterviewAssistant.exe`, update the Lambda verify-payment function to use the new key, update the PyInstaller spec to produce the no-space filename, and fix the GitHub Actions workflow to upload and invalidate using the new path.

Purpose: CloudFront's `create-invalidation` rejects paths with unencoded spaces, silently serving stale downloads. Windows users get an outdated EXE until cache expires (24h+).
Output: No-space S3 key, working CF invalidation, updated Lambda, updated workflow, updated spec.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rename S3 key and update Lambda verify-payment</name>
  <files>/tmp/gac-lambda/verify_payment.py (Lambda source to redeploy)</files>
  <action>
**Step 1 — Rename the S3 object (copy + delete, no downtime):**
```bash
aws s3 cp "s3://offerletter.ai/downloads/Interview Assistant.exe" \
  "s3://offerletter.ai/downloads/InterviewAssistant.exe" \
  --content-type "application/octet-stream" \
  --content-disposition 'attachment; filename="InterviewAssistant.exe"' \
  --cache-control "no-cache" \
  --region us-east-1

aws s3 rm "s3://offerletter.ai/downloads/Interview Assistant.exe" --region us-east-1
```

**Step 2 — Verify new key exists, old key gone:**
```bash
aws s3 ls s3://offerletter.ai/downloads/ --region us-east-1
```
Expect: `InterviewAssistant.exe` present, `Interview Assistant.exe` absent.

**Step 3 — Invalidate CF cache for new path:**
```bash
aws cloudfront create-invalidation \
  --distribution-id E319UG6B4QE97L \
  --paths "/downloads/InterviewAssistant.exe"
```
This should succeed without `InvalidArgument`. Capture the invalidation ID in output.

**Step 4 — Update Lambda verify-payment source:**
Edit `/tmp/gac-lambda/verify_payment.py` line 17:
- Old: `S3_KEY_WIN = "downloads/Interview Assistant.exe"`
- New: `S3_KEY_WIN = "downloads/InterviewAssistant.exe"`

Also update `content-disposition` in any `ResponseContentDisposition` param if present (check `generate_download_urls()` — it uses no extra params so no change needed there).

**Step 5 — Redeploy Lambda:**
```bash
cd /tmp/gac-lambda
pip install stripe -t . -q
zip -r /tmp/offerletter-verify-payment.zip . -x "*.pyc" "__pycache__/*"

aws lambda update-function-code \
  --function-name offerletter-verify-payment \
  --zip-file fileb:///tmp/offerletter-verify-payment.zip \
  --region us-east-1

aws lambda wait function-updated \
  --function-name offerletter-verify-payment \
  --region us-east-1
```

**Step 6 — Smoke test Lambda generates correct pre-signed URL:**
```bash
aws lambda invoke \
  --function-name offerletter-verify-payment \
  --region us-east-1 \
  --payload '{"body":"{\"session_id\":\"test_invalid\"}"}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/lambda-test.json && cat /tmp/lambda-test.json
```
Expect a 200 with `verified: false` (invalid session) OR a pre-signed URL containing `InterviewAssistant.exe` (not `Interview+Assistant.exe` or `Interview%20Assistant.exe`).

To verify the URL shape with a real DynamoDB session, use any previously verified session_id from the table — or check the pre-signed URL is built with `S3_KEY_WIN = downloads/InterviewAssistant.exe` by grepping the deployed zip:
```bash
unzip -p /tmp/offerletter-verify-payment.zip verify_payment.py | grep S3_KEY_WIN
```
Expect: `S3_KEY_WIN = "downloads/InterviewAssistant.exe"`.
  </action>
  <verify>
    1. `aws s3 ls s3://offerletter.ai/downloads/` shows `InterviewAssistant.exe` and NO `Interview Assistant.exe`
    2. CF invalidation command exits 0 (no InvalidArgument error)
    3. `unzip -p /tmp/offerletter-verify-payment.zip verify_payment.py | grep S3_KEY_WIN` → `"downloads/InterviewAssistant.exe"`
    4. Lambda function updated: `aws lambda get-function --function-name offerletter-verify-payment --region us-east-1 | grep LastModified`
  </verify>
  <done>S3 has no-space key, old key deleted, CF invalidation succeeded, Lambda deployed with updated S3_KEY_WIN.</done>
</task>

<task type="auto">
  <name>Task 2: Update PyInstaller spec and GitHub Actions workflow</name>
  <files>
    apps/interview-assistant/InterviewAssistant_Windows.spec
    .github/workflows/build-interview-assistant-windows.yml
  </files>
  <action>
**File 1 — `apps/interview-assistant/InterviewAssistant_Windows.spec` line 70:**
Change:
```python
name='Interview Assistant',
```
To:
```python
name='InterviewAssistant',
```
This makes PyInstaller output `dist/InterviewAssistant.exe` (no space). All references in the workflow must match.

**File 2 — `.github/workflows/build-interview-assistant-windows.yml`:**
Update 4 occurrences of the spaced filename:

Line 37 (Verify EXE step — `Test-Path`):
- Old: `if (!(Test-Path "dist\Interview Assistant.exe"))`
- New: `if (!(Test-Path "dist\InterviewAssistant.exe"))`

Line 41 (Verify EXE step — `Get-Item`):
- Old: `$((Get-Item 'dist\Interview Assistant.exe').Length / 1MB)`
- New: `$((Get-Item 'dist\InterviewAssistant.exe').Length / 1MB)`

Line 50 (Upload to S3 step):
- Old: `aws s3 cp "dist/Interview Assistant.exe" "s3://offerletter.ai/downloads/Interview Assistant.exe" --content-disposition "attachment; filename=\"Interview Assistant.exe\""`
- New: `aws s3 cp "dist/InterviewAssistant.exe" "s3://offerletter.ai/downloads/InterviewAssistant.exe" --content-disposition "attachment; filename=\"InterviewAssistant.exe\""`

Line 59 (Invalidate CloudFront step):
- Old: `aws cloudfront create-invalidation --distribution-id E319UG6B4QE97L --paths "/downloads/Interview Assistant.exe"`
- New: `aws cloudfront create-invalidation --distribution-id E319UG6B4QE97L --paths "/downloads/InterviewAssistant.exe"`

Line 66 (Upload artifact step — path):
- Old: `path: apps/interview-assistant/dist/Interview Assistant.exe`
- New: `path: apps/interview-assistant/dist/InterviewAssistant.exe`

After editing, commit:
```bash
cd /Users/jeet/doordash-p2p
git add apps/interview-assistant/InterviewAssistant_Windows.spec \
        .github/workflows/build-interview-assistant-windows.yml
git commit -m "fix(offerletter): rename EXE to InterviewAssistant.exe — fix CF invalidation space error

CloudFront create-invalidation rejects paths with spaces (InvalidArgument).
Rename S3 key downloads/Interview Assistant.exe → downloads/InterviewAssistant.exe,
update PyInstaller spec name, GitHub Actions workflow upload/invalidation paths."
```
  </action>
  <verify>
    1. `grep "name=" apps/interview-assistant/InterviewAssistant_Windows.spec` → `name='InterviewAssistant'`
    2. `grep -c "Interview Assistant" .github/workflows/build-interview-assistant-windows.yml` → `0`
    3. `grep -c "InterviewAssistant" .github/workflows/build-interview-assistant-windows.yml` → `5` (verify step x2, upload, invalidate, artifact)
    4. `git log --oneline -1` shows the fix commit
  </verify>
  <done>Spec produces no-space EXE, workflow uploads and invalidates using no-space path, changes committed.</done>
</task>

</tasks>

<verification>
Full fix verified when:
1. `aws s3 ls s3://offerletter.ai/downloads/` — only `InterviewAssistant.exe` (no space), `InterviewAssistant.dmg` (check DMG too — it may still have space)
2. `aws cloudfront create-invalidation --distribution-id E319UG6B4QE97L --paths "/downloads/InterviewAssistant.exe"` exits 0
3. `unzip -p /tmp/offerletter-verify-payment.zip verify_payment.py | grep S3_KEY_WIN` → `"downloads/InterviewAssistant.exe"`
4. GH Actions workflow has zero occurrences of `Interview Assistant` (spaced)
5. PyInstaller spec `name='InterviewAssistant'` confirmed

**Note on DMG:** The Mac file is `downloads/Interview Assistant.dmg` (also has space). The handoff only asked to fix the EXE/Windows side. If CF invalidation is also failing for Mac downloads, apply the same rename to the DMG as a follow-up.
</verification>

<success_criteria>
- Windows download: pre-signed URL from Lambda points to `downloads/InterviewAssistant.exe` (no space)
- CF invalidation: `create-invalidation` succeeds on next GitHub Actions run (no `InvalidArgument`)
- Future builds: workflow auto-renames and invalidates correctly via no-space path
- Lambda deployed: `offerletter-verify-payment` updated with new S3_KEY_WIN
</success_criteria>

<output>
After completion, create `.planning/quick/229-fix-offerletter-cloudfront-invalidation-/229-SUMMARY.md`
</output>
