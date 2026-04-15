---
phase: quick-278
plan: 01
subsystem: planning
tags: [m2, enterprise, planning, roadmap, phases]
dependency_graph:
  requires: [Phase 08.1 complete, v1.0.0 tagged]
  provides: [M2 roadmap section, Phase 13-17 PLAN.md files]
  affects: [.planning/ROADMAP.md, .planning/phases/13-17]
tech_stack:
  added: []
  patterns: [regression-guard, phase-plan-template, m2-milestone-planning]
key_files:
  created:
    - .planning/phases/13-identity-access/13-01-PLAN.md
    - .planning/phases/14-compliance-data/14-01-PLAN.md
    - .planning/phases/15-operations/15-01-PLAN.md
    - .planning/phases/16-api-platform/16-01-PLAN.md
    - .planning/phases/17-onboarding-ux/17-01-PLAN.md
  modified:
    - .planning/ROADMAP.md
decisions:
  - "Regression guard uses real M1 endpoints verified in src/backend/ (/health, /api/auth/login, /api/chats, /api/user/register, /api/admin/audit, /health/detail)"
  - "Phase 17 RG-17-04 swaps /api/user/register check for npm run build — frontend-heavy phase needs build verification"
  - "Phase 16 RG-16-05 is end-to-end: login → get token → hit /api/v1/keys → assert envelope — tests both auth and envelope in one shot"
  - "All 5 phases have depends_on:[] in frontmatter — execution context loaded at runtime from ROADMAP.md"
metrics:
  duration: "12 minutes"
  completed_date: "2026-04-13"
  tasks_completed: 3
  files_created: 5
  files_modified: 1
---

# Quick 278: Plan M2 Enterprise Ready Milestone

One-liner: M2 planning documents created — 5 phase PLAN.md files (Phases 13-17) and ROADMAP.md M2 milestone section appended, each plan containing 5 concrete regression-guard smoke tests against real M1 endpoints.

## What Was Done

Three tasks executed to produce six planning artifacts. No production code was touched.

**Task 1 — ROADMAP.md M2 milestone block** (commit `70fb363e`)

Appended a complete Milestone 2 block at the end of `.planning/ROADMAP.md`, after Phase 08.1. The block defines:
- Milestone goal (Fortune-500 procurement readiness)
- Dependency on Milestone 1 (v1.0.0 at d3cfca6b)
- Execution order: 13 → 14 → 15 → 16 → 17
- One section per phase with goal, dependencies, requirements, and plan checklist

**Task 2 — Phase 13-15 PLAN.md files** (commit `982f4e7f`)

- `13-01-PLAN.md`: SSO/SAML router (authlib/python3-saml), TOTP MFA (pyotp), IdleTimeoutMiddleware, IPAllowlistMiddleware, MFASetup.tsx, AdminPanel Security tab
- `14-01-PLAN.md`: GDPR /export-data + /erase compliance endpoints, AuditLog hash-chaining (prev_hash + row_hash via SHA-256), CSV export with date filters, SOC2 evidence generator CLI script
- `15-01-PLAN.md`: backup.sh (SQLite → S3 with AES256 SSE), Sentry SDK init (guarded by SENTRY_DSN env var), SIGTERM graceful shutdown handler, /health/detail extended with db_latency_ms + disk_free_gb + ollama_status + sentry_active + backup_bucket_configured

**Task 3 — Phase 16-17 PLAN.md files** (commit `d0afbdb6`)

- `16-01-PLAN.md`: APIKey + WebhookEndpoint models, APIKeyAuthMiddleware (X-API-Key header → SHA-256 lookup), /api/v1/ versioned prefix, ResponseEnvelopeMiddleware ({data, error, meta}), webhook_worker.py with HMAC-signed delivery
- `17-01-PLAN.md`: OnboardingWizard.tsx (3-step modal with onboarding_completed User column), License tab in AdminPanel (POST /api/admin/license/validate-key without .env edit), NotificationBanner.tsx polling /health/detail every 60s, EmptyState.tsx component in Chat + History

## Regression Guard Design

Each PLAN.md contains a `## Regression Guard` section with 5 named tests (RG-NN-01 through RG-NN-05). The tests are concrete curl commands (no stubs, no mocks) targeting these verified M1 endpoints:

| Guard | Endpoint | What it tests |
|-------|----------|---------------|
| RG-NN-01 | `GET /health` | Public health returns `{"status":"ok"}` |
| RG-NN-02 | `POST /api/auth/login` | Login returns `access_token` |
| RG-NN-03 | `GET /api/chats` | Chat list requires JWT (401) |
| RG-NN-04 | `POST /api/user/register` | Register exists (422 on missing body, not 404) |
| RG-NN-05 | `GET /api/admin/audit` | Admin audit requires admin JWT (401/403) |

Phase 17 substitutes RG-17-04 for `npm run build` (frontend-heavy phase) and adds RG-17-05 for the new `POST /api/admin/license/validate-key` endpoint. Phase 16 makes RG-16-05 end-to-end: login → token → `/api/v1/keys` → assert `{data, meta}` envelope.

## Deviations from Plan

None — plan executed exactly as written. No code files were modified. All 5 PLAN.md files written, ROADMAP.md appended cleanly.

## Commits

| Hash | Message |
|------|---------|
| `70fb363e` | chore(quick-278): append M2 Enterprise Ready milestone to ROADMAP.md |
| `982f4e7f` | chore(quick-278): add Phase 13-15 PLAN.md files for M2 Enterprise Ready |
| `d0afbdb6` | chore(quick-278): add Phase 16-17 PLAN.md files for M2 Enterprise Ready |

## Self-Check: PASSED

| Item | Status |
|------|--------|
| .planning/phases/13-identity-access/13-01-PLAN.md | FOUND |
| .planning/phases/14-compliance-data/14-01-PLAN.md | FOUND |
| .planning/phases/15-operations/15-01-PLAN.md | FOUND |
| .planning/phases/16-api-platform/16-01-PLAN.md | FOUND |
| .planning/phases/17-onboarding-ux/17-01-PLAN.md | FOUND |
| Commit 70fb363e | FOUND |
| Commit 982f4e7f | FOUND |
| Commit d0afbdb6 | FOUND |
| ROADMAP.md contains "Milestone 2" | FOUND (1 occurrence) |
