---
phase: 31-3d-dimension-hud-clickable-assemblies
plan: 04
subsystem: deploy
tags: [deploy, aws-lambda, ecr, s3, cloudfront, turion-satellite, turion-space-demo, f6-deploy-hygiene]

# Dependency graph
requires:
  - phase: 31-3d-dimension-hud-clickable-assemblies (plan 01)
    provides: "turion-satellite local commit 15df18d (c_pd.specifications SELECT-column in /api/parts/:partDefId/children)"
  - phase: 31-3d-dimension-hud-clickable-assemblies (plan 02)
    provides: "turion-space-demo local commit 7b92727 (satellite-3d.js multi-mesh assembly viewer + raycaster + camera tween + 3d-test.html cell)"
  - phase: 31-3d-dimension-hud-clickable-assemblies (plan 03)
    provides: "turion-space-demo local commit 802eec6 (part.html + instance.html cad-hud HUD + #hudBack chip + assemblyChildren/onSelect wiring + instance.html /children?sat= fetch in Stage-2 Promise.all)"
  - phase: 30-interactive-webgl-3d-part-viewer (plan 03)
    provides: "build-and-push.sh path + deploy-frontend.sh path + CloudFront E37R9PT8IL44L2"
provides:
  - "Phase 31 LIVE on production: turion-satellite Lambda redeployed (new CodeSha256 5438a289...), turion-space-demo frontend live at turionspace.zietra.com/satellite/* with the dimension HUD + clickable-assembly ring"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "F6 deploy-hygiene pre-flight before deploy-frontend.sh's `aws s3 sync . --delete`: stash unrelated tracked WIP via `git stash push -- <files>`, move untracked dirs (`.superpowers/`) aside to /tmp, restore both after — `git stash list` must end empty and working tree must match the pre-deploy baseline"
    - "Push both repos BEFORE running deploy scripts (per CLAUDE.md); deploy = GSD task, never ad-hoc"
    - "Headless-substitute approval pattern (Phase 27-30 precedent): curl/HEAD smoke + post-deploy audit + 3d-test.html HEAD-200 + 401-probe of new route + repo-level Vitest assertion ARE the orchestrator's approval when no browser/WebGL is available; record the deferred browser walk as a follow-up"

key-files:
  created:
    - /Users/jeet/doordash-p2p/.planning/phases/31-3d-dimension-hud-clickable-assemblies/31-04-SUMMARY.md
  modified: []

key-decisions:
  - "Pushed turion-satellite BEFORE running ./build-and-push.sh (per CLAUDE.md: code on remote before deploy)"
  - "Pushed turion-space-demo BEFORE running deploy-frontend.sh (same rule)"
  - "F6 pre-flight: stashed the 3 ERP-demo WIP files (about-this-demo.html, agent-sales-cash.html, dashboard-cio.html) and moved .superpowers/ to /tmp BEFORE deploy-frontend.sh's `aws s3 sync . --delete` — restored both after, stash empty"
  - "Visual sign-off (Task 3 human-verify) DEFERRED — headless environment; the curl/HEAD smoke + audit + 3d-test.html HEAD-200 + /children?sat= 401-probe + the Plan 31-01 parts.test.ts specifications assertion are the orchestrator's approval per the Phase 27-30 precedent. A literal browser walk of the HUD + clickable-assembly ring + camera fly-to + 2D/3D toggle + WebGL-off fallback is a follow-up if a sign-off is required."
  - "No ad-hoc `aws ecs` / `docker build` / `docker push` / direct ECR commands — only `./build-and-push.sh` (Task 1) and `deploy-frontend.sh` (Task 2)"

patterns-established:
  - "Phase-31 deploy ordering: (1) pre-deploy audit both repos → (2) push both repos to origin/main → (3) ./build-and-push.sh in turion-satellite (Lambda) → (4) F6 pre-flight in turion-space-demo (stash ERP WIP + mv .superpowers/) → (5) deploy-frontend.sh (S3 sync + CloudFront invalidation) → (6) poll invalidation to Completed → (7) curl/HEAD smoke + 401-probe → (8) post-deploy audit → (9) restore working tree (mv .superpowers + git stash pop) → (10) write SUMMARY"

requirements-completed: [DimensionHUD, AssemblyMultiMesh, ChildrenSpecsAPI]

# Metrics
duration: 5min
completed: 2026-05-11
---

# Phase 31 Plan 04: Final Deploy + Verification Summary

**Phase 31 is LIVE.** `turion-satellite` Lambda `turion-satellite-api` redeployed (CodeSha256 `bddd42c8…` → `5438a289…`, Active/Successful) so `/api/parts/:partDefId/children?sat=` now returns each child's `specifications` JSONB; `turion-space-demo` frontend deployed to S3 `turion-demo-static` + CloudFront `E37R9PT8IL44L2` invalidation `IBKKFN1F0OR9ER5YCGDILXEPHX` Completed, so the live `part.html`/`instance.html` carry the `cad-hud` dimension HUD + `#hudBack` chip + `assemblyChildren`/`onSelect` wiring and `satellite-3d.js` carries `assemblyChildren` + `intersectObjects(childGroups`. F6 pre-flight ran (3 ERP-demo WIP HTMLs stashed, `.superpowers/` moved to /tmp), restored after — `git stash list` empty, working tree == pre-deploy baseline. Pre AND post-deploy button audit: 0 violations.

## Performance

- **Duration:** ~5 min (start 21:55:34Z → end 22:00:08Z)
- **Started:** 2026-05-11T21:55:34Z
- **Completed:** 2026-05-11T22:00:08Z
- **Tasks:** 3/3 (Task 1 push + Lambda redeploy, Task 2 F6 pre-flight + frontend deploy + smoke, Task 3 human-verify → headless-substitute approval)
- **Files modified:** 0 (deploy-only plan; the gitignored `satellite/satellite-config.js` regenerated during deploy-frontend.sh, not tracked)
- **Atomic commits:** 0 (deploy-only)

## Accomplishments

### Task 1: Pre-deploy audit + push both repos + Lambda redeploy

- **Pre-deploy audit (turion-satellite):** `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → `routes: 61 / onclick handlers scanned: 16 / satelliteApi calls scanned: 58 / violations: 0`, exit 0.
- **Pre-deploy audit (turion-space-demo wrapper):** `cd /Users/jeet/turion-space-demo && node scripts/audit-satellite-buttons.mjs` → identical output (`61/16/58/0`), exit 0.
- **Confirmed unpushed commits:**
  - `turion-satellite`: `15df18d feat(31-01): add specifications to GET /api/parts/:partDefId/children SELECT`, author `jeet-avatar <jm@techcloudpro.com>`.
  - `turion-space-demo`: `7b92727 feat(31-02): multi-mesh assembly viewer ...` + `802eec6 feat(31-03): dimension HUD + clickable-assembly wiring in part.html + instance.html`, both authored `jeet-avatar <jm@techcloudpro.com>`.
- **Pushed both repos** (BEFORE Lambda redeploy, per CLAUDE.md):
  - `cd /Users/jeet/turion-satellite && git push origin main` → `b36691a..15df18d main -> main`.
  - `cd /Users/jeet/turion-space-demo && git push origin main` → `c5ff68c..802eec6 main -> main`.
  - Post-push `git log origin/main..HEAD --oneline` → empty for both.
- **Lambda redeploy via `./build-and-push.sh`:**
  - **Pre-deploy CodeSha256:** `bddd42c868ff1139f8c7289f34d0d7bea85b6a0dce1f359318c4218e236e3625` (Active / Successful).
  - Ran `cd /Users/jeet/turion-satellite && ./build-and-push.sh` → tsc build, docker linux/arm64 build, ECR push (`sha256:5438a289ebd28a88a1b44c5162ad8d321b63f78b14d0ed79ae9162856f4d252d size: 2273`), `aws lambda update-function-code`, `wait function-updated`.
  - **Post-deploy CodeSha256:** `5438a289ebd28a88a1b44c5162ad8d321b63f78b14d0ed79ae9162856f4d252d` (Active / Successful). DIFFERS from pre-deploy value ✓.
- **/children route alive on prod:** `curl -s -o /dev/null -w "%{http_code}" -X GET "https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/parts/00000000-0000-0000-0000-000000000000/children?sat=24587565-b15b-42ce-b590-87ecf9b6bb99"` → `401` (auth-gated, route exists — not a 404). The Plan 31-01 `parts.test.ts` `specifications` assertion is the authoritative gate that the new SELECT column is returned (per the 31-01 Summary's documented deferral).

### Task 2: F6 pre-flight → deploy-frontend.sh → CloudFront invalidation → smoke checks → restore

- **F6 pre-flight (BEFORE deploy-frontend.sh's `aws s3 sync . --delete`):**
  - `cd /Users/jeet/turion-space-demo && git status --short` showed the expected baseline: 3 ERP-demo WIP HTMLs (`about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`), 7 `backend/*` files (excluded by deploy-frontend.sh's `--exclude`), and untracked `.superpowers/`.
  - `git stash push -m "phase31-deploy-hygiene" -- about-this-demo.html agent-sales-cash.html dashboard-cio.html` → "Saved working directory and index state On main: phase31-deploy-hygiene".
  - `mv .superpowers /tmp/phase31-superpowers-stash-68064` (PID-suffixed to avoid collisions).
  - Post-pre-flight `git status --short` showed ONLY the 7 `backend/*` files (which the script's `--exclude` keeps out of the sync) — `satellite/*` already committed in HEAD, no other dirty files.
- **deploy-frontend.sh:**
  - Regenerated `satellite/satellite-config.js` from AWS Secrets Manager (gitignored).
  - `aws s3 sync . s3://turion-demo-static --delete` uploaded: `satellite/3d-test.html`, `satellite/instance.html`, `satellite/satellite-config.js`, `satellite/satellite-3d.js`, `satellite/part.html`, plus the 3 committed ERP HTML bytes (their committed versions on origin/main — the stash captured ONLY the working-tree dirty diff, not the committed bytes).
  - `.superpowers/*` and `backend/*` correctly ABSENT from the sync output ✓.
  - CloudFront invalidation: `IBKKFN1F0OR9ER5YCGDILXEPHX` issued on dist `E37R9PT8IL44L2`.
- **CloudFront invalidation polling:** `aws cloudfront get-invalidation --distribution-id E37R9PT8IL44L2 --id IBKKFN1F0OR9ER5YCGDILXEPHX --query 'Invalidation.Status' --output text` → poll 1: `InProgress`, poll 2 (~15s later): `Completed` ✓.

- **Smoke checks (text-proxy for the headless human-verify checkpoint):**

| Check | Expectation | Actual | Pass? |
|---|---|---|---|
| HEAD `satellite/satellite-3d.js` | 200 + JS content-type | `HTTP/2 200`, `content-type: text/javascript` | ✓ |
| `satellite-3d.js` grep `assemblyChildren` | ≥1 | 5 | ✓ |
| `satellite-3d.js` grep `intersectObjects(childGroups` | ≥1 | 1 | ✓ |
| `satellite-3d.js` grep `getBoundingClientRect` | ≥1 | 1 | ✓ |
| `satellite-3d.js` grep `deselect` | ≥1 | 9 | ✓ |
| `part.html` grep `cad-hud` | ≥2 | 7 | ✓ |
| `part.html` grep `cadHud` | ≥1 | 2 | ✓ |
| `part.html` grep `assemblyChildren` | ≥1 | 2 | ✓ |
| `part.html` grep `type="importmap"` | ≥1 | 1 | ✓ |
| `part.html` grep `cdn.jsdelivr.net/npm/three@0.184.0` | ≥1 | 2 | ✓ |
| `part.html` grep `mode-3d` | ≥1 | 10 | ✓ |
| `part.html` grep `frame-svg` | ≥1 | 3 | ✓ |
| `part.html` grep `satellite-3d.js` | ≥1 | 2 | ✓ |
| `part.html` grep `viewer3d` | ≥1 | 7 | ✓ |
| `part.html` grep `mount3DViewer` | ≥1 | 2 | ✓ |
| `instance.html` grep `cad-hud` | ≥2 | 7 | ✓ |
| `instance.html` grep `cadHud` | ≥1 | 2 | ✓ |
| `instance.html` grep `assemblyChildren` | ≥1 | 2 | ✓ |
| `instance.html` grep `/children?sat=` | ≥1 | 2 | ✓ |
| `instance.html` grep `type="importmap"` | ≥1 | 1 | ✓ |
| `instance.html` grep `cdn.jsdelivr.net/npm/three@0.184.0` | ≥1 | 2 | ✓ |
| `instance.html` grep `mode-3d` | ≥1 | 10 | ✓ |
| `instance.html` grep `frame-svg` | ≥1 | 3 | ✓ |
| `instance.html` grep `mount3DViewer` | ≥1 | 3 | ✓ |
| HEAD `satellite/3d-test.html` | 200 | `HTTP/2 200`, `content-type: text/html`, 9260 bytes | ✓ |
| HEAD `satellite/login.html` | 200 | `HTTP/2 200`, 2724 bytes | ✓ |
| HEAD `satellite/bom.html` | 200 | `HTTP/2 200`, 19087 bytes | ✓ |
| `bom.html` grep `view=3d` | ≥1 | 1 | ✓ (Phase-30 deep-link badge unchanged) |
| HEAD jsDelivr `three@0.184.0/build/three.module.min.js` | 200 + CORS | `HTTP/2 200`, `access-control-allow-origin: *` | ✓ |
| HEAD jsDelivr `three@0.184.0/examples/jsm/controls/OrbitControls.js` | 200 + CORS | `HTTP/2 200`, `access-control-allow-origin: *` | ✓ |
| `/api/parts/<bogus>/children?sat=<sat>` | 401 (route alive) | `HTTP=401` | ✓ |

- **Post-deploy audit:** `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → `routes: 61 / onclick handlers scanned: 16 / satelliteApi calls scanned: 58 / violations: 0`, exit 0 ✓.

- **Restore working tree:**
  - `mv /tmp/phase31-superpowers-stash-68064 /Users/jeet/turion-space-demo/.superpowers` → restored.
  - `cd /Users/jeet/turion-space-demo && git stash pop` → "Dropped refs/stash@{0} (323763aabf42b6edf5783bde89a709e3746aacf0)". 3 ERP HTMLs back in working tree.
  - `git status --short` matches the pre-deploy baseline byte-for-byte: 10 modified files (3 ERP HTMLs + 7 `backend/*`) + `?? .superpowers/`. `git stash list` empty ✓.

### Task 3: Human-verify checkpoint → headless-substitute approval

**Visual sign-off DEFERRED** — headless environment; the orchestrator's prompt explicitly approved the Phase 27-30 headless-substitute precedent. The following gates ALL PASSED, which constitute the orchestrator's approval:

1. **Curl/HEAD smoke checks** — all 30 grep/HEAD assertions above pass.
2. **Post-deploy audit** — `0 violations`, exit 0.
3. **`3d-test.html` HEAD-200** — the visual harness (8 family cells + the Plan 31-02 assembly demo cell) is deployed.
4. **`/api/parts/:id/children?sat=` 401-probe** — route alive in production after Lambda redeploy.
5. **Plan 31-01 `parts.test.ts` `specifications` assertion** — green in repo (`326 passed | 1 skipped`).
6. **Lambda CodeSha256 changed** — confirms the new image carrying commit `15df18d` is live.

**Follow-up if a sign-off is required:** A literal browser walk of:
- `part.html?id=<leaf>&sat=...` — bottom-left HUD shows L × W × H mm / Mass / Material; OrbitControls rotate/zoom; 2D/3D toggle round-trips.
- `part.html?id=<assembly>&sat=...` — N child meshes on radial ring; hover glows; click → camera fly-to + HUD swap to child + `↩ back to assembly` chip; chip/empty-click resets.
- `instance.html?sat=...&id=<assembly-inst>` — same HUD + ring behavior; lower panels (BOM gallery / integrations / lifecycle) still render.
- `3d-test.html` — 8-family harness + optional 10th assembly cell renders.
- `bom.html` — `🧊 3D` deep-link still lands on `part.html?...&view=3d`.
- WebGL-off — falls back to Phase-27 2D isometric SVG, no crash.

## Verification

- [x] **Pre-deploy audit (BOTH repos):** 0 violations, exit 0.
- [x] **Post-deploy audit (turion-satellite):** 0 violations, exit 0.
- [x] **Both repos pushed under `jeet-avatar <jm@techcloudpro.com>`:** `git log origin/main..HEAD --oneline` empty for both AFTER push.
- [x] **Lambda redeploy:** CodeSha256 `bddd42c868ff1139f8c7289f34d0d7bea85b6a0dce1f359318c4218e236e3625` → `5438a289ebd28a88a1b44c5162ad8d321b63f78b14d0ed79ae9162856f4d252d`; State=Active; LastUpdateStatus=Successful.
- [x] **/children route alive in prod:** 401 (not 404) on bogus part-def UUID with valid `?sat=`.
- [x] **F6 pre-flight ran + restored:** `git stash list` non-empty mid-deploy → empty after `stash pop`; `.superpowers/` absent from `aws s3 sync` output → back in working tree after restore; pre-/post-deploy working-tree diffs match.
- [x] **deploy-frontend.sh ran; CloudFront invalidation `IBKKFN1F0OR9ER5YCGDILXEPHX` polled to `Completed`.**
- [x] **Live smoke (all 30 assertions above):** pass.
- [x] **Headless-substitute approval recorded:** per the Phase 27-30 precedent; literal browser walk is a documented follow-up.
- [x] **No ad-hoc deploy commands:** only `./build-and-push.sh` (Task 1) and `deploy-frontend.sh` (Task 2) ran. No `aws ecs`, `docker build`, `docker push`, or direct ECR commands.

## Deviations from Plan

None — plan executed exactly as written. The Task 3 human-verify checkpoint was satisfied via the documented headless-substitute path (Phase 27-30 precedent), exactly as the plan's `<action>` block prescribes for headless runs.

## Phase 31 Verdict: PASS

All 4 plans (31-01, 31-02, 31-03, 31-04) shipped. Live at `turionspace.zietra.com/satellite/part.html` + `instance.html` + `3d-test.html` with the dimension HUD + clickable-assembly ring + camera fly-to + `↩ back to assembly` chip. Phase-29 button audit unchanged at 0 violations. SVG fallback / `?view=` / `.mode-3d` / `#autoRotateChk` / `bom.html` `view=3d` deep-link / `login.html` — all preserved.

## Notes for Future Phases

- The Phase-31 F6 deploy-hygiene pattern (stash ERP WIP + `mv .superpowers/`) is now an established precedent — any future `deploy-frontend.sh` invocation in this repo MUST run the pre-flight first (the script does `aws s3 sync . --delete` over the whole repo).
- The Phase 27-30 headless-substitute precedent is reaffirmed: in a headless agent run, the curl/HEAD smoke + post-deploy audit + test-harness HEAD-200 + new-route auth-probe + repo-level Vitest assertion constitute approval; the browser walk is a documented follow-up, not a blocker.
- `satellite-config.js` is regenerated by `deploy-frontend.sh` from AWS Secrets Manager on every deploy — never commit it to either repo (the `satellite-config.js.example` is the canonical template).

## Self-Check: PASSED

- FOUND: `.planning/phases/31-3d-dimension-hud-clickable-assemblies/31-04-SUMMARY.md`
- FOUND: `turion-satellite` `origin/main` HEAD == `15df18d` (Plan 31-01)
- FOUND: `turion-space-demo` `origin/main` HEAD == `802eec6` (Plan 31-03), previous == `7b92727` (Plan 31-02)
- FOUND: Lambda `turion-satellite-api` CodeSha256 == `5438a289ebd28a88a1b44c5162ad8d321b63f78b14d0ed79ae9162856f4d252d` (the new image)
- VERIFIED: post-deploy audit 0 violations
- VERIFIED: CloudFront invalidation `IBKKFN1F0OR9ER5YCGDILXEPHX` Completed
- VERIFIED: working tree restored to pre-deploy baseline, `git stash list` empty
