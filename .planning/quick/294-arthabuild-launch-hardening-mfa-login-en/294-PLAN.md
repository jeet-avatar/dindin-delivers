---
phase: 294-arthabuild-launch-hardening
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # arthaBuild repo (code) — /Users/jeet/arthaBuild/
  - /Users/jeet/arthaBuild/src/backend/schemas.py
  - /Users/jeet/arthaBuild/src/backend/routers/auth.py
  - /Users/jeet/arthaBuild/src/backend/tests/test_auth.py
  - /Users/jeet/arthaBuild/src/frontend/public/.well-known/security.txt
  # EC2 production host — 44.194.34.223
  # (frontend dist redeploy — static file delivery of security.txt; no backend image rebuild needed for MFA because src is bind-mounted OR image rebuild required — task 3 determines + executes)
  # dindin monorepo (docs)
  - /Users/jeet/doordash-p2p/.planning/quick/294-arthabuild-launch-hardening-mfa-login-en/294-PLAN.md
  - /Users/jeet/doordash-p2p/.planning/quick/294-arthabuild-launch-hardening-mfa-login-en/294-SUMMARY.md
autonomous: true
requirements:
  - HARDEN-01  # MFA enforcement on login (backend gate + unit test)
  - HARDEN-02  # /.well-known/security.txt (RFC 9116 responsible-disclosure contact)
  - HARDEN-03  # Zero-assume retest of quick-293 items ①–⑤ + the 2 new items

must_haves:
  truths:
    - "A user with an active MFA secret who logs in with correct password but no otp_code receives 403 with {mfa_required: true}; valid otp_code yields normal 200 + JWT"
    - "A user without MFA continues to log in with just password (no regression)"
    - "https://artha.build/.well-known/security.txt returns 200 with content-type text/plain and body contains Contact + Expires fields per RFC 9116"
    - "Every claim from quick-293 SUMMARY is reverified with a fresh live command (grep/curl/ssh) and the evidence table lists all passes/fails"
  artifacts:
    - path: "/Users/jeet/arthaBuild/src/backend/schemas.py"
      provides: "LoginRequest extended with optional otp_code field"
      contains: "otp_code"
    - path: "/Users/jeet/arthaBuild/src/backend/routers/auth.py"
      provides: "login() calls MFA gate between password-verify and JWT-issue"
      contains: "_get_active_secret"
    - path: "/Users/jeet/arthaBuild/src/backend/tests/test_auth.py"
      provides: "Unit test: user with active MFA → login without otp → 403 {mfa_required: true}; correct otp → 200"
      contains: "test_login_mfa"
    - path: "/Users/jeet/arthaBuild/src/frontend/public/.well-known/security.txt"
      provides: "RFC 9116 responsible-disclosure contact file"
      contains: "Contact:"
  key_links:
    - from: "routers/auth.py login()"
      to: "routers/mfa.py _get_active_secret()"
      via: "direct import + call between password verify (line ~97) and token return (line ~114)"
      pattern: "_get_active_secret\\("
    - from: "schemas.py LoginRequest"
      to: "frontend login payload"
      via: "otp_code optional — backwards compatible with current frontend that sends only username+password"
      pattern: "otp_code"
    - from: "src/frontend/public/.well-known/security.txt"
      to: "dist/.well-known/security.txt (vite build copies public verbatim)"
      via: "nginx try_files serves static with default text/plain mime"
      pattern: "Contact:"
---

<objective>
Close two gaps deferred from quick-293 and re-verify every quick-293 claim end-to-end with zero memory assumptions.

Purpose: The launch is live but two known hardening items were explicitly deferred in the quick-293 handoff: (1) MFA enforcement in the login flow — backend built in Phase 13 but never called — and (2) `/.well-known/security.txt` for responsible disclosure. User also wants everything retested with fresh live commands (no claim passes based on memory of what shipped).

Output: Backend enforces MFA at login for users who have enabled it. `https://artha.build/.well-known/security.txt` serves RFC 9116 contact info. A full retest table in the SUMMARY with command + actual output + pass/fail for every quick-293 item (①–⑤) and both new items (⑥–⑦).
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/quick/293-foolproof-arthabuild-launch-delete-accou/293-SUMMARY.md
@/Users/jeet/.claude/handoffs/2026-04-20-arthaBuild-launch-foolproof-5-fixes.md
@/Users/jeet/arthaBuild/src/backend/routers/auth.py
@/Users/jeet/arthaBuild/src/backend/routers/mfa.py
@/Users/jeet/arthaBuild/src/backend/schemas.py
@/Users/jeet/arthaBuild/src/backend/tests/test_auth.py
</context>

<repo_discipline>
**Two-repo split (STRICT — identical to quick-293):**

| Work | Repo | Path | Commit style |
|------|------|------|--------------|
| Code changes (backend MFA, security.txt, test) | arthaBuild standalone | `/Users/jeet/arthaBuild/` | Explicit `git add <files>`. **NEVER `git add -A`.** Repo has pre-existing uncommitted modifications that MUST stay unstaged. |
| EC2 deploy | production host | `44.194.34.223:/home/ubuntu/arthaBuild/` | SSH; dist redeploy for security.txt; backend container reload for MFA |
| Plan + Summary docs | dindin monorepo | `/Users/jeet/doordash-p2p/.planning/quick/294-.../` | Normal git on current branch |

**Commit boundaries:**
- arthaBuild code commit: ONLY the 4 files listed under arthaBuild paths in `files_modified`.
- dindin doc commit: ONLY the PLAN + SUMMARY files.
- **No `--no-verify`** on either commit.

**SSH to EC2:**
```
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223
```

**nginx bind-mount rule (inode-bound):** after dist swap with `mv dist dist.bak && tar xzf`, `docker compose restart nginx` is MANDATORY or nginx keeps serving the orphan directory.

**Backend container env rule:** `docker compose restart backend` does NOT re-read `.env`. For env changes use `docker compose up -d backend`. (Not needed in this plan — no new env vars.)

**Backend code reload rule:** the backend container may run baked source OR a bind-mount — determine at deploy time:
```
ssh -i $KEY ubuntu@44.194.34.223 \
  "docker compose -f /home/ubuntu/arthaBuild/docker-compose.yml config | grep -A5 '^  backend:' | grep -E 'volumes|image'"
```
If there is a `volumes:` mapping to local source → just `docker compose restart backend`. If only an `image:` line → need to rebuild + up. Task 3 handles this.
</repo_discipline>

<tasks>

<task type="auto">
  <name>Task 1: Backend MFA enforcement in login flow + unit test</name>
  <files>
    /Users/jeet/arthaBuild/src/backend/schemas.py
    /Users/jeet/arthaBuild/src/backend/routers/auth.py
    /Users/jeet/arthaBuild/src/backend/tests/test_auth.py
  </files>
  <action>
`cd /Users/jeet/arthaBuild` for all work in this task.

**Pre-verified baseline** (confirmed while planning):
- `routers/auth.py:51-122` login endpoint has: look-up user (62) → lockout check (76) → password verify (84) → failed-attempt tracking (86-97) → reset failed counter + audit (100-104) → email-verified gate (107-112) → `return TokenResponse(...)` (114-122).
- `routers/mfa.py:70-75` has `_get_active_secret(db, user_id)` helper returning `MFASecret | None`. Import it — don't duplicate the query.
- `routers/mfa.py:183-213` endpoint `/api/auth/mfa/check` is the designed caller pattern. We are inlining the same logic directly in login() rather than an internal HTTP call (zero-latency, no self-call loop risk).
- `schemas.py:16-18` LoginRequest has only `username: str` + `password: str`.
- `pyotp` is already a dep (used by mfa.py line 20). No `requirements.txt` change.

**Step 1 — Extend LoginRequest schema:**

Edit `src/backend/schemas.py`. Update the `LoginRequest` class to:
```py
class LoginRequest(BaseModel):
    username: str   # frontend sends 'username' field (email value)
    password: str
    otp_code: Optional[str] = None   # present only if user has MFA enabled
```

`Optional` is already imported from `typing` at line 2. No other changes.

**Step 2 — Wire MFA gate into login():**

Edit `src/backend/routers/auth.py`.

2a. Add import at top alongside the existing `from models import User, PasswordResetToken` (line 10). Add a new line:
```py
from models import User, PasswordResetToken, MFASecret
```
And add a pyotp import with the other stdlib/third-party lines near `import jwt` (line 23):
```py
import pyotp
```

Do NOT import from `routers.mfa` — that creates a router-to-router dep. Instead, keep the `_get_active_secret` query inline in login() (same 2-line select).

2b. Modify the `login()` function body. Insert a new block AFTER the email-verification gate (currently lines 107-112) and BEFORE the `return TokenResponse(...)` (currently line 114). The new block:

```py
    # MFA enforcement — if user has an active MFA secret, require valid otp_code
    # (same logic as routers/mfa.py::check_mfa, inlined to avoid self-HTTP call)
    mfa_result = await db.execute(
        select(MFASecret).where(
            MFASecret.user_id == user.id,
            MFASecret.is_active == True,
        )
    )
    active_secret = mfa_result.scalar_one_or_none()
    if active_secret is not None:
        if not data.otp_code or not data.otp_code.strip():
            raise HTTPException(
                status_code=403,
                detail={"mfa_required": True, "message": "MFA code required"},
            )
        totp = pyotp.TOTP(active_secret.secret)
        if not totp.verify(data.otp_code.strip(), valid_window=1):
            raise HTTPException(
                status_code=403,
                detail={"mfa_required": True, "message": "Invalid MFA code"},
            )
```

Placement note: AFTER email-verified gate so a user with unverified email still hits the email gate first (avoids leaking "this email has MFA" before email is verified). BEFORE `TokenResponse` so no JWT is issued without the OTP.

Do NOT change anything else in login(). Do NOT touch the Google OAuth flow (OAuth-verified users skip password anyway — MFA for OAuth users is a separate future task, out of scope per launch pragmatism).

**Step 3 — Unit test:**

Edit `src/backend/tests/test_auth.py`. Append a new test block at the end of the FR-AUTH-03 Login section (before TC-AUTH-11 block at line 139 is fine; find a sensible location between existing login tests — after `test_login_valid_credentials`). Three tests covering the three behaviours:

```py
# ---------------------------------------------------------------------------
# FR-AUTH-03b: MFA enforcement at login (quick-294)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_mfa_required_without_otp_returns_403(client, registered_user, db_session):
    """
    Quick-294: User with active MFASecret logging in with correct password but
    no otp_code → 403 with detail.mfa_required=True. No JWT issued.

    Architecture: routers/auth.py login() inlines routers/mfa.py MFA check
    between email-verify gate and JWT issuance.
    """
    from models import MFASecret, User
    import pyotp
    from sqlalchemy import select

    # Arrange: activate MFA for registered_user
    result = await db_session.execute(
        select(User).where(User.email == registered_user["email"].lower())
    )
    user = result.scalar_one()
    secret = pyotp.random_base32()
    db_session.add(MFASecret(user_id=user.id, secret=secret, is_active=True))
    await db_session.commit()

    # Act: login without otp
    resp = await client.post("/api/auth/login", json={
        "username": registered_user["email"],
        "password": registered_user["password"],
    })

    # Assert
    assert resp.status_code == 403
    body = resp.json()
    # FastAPI wraps dict-detail under "detail" key
    assert body["detail"]["mfa_required"] is True
    assert "access_token" not in body


@pytest.mark.asyncio
async def test_login_mfa_required_with_valid_otp_succeeds(client, registered_user, db_session):
    """
    Quick-294: User with active MFA + valid TOTP code → 200 with JWT.
    """
    from models import MFASecret, User
    import pyotp
    from sqlalchemy import select

    result = await db_session.execute(
        select(User).where(User.email == registered_user["email"].lower())
    )
    user = result.scalar_one()
    secret = pyotp.random_base32()
    db_session.add(MFASecret(user_id=user.id, secret=secret, is_active=True))
    await db_session.commit()

    valid_code = pyotp.TOTP(secret).now()

    resp = await client.post("/api/auth/login", json={
        "username": registered_user["email"],
        "password": registered_user["password"],
        "otp_code": valid_code,
    })

    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_no_mfa_still_works_without_otp(client, registered_user):
    """
    Quick-294 regression guard: user WITHOUT MFA still logs in with just
    password (backwards compatible — MFA enforcement only triggers when
    active MFASecret row exists for the user).
    """
    resp = await client.post("/api/auth/login", json={
        "username": registered_user["email"],
        "password": registered_user["password"],
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()
```

**Fixture dependency check:** The first two tests use `db_session`. Verify this fixture exists in `conftest.py`:
```
grep -n "db_session" src/backend/tests/conftest.py | head -5
```
If it doesn't exist but there's an equivalent (e.g. `async_db_session`, `db`), substitute that name. If no async DB fixture exists at all, create the MFASecret rows by calling the existing `/api/auth/mfa/enroll` + `/api/auth/mfa/verify` endpoints (authenticated) instead — adapt the test accordingly. **Do NOT guess the fixture name — inspect conftest.py first.**

**Step 4 — Run tests:**

```
cd /Users/jeet/arthaBuild/src/backend
# Activate venv (check path first — likely .venv or venv at repo root or backend dir)
source ../../venv/bin/activate 2>/dev/null || source venv/bin/activate 2>/dev/null || source .venv/bin/activate 2>/dev/null
pytest tests/test_auth.py -v -k "mfa or test_login_valid or test_login_wrong" 2>&1 | tail -40
```

Expected: 3 new tests pass + existing login tests still pass. If any existing test breaks, stop — the MFA block is inserted in the wrong place (it must be AFTER the successful-login audit commit at line 104, so failed-login tests don't hit the MFA branch).

**Do NOT commit yet** — Task 3 handles deploy + retest + commit together.
  </action>
  <verify>
```
cd /Users/jeet/arthaBuild

# Schema change visible
grep -n "otp_code" src/backend/schemas.py
# expected: "otp_code: Optional[str] = None"

# Login flow has MFA gate + uses _get_active_secret-style query
grep -n "MFASecret\|pyotp" src/backend/routers/auth.py
# expected: MFASecret imported (one hit near top) + select(MFASecret) query inside login()
# + pyotp imported + pyotp.TOTP(...) inside login()

# Test file has 3 new tests
grep -n "def test_login_mfa\|def test_login_no_mfa" src/backend/tests/test_auth.py
# expected: 3 hits

# Pytest
cd src/backend && pytest tests/test_auth.py -v -k "mfa or test_login_valid or test_login_wrong" 2>&1 | tail -20
# expected: all pass (new + existing)
```
  </verify>
  <done>
- `schemas.py` LoginRequest has optional `otp_code` field
- `routers/auth.py` login() imports MFASecret + pyotp, and between email-verify gate and JWT issuance executes the active-secret lookup + OTP verification; returns 403 `{mfa_required: true, ...}` when MFA required
- `tests/test_auth.py` has 3 new MFA tests — all pass
- Existing login tests still pass (no regression — MFA block only executes when `active_secret is not None`)
- No changes to Google OAuth flow
  </done>
</task>

<task type="auto">
  <name>Task 2: RFC 9116 security.txt</name>
  <files>
    /Users/jeet/arthaBuild/src/frontend/public/.well-known/security.txt
  </files>
  <action>
`cd /Users/jeet/arthaBuild`.

**Pre-verified** while planning: vite `publicDir` is default (`public/`). Existing `public/robots.txt` already ships in dist as text/plain — confirmed by nginx `try_files $uri $uri/ /index.html` + default mime types. Nested subdirs in `public/` (e.g. `public/.well-known/`) are copied verbatim at build time. No nginx config change needed.

**Create `src/frontend/public/.well-known/security.txt`** — mkdir the parent first:
```
mkdir -p src/frontend/public/.well-known
```

File contents (verbatim — RFC 9116 compliant):

```
# ArthaBuild responsible disclosure contact
# RFC 9116 — https://datatracker.ietf.org/doc/html/rfc9116

Contact: mailto:security@artha.build
Contact: https://artha.build/security
Expires: 2027-04-20T00:00:00Z
Preferred-Languages: en
Canonical: https://artha.build/.well-known/security.txt
Policy: https://artha.build/security
```

Notes on each field:
- `Contact` — two entries per RFC 9116 best practice. `security@artha.build` is the dedicated inbox already referenced in the Compliance section shipped in quick-293 SUMMARY. If that alias isn't routed yet, `hello@artha.build` is a confirmed-live fallback (per memory: ArthaBuild Tier 1 trust signals); **prefer security@artha.build even if routing is pending** — it's the industry-standard alias and mail can be routed post-launch without file change.
- `Expires` — exactly 1 year from today (2026-04-20 → 2027-04-20), ISO 8601 UTC. RFC requires a future timestamp; 1 year is the recommended cadence.
- `Preferred-Languages: en` — single value, no quotes.
- `Canonical` — the published URL — prevents spoofed copies on other domains being trusted.
- `Policy` — points at `/security` page (shipped in quick-293) which is our public disclosure policy landing.

**Build + smoke-test locally:**
```
cd src/frontend
npm run build
# Expect: no errors
ls -la dist/.well-known/security.txt
# Expect: file exists, ~260-350 bytes
cat dist/.well-known/security.txt
# Expect: body as written above, no BOM, no CRLF
```

If vite emits a warning about the hidden directory (unlikely — robots.txt proves dotfile paths work), add a `build.copyPublicDir: true` override, but this should be a no-op in practice.

**Do NOT deploy yet** — Task 3 bundles the frontend tar + ships to EC2.
  </action>
  <verify>
```
ls -la /Users/jeet/arthaBuild/src/frontend/public/.well-known/security.txt
# expected: file exists

grep -c "^Contact:" /Users/jeet/arthaBuild/src/frontend/public/.well-known/security.txt
# expected: 2

grep -c "^Expires:" /Users/jeet/arthaBuild/src/frontend/public/.well-known/security.txt
# expected: 1

grep "^Expires:" /Users/jeet/arthaBuild/src/frontend/public/.well-known/security.txt
# expected: ISO date 2027-04-20T00:00:00Z (1 year from today)

ls /Users/jeet/arthaBuild/src/frontend/dist/.well-known/security.txt
# expected: file exists after `npm run build`
```
  </verify>
  <done>
- `src/frontend/public/.well-known/security.txt` exists
- File contains Contact (≥1), Expires (1), Canonical, Policy, Preferred-Languages fields
- Expires is a future ISO 8601 timestamp (2027-04-20T00:00:00Z)
- `npm run build` emits `dist/.well-known/security.txt`
- No nginx config change needed (try_files + default mime already handle it)
  </done>
</task>

<task type="auto">
  <name>Task 3: Deploy + zero-assume retest + two-repo commit</name>
  <files>
    /Users/jeet/arthaBuild/ (code commit — 4 files from Tasks 1+2)
    /home/ubuntu/arthaBuild/ (EC2 — dist redeploy + backend reload)
    /Users/jeet/doordash-p2p/.planning/quick/294-arthabuild-launch-hardening-mfa-login-en/294-SUMMARY.md (docs commit)
  </files>
  <action>
**A. Deploy frontend dist (delivers security.txt)**

From local:
```
cd /Users/jeet/arthaBuild/src/frontend
tar czf /tmp/arthaBuild-dist-294.tar.gz -C dist .
scp -i ~/.ssh/techcloudpro-key-1764031372.pem /tmp/arthaBuild-dist-294.tar.gz ubuntu@44.194.34.223:/tmp/
```

SSH + swap dist (same inode-bound pattern as quick-293):
```
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 <<'REMOTE'
set -e
# Confirm nginx dist path (pulled from quick-293: /home/ubuntu/arthaBuild/src/frontend/dist)
NGINX_DIST="/home/ubuntu/arthaBuild/src/frontend/dist"
cd "$(dirname "$NGINX_DIST")"
mv dist "dist.bak.$(date +%s)"
mkdir dist
tar xzf /tmp/arthaBuild-dist-294.tar.gz -C dist
# Sanity: security.txt is inside
ls -la dist/.well-known/security.txt
# MANDATORY: restart nginx (bind-mount follows inode)
cd /home/ubuntu/arthaBuild
docker compose restart nginx
# Local smoke from inside EC2
sleep 2
curl -sI http://localhost/.well-known/security.txt | head -3
REMOTE
```

**B. Deploy backend (delivers MFA enforcement)**

First, determine whether backend uses bind-mount or baked image:
```
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "docker compose -f /home/ubuntu/arthaBuild/docker-compose.yml config | awk '/^  backend:/,/^  [a-z]/' | grep -E 'volumes|image|build'"
```

Then:
- **If `volumes:` maps local source** (e.g. `./src/backend:/app/backend`): scp the 2 changed python files + `docker compose restart backend`.
  ```
  scp -i ~/.ssh/techcloudpro-key-1764031372.pem /Users/jeet/arthaBuild/src/backend/routers/auth.py ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/backend/routers/auth.py
  scp -i ~/.ssh/techcloudpro-key-1764031372.pem /Users/jeet/arthaBuild/src/backend/schemas.py ubuntu@44.194.34.223:/home/ubuntu/arthaBuild/src/backend/schemas.py
  ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 'cd /home/ubuntu/arthaBuild && docker compose restart backend'
  ```
- **If only `image:` line** (source baked into image — quick-293 memory hints backend source is baked): need to git push → ssh pull → rebuild.
  ```
  # On local — after committing in step D below, push first, THEN:
  ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 <<'REMOTE'
  cd /home/ubuntu/arthaBuild
  git pull origin main
  docker compose build backend
  docker compose up -d backend
  REMOTE
  ```
  (In this case, order flips: commit+push BEFORE SSH pull. Adapt subtask order.)

**Confirm backend picked up new code (either path):**
```
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "docker compose -f /home/ubuntu/arthaBuild/docker-compose.yml exec backend grep -c 'mfa_required' routers/auth.py"
# expected: >= 2 (two HTTPException raise sites in the new MFA block)
```

**C. Zero-assume retest — produce evidence table**

This is the critical output. For EACH item below, run the listed command(s), capture actual output, and record Pass/Fail. NO claim may pass based on memory. Run as a shell block and dump stdout into the SUMMARY.

```bash
# Save outputs to a scratch file we'll paste into SUMMARY
RETEST=/tmp/294-retest-$(date +%s).log
exec > >(tee -a "$RETEST") 2>&1

echo "==== ① Delete-account UI (quick-293 item 1) ===="
curl -sI -o /dev/null -w "account/delete HTTP: %{http_code}\n" https://artha.build/account/delete
BUNDLE=$(curl -s "https://artha.build/?v=$(date +%s)" | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
echo "Bundle: $BUNDLE"
curl -s "https://artha.build/assets/${BUNDLE}?v=$(date +%s)" | grep -c 'account/delete' | xargs echo "bundle: 'account/delete' hit count:"
curl -s "https://artha.build/assets/${BUNDLE}?v=$(date +%s)" | grep -c 'deleteAccount' | xargs echo "bundle: 'deleteAccount' hit count:"
# Backend endpoint existence: 401 without auth (not 404)
curl -s -o /dev/null -w "DELETE /api/user/me (no auth) HTTP: %{http_code}\n" -X DELETE https://artha.build/api/user/me

echo "==== ② og-image-v2.png (quick-293 item 2) ===="
curl -sI https://artha.build/og-image-v2.png | grep -iE "^HTTP|^content-length|^content-type"
curl -s https://artha.build/og-image-v2.png -o /tmp/og-check.png && file /tmp/og-check.png

echo "==== ③ 404 page (quick-293 item 3) ===="
RANDOM_PATH="/zzz-retest-$(date +%s)"
curl -sI "https://artha.build${RANDOM_PATH}" | head -1
curl -s "https://artha.build${RANDOM_PATH}" | grep -c "This page doesn't exist\|404" | xargs echo "404 string hits:"

echo "==== ④ /security compliance (quick-293 item 4) ===="
curl -s "https://artha.build/assets/${BUNDLE}?v=$(date +%s)" | grep -c 'Compliance & Attestations' | xargs echo "'Compliance & Attestations' bundle hits:"
curl -s "https://artha.build/assets/${BUNDLE}?v=$(date +%s)" | grep -oE 'SOC.?2|Subprocessor|DPA|GDPR' | sort -u

echo "==== ⑤ Sentry DSN on EC2 (quick-293 item 5) ===="
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "grep -E '^SENTRY_DSN=' /home/ubuntu/arthaBuild/.env | sed 's/=.*/=<redacted-first40>/' | head -c 120; echo"
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "cd /home/ubuntu/arthaBuild && docker compose exec -T backend sh -c 'printenv SENTRY_DSN | head -c 40; echo'" 2>/dev/null || echo "backend container exec failed or SENTRY_DSN still empty"

echo "==== ⑥ MFA enforcement (quick-294 item 1) ===="
cd /Users/jeet/arthaBuild/src/backend
(source ../../venv/bin/activate 2>/dev/null || source venv/bin/activate 2>/dev/null || source .venv/bin/activate 2>/dev/null); \
  pytest tests/test_auth.py -v -k "mfa" 2>&1 | tail -15
# Live smoke — MFA gate visible in prod backend code
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "cd /home/ubuntu/arthaBuild && docker compose exec -T backend grep -c 'mfa_required' routers/auth.py"

echo "==== ⑦ security.txt (quick-294 item 2) ===="
curl -sI https://artha.build/.well-known/security.txt | head -5
curl -s https://artha.build/.well-known/security.txt | head -20
curl -s https://artha.build/.well-known/security.txt | grep -c "^Contact:" | xargs echo "Contact: lines:"
curl -s https://artha.build/.well-known/security.txt | grep -c "^Expires:" | xargs echo "Expires: lines:"
```

**D. Commit — arthaBuild standalone repo**

```
cd /Users/jeet/arthaBuild

# Confirm ONLY the 4 intended files are modified/new (pre-existing mods stay unstaged)
git status --short
# Expect: M src/backend/schemas.py
#         M src/backend/routers/auth.py
#         M src/backend/tests/test_auth.py (or ?? if the append was into a section that makes git see it as modified — both fine)
#         ?? src/frontend/public/.well-known/security.txt
# Plus pre-existing unrelated mods — leave them unstaged.

# Stage explicitly — NEVER `git add -A`
git add src/backend/schemas.py
git add src/backend/routers/auth.py
git add src/backend/tests/test_auth.py
git add src/frontend/public/.well-known/security.txt

git status --short
# Verify: only those 4 paths are staged

git commit -m "$(cat <<'EOF'
feat(launch-hardening): enforce MFA at login + publish security.txt

- schemas.LoginRequest: add optional otp_code field
- routers/auth.login(): require valid TOTP when user has active MFASecret
  (inlined check between email-verify gate and JWT issuance — same logic
  as routers/mfa.check_mfa, no self-HTTP-call)
- tests/test_auth: 3 new MFA-enforcement tests (required-without-otp,
  valid-otp-success, no-MFA-regression)
- public/.well-known/security.txt: RFC 9116 disclosure contact
  (Contact: security@artha.build, Expires: 2027-04-20)

Closes 2 deferred items from quick-293 handoff. Zero-assume retest of
quick-293 items ①–⑤ + new items ⑥–⑦ captured in
.planning/quick/294-.../294-SUMMARY.md.
EOF
)"

# Push (branch per quick-293 = main)
git push origin main
```

**E. Write SUMMARY (dindin)**

Create `/Users/jeet/doordash-p2p/.planning/quick/294-arthabuild-launch-hardening-mfa-login-en/294-SUMMARY.md` using the canonical summary template. Key sections:

1. **Must-haves acceptance table** — 4 rows from frontmatter truths, all with proof.
2. **Retest evidence table** — 7 rows (① through ⑦), columns: Item | Command | Result | Pass/Fail. Paste actual output from `/tmp/294-retest-*.log`. No claim may be "PASS (from memory)" — must have a command + output. Items that fail because of user-blocked state (e.g. Sentry DSN still empty) are marked ⚠️ BLOCKED with explanation.
3. **Deviations** (Rule 1-4 style from quick-293 SUMMARY) — note the backend deploy pathway used (bind-mount vs rebuild), any test fixture substitution needed in Task 1 Step 3, any line-number drift from the planned insertion points.
4. **User actions still outstanding:**
   - CF SSL=Full(Strict) — dashboard-only, user handles
   - CF cache purge for legacy `/og-image.png` — dashboard-only (canonical is `/og-image-v2.png` and works)
   - Sentry DSN — carries over from quick-293 if still blocked
5. **Frontend MFA login prompt UI** — explicitly noted as post-launch follow-up. Backend returns 403 `{mfa_required: true}`; frontend can keep shipping as-is because ZERO production users currently have `MFASecret.is_active=True` (MFA enrollment UI never integrated). Backend gate is the gate that matters; frontend OTP input is UX polish for when MFA is enabled.

**F. Commit docs (dindin)**

```
cd /Users/jeet/doordash-p2p
git status --short .planning/quick/294-*/
git add .planning/quick/294-arthabuild-launch-hardening-mfa-login-en/294-PLAN.md
git add .planning/quick/294-arthabuild-launch-hardening-mfa-login-en/294-SUMMARY.md
git commit -m "docs(quick-294): arthaBuild launch hardening — MFA + security.txt + retest"
```

Do NOT push other unrelated pre-existing modifications in either repo.
  </action>
  <verify>
```
# arthaBuild commit is clean — 4 files only
cd /Users/jeet/arthaBuild
git log -1 --stat
# expected: 4 files (schemas.py, routers/auth.py, tests/test_auth.py, public/.well-known/security.txt)

# dindin commit clean — 2 docs only
cd /Users/jeet/doordash-p2p
git log -1 --stat
# expected: 294-PLAN.md + 294-SUMMARY.md only

# Live prod proofs — the 7-item retest, distilled:
curl -sI https://artha.build/.well-known/security.txt | head -2
# expected: HTTP/2 200 + content-type text/plain

curl -s https://artha.build/.well-known/security.txt | grep -cE "^Contact:|^Expires:"
# expected: >= 3 (2 Contact + 1 Expires)

ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \
  "cd /home/ubuntu/arthaBuild && docker compose exec -T backend grep -c mfa_required routers/auth.py"
# expected: >= 2

# Backend tests still green
cd /Users/jeet/arthaBuild/src/backend && pytest tests/test_auth.py -v -k "login" 2>&1 | tail -5
# expected: all pass, including 3 new MFA tests
```
  </verify>
  <done>
- Task 1+2 files deployed to production: security.txt reachable at https://artha.build/.well-known/security.txt (200, text/plain); backend routers/auth.py in prod container contains MFA gate (≥2 `mfa_required` hits)
- Pytest MFA tests pass locally (3/3)
- Retest evidence table in SUMMARY covers all 7 items (①–⑦) with real command output — no memory-based passes
- arthaBuild commit contains ONLY the 4 launch-hardening files; pre-existing unrelated modifications unstaged
- dindin commit contains ONLY PLAN + SUMMARY
- User-action items (CF SSL, CF cache purge for legacy og-image.png, Sentry DSN if still blocked) flagged in SUMMARY with explicit "USER ACTION REQUIRED" header
- `git push origin main` succeeded on arthaBuild
  </done>
</task>

</tasks>

<verification>
**Combined truth table for quick-294:**

| # | Truth | Proof |
|---|-------|-------|
| T1 | MFA-enabled user without otp → 403; with otp → 200 | `pytest tests/test_auth.py -k mfa` → 3/3 pass; prod backend container contains `mfa_required` in routers/auth.py |
| T2 | No-MFA user still logs in with just password | `pytest tests/test_auth.py::test_login_valid_credentials` still passes + new `test_login_no_mfa_still_works` passes |
| T3 | security.txt served per RFC 9116 | `curl -s https://artha.build/.well-known/security.txt` has ≥1 `Contact:` + `Expires:` future date + `Canonical:` |
| T4 | Zero-assume retest executed | SUMMARY contains evidence table with real command output for items ①–⑦ |

**Rules honored:**
- ✅ Google OAuth flow untouched (not in files_modified)
- ✅ OAuth users skip MFA gate by design (they don't hit password-based login() — out of scope per handoff)
- ✅ arthaBuild repo: explicit `git add`, never `-A`; pre-existing unrelated mods stay unstaged
- ✅ nginx `restart` after dist swap (inode-bound bind-mount)
- ✅ Backend reload pathway determined at deploy time (bind-mount → restart; baked → rebuild + up)
- ✅ `--no-verify` NOT used on any commit
- ✅ Launch is not broken for existing users — zero production users currently have active MFASecret, so backend gate never triggers until they opt in
- ✅ No frontend code change for login prompt — acceptable because no user has MFA enrolled yet; frontend UX is a post-launch follow-up
</verification>

<success_criteria>
- `https://artha.build/.well-known/security.txt` returns 200 with valid RFC 9116 content (verified via curl)
- Backend prod container contains the MFA enforcement block in `routers/auth.py` (verified via `docker compose exec grep`)
- 3 new MFA unit tests pass + no existing test regresses
- Retest evidence table in 294-SUMMARY.md shows 7 items (①–⑦) with real command output — no memory-based passes
- arthaBuild single commit (4 files) pushed to `main`
- dindin single commit (PLAN + SUMMARY) on current branch
- Outstanding items (CF SSL, CF cache purge, Sentry DSN if still blocked) flagged as USER ACTION in SUMMARY
</success_criteria>

<output>
After completion, commit to dindin:
- /Users/jeet/doordash-p2p/.planning/quick/294-arthabuild-launch-hardening-mfa-login-en/294-PLAN.md (this file)
- /Users/jeet/doordash-p2p/.planning/quick/294-arthabuild-launch-hardening-mfa-login-en/294-SUMMARY.md (written in Task 3)
</output>
