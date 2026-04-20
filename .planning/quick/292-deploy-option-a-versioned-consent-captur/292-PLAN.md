---
phase: 292-deploy-option-a-versioned-consent-captur
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/arthaBuild/src/backend/models.py
  - /Users/jeet/arthaBuild/src/backend/schemas.py
  - /Users/jeet/arthaBuild/src/backend/routers/user.py
  - /Users/jeet/arthaBuild/src/backend/alembic/versions/23a_user_consents.py
  - /Users/jeet/arthaBuild/src/frontend/src/pages/SignUp.tsx
  - /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
autonomous: true
requirements:
  - OPTION-A-DEPLOY-01
  - OPTION-A-DEPLOY-02
  - OPTION-A-DEPLOY-03

must_haves:
  truths:
    - "The 6 Option A files are committed to github.com/jeet-avatar/arthabuild main"
    - "EC2 backend container is running code that contains UserConsent model + consent writes in /api/user/register"
    - "user_consents table exists in production SQLite DB at /app/data/arthaBuild.db"
    - "Frontend served by https://artha.build renders the new 'How ArthaBuild works' 3-phase card, 'In plain English' summary, and scope-ack checkbox on /create-account"
    - "POST /api/user/register with terms_version+privacy_version+scope_ack_version returns 201 and inserts 3 rows into user_consents (terms, privacy, scope_ack) with real IP and captured User-Agent"
  artifacts:
    - path: "/home/ubuntu/arthaBuild/src/backend/models.py (on EC2)"
      provides: "UserConsent ORM model on production backend"
      contains: "class UserConsent"
    - path: "/home/ubuntu/arthaBuild/src/backend/alembic/versions/23a_user_consents.py (on EC2)"
      provides: "Alembic migration head = 23a_user_consents"
      contains: "revision = '23a_user_consents'"
    - path: "/home/ubuntu/arthaBuild/src/backend/routers/user.py (on EC2)"
      provides: "Register endpoint that captures UA, IP, and writes 3 UserConsent rows"
      contains: "UserConsent("
    - path: "/home/ubuntu/arthaBuild/src/frontend/dist (on EC2, fresh inode)"
      provides: "Built frontend with SignUp scope-ack + plain-English summary + 3-phase card"
    - path: "user_consents table in /app/data/arthaBuild.db"
      provides: "GDPR Art.7 / SOC 2 consent receipt trail"
  key_links:
    - from: "SignUp.tsx submit"
      to: "POST /api/user/register"
      via: "authService.register() with terms_version/privacy_version/scope_ack_version"
      pattern: "terms_version.*privacy_version.*scope_ack_version"
    - from: "routers/user.py register()"
      to: "user_consents table"
      via: "3 UserConsent inserts after user row commit (defaults 2026-04-19/2026-04-20 if client omits)"
      pattern: "UserConsent\\("
    - from: "docker compose build backend"
      to: "running arthaBuild-backend container"
      via: "image rebake then up -d (plain restart does NOT pick up source changes — source is baked into image)"
    - from: "mv dist && tar xzf new dist"
      to: "nginx serving new bundle"
      via: "docker compose restart nginx (bind mount is inode-bound — without restart nginx serves orphan dir)"
---

<objective>
Deploy the already-written Option A versioned consent capture code from the standalone repo at /Users/jeet/arthaBuild/ to production at https://artha.build (EC2 44.194.34.223). The code changes are COMPLETE and CORRECT — this plan is pure deploy + verify. Do not edit application code.

Purpose: Ship GDPR Art.7 / SOC 2-compliant versioned consent capture (terms, privacy, scope_ack) + the new "How ArthaBuild works" 3-phase SignUp copy that reconciles the prior contradictory "NetSuite creds never leave browser" messaging with the actual free-tier scope.

Output:
- 6 files committed + pushed to github.com/jeet-avatar/arthabuild main
- user_consents table live in prod SQLite (via alembic upgrade head → 23a_user_consents)
- New backend image running (docker compose build backend && up -d backend)
- New frontend dist served by nginx (mv + tar + docker compose restart nginx — inode gotcha)
- Smoke test proving end-to-end: POST /api/user/register → 201 + 3 rows in user_consents with real IP + real UA
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/.claude/handoffs/2026-04-20-arthaBuild-option-a-consent-capture.md

# Permanent rules relevant to this deploy (internalize — do NOT relitigate):
# - ArthaBuild deploys are SSH + docker-compose (NOT the dindin CI/CD workflows in ./CLAUDE.md — those are dollor.ai only)
# - nginx bind-mount is inode-bound → `docker compose restart nginx` is MANDATORY after `mv dist && untar`
# - Backend source is baked into image → `docker compose build backend` is MANDATORY (plain `restart` does NOT pick up .py changes)
# - SMTP = Gmail only. Never Resend/SES for ArthaBuild.
# - Free email domains rejected at register → smoke test MUST use a company domain (e.g. @techcloudpro.com)
# - EXEMPT_DOMAINS=artha.build + FREE_ACCOUNTS_PER_DOMAIN=3 → use a fresh domain per smoke test to avoid hitting the cap
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scoped git commit (6 files only) + push + local frontend build</name>
  <files>
    /Users/jeet/arthaBuild/src/backend/models.py
    /Users/jeet/arthaBuild/src/backend/schemas.py
    /Users/jeet/arthaBuild/src/backend/routers/user.py
    /Users/jeet/arthaBuild/src/backend/alembic/versions/23a_user_consents.py
    /Users/jeet/arthaBuild/src/frontend/src/pages/SignUp.tsx
    /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
  </files>
  <action>
    All work in `/Users/jeet/arthaBuild/` (the STANDALONE repo — NOT the dindin monorepo). Do not `cd` into dindin.

    **Step 1a — Verify uncommitted state matches handoff expectations:**
    ```bash
    cd /Users/jeet/arthaBuild
    git status --short
    ```
    There may be OTHER unrelated modified files. Do NOT blanket-stage with `git add -A` or `git add .`. Stage ONLY these 6 paths:

    ```bash
    cd /Users/jeet/arthaBuild
    git add \
      src/backend/models.py \
      src/backend/schemas.py \
      src/backend/routers/user.py \
      src/backend/alembic/versions/23a_user_consents.py \
      src/frontend/src/pages/SignUp.tsx \
      src/frontend/src/services/authService.ts
    ```

    **Step 1b — Confirm staged diff before committing:**
    ```bash
    git diff --cached --stat
    ```
    Expect exactly 6 files in the output. If any OTHER files are staged, unstage them with `git restore --staged <path>` before committing. If any of the 6 files are missing (i.e. untracked vs modified), `git add` each individually — the alembic migration `23a_user_consents.py` is NEW and may be untracked.

    **Step 1c — Commit + push:**
    ```bash
    git commit -m "feat(signup): capture versioned consent receipts + scope ack (Option A)

Adds user_consents table + captures terms_version, privacy_version,
scope_ack_version with IP + User-Agent on registration (GDPR Art.7 / SOC 2).
SignUp page replaces contradictory 'NetSuite creds never leave browser' copy
with 3-phase 'How ArthaBuild works' card + plain-English summary + scope-ack
checkbox binding free-tier expectation to contract.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
    git push origin main
    ```

    **Step 1d — Build frontend locally (dist needed for Task 3):**
    ```bash
    cd /Users/jeet/arthaBuild/src/frontend
    npm run build
    ```
    Postbuild also generates a 95-URL sitemap. Confirm `dist/` directory exists and contains `index.html` + `assets/`.

    **Do NOT edit any source file.** If `npm run build` fails with a TypeScript/lint error, STOP — do not paper over it. The handoff asserts the code is complete and correct; a build failure means either a missing dependency or an environment issue, not a code bug to fix.
  </action>
  <verify>
    ```bash
    # Confirm push landed
    cd /Users/jeet/arthaBuild && git log -1 --stat origin/main | head -20
    # Confirm the HEAD commit touches exactly the 6 files
    git show --stat HEAD | grep -E "(models\.py|schemas\.py|user\.py|23a_user_consents\.py|SignUp\.tsx|authService\.ts)" | wc -l   # expect 6

    # Confirm dist exists
    ls -la /Users/jeet/arthaBuild/src/frontend/dist/index.html
    ls /Users/jeet/arthaBuild/src/frontend/dist/assets/ | head
    ```
  </verify>
  <done>
    HEAD on origin/main is a single commit touching exactly the 6 Option A files, no more, no fewer. `/Users/jeet/arthaBuild/src/frontend/dist/` contains a fresh build with `index.html` + `assets/`.
  </done>
</task>

<task type="auto">
  <name>Task 2: scp backend to EC2 → docker compose build + up + alembic upgrade head</name>
  <files>
    (remote) ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/backend/models.py
    (remote) ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/backend/schemas.py
    (remote) ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/backend/routers/user.py
    (remote) ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/backend/alembic/versions/23a_user_consents.py
  </files>
  <action>
    **Step 2a — scp 4 backend files (NOT frontend — that's Task 3):**
    ```bash
    KEY=~/.ssh/techcloudpro-key-1764031372.pem
    EC2=ubuntu@44.194.34.223
    cd /Users/jeet/arthaBuild/src/backend

    scp -i $KEY models.py schemas.py $EC2:/home/ubuntu/arthaBuild/src/backend/
    scp -i $KEY routers/user.py $EC2:/home/ubuntu/arthaBuild/src/backend/routers/
    scp -i $KEY alembic/versions/23a_user_consents.py $EC2:/home/ubuntu/arthaBuild/src/backend/alembic/versions/
    ```

    **Step 2b — Rebuild backend image + bring up + migrate.**

    CRITICAL GOTCHA: Backend source is BAKED INTO THE IMAGE at build time. A plain `docker compose restart backend` will NOT pick up the scp'd .py files — you MUST rebuild the image. Then `docker compose up -d backend` recreates the container from the new image.

    ```bash
    ssh -i $KEY $EC2 << 'EOF'
      set -e
      cd /home/ubuntu/arthaBuild
      docker compose build backend
      docker compose up -d backend
      # Let container finish booting before running migration
      sleep 8
      # Alembic runs against the SQLite mounted from host into /app/data/
      docker exec arthaBuild-backend alembic upgrade head
      docker exec arthaBuild-backend alembic current
    EOF
    ```

    Expected alembic output:
    ```
    Running upgrade g2h3i4j5k6l7 -> 23a_user_consents, Add user_consents table...
    ```
    And `alembic current` should show `23a_user_consents (head)`.

    **If `alembic upgrade head` fails:** do NOT retry blindly. Capture `docker logs arthaBuild-backend --tail 80` and `docker exec arthaBuild-backend alembic history | tail -20`. Common causes: (a) migration file did not scp correctly — re-run scp, (b) down_revision mismatch — but handoff confirms `down_revision='g2h3i4j5k6l7'` is current head, so this should not occur.

    **Step 2c — Sanity check: backend is serving + UserConsent importable:**
    ```bash
    ssh -i $KEY $EC2 "docker exec arthaBuild-backend python -c 'from src.backend.models import UserConsent; print(UserConsent.__tablename__)'"
    # Expect: user_consents
    ```
    If import path differs (e.g. the container WORKDIR is `/app` with models at `models.py` directly), try `python -c 'from models import UserConsent; print(UserConsent.__tablename__)'` as fallback.
  </action>
  <verify>
    ```bash
    KEY=~/.ssh/techcloudpro-key-1764031372.pem
    EC2=ubuntu@44.194.34.223

    # 1. Container is Up
    ssh -i $KEY $EC2 "docker ps --filter name=arthaBuild-backend --format 'table {{.Names}}\t{{.Status}}'"

    # 2. Migration head is 23a_user_consents
    ssh -i $KEY $EC2 "docker exec arthaBuild-backend alembic current"

    # 3. Table exists in SQLite
    ssh -i $KEY $EC2 "docker exec arthaBuild-backend sqlite3 /app/data/arthaBuild.db '.schema user_consents'"
    # Expect: CREATE TABLE user_consents (...) with user_id, consent_type, document_version, accepted_at, ip_address, user_agent columns

    # 4. Backend responds (health endpoint)
    curl -sf https://artha.build/api/health | head
    ```
  </verify>
  <done>
    `docker ps` shows `arthaBuild-backend` as Up. `alembic current` reports `23a_user_consents (head)`. `.schema user_consents` returns the full CREATE TABLE DDL. `/api/health` returns 200. No errors in `docker logs arthaBuild-backend --tail 50`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Ship frontend dist (inode-safe nginx restart) + end-to-end smoke test</name>
  <files>
    (remote) ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/frontend/dist/
    (remote) /tmp/artha-dist.tgz
  </files>
  <action>
    **Step 3a — Package dist locally + scp to EC2:**
    ```bash
    KEY=~/.ssh/techcloudpro-key-1764031372.pem
    EC2=ubuntu@44.194.34.223
    cd /Users/jeet/arthaBuild/src/frontend
    tar czf /tmp/artha-dist.tgz -C . dist
    scp -i $KEY /tmp/artha-dist.tgz $EC2:/tmp/
    ```

    **Step 3b — Atomic dist swap + nginx restart.**

    CRITICAL GOTCHA (permanent memory `feedback_arthaBuild_nginx_dist_inode.md`): nginx's bind-mount to `src/frontend/dist` is INODE-BOUND. After `mv dist dist.bak && tar xzf`, the new `dist/` has a different inode — nginx will keep serving the ORPHAN OLD DIRECTORY unless restarted. `docker compose restart nginx` is MANDATORY. Do not skip.

    ```bash
    ssh -i $KEY $EC2 << 'EOF'
      set -e
      cd /home/ubuntu/arthaBuild/src/frontend
      TS=$(date +%s)
      # Keep old dist as backup (rolled back via `mv dist.bak.$TS dist && docker compose restart nginx` if smoke fails)
      mv dist dist.bak.$TS
      tar xzf /tmp/artha-dist.tgz
      ls -la dist/index.html
      # MANDATORY: nginx bind mount is inode-bound
      docker compose -f /home/ubuntu/arthaBuild/docker-compose.yml restart nginx
      sleep 3
      docker ps --filter name=nginx --format 'table {{.Names}}\t{{.Status}}'
    EOF
    ```

    **Step 3c — End-to-end smoke test: register a consent-capture user.**

    Gotchas: MUST use a company domain (Gmail/Yahoo/etc. rejected by `_validate_free_email_domain`). Use `@techcloudpro.com` (whitelisted via EXEMPT_DOMAINS or well-known TCP domain). Use a timestamp in the local-part to avoid collisions and the per-domain cap.

    ```bash
    TIMESTAMP=$(date +%s)
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST https://artha.build/api/user/register \
      -H "Content-Type: application/json" \
      -H "User-Agent: OptionA-smoketest/1.0" \
      -d "{
        \"first_name\":\"Test\",
        \"last_name\":\"Consent\",
        \"email\":\"consent-smoke-${TIMESTAMP}@techcloudpro.com\",
        \"password\":\"Consent123!\",
        \"organization\":\"Smoke Test\",
        \"terms_version\":\"2026-04-19\",
        \"privacy_version\":\"2026-04-19\",
        \"scope_ack_version\":\"2026-04-20\"
      }")
    echo "$RESPONSE"
    # Expect HTTP_CODE:201 and body: "Registration successful. Please check your email..."
    ```

    **Step 3d — Prove 3 consent rows written with real IP + real UA:**
    ```bash
    KEY=~/.ssh/techcloudpro-key-1764031372.pem
    EC2=ubuntu@44.194.34.223
    ssh -i $KEY $EC2 "docker exec arthaBuild-backend sqlite3 /app/data/arthaBuild.db \
      \"SELECT consent_type, document_version, ip_address, substr(user_agent,1,40) FROM user_consents ORDER BY id DESC LIMIT 3;\""
    ```
    Expected 3 rows:
    - `terms|2026-04-19|<real-client-ip>|OptionA-smoketest/1.0`
    - `privacy|2026-04-19|<real-client-ip>|OptionA-smoketest/1.0`
    - `scope_ack|2026-04-20|<real-client-ip>|OptionA-smoketest/1.0`

    IP must NOT be literal `"unknown"` — if it is, the register handler is failing to read `X-Forwarded-For` / `request.client.host`. Flag this, do not pass.

    **Step 3e — Prove new frontend copy is served:**
    ```bash
    # Fetch JS bundle reference from /create-account, then grep inside the bundle.
    # (Strings live in bundled JS, not the HTML shell.)
    BUNDLE_URL=$(curl -s https://artha.build/create-account | grep -oE '/assets/index-[A-Za-z0-9]+\.js' | head -1)
    echo "Bundle: $BUNDLE_URL"
    curl -s "https://artha.build${BUNDLE_URL}" | grep -oE "How ArthaBuild works|In plain English|free tier answers NetSuite" | sort -u
    # Expect 3 distinct strings. If 0 or 1, the old bundle is still being served → nginx didn't pick up new dist → re-run Step 3b restart.
    ```

    **If smoke fails:** roll back frontend with `ssh -i $KEY $EC2 "cd /home/ubuntu/arthaBuild/src/frontend && rm -rf dist && mv dist.bak.<TS> dist && docker compose restart nginx"`. Capture `docker logs arthaBuild-backend --tail 100` for diagnosis before retrying.
  </action>
  <verify>
    ```bash
    KEY=~/.ssh/techcloudpro-key-1764031372.pem
    EC2=ubuntu@44.194.34.223

    # 1. Nginx serving new bundle (3 distinct strings)
    BUNDLE_URL=$(curl -s https://artha.build/create-account | grep -oE '/assets/index-[A-Za-z0-9]+\.js' | head -1)
    curl -s "https://artha.build${BUNDLE_URL}" | grep -c "How ArthaBuild works"   # >= 1
    curl -s "https://artha.build${BUNDLE_URL}" | grep -c "In plain English"       # >= 1
    curl -s "https://artha.build${BUNDLE_URL}" | grep -c "free tier answers NetSuite"  # >= 1

    # 2. Register returned 201
    #    (covered by Step 3c output)

    # 3. 3 consent rows with real IP + captured UA
    ssh -i $KEY $EC2 "docker exec arthaBuild-backend sqlite3 /app/data/arthaBuild.db \
      \"SELECT consent_type, document_version, ip_address, substr(user_agent,1,40) FROM user_consents ORDER BY id DESC LIMIT 3;\""
    # Manual assertion: 3 rows, types = {terms, privacy, scope_ack}, ip != 'unknown', UA contains 'OptionA-smoketest/1.0'
    ```
  </verify>
  <done>
    POST /api/user/register with the 3 version fields returns HTTP 201. `sqlite3` SELECT returns exactly 3 rows (terms, privacy, scope_ack) for the newest user, all with real client IP (not `"unknown"`) and User-Agent `OptionA-smoketest/1.0`. The bundled JS at `/assets/index-*.js` contains all three new strings: "How ArthaBuild works", "In plain English", "free tier answers NetSuite". `dist.bak.<TS>/` kept on EC2 for rollback.
  </done>
</task>

</tasks>

<verification>
Full stack verification (run after Task 3):

1. **Git state:** `github.com/jeet-avatar/arthabuild` main HEAD commit touches exactly the 6 Option A files.
2. **Backend:** `docker exec arthaBuild-backend alembic current` shows `23a_user_consents (head)`. `user_consents` table exists in `/app/data/arthaBuild.db`.
3. **Frontend:** Bundled JS at current `/assets/index-*.js` contains the three new strings.
4. **End-to-end:** One real registration via `curl` → 201 → 3 consent rows with real IP + real UA.
5. **No regressions:** `curl -sf https://artha.build/api/health` returns 200. `curl -sf https://artha.build/` returns 200. `docker logs arthaBuild-backend --tail 50` has no stack traces.
</verification>

<success_criteria>
- [ ] Scoped commit (6 files exactly) pushed to `github.com/jeet-avatar/arthabuild` main
- [ ] EC2 backend image rebuilt + container recreated (NOT just restarted — source is baked into image)
- [ ] `alembic upgrade head` ran; `user_consents` table exists in prod SQLite
- [ ] Frontend `dist/` swapped on EC2 + `docker compose restart nginx` executed (inode gotcha — mandatory)
- [ ] `curl POST /api/user/register` with 3 version fields → 201
- [ ] `sqlite3 SELECT` returns 3 rows (terms, privacy, scope_ack) with real IP (not "unknown") + captured User-Agent
- [ ] Bundled JS contains "How ArthaBuild works", "In plain English", "free tier answers NetSuite"
- [ ] `dist.bak.<TS>/` retained on EC2 for rollback
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/292-deploy-option-a-versioned-consent-captur/292-SUMMARY.md` covering:
- Commit SHA pushed to main (6 files)
- Alembic migration confirmation output
- Smoke test `curl` response (201 + body)
- SQLite SELECT output showing 3 consent rows
- Any deviations from the plan (e.g. if rollback was triggered)
- Open items deferred to a follow-up task: (a) UserConsent writes in Google OAuth signup path, (b) `/account` delete-account flow, (c) `/security` trust-center content, (d) re-consent prompt on version bump
</output>
