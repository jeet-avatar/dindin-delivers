---
phase: quick-181
plan: 01
subsystem: offerletter-ai
tags: [auth, lambda, serverless, aws, dashboard, offer-analyzer]
key-files:
  modified:
    - /Users/jeet/Downloads/offerletter-ai/dashboard.html
    - /Users/jeet/Downloads/offerletter-ai/offer.html
    - /Users/jeet/Downloads/offerletter-ai/.github/workflows/deploy-production.yml
  created:
    - /Users/jeet/Downloads/offerletter-ai/lambda/offer_analysis.py
    - /Users/jeet/Downloads/offerletter-ai/lambda/requirements.txt
    - /Users/jeet/Downloads/offerletter-ai/lambda/deploy.sh
    - /Users/jeet/Downloads/offerletter-ai/lambda/setup-aws.sh
decisions:
  - Auth guard uses Auth.requireAuth() from auth.js; throws to stop script execution on redirect
  - Lambda uses claude-haiku-4-5-20251001 (cheaper than sonnet for offer analysis)
  - API Gateway payload format 1.0 for event.httpMethod compatibility with existing handler pattern
  - ANALYZE_API set to real Lambda endpoint after setup-aws.sh ran successfully
metrics:
  duration: ~20 min
  completed: 2026-03-16
  tasks: 3
  files: 7
---

# Phase quick-181: Fix Dashboard Auth Guard and Real User Display + Lambda Offer Analysis

## One-liner

Dashboard auth guard via Auth.requireAuth() + real Cognito user display; offer analysis moved server-side to Lambda with Anthropic key in Secrets Manager.

## What Was Done

### Task 1 — Dashboard auth guard + real user display (commit a06a9d1)

`dashboard.html` had no auth guard and showed a hardcoded "J" avatar. Fixed:

- Added `<script src="auth.js"></script>` before consent.js
- Inline script calls `Auth.requireAuth()` — redirects unauthenticated visitors to `/login.html?redirect=...`
- `Auth.getUser()` fetches Cognito attributes: extracts `user.name` (single full-name field), splits on space for first name, derives avatar initial
- Welcome heading updated to `"Welcome back, [FirstName] 👋"` with real name
- Avatar circle updated with real initial
- Trial badge simplified to `"Free Trial"` (removes hardcoded "7 days left")

### Task 2 — Lambda infrastructure files (commit 2b7f311)

Created `/Users/jeet/Downloads/offerletter-ai/lambda/`:

- **offer_analysis.py**: Handler reads Anthropic key from `offerletter/production/anthropic-key` in Secrets Manager, calls Claude haiku model with the same system prompt as the old direct-browser call, returns structured JSON with CORS headers for `https://www.offerletter.ai`
- **requirements.txt**: `anthropic==0.40.0`, `boto3==1.35.0`
- **deploy.sh**: Code-only Lambda update for subsequent CI/CD deploys (executable)
- **setup-aws.sh**: Full one-shot setup — IAM role + managed policy + inline Secrets Manager policy + Lambda create + API Gateway v2 + Lambda integration (payload format 1.0) + POST /analyze route + $default auto-deploy stage + resource-based permission + Secrets Manager secret creation (executable)

### Task 3 — Remove API key UI from offer.html + wire Lambda (commit bcc73c2)

Removed all user-facing API key infrastructure:

- CSS: Removed `.apikey-bar` block and all child rules (`.apikey-bar-left`, `.apikey-status-dot`, `.apikey-label`, `.apikey-hint`, `.apikey-change-btn`)
- CSS: Removed `.modal-backdrop`, `.modal`, `.modal-title`, `.modal-sub`, `.modal-input`, `.modal-note`, `.modal-actions`, `.modal-save`, `.modal-cancel` blocks
- HTML: Removed `<div class="apikey-bar" id="apikeyBar">` block
- HTML: Removed `<div class="modal-backdrop" id="keyModal">` block
- JS: Removed `KEY_STORE`, `loadKey()`, `saveKey()`, `updateKeyBar()`, `openKeyModal()`, `closeKeyModal()`, click-outside handler, and `updateKeyBar()` init call
- JS: Added `const ANALYZE_API` constant at top of script block
- JS: Replaced `callClaude()` to POST to `ANALYZE_API` with `{offer_text, role, city}` — Lambda returns parsed JSON directly
- JS: Removed key check lines from `runAnalysis()`
- JS: Removed `NO_KEY` and `INVALID_KEY` branches from `showError()`
- **deploy-production.yml**: Added "Deploy Lambda (offer analysis)" step after "Deploy static assets" and before "Invalidate CloudFront cache" — gracefully skips if Lambda not yet created

### Fixup — Real Lambda URL (commit b6099e5)

After `setup-aws.sh` ran successfully and created all AWS infrastructure, updated `ANALYZE_API` in offer.html with the real endpoint:

```
https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/analyze
```

AWS resources created:
- IAM role: `arn:aws:iam::134607809447:role/offerletter-lambda-role`
- Lambda function: `offerletter-offer-analysis` (python3.12, 256MB, 30s timeout)
- API Gateway v2: `0q8mtozfra` (`offerletter-offer-analysis-api`)
- Secrets Manager: `offerletter/production/anthropic-key` (value: `{"key":"REPLACE_ME"}`)

## Remaining Action Required

Set the real Anthropic API key in Secrets Manager:

```bash
aws secretsmanager put-secret-value \
  --secret-id offerletter/production/anthropic-key \
  --secret-string '{"key":"sk-ant-..."}'
```

## Deviations from Plan

None — plan executed exactly as written. The pip dependency conflict warnings during `setup-aws.sh` are non-blocking (version conflicts in the local system Python, not in the Lambda package itself which installs into an isolated `package/` directory).

## Verification

- [x] Grep proof: `grep -c "apikey\|KEY_STORE\|openKeyModal" offer.html` = 0
- [x] Grep proof: `grep -n "ANALYZE_API" offer.html` shows constant + fetch call
- [x] Grep proof: `grep -n "requireAuth\|getUser\|auth.js" dashboard.html` shows all 3
- [x] Grep proof: `grep -n "Deploy Lambda" deploy-production.yml` shows step
- [x] Lambda files: all 4 exist, deploy.sh + setup-aws.sh are executable, Python syntax OK
- [x] AWS: IAM role, Lambda, API Gateway, Secrets Manager all created by setup-aws.sh
- [x] Real URL committed: `https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/analyze`

## Self-Check: PASSED

All files exist and commits verified in offerletter-ai repo (a06a9d1, 2b7f311, bcc73c2, b6099e5).
