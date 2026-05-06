---
phase: quick-325
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/frontend/src/components/RequestAccessForm.tsx
  - src/frontend/src/test/requestAccessDeliverability.test.tsx
autonomous: false  # one human-verify checkpoint at the end (browser spot-check)
requirements:
  - Q325-R1  # Success screen surfaces actionable deliverability hints (spam folder, personal email, hello@artha.build fallback)
  - Q325-R2  # Self-serve "Resend" button on success screen re-POSTs to /api/auth/request-access
  - Q325-R3  # Pre-submit form banner warns about new-domain spam-quarantine pattern
  - Q325-R4  # No new dependencies, no backend changes, no touching of quick-324 dirty files
  - Q325-R5  # Live deploy to artha.build using inode-safe rsync + nginx restart, verifiable via curl

must_haves:
  truths:
    - "After a successful request-access submit, the success screen shows: 'check spam/junk folder' + 'corporate email blocked? try a personal Gmail' + 'or message hello@artha.build'."
    - "The success screen shows a 'Didn't get the email? Resend' button that re-POSTs to /api/auth/request-access using the same email payload."
    - "The Resend button is disabled while a resend is in-flight (no double-submit) and shows a transient confirmation after success."
    - "Before submitting, users see a small banner on the form noting that artha.build is a new sending domain and emails may land in spam."
    - "Live curl of https://artha.build (with browser UA) returns HTML or JS bundle that contains at least 2 of these phrases: 'spam folder', 'hello@artha.build', \"Didn't get the email\"."
    - "Frontend test suite passes with no NEW failures vs. baseline (baseline 135 passed / 2 failed in authService.test.ts pre-existing); new tests for help-copy + Resend behavior pass."
    - "No backend code changes; quick-324's 5 dirty backend files in working tree remain untouched in this commit."
  artifacts:
    - path: "src/frontend/src/components/RequestAccessForm.tsx"
      provides: "Updated success-state JSX (deliverability help copy + Resend button) + new pre-submit banner + resend-state machine"
      contains: "spam folder"
    - path: "src/frontend/src/components/RequestAccessForm.tsx"
      provides: "Resend handler that re-uses requestAccess() from authService"
      contains: "Didn't get the email"
    - path: "src/frontend/src/test/requestAccessDeliverability.test.tsx"
      provides: "Vitest coverage for the new help copy + Resend re-POST flow + double-submit guard"
      min_lines: 80
  key_links:
    - from: "src/frontend/src/components/RequestAccessForm.tsx (Resend button onClick)"
      to: "src/frontend/src/services/authService.ts -> requestAccess()"
      via: "imported requestAccess function (already imported at line 13)"
      pattern: "requestAccess\\("
    - from: "Live https://artha.build success screen"
      to: "POST /api/auth/request-access"
      via: "fetch in services/authService.ts:169"
      pattern: "/api/auth/request-access"
---

<objective>
Add 3 frontend-only deliverability mitigations to the public RequestAccessForm so legitimate users (e.g., contact@techcloudpro.com from earlier today) who don't receive the magic-link email — because corporate Workspace anti-spam quarantines fresh-domain artha.build mail — can self-recover instead of bouncing.

Purpose: Backend deliverability is verified working (audit_logs id=452 confirms `email.magic_link.sent / success` for today's failed delivery; SPF/DKIM/DMARC all aligned per `dig`). Issue is downstream Workspace policy. UI mitigation:
1. Pre-submit banner setting expectation of "check spam first".
2. Success-screen help copy with 3 escalation paths (spam folder → personal Gmail → hello@artha.build).
3. Self-serve Resend button so users can re-trigger without leaving the page.

Output: One updated `RequestAccessForm.tsx` + one new test file + a frontend production deploy to https://artha.build.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/arthaBuild/CLAUDE.md
@/Users/jeet/arthaBuild/src/frontend/src/components/RequestAccessForm.tsx
@/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
@/Users/jeet/arthaBuild/src/frontend/src/test/magicLink.test.tsx
@/Users/jeet/arthaBuild/src/frontend/package.json

# CRITICAL constraints from prior context (verified at plan time):
# - HEAD = 7197d9d (quick-323)
# - 5 modified backend files in working tree are quick-324 leftovers (status output shows: pipeline.py, renderers.py, runtime.py, schemas.py, status_verbs.yaml). DO NOT add/commit/touch these in this plan.
# - .gitignore is also dirty — NOT touched here.
# - Frontend test baseline (verified by running `npm test` at plan time): 135 passed / 2 failed (137 total). Both failures are in authService.test.ts (`forgotPassword > returns token from backend` + line 89). They are pre-existing; this plan must not introduce ANY additional failures.
# - Build cmd: `vite build` (from package.json scripts.build). Test cmd: `vitest run` (from scripts.test).
# - Prod deploy: rsync `src/frontend/dist/` to ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/frontend/dist/ then `docker restart arthaBuild-nginx` (memory: feedback_arthaBuild_nginx_dist_inode — bind-mount is inode-bound; rsync IN PLACE, do NOT mv/replace the dist directory).
# - SSH key: ~/.ssh/techcloudpro-key-1764031372.pem
# - Positioning rule (memory: feedback_arthaBuild_positioning): no "free trial" / "pricing" framing. Existing form already says "Free while you explore" (line 144-145) — do NOT touch that copy. New copy must stay neutral & helpful (e.g., "Didn't get the email? Resend", "Check your spam/junk folder").

# Grep-verified facts (re-verify in pre-flight gate before edit):
# - Component: src/frontend/src/components/RequestAccessForm.tsx lines 29-297 (default export at 29).
# - State branches: line 27 declares `type Status = 'idle' | 'submitting' | 'success' | 'error';`. Success branch is `if (status === 'success')` at line 80, returning the success div (lines 80-105).
# - Existing success copy: line 101 says "Check your spam folder if you don't see it." (minimal — will be expanded).
# - API client: requestAccess() at src/frontend/src/services/authService.ts:168, POSTs /api/auth/request-access (line 169). Already imported in the form at line 13.
# - Form is rendered from src/frontend/src/pages/Landing.tsx:579 inside section #request-access.
# - No existing test file for RequestAccessForm. magicLink.test.tsx (test/magicLink.test.tsx) covers requestAccess service + form-submit-success-state but has NO test for the Resend button or expanded help copy (because they don't exist yet).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pre-flight gate — re-verify planner facts before any edit</name>
  <files>(no edits in this task; verification only)</files>
  <action>
Run the following greps and STOP+ASK USER if ANY result mismatches what the planner stated. Do not proceed to Task 2 until all checks pass.

```
cd /Users/jeet/arthaBuild

# 1. HEAD must still be 7197d9d (no surprise commits since plan was written)
git log --oneline -1 | grep -q "^7197d9d" || echo "MISMATCH: HEAD changed"

# 2. Component default export at line 29
grep -n "^export default function RequestAccessForm" src/frontend/src/components/RequestAccessForm.tsx

# 3. Status type still has 4 branches incl 'success'
grep -n "type Status" src/frontend/src/components/RequestAccessForm.tsx
# expect: line 27, "type Status = 'idle' | 'submitting' | 'success' | 'error';"

# 4. Success branch still at line 80
grep -n "status === 'success'" src/frontend/src/components/RequestAccessForm.tsx
# expect: line 80 returns success div

# 5. requestAccess() already imported in form at line 13
grep -n "import { requestAccess }" src/frontend/src/components/RequestAccessForm.tsx
# expect: line 13

# 6. authService.requestAccess() POSTs the right endpoint
grep -n '/api/auth/request-access' src/frontend/src/services/authService.ts
# expect: line 169

# 7. Backend dirty files (must remain untouched throughout this plan)
git status --short | grep -E "src/backend/brd/(pipeline|renderers|runtime|schemas|status_verbs)" | wc -l
# expect: 5

# 8. No existing requestAccessDeliverability test file
test ! -f src/frontend/src/test/requestAccessDeliverability.test.tsx && echo "OK new test file slot is free"

# 9. Capture baseline test counts (re-run; must match planner's 135 passed / 2 failed)
cd src/frontend && npm test 2>&1 | grep -E "^      Tests" | tee /tmp/quick-325-baseline.txt
# expect: "Tests  2 failed | 135 passed (137)"
```

If HEAD changed, or branch/line numbers shifted, or backend dirty count != 5, or baseline ≠ 135 pass / 2 fail → STOP and ask the user before editing anything.
  </action>
  <verify>
All 9 grep checks emit the expected output and `/tmp/quick-325-baseline.txt` shows `Tests  2 failed | 135 passed (137)`.
  </verify>
  <done>
Pre-flight gate passes: planner facts match live code, baseline captured, no dirty surprises.
  </done>
</task>

<task type="auto">
  <name>Task 2: Edit RequestAccessForm.tsx — add pre-submit banner + expanded success-screen help copy + Resend button + resend state machine</name>
  <files>src/frontend/src/components/RequestAccessForm.tsx</files>
  <action>
Make exactly these changes to `src/frontend/src/components/RequestAccessForm.tsx`. NO other files. NO new imports beyond what's already there (requestAccess is already imported at line 13).

### Change A — extend Status type (line 27)

Replace:
```ts
type Status = 'idle' | 'submitting' | 'success' | 'error';
```
With:
```ts
type Status = 'idle' | 'submitting' | 'success' | 'error';
type ResendStatus = 'idle' | 'sending' | 'sent' | 'error';
```

### Change B — add resend state inside the component (after line 38 errorMsg useState)

After the existing `const [errorMsg, setErrorMsg] = useState('');` line, add:
```ts
// quick-325 — Resend button state machine for the success screen.
// Lets users self-recover when corporate Workspace anti-spam quarantines
// the magic-link email (artha.build is a fresh sending domain).
const [resendStatus, setResendStatus] = useState<ResendStatus>('idle');
```

### Change C — add the resend handler (above the `if (status === 'success')` branch)

Just before `if (status === 'success') {` (currently line 80), add this function. It re-POSTs the same email via the already-imported `requestAccess()` and uses the same UTM spread pattern as the original submit:

```ts
async function onResend() {
  if (resendStatus === 'sending') return;  // debounce guard — never double-submit
  setResendStatus('sending');
  try {
    await requestAccess({
      name: name.trim().slice(0, FIELD_LIMITS.name),
      email: email.trim().slice(0, FIELD_LIMITS.email),
      company: company.trim().slice(0, FIELD_LIMITS.company) || undefined,
      role: role.slice(0, FIELD_LIMITS.role) || undefined,
      what_youd_build: whatYoudBuild.trim().slice(0, FIELD_LIMITS.what_youd_build) || undefined,
      website,
      ...utm,
    });
    setResendStatus('sent');
  } catch {
    setResendStatus('error');
  }
}
```

### Change D — replace the success-screen JSX (lines 80–105) with the expanded version

Replace the entire `if (status === 'success') { return ( ... ); }` block with this. Keep the same outer container styling so the visual treatment doesn't drift; only add the help list + Resend button + transient confirmation.

```tsx
if (status === 'success') {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '32px 28px',
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.35)',
        borderRadius: 16,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 38, marginBottom: 12, lineHeight: 1 }}>&#10003;</div>
      <h3 style={{ margin: '0 0 12px', color: '#e5e7eb', fontSize: 20, fontWeight: 700 }}>
        Check your email
      </h3>
      <p style={{ margin: '0 0 18px', color: '#9ca3af', fontSize: 15, lineHeight: 1.6 }}>
        If your email is valid, you&apos;ll receive a sign-in link within a minute.
      </p>
      <ul
        style={{
          margin: '0 0 22px',
          padding: '14px 18px',
          listStyle: 'none',
          textAlign: 'left',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          color: '#9ca3af',
          fontSize: 13.5,
          lineHeight: 1.65,
        }}
      >
        <li style={{ marginBottom: 6 }}>
          &bull; Check your <strong style={{ color: '#e5e7eb' }}>spam/junk folder</strong> &mdash; emails from new sending domains sometimes land there.
        </li>
        <li style={{ marginBottom: 6 }}>
          &bull; Corporate email blocked? Try a <strong style={{ color: '#e5e7eb' }}>personal Gmail</strong> address.
        </li>
        <li>
          &bull; Or message{' '}
          <a
            href="mailto:hello@artha.build"
            style={{ color: '#a5b4fc', textDecoration: 'underline' }}
          >
            hello@artha.build
          </a>{' '}
          for direct access.
        </li>
      </ul>
      <button
        type="button"
        onClick={onResend}
        disabled={resendStatus === 'sending'}
        style={{
          padding: '10px 20px',
          background: resendStatus === 'sending'
            ? 'rgba(99,102,241,0.25)'
            : 'rgba(99,102,241,0.18)',
          color: '#e5e7eb',
          border: '1px solid rgba(99,102,241,0.5)',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: resendStatus === 'sending' ? 'not-allowed' : 'pointer',
        }}
      >
        {resendStatus === 'sending' ? 'Resending…' : "Didn't get the email? Resend"}
      </button>
      {resendStatus === 'sent' && (
        <p
          role="status"
          aria-live="polite"
          style={{ margin: '12px 0 0', color: '#86efac', fontSize: 13 }}
        >
          Sent again &mdash; check your spam folder.
        </p>
      )}
      {resendStatus === 'error' && (
        <p
          role="alert"
          style={{ margin: '12px 0 0', color: '#fda4af', fontSize: 13 }}
        >
          Resend failed. Please try again in a moment.
        </p>
      )}
    </div>
  );
}
```

### Change E — add the small pre-submit banner inside the form, just under the existing intro paragraph

Find the `<p>` that ends at line 146 (`...we&apos;ll talk usage once you&apos;re ready to scale.</p>`). Immediately AFTER its closing `</p>`, BEFORE the honeypot div (currently at line 148), insert:

```tsx
<div
  style={{
    margin: '0 0 22px',
    padding: '10px 14px',
    background: 'rgba(99,102,241,0.08)',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: 8,
    color: '#a5b4fc',
    fontSize: 12.5,
    lineHeight: 1.55,
  }}
>
  Heads up: artha.build is a new sending domain. If the link doesn&apos;t arrive within ~2 minutes, check your spam/junk folder.
</div>
```

### Verification commands after the edit

```
cd /Users/jeet/arthaBuild

# All three new strings present
grep -c "spam/junk folder" src/frontend/src/components/RequestAccessForm.tsx     # expect >=2 (banner + success list)
grep -c "hello@artha.build" src/frontend/src/components/RequestAccessForm.tsx    # expect 1
grep -c "Didn't get the email" src/frontend/src/components/RequestAccessForm.tsx # expect 1
grep -c "ResendStatus" src/frontend/src/components/RequestAccessForm.tsx          # expect >=2 (type def + state)
grep -c "onResend" src/frontend/src/components/RequestAccessForm.tsx              # expect >=2 (def + onClick)

# No backend files modified by this task
git status --short | grep -E "^ M src/backend/" | wc -l   # expect 5 (the pre-existing quick-324 dirty count, UNCHANGED)

# Build still type-checks (fast feedback)
cd src/frontend && npx tsc --noEmit 2>&1 | tee /tmp/quick-325-tsc.log
test ! -s /tmp/quick-325-tsc.log && echo "TSC CLEAN"
```
  </action>
  <verify>
- All 5 grep checks pass with the expected counts.
- `npx tsc --noEmit` produces no errors.
- `git status --short` shows `src/frontend/src/components/RequestAccessForm.tsx` modified, and the same 5 backend files from quick-324 STILL marked M (count unchanged → backend not touched).
  </verify>
  <done>
RequestAccessForm.tsx contains the new pre-submit banner, expanded success help list (3 bullet items), Resend button + state machine, and types check clean. Backend dirty count unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add vitest coverage — new test file requestAccessDeliverability.test.tsx</name>
  <files>src/frontend/src/test/requestAccessDeliverability.test.tsx</files>
  <action>
Create a new test file at `src/frontend/src/test/requestAccessDeliverability.test.tsx`. Follow the SAME mocking style as `src/frontend/src/test/magicLink.test.tsx` (vitest + @testing-library/react + global.fetch mocked per test). Do NOT add MSW — there is no MSW infra; existing tests stub `global.fetch` directly.

The file must contain at least these 4 tests:

```tsx
/**
 * quick-325 — RequestAccessForm deliverability help copy + Resend button.
 *
 * Companion to magicLink.test.tsx (which covers the basic submit→success
 * flow). These tests assert the new help copy & resend-state machine added
 * for the contact@techcloudpro.com Workspace-quarantine launch incident.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RequestAccessForm from '../components/RequestAccessForm';

vi.mock('../lib/storage', () => ({
  storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

async function submitFormAndReachSuccess() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'If your email is valid, you will receive a sign-in link within a minute.' }),
  } as Response);

  render(<RequestAccessForm />);
  fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Q.A. Tester' } });
  fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: 'qa@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /Send me a sign-in link/i }));
  await waitFor(() => screen.getByText(/Check your email/i));
}

describe('TC-FE-Q325-01: pre-submit deliverability banner', () => {
  it('shows the new-domain spam warning above the form fields', () => {
    render(<RequestAccessForm />);
    // Banner must mention both the new-domain framing AND spam/junk so users
    // get the expectation set BEFORE they hit submit.
    expect(screen.getByText(/new sending domain/i)).toBeTruthy();
    expect(screen.getByText(/spam\/junk folder/i)).toBeTruthy();
  });
});

describe('TC-FE-Q325-02: success-screen help copy', () => {
  it('renders all 3 escalation paths (spam folder, personal Gmail, hello@artha.build)', async () => {
    await submitFormAndReachSuccess();
    expect(screen.getByText(/spam\/junk folder/i)).toBeTruthy();
    expect(screen.getByText(/personal Gmail/i)).toBeTruthy();
    // hello@artha.build must be a real mailto link, not just text
    const mailtoLink = screen.getByRole('link', { name: /hello@artha\.build/i }) as HTMLAnchorElement;
    expect(mailtoLink.href).toBe('mailto:hello@artha.build');
  });
});

describe('TC-FE-Q325-03: Resend button re-POSTs request-access', () => {
  it('clicking Resend triggers a SECOND fetch to /api/auth/request-access', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'ok' }),
    } as Response);
    global.fetch = fetchMock;

    render(<RequestAccessForm />);
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Q.A. Tester' } });
    fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: 'qa@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send me a sign-in link/i }));
    await waitFor(() => screen.getByText(/Check your email/i));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Resend/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // Second call must hit the same endpoint
    const secondCall = fetchMock.mock.calls[1];
    expect(secondCall[0]).toBe('/api/auth/request-access');
    // And must carry the same email payload
    const body = JSON.parse(secondCall[1].body);
    expect(body.email).toBe('qa@example.com');

    // Transient confirmation appears
    await waitFor(() => screen.getByText(/Sent again/i));
  });
});

describe('TC-FE-Q325-04: Resend button is debounced (no double-submit)', () => {
  it('rapid double-clicks produce exactly ONE additional fetch', async () => {
    // First fetch resolves immediately (initial submit). Second one
    // resolves slowly so we can race a second click against an in-flight resend.
    const initialResp = { ok: true, json: async () => ({ message: 'ok' }) } as Response;
    let releaseSlow: (v: Response) => void;
    const slowPromise = new Promise<Response>((resolve) => { releaseSlow = resolve; });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(initialResp)
      .mockReturnValueOnce(slowPromise);
    global.fetch = fetchMock;

    render(<RequestAccessForm />);
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Q.A. Tester' } });
    fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: 'qa@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send me a sign-in link/i }));
    await waitFor(() => screen.getByText(/Check your email/i));

    const resendBtn = screen.getByRole('button', { name: /Resend/i }) as HTMLButtonElement;
    fireEvent.click(resendBtn);            // starts in-flight resend
    fireEvent.click(resendBtn);            // should be debounced (button disabled)
    fireEvent.click(resendBtn);            // ditto

    // Even after a microtask flush, only one extra fetch should have been made.
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);  // 1 initial + 1 resend (NOT 4)

    // Button must be disabled while in-flight
    expect(resendBtn.disabled).toBe(true);

    releaseSlow!({ ok: true, json: async () => ({ message: 'ok' }) } as Response);
    await waitFor(() => screen.getByText(/Sent again/i));
  });
});
```

After writing the file, run the new test in isolation to confirm it passes:

```
cd /Users/jeet/arthaBuild/src/frontend
npx vitest run src/test/requestAccessDeliverability.test.tsx 2>&1 | tail -20
# Expected: "Tests  4 passed (4)"
```

Then run the FULL suite to confirm no regressions vs. baseline:

```
cd /Users/jeet/arthaBuild/src/frontend
npm test 2>&1 | tee /tmp/quick-325-after.log
# Expected: "Tests  2 failed | 139 passed (141)" — same 2 pre-existing authService failures, +4 new tests passing.
```

Compare to baseline: failures must equal 2 (NOT 3+). If a new failure appears that is NOT in `authService.test.ts`, STOP and fix before declaring done.
  </action>
  <verify>
- New test file passes in isolation: 4 / 4.
- Full suite: 139 passed / 2 failed (baseline was 135 passed / 2 failed; delta = +4 passed, 0 new failures).
- The only failed tests are still in `authService.test.ts` lines 89 and 128 (pre-existing).
  </verify>
  <done>
4 new tests cover: pre-submit banner, success-screen help copy (3 paths + mailto link), Resend re-POST behavior, debounce guard. Full suite has zero NEW failures.
  </done>
</task>

<task type="auto">
  <name>Task 4: Build, capture rollback baseline, deploy frontend to prod (inode-safe rsync), restart nginx, curl-verify</name>
  <files>src/frontend/dist/* (build output, not committed)</files>
  <action>
### Step 4.1 — Build the frontend bundle locally

```
cd /Users/jeet/arthaBuild/src/frontend
rm -rf dist
npm run build 2>&1 | tail -20
# Expected: vite build succeeds, "✓ built in N.NNs", emits dist/index.html + dist/assets/index-*.js
ls -la dist/
NEW_BUNDLE=$(grep -oE 'index-[A-Za-z0-9_-]+\.js' dist/index.html | head -1)
echo "New local bundle: $NEW_BUNDLE"
```

If `npm run build` fails, STOP — do not deploy.

### Step 4.2 — Capture rollback baseline on prod (BEFORE rsync)

```
SSH="ssh -i ~/.ssh/techcloudpro-key-1764031372.pem -o StrictHostKeyChecking=no ubuntu@44.194.34.223"

# Capture pre-deploy bundle hash + a tar snapshot for rollback
$SSH 'cd /home/ubuntu/arthaBuild && \
  PRE_BUNDLE=$(grep -oE "index-[A-Za-z0-9_-]+\.js" src/frontend/dist/index.html | head -1) && \
  echo "Pre-deploy bundle: $PRE_BUNDLE" && \
  cd src/frontend && \
  tar -czf /home/ubuntu/dist.325-rollback.tar.gz -C . dist && \
  ls -lh /home/ubuntu/dist.325-rollback.tar.gz'
# Expected: tar exists, ~few-MB. Pre-deploy bundle hash captured (note it).
```

### Step 4.3 — Inode-safe rsync (rsync OVER existing dist/, do NOT mv/replace)

```
# Trailing slash on source AND dest = rsync into existing dir, preserves inode
rsync -avz --delete \
  -e "ssh -i ~/.ssh/techcloudpro-key-1764031372.pem -o StrictHostKeyChecking=no" \
  /Users/jeet/arthaBuild/src/frontend/dist/ \
  ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/frontend/dist/ 2>&1 | tail -15

# Confirm new bundle is on prod disk
$SSH 'grep -oE "index-[A-Za-z0-9_-]+\.js" /home/ubuntu/arthaBuild/src/frontend/dist/index.html | head -1'
# Expected: matches $NEW_BUNDLE from step 4.1
```

### Step 4.4 — Restart nginx (memory: feedback_arthaBuild_nginx_dist_inode — MANDATORY)

```
$SSH 'cd /home/ubuntu/arthaBuild && docker restart arthaBuild-nginx 2>&1'
# Expected: "arthaBuild-nginx" echoed back

# Confirm container is healthy
$SSH 'docker ps --filter name=arthaBuild-nginx --format "{{.Names}} {{.Status}}"'
# Expected: arthaBuild-nginx Up X seconds (healthy or starting → wait & re-check)
```

### Step 4.5 — Curl-verify against live https://artha.build

```
# Browser UA (artha.build's CF/nginx may filter default curl UA — be safe)
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

# 1. Live HTML must reference the new bundle hash
curl -s -A "$UA" https://artha.build/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
# Expected: matches $NEW_BUNDLE

# 2. Pull the bundle and grep for the new strings (SPA: copy lives in JS, not HTML)
LIVE_BUNDLE=$(curl -s -A "$UA" https://artha.build/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
curl -s -A "$UA" "https://artha.build/assets/$LIVE_BUNDLE" -o /tmp/quick-325-live-bundle.js
ls -lh /tmp/quick-325-live-bundle.js

# Need at least 2 of 3 phrases present (rule from constraints — third may be UTF-encoded)
HITS=0
grep -q "spam/junk folder" /tmp/quick-325-live-bundle.js && HITS=$((HITS+1)) && echo "HIT: spam/junk folder"
grep -q "hello@artha.build" /tmp/quick-325-live-bundle.js && HITS=$((HITS+1)) && echo "HIT: hello@artha.build"
grep -q "Didn.t get the email" /tmp/quick-325-live-bundle.js && HITS=$((HITS+1)) && echo "HIT: Didn't get the email"
echo "Total hits: $HITS / 3"
test $HITS -ge 2 && echo "ACCEPTANCE GATE: PASS" || echo "ACCEPTANCE GATE: FAIL"
```

If acceptance gate FAILS:

```
# ROLLBACK
$SSH 'cd /home/ubuntu/arthaBuild/src/frontend && \
  rm -rf dist && \
  tar -xzf /home/ubuntu/dist.325-rollback.tar.gz && \
  cd /home/ubuntu/arthaBuild && docker restart arthaBuild-nginx'
# Then STOP and surface error to user.
```

### Step 4.6 — Commit (frontend only — NEVER backend)

```
cd /Users/jeet/arthaBuild

# EXPLICIT FILE LIST — never `git add -A` (would pull in quick-324's 5 dirty backend files)
git add src/frontend/src/components/RequestAccessForm.tsx \
        src/frontend/src/test/requestAccessDeliverability.test.tsx

# Sanity check: only 2 files staged, both frontend, NO backend
git diff --cached --name-only
# Expected exactly:
#   src/frontend/src/components/RequestAccessForm.tsx
#   src/frontend/src/test/requestAccessDeliverability.test.tsx

git commit -m "$(cat <<'EOF'
feat(quick-325): deliverability help copy + Resend button on request-access success screen

Backend deliverability is verified working (audit_logs id=452 confirms
email.magic_link.sent / success for contact@techcloudpro.com — same
Workspace-quarantine pattern as Peter earlier today; SPF/DKIM/DMARC all
aligned). Issue is downstream corporate anti-spam blocking fresh-domain
artha.build mail. This is a frontend-only mitigation:

* Pre-submit banner on the form sets expectation of "check spam first"
* Success screen now lists 3 escalation paths: spam/junk folder →
  personal Gmail → mailto:hello@artha.build
* "Didn't get the email? Resend" button re-POSTs /api/auth/request-access
  via the same authService.requestAccess() (debounced; one POST per click)
* 4 new vitest cases (pre-submit banner, success copy, resend re-POST,
  debounce guard) — full suite 139 passed / 2 failed (zero new failures
  vs. 135-passed baseline)

Zero backend changes. Quick-324's in-flight backend edits in working tree
left untouched (explicit file list at commit, no `git add -A`).
EOF
)"

git log --oneline -1
```
  </action>
  <verify>
- Local build emits a new `index-*.js` bundle hash.
- `dist.325-rollback.tar.gz` exists on prod under `/home/ubuntu/`.
- Rsync transfers and `grep` on prod shows the new bundle hash.
- `docker restart arthaBuild-nginx` succeeds; container Up.
- Live `curl https://artha.build/` HTML references the new bundle hash.
- Live JS bundle contains ≥ 2 of 3 phrases ("spam/junk folder", "hello@artha.build", "Didn't get the email").
- `git diff --cached --name-only` shows exactly 2 files (both frontend); the 5 quick-324 backend files remain unstaged.
- Commit lands; `git log --oneline -1` shows new SHA.
  </verify>
  <done>
New frontend bundle live at https://artha.build, acceptance gate PASS (≥ 2 phrases in live JS), commit recorded with frontend-only changes, rollback artifact in place.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 5: Human spot-check the live UX</name>
  <what-built>
Frontend deploy of quick-325. Three additions on https://artha.build request-access section:
1. New blue-tinted info banner above the form noting "artha.build is a new sending domain" + spam-folder hint.
2. After submitting, the success screen now shows 3 bullet escalation paths and a "Didn't get the email? Resend" button.
3. Clicking Resend re-fires the request and shows "Sent again — check your spam folder."
  </what-built>
  <how-to-verify>
1. Open https://artha.build in a normal browser (NOT incognito if you want to see cache; OR hard-refresh Cmd+Shift+R to ensure new bundle).
2. Scroll to the "Request free access" section.
3. CONFIRM the new info banner is visible just under the section sub-header (purple-tinted, says "Heads up: artha.build is a new sending domain…").
4. Fill in Name = "QA Test", Email = "jeetnair.in+q325@gmail.com" (real deliverable mailbox per memory rule), submit.
5. Success screen should appear with:
   - The "Check your email" headline + checkmark
   - A boxed list with 3 bullets: spam/junk folder (bold), personal Gmail (bold), mailto link to hello@artha.build
   - A "Didn't get the email? Resend" button
6. Click Resend.
   - Button should briefly say "Resending…" and be disabled.
   - Then a green "Sent again — check your spam folder." line should appear under the button.
7. Try clicking Resend rapidly 3x — should still produce only ONE additional resend (button disabled while in-flight).
8. Check Gmail (jeetnair.in@gmail.com) — should receive 2 magic-link emails (the initial + 1 resend). Spam folder check is fine since this is the whole point of the feature.
  </how-to-verify>
  <resume-signal>Type "approved" if all 8 checks pass, or describe what's off (e.g., "banner not showing", "Resend doesn't disable", "got 3 resend emails not 2").</resume-signal>
</task>

</tasks>

<verification>
- Pre-flight: 9-point grep gate matches plan (HEAD, line numbers, baseline, dirty files).
- Code: 5 grep checks on the edited file all hit expected counts; `npx tsc --noEmit` clean.
- Tests: New file passes 4/4 in isolation; full suite shows 139 passed / 2 failed (baseline +4 passed, 0 new failures).
- Build: `vite build` emits new bundle hash.
- Deploy: rsync inode-safe + `docker restart arthaBuild-nginx`.
- Live: `curl` of https://artha.build references the new bundle; live JS contains ≥ 2 of 3 marker phrases.
- Commit: explicit file list, exactly 2 files, no backend leakage.
- Rollback: `dist.325-rollback.tar.gz` on prod; SSH one-liner restores in <5 min.
- Human: 8-point UX spot-check approved.
</verification>

<success_criteria>
1. Live https://artha.build shows the pre-submit banner, expanded success help (3 bullets + mailto link), and a working Resend button.
2. Resend button re-POSTs /api/auth/request-access exactly once per click (debounced).
3. Frontend test suite has 0 new failures vs. the 135-passed baseline; +4 new tests.
4. Zero backend code changed in this commit; quick-324's 5 dirty backend files remain in working tree, unstaged.
5. Rollback artifact (`dist.325-rollback.tar.gz`) exists on prod for fast revert.
6. User confirms 8-point UX spot-check.
</success_criteria>

<output>
After completion, create `.planning/quick/325-add-deliverability-help-text-resend-butt/325-SUMMARY.md` recording:
- Pre-deploy bundle hash, post-deploy bundle hash, commit SHA
- Test counts (before / after)
- Live phrase-hit count (X / 3)
- Rollback artifact location
- Any deviations from plan + reason
</output>
