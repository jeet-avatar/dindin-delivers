# Changelog

All notable changes to ArthaBuild are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## v1.0.0 — 2026-04-10

First customer-ready release. All 116 test cases pass. SOC2 documentation complete.

### Features

#### User Authentication
- Register, login, logout, and password reset (JWT HS256 + bcrypt, cost=12)
- Account lockout after 5 failed login attempts (15-minute cooldown)
- No email enumeration on any auth endpoint
- JWT stored in JavaScript module memory only — never `localStorage`
- Refresh tokens (7-day expiry) with in-memory JTI blacklist on logout

#### Team Management and RBAC
- First registered user automatically becomes the team admin
- Admin can invite team members via email (7-day invite tokens, SHA-256 hashed)
- Admin can promote users to admin role or remove members (soft-delete)
- All admin actions write to the audit log

#### Email Flows (Phase 11)
- Password reset: HTML email with 15-minute token, SHA-256 stored, single-use
- Email verification: required before accessing chat, resend with 60s cooldown
- Admin-triggered password reset for any team member
- Generic responses on all email endpoints (no enumeration)

#### AI Chat — Local Inference Only
- Powered by Ollama (`llama3.1:8b`) — zero prompts sent to external services
- RAG pipeline (LangGraph): retrieve → grade → [conditional rewrite] → generate
- FAISS vectorstore: 203,618 NetSuite documentation chunks, `nomic-embed-text` 768-dim embeddings
- Chat sessions persisted to SQLite; isolated per user
- Admin can view all team chat sessions

#### NetSuite Integration
- TBA (Token-Based Authentication) session management — credentials held in RAM only, never written to disk
- Per-user session isolation: each user's TBA credentials are scoped to their JWT sub claim
- Logout wipes all TBA credentials for the user immediately
- NetSuite sandbox and production account support
- Auto-index: on TBA connect, indexes up to 50 customer SuiteScript files into the RAG pipeline

#### SuiteScript Generation and Deployment
- Intent classification: distinguishes general chat, SuiteScript generation, SDF deployment, and NetSuite data queries
- SuiteScript generation: describe requirement in plain English → receives complete script + XML object definition
- Review in chat → type "yes" → deploys to NetSuite via SuiteCloud CLI (one command)
- SuiteCloud CLI runs inside the backend container using session TBA credentials

#### License System
- License key validation against ArthaBuild license server on startup
- Local SQLite cache with 7-day TTL; 72-hour grace period if server unreachable
- Instance ID bound to license on first validation — prevents license key sharing
- Deployment quota enforcement (configurable per license tier)
- Expired license → demo mode (chat read-only, no NetSuite connection, no deploy)

#### Admin Panel
- 5-tab UI: Stats, Team, Team Chats, Audit Log, System Config
- Stats: total users, total chats, active sessions, scripts deployed (scoped to team)
- Audit log: paginated table of all admin and auth events with actor email, timestamp, IP address
- System config: key-value store for runtime configuration (stored in SQLite)
- License status card: shows plan, expiry, instance ID (delegated to `validate_license()`)

### Architecture

- **Backend:** FastAPI (Python 3.11), async SQLAlchemy, Alembic migrations
- **Frontend:** React 18 + Vite + TypeScript
- **Database:** SQLite (Alembic, `render_as_batch=True`)
- **LLM runtime:** Ollama (Docker service, GPU passthrough)
- **Reverse proxy:** nginx (production: TLS 1.2/1.3, security headers, HTTPS redirect)
- **Deployment:** Docker Compose (3-service stack: nginx, backend, ollama)
- **Infrastructure:** Terraform (EC2 g4dn.xlarge, EBS encrypted at rest, Elastic IP, security group)
- **One-command deployment:** `./deploy.sh [--terraform]`

### Security

- All AI inference local — no prompts, credentials, or customer data ever leaves the VPC
- TBA credentials held in RAM only — not in database, not in logs, not in environment variables
- Rate limiting: login 10/min, forgot-password 5/min (slowapi)
- Account lockout after 5 failed login attempts
- No email enumeration on any endpoint (uniform error messages)
- CORS: explicit `ALLOWED_ORIGINS` env var — no wildcard
- JWT-in-Authorization-header pattern — no CSRF vector (no cookies)
- HTTPS redirect (port 80 → 443) in `nginx.prod.conf`
- Security headers: HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, CSP-Report-Only
- TLS 1.2/1.3 only; SSLv3, TLS 1.0, TLS 1.1 disabled (RFC 8996 compliant)
- EBS root volume encrypted at rest (AES-256, AWS-managed key)
- Zero CRITICAL/HIGH CVEs (pip-audit v2.10.0; 14 MEDIUM findings documented with rationale)
- Audit log: 17 event types across auth, user, and admin routers; append-only; paginated

### SOC2 Documentation (Phase 12)

- `docs/security/SECURITY_CONTROLS.md` — CC6/CC7/CC8/A1 control checklist with code evidence
- `docs/security/INCIDENT_RESPONSE.md` — P1/P2/P3 severity tiers with 5-step response runbook
- `docs/security/DATA_CLASSIFICATION.md` — data inventory: sensitivity, retention, deletion procedures
- `docs/security/DEPLOYMENT_SECURITY.md` — customer pre-deployment security checklist
- `docs/security/ZAP_SCAN_REPORT.md` — pip-audit results + OWASP ZAP scan methodology
- `SECURITY.md` — vulnerability disclosure policy (security@artha.build)

### Test Coverage

- **116 pytest cases** across 8 test files (5 skipped due to ordering constraints)
- Auth (23), User Registration (7), Health + Chatbot (6), NetSuite TBA (16), Security (7)
- License System (4), RBAC (11), Chat CRUD (14), Admin (6), Invite Acceptance (6)
- Admin Backend (8), Invite Flow (6), Admin Panel UI (13)
- Phase 11 Password Management (13), Phase 11 Frontend (11)
- Phase 12 Audit Log (5), Network Security (14), SOC2 Documentation (7)

### Database Migrations (all included)

| Migration | Description |
|-----------|-------------|
| `0001_create_users_and_reset_tokens.py` | Initial schema: users, password_reset_tokens |
| `a1b2c3d4e5f6` | password_reset_tokens.user_id FK + CASCADE |
| `a2b3c4d5e6f7` | users.role + users.team_id; teams; team_invites; chat_sessions; chat_messages |
| `b3c4d5e6f7a8` | license_cache; script_deployments |
| `c4d5e6f7a8b9` | audit_log; system_config; accept_invite flow |
| `d5e6f7a8b9ca` | AuditLog expansion: resource_type, resource_id, ip_address, user_agent, session_id |
| `e6f7a8b9cadb` | EmailVerificationToken; users.is_verified |

---

*All previous development phases (1–12) are internal pre-release iterations.*  
*Vibing World inc. — ArthaBuild*
