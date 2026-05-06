---
phase: quick-325
plan: 01
title: ArthaBuild request-access deliverability help copy + Resend button
status: complete
type: feature
tags: [arthabuild, frontend, deliverability, email, magic-link, resend]
requirements_completed:
  - Q325-R1  # Success screen surfaces actionable deliverability hints
  - Q325-R2  # Self-serve "Resend" button re-POSTs to /api/auth/request-access
  - Q325-R3  # Pre-submit form banner warns about new-domain spam-quarantine pattern
  - Q325-R4  # No new dependencies, no backend changes, no touching of quick-324 dirty files
  - Q325-R5  # Live deploy to artha.build using inode-safe rsync + nginx restart
key-files:
  modified:
    - src/frontend/src/components/RequestAccessForm.tsx
  created:
    - src/frontend/src/test/requestAccessDeliverability.test.tsx
metrics:
  duration_minutes: ~25
  tasks_completed: 4_of_5  # Task 5 = user spot-check (pending)
  files_modified: 1
  files_created: 1
  tests_added: 4
  test_baseline: "135 passed / 2 failed (137)"
  test_after: "139 passed / 2 failed (141) — +4 passed, 0 new failures"
  commit_sha: a4cec41
  pre_deploy_bundle: index-C87sfhGe.js
  post_deploy_bundle: index-DF3nSpAj.js
  live_phrase_hits: "3 / 3 (spam/junk folder, hello@artha.build, Didn't get the email)"
  rollback_artifact: ubuntu@44.194.34.223:/home/ubuntu/dist.325-rollback.tar.gz
completed_at: 2026-05-06
---

# quick-325 — ArthaBuild Request-Access Deliverability Help + Resend Button

## One-liner

Frontend-only mitigation for the contact@techcloudpro.com Workspace-quarantine launch incident: pre-submit "new sending domain" banner + 3-bullet success-screen escalation list + debounced "Didn't get the email? Resend" button. Live on https://artha.build with new bundle `index-DF3nSpAj.js`.

## What Shipped

| Artifact | Description |
|----------|-------------|
| **Pre-submit banner** | Purple-tinted banner inside the form noting "artha.build is a new sending domain. If the link doesn't arrive within ~2 minutes, check your spam/junk folder." |
| **Success-screen list** | 3 escalation bullets — (1) spam/junk folder, (2) personal Gmail, (3) mailto:hello@artha.build |
| **Resend button** | "Didn't get the email? Resend" — re-POSTs `/api/auth/request-access` via `authService.requestAccess()` |
| **Debounce guard** | `if (resendStatus === 'sending') return` ensures rapid double-clicks produce exactly ONE additional fetch; button visually disabled while in-flight |
| **Confirmation** | Green "Sent again — check your spam folder" appears after successful resend (`role="status" aria-live="polite"`) |
| **Error path** | Red "Resend failed. Please try again in a moment." appears on failure (`role="alert"`) |

## Verification Proof

### Pre-flight gate (Task 1)
All 9 grep checks passed:
- HEAD = `7197d9d` ✓
- Component default export at line 29 ✓
- `type Status` at line 27 ✓
- Success branch at line 80 ✓
- `requestAccess` import at line 13 ✓
- `/api/auth/request-access` at authService line 169 ✓
- 5 quick-324 backend dirty files (count match) ✓
- New test file slot empty ✓
- Baseline `Tests  2 failed | 135 passed (137)` captured to `/tmp/quick-325-baseline.txt` ✓

### Code change (Task 2)
Grep verification on `RequestAccessForm.tsx` after edit:
```
spam/junk folder count: 2   (expect ≥2 — banner + success list)  ✓
hello@artha.build count: 2  (expect 1 — actually 2: mailto + visible text)  ✓
Didn't get the email count: 1  (expect 1)  ✓
ResendStatus count: 5       (expect ≥2 — type def + state + interactions)  ✓
onResend count: 2           (expect ≥2 — def + onClick)  ✓
```

`git status --short | grep "^ M src/backend/" | wc -l` = `5` (UNCHANGED — quick-324 files preserved).

`npx tsc --noEmit` reports zero errors against `RequestAccessForm.tsx`. (Pre-existing TS errors in unrelated files: ChatMessage.tsx, BRDGenerator.tsx, Landing.tsx, etc. — not in scope.)

### Tests (Task 3)
**Isolation run:**
```
RUN  v1.6.1 /Users/jeet/arthaBuild/src/frontend
✓ src/test/requestAccessDeliverability.test.tsx  (4 tests) 150ms
Test Files  1 passed (1)
Tests  4 passed (4)
```

**Full suite:**
```
Test Files  1 failed | 21 passed (22)
Tests  2 failed | 139 passed (141)
```

Failures: same 2 pre-existing in `authService.test.ts` lines 89 + 128 (`forgotPassword > returns token from backend` etc.). Delta = +4 passed, 0 new failures.

### Deploy (Task 4)
- Local build: `npm run build` → emits `dist/assets/index-DF3nSpAj.js` (4.23 MB)
- Pre-deploy bundle on prod: `index-C87sfhGe.js` captured into `/home/ubuntu/dist.325-rollback.tar.gz` (1.3 MB)
- Inode-safe rsync transferred to `ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/frontend/dist/`
- Post-deploy bundle hash on prod disk: `index-DF3nSpAj.js` ✓
- `docker restart arthaBuild-nginx` succeeded — container "Up Less than a second"

### Live curl-verify
```
Live bundle: index-DF3nSpAj.js   (matches local ✓)
HIT: spam/junk folder
HIT: hello@artha.build
HIT: Didn't get the email
Total hits: 3 / 3
ACCEPTANCE GATE: PASS
```

### Commit hygiene
```
$ git diff --cached --name-only
src/frontend/src/components/RequestAccessForm.tsx
src/frontend/src/test/requestAccessDeliverability.test.tsx
```

Exactly 2 files staged. Backend dirty files (`pipeline.py`, `renderers.py`, `runtime.py`, `schemas.py`, `status_verbs.yaml`, `.gitignore` + untracked dirs) all preserved after commit.

Commit SHA: **`a4cec41`** on arthaBuild main (local-only — no push per project policy).

## Deviations from Plan

**None.** Plan executed exactly as written. Two minor observations:

1. **`hello@artha.build` grep count = 2 (not 1)**: The string appears once as `mailto:hello@artha.build` (link `href`) and once as visible link text (`<a>...hello@artha.build...</a>`). Plan expected `1`; actual is `2`. Both occurrences are intentional/expected from the JSX template — not a bug. Recording here for transparency.

2. **`ResendStatus` grep count = 5 (not 2)**: Type definition + state hook + 4 status comparisons in JSX/handler. Plan expected `≥2`; actual `5` (still satisfies the gate).

## Rollback Procedure

ETA: <5 minutes. Single SSH block:

```bash
ssh -i /Users/jeet/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  'cd /home/ubuntu/arthaBuild/src/frontend && \
   rm -rf dist && \
   tar -xzf /home/ubuntu/dist.325-rollback.tar.gz && \
   cd /home/ubuntu/arthaBuild && \
   docker restart arthaBuild-nginx'
```

Restores `index-C87sfhGe.js` (pre-deploy bundle).

To revert the commit too:
```bash
cd /Users/jeet/arthaBuild && git revert a4cec41 --no-edit
```

## Open Items

1. **Task 5 — human spot-check pending** (8-point browser checklist). Plan defines the resume signal as "approved" or specific issue description.
2. **Backend SMTP path verified working** earlier in session (quick-322 audit_logs id=452); this UI mitigation does not change that path. Workspace-quarantine pattern is downstream of our send.
3. **Resend button uses the same UTM spread** as the original submit, so any `?utm_*` query params present at first landing are propagated through the resend.

## Self-Check: PASSED

Verified file/commit existence:
- `/Users/jeet/arthaBuild/src/frontend/src/components/RequestAccessForm.tsx` — modified ✓
- `/Users/jeet/arthaBuild/src/frontend/src/test/requestAccessDeliverability.test.tsx` — created ✓
- Commit `a4cec41` in `git log` ✓
- Live bundle `index-DF3nSpAj.js` referenced from https://artha.build ✓
- Live bundle contains all 3 marker phrases ✓
- Backend dirty files (`src/backend/brd/{pipeline,renderers,runtime,schemas,status_verbs}*`) — still M/unstaged ✓
- Rollback artifact `dist.325-rollback.tar.gz` (1.3 MB) on prod ✓
