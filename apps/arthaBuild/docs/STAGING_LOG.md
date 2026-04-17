# ArthaBuild Staging Log

> **One source of truth for all staging issues, test cases, and resolutions.**
> Every issue encountered on staging goes here — symptom, root cause, fix, and verification.
> If something breaks again, check here first.

---

## How to Use This Log

- **RESOLVED** — fixed and verified working
- **OPEN** — encountered, not yet fixed
- **DEFERRED** — known issue, intentionally skipped for now
- Each entry has: symptom → root cause → fix → how to verify

---

## Staging Environment

| Item | Value |
|------|-------|
| Server | EC2 t3.xlarge (`i-062dcd31988aed289`) |
| IP | `3.228.239.112` |
| SSH | `ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@3.228.239.112` |
| App dir | `/home/ubuntu/arthaBuild/` |
| URL | `https://artha.build` |
| Compose file | `docker-compose.staging.yml` |

---

## Session: 2026-04-11 — Staging Server Provision

### STAG-001 — SuiteCloud CLI license flag missing in Dockerfile
**Status:** RESOLVED

**Symptom:** Docker build hangs or fails silently during `npm install -g @oracle/suitecloud-cli`

**Root cause:** SuiteCloud CLI requires `--acceptsuitecloudsdklicense` flag to accept Oracle's license agreement during install. Without it, the interactive prompt blocks in CI/non-TTY environments.

**Fix:** Added `--acceptsuitecloudsdklicense` to both `npm install` lines in `Dockerfile` (builder stage line 15, production stage line 46).

```dockerfile
RUN npm install -g @oracle/suitecloud-cli --no-fund --no-audit --acceptsuitecloudsdklicense
```

**Verify:**
```bash
docker build -t arthaBuild-test . 2>&1 | grep -i "suitecloud\|error"
# Should complete without hanging
```

**Commit:** `a7c3a7d8`

---

### STAG-002 — Ollama container never becomes healthy
**Status:** RESOLVED

**Symptom:** `arthaBuild-backend` stuck in "waiting" because `depends_on: ollama: condition: service_healthy` never satisfies. All containers hang.

**Root cause:** `docker-compose.staging.yml` healthcheck used `["CMD", "curl", "-f", "http://localhost:11434/"]` — but the `ollama/ollama` image does not include `curl`. Healthcheck always fails → container never marked healthy.

**Fix:** Changed Ollama healthcheck to use `ollama list` (native to the image):

```yaml
healthcheck:
  test: ["CMD", "ollama", "list"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 60s
```

**Verify:**
```bash
ssh ubuntu@3.228.239.112
docker compose -f docker-compose.staging.yml ps
# arthaBuild-ollama should show "Up X minutes (healthy)"
```

**Commit:** `a7c3a7d8`

---

## Session: 2026-04-12 — Email (Google Workspace) + HTTPS Setup

### STAG-003 — `artha.build` DNS not resolving on first check
**Status:** RESOLVED (expected behaviour)

**Symptom:** `dig A artha.build +short` returns empty immediately after GoDaddy nameserver update.

**Root cause:** GoDaddy NS propagation takes 15–60 minutes. Route 53 has the records, but the world hasn't learned about the new nameservers yet.

**Fix:** Wait. Run `dig A artha.build +short @8.8.8.8` to check. Once it returns `3.228.239.112` propagation is complete.

**Note:** All DNS for `artha.build` is managed in Route 53 (hosted zone `Z082867628EVAHJPXAUUP`). GoDaddy is registrar-only. Never add DNS records in GoDaddy — add them in Route 53.

---

### STAG-004 — Route 53 TXT record CREATE fails (already exists)
**Status:** RESOLVED

**Symptom:** `aws route53 change-resource-record-sets` returns `InvalidChangeBatch: Tried to create resource record set [name='artha.build.', type='TXT'] but it already exists`

**Root cause:** A TXT record (Google site verification) already existed. `CREATE` fails if the record set exists; must use `UPSERT` and include ALL existing values plus new ones in a single record set.

**Fix:** Use `UPSERT` action and include both existing and new TXT values:

```json
{
  "Action": "UPSERT",
  "ResourceRecordSet": {
    "Name": "artha.build",
    "Type": "TXT",
    "TTL": 300,
    "ResourceRecords": [
      {"Value": "\"google-site-verification=...\""},
      {"Value": "\"v=spf1 include:_spf.google.com ~all\""}
    ]
  }
}
```

**Rule:** When adding any TXT record to artha.build root, always check existing TXT records first: `dig TXT artha.build +short @8.8.8.8`

---

### STAG-005 — DKIM key exceeds DNS 255-char string limit
**Status:** RESOLVED

**Symptom:** Route 53 returns `CharacterStringTooLong` when adding DKIM TXT record.

**Root cause:** DNS TXT strings have a 255-character limit per string. Google Workspace DKIM keys (2048-bit RSA) are ~450 chars — too long for a single string.

**Fix:** Split the value into two 255-char quoted strings in a single TXT record value. Route 53 accepts multiple quoted strings; DNS resolvers concatenate them.

```python
# Split script:
val = "v=DKIM1; k=rsa; p=<full_key>"
chunks = [val[i:i+255] for i in range(0, len(val), 255)]
route53_val = ' '.join(f'"{c}"' for c in chunks)
# Result: "chunk1..." "chunk2..."
```

**Verify:** `dig TXT google._domainkey.artha.build +short @8.8.8.8` — should return two quoted strings that concatenate to the full key.

---

### STAG-006 — Google DKIM "Email authentication was not verified"
**Status:** RESOLVED

**Symptom:** Google Admin console → Gmail → Authenticate email shows "Email authentication was not verified" immediately after adding DKIM TXT record.

**Root cause:** Google's admin console checks DNS on click. If checked within seconds of adding the record, their verification service hasn't seen it yet (even though `dig` from 8.8.8.8 confirms it's live).

**Fix:** Wait 2–5 minutes, then click "Start authentication" button again. Do NOT re-add the record — it's already there. The admin console status lags behind actual DNS.

---

### STAG-007 — `docker compose restart` does not reload env_file
**Status:** RESOLVED

**Symptom:** Updated `/home/ubuntu/arthaBuild/.env` (added SMTP vars), ran `docker compose restart backend`, backend still logs "SMTP_HOST not configured".

**Root cause:** `docker compose restart` restarts the container process but uses the **cached environment** from when the container was last created. It does NOT re-read `env_file`.

**Fix:** Use `--force-recreate` to rebuild the container from current config:

```bash
cd /home/ubuntu/arthaBuild
docker compose -f docker-compose.staging.yml up -d --force-recreate backend
```

**Rule:** Any time `.env` is changed on the server, use `--force-recreate`, not `restart`.

---

### STAG-008 — Database has no tables (`no such table: users`)
**Status:** RESOLVED

**Symptom:** Google login attempt returns 500. Backend logs show:
```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such table: users
SELECT users.id, ... FROM users WHERE users.email = ?
```

**Root cause:** Alembic migrations have never been run on the staging server. The SQLite DB file exists (via Docker volume) but has no tables. This happens on every fresh provision — migrations must be run manually after first deploy.

**Fix:**
```bash
docker exec arthaBuild-backend /app/venv/bin/alembic -c /app/alembic.ini upgrade head
```

**Then verify:**
```bash
docker exec arthaBuild-backend python3 -c "
import sqlite3
conn = sqlite3.connect('/app/data/arthaBuild.db')
tables = conn.execute(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").fetchall()
print([t[0] for t in tables])
conn.close()
"
# Should list: users, teams, chats, messages, audit_logs, password_reset_tokens, etc.
```

**Permanent fix needed:** Add Alembic migration step to `docker-compose.staging.yml` or startup script so it runs automatically on every deploy. See STAG-008-TODO below.

**Also:** `alembic.ini` sqlalchemy.url = `sqlite:///./arthaBuild.db` (relative path = `/app/arthaBuild.db`) but backend uses `DATABASE_URL` pointing to `/app/data/arthaBuild.db`. Running plain `alembic upgrade head` silently succeeds but migrates the WRONG file. Always run migrations with the explicit path override:

```bash
docker exec arthaBuild-backend python3 -c "
from alembic.config import Config
from alembic import command
cfg = Config('/app/alembic.ini')
cfg.set_main_option('sqlalchemy.url', 'sqlite:////app/data/arthaBuild.db')
command.upgrade(cfg, 'head')
"
```

---

## Test Checklist — Run After Every Staging Deploy

| # | Test | Command / Action | Expected | Status |
|---|------|-----------------|----------|--------|
| T-01 | All containers healthy | `docker compose ps` | All show `(healthy)` | - |
| T-02 | Health endpoint | `curl https://artha.build/health` | `{"status":"ok"}` | - |
| T-03 | HTTP → HTTPS redirect | `curl -I http://artha.build` | `301 → https://` | - |
| T-04 | DB tables exist | `docker exec arthaBuild-backend python3 -c "import sqlite3; ..."` | lists users, teams, etc. | - |
| T-05 | Register new user | POST `/api/auth/register` | `201` + JWT returned | - |
| T-06 | Login | POST `/api/auth/login` | `200` + access_token | - |
| T-07 | Password reset email | POST `/api/auth/forgot-password` | email arrives at inbox | - |
| T-08 | AI chat response | POST `/api/chats` (with auth) | AI response in <30s | - |
| T-09 | Google OAuth login | Click "Sign in with Google" | Redirects, logs in | - |
| T-10 | SMTP delivery | Trigger password reset | Email from hello@artha.build arrives | - |

---

## TODOs / Permanent Fixes Needed

### STAG-008-TODO — Auto-run Alembic migrations on container start
Add to `docker-compose.staging.yml` backend entrypoint or a startup script:
```bash
/app/venv/bin/alembic -c /app/alembic.ini upgrade head && \
uvicorn rawapi:app --host 0.0.0.0 --port 8000 --workers 1
```
Or add as a separate `migrate` service that runs first.

### STAG-009-TODO — Google OAuth credentials not configured
Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) not in staging `.env`.
Need to create OAuth 2.0 credentials in Google Cloud Console for `artha.build` and add to server `.env`.

---

*Last updated: 2026-04-12*
*Add new issues at the bottom under the relevant session heading.*
