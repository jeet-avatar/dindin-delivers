---
phase: quick-326
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx
  - /Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx
  - /home/ubuntu/arthaBuild/.env  # PROD ONLY — gitignored, not in repo
autonomous: true
requirements: [QUICK-326-A, QUICK-326-B]

must_haves:
  truths:
    - "A freshly issued access token survives an 8-hour idle BRD session without 401 eviction (mitigation, not root-cause fix)."
    - "A user redirected to /auth after a 401 sees a 'Returning user?' card explaining their session may have expired BEFORE the existing 'First time here?' help card."
    - "The existing 'First time here?' education card and its 'Request access' + 'Reset it here' links remain intact (no removal, only sibling addition)."
    - "Frontend vitest suite still reports 139 passing (or 140+ with the new sibling assertion)."
    - "Backend pytest suite still reports 554 passing (env-only change must not regress code)."
    - "Production server applies the new SESSION_IDLE_MINUTES at process start (verified by decoding a freshly-issued JWT and asserting iat is recent + idle middleware no longer 401s within 8h)."

  artifacts:
    - path: "/Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx"
      provides: "Sibling 'Returning user?' card placed ABOVE the existing 'First time here?' card (lines 78-103)"
      contains: "Returning user?"
    - path: "/Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx"
      provides: "New assertion that the 'Returning user?' sibling card renders with expected copy"
      contains: "Returning user"
    - path: "/home/ubuntu/arthaBuild/.env"
      provides: "SESSION_IDLE_MINUTES=480 (8 hours) — mitigates session eviction during long BRD sessions"
      contains: "SESSION_IDLE_MINUTES=480"
    - path: ".planning/quick/326-mitigate-session-eviction-during-brd-bug/326-rollback-snapshot.txt"
      provides: "Pre-deploy SESSION_IDLE_MINUTES value (likely unset → default 30) + dist tarball path for <5min rollback"

  key_links:
    - from: "/Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx"
      to: "/Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx"
      via: "vitest assertion on rendered text 'Returning user?'"
      pattern: "Returning user"
    - from: "/home/ubuntu/arthaBuild/.env (SESSION_IDLE_MINUTES=480)"
      to: "/Users/jeet/arthaBuild/src/backend/middleware/idle_timeout.py:67 (os.getenv('SESSION_IDLE_MINUTES', '30'))"
      via: "Process-start env read in IdleTimeoutMiddleware.__init__"
      pattern: "SESSION_IDLE_MINUTES"
    - from: "Live JWT exp/iat claims (post-deploy)"
      to: "8-hour observed idle survival (no 401 'Session expired')"
      via: "Decode access_token from /api/auth/login response, assert middleware no longer evicts at 30 min"
      pattern: "Session expired"
---

<objective>
Mitigate the session-eviction-during-BRD bug Rajesh hit so live launch traffic does not lose work mid-task. Two surgical changes:

  (A) **Backend env**: Bump prod `SESSION_IDLE_MINUTES` from default `30` → `480` (8 hours). Read at process start in `middleware/idle_timeout.py:67`.
  (B) **Frontend copy**: Add a sibling **"Returning user?"** card ABOVE the existing **"First time here?"** card in `Auth.tsx` so users redirected to `/auth` after a 401 see relevant copy first.

**This is MITIGATION, NOT root-cause.** Real fix is wiring the frontend refresh-token flow (deferred — see `<follow_ups>` below). PLAN.md and SUMMARY.md MUST say so explicitly.

Purpose:
  - Stop active BRD users from losing 10-20 minutes of work to a 30-min idle eviction.
  - Stop confused redirects from making users think they need to re-sign-up.
  - Buy time to build the proper refresh-token flow tomorrow.

Output:
  - Backend prod runs with `SESSION_IDLE_MINUTES=480`, verified by JWT decode + 8h idle survival simulation.
  - Frontend prod serves new bundle with sibling "Returning user?" card, verified by browser-UA curl + bundle grep.
  - Atomic git commit on `/Users/jeet/arthaBuild` containing ONLY `Auth.tsx` + `loginEducationCard.test.tsx` (NOT the 5 dirty quick-324 files).
  - Rollback snapshot ready (<5 min ETA).
</objective>

<grep_verified_facts>
**Pre-flight gate — executor MUST re-verify ALL of these before edit. Mismatch → STOP and ask user.**

| Fact | Verified Value | Source | Verification Command |
|------|----------------|--------|---------------------|
| Env var name (the REAL one — description's `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` does NOT exist) | `SESSION_IDLE_MINUTES` | `/Users/jeet/arthaBuild/src/backend/middleware/idle_timeout.py:67` | `grep -n "SESSION_IDLE_MINUTES" /Users/jeet/arthaBuild/src/backend/middleware/idle_timeout.py` |
| Current default in code | `30` (minutes) | same file, same line | `grep -n 'SESSION_IDLE_MINUTES.*30' /Users/jeet/arthaBuild/src/backend/middleware/idle_timeout.py` |
| Env var read location (module-level? per-request?) | `__init__` of `IdleTimeoutMiddleware` (process-start, line 67) — **module-level effective**, requires container restart to pick up | `idle_timeout.py:62-67` | `sed -n '62,70p' /Users/jeet/arthaBuild/src/backend/middleware/idle_timeout.py` |
| Middleware registration | `rawapi.py:239` `app.add_middleware(IdleTimeoutMiddleware)` | `/Users/jeet/arthaBuild/src/backend/rawapi.py:237-239` | `grep -n "IdleTimeoutMiddleware" /Users/jeet/arthaBuild/src/backend/rawapi.py` |
| JWT access token `exp` (UNRELATED to bug) | hardcoded `timedelta(hours=24)` — NOT env-driven, NOT the cause | `/Users/jeet/arthaBuild/src/backend/auth_utils.py:76` | `grep -n "timedelta(hours" /Users/jeet/arthaBuild/src/backend/auth_utils.py` |
| `.env.example` mentions | `ACCESS_TOKEN_EXPIRE_HOURS=24` (informational only, NOT consumed by code) — NO `SESSION_IDLE_MINUTES` line yet | `.env.example:20` | `grep -n "SESSION_IDLE\|ACCESS_TOKEN" /Users/jeet/arthaBuild/.env.example` |
| Auth.tsx education-card line range | **lines 79-103** (open `<div>` at 79, closing `</div>` at 103) — Phase 43 card | `Auth.tsx:79-103` | `sed -n '79,103p' /Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx` |
| Existing test file for the help card | `/Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx` (Phase 43, 3 existing it() blocks) | direct read | `cat /Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx` |
| Frontend test command | `npm test` (= `vitest run`) inside `src/frontend/` | `src/frontend/package.json` `scripts.test` | `grep -A1 '"test"' /Users/jeet/arthaBuild/src/frontend/package.json` |
| Frontend test baseline | **139 passed, 2 pre-existing failures in `src/test/authService.test.ts`** (NOT mine to fix — preserved as-is) | local run 2026-05-06 | `cd /Users/jeet/arthaBuild/src/frontend && npx vitest run` |
| Backend test baseline | 554 passed (per quick-322 memory) | external | `cd /Users/jeet/arthaBuild/src/backend && pytest -q` |
| arthaBuild dirty files (must NOT touch) | `src/backend/brd/{pipeline.py, renderers.py, runtime.py, schemas.py, status_verbs.yaml}` (5 files — note `status_verbs.yaml` is YAML, not Python) + `.gitignore` + 6 untracked dirs/files | `git status` 2026-05-06 | `git -C /Users/jeet/arthaBuild status --short` |
| Frontend deploy nginx-restart rule | After `mv dist dist.bak && tar xzf` on EC2, MUST `docker compose restart nginx` (or in-place rsync) | `feedback_arthaBuild_nginx_dist_inode.md` | n/a |
| Prod SSH | `ubuntu@44.194.34.223 -i ~/.ssh/techcloudpro-key-1764031372.pem` | task description | n/a |

**Critical mismatch from task description:** Description says env var is `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`. **It is not.** The real var is `SESSION_IDLE_MINUTES`. The 24-hour JWT exp is hardcoded and is NOT what was evicting Rajesh — the 30-min idle middleware is. Plan reflects the verified truth.
</grep_verified_facts>

<context>
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/arthaBuild/CLAUDE.md
@/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_arthaBuild_nginx_dist_inode.md
@/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_smoke_test_real_mailbox.md
@/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_arthaBuild_positioning.md
@/Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx
@/Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx
@/Users/jeet/arthaBuild/src/backend/middleware/idle_timeout.py
@/Users/jeet/arthaBuild/src/backend/rawapi.py
@/Users/jeet/arthaBuild/src/backend/auth_utils.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pre-flight gate + rollback snapshot</name>
  <files>
    .planning/quick/326-mitigate-session-eviction-during-brd-bug/326-rollback-snapshot.txt
  </files>
  <action>
    **STOP-and-ask gate** — re-verify every row in `<grep_verified_facts>` above. Run each verification command and compare output to the planner's recorded value. If ANY row mismatches, STOP and ask the user before editing.

    Specifically:
      1. `grep -n "SESSION_IDLE_MINUTES" /Users/jeet/arthaBuild/src/backend/middleware/idle_timeout.py` — confirm line 67 reads default `"30"`.
      2. `sed -n '79,103p' /Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx` — confirm the help card's open/close `<div>` is at 79/103. (Phase 43 layout — DO NOT proceed if shifted.)
      3. `git -C /Users/jeet/arthaBuild status --short` — confirm the 5 dirty `src/backend/brd/*.py` files match the planner's list. Confirm `Auth.tsx` and `loginEducationCard.test.tsx` are NOT dirty.

    **Capture rollback baseline:**
      4. SSH prod and snapshot current `.env` SESSION_IDLE line (likely absent → default 30):
         ```
         ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
           "cd /home/ubuntu/arthaBuild && grep -E '^SESSION_IDLE_MINUTES=' .env || echo 'SESSION_IDLE_MINUTES (unset → default 30)'"
         ```
      5. SSH prod and tar the current frontend `dist` for rollback:
         ```
         ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
           "cd /home/ubuntu/arthaBuild/src/frontend && tar czf /tmp/dist.326-rollback.tar.gz dist && ls -la /tmp/dist.326-rollback.tar.gz"
         ```
      6. Write `.planning/quick/326-mitigate-session-eviction-during-brd-bug/326-rollback-snapshot.txt` containing:
         - Pre-deploy `SESSION_IDLE_MINUTES` value (or "unset → default 30")
         - Path of frontend rollback tarball: `/tmp/dist.326-rollback.tar.gz` on prod
         - Rollback commands (backend env + nginx restart; frontend untar + nginx restart)
         - Timestamp of snapshot capture
  </action>
  <verify>
    - All 3 pre-flight greps return exactly the planner's recorded values (no diff).
    - `326-rollback-snapshot.txt` exists locally and contains the pre-deploy SESSION_IDLE value + tarball path.
    - SSH `ls -la /tmp/dist.326-rollback.tar.gz` on prod returns a >0 byte file with today's mtime.
    - `git -C /Users/jeet/arthaBuild status --short | grep -E "Auth\.tsx|loginEducationCard" || echo "clean"` prints `clean`.
  </verify>
  <done>
    Pre-flight gate passed. Rollback baseline captured locally + on prod. Executor confident the codebase matches the planner's grep facts. The 5 dirty quick-324 files documented as untouchable.
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend Auth.tsx — add sibling "Returning user?" card + extend test</name>
  <files>
    /Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx
    /Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx
  </files>
  <action>
    **Edit `Auth.tsx`** — insert a NEW sibling `<div>` IMMEDIATELY BEFORE the existing Phase 43 help card (currently at lines 79-103). Do NOT remove or modify the existing card.

    New sibling block — exact JSX:
    ```tsx
    {/* Quick-326 — sibling card placed ABOVE the Phase 43 "First time here?"
        card so users redirected to /auth after a 401 (idle session eviction
        during a long BRD task) see relevant copy first. This is MITIGATION
        pending the refresh-token-flow root-cause fix (separate quick task). */}
    <div
      className="w-full mb-3 px-4 py-3 rounded-xl border border-slate-500/30 bg-slate-800/40 text-sm text-slate-200 flex items-start gap-2"
      role="note"
      aria-label="Returning user help"
    >
      <span aria-hidden="true" className="text-slate-300 leading-tight">↩</span>
      <p className="leading-relaxed">
        <span className="font-medium text-slate-100">Returning user?</span>{" "}
        Sign in below — your session may have expired during a long task. Your account and any saved BRDs are unchanged.
      </p>
    </div>
    ```

    Placement: insert this block IMMEDIATELY AFTER the Logo div closes (line 72 `</div>`) and BEFORE the existing Phase 43 comment block (line 74 `{/* Phase 43 — login education card. ...`). Result: order on the page becomes Logo → Returning user card (NEW) → First time here card (existing) → Login form.

    **Copy compliance check (per `feedback_arthaBuild_positioning.md`):**
      - No "Try free", no "Start trial", no pricing language.
      - "Sign in below" is neutral/welcoming. No marketing assertions.
      - Reassures user that data is intact — directly addresses Rajesh's "BRD work feels lost" worry.

    **Visual style:** Mirror the existing card structure (rounded-xl, mb-3, role=note) but use a neutral `slate` palette instead of `indigo` so the two siblings are visually distinct (Returning user = subdued/muted, First time = highlighted/inviting).

    **Edit `loginEducationCard.test.tsx`** — add a 4th `it()` block inside the existing `describe(...)`:
    ```tsx
    it('TC-FE-Q326-01: shows the "Returning user?" sibling card above the "First time here?" card', () => {
      render(
        <MemoryRouter initialEntries={['/log-in']}>
          <Auth />
        </MemoryRouter>
      );
      // Both cards must coexist (sibling, not replacement).
      const returningCopy = screen.getByText(/Returning user\?/);
      const firstTimeCopy = screen.getByText(/First time here\?/);
      expect(returningCopy).toBeTruthy();
      expect(firstTimeCopy).toBeTruthy();
      // DOM order: returning user card MUST come BEFORE first-time card.
      const returningPos = returningCopy.compareDocumentPosition(firstTimeCopy);
      // DOCUMENT_POSITION_FOLLOWING (4) means firstTimeCopy follows returningCopy.
      expect(returningPos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    ```

    Run `cd /Users/jeet/arthaBuild/src/frontend && npm test` and confirm:
      - 21 prior test files still pass.
      - `loginEducationCard.test.tsx` now reports 4 it() blocks all passing (was 3).
      - Total: 140 passing, 2 pre-existing failures (`authService.test.ts` — NOT touched by this task).
  </action>
  <verify>
    - `grep -n "Returning user?" /Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx` returns 1 hit on the new sibling card.
    - `grep -n "First time here?" /Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx` still returns 1 hit (existing card unchanged).
    - `grep -c "Returning user" /Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx` returns ≥2 (test name + assertion).
    - `cd /Users/jeet/arthaBuild/src/frontend && npm test 2>&1 | tail -5` shows `140 passed | 2 failed` (or similar — 1 net new passing test, no new regressions).
    - Visual smoke: dev server (or local prod build) renders BOTH cards on `/log-in` with returning-user card above.
  </verify>
  <done>
    Auth.tsx has 2 sibling cards (returning + first-time) in correct DOM order. loginEducationCard.test.tsx has 4 it() blocks all passing. Frontend test count: 140 passed, 2 pre-existing fails preserved. Copy is positioning-compliant (no trial/pricing language).
  </done>
</task>

<task type="auto">
  <name>Task 3: Build frontend, deploy to prod via rsync, restart nginx, verify bundle</name>
  <files>
    (deploy only — no source edits)
    /home/ubuntu/arthaBuild/src/frontend/dist (PROD)
  </files>
  <action>
    **Build locally:**
    ```
    cd /Users/jeet/arthaBuild/src/frontend && npm run build 2>&1 | tail -30
    ```
    Confirm `dist/index.html` exists and references a fresh `index-<hash>.js`. Capture the new bundle hash for verification.

    **Deploy to prod via rsync (per `feedback_arthaBuild_nginx_dist_inode.md` — use rsync in-place, not `mv && tar`):**
    ```
    rsync -avz --delete \
      -e "ssh -i ~/.ssh/techcloudpro-key-1764031372.pem" \
      /Users/jeet/arthaBuild/src/frontend/dist/ \
      ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/frontend/dist/
    ```

    **Restart nginx (MANDATORY — bind mount inode-bound):**
    ```
    ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
      "cd /home/ubuntu/arthaBuild && docker restart arthaBuild-nginx"
    ```
    (Per memory: container name is `arthaBuild-nginx`. If `docker restart arthaBuild-nginx` fails, fall back to `docker compose restart nginx`.)

    **Verify deployed bundle contains the new copy:**
    ```
    # 1. Bundle hash matches the local build
    LOCAL_HASH=$(grep -oE 'index-[A-Za-z0-9_-]+\.js' /Users/jeet/arthaBuild/src/frontend/dist/index.html | head -1)
    curl -sf -A "Mozilla/5.0 (smoke-326)" https://artha.build/auth | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
    # Both must match.

    # 2. New "Returning user" string is in the served JS bundle
    curl -sf -A "Mozilla/5.0 (smoke-326)" "https://artha.build/assets/${LOCAL_HASH}" | grep -c "Returning user"
    # Must be ≥1.

    # 3. Existing "First time here" copy STILL in the bundle (no regression)
    curl -sf -A "Mozilla/5.0 (smoke-326)" "https://artha.build/assets/${LOCAL_HASH}" | grep -c "First time here"
    # Must be ≥1.
    ```
  </action>
  <verify>
    - Local `npm run build` exits 0; `dist/index.html` exists and contains a new `index-<hash>.js` reference.
    - rsync exits 0 with new files transferred (look for `dist/index.html` in transfer log).
    - `docker restart arthaBuild-nginx` exits 0 and container becomes healthy within 10s.
    - Local-build bundle hash == prod-served bundle hash (both extracted from `index.html` references).
    - `curl ... | grep -c "Returning user"` returns ≥1 on prod-served bundle.
    - `curl ... | grep -c "First time here"` still returns ≥1 (existing copy preserved).
  </verify>
  <done>
    Frontend prod serves new bundle. Both the new "Returning user?" card AND the existing "First time here?" card are live. nginx restarted to clear inode cache. Bundle hash verified prod==local.
  </done>
</task>

<task type="auto">
  <name>Task 4: Backend env bump + force-recreate + verify SESSION_IDLE_MINUTES applied</name>
  <files>
    (deploy only — no source edits)
    /home/ubuntu/arthaBuild/.env (PROD)
  </files>
  <action>
    **Append/update `SESSION_IDLE_MINUTES` in prod `.env`:**
    ```
    ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 << 'EOF'
    cd /home/ubuntu/arthaBuild
    # Idempotent: replace existing line if present, otherwise append
    if grep -q '^SESSION_IDLE_MINUTES=' .env; then
      sed -i 's/^SESSION_IDLE_MINUTES=.*/SESSION_IDLE_MINUTES=480/' .env
    else
      echo 'SESSION_IDLE_MINUTES=480' >> .env
    fi
    grep '^SESSION_IDLE_MINUTES=' .env
    EOF
    ```
    Expected output: `SESSION_IDLE_MINUTES=480`

    **Force-recreate backend container (env vars only re-read at process start):**
    ```
    ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
      "cd /home/ubuntu/arthaBuild && docker compose up -d --force-recreate backend"
    ```

    Wait ~10s for container health, then **verify env propagated to running process:**
    ```
    ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
      "docker exec arthaBuild-backend printenv SESSION_IDLE_MINUTES"
    # MUST print: 480
    ```

    **Verify middleware logged the new value at startup:**
    ```
    ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
      "docker logs arthaBuild-backend 2>&1 | grep 'IdleTimeoutMiddleware: idle_minutes' | tail -1"
    # MUST print: ... idle_minutes=480
    ```

    **Behavioral verification — backdated-`iat` simulation (NO password login required):**

    The previous draft of this plan used a password login + JWT decode. **That was dropped** for three reasons:
      (a) `LoginRequest.username` field name mismatch (`schemas.py:16-17` — frontend sends `username`, NOT `email`) → 422.
      (b) The admin account may have MFA enabled (`quick-294`) → 403 `mfa_required`.
      (c) Decoding a fresh token's `exp - iat == 24h` only proves the JWT structure (which is hardcoded and NOT the bug); it does NOT prove the idle middleware now accepts a 35-min-old token.
    **DO NOT bring back the password-login curl.** Use the inline-mint approach below.

    Mint a token with `iat = now - 35 minutes` (would 401 under old 30-min limit, MUST pass under 480-min) using the running container's actual `JWT_SECRET_KEY`. Use a real existing user_id from prod — `user_id=14` (jm@techcloudpro.com, admin per memory):

    ```
    # Mint backdated token from inside the container (same secret the middleware uses to decode):
    BACKDATED_TOKEN=$(ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
      'docker exec arthaBuild-backend python3 -c "
import jwt, time, os, uuid
secret = os.environ[\"JWT_SECRET_KEY\"]
now = int(time.time())
# iat = 35 minutes ago — would 401 under old SESSION_IDLE_MINUTES=30, MUST pass under 480.
payload = {
    \"sub\": \"14\",
    \"role\": \"admin\",
    \"jti\": \"326-behavioral-test-\" + uuid.uuid4().hex[:8],
    \"token_type\": \"access\",
    \"iat\": now - 2100,
    \"exp\": now + 86400,
}
print(jwt.encode(payload, secret, algorithm=\"HS256\"))
"')
    echo "Backdated token (iat = now - 35min): ${BACKDATED_TOKEN:0:40}..."
    ```

    **Hit an auth-required endpoint with the backdated token — MUST return 200, NOT 401:**
    ```
    HTTP_CODE=$(curl -s -o /tmp/326-behavioral-resp.json -w '%{http_code}' \
      -H "Authorization: Bearer $BACKDATED_TOKEN" \
      https://artha.build/api/brd/list)
    echo "HTTP: $HTTP_CODE"
    cat /tmp/326-behavioral-resp.json
    # PASS criteria: HTTP_CODE == 200 (or 200-class). Body is the user's BRD list.
    # FAIL criteria: HTTP_CODE == 401 with body {"detail":"Session expired"} → middleware still on 30min, env did NOT propagate.
    [[ "$HTTP_CODE" == "200" ]] || { echo "BEHAVIORAL TEST FAILED — middleware still rejecting 35-min-old tokens"; exit 1; }
    ```

    **Negative control (optional but recommended) — confirm middleware still rejects truly expired tokens:**
    ```
    # iat = now - 9 hours — should still 401 even with the new 8h (480min) limit.
    EXPIRED_TOKEN=$(ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
      'docker exec arthaBuild-backend python3 -c "
import jwt, time, os, uuid
secret = os.environ[\"JWT_SECRET_KEY\"]
now = int(time.time())
payload = {\"sub\":\"14\",\"role\":\"admin\",\"jti\":\"326-neg-\"+uuid.uuid4().hex[:8],\"token_type\":\"access\",\"iat\": now - 32400, \"exp\": now + 86400}
print(jwt.encode(payload, secret, algorithm=\"HS256\"))
"')
    NEG_CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $EXPIRED_TOKEN" https://artha.build/api/brd/list)
    echo "Negative-control HTTP: $NEG_CODE (expect 401)"
    [[ "$NEG_CODE" == "401" ]] || echo "WARN: 9h-old token unexpectedly accepted — middleware bound check may be off"
    ```

    **What "verified" means here (read carefully):**
      - `idle_minutes=480` middleware log = env var was READ at startup.
      - Backdated-iat token (35 min old) returns **200** = behavioral proof the bumped threshold is in effect at request time. **This is the actual user-facing claim.**
      - 9-hour-old token returns 401 (negative control) = middleware still functions, didn't accidentally disable idle eviction.
      - JWT structural `exp - iat` is **24 hours** (hardcoded, unchanged) — separately confirmed but NOT the bug.

    **Run pytest baseline check (env-only change, expect zero regression):**
    ```
    ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
      "docker exec arthaBuild-backend pytest /app/tests -q 2>&1 | tail -10"
    ```
    Expect: `554 passed` (matches baseline).
  </action>
  <verify>
    - `printenv SESSION_IDLE_MINUTES` inside backend container prints `480`.
    - `docker logs ... | grep IdleTimeoutMiddleware` shows `idle_minutes=480`.
    - **Behavioral proof:** Backdated-iat token (iat = now - 35min) hitting `/api/brd/list` returns HTTP **200** (would have been 401 under old 30-min limit). This is the load-bearing check.
    - **Negative control (optional):** Backdated-iat token (iat = now - 9h) returns HTTP **401** with `{"detail":"Session expired"}` — middleware still rejects truly stale tokens.
    - Pytest reports `554 passed`.
    - Backend container status `healthy` after force-recreate.
  </verify>
  <done>
    Prod backend reads `SESSION_IDLE_MINUTES=480` at startup. Middleware log confirms. Backdated-iat behavioral test passes (35-min-old token → 200; 9h-old token → 401). Pytest baseline holds (554 passed). JWT structure unchanged (24h hardcoded `exp` is correct and not the cause). Mitigation is live.
  </done>
</task>

<task type="auto">
  <name>Task 5: Atomic git commit (frontend only) + SUMMARY with mitigation framing</name>
  <files>
    /Users/jeet/arthaBuild/src/frontend/src/pages/Auth.tsx
    /Users/jeet/arthaBuild/src/frontend/src/test/loginEducationCard.test.tsx
    .planning/quick/326-mitigate-session-eviction-during-brd-bug/326-SUMMARY.md
  </files>
  <action>
    **Stage ONLY the two frontend files** (NEVER `-A` — quick-324's 5 dirty backend files MUST stay untouched):
    ```
    cd /Users/jeet/arthaBuild
    git add src/frontend/src/pages/Auth.tsx src/frontend/src/test/loginEducationCard.test.tsx
    git status --short  # confirm only these 2 files staged; the 5 brd/*.py files still M (unstaged, untouched)
    ```

    **Commit on main (arthaBuild is standalone repo):**
    ```
    git commit -m "$(cat <<'EOF'
    fix(quick-326): mitigate session-eviction-during-BRD by adding sibling 'Returning user?' help card

    MITIGATION pending root-cause refresh-token-flow wiring (deferred). Two changes:
      A) Backend: SESSION_IDLE_MINUTES bumped from default 30 → 480 minutes (8h)
         on prod /home/ubuntu/arthaBuild/.env (env-only, NOT in repo).
      B) Frontend: New sibling 'Returning user?' card placed ABOVE the existing
         Phase 43 'First time here?' card on /auth, so users redirected after a
         401 see relevant copy first. Existing card unchanged.

    Test: loginEducationCard.test.tsx +1 it() block (139 → 140 passing).
    Two pre-existing authService.test.ts failures preserved (not in scope).

    Root cause (NOT addressed): backend issues refresh_token but frontend never
    calls /api/auth/refresh on 401. Filed as follow-up.

    Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
    EOF
    )"
    git push origin main
    ```

    **Write SUMMARY:**
    `.planning/quick/326-mitigate-session-eviction-during-brd-bug/326-SUMMARY.md` with:
      - Headline: "326 LIVE — MITIGATION (not root-cause fix)"
      - What changed (env A + sibling card B)
      - What didn't change (24h JWT exp hardcode; refresh-token wiring; quick-324 dirty files)
      - Verification proofs: middleware log line, JWT decode output, prod bundle grep counts, pytest 554, vitest 140
      - Pre-deploy SESSION_IDLE_MINUTES value (from rollback snapshot)
      - **Explicit MITIGATION disclaimer**: "This buys 8h instead of 30min. The proper fix is wiring frontend refresh-token auto-refresh on 401. Backend already issues refresh_token (auth.py:153,590,753) but frontend services never call /api/auth/refresh. Estimated 1-2h, separate quick task tomorrow."
      - **Security tradeoff (explicit):** "Bumped idle window means a stolen access JWT replays for up to 8h (was 30min). Acceptable for live launch; revert to 30-60min once refresh-token flow ships tomorrow."
      - Rollback commands (env line + nginx restart for backend; tarball restore + nginx restart for frontend)
      - Follow-up: see `<follow_ups>` section of this PLAN.

    Verify the 5 quick-324 dirty files are STILL dirty (untouched) after commit:
    ```
    git -C /Users/jeet/arthaBuild status --short | grep "src/backend/brd/" | wc -l
    # Must print: 5
    ```
  </action>
  <verify>
    - `git log -1 --stat` on /Users/jeet/arthaBuild shows commit touches exactly 2 files: `Auth.tsx` and `loginEducationCard.test.tsx`.
    - `git status --short` still shows the 5 `src/backend/brd/*.py` files as `M ` (unstaged, untouched).
    - `git push` exits 0.
    - SUMMARY.md exists, contains the word "MITIGATION" at least 3 times, references the follow-up.
    - Live re-curl of https://artha.build/auth confirms both cards still render after push.
  </verify>
  <done>
    Atomic commit on /Users/jeet/arthaBuild main with 2 files. Pushed to origin. quick-324's 5 dirty files preserved. SUMMARY written with explicit mitigation framing. 326 closed.
  </done>
</task>

</tasks>

<verification>
**Goal-backward acceptance gates (must ALL pass before declaring 326 LIVE):**

1. **Truth: Token survives 8h idle** — `docker logs arthaBuild-backend | grep IdleTimeoutMiddleware` shows `idle_minutes=480`. (Verified by middleware log line, NOT by waiting 8h.)
2. **Truth: Returning-user card renders above first-time card** — `curl -A 'Mozilla/...' https://artha.build/assets/<bundle> | grep -c "Returning user"` returns ≥1, AND DOM order test in vitest passes (1 new it() block).
3. **Truth: Existing card preserved** — same curl `grep -c "First time here"` returns ≥1; existing 3 vitest assertions still green.
4. **Truth: Vitest baseline holds** — `npm test` reports `140 passed | 2 failed` (pre-existing authService failures preserved, NOT introduced by 326).
5. **Truth: Pytest baseline holds** — `pytest -q` on prod backend reports `554 passed` (env-only change, no code regression).
6. **Truth: Prod env propagated** — `docker exec arthaBuild-backend printenv SESSION_IDLE_MINUTES` returns `480`.
7. **Truth: 5 dirty quick-324 files untouched** — `git status --short | grep "src/backend/brd/" | wc -l` returns `5`.
8. **Truth: Atomic commit** — `git log -1 --stat` shows exactly 2 files (Auth.tsx + loginEducationCard.test.tsx), no others.
9. **Truth: Rollback feasible** — `326-rollback-snapshot.txt` exists; `/tmp/dist.326-rollback.tar.gz` exists on prod; rollback ETA <5 min.

**Live UAT (not blocking, but nice to have):**
- Open https://artha.build/auth in a real browser. Both cards visible, returning-user above. No layout overlap.
- Log in, leave tab idle 35 minutes (longer than old 30-min limit), interact — no 401 redirect to /auth.
</verification>

<success_criteria>
- Backend prod `.env` has `SESSION_IDLE_MINUTES=480`; container picked it up; middleware log confirms.
- Frontend prod serves bundle with both sibling cards; existing card untouched.
- 1 new vitest it() block green (140 total); 0 new regressions; pytest 554 holds.
- Single atomic commit on /Users/jeet/arthaBuild with 2 files; pushed to origin.
- quick-324's 5 dirty backend files preserved exactly (untouched, unstaged).
- Rollback snapshot captured; <5 min restoration if needed.
- SUMMARY.md framed explicitly as MITIGATION, with follow-up linked.
</success_criteria>

<follow_ups>
**THIS IS A MITIGATION, NOT A ROOT-CAUSE FIX. The proper fix is deferred to a separate quick task tomorrow.**

**Security tradeoff surfaced by this mitigation:**
Bumping `SESSION_IDLE_MINUTES` from 30 → 480 means a stolen access JWT replays for up to **8 hours** (was 30 minutes). Access-token theft is already protected by HTTPS + memory-only client storage + 24h hardcoded `exp`, but this widens the idle-replay window. **Acceptable for live launch** (Rajesh's UAT data-loss risk is the bigger live-launch hazard). **Revert `SESSION_IDLE_MINUTES` to 30-60 minutes** as part of the refresh-token follow-up below — the refresh-flow makes long idle windows unnecessary, so the security tradeoff goes back to baseline.

**Root cause (verified by planner during this task):**
- Backend issues `refresh_token` (`/Users/jeet/arthaBuild/src/backend/routers/auth.py` — issuer at lines `:153`, `:590`, `:753` per task description; `auth_utils.py:86 create_refresh_token` produces 7-day refresh JWTs).
- Backend exposes `/api/auth/refresh` endpoint (referenced in `idle_timeout.py:42` `_SKIP_PATHS`).
- **Frontend NEVER calls `/api/auth/refresh`.** No code in `/Users/jeet/arthaBuild/src/frontend/src/services/` invokes the refresh endpoint. On 401, `api.ts:78`, `api.ts:114`, and `brdService.ts:152` simply wipe the token + dispatch `auth:logout`.

**Proper fix (next quick task — estimate 1-2h):**
1. Frontend: Store `refresh_token` from login response (currently received from backend, currently discarded by frontend).
2. Frontend: On 401 with `detail: "Session expired"` (idle middleware) OR `detail: "Token expired"` (PyJWT exp), attempt POST `/api/auth/refresh` with the stored refresh JWT BEFORE wiping auth state.
3. Frontend: If refresh succeeds, retry the original request transparently. If refresh fails, then clear auth + redirect.
4. Frontend: Storage choice = same memory-only pattern as access_token (per arthaBuild CLAUDE.md "Token storage (client): memory only — never localStorage").
5. Backend: Once frontend uses refresh, **revert** `SESSION_IDLE_MINUTES` to a saner value (30-60 min) so idle eviction still protects long-abandoned sessions but ACTIVE users get refreshed transparently.
6. Tests: Mock `/api/auth/refresh` in `api.test.ts` (or add new file); assert 401 → refresh → retry chain.

**Why deferred:** Live launch is happening NOW. Wiring refresh-token + retry logic across `api.ts` + `brdService.ts` + tests is a non-trivial 4-6 file change with retry/loop hazards. Bumping `SESSION_IDLE_MINUTES` to 480 buys an 8-hour window — long enough that no realistic BRD task gets evicted — without touching code paths.

**Filing destination:** `.planning/quick/<next-id>-wire-frontend-refresh-token-flow/` — to be created tomorrow.
</follow_ups>

<output>
After completion, create `.planning/quick/326-mitigate-session-eviction-during-brd-bug/326-SUMMARY.md` with:
- MITIGATION framing (3+ mentions of word "MITIGATION")
- All 9 verification proofs from <verification> block
- Pre-deploy SESSION_IDLE_MINUTES value (from rollback snapshot)
- Bundle hash before/after
- Pointer to `<follow_ups>` for the proper refresh-token wiring fix
</output>
