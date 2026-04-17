# ArthaBuild Case Index

Generated: 2026-04-10 13:30

## Phase 01 — Foundation & Auth Backend

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-001](phase-01-foundation-auth/CASE-001.md) | Vite proxy target defaults to wrong port (8080 vs 8000) | MEDIUM | HARDCODED | OPEN | — | — |
| [CASE-002](phase-01-foundation-auth/CASE-002.md) | finetunedmodelrun.py uses OpenAI — violates Ollama-only rule | HIGH | DEAD_CODE | OPEN | CASE-003 | — |
| [CASE-003](phase-01-foundation-auth/CASE-003.md) | finetunedmodelrun.py never imported — entire file is dead code | MEDIUM | DEAD_CODE | OPEN | — | CASE-002 |
| [CASE-004](phase-01-foundation-auth/CASE-004.md) | finetunedmodelrunv2.py never invoked from production code | MEDIUM | DEAD_CODE | OPEN | — | — |
| [CASE-005](phase-01-foundation-auth/CASE-005.md) | TokenResponse.user_type hardcoded to 'Administrator' for all users | MEDIUM | HARDCODED | OPEN | — | — |
| [CASE-006](phase-01-foundation-auth/CASE-006.md) | Login normalizes email to lowercase but DB column has no COLLATE NOCASE index | LOW | ARCH_VIOLATION | OPEN | — | — |
| [CASE-007](phase-01-foundation-auth/CASE-007.md) | No 422 validation error tests for /api/user/register | MEDIUM | TEST_GAP | OPEN | — | — |
| [CASE-008](phase-01-foundation-auth/CASE-008.md) | No test for account lockout counter reset on successful login | LOW | TEST_GAP | OPEN | — | — |
| [CASE-009](phase-01-foundation-auth/CASE-009.md) | Alembic migrations bypassed in test suite (conftest uses create_all) | MEDIUM | TEST_GAP | OPEN | — | — |
| [CASE-010](phase-01-foundation-auth/CASE-010.md) | latest_javascript_code variable assigned but never read | LOW | DEAD_CODE | OPEN | — | — |
| [CASE-011](phase-01-foundation-auth/CASE-011.md) | Duplicate subprocess import in rawapi.py | LOW | DEAD_CODE | OPEN | — | — |
| [CASE-012](phase-01-foundation-auth/CASE-012.md) | role field added to TokenResponse but not in frozen interface spec | LOW | PHASE_CORRECTNESS | OPEN | — | — |
| [CASE-041](phase-01-foundation-auth/CASE-041.md) | POST /api/auth/check-user returns {success:true} for known email | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-042](phase-01-foundation-auth/CASE-042.md) | POST /api/auth/check-user returns {success:false} for unknown email | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-043](phase-01-foundation-auth/CASE-043.md) | POST /api/auth/check-user returns 422 for malformed email | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-044](phase-01-foundation-auth/CASE-044.md) | POST /api/auth/login returns 200 with access and refresh tokens for valid credentials | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-045](phase-01-foundation-auth/CASE-045.md) | POST /api/auth/login returns 401 with generic error for wrong password | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-046](phase-01-foundation-auth/CASE-046.md) | POST /api/auth/login returns identical 401 for unknown email and wrong password (no enumeration) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-047](phase-01-foundation-auth/CASE-047.md) | POST /api/auth/login triggers 429 after 5 consecutive wrong passwords | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-048](phase-01-foundation-auth/CASE-048.md) | POST /api/auth/login rejects SQL injection attempts (401 or 422) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-049](phase-01-foundation-auth/CASE-049.md) | POST /api/auth/forgot-password returns 200 for registered email | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-050](phase-01-foundation-auth/CASE-050.md) | POST /api/auth/forgot-password returns identical 200 for unknown email (no enumeration) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-051](phase-01-foundation-auth/CASE-051.md) | POST /api/auth/forgot-password persists PasswordResetToken to DB | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-052](phase-01-foundation-auth/CASE-052.md) | Second POST /api/auth/forgot-password invalidates all previous unused tokens | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-053](phase-01-foundation-auth/CASE-053.md) | POST /api/auth/reset-password updates password for valid token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-054](phase-01-foundation-auth/CASE-054.md) | POST /api/auth/reset-password marks token used=True in DB after success | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-055](phase-01-foundation-auth/CASE-055.md) | POST /api/auth/reset-password returns 400 for already-used token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-056](phase-01-foundation-auth/CASE-056.md) | POST /api/auth/reset-password returns 400 for expired token (Link expired) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-057](phase-01-foundation-auth/CASE-057.md) | POST /api/auth/reset-password returns 400 for fake/unknown token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-058](phase-01-foundation-auth/CASE-058.md) | POST /api/auth/reset-password returns 400 for weak new password | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-059](phase-01-foundation-auth/CASE-059.md) | After reset, user can log in with new password (E2E reset flow) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-060](phase-01-foundation-auth/CASE-060.md) | POST /api/auth/refresh returns new access token for valid refresh token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-061](phase-01-foundation-auth/CASE-061.md) | POST /api/auth/refresh returns 401 for expired refresh token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-062](phase-01-foundation-auth/CASE-062.md) | POST /api/auth/refresh returns 401 for tampered/fake refresh token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-063](phase-01-foundation-auth/CASE-063.md) | POST /api/auth/refresh rejects access token used as refresh (wrong type) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-064](phase-01-foundation-auth/CASE-064.md) | POST /api/user/register returns 201 and confirmation message for valid user | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-065](phase-01-foundation-auth/CASE-065.md) | POST /api/user/register returns 409 for duplicate email | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-066](phase-01-foundation-auth/CASE-066.md) | POST /api/user/register returns 400 for weak password (no uppercase) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-067](phase-01-foundation-auth/CASE-067.md) | POST /api/user/register returns 422 when email field missing | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-068](phase-01-foundation-auth/CASE-068.md) | POST /api/user/register returns 422 for invalid email format | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-069](phase-01-foundation-auth/CASE-069.md) | POST /api/user/register returns 400 when password missing digit | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-070](phase-01-foundation-auth/CASE-070.md) | POST /api/user/register returns 400 when password missing special character | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-087](phase-01-foundation-auth/CASE-087.md) | GET /api/health returns 200 | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-088](phase-01-foundation-auth/CASE-088.md) | GET /api/health returns {status:'ok'} response shape | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-089](phase-01-foundation-auth/CASE-089.md) | App startup raises RuntimeError when JWT_SECRET_KEY env var is missing | INFO | FEATURE_TEST | PASS | — | — |

## Phase 02 — NetSuite TBA Session

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-013](phase-02-netsuite-tba/CASE-013.md) | No auth test for /api/netsuite/authenticate requires JWT | MEDIUM | TEST_GAP | OPEN | — | — |
| [CASE-014](phase-02-netsuite-tba/CASE-014.md) | SessionStore credentials stored as plaintext strings in RAM dict | MEDIUM | ARCH_VIOLATION | OPEN | — | — |
| [CASE-015](phase-02-netsuite-tba/CASE-015.md) | Commented-out credential blocks in sdf_utils.py | LOW | DEAD_CODE | OPEN | — | — |
| [CASE-016](phase-02-netsuite-tba/CASE-016.md) | Dead test stub code in suitescripts_utils.py __main__ block | LOW | DEAD_CODE | OPEN | — | — |
| [CASE-017](phase-02-netsuite-tba/CASE-017.md) | Unused 're' import in finetunedmodelrunv2.py | LOW | DEAD_CODE | OPEN | — | — |
| [CASE-071](phase-02-netsuite-tba/CASE-071.md) | POST /api/netsuite/authenticate returns 200 for valid TBA credentials | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-072](phase-02-netsuite-tba/CASE-072.md) | POST /api/netsuite/authenticate returns 401 for wrong consumer key | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-073](phase-02-netsuite-tba/CASE-073.md) | POST /api/netsuite/authenticate returns 401 for wrong account ID | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-074](phase-02-netsuite-tba/CASE-074.md) | POST /api/netsuite/authenticate returns 422 for empty request body | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-075](phase-02-netsuite-tba/CASE-075.md) | POST /api/netsuite/authenticate returns 200 for sandbox account ID (_SB suffix) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-076](phase-02-netsuite-tba/CASE-076.md) | POST /api/netsuite/authenticate returns 200 for production account ID (no _SB suffix) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-077](phase-02-netsuite-tba/CASE-077.md) | Two authenticated users cannot see each other's TBA credentials (session isolation) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-078](phase-02-netsuite-tba/CASE-078.md) | POST /api/netsuite/logout removes all TBA credentials from session store | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-079](phase-02-netsuite-tba/CASE-079.md) | GET /api/netsuite/status returns 401 for expired JWT | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-080](phase-02-netsuite-tba/CASE-080.md) | POST /api/deploy/suitescript returns 401 when no TBA session exists | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-081](phase-02-netsuite-tba/CASE-081.md) | GET /api/netsuite/status returns authenticated:false when no session exists | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-082](phase-02-netsuite-tba/CASE-082.md) | GET /api/netsuite/status returns 401 without Bearer token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-083](phase-02-netsuite-tba/CASE-083.md) | POST /api/netsuite/authenticate returns 401 without Bearer token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-084](phase-02-netsuite-tba/CASE-084.md) | POST /api/deploy/suitescript returns 401 without Bearer token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-085](phase-02-netsuite-tba/CASE-085.md) | TBA credentials are never written to SQLite database | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-086](phase-02-netsuite-tba/CASE-086.md) | GET /api/health includes suitecloud_ready field | INFO | FEATURE_TEST | PASS | — | — |

## Phase 03 — Ollama RAG Pipeline

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-018](phase-03-ollama-rag/CASE-018.md) | Ollama base URL duplicated across 3 production files (not centralized) | LOW | HARDCODED | OPEN | — | — |
| [CASE-019](phase-03-ollama-rag/CASE-019.md) | Ollama model names hardcoded — no startup warning if wrong model pulled | LOW | HARDCODED | OPEN | — | — |
| [CASE-020](phase-03-ollama-rag/CASE-020.md) | No rate limit on /api/chatbot/process — DoS vector | HIGH | ARCH_VIOLATION | OPEN | — | — |
| [CASE-021](phase-03-ollama-rag/CASE-021.md) | Chat response latency_ms missing on early-return paths | LOW | API_CORRECTNESS | OPEN | — | — |
| [CASE-090](phase-03-ollama-rag/CASE-090.md) | POST /api/chat returns 200 with Ollama mocked response | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-091](phase-03-ollama-rag/CASE-091.md) | POST /api/chat reads 'message' field from request body | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-092](phase-03-ollama-rag/CASE-092.md) | POST /api/chat returns session_id in response for chat history tracking | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-131](phase-03-ollama-rag/CASE-131.md) | POST /api/chat injects FAISS-retrieved context into Ollama prompt | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-132](phase-03-ollama-rag/CASE-132.md) | FAISS vectorstore survives container restart (persisted to /app/data/vectorstore_ollama) | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-133](phase-03-ollama-rag/CASE-133.md) | SuiteScript files are chunked and embedded into FAISS on /api/deploy/suitescript | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-134](phase-03-ollama-rag/CASE-134.md) | POST /api/chat messages are persisted to ChatMessage table and retrievable | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-135](phase-03-ollama-rag/CASE-135.md) | App startup validates that llama3.1:8b model is available in Ollama | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-136](phase-03-ollama-rag/CASE-136.md) | System raises clear error when FAISS index dimension (768) doesn't match new embedding dim | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-137](phase-03-ollama-rag/CASE-137.md) | GET /api/netsuite/ingest populates FAISS with NetSuite record embeddings | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-138](phase-03-ollama-rag/CASE-138.md) | GET /api/chats/{id}/messages returns messages in chronological order | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-139](phase-03-ollama-rag/CASE-139.md) | Two users chatting simultaneously don't interfere with each other's context | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-140](phase-03-ollama-rag/CASE-140.md) | POST /api/chat is rate-limited to prevent LLM abuse | LOW | FEATURE_TEST | PENDING | — | — |

## Phase 04 — Frontend Integration

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-022](phase-04-frontend-integration/CASE-022.md) | Frontend base URL hardcoded fallback to localhost:5173 in multiple backend files | LOW | HARDCODED | OPEN | — | — |
| [CASE-023](phase-04-frontend-integration/CASE-023.md) | CORS dev port range hardcoded (5173-5180) not in env var | LOW | HARDCODED | OPEN | — | — |
| [CASE-024](phase-04-frontend-integration/CASE-024.md) | Token refresh response missing role — inconsistent with login response | MEDIUM | API_CORRECTNESS | OPEN | — | — |
| [CASE-025](phase-04-frontend-integration/CASE-025.md) | _persist_chat_to_db() silently swallows DB failures — client unaware | MEDIUM | ARCH_VIOLATION | OPEN | — | — |
| [CASE-026](phase-04-frontend-integration/CASE-026.md) | Chat response schema inconsistent — latency_ms absent on non-AI paths | LOW | API_CORRECTNESS | OPEN | — | — |
| [CASE-141](phase-04-frontend-integration/CASE-141.md) | Frontend Password.tsx calls /api/auth/check-user then /api/auth/login correctly | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-142](phase-04-frontend-integration/CASE-142.md) | Frontend stores access_token in memory only (never localStorage/sessionStorage) | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-143](phase-04-frontend-integration/CASE-143.md) | Frontend NetSuiteConnectPanel sends all 5 TBA fields to /api/netsuite/authenticate | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-144](phase-04-frontend-integration/CASE-144.md) | Frontend connection status indicator reflects {authenticated: true/false} from /api/netsuite/status | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-145](phase-04-frontend-integration/CASE-145.md) | Frontend deploy button sends POST /api/deploy/suitescript with correct payload | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-146](phase-04-frontend-integration/CASE-146.md) | Frontend chat sends POST /api/chat with {message: text, session_id: id} | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-147](phase-04-frontend-integration/CASE-147.md) | Frontend automatically refreshes access_token using refresh_token when 401 received | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-148](phase-04-frontend-integration/CASE-148.md) | Frontend redirects to login page when refresh token is also expired | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-149](phase-04-frontend-integration/CASE-149.md) | Frontend loads existing chat sessions from GET /api/chats on mount | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-150](phase-04-frontend-integration/CASE-150.md) | Frontend admin team management page shows members from GET /api/admin/team | LOW | FEATURE_TEST | PENDING | — | — |

## Phase 05 — Docker & Terraform

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-027](phase-05-docker-terraform/CASE-027.md) | No test coverage for Docker build or Terraform plan correctness | LOW | TEST_GAP | OPEN | — | — |
| [CASE-151](phase-05-docker-terraform/CASE-151.md) | docker compose up starts all 4 services (backend, frontend, ollama, nginx) successfully | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-152](phase-05-docker-terraform/CASE-152.md) | Nginx routes /api/* to backend:8000 and /* to frontend:5173 | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-153](phase-05-docker-terraform/CASE-153.md) | SQLite DB and FAISS vectorstore survive Docker Compose restart | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-154](phase-05-docker-terraform/CASE-154.md) | Ollama container has llama3.1:8b and nomic-embed-text models pulled on startup | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-155](phase-05-docker-terraform/CASE-155.md) | Terraform plan creates VPC, EC2, security groups without errors | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-156](phase-05-docker-terraform/CASE-156.md) | Docker Compose passes all required env vars (JWT_SECRET_KEY, DB path) to backend | LOW | FEATURE_TEST | PENDING | — | — |

## Phase 06 — Testing & Hardening

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-028](phase-06-testing-hardening/CASE-028.md) | No test for 404 on non-existent chat session GET | LOW | TEST_GAP | OPEN | — | — |
| [CASE-029](phase-06-testing-hardening/CASE-029.md) | No Alembic migration smoke test — only schema tests via create_all | MEDIUM | TEST_GAP | OPEN | — | — |
| [CASE-124](phase-06-testing-hardening/CASE-124.md) | POST /api/auth/check-user response never includes user_id (enumeration prevention) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-125](phase-06-testing-hardening/CASE-125.md) | POST /api/auth/login returns identical error for wrong password vs unknown email | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-126](phase-06-testing-hardening/CASE-126.md) | POST /api/auth/forgot-password returns identical 200 for known vs unknown email | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-127](phase-06-testing-hardening/CASE-127.md) | No hardcoded OpenAI API keys found in Python source files under src/ | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-128](phase-06-testing-hardening/CASE-128.md) | All auth endpoints have @limiter.limit decorator applied | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-129](phase-06-testing-hardening/CASE-129.md) | JWT_SECRET_KEY is not a known weak default value | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-130](phase-06-testing-hardening/CASE-130.md) | CORS is not configured with wildcard origin and credentials=True simultaneously | INFO | FEATURE_TEST | PASS | — | — |

## Phase 07 — License System

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-030](phase-07-license-system/CASE-030.md) | /api/license/status requires no auth — leaks license state publicly | MEDIUM | ARCH_VIOLATION | OPEN | — | — |
| [CASE-031](phase-07-license-system/CASE-031.md) | /health endpoint leaks ai_ready + suitecloud_ready + license_plan unauthenticated | MEDIUM | ARCH_VIOLATION | OPEN | — | — |
| [CASE-032](phase-07-license-system/CASE-032.md) | SALES_EMAIL hardcoded to sales@techcloudpro.com — wrong for other deployments | LOW | HARDCODED | OPEN | — | — |
| [CASE-033](phase-07-license-system/CASE-033.md) | LICENSE_SERVER_URL hardcoded domain in env fallback | LOW | HARDCODED | OPEN | — | — |
| [CASE-034](phase-07-license-system/CASE-034.md) | GRACE_PERIOD_HOURS hardcoded to 72 — not configurable | LOW | HARDCODED | OPEN | — | — |
| [CASE-035](phase-07-license-system/CASE-035.md) | CACHE_TTL_DAYS hardcoded to 7 — not configurable | LOW | HARDCODED | OPEN | — | — |
| [CASE-157](phase-07-license-system/CASE-157.md) | POST /api/license/validate returns 200 for valid license key | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-158](phase-07-license-system/CASE-158.md) | POST /api/license/validate returns 403 for invalid/expired license key | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-159](phase-07-license-system/CASE-159.md) | POST /api/license/validate returns 422 for malformed license key | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-160](phase-07-license-system/CASE-160.md) | POST /api/license/validate handles license server timeout gracefully | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-161](phase-07-license-system/CASE-161.md) | Valid license response includes expiry_date, plan_type, and seat_count | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-162](phase-07-license-system/CASE-162.md) | Expired license prevents access to chat and NetSuite features | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-163](phase-07-license-system/CASE-163.md) | Registering more users than seat_count fails with 402 | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-164](phase-07-license-system/CASE-164.md) | GET /api/health includes license_valid field | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-165](phase-07-license-system/CASE-165.md) | POST /api/license/refresh re-validates license against license server | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-166](phase-07-license-system/CASE-166.md) | Valid license is cached locally to survive brief license server outages | LOW | FEATURE_TEST | PENDING | — | — |

## Phase 07.1 — Frontend Section Verification

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-036](phase-07.1-frontend-verification/CASE-036.md) | Auto-index credentials dict key mismatch — _index_customer_netsuite may fail silently | MEDIUM | PHASE_CORRECTNESS | OPEN | — | — |

## Phase 08 — Launch Readiness

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-167](phase-08-launch-readiness/CASE-167.md) | Smoke test suite covers all 6 critical API paths in production config | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-168](phase-08-launch-readiness/CASE-168.md) | Docker image build uses multi-stage build to minimize production image size | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-169](phase-08-launch-readiness/CASE-169.md) | JWT_SECRET_KEY rotation invalidates old tokens gracefully | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-170](phase-08-launch-readiness/CASE-170.md) | SQLite DB backup script can restore DB and pass health check | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-171](phase-08-launch-readiness/CASE-171.md) | CloudWatch alarm fires when /api/health returns non-200 for 3 consecutive minutes | LOW | FEATURE_TEST | PENDING | — | — |
| [CASE-172](phase-08-launch-readiness/CASE-172.md) | System handles 50 concurrent requests to /api/chat within 5 second p99 | LOW | FEATURE_TEST | PENDING | — | — |

## Phase 09 — RBAC & Team Management

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-037](phase-09-rbac-team-chat/CASE-037.md) | No cross-team isolation test for admin endpoints | MEDIUM | TEST_GAP | OPEN | — | — |
| [CASE-038](phase-09-rbac-team-chat/CASE-038.md) | No test for admin self-removal 400 response | LOW | TEST_GAP | OPEN | — | — |
| [CASE-039](phase-09-rbac-team-chat/CASE-039.md) | No deploy quota enforcement test (402 response) | MEDIUM | TEST_GAP | OPEN | — | — |
| [CASE-040](phase-09-rbac-team-chat/CASE-040.md) | Team member list does not explicitly verify team_id ownership | LOW | ARCH_VIOLATION | OPEN | — | — |
| [CASE-093](phase-09-rbac-team-chat/CASE-093.md) | POST /api/chats returns 201 with id, title, created_at | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-094](phase-09-rbac-team-chat/CASE-094.md) | POST /api/chats without title defaults to 'New Chat' | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-095](phase-09-rbac-team-chat/CASE-095.md) | GET /api/chats returns empty list for user with no sessions | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-096](phase-09-rbac-team-chat/CASE-096.md) | GET /api/chats returns all sessions belonging to the authenticated user | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-097](phase-09-rbac-team-chat/CASE-097.md) | GET /api/chats does not return another user's sessions (isolation) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-098](phase-09-rbac-team-chat/CASE-098.md) | GET /api/chats/{id}/messages returns empty list for new session | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-099](phase-09-rbac-team-chat/CASE-099.md) | GET /api/chats/{id}/messages returns saved messages with role and content | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-100](phase-09-rbac-team-chat/CASE-100.md) | PATCH /api/chats/{id} updates session title | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-101](phase-09-rbac-team-chat/CASE-101.md) | DELETE /api/chats/{id} removes session and returns 204 | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-102](phase-09-rbac-team-chat/CASE-102.md) | GET /api/chats/{id}/messages returns 403 when session belongs to another user | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-103](phase-09-rbac-team-chat/CASE-103.md) | PATCH /api/chats/{id} returns 403 when renaming another user's session | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-104](phase-09-rbac-team-chat/CASE-104.md) | DELETE /api/chats/{id} returns 403 when deleting another user's session | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-105](phase-09-rbac-team-chat/CASE-105.md) | GET /api/chats returns 401 or 403 without Bearer token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-106](phase-09-rbac-team-chat/CASE-106.md) | POST /api/chats returns 401 or 403 without Bearer token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-107](phase-09-rbac-team-chat/CASE-107.md) | GET /api/admin/team returns team member list for admin (200) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-108](phase-09-rbac-team-chat/CASE-108.md) | POST /api/admin/invite creates an invitation record in DB | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-109](phase-09-rbac-team-chat/CASE-109.md) | POST /api/admin/invite returns 403 for non-admin user | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-110](phase-09-rbac-team-chat/CASE-110.md) | GET /api/admin/chats is accessible to admin and returns team chat sessions | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-111](phase-09-rbac-team-chat/CASE-111.md) | GET /api/admin/chats returns 403 for non-admin user | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-112](phase-09-rbac-team-chat/CASE-112.md) | DELETE /api/admin/team/{id} removes team member (endpoint exists and returns 2xx) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-113](phase-09-rbac-team-chat/CASE-113.md) | First user registered in empty DB automatically receives role='admin' | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-114](phase-09-rbac-team-chat/CASE-114.md) | Second registered user receives role='user' (not admin) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-115](phase-09-rbac-team-chat/CASE-115.md) | Login response includes 'role' field for admin user | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-116](phase-09-rbac-team-chat/CASE-116.md) | Admin user can access GET /api/admin/team (200) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-117](phase-09-rbac-team-chat/CASE-117.md) | Non-admin user receives 403 on admin endpoints | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-118](phase-09-rbac-team-chat/CASE-118.md) | Unauthenticated request to admin endpoint returns 401 or 403 | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-119](phase-09-rbac-team-chat/CASE-119.md) | Admin JWT payload includes role='admin' claim | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-120](phase-09-rbac-team-chat/CASE-120.md) | JWT payload includes 'jti' claim (JWT ID for blacklist support) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-121](phase-09-rbac-team-chat/CASE-121.md) | POST /api/auth/logout returns 200 with Bearer token | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-122](phase-09-rbac-team-chat/CASE-122.md) | Token cannot be used after logout (blacklist enforced) | INFO | FEATURE_TEST | PASS | — | — |
| [CASE-123](phase-09-rbac-team-chat/CASE-123.md) | POST /api/auth/logout without Bearer token returns 401 | INFO | FEATURE_TEST | PASS | — | — |

## Phase 10 — Admin Panel

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-173](phase-10-admin-panel/CASE-173.md) | GET /api/admin/stats returns total_users, total_chats, active_sessions | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-174](phase-10-admin-panel/CASE-174.md) | GET /api/admin/users returns all users with role and team assignment | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-175](phase-10-admin-panel/CASE-175.md) | PATCH /api/admin/users/{id}/role changes user role (admin/user) | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-176](phase-10-admin-panel/CASE-176.md) | DELETE /api/admin/users/{id} deactivates (soft-deletes) a user | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-177](phase-10-admin-panel/CASE-177.md) | GET /api/admin/audit returns recent admin actions with timestamp and actor | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-178](phase-10-admin-panel/CASE-178.md) | PUT /api/admin/config updates system settings (e.g., max_chat_history) | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-179](phase-10-admin-panel/CASE-179.md) | GET /api/admin/license shows current license status and expiry | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-180](phase-10-admin-panel/CASE-180.md) | POST /api/admin/teams creates a new team with name and assigns admin | LOW | FEATURE_TEST | DONE | — | — |

## Phase 11 — Password Management

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-181](phase-11-password-management/CASE-181.md) | POST /api/user/change-password validates old password before updating to new | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-182](phase-11-password-management/CASE-182.md) | Password change rejects new password matching any of last 5 passwords | LOW | FEATURE_TEST | DEFERRED | — | — |
| [CASE-183](phase-11-password-management/CASE-183.md) | Users with password older than 90 days receive 403 with 'password expired' error | LOW | FEATURE_TEST | DEFERRED | — | — |
| [CASE-184](phase-11-password-management/CASE-184.md) | DELETE /api/user/me deletes account and invalidates all tokens | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-185](phase-11-password-management/CASE-185.md) | POST /api/user/resend-verification resends email verification link | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-186](phase-11-password-management/CASE-186.md) | Unverified users cannot access chat or NetSuite endpoints (403) | LOW | FEATURE_TEST | DONE | — | — |
| [CASE-187](phase-11-password-management/CASE-187.md) | PATCH /api/user/me updates first_name and last_name in DB | LOW | FEATURE_TEST | DONE | — | — |

## Phase 12 — Security & SOC2

| ID | Title | Severity | Category | Status | Blocks | Blocked By |
|----|-------|----------|----------|--------|--------|------------|
| [CASE-188](phase-12-security-soc2/CASE-188.md) | All HTTP requests are redirected to HTTPS in production (Nginx redirect) | MEDIUM | FEATURE_TEST | PENDING | — | — |
| [CASE-189](phase-12-security-soc2/CASE-189.md) | All responses include HSTS, X-Content-Type-Options, X-Frame-Options headers | MEDIUM | FEATURE_TEST | PENDING | — | — |
| [CASE-190](phase-12-security-soc2/CASE-190.md) | State-changing endpoints (POST/PATCH/DELETE) are protected against CSRF | MEDIUM | FEATURE_TEST | PENDING | — | — |
| [CASE-191](phase-12-security-soc2/CASE-191.md) | pip-audit finds no CRITICAL or HIGH vulnerabilities in dependencies | MEDIUM | FEATURE_TEST | PENDING | — | — |
| [CASE-192](phase-12-security-soc2/CASE-192.md) | All admin actions are written to immutable audit log with timestamp, actor, action | MEDIUM | FEATURE_TEST | PENDING | — | — |
| [CASE-193](phase-12-security-soc2/CASE-193.md) | SQLite DB file is encrypted at rest (or mounted from encrypted EBS volume) | MEDIUM | FEATURE_TEST | PENDING | — | — |
| [CASE-194](phase-12-security-soc2/CASE-194.md) | OWASP ZAP scan on staging returns no HIGH or CRITICAL findings | MEDIUM | FEATURE_TEST | PENDING | — | — |
| [CASE-195](phase-12-security-soc2/CASE-195.md) | Nginx is configured to use only TLS 1.2+ and strong cipher suites | MEDIUM | FEATURE_TEST | PENDING | — | — |

## Pending (Feature Tests)

| ID | Title | Severity | Category | Feature | Test Ref |
|----|-------|----------|----------|---------|---------|
| [CASE-131](phase-03-ollama-rag/CASE-131.md) | POST /api/chat injects FAISS-retrieved context into Ollama prompt | LOW | FEATURE_TEST | RAG pipeline (context injection) |  |
| [CASE-132](phase-03-ollama-rag/CASE-132.md) | FAISS vectorstore survives container restart (persisted to /app/data/vectorstore_ollama) | LOW | FEATURE_TEST | FAISS persistence |  |
| [CASE-133](phase-03-ollama-rag/CASE-133.md) | SuiteScript files are chunked and embedded into FAISS on /api/deploy/suitescript | LOW | FEATURE_TEST | SuiteScript → FAISS embedding |  |
| [CASE-134](phase-03-ollama-rag/CASE-134.md) | POST /api/chat messages are persisted to ChatMessage table and retrievable | LOW | FEATURE_TEST | Chat message persistence |  |
| [CASE-135](phase-03-ollama-rag/CASE-135.md) | App startup validates that llama3.1:8b model is available in Ollama | LOW | FEATURE_TEST | Ollama model startup check |  |
| [CASE-136](phase-03-ollama-rag/CASE-136.md) | System raises clear error when FAISS index dimension (768) doesn't match new embedding dim | LOW | FEATURE_TEST | FAISS dimension guard |  |
| [CASE-137](phase-03-ollama-rag/CASE-137.md) | GET /api/netsuite/ingest populates FAISS with NetSuite record embeddings | LOW | FEATURE_TEST | NetSuite → FAISS ingestion |  |
| [CASE-138](phase-03-ollama-rag/CASE-138.md) | GET /api/chats/{id}/messages returns messages in chronological order | LOW | FEATURE_TEST | Chat message ordering |  |
| [CASE-139](phase-03-ollama-rag/CASE-139.md) | Two users chatting simultaneously don't interfere with each other's context | LOW | FEATURE_TEST | Chat session isolation |  |
| [CASE-140](phase-03-ollama-rag/CASE-140.md) | POST /api/chat is rate-limited to prevent LLM abuse | LOW | FEATURE_TEST | POST /api/chat (rate limiting) |  |
| [CASE-141](phase-04-frontend-integration/CASE-141.md) | Frontend Password.tsx calls /api/auth/check-user then /api/auth/login correctly | LOW | FEATURE_TEST | Frontend login flow |  |
| [CASE-142](phase-04-frontend-integration/CASE-142.md) | Frontend stores access_token in memory only (never localStorage/sessionStorage) | LOW | FEATURE_TEST | Frontend token storage security |  |
| [CASE-143](phase-04-frontend-integration/CASE-143.md) | Frontend NetSuiteConnectPanel sends all 5 TBA fields to /api/netsuite/authenticate | LOW | FEATURE_TEST | Frontend NetSuite connection |  |
| [CASE-144](phase-04-frontend-integration/CASE-144.md) | Frontend connection status indicator reflects {authenticated: true/false} from /api/netsuite/status | LOW | FEATURE_TEST | Frontend status indicator |  |
| [CASE-145](phase-04-frontend-integration/CASE-145.md) | Frontend deploy button sends POST /api/deploy/suitescript with correct payload | LOW | FEATURE_TEST | Frontend SuiteScript deploy |  |
| [CASE-146](phase-04-frontend-integration/CASE-146.md) | Frontend chat sends POST /api/chat with {message: text, session_id: id} | LOW | FEATURE_TEST | Frontend chat message send |  |
| [CASE-147](phase-04-frontend-integration/CASE-147.md) | Frontend automatically refreshes access_token using refresh_token when 401 received | LOW | FEATURE_TEST | Frontend token refresh |  |
| [CASE-148](phase-04-frontend-integration/CASE-148.md) | Frontend redirects to login page when refresh token is also expired | LOW | FEATURE_TEST | Frontend auth expiry handling |  |
| [CASE-149](phase-04-frontend-integration/CASE-149.md) | Frontend loads existing chat sessions from GET /api/chats on mount | LOW | FEATURE_TEST | Frontend chat history loading |  |
| [CASE-150](phase-04-frontend-integration/CASE-150.md) | Frontend admin team management page shows members from GET /api/admin/team | LOW | FEATURE_TEST | Frontend admin UI |  |
| [CASE-151](phase-05-docker-terraform/CASE-151.md) | docker compose up starts all 4 services (backend, frontend, ollama, nginx) successfully | LOW | FEATURE_TEST | Docker Compose startup |  |
| [CASE-152](phase-05-docker-terraform/CASE-152.md) | Nginx routes /api/* to backend:8000 and /* to frontend:5173 | LOW | FEATURE_TEST | Nginx routing |  |
| [CASE-153](phase-05-docker-terraform/CASE-153.md) | SQLite DB and FAISS vectorstore survive Docker Compose restart | LOW | FEATURE_TEST | Docker volume persistence |  |
| [CASE-154](phase-05-docker-terraform/CASE-154.md) | Ollama container has llama3.1:8b and nomic-embed-text models pulled on startup | LOW | FEATURE_TEST | Ollama model availability |  |
| [CASE-155](phase-05-docker-terraform/CASE-155.md) | Terraform plan creates VPC, EC2, security groups without errors | LOW | FEATURE_TEST | Terraform infrastructure |  |
| [CASE-156](phase-05-docker-terraform/CASE-156.md) | Docker Compose passes all required env vars (JWT_SECRET_KEY, DB path) to backend | LOW | FEATURE_TEST | Docker env var injection |  |
| [CASE-157](phase-07-license-system/CASE-157.md) | POST /api/license/validate returns 200 for valid license key | LOW | FEATURE_TEST | POST /api/license/validate |  |
| [CASE-158](phase-07-license-system/CASE-158.md) | POST /api/license/validate returns 403 for invalid/expired license key | LOW | FEATURE_TEST | POST /api/license/validate (invalid key) |  |
| [CASE-159](phase-07-license-system/CASE-159.md) | POST /api/license/validate returns 422 for malformed license key | LOW | FEATURE_TEST | POST /api/license/validate (format check) |  |
| [CASE-160](phase-07-license-system/CASE-160.md) | POST /api/license/validate handles license server timeout gracefully | LOW | FEATURE_TEST | POST /api/license/validate (timeout handling) |  |
| [CASE-161](phase-07-license-system/CASE-161.md) | Valid license response includes expiry_date, plan_type, and seat_count | LOW | FEATURE_TEST | License metadata |  |
| [CASE-162](phase-07-license-system/CASE-162.md) | Expired license prevents access to chat and NetSuite features | LOW | FEATURE_TEST | License expiry enforcement |  |
| [CASE-163](phase-07-license-system/CASE-163.md) | Registering more users than seat_count fails with 402 | LOW | FEATURE_TEST | License seat enforcement |  |
| [CASE-164](phase-07-license-system/CASE-164.md) | GET /api/health includes license_valid field | LOW | FEATURE_TEST | License status in health check |  |
| [CASE-165](phase-07-license-system/CASE-165.md) | POST /api/license/refresh re-validates license against license server | LOW | FEATURE_TEST | License refresh |  |
| [CASE-166](phase-07-license-system/CASE-166.md) | Valid license is cached locally to survive brief license server outages | LOW | FEATURE_TEST | License caching |  |
| [CASE-167](phase-08-launch-readiness/CASE-167.md) | Smoke test suite covers all 6 critical API paths in production config | LOW | FEATURE_TEST | Smoke test suite |  |
| [CASE-168](phase-08-launch-readiness/CASE-168.md) | Docker image build uses multi-stage build to minimize production image size | LOW | FEATURE_TEST | Docker image optimization |  |
| [CASE-169](phase-08-launch-readiness/CASE-169.md) | JWT_SECRET_KEY rotation invalidates old tokens gracefully | LOW | FEATURE_TEST | Secret rotation |  |
| [CASE-170](phase-08-launch-readiness/CASE-170.md) | SQLite DB backup script can restore DB and pass health check | LOW | FEATURE_TEST | DB backup/restore |  |
| [CASE-171](phase-08-launch-readiness/CASE-171.md) | CloudWatch alarm fires when /api/health returns non-200 for 3 consecutive minutes | LOW | FEATURE_TEST | CloudWatch monitoring |  |
| [CASE-172](phase-08-launch-readiness/CASE-172.md) | System handles 50 concurrent requests to /api/chat within 5 second p99 | LOW | FEATURE_TEST | Load test baseline |  |
| [CASE-188](phase-12-security-soc2/CASE-188.md) | All HTTP requests are redirected to HTTPS in production (Nginx redirect) | MEDIUM | FEATURE_TEST | HTTPS redirect |  |
| [CASE-189](phase-12-security-soc2/CASE-189.md) | All responses include HSTS, X-Content-Type-Options, X-Frame-Options headers | MEDIUM | FEATURE_TEST | Security headers |  |
| [CASE-190](phase-12-security-soc2/CASE-190.md) | State-changing endpoints (POST/PATCH/DELETE) are protected against CSRF | MEDIUM | FEATURE_TEST | CSRF protection |  |
| [CASE-191](phase-12-security-soc2/CASE-191.md) | pip-audit finds no CRITICAL or HIGH vulnerabilities in dependencies | MEDIUM | FEATURE_TEST | Dependency vulnerability scan |  |
| [CASE-192](phase-12-security-soc2/CASE-192.md) | All admin actions are written to immutable audit log with timestamp, actor, action | MEDIUM | FEATURE_TEST | SOC2 audit logging |  |
| [CASE-193](phase-12-security-soc2/CASE-193.md) | SQLite DB file is encrypted at rest (or mounted from encrypted EBS volume) | MEDIUM | FEATURE_TEST | Data at rest encryption |  |
| [CASE-194](phase-12-security-soc2/CASE-194.md) | OWASP ZAP scan on staging returns no HIGH or CRITICAL findings | MEDIUM | FEATURE_TEST | OWASP ZAP scan |  |
| [CASE-195](phase-12-security-soc2/CASE-195.md) | Nginx is configured to use only TLS 1.2+ and strong cipher suites | MEDIUM | FEATURE_TEST | TLS hardening |  |

## Pass (Feature Tests)

| ID | Title | Severity | Category | Feature | Test Ref |
|----|-------|----------|----------|---------|---------|
| [CASE-041](phase-01-foundation-auth/CASE-041.md) | POST /api/auth/check-user returns {success:true} for known email | INFO | FEATURE_TEST | POST /api/auth/check-user | tests/test_auth.py::test_check_user_known_email |
| [CASE-042](phase-01-foundation-auth/CASE-042.md) | POST /api/auth/check-user returns {success:false} for unknown email | INFO | FEATURE_TEST | POST /api/auth/check-user | tests/test_auth.py::test_check_user_unknown_email |
| [CASE-043](phase-01-foundation-auth/CASE-043.md) | POST /api/auth/check-user returns 422 for malformed email | INFO | FEATURE_TEST | POST /api/auth/check-user | tests/test_auth.py::test_check_user_malformed_email_returns_422 |
| [CASE-044](phase-01-foundation-auth/CASE-044.md) | POST /api/auth/login returns 200 with access and refresh tokens for valid credentials | INFO | FEATURE_TEST | POST /api/auth/login | tests/test_auth.py::test_login_valid_credentials |
| [CASE-045](phase-01-foundation-auth/CASE-045.md) | POST /api/auth/login returns 401 with generic error for wrong password | INFO | FEATURE_TEST | POST /api/auth/login | tests/test_auth.py::test_login_wrong_password |
| [CASE-046](phase-01-foundation-auth/CASE-046.md) | POST /api/auth/login returns identical 401 for unknown email and wrong password (no enumeration) | INFO | FEATURE_TEST | POST /api/auth/login | tests/test_auth.py::test_login_unknown_email_same_error_as_wrong_password |
| [CASE-047](phase-01-foundation-auth/CASE-047.md) | POST /api/auth/login triggers 429 after 5 consecutive wrong passwords | INFO | FEATURE_TEST | POST /api/auth/login (lockout) | tests/test_auth.py::test_login_lockout_after_5_failures |
| [CASE-048](phase-01-foundation-auth/CASE-048.md) | POST /api/auth/login rejects SQL injection attempts (401 or 422) | INFO | FEATURE_TEST | POST /api/auth/login (SQL injection prevention) | tests/test_auth.py::test_login_sql_injection_sanitized |
| [CASE-049](phase-01-foundation-auth/CASE-049.md) | POST /api/auth/forgot-password returns 200 for registered email | INFO | FEATURE_TEST | POST /api/auth/forgot-password | tests/test_auth.py::test_forgot_password_known_email_returns_200 |
| [CASE-050](phase-01-foundation-auth/CASE-050.md) | POST /api/auth/forgot-password returns identical 200 for unknown email (no enumeration) | INFO | FEATURE_TEST | POST /api/auth/forgot-password (anti-enumeration) | tests/test_auth.py::test_forgot_password_unknown_email_same_response |
| [CASE-051](phase-01-foundation-auth/CASE-051.md) | POST /api/auth/forgot-password persists PasswordResetToken to DB | INFO | FEATURE_TEST | POST /api/auth/forgot-password (DB persistence) | tests/test_auth.py::test_forgot_password_creates_token_in_db |
| [CASE-052](phase-01-foundation-auth/CASE-052.md) | Second POST /api/auth/forgot-password invalidates all previous unused tokens | INFO | FEATURE_TEST | POST /api/auth/forgot-password (token invalidation) | tests/test_auth.py::test_forgot_password_invalidates_old_tokens |
| [CASE-053](phase-01-foundation-auth/CASE-053.md) | POST /api/auth/reset-password updates password for valid token | INFO | FEATURE_TEST | POST /api/auth/reset-password | tests/test_auth.py::test_reset_password_valid_token |
| [CASE-054](phase-01-foundation-auth/CASE-054.md) | POST /api/auth/reset-password marks token used=True in DB after success | INFO | FEATURE_TEST | POST /api/auth/reset-password (one-time use) | tests/test_auth.py::test_reset_password_marks_token_used |
| [CASE-055](phase-01-foundation-auth/CASE-055.md) | POST /api/auth/reset-password returns 400 for already-used token | INFO | FEATURE_TEST | POST /api/auth/reset-password (one-time use guard) | tests/test_auth.py::test_reset_password_already_used_token |
| [CASE-056](phase-01-foundation-auth/CASE-056.md) | POST /api/auth/reset-password returns 400 for expired token (Link expired) | INFO | FEATURE_TEST | POST /api/auth/reset-password (expiry check) | tests/test_auth.py::test_reset_password_expired_token |
| [CASE-057](phase-01-foundation-auth/CASE-057.md) | POST /api/auth/reset-password returns 400 for fake/unknown token | INFO | FEATURE_TEST | POST /api/auth/reset-password (DB miss) | tests/test_auth.py::test_reset_password_invalid_token |
| [CASE-058](phase-01-foundation-auth/CASE-058.md) | POST /api/auth/reset-password returns 400 for weak new password | INFO | FEATURE_TEST | POST /api/auth/reset-password (password policy) | tests/test_auth.py::test_reset_password_weak_new_password |
| [CASE-059](phase-01-foundation-auth/CASE-059.md) | After reset, user can log in with new password (E2E reset flow) | INFO | FEATURE_TEST | POST /api/auth/reset-password (E2E) | tests/test_auth.py::test_reset_password_can_login_with_new_password |
| [CASE-060](phase-01-foundation-auth/CASE-060.md) | POST /api/auth/refresh returns new access token for valid refresh token | INFO | FEATURE_TEST | POST /api/auth/refresh | tests/test_auth.py::test_refresh_valid_token |
| [CASE-061](phase-01-foundation-auth/CASE-061.md) | POST /api/auth/refresh returns 401 for expired refresh token | INFO | FEATURE_TEST | POST /api/auth/refresh (expiry check) | tests/test_auth.py::test_refresh_expired_token_returns_401 |
| [CASE-062](phase-01-foundation-auth/CASE-062.md) | POST /api/auth/refresh returns 401 for tampered/fake refresh token | INFO | FEATURE_TEST | POST /api/auth/refresh (signature verification) | tests/test_auth.py::test_refresh_tampered_token_returns_401 |
| [CASE-063](phase-01-foundation-auth/CASE-063.md) | POST /api/auth/refresh rejects access token used as refresh (wrong type) | INFO | FEATURE_TEST | POST /api/auth/refresh (token_type check) | tests/test_auth.py::test_refresh_access_token_as_refresh_rejected |
| [CASE-064](phase-01-foundation-auth/CASE-064.md) | POST /api/user/register returns 201 and confirmation message for valid user | INFO | FEATURE_TEST | POST /api/user/register | tests/test_user.py::test_register_valid_user |
| [CASE-065](phase-01-foundation-auth/CASE-065.md) | POST /api/user/register returns 409 for duplicate email | INFO | FEATURE_TEST | POST /api/user/register (duplicate guard) | tests/test_user.py::test_register_duplicate_email_returns_409 |
| [CASE-066](phase-01-foundation-auth/CASE-066.md) | POST /api/user/register returns 400 for weak password (no uppercase) | INFO | FEATURE_TEST | POST /api/user/register (password policy) | tests/test_user.py::test_register_weak_password_returns_400 |
| [CASE-067](phase-01-foundation-auth/CASE-067.md) | POST /api/user/register returns 422 when email field missing | INFO | FEATURE_TEST | POST /api/user/register (schema validation) | tests/test_user.py::test_register_missing_email_returns_422 |
| [CASE-068](phase-01-foundation-auth/CASE-068.md) | POST /api/user/register returns 422 for invalid email format | INFO | FEATURE_TEST | POST /api/user/register (EmailStr validation) | tests/test_user.py::test_register_invalid_email_format_returns_422 |
| [CASE-069](phase-01-foundation-auth/CASE-069.md) | POST /api/user/register returns 400 when password missing digit | INFO | FEATURE_TEST | POST /api/user/register (password policy — digit) | tests/test_user.py::test_register_password_no_number_returns_400 |
| [CASE-070](phase-01-foundation-auth/CASE-070.md) | POST /api/user/register returns 400 when password missing special character | INFO | FEATURE_TEST | POST /api/user/register (password policy — special char) | tests/test_user.py::test_register_password_no_special_char_returns_400 |
| [CASE-087](phase-01-foundation-auth/CASE-087.md) | GET /api/health returns 200 | INFO | FEATURE_TEST | GET /api/health | tests/test_health.py::test_health_returns_200 |
| [CASE-088](phase-01-foundation-auth/CASE-088.md) | GET /api/health returns {status:'ok'} response shape | INFO | FEATURE_TEST | GET /api/health (response shape) | tests/test_health.py::test_health_response_shape |
| [CASE-089](phase-01-foundation-auth/CASE-089.md) | App startup raises RuntimeError when JWT_SECRET_KEY env var is missing | INFO | FEATURE_TEST | App startup validation (JWT_SECRET_KEY) | tests/test_health.py::test_startup_fails_without_jwt_secret_key |
| [CASE-071](phase-02-netsuite-tba/CASE-071.md) | POST /api/netsuite/authenticate returns 200 for valid TBA credentials | INFO | FEATURE_TEST | POST /api/netsuite/authenticate | tests/test_netsuite.py::test_tc_ns_01_valid_credentials |
| [CASE-072](phase-02-netsuite-tba/CASE-072.md) | POST /api/netsuite/authenticate returns 401 for wrong consumer key | INFO | FEATURE_TEST | POST /api/netsuite/authenticate — credential rejection | tests/test_netsuite.py::test_tc_ns_02_wrong_consumer_key |
| [CASE-073](phase-02-netsuite-tba/CASE-073.md) | POST /api/netsuite/authenticate returns 401 for wrong account ID | INFO | FEATURE_TEST | POST /api/netsuite/authenticate — account ID rejection | tests/test_netsuite.py::test_tc_ns_03_wrong_account_id |
| [CASE-074](phase-02-netsuite-tba/CASE-074.md) | POST /api/netsuite/authenticate returns 422 for empty request body | INFO | FEATURE_TEST | POST /api/netsuite/authenticate — Pydantic validation | tests/test_netsuite.py::test_tc_ns_04_empty_fields |
| [CASE-075](phase-02-netsuite-tba/CASE-075.md) | POST /api/netsuite/authenticate returns 200 for sandbox account ID (_SB suffix) | INFO | FEATURE_TEST | POST /api/netsuite/authenticate — sandbox account support | tests/test_netsuite.py::test_tc_ns_05_sandbox_account |
| [CASE-076](phase-02-netsuite-tba/CASE-076.md) | POST /api/netsuite/authenticate returns 200 for production account ID (no _SB suffix) | INFO | FEATURE_TEST | POST /api/netsuite/authenticate — production account support | tests/test_netsuite.py::test_tc_ns_06_production_account |
| [CASE-077](phase-02-netsuite-tba/CASE-077.md) | Two authenticated users cannot see each other's TBA credentials (session isolation) | INFO | FEATURE_TEST | Session isolation in session_store.py | tests/test_netsuite.py::test_tc_ns_07_session_isolation |
| [CASE-078](phase-02-netsuite-tba/CASE-078.md) | POST /api/netsuite/logout removes all TBA credentials from session store | INFO | FEATURE_TEST | POST /api/netsuite/logout | tests/test_netsuite.py::test_tc_ns_08_logout_wipes_credentials |
| [CASE-079](phase-02-netsuite-tba/CASE-079.md) | GET /api/netsuite/status returns 401 for expired JWT | INFO | FEATURE_TEST | GET /api/netsuite/status (JWT expiry check) | tests/test_netsuite.py::test_tc_ns_09_expired_jwt_returns_401 |
| [CASE-080](phase-02-netsuite-tba/CASE-080.md) | POST /api/deploy/suitescript returns 401 when no TBA session exists | INFO | FEATURE_TEST | POST /api/deploy/suitescript (session check) | tests/test_netsuite.py::test_tc_ns_10_deploy_without_session_returns_401 |
| [CASE-081](phase-02-netsuite-tba/CASE-081.md) | GET /api/netsuite/status returns authenticated:false when no session exists | INFO | FEATURE_TEST | GET /api/netsuite/status (unauthenticated state) | tests/test_netsuite.py::test_status_when_not_connected |
| [CASE-082](phase-02-netsuite-tba/CASE-082.md) | GET /api/netsuite/status returns 401 without Bearer token | INFO | FEATURE_TEST | GET /api/netsuite/status (JWT required) | tests/test_netsuite.py::test_status_requires_auth |
| [CASE-083](phase-02-netsuite-tba/CASE-083.md) | POST /api/netsuite/authenticate returns 401 without Bearer token | INFO | FEATURE_TEST | POST /api/netsuite/authenticate (JWT required) | tests/test_netsuite.py::test_authenticate_requires_auth |
| [CASE-084](phase-02-netsuite-tba/CASE-084.md) | POST /api/deploy/suitescript returns 401 without Bearer token | INFO | FEATURE_TEST | POST /api/deploy/suitescript (JWT required) | tests/test_netsuite.py::test_deploy_requires_auth |
| [CASE-085](phase-02-netsuite-tba/CASE-085.md) | TBA credentials are never written to SQLite database | INFO | FEATURE_TEST | session_store.py (no-DB security invariant) | tests/test_netsuite.py::test_credentials_not_in_database |
| [CASE-086](phase-02-netsuite-tba/CASE-086.md) | GET /api/health includes suitecloud_ready field | INFO | FEATURE_TEST | GET /api/health (SuiteCloud readiness) | tests/test_netsuite.py::test_health_includes_suitecloud_ready |
| [CASE-090](phase-03-ollama-rag/CASE-090.md) | POST /api/chat returns 200 with Ollama mocked response | INFO | FEATURE_TEST | POST /api/chat (Ollama inference) | tests/test_health.py::test_chatbot_returns_200_with_ollama |
| [CASE-091](phase-03-ollama-rag/CASE-091.md) | POST /api/chat reads 'message' field from request body | INFO | FEATURE_TEST | POST /api/chat (request schema) | tests/test_health.py::test_chatbot_reads_message_field |
| [CASE-092](phase-03-ollama-rag/CASE-092.md) | POST /api/chat returns session_id in response for chat history tracking | INFO | FEATURE_TEST | POST /api/chat (session_id in response) | tests/test_health.py::test_chatbot_session_id_returned |
| [CASE-124](phase-06-testing-hardening/CASE-124.md) | POST /api/auth/check-user response never includes user_id (enumeration prevention) | INFO | FEATURE_TEST | POST /api/auth/check-user (anti-enumeration) | tests/test_security.py::test_no_user_id_in_check_user_response |
| [CASE-125](phase-06-testing-hardening/CASE-125.md) | POST /api/auth/login returns identical error for wrong password vs unknown email | INFO | FEATURE_TEST | POST /api/auth/login (anti-enumeration) | tests/test_security.py::test_login_no_enumeration |
| [CASE-126](phase-06-testing-hardening/CASE-126.md) | POST /api/auth/forgot-password returns identical 200 for known vs unknown email | INFO | FEATURE_TEST | POST /api/auth/forgot-password (anti-enumeration) | tests/test_security.py::test_forgot_password_no_enumeration |
| [CASE-127](phase-06-testing-hardening/CASE-127.md) | No hardcoded OpenAI API keys found in Python source files under src/ | INFO | FEATURE_TEST | No OpenAI keys in codebase | tests/test_security.py::test_no_hardcoded_openai_keys |
| [CASE-128](phase-06-testing-hardening/CASE-128.md) | All auth endpoints have @limiter.limit decorator applied | INFO | FEATURE_TEST | Rate limiting on auth endpoints | tests/test_security.py::test_rate_limit_decorator_on_all_auth_endpoints |
| [CASE-129](phase-06-testing-hardening/CASE-129.md) | JWT_SECRET_KEY is not a known weak default value | INFO | FEATURE_TEST | JWT secret strength check | tests/test_security.py::test_weak_jwt_default_not_present |
| [CASE-130](phase-06-testing-hardening/CASE-130.md) | CORS is not configured with wildcard origin and credentials=True simultaneously | INFO | FEATURE_TEST | CORS security (no wildcard + credentials) | tests/test_security.py::test_cors_not_wildcard_with_credentials |
| [CASE-093](phase-09-rbac-team-chat/CASE-093.md) | POST /api/chats returns 201 with id, title, created_at | INFO | FEATURE_TEST | Chat session creation | tests/test_chats.py::TestChatCRUD::test_create_chat_session |
| [CASE-094](phase-09-rbac-team-chat/CASE-094.md) | POST /api/chats without title defaults to 'New Chat' | INFO | FEATURE_TEST | Chat session default title | tests/test_chats.py::TestChatCRUD::test_create_chat_session_default_title |
| [CASE-095](phase-09-rbac-team-chat/CASE-095.md) | GET /api/chats returns empty list for user with no sessions | INFO | FEATURE_TEST | Chat session listing — empty state | tests/test_chats.py::TestChatCRUD::test_list_chats_empty |
| [CASE-096](phase-09-rbac-team-chat/CASE-096.md) | GET /api/chats returns all sessions belonging to the authenticated user | INFO | FEATURE_TEST | Chat session listing — own sessions | tests/test_chats.py::TestChatCRUD::test_list_chats_returns_own_sessions |
| [CASE-097](phase-09-rbac-team-chat/CASE-097.md) | GET /api/chats does not return another user's sessions (isolation) | INFO | FEATURE_TEST | Chat session listing — user isolation | tests/test_chats.py::TestChatCRUD::test_list_chats_only_own_isolation |
| [CASE-098](phase-09-rbac-team-chat/CASE-098.md) | GET /api/chats/{id}/messages returns empty list for new session | INFO | FEATURE_TEST | Chat message retrieval — empty state | tests/test_chats.py::TestChatCRUD::test_get_chat_messages_empty |
| [CASE-099](phase-09-rbac-team-chat/CASE-099.md) | GET /api/chats/{id}/messages returns saved messages with role and content | INFO | FEATURE_TEST | GET /api/chats/{id}/messages | tests/test_chats.py::TestChatCRUD::test_get_chat_messages_returns_messages |
| [CASE-100](phase-09-rbac-team-chat/CASE-100.md) | PATCH /api/chats/{id} updates session title | INFO | FEATURE_TEST | PATCH /api/chats/{id} (rename) | tests/test_chats.py::TestChatCRUD::test_rename_chat |
| [CASE-101](phase-09-rbac-team-chat/CASE-101.md) | DELETE /api/chats/{id} removes session and returns 204 | INFO | FEATURE_TEST | DELETE /api/chats/{id} | tests/test_chats.py::TestChatCRUD::test_delete_chat |
| [CASE-102](phase-09-rbac-team-chat/CASE-102.md) | GET /api/chats/{id}/messages returns 403 when session belongs to another user | INFO | FEATURE_TEST | GET /api/chats/{id}/messages (ownership check) | tests/test_chats.py::TestChatCRUD::test_cannot_access_other_users_chat_messages |
| [CASE-103](phase-09-rbac-team-chat/CASE-103.md) | PATCH /api/chats/{id} returns 403 when renaming another user's session | INFO | FEATURE_TEST | PATCH /api/chats/{id} (ownership check) | tests/test_chats.py::TestChatCRUD::test_cannot_rename_other_users_chat |
| [CASE-104](phase-09-rbac-team-chat/CASE-104.md) | DELETE /api/chats/{id} returns 403 when deleting another user's session | INFO | FEATURE_TEST | DELETE /api/chats/{id} (ownership check) | tests/test_chats.py::TestChatCRUD::test_cannot_delete_other_users_chat |
| [CASE-105](phase-09-rbac-team-chat/CASE-105.md) | GET /api/chats returns 401 or 403 without Bearer token | INFO | FEATURE_TEST | GET /api/chats (auth required) | tests/test_chats.py::TestChatCRUD::test_unauthenticated_cannot_list_chats |
| [CASE-106](phase-09-rbac-team-chat/CASE-106.md) | POST /api/chats returns 401 or 403 without Bearer token | INFO | FEATURE_TEST | POST /api/chats (auth required) | tests/test_chats.py::TestChatCRUD::test_unauthenticated_cannot_create_chat |
| [CASE-107](phase-09-rbac-team-chat/CASE-107.md) | GET /api/admin/team returns team member list for admin (200) | INFO | FEATURE_TEST | GET /api/admin/team | tests/test_chats.py::TestAdminChats::test_admin_can_list_team_members |
| [CASE-108](phase-09-rbac-team-chat/CASE-108.md) | POST /api/admin/invite creates an invitation record in DB | INFO | FEATURE_TEST | POST /api/admin/invite | tests/test_chats.py::TestAdminChats::test_invite_creates_record |
| [CASE-109](phase-09-rbac-team-chat/CASE-109.md) | POST /api/admin/invite returns 403 for non-admin user | INFO | FEATURE_TEST | POST /api/admin/invite (admin guard) | tests/test_chats.py::TestAdminChats::test_non_admin_cannot_invite |
| [CASE-110](phase-09-rbac-team-chat/CASE-110.md) | GET /api/admin/chats is accessible to admin and returns team chat sessions | INFO | FEATURE_TEST | GET /api/admin/chats | tests/test_chats.py::TestAdminChats::test_admin_list_chats_endpoint_accessible |
| [CASE-111](phase-09-rbac-team-chat/CASE-111.md) | GET /api/admin/chats returns 403 for non-admin user | INFO | FEATURE_TEST | GET /api/admin/chats (admin guard) | tests/test_chats.py::TestAdminChats::test_non_admin_cannot_access_admin_chats |
| [CASE-112](phase-09-rbac-team-chat/CASE-112.md) | DELETE /api/admin/team/{id} removes team member (endpoint exists and returns 2xx) | INFO | FEATURE_TEST | DELETE /api/admin/team/{id} | tests/test_chats.py::TestAdminChats::test_admin_remove_member_endpoint_exists |
| [CASE-113](phase-09-rbac-team-chat/CASE-113.md) | First user registered in empty DB automatically receives role='admin' | INFO | FEATURE_TEST | First-user admin promotion | tests/test_rbac.py::TestFirstUserIsAdmin::test_first_user_becomes_admin |
| [CASE-114](phase-09-rbac-team-chat/CASE-114.md) | Second registered user receives role='user' (not admin) | INFO | FEATURE_TEST | Default role assignment | tests/test_rbac.py::TestFirstUserIsAdmin::test_second_user_is_regular |
| [CASE-115](phase-09-rbac-team-chat/CASE-115.md) | Login response includes 'role' field for admin user | INFO | FEATURE_TEST | POST /api/auth/login (role in response) | tests/test_rbac.py::TestFirstUserIsAdmin::test_admin_role_in_login_response |
| [CASE-116](phase-09-rbac-team-chat/CASE-116.md) | Admin user can access GET /api/admin/team (200) | INFO | FEATURE_TEST | require_admin dependency | tests/test_rbac.py::TestRequireAdmin::test_admin_can_access_admin_endpoints |
| [CASE-117](phase-09-rbac-team-chat/CASE-117.md) | Non-admin user receives 403 on admin endpoints | INFO | FEATURE_TEST | require_admin dependency (403 guard) | tests/test_rbac.py::TestRequireAdmin::test_user_cannot_access_admin_endpoints |
| [CASE-118](phase-09-rbac-team-chat/CASE-118.md) | Unauthenticated request to admin endpoint returns 401 or 403 | INFO | FEATURE_TEST | Admin endpoint auth guard (no token) | tests/test_rbac.py::TestRequireAdmin::test_unauthenticated_cannot_access_admin |
| [CASE-119](phase-09-rbac-team-chat/CASE-119.md) | Admin JWT payload includes role='admin' claim | INFO | FEATURE_TEST | JWT role claim | tests/test_rbac.py::TestRequireAdmin::test_admin_role_in_jwt_payload |
| [CASE-120](phase-09-rbac-team-chat/CASE-120.md) | JWT payload includes 'jti' claim (JWT ID for blacklist support) | INFO | FEATURE_TEST | JWT jti claim | tests/test_rbac.py::TestRequireAdmin::test_jti_in_jwt_payload |
| [CASE-121](phase-09-rbac-team-chat/CASE-121.md) | POST /api/auth/logout returns 200 with Bearer token | INFO | FEATURE_TEST | POST /api/auth/logout | tests/test_rbac.py::TestTokenBlacklist::test_logout_endpoint_returns_200 |
| [CASE-122](phase-09-rbac-team-chat/CASE-122.md) | Token cannot be used after logout (blacklist enforced) | INFO | FEATURE_TEST | JWT blacklist (post-logout rejection) | tests/test_rbac.py::TestTokenBlacklist::test_blacklisted_token_rejected |
| [CASE-123](phase-09-rbac-team-chat/CASE-123.md) | POST /api/auth/logout without Bearer token returns 401 | INFO | FEATURE_TEST | POST /api/auth/logout (auth required) | tests/test_rbac.py::TestTokenBlacklist::test_logout_without_token_returns_401 |
| [CASE-173](phase-10-admin-panel/CASE-173.md) | GET /api/admin/stats returns total_users, total_chats, active_sessions | LOW | FEATURE_TEST | GET /api/admin/stats | — |
| [CASE-174](phase-10-admin-panel/CASE-174.md) | GET /api/admin/users returns all users with role and team assignment | LOW | FEATURE_TEST | GET /api/admin/users | — |
| [CASE-175](phase-10-admin-panel/CASE-175.md) | PATCH /api/admin/users/{id}/role changes user role (admin/user) | LOW | FEATURE_TEST | PATCH /api/admin/users/{id}/role | — |
| [CASE-176](phase-10-admin-panel/CASE-176.md) | DELETE /api/admin/users/{id} deactivates (soft-deletes) a user | LOW | FEATURE_TEST | DELETE /api/admin/users/{id} | — |
| [CASE-177](phase-10-admin-panel/CASE-177.md) | GET /api/admin/audit returns recent admin actions with timestamp and actor | LOW | FEATURE_TEST | GET /api/admin/audit | — |
| [CASE-178](phase-10-admin-panel/CASE-178.md) | PUT /api/admin/config updates system settings (e.g., max_chat_history) | LOW | FEATURE_TEST | PUT /api/admin/config | — |
| [CASE-179](phase-10-admin-panel/CASE-179.md) | GET /api/admin/license shows current license status and expiry | LOW | FEATURE_TEST | GET /api/admin/license | — |
| [CASE-180](phase-10-admin-panel/CASE-180.md) | POST /api/admin/teams creates a new team with name and assigns admin | LOW | FEATURE_TEST | POST /api/admin/teams | — |
| [CASE-181](phase-11-password-management/CASE-181.md) | POST /api/user/change-password validates old password before updating to new | LOW | FEATURE_TEST | POST /api/user/change-password | tests/test_user.py |
| [CASE-184](phase-11-password-management/CASE-184.md) | DELETE /api/user/me deletes account and invalidates all tokens | LOW | FEATURE_TEST | DELETE /api/user/me | tests/test_user.py |
| [CASE-185](phase-11-password-management/CASE-185.md) | POST /api/user/resend-verification resends email verification link | LOW | FEATURE_TEST | POST /api/user/resend-verification | tests/test_user.py |
| [CASE-186](phase-11-password-management/CASE-186.md) | Unverified users cannot access chat or NetSuite endpoints (403) | LOW | FEATURE_TEST | Email verification enforcement | tests/test_user.py |
| [CASE-187](phase-11-password-management/CASE-187.md) | PATCH /api/user/me updates first_name and last_name in DB | LOW | FEATURE_TEST | PATCH /api/user/me | tests/test_user.py |

## Deferred (Feature Tests)

| ID | Title | Severity | Category | Feature | Deferred Reason |
|----|-------|----------|----------|---------|----------------|
| [CASE-182](phase-11-password-management/CASE-182.md) | Password change rejects new password matching any of last 5 passwords | LOW | FEATURE_TEST | Password history enforcement | Not implemented — password_history table not planned for v1.0 scope |
| [CASE-183](phase-11-password-management/CASE-183.md) | Users with password older than 90 days receive 403 with 'password expired' error | LOW | FEATURE_TEST | Password expiry | Not implemented — password expiry not planned for v1.0 scope |

## Summary

| Status | Count |
|--------|-------|
| OPEN | 40 |
| PASS | 90 |
| DONE | 13 |
| PENDING | 50 |
| DEFERRED | 2 |
| FAIL | 0 |
| **Total** | **195** |

> *Updated: 2026-04-10 — Phase 10 (CASE-173–180) and Phase 11 (CASE-181–187) synced: PENDING → DONE/DEFERRED. CASE-182/183 moved to Deferred section.*
