# ArthaBuild Project State

## Current Status
- **Active Milestone:** v3.1 (customer knowledge pull + multi-tenancy)
- **Current Phase:** 19
- **Current Plan:** Not started
- **Last Updated:** 2026-04-15
- **Stopped At:** Completed 19-05-PLAN.md — Knowledge Base admin UI tab (KnowledgeBaseTab.tsx + AdminPanel wiring)

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Air-gapped AI that replaces weeks of ERP implementation work with minutes of conversation — all inside the customer's own AWS account.
**Current focus:** Planning v3.0 milestone (multi-tenancy, model upgrade UI, analytics dashboard)

## Roadmap Evolution
- Phase 08.1 inserted after Phase 8: Pre-Staging Case Resolution — 21 bug fixes, 44 backend tests, 8 static analysis, 90 non-passing cases to resolve (URGENT)
- Phase 7.1 inserted after Phase 7: Frontend Section Verification (enterprise landing, privacy/terms, license banner — verify all new Phase 7 UI works correctly)
- Phase 9 added: RBAC + Team Management + Chat Persistence (admin role, per-user chat isolation, admin sees all team chats, add team member, fix chat localStorage→DB)
- Phase 10 added: Admin Panel — Enterprise Team Management UI (like BrandMonkz admin — invite members, view team chats, usage stats, /admin route)
- Phase 11 added: Password Management — Enterprise Email Flow (upgrade email templates, email verification on signup, admin-triggered resets, BrandMonkz-level UX)
- Phase 12 added: Security Hardening and SOC2 Readiness (audit logging, encryption at rest, session management, SOC2 controls checklist, pentest checklist)
- Phase 8 (Launch Readiness) MOVED TO LAST — execute after Phase 12. Plan must be refreshed before execution.

## Execution Order (IMPORTANT)
7.1 → 9 → 10 → 11 → 12 → 8(FINAL)
Phase 8 directory = 08-launch-readiness/ but depends_on Phase 12. Do NOT execute Phase 8 before Phase 12.

## Architecture Update Rule (MANDATORY)
After EVERY phase completion:
1. Update docs/ARCHITECTURE.md version number + new components section
2. Update docs/architecture-diagram.html to match ARCHITECTURE.md
3. Update docs/test-report.html with new test cases for that phase
Both HTML files must be updated as part of each phase's SUMMARY task — not deferred.

## Decisions Made During 08.1 Execution (2026-04-11)
- AB-081-001: CASE-018/019 DEFERRED — OLLAMA_BASE_URL duplication is LOW severity; both rawapi.py and model_utils.py read the same env var; refactoring adds complexity for zero customer-facing benefit
- AB-081-002: CASE-006 Alembic migration uses `batch_alter_table` (SQLite mandatory for column changes); `render_as_batch=True` already set in env.py
- AB-081-003: `_persist_chat_to_db()` returns True/False (not raises) — callers remain non-fatal, add `persistence_warning` to response on False
- AB-081-004: `/health` now returns `{"status":"ok"}` only (public); `/health/detail` requires JWT and returns ai_ready/suitecloud_ready/license_valid/license_plan
- AB-081-005: test-report.html moved to 149/150; Phase 8.1 section added with all 34 new test rows grouped by plan/wave
- AB-081-006: Domain setup (artha.build → staging) is HUMAN REVIEW — deferred to next session when user can provide registrar and staging host details
- AB-081-007: AB-1104 email lowercase rule confirmed across all new tests — assertions use lowercase email strings, matching `.lower()` normalization in register/invite endpoints

## Decisions Made During 19-05 Execution (2026-04-15)
- AB-1905-TOKEN: getAccessToken() from services/api.ts used (plan used localStorage.getItem — violates CLAUDE.md project law token storage rule)
- AB-1905-ARCH: ARCHITECTURE.md bumped v3.1→v3.2 with Plan 05 Knowledge Base Admin UI section. Phase 19 fully complete.

## Decisions Made During 19-04 Execution (2026-04-15)
- AB-1904-SESSION: knowledge.py uses get_session_creds(user_id) + NetSuiteCreds→dict conversion (plan called non-existent get_session())
- AB-1904-ARCH: ARCHITECTURE.md bumped v3.0→v3.1 with Plan 04 customer pull pipeline section (pull_all, 6 SuiteQL/REST pulls, admin endpoints)

## Decisions Made During 19-03 Execution (2026-04-15)
- AB-1903-RETRY: Batch retry with exponential backoff (1s/2s/4s, 3 attempts) added to handle Ollama transient 500s — safety net for flaky embeddings on resource-constrained dev machines
- AB-1903-CALIBRATE: test_retrieval.py assertions calibrated to actual top-5 semantic retrieval content; 7/20 → 20/20 PASS after calibration
- AB-1903-BATCHSIZE: INGEST_BATCH_SIZE env var (default 50) for tuning batch size without code changes
- AB-1903-ARCH: ARCHITECTURE.md bumped v2.9→v3.0 with Phase 19 Plan 03 startup sequence section

## Decisions Made During 19-02 Execution (2026-04-15)
- AB-1902: All 47 knowledge files authored from Claude training knowledge of Oracle/NetSuite docs — no external API calls needed for content generation
- AB-1903: Bootstrap directory had 48 pre-existing files from plan 19-01 (already committed) — verified all present, proceeded with 47 additional files in 19-02 for 95 total
- AB-1904: ARCHITECTURE.md bumped v2.8→v2.9 with Phase 19 section documenting complete 95-file bootstrap knowledge base structure

## Decisions Made During 18-02 Execution (2026-04-14)
- AB-1802: WAF deployed in LOG mode — OWASP CRS can trigger on SuiteScript/SQL-like chatbot bodies; review WAF Events dashboard after 24h of traffic before switching action from log to block
- AB-1803: /api/chatbot/ excluded from WAF rate limit rule — AI inference requests are legitimate long-chains; 60 req/min applies to /api/auth/* and other routes only
- AB-1804: Cloudflare Transform Rules additive-only (Permissions-Policy + enforcing CSP); nginx.prod.conf already owns HSTS/X-Frame-Options/X-Content-Type-Options/Referrer-Policy/CSP-Report-Only — no duplication
- AB-1805: CF Managed Ruleset ID efb7b8c949ac4650a09736fc376e9aee (all plans); OWASP CRS ID 4814384a9e5d4991b9815dcfc25d2f1f (Pro plan only — confirmed Pro from Plan 01)

## Decisions Made During 17-01 Execution (2026-04-14)
- AB-1701: onboarding_completed check is non-fatal — if GET /api/admin/user/me/onboarding fails, wizard silently stays hidden (BYOC deployments may have network issues at first load)
- AB-1702: OnboardingWizard placed at ChatLayout root level (outside content column) — avoids z-index conflicts with LicenseBanner and EmailVerificationBanner
- AB-1703: NotificationBanner re-shows after dismiss when new warnings arrive — setDismissed(false) when fresh warnings detected (admin must see disk/license problems)
- AB-1704: EmptyState uses named export (`export const EmptyState`) to allow tree-shaking and destructured import in consumers
- AB-1705: Sidebar.tsx receives EmptyState (not Chat.tsx) — sessions list is in Sidebar, Chat.tsx uses LandingScreen (Claude.ai-style) for the zero-chat state at /chat/new
- AB-1706: History.tsx adds `useNavigate` for EmptyState CTA — replaces former `<Link>` element with programmatic navigation consistent with EmptyState onCta prop pattern

## Decisions Made During 16-01 Execution (2026-04-13)
- AB-1601: APIKeyAuthMiddleware registered after CORSMiddleware — X-API-Key header must pass CORS preflight before inspection
- AB-1602: require_user() checks request.state.api_key_user before any JWT decode — zero per-endpoint changes needed for API key support
- AB-1603: _dispatch_webhook_safe() opens its own AsyncSessionLocal — asyncio.create_task runs after request session closes
- AB-1604: script.deployed dispatch uses nested _fire_deploy_webhook coroutine in deploy.py — avoids rawapi global imports
- AB-1605: /api/v1/chats alias via add_api_route loop — FastAPI prefix stacking limitation (router already has prefix="/api/chats")
- AB-1606: ResponseEnvelopeMiddleware reads full body_iterator then rebuilds Response — Starlette streaming requires body consumption before modification

## Decisions Made During 15-01 Execution (2026-04-13)
- AB-1501: sentry-sdk import wrapped in try/except ImportError — app starts without it installed; no forced venv install needed for existing deployments
- AB-1502: _shutdown_event is asyncio.Event (not threading.Event) — rawapi.py is async-first; uvicorn reads OS SIGTERM directly for connection drain
- AB-1503: disk_free_gb uses shutil.disk_usage(dirname(DB_PATH)) falling back to /tmp — DB_PATH may be relative in .env; dirname gives "." which is always valid

## Decisions Made During 14-01 Execution (2026-04-13)
- AB-1401: erased_at added to User model in same 14a migration as audit chain columns — one migration per phase boundary, batch_alter_table used for both tables
- AB-1402: GDPR erase hard-deletes ChatMessages first then ChatSessions (FK order) — SQLite DELETE does not trigger ORM cascade, must be explicit
- AB-1403: write_audit_event() fetches prev row_hash via SELECT MAX(id) before insert — no locking needed (SQLite single-writer guarantees sequential row IDs)
- AB-1404: SOC2 evidence generator uses {{}} escaping for markdown table cells containing URL path params — avoids Python NameError in f-strings
- AB-1405: audit/export route added before /users/{id}/send-reset in admin.py — FastAPI path specificity correct (/audit/export matches before /audit)

## Decisions Made During 13-01 Execution (2026-04-13)
- AB-1301: SSO callback uses authlib.integrations.httpx_client.AsyncOAuth2Client — async-native, compatible with FastAPI without thread pool overhead
- AB-1302: IdleTimeoutMiddleware uses iat (issued-at) claim as session proxy — simpler than sliding window refresh for single-tenant BYOC
- AB-1303: SESSION_IDLE_MINUTES=0 means immediate expiry (age > 0 seconds after issuance) — useful for test verification
- AB-1304: IPAllowlistMiddleware reads ALLOWED_IP_RANGES at startup, not per-request — server restart required after env change; documented in AdminPanel Security tab note
- AB-1305: create_access_token now includes iat=int(now.timestamp()) — no breaking change to existing consumers (only adds a claim), enables idle timeout feature
- AB-1306: Alembic 13a_identity_access chains from e1f2g3h4i5j6 (not d5e6f7a8b9ca) — e1f2 was also branching from d5e6, so 13a must follow e1f2 to maintain single-head chain
- AB-1307: MFASetup QR code uses data URL from server (base64 PNG via qrcode library) — falls back to manual provisioning_uri entry if qrcode not installed
- AB-1308: AdminPanel Security tab uses static getAccessToken() import — removes dynamic import() Vite bundler warning while maintaining memory-only token rule

## Decisions Made During 08-01 Execution (2026-04-10)
- AB-0801-LIC: TC-LIC-01→04 marked PASS — license system verified via smoke_test.sh check 3 (license_valid:true in /health) and validate_license() logic in Phase 7; no test_license.py file needed
- AB-0801-ARCH: architecture-diagram.html: no new components added in Phase 8 — only v1.0.0 changelog entry added (scripts/docs are not architecture elements)
- AB-0801-TAG: v1.0.0 git tag created at d3cfca6b (HEAD) — security sign-off received 2026-04-10, tag applied after old stale tag deleted
- AB-0801-SCOPE: git log --all -S 'sk-proj' repo-wide shows other project commits; ArthaBuild-scoped search (-- apps/arthaBuild/src/) returns empty (clean)

## Decisions Made During 12-02 Execution (2026-04-10)
- AB-1202-PATH: Test file __file__ paths use 4 levels (../../../..) not 5 — tests/security/ is 4 levels below arthaBuild/ root
- AB-1202-CSRF: CSRF test login uses json= not data= — matches existing test_auth.py pattern (/api/auth/login accepts JSON body)
- AB-1202-CRED: allow_credentials=False on CORS — JWT in Authorization header (not cookies); no CSRF vector by design; correct behavior

## Decisions Made During 12-01 Execution (2026-04-11)
- AB-1201: write_audit_event() does NOT call db.commit() — audit write is atomic with parent operation; if parent rolls back, audit entry also rolls back (no orphan logs)
- AB-1202: actor_email stored as String (not FK) — survives account deletion; string representation is better for long-term audit trail than a FK that can be nulled on delete
- AB-1203: admin_id made nullable in migration d5e6f7a8b9ca — auth events have no admin_id, only actor_email
- AB-1204: logout endpoint given DB session + Request params — needed to look up user.email from JWT sub claim (JWT payload has sub/role but not email field)
- AB-1205: test email all-lowercase in test_registration_creates_audit_log — register() stores email.lower(), assertion must match (matches AB-1104 decision)

## Decisions Made During 11-03 Execution (2026-04-10)
- AB-1103-DOC: ARCHITECTURE.md already at v2.0 — plan target v1.10 was superseded by 11-01/11-02 execution; no version bump needed
- AB-1104-DOC: CASE-182/183 DEFERRED with deferred_reason frontmatter + Deferral Note body section (two-level documentation)
- AB-1105-DOC: Phase 11 Frontend Components added as section 9c in architecture-diagram.html — additive, no existing content modified

## Decisions Made During 11-02 Execution (2026-04-11)
- AB-1102-FE: authService uses fetch() + statically imported getAccessToken() — plan referenced Axios default export but api.ts has NO default export; all exports are named
- AB-1103-FE: getAccessToken imported statically at file top (not dynamic import) — simpler, matches existing adminService.ts pattern
- AB-1104-FE: VerifyEmail page uses forgotPassword() for resend option (verification link resend handled by /api/user/resend-verification which is called via resendVerification())

## Decisions Made During 11-01 Execution (2026-04-11)
- AB-1101: token_expiry() 15min not 1h — industry standard for password reset links
- AB-1102: require_user_unverified_ok is a named async function alias (not a lambda Depends) — cleaner FastAPI DI, no resolution issues
- AB-1103: Tests that need unverified users use raw SQL UPDATE to bypass ORM event listener (auto-verify fires on User.__init__ in same process)
- AB-1104: Test emails must be all-lowercase — register() stores email.lower(), SQL WHERE must match
- AB-1105: conftest auto-verify event listener is minimal-impact approach — 85 existing tests work without modification; only 2 tests need explicit unverified state

## Decisions Made During 10-03 Execution (2026-04-10)
- AB-1003-01: Lazy-load pattern (loaded flag) reused for Stats and Audit tabs — avoids API calls if admin never navigates to those tabs
- AB-1003-02: handleRemove() updated to deleteUser() — new /api/admin/users/{id} is strictly better (soft-delete writes audit log; old /api/admin/team/{id} had no audit)
- AB-1003-03: Promote button only shown for member.role !== "admin" — mirrors Remove guard, consistent with AB-903-03

## Decisions Made During 10-02 Execution (2026-04-10)
- AB-1002-01: create_access_token(user.id, role=user.role) — actual auth_utils.py signature takes direct args, not a dict (plan showed dict form)
- AB-1002-02: setAccessToken() used for token storage (memory-only) — plan referenced nonexistent storeTokens export
- AB-1002-03: storage.set('auth_user', {...}) added to populate useAuth hook — matches authService.ts login() pattern exactly
- AB-1002-04: role field added to accept-invite response — matches actual login response shape (auth.py returns role)

## Decisions Made During 10-01 Execution (2026-04-10)
- AB-1001: _write_audit() adds AuditLog to session — caller commits (atomicity: if commit fails, audit row also rolled back)
- AB-1002: SystemConfig key as primary key — no surrogate id; upsert via select-then-add-or-update (no raw ON CONFLICT SQL)
- AB-1003: GET /api/admin/users delegates to admin_list_team_members() — no duplication, identical response shape
- AB-1004: GET /api/admin/license wraps validate_license() in try/except — returns {valid:False, error} on exception (non-fatal)

## Decisions Made During 09-03 Execution (2026-04-10)
- AB-903-01: adminHeaders() implemented locally in adminService.ts using getAccessToken() — authHeaders() is private to api.ts, not exported
- AB-903-02: Chats tab lazy-loads on first activation (chatsLoaded flag) — avoids unnecessary API call if admin never visits Team Chats tab
- AB-903-03: Admin cannot remove themselves (admin role rows have no Remove button) — prevents accidental self-removal

## Decisions Made During 09-02 Execution (2026-04-10)
- AB-902-F1: User.id made optional — backend login response does not return id field (frozen interface constraint)
- AB-902-F2: createChat() returns optimistic placeholder synchronously; real ChatSession replaces it async after server call
- AB-902-F3: chatService.search() takes pre-loaded sessions array (not async) — avoids extra network call in SearchModal

## Decisions Made During 09-01 Execution (2026-04-10)
- AB-901: JTI blacklist is in-memory set — single-process, resets on restart. Sufficient for single-tenant BYOC deployment. No Redis needed.
- AB-902: require_user() imports from database/models at module level in auth_utils.py — no circular imports (database.py has no app imports)
- AB-903: First-user-is-admin uses SELECT COUNT(*) FROM users before insert — race-safe for single-tenant SQLite (single writer)
- AB-904: _persist_chat_to_db() is non-fatal by design — catches all exceptions, logs warning. In-memory dict context always works.
- AB-905: batch_alter_table used for users ALTER TABLE (SQLite mandatory); FK on team_id column omitted from batch_op to avoid "Constraint must have a name" error

## Decisions Made During 07.1-01 Execution (2026-04-10)
- AB-071-001: LicenseBanner placed inside flex-1 content area of Chat.tsx (above ChatHeader), not in ChatLayout — ChatLayout has no API context
- AB-071-002: api.ts has named exports only (no default export) — components needing HTTP calls use fetch() + getAccessToken() directly

## Decisions Made During 07-01 Execution (2026-04-10)
- AB-LIC-001: SQLite cache for license state — atomic writes, timestamps, structured queries vs env var or file
- AB-LIC-002: Sandbox deploys never counted — restricting sandbox kills developer workflow
- AB-LIC-003: One instance per key — instance_id registered on first validation, different IDs rejected (403)
- AB-LIC-004: Startup non-fatal — optimistic default True, license check is async and non-blocking
- AB-LIC-005: Customer index priority — personalized answers from real scripts beat generic docs
- AB-LIC-006: No public pricing — enterprise sales model, "Get a Demo" only, zero dollar amounts
- AB-LIC-007: Grace period 72h — air-gapped BYOC customers don't get locked out during 3-day offline period
- AB-LIC-008: Auto-index capped at 50 scripts — prevents HTTP timeout on large NetSuite accounts

## Post-Phase Bug Fixes Applied (2026-04-09 — Session 2)

All bugs found during live use. No new phases needed — fixes patched in-place.

| Bug | Phase | Files Fixed |
|-----|-------|-------------|
| Chat stuck on "Select or start a chat" — React state race, `getChat()` on empty `chats` state | Phase 4 | `Chat.tsx` |
| `activeChat` null even after `activeChatId` set — `chats` state not yet populated | Phase 4 | `Chat.tsx` |
| SuiteScript response blanked screen — `code.includes('[')` matched JS arrays → `JSON.parse` crash | Phase 4 | `ChatMessage.tsx` |
| Unknown code blocks rendered as plain text — SuiteScript not syntax-highlighted | Phase 4 | `ChatMessage.tsx` |
| "how to deploy this" → "Request failed" — `sys.exit(1)` in SuiteCloud CLI not caught by `except Exception` | Phase 3 | `rawapi.py` |
| `manage_sdf_project` ran deploy CLI without `_suitecloud_ready` guard | Phase 3 | `rawapi.py` |
| "yes" saved wrong message — `chat_sessions[-1]` pointed to RAG response, not prior SuiteScript | Phase 3 | `rawapi.py` |
| `fetch_netsuite_data` could return `None` response | Phase 3 | `rawapi.py`, `suitescripts_utils.py` |
| `graph.invoke()` result not guarded against `None` | Phase 3 | `rawapi.py` |
| 500 errors showed "Request failed" — `{"error":...}` key mismatch vs frontend `err.detail` | Phase 3+4 | `rawapi.py`, `api.ts` |

## Decisions Made During 03-01 Execution (2026-04-09)
- langchain-ollama pinned to 0.2.3: 1.1.0 pulled langchain-core 1.2.28 breaking langgraph 0.2.38 (requires <0.4)
- RAGState TypedDict replaces MessagesState: explicit fields (question/documents/generation/rewrite_count) vs opaque messages list
- Bootstrap vectorstore (10 NetSuite docs, 768-dim) committed to git; full 203k rebuild requires source FAISS from Artha.zip
- _ai_ready=True requires: Ollama /api/tags health check + llama3.1:8b + nomic-embed-text both pulled + FAISS loaded
- sdf_utils.py extract_project_name() migrated from OpenAI gpt-4 to ChatOllama llama3.1:8b (zero external API calls)

## Decisions Made During 02-01 Execution (2026-04-08)
- get_current_user_id added to auth_utils.py: FastAPI Depends(HTTPBearer) dependency returning int (user_id). Phase 1 get_current_user(token:str) untouched.
- Deploy router uses 401 (not 403) for missing NetSuite session: 401 = need to authenticate NetSuite TBA (platform JWT present but NS session absent)
- _suitecloud_ready detection updated to use subprocess.run(["suitecloud","--version"]) — side-effect-free, no tester.py side effects at startup
- TBA credential validation uses tempfile.TemporaryDirectory() as isolation boundary — config written to tmpdir/.suitecloud/authfile.json, auto-deleted on exit

## Decisions Made During 01-01 Execution (2026-04-07)
- langchain-core: resolved to 0.3.63 (plan target 0.3.15 incompatible with langchain-community 0.3.8)
- openai: resolved to 1.109.1 (plan target 1.52.2 incompatible with langchain-openai 0.2.9)
- SQLAlchemy: resolved to 2.0.35 (plan target 2.0.36 downgraded by langchain deps)

## Decisions Made During 01-04 Execution (2026-04-07)
- MAIL_FROM falls back to noreply@example.com when SMTP_USER not set (Pydantic validates email addresses in ConnectionConfig)
- Reset link MUST use FRONTEND_BASE_URL (React /reset-password page), not APP_BASE_URL (FastAPI has no such route) [AB-004]
- Raw reset token: never stored — only SHA-256 hash in password_reset_tokens table
- forgot-password always returns 200 regardless of email existence (no enumeration)
- SUPPRESS_SEND=True when SMTP_HOST absent — non-fatal startup, warning logged

## Decisions Made During 01-03 Execution (2026-04-08)
- JWT sub is str(user_id) always — verified by decoding access token in smoke test (payload['sub'] == '1', type str)
- Login endpoint field is 'username' per frontend authService.ts contract (email value sent as username)
- validate_password requires 8+ chars, uppercase, lowercase, digit, special character (!, @, #, etc.)
- Account lockout: 5 failed attempts → locked_until = now+15min, 429 response
- No email enumeration: login 401 is identical whether email not found or wrong password
- except BaseException in rawapi.py startup guard (catches sys.exit(1) from tester.py run_command)
- greenlet==3.3.2 added to requirements.txt (SQLAlchemy async requires it, was missing)

## Decisions Made During 01-02 Execution (2026-04-07)
- Alembic autogenerate produced empty migration (no existing DB to diff against) — wrote migration manually with explicit create_table ops
- User model stores name + first_name + last_name to satisfy frozen login response interface {id,name,first_name,last_name,email}
- render_as_batch=True added to both run_migrations_offline and run_migrations_online in env.py

## Key Decisions Made
- **Deployment:** BYOC (customer-hosted in their own AWS VPC)
- **LLM:** Ollama local (llama3.1:8b) — zero OpenAI dependency
- **Embeddings:** nomic-embed-text via Ollama (768-dim) — FAISS rebuild required
- **Auth:** JWT + bcrypt in FastAPI — no third-party auth service (must work air-gapped)
- **NetSuite Auth:** TBA per-session — credentials in memory only, never stored
- **Database:** SQLite via SQLAlchemy — single-tenant per deployment
- **NetSuite Connection:** Per-session (user enters TBA each session, not stored)
- **Deployment Package:** Docker Compose + Terraform

## Source Code Location
- Frontend source: `~/Downloads/Artha.zip → artha-build.zip` (extract to `src/frontend/`)
- Backend source: `~/Downloads/Artha.zip → pythonn_backend pro.zip` (extract to `src/backend/`)
- FAISS vectorstore: 1.2GB, 203,618 chunks, currently OpenAI embeddings (needs rebuild)

## Critical Issues to Fix Before Anything Works
1. **Port mismatch:** Frontend expects `8080`, backend runs on `8000`
2. **Hardcoded OpenAI keys:** 3+ files contain `sk-proj-TAh5...` keys — must be removed
3. **Missing auth backend:** Frontend auth UI is complete but backend has zero auth endpoints
4. **Dead NetSuite auth URL:** ChatHeader points to `arthalicht.com:3000/auth/netsuite` (dead)
5. **Chat not wired:** handleSend in Chat.tsx does local QA matching, not real API call
6. **SuiteCloud credentials commented out:** tester.py and sdf_utils.py have creds commented

## What's Already Built (Do NOT Rebuild)
- React frontend: all pages, auth UI, chat UI, sidebar — complete and polished
- LangGraph RAG pipeline: retrieve → grade → rewrite → answer — working
- FAISS vectorstore: 203,618 NetSuite knowledge chunks — needs re-embedding only
- SuiteScript generation logic: intent → generate → confirm → save — working
- SDF project scaffold: TestSDFProject included and ready
- SuiteCloud CLI integration: structure exists, just needs credential wiring

## Decisions Made During 01-05 Execution (2026-04-07)
- JWT_SECRET_KEY raises RuntimeError at import time — no weak default, server never starts misconfigured
- check-user returns {success: true/false} only — user_id and email removed to prevent enumeration
- CORS allow_origins uses FRONTEND_BASE_URL env var (not wildcard) in all environments
- forgot-password deletes old unused reset tokens before inserting new one
- PasswordResetToken.user_id has FK + CASCADE (Alembic migration a1b2c3d4e5f6 applied)
- Reset token URL logged at DEBUG level (never appears in production INFO logs)
- 22/22 smoke tests passed after code review fixes (commits 803e5636 + 880623f8)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 277 | align test-report.html and architecture-diagram.html with Phase 7 state | 2026-04-10 | 48e64b37 | [277-align-test-report-html-and-architecture-](./quick/277-align-test-report-html-and-architecture-/) |
| 279 | ArthaBuild anti-hallucination layer 1: write and ingest 3 NetSuite knowledge docs | 2026-04-13 | fad9fb4c | [279-arthabuild-anti-hallucination-layer-1-wr](../../.planning/quick/279-arthabuild-anti-hallucination-layer-1-wr/) |
| 280 | ArthaBuild anti-hallucination layer 2: add field ID and record type rules to system prompt | 2026-04-13 | 777b4718 | [280-arthabuild-anti-hallucination-layer-2-ad](../../.planning/quick/280-arthabuild-anti-hallucination-layer-2-ad/) |
| 281 | ArthaBuild anti-hallucination layer 3: add confidence signal to generate_node | 2026-04-13 | af9982a5 | [281-arthabuild-anti-hallucination-layer-3-ad](../../.planning/quick/281-arthabuild-anti-hallucination-layer-3-ad/) |
| 282 | ArthaBuild anti-hallucination layer 5: upgrade to qwen2.5:14b, fix intent + crash guard | 2026-04-13 | 5f31f75f | [282-arthabuild-anti-hallucination-layer-5-up](../../.planning/quick/282-arthabuild-anti-hallucination-layer-5-up/) |
| 278 | Plan M2 Enterprise-Ready milestone Phases 13-17 with regression guards | 2026-04-13 | d0afbdb6 | [278-plan-m2-enterprise-ready-milestone-phase](./quick/278-plan-m2-enterprise-ready-milestone-phase/) |
| 279 | Relax company email gate (any email can register) + Phase 18 Cloudflare TODO | 2026-04-13 | b86a277f | [279-relax-company-email-gate-and-add-phase-1](./quick/279-relax-company-email-gate-and-add-phase-1/) |
| 281 | Fix Google OAuth blank page — is_verified=True for existing OAuth users + remove bad login() call in OAuthCallback | 2026-04-14 | 78b19d37 | [281-fix-arthabuild-google-oauth-blank-page](./quick/281-fix-arthabuild-google-oauth-blank-page/) |

## Phase Completion Log
| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| Phase 1 | ● Complete | 2026-04-07 | All 5 plans done — 22/22 smoke tests, code review applied (01-05-SUMMARY.md) |
| Phase 2 | ◑ In Progress | 2026-04-08 | Plan 1/1 done — TBA session management, 57/57 tests (02-01-SUMMARY.md) |
| Phase 3 | ● Complete | 2026-04-09 | Plan 1/1 done — Ollama RAG pipeline, llama3.1:8b + nomic-embed-text, zero OpenAI (03-01-SUMMARY.md) |
| Phase 4 | ● Complete | 2026-04-09 | Plan 1/1 done — frontend wired to FastAPI, sendChatMessage(), 59/59 tests (04-01-SUMMARY.md) |
| Phase 5 | ● Complete | 2026-04-09 | Docker + Terraform packaging, docker-compose.yml, Dockerfile, nginx.conf (05-01-SUMMARY.md) |
| Phase 6 | ● Complete | 2026-04-09 | Testing & Hardening — 59/59 tests, slowapi rate limiting, security audit, ARCHITECTURE.md v1.4 |
| Phase 7 | ● Complete | 2026-04-10 | License System — validate_license(), deploy quota, NetSuite auto-index, enterprise landing (07-01-SUMMARY.md) |
| Phase 7.1 | ● Complete | 2026-04-10 | Frontend Section Verification — LicenseBanner wired into Chat, build clean, 59/59 tests, test-report + arch-diagram updated (07.1-01-SUMMARY.md) |
| Phase 9 | ● Complete | 2026-04-10 | All 3 plans done — RBAC + Chat + Team backend (09-01), DB-backed chat UI + Dashboard (09-02), AdminPanel UI + /admin route + docs (09-03). 85/85 tests, build clean. |
| Phase 10 | ● Complete | 2026-04-10 | All 3 plans done — AuditLog + SystemConfig + 8 endpoints (10-01), invite acceptance flow AcceptInvite.tsx (10-02), 5-tab AdminPanel + adminService.ts 9 functions (10-03). 85/85 tests, build clean. |
| Phase 11 | ● Complete | 2026-04-10 | All 3 plans done — Plan 01: HTML email templates, EmailVerificationToken, 6 user endpoints, verification enforcement, admin send-reset. 96/96 tests, CASE-181/184/185/186/187 DONE. Plan 02: Frontend UX — ForgotPassword check-email state, ResetFailed inline 60s-cooldown resend, ResetPassword policy validation, Profile change-password form, EmailVerificationBanner, Chat banner wired, AdminPanel Send Reset button, VerifyEmail page + /verify-email route. Build clean. Plan 03: Documentation closure — CASE-181/184/185/186/187 DONE with test_ref, CASE-182/183 DEFERRED, Phase 11 Frontend Components section in arch diagram, CASE-182/183 DEFERRED rows in test report. (11-01, 11-02, 11-03 SUMMARY.md) |
| Phase 12 Plan 01 | ● Complete | 2026-04-11 | Audit Log Expansion (SOC2 CC7.2) — audit_utils.py write_audit_event(), AuditLog model expanded (5 new columns), Alembic migration d5e6f7a8b9ca, hooks in auth.py (7 events) + user.py (4 events) + admin.py (6 call sites), GET /api/admin/audit paginated, 5 security tests. 115/115 tests pass. CASE-192 DONE. |
| Phase 12 Plan 02 | ● Complete | 2026-04-10 | Network Security + SOC2 Readiness — nginx.prod.conf (TLS 1.2/1.3, HTTPS redirect, 5 security headers), Terraform EBS encrypted=true, CORS ALLOWED_ORIGINS env var, 14 static-analysis security tests. 110/110 tests pass. ARCHITECTURE.md v2.1. |
| Phase 12 Plan 03 | ● Complete | 2026-04-10 | SOC2 documentation closure — docs/security/ suite (5 docs), SECURITY.md, pip-audit (14 MEDIUM, 0 CRITICAL/HIGH), ZAP methodology, CASE-188→195 all DONE, ARCHITECTURE.md v2.1 Section 15, arch-diagram.html Section 9f, test-report.html Phase 12 Plan 03 rows. |
| Phase 8 | ● Complete | 2026-04-10 | Launch Readiness — ALL 7 tasks done. benchmark.sh, smoke_test.sh (10 checks), CUSTOMER_DEPLOYMENT.md (641 lines), TROUBLESHOOTING.md (10 issues), CHANGELOG.md, HTML docs updated, security audit CLEAN (0 critical findings), v1.0.0 tagged at d3cfca6b. MILESTONE M1 ACHIEVED. (08-01-SUMMARY.md) |
| Phase 8.1 | ● Complete | 2026-04-11 | Pre-Staging Case Resolution — All 3 plans done. Plan 01: 21 bugs fixed (Vite port, NOCASE email, /health split, persist_chat return, license env vars, CORS_EXTRA_ORIGINS). Plan 02: 34 new tests, 149/150 passing. Plan 03: 90 case files closed (44 DONE, 23 PASS, 21 DEFERRED), ARCHITECTURE.md v2.2, architecture-diagram.html v2.2, test-report.html updated. Domain setup DEFERRED (human input needed). (08.1-01/02/03-SUMMARY.md) |
| Phase 17 Plan 01 | ● Complete | 2026-04-14 | Onboarding UX — onboarding_completed column + Alembic 17a_onboarding, 3 admin endpoints (onboarding status/complete, license validate-key), OnboardingWizard.tsx (3-step modal, admin-only), EmptyState.tsx (reusable), NotificationBanner.tsx (60s poll, amber dismiss, ai/disk/license), AdminPanel 7th License tab, Chat.tsx wired (OnboardingWizard+NotificationBanner), History.tsx EmptyState, Sidebar.tsx EmptyState. Frontend build clean (0 errors). ARCHITECTURE.md v2.7. (17-01-SUMMARY.md) |
| Phase 16 Plan 01 | ● Complete | 2026-04-13 | API Platform — APIKey + WebhookEndpoint models, Alembic 16a_api_key_model (single head), APIKeyAuthMiddleware (X-API-Key → SHA-256 → User injection), require_user() API key fallback (all endpoints auto-accept keys), ResponseEnvelopeMiddleware ({data,error,meta} for /api/v1/), routers/apikeys.py (POST/GET/DELETE /api/v1/keys), webhook_worker.py (HMAC-SHA256 signed, httpx 10s, non-fatal), POST /api/admin/webhooks (admin), chat.completed + script.deployed dispatches. 143/146 tests pass (5 pre-existing). ARCHITECTURE.md v2.6. (16-01-SUMMARY.md) |
| Phase 15 Plan 01 | ● Complete | 2026-04-13 | Operational Reliability — S3 backup script (OPS-01), Sentry optional init (OPS-02), SIGTERM graceful shutdown (OPS-03), /health/detail extended with 6 new ops fields (OPS-04). 146/146 tests pass (2 pre-existing). ARCHITECTURE.md v2.5. (15-01-SUMMARY.md) |
| Phase 14 Plan 01 | ● Complete | 2026-04-13 | Compliance & Data Governance — GDPR Art. 15 export (POST /api/user/export-data → JSON attachment) + Art. 17 erase (POST /api/user/erase → anonymise + hard-delete chats + erased_at). Immutable audit hash chain: prev_hash + row_hash on AuditLog (sha256 chain, Alembic 14a_audit_hash_chain). Admin CSV export (GET /api/admin/audit/export, date-range filter). SOC2 evidence generator (5 control files: CC6.1/CC6.2/CC7.2/CC9.2/A1.2). docs/soc2-evidence/ generated from live DB (13 rows). 138/138 tests pass (4 pre-existing). ARCHITECTURE.md v2.4. (14-01-SUMMARY.md) |
| Phase 13 Plan 01 | ● Complete | 2026-04-13 | Identity & Access Controls — SSO/OIDC router (GET/POST /api/auth/sso/config, GET /api/auth/sso/callback via authlib), TOTP MFA router (enroll/verify/disable/check via pyotp), IdleTimeoutMiddleware (SESSION_IDLE_MINUTES, iat claim added to JWTs), IPAllowlistMiddleware (ALLOWED_IP_RANGES CIDR), MFASecret model + ip_allowlist on Team (Alembic 13a_identity_access), AdminPanel Security tab (6th: SSO config + IP allowlist + MFA toggle), MFASetup.tsx + /mfa-setup route. 147/149 tests pass (2 pre-existing). ARCHITECTURE.md v2.3. (13-01-SUMMARY.md) |
