# quick-324 Pre-Flight Verification

**Captured:** 2026-05-06T17:55Z (executor: Claude Opus 4.7)
**Plan:** `/Users/jeet/doordash-p2p/.planning/quick/324-remove-arthabuild-board-presentation-dec/324-PLAN.md`

---

## Step 1.1 — `_brd_report.html.j2` template dependencies

**Command:** `grep -nE "extends|include|import" /Users/jeet/arthaBuild/src/backend/brd/templates/_brd_report.html.j2`

**Result:**
```
37:@import url('https://fonts.googleapis.com/css2?family=Source+Serif+Pro:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap');
254:   `_module_deep_dive.html.j2` renders an H3 + 6 labelled blocks per item.
```

**Verdict: PASS.** No `{% extends %}`, no `{% include %}`. Line 37 is a CSS Google Fonts `@import`. Line 254 is a CSS comment. Long-form report is self-contained — safe to delete `_base.html.j2`.

---

## Step 1.2 — `_module_deep_dive.html.j2` references in renderers.py

**Command:** `grep -n '_module_deep_dive' /Users/jeet/arthaBuild/src/backend/brd/renderers.py`

**Result:**
```
409:        deep_dive_partial = _env().get_template("_module_deep_dive.html.j2")
```

**Verdict: PASS.** Single reference at line 409 inside `render_long_form_pdf`. No deck function uses this partial. Safe to keep `_module_deep_dive.html.j2`.

---

## Step 1.3 — Backend pytest baseline

**Command:** `cd /Users/jeet/arthaBuild/src/backend && python -m pytest tests/ -q --tb=no`

**Result (exact):**
```
54 failed, 554 passed, 18 skipped, 2 warnings in 43.90s
```

**Verdict: PASS.** Baseline matches plan exactly: **554 passed / 54 failed (pre-existing in test_rbac.py + test_user.py) / 18 skipped**.

These 54 failures are all auth-domain (rbac + user account) and unrelated to BRD. The "no new failures" gate uses these counts.

---

## Step 1.4 — Frontend vitest baseline

**Command:** `cd /Users/jeet/arthaBuild/src/frontend && npm run test -- --run --reporter=basic`

**Result (exact):**
```
Test Files  1 failed | 20 passed (21)
Tests  2 failed | 135 passed (137)
```

**Pre-existing failures (kept for `no new failures` gate):**
- `src/test/authService.test.ts` (line 128 — `forgotPassword` token return) — 2 failed assertions

**Baseline: 137 tests / 135 pass / 2 pre-existing fail / 21 files (1 file with failures).**

---

## Step 1.5 — Local file baseline (md5sums)

**Captured:** `/tmp/324-baseline/`

```
6a6e0add57a1dd92df872575b05d7372  /tmp/324-baseline/brd_router.py
c682daf77907292add5cc90742907c6c  /tmp/324-baseline/BRDGenerator.tsx
c19d6bf930e74a714da5f7b424501043  /tmp/324-baseline/BRDList.tsx
7f93e0b13224b7f3336d93628a0ce9f6  /tmp/324-baseline/brdService.ts
1bd904823045cd3e7c17fcdccff6ba61  /tmp/324-baseline/pipeline.py
a0f0b8e17ac457c7b0e5030347715c77  /tmp/324-baseline/renderers.py
e2fbf857e92e05f3c2c69190ea2da681  /tmp/324-baseline/runtime.py
7b0f3177eeb57187806f1d80ba61845c  /tmp/324-baseline/schemas.py
f5bd0195fb1e327221bddf3e417f00d0  /tmp/324-baseline/status_verbs.yaml
```

---

## Step 1.6 — Prod rollback baseline (CRITICAL)

**Host:** `ubuntu@44.194.34.223:/home/ubuntu/arthaBuild`

### Backup files created on prod:

```
src/backend/brd/pipeline.py.324-rollback           (85276 bytes, May  3 01:07)
src/backend/brd/renderers.py.324-rollback          (34290 bytes, May  5 02:37)
src/backend/brd/runtime.py.324-rollback            (17021 bytes, Apr 30 01:14)
src/backend/brd/schemas.py.324-rollback            (12051 bytes, May  2 22:21)
src/backend/brd/status_verbs.yaml.324-rollback     (2534 bytes, Apr 28 05:51)
src/backend/routers/brd.py.324-rollback            (31015 bytes, May  2 22:34)
src/backend/brd/templates.324-rollback/            (full dir copy, 18 files)
```

### Prod md5sums (`/tmp/324-prod-rollback.md5`):

```
1bd904823045cd3e7c17fcdccff6ba61  src/backend/brd/pipeline.py.324-rollback
a0f0b8e17ac457c7b0e5030347715c77  src/backend/brd/renderers.py.324-rollback
e2fbf857e92e05f3c2c69190ea2da681  src/backend/brd/runtime.py.324-rollback
7b0f3177eeb57187806f1d80ba61845c  src/backend/brd/schemas.py.324-rollback
f5bd0195fb1e327221bddf3e417f00d0  src/backend/brd/status_verbs.yaml.324-rollback
6a6e0add57a1dd92df872575b05d7372  src/backend/routers/brd.py.324-rollback
```

**Local baseline md5sums match prod md5sums for all 6 files** — confirms local source == prod source. Edits will apply cleanly.

### templates.324-rollback contents (18 files):

```
_base.html.j2                              (9912 bytes)
_brd_report.html.j2                        (10070 bytes — KEEP — long-form report)
_module_deep_dive.html.j2                  (1617 bytes — KEEP — deep-dive partial)
01_title.html.j2 ... 14_close.html.j2      (14 deck slides)
09_agent_deep_dive.html.j2.bak.phase38     (1066 bytes — orphan backup, NOT referenced)
```

**Total: 18 files (16 referenced + 1 orphan backup + 1 _base for deck only).**

After deploy, prod templates dir should have only 2 files: `_brd_report.html.j2` + `_module_deep_dive.html.j2`. The orphan `.bak.phase38` will be removed by `rsync --delete`.

### Pre-deploy backend container ID (CONTAINER_ID_BEFORE):

```
9015891e53c9ee5aa4e4d5d311326336c28c531c1353792c60982748a1b143bd
```

(Saved on prod at `/tmp/324-pre-deploy-container-id.txt`)

### Pre-deploy frontend bundle hash (OLD_FRONTEND_HASH):

```
index-C87sfhGe.js
```

### Pre-deploy DB state (read-only):

```
brd_drafts ready: 19
html_path NOT NULL: 19
TOTAL drafts: 29
```

All 19 existing READY BRDs have `html_path` populated (deck files in S3). After this deploy, those rows are unchanged — UI just stops surfacing the deck button.

### Pre-deploy file manifest:

`/tmp/324-pre-deploy-manifest.txt` (85 lines, full md5sum manifest of all backend brd files + frontend dist + container metadata).

---

## DEVIATIONS FROM PLAN (discovered at PRE-FLIGHT)

### DEVIATION D1: Prod is NOT a git repository

**Plan said (Step 5.3):** `git pull origin main` on prod
**Reality:** `/home/ubuntu/arthaBuild/.git` does not exist. Deploy mechanism on prod is rsync/scp from local, NOT git pull.

**Rule applied:** Rule 3 (auto-fix blocking issue). Adjust deploy script in Task 5 to:
- Backend: rsync local source → prod, then `docker compose -f docker-compose.prod.yml build backend && up -d --force-recreate backend`
- Frontend: rsync `src/frontend/dist/` → prod (existing approach works as-is)

Rollback OPTION B (git revert) is INVALID — only OPTION A (cp from `*.324-rollback` files + `templates.324-rollback/` dir) is usable. Plan explicitly listed OPTION A as primary, so this is a hardening, not a regression.

### DEVIATION D2: Templates count is 18 on prod, 17 locally (orphan backup)

**Plan said:** 16 templates pre-deploy
**Reality:** Prod has 18 (orphan `09_agent_deep_dive.html.j2.bak.phase38`), local has 17. The orphan is a leftover Phase 38 backup file. Jinja2 only loads `*.html.j2` matches anyway, so it's a no-op for runtime.

**Rule applied:** Rule 3 (auto-fix blocking issue). The rsync `--delete` flag during template removal will sweep the orphan along with the 14 deck templates. After deploy: prod templates dir = exactly 2 files (matching local).

### DEVIATION D3: Backend container name is `arthaBuild-backend`, not `arthaBuild-backend-1`

**Plan said:** `docker exec arthaBuild-backend-1 ...`
**Reality:** `docker ps` shows `arthaBuild-backend` (no -1 suffix). Probably docker-compose v2 naming.

**Rule applied:** Rule 3. Use `arthaBuild-backend` for all docker exec calls.

---

## VERIFICATION CHECKLIST (Task 1 done criteria)

- [x] 324-PRE-FLIGHT.md committed with baseline pytest/vitest counts
- [x] Prod rollback file list + checksums recorded
- [x] OLD_FRONTEND_HASH recorded (`index-C87sfhGe.js`)
- [x] Templates baseline (18 prod, 17 local) recorded with delta explanation
- [x] All planner-stated facts confirmed against current code (with 3 deviations documented)
- [x] No mismatches that block the plan — proceed to Task 2
