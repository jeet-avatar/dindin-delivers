# ArthaBuild — Project State

## What This Is

ArthaBuild is a **customer-hosted SaaS platform** that automates the entire NetSuite development and implementation lifecycle. Customers deploy it entirely inside their own AWS VPC using Docker Compose — no code, credentials, or data ever leaves the customer's infrastructure.

AI chat drives the full workflow: ask a NetSuite question → get an AI answer with local Ollama → generate a SuiteScript → approve → deploy to NetSuite. Enterprise features include RBAC, team management, SAML/OIDC SSO, TOTP MFA, GDPR compliance, SOC2 evidence generation, and Cloudflare WAF protection.

## Core Value

**Air-gapped AI that replaces weeks of ERP implementation work with minutes of conversation** — all inside the customer's own AWS account.

## Current State (v2.0 — shipped 2026-04-14)

- **Tech stack:** FastAPI (Python) + React 18 (TypeScript) + SQLite + Ollama (local LLM) + FAISS vectorstore + Docker Compose + nginx
- **Model:** `qwen2.5:14b` (chat), `nomic-embed-text` (embeddings, 768-dim)
- **LOC:** ~9,000 TypeScript frontend, ~469K Python total (including test files)
- **Tests:** 147/150 passing (2 pre-existing failures: nginx HTTPS dev conf, alembic heads env — known non-blocking)
- **Live:** `https://artha.build` — Cloudflare proxied, SSL Full Strict, WAF active

## Requirements

### Validated (v1.0 + v2.0)

**v1.0 — First Customer Ready:**
- ✓ User can register, login, reset password — v1.0 (Phase 1)
- ✓ NetSuite TBA session connect/disconnect in < 30s — v1.0 (Phase 2)
- ✓ AI answers NetSuite questions via local Ollama — v1.0 (Phase 3)
- ✓ AI generates valid SuiteScript 2.1 — v1.0 (Phase 3)
- ✓ Script deploys to NetSuite on user approval — v1.0 (Phase 2)
- ✓ `docker-compose up` on fresh EC2 in < 10 min — v1.0 (Phase 5)
- ✓ Zero OpenAI API references in production code — v1.0 (Phase 3)
- ✓ 147/150 tests passing — v1.0 (Phase 8.1)
- ✓ License key validation on startup (7-day offline cache) — v1.0 (Phase 7)
- ✓ RBAC: users see only their chats, admins see all — v1.0 (Phase 9)
- ✓ Team management: invite members, manage roles — v1.0 (Phase 9–10)
- ✓ Password reset with professional email templates — v1.0 (Phase 11)
- ✓ SOC2 audit logging, session management hardening — v1.0 (Phase 12)

**v2.0 — Enterprise Ready:**
- ✓ SAML 2.0 / OIDC SSO for enterprise IdP — v2.0 (Phase 13)
- ✓ TOTP MFA / 2FA for individual users — v2.0 (Phase 13)
- ✓ Idle session timeout + IP allowlist — v2.0 (Phase 13)
- ✓ GDPR Art. 15/17: data export + right to erasure — v2.0 (Phase 14)
- ✓ Immutable audit log with hash-chaining + CSV export — v2.0 (Phase 14)
- ✓ SOC2 evidence package auto-generated — v2.0 (Phase 14)
- ✓ Automated SQLite backup to S3 (daily) — v2.0 (Phase 15)
- ✓ Sentry error monitoring on all unhandled exceptions — v2.0 (Phase 15)
- ✓ Graceful shutdown (30s drain on SIGTERM) — v2.0 (Phase 15)
- ✓ /health/detail with real dependency status — v2.0 (Phase 15)
- ✓ API key auth for third-party integrations — v2.0 (Phase 16)
- ✓ /api/v1/ versioned endpoints (backward-compatible) — v2.0 (Phase 16)
- ✓ Webhook delivery for chat.completed + script.deployed — v2.0 (Phase 16)
- ✓ Standard response envelope {data, error, meta} — v2.0 (Phase 16)
- ✓ First-run onboarding wizard for new admins — v2.0 (Phase 17)
- ✓ License key entry from UI (no .env editing) — v2.0 (Phase 17)
- ✓ In-app notification banner (license expiry, Ollama down, disk full) — v2.0 (Phase 17)
- ✓ Empty states guiding new users — v2.0 (Phase 17)
- ✓ Cloudflare WAF (OWASP CRS + CF Managed Ruleset) — v2.0 (Phase 18)
- ✓ Cloudflare Analytics (pageviews, country, path) — v2.0 (Phase 18)
- ✓ WAF rate limiting /api/* at 60 req/min — v2.0 (Phase 18)
- ✓ Security headers via Cloudflare Transform Rules — v2.0 (Phase 18)
- ✓ HTTPS redirect + static cache + SSL Full Strict — v2.0 (Phase 18)

### Active (Next Milestone)

- [ ] v3.0: Multi-tenant SaaS mode (shared infrastructure, tenant isolation)
- [ ] v3.0: AI model upgrade path UI (swap Ollama models without SSH)
- [ ] v3.0: NetSuite sandbox vs production environment selector
- [ ] v3.0: Script version history and rollback
- [ ] v3.0: Usage analytics dashboard (chat counts, script deployments, top intents)
- [ ] v3.0: Mobile-responsive frontend

### Known Gaps (Deferred)

- Password reset token mismatch (FR-AUTH-01): query param vs path param in reset flow — tracked in v1.0 audit
- CASE-186: `/api/chatbot/process` lacks `require_user` Depends — any unauthenticated caller can invoke LLM
- Phase 9 JTI blacklist: logout doesn't invalidate existing JWT tokens
- MFA login gate (UI): backend TOTP endpoints exist (Phase 13) but MFA isn't enforced at login page yet

### Out of Scope

- Mobile native app — Docker Compose is desktop/server only
- Video chat / screen sharing — use external tools
- Offline mode — requires network for license ping
- Multi-cloud support (Azure/GCP) — AWS-only for now

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite over PostgreSQL | Single-tenant BYOC, no external DB dependency | ✓ Good — simplifies deployment |
| Ollama (local LLM) | Air-gapped requirement, zero external API calls | ✓ Good — core differentiator |
| PyJWT over python-jose | python-jose has unpatched CVEs | ✓ Good — no regressions |
| Root CA pins only (SSL) | Leaf pins require app update on cert renewal | ✓ Good — 0 forced updates |
| JWT sub as str(user_id) | Consistent across all auth layers | ✓ Good — no type errors |
| Phase 8 executed before Phase 9-12 | Launch gate first, enterprise second | ✓ Good — incremental quality |
| WAF in LOG mode (not block) | OWASP CRS false positives on SuiteScript patterns | ✓ Good — user reviews before blocking |
| CSP enforcing via Cloudflare, report-only via nginx | Header ownership separation, no duplication | ✓ Good — clean header stack |
| SSO test-connection deferred (Phase 13) | Would require live IdP for verification | — Pending |
| MFA login gate deferred (Phase 13) | Backend built, frontend enforcement skipped | ⚠️ Revisit — security gap |

## Constraints (Still Active)

| Constraint | Reason |
|------------|--------|
| NetSuite TBA credentials in RAM only | Legal / security — NEVER written to disk |
| All AI inference via Ollama | Air-gapped requirement |
| Docker Compose only (no manual docker run) | Reproducibility |
| Alembic render_as_batch=True | SQLite ALTER TABLE limitation |
| Port 11434 (Ollama) never exposed publicly | Security |

---

*Last updated: 2026-04-14 after v2.0 milestone*
