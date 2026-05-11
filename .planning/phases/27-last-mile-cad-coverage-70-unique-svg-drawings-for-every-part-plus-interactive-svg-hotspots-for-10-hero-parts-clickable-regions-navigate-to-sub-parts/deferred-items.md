# Phase 27 Deferred Items

Out-of-scope items discovered during Plan 27-05 execution. Per GSD scope boundary rule, these were NOT auto-fixed.

## Uncommitted working-tree changes in /Users/jeet/turion-space-demo

At start of Plan 27-05 execution, `turion-space-demo` had ~10 modified files unrelated to Phase 27:

```
M about-this-demo.html
M agent-sales-cash.html
M backend/dist/app.js
M backend/dist/routes/agents.js
M backend/dist/routes/notify.js
M backend/lambda-build
M backend/node_modules/.package-lock.json
M backend/src/routes/agents.ts
M backend/src/routes/notify.ts
M dashboard-cio.html
?? .superpowers/
```

These appear to be in-progress edits from a different workstream (Turion demo backend/agents/dashboard). They have no relationship to Phase 27 (which only touches `satellite/satellite-cad.js`, `satellite/satellite-shell.css`, `satellite/part.html`).

**Action taken:** None — left in working tree, not staged or committed by 27-05. The `aws s3 sync` in `deploy-frontend.sh` includes all root-level HTML/JS/CSS files by default, so any of these uncommitted edits to `*.html` files would be synced to S3 alongside Phase 27 changes. `backend/*` is excluded by the script.

**Recommended follow-up:** The owner of those changes should commit or stash them before the next deploy. Not a Phase 27 concern.

## Uncommitted file in /Users/jeet/turion-satellite

`scripts/seed-demo-data.sql` is untracked. Appears to be a Phase 26 leftover, not Phase 27.

**Action taken:** None — left untracked.
