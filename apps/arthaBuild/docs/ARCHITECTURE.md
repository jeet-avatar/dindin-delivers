# ArthaBuild — System Architecture
**Version:** 3.3  
**Date:** 2026-04-17  
**Status:** Approved — Source of Truth for all Phase Plans  

> This document is the single source of truth. Every phase plan must derive its decisions from here.  
> If a phase plan contradicts this document, the phase plan is wrong.

---

## 1. What We Are Building

ArthaBuild is an **AI-powered NetSuite development and implementation platform** that runs entirely inside the customer's AWS VPC. It automates the full SuiteScript lifecycle: question → generate → review → deploy.

### 1.1 The Problem We Solve

NetSuite development today:
- A consultant writes SuiteScript manually → 2-5 days per script
- Deployment requires CLI expertise (SuiteCloud) → another day
- Bugs require back-and-forth with NetSuite support → weeks

ArthaBuild today:
- Describe what you need in plain English → AI generates complete SuiteScript in seconds
- Review it in the chat → type "yes" → deployed to NetSuite automatically
- Ask any NetSuite question → answered from 203,618-chunk knowledge base

### 1.2 The Architecture Principle

**Zero external data transfer.** Every customer gets their own deployment inside their AWS account. Their NetSuite credentials, their SuiteScript code, their questions — none of it ever leaves their VPC. The AI runs locally on Ollama. The knowledge base is shipped pre-built.

---

## 2. System Architecture

### 2.1 Component Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Customer's AWS VPC                               │
│                                                                       │
│  ┌─────────────────┐     ┌──────────────────────────────────────┐   │
│  │   EC2 Instance  │     │         Docker Compose Stack          │   │
│  │  g4dn.xlarge    │     │                                       │   │
│  │  (GPU for LLM)  │     │  ┌────────────┐  ┌────────────────┐ │   │
│  │                 │     │  │  nginx     │  │  FastAPI       │ │   │
│  │                 │────▶│  │  :80       │  │  Backend       │ │   │
│  │                 │     │  │  React SPA │  │  :8000         │ │   │
│  │                 │     │  │  + Proxy   │  │                │ │   │
│  └─────────────────┘     │  └─────┬──────┘  └──────┬─────────┘ │   │
│                           │        │ /api/*          │           │   │
│                           │        └────────────────▶│           │   │
│                           │                          │           │   │
│                           │  ┌───────────────────────▼─────────┐│   │
│                           │  │           Ollama LLM             ││   │
│                           │  │           :11434                 ││   │
│                           │  │   llama3.1:8b (generation)      ││   │
│                           │  │   nomic-embed-text (embeddings)  ││   │
│                           │  └──────────────────────────────────┘│   │
│                           │                                       │   │
│                           │  ┌──────────────┐  ┌──────────────┐ │   │
│                           │  │ FAISS Index  │  │  SQLite DB   │ │   │
│                           │  │ 203K chunks  │  │ arthaBuild.db│ │   │
│                           │  │ (volume)     │  │ (volume)     │ │   │
│                           │  └──────────────┘  └──────────────┘ │   │
│                           └──────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 SuiteCloud CLI (inside backend container)    │    │
│  │                 @oracle/suitecloud-cli (Node.js)             │    │
│  │                 Uses per-session TBA credentials             │    │
│  └───────────────────────────────────┬─────────────────────────┘    │
│                                       │                               │
└───────────────────────────────────────┼───────────────────────────────┘
                                        │ TBA / HTTPS
                                        ▼
                              ┌──────────────────┐
                              │  Customer's       │
                              │  NetSuite Account │
                              │  (sandbox or prod)│
                              └──────────────────┘

                    ┌───────────────────────────┐
                    │  ArthaBuild License Server │
                    │  (TechCloudPro AWS)        │
                    │  POST /api/license/validate│
                    │  receives: key + version   │
                    │  returns: valid + expiry   │
                    │  NO customer data ever     │
                    └───────────────────────────┘
```

### 2.2 Services and Ports

| Service | Technology | Port | Docker Image | Purpose |
|---------|-----------|------|-------------|---------|
| Frontend | React + nginx | 80 (prod) / 5173 (dev) | nginx:alpine | UI, SPA routing, /api proxy |
| Backend | Python FastAPI | 8000 | python:3.11-slim | All business logic, auth, AI routing |
| LLM | Ollama | 11434 | ollama/ollama | Local inference, embeddings |
| DB | SQLite | N/A (file) | (inside backend) | User auth, reset tokens |
| FAISS | File | N/A (file) | (inside backend) | NetSuite knowledge vector index |
| SuiteCloud | Node.js CLI | N/A (subprocess) | (inside backend) | NetSuite file/deploy operations |

### 2.3 What Lives Where

| Data | Location | Persisted? | Notes |
|------|----------|-----------|-------|
| User accounts | SQLite (backend container, EBS volume) | Yes | Auth only |
| Password reset tokens | SQLite | Yes, 1hr expiry | SHA-256 hashed |
| NetSuite TBA credentials | Python dict in RAM | Session only | Wiped on logout/expiry |
| Chat sessions | SQLite (chat_sessions, chat_messages tables) | Yes | DB-persisted since Phase 9 when chat_session_id provided; in-memory fallback for unauthenticated requests |
| FAISS vectorstore | EBS volume | Yes | Pre-built, read-only |
| Ollama models | EBS volume | Yes | ~8GB for llama3.1:8b |
| Generated SuiteScript files | Backend container filesystem | Until restart | Written to TestSDFProject/ |
| JWT tokens | JS module memory (api.ts `accessToken` var) | Page session only | Wiped on refresh — user must re-login. NEVER localStorage. |

---

## 3. Data Flow — Full Request Lifecycle

### 3.1 User Authentication Flow

```
Browser                    nginx              FastAPI            SQLite
  │                          │                   │                  │
  │── POST /api/auth/login ──▶│                   │                  │
  │                          │── proxy ──────────▶│                  │
  │                          │                   │── SELECT user ──▶│
  │                          │                   │◀─ user row ───────│
  │                          │                   │── verify bcrypt   │
  │                          │                   │── UPDATE attempts │──▶│
  │                          │                   │── create JWT      │
  │◀─── {access_token,       │◀─────────────────│                  │
  │      refresh_token} ─────│                   │                  │
  │                          │                   │                  │
  │ (store JWT in memory — api.ts setAccessToken(), wiped on page refresh)
```

### 3.2 AI Chat Flow (general_chat intent)

```
Browser           nginx          FastAPI         Ollama           FAISS
  │                 │               │               │               │
  │─ POST           │               │               │               │
  │  /api/chatbot   │               │               │               │
  │  /process ─────▶│               │               │               │
  │                 │── proxy ─────▶│               │               │
  │                 │               │── embed query ▶│               │
  │                 │               │◀─ 768-dim vec ─│               │
  │                 │               │── similarity ──────────────────▶│
  │                 │               │◀─ top-k chunks ─────────────────│
  │                 │               │── grade relevance               │
  │                 │               │   (Ollama) ───▶│               │
  │                 │               │── generate answer               │
  │                 │               │   (Ollama) ───▶│               │
  │                 │               │◀─ answer text ─│               │
  │◀─ {response} ───│◀─────────────│               │               │
```

### 3.3 SuiteScript Generation + Deployment Flow

```
Browser          FastAPI        Ollama        Filesystem      NetSuite
  │                │               │               │               │
  │─ "Create User Event script..." │               │               │
  │─ POST /chatbot/process ────────▶│               │               │
  │                │── infer_intent (Ollama) ──────▶│               │
  │                │◀─ "generate_suitescript" ──────│               │
  │                │── generate SuiteScript+XML ───▶│               │
  │                │◀─ JS code + XML ───────────────│               │
  │◀─ code shown in chat ──────────│               │               │
  │                │               │               │               │
  │─ "yes" ────────────────────────▶│               │               │
  │                │── save_generated_files ────────────────────────▶│
  │                │               │── TestSDFProject/SuiteScripts/ │
  │                │               │── TestSDFProject/Objects/      │
  │                │── suitecloud project:deploy ───────────────────▶│
  │                │   (uses session TBA credentials)               │
  │                │◀─ deploy success ──────────────────────────────│
  │◀─ "✅ Deployed to NetSuite" ────│               │               │
```

### 3.4 NetSuite TBA Session Flow

```
Browser                    FastAPI                    Memory
  │                           │                          │
  │── POST /api/netsuite/connect ─────────────────────▶│
  │   {account_id, consumer_key,                        │
  │    consumer_secret, token_id, token_secret}          │
  │                           │                          │
  │                           │── suitecloud account:setup (CI mode)
  │                           │   (validates TBA against NetSuite)
  │                           │── if valid:              │
  │                           │── store in session_store[jwt_sub] ──▶│
  │◀─ {connected: true, env: "sandbox"} ───────────────│
  │                           │                          │
  │── POST /api/chatbot/process (deploy intent) ───────▶│
  │                           │── get creds from session_store[jwt_sub]
  │                           │── suitecloud project:deploy --authid=session_id
  │                           │                          │
  │── POST /api/auth/logout ──────────────────────────▶│
  │                           │── del session_store[jwt_sub] ───────▶│ (wiped)
```

### 3.5 License Validation Flow

```
FastAPI (startup)              License Server (TechCloudPro AWS)
  │                                        │
  │── POST /api/license/validate ─────────▶│
  │   {license_key, version, instance_id}  │
  │   (NO customer data, NO prompts)       │── lookup license key
  │                                        │── check expiry
  │◀─ {valid, expiry, tier} ───────────────│
  │                                        │
  if valid: full features enabled
  if expired: demo mode (no NetSuite connection, read-only chat)
  if server unreachable: use cached result (72hr grace period)
```

---

## 4. Complete Database Schema (All Phases)

### 4.1 Schema Overview

```
arthaBuild.db (SQLite — inside backend container, EBS volume)

Phase 1:    users
            password_reset_tokens

Phase 2:    (no DB changes — TBA credentials are in-memory only)

Phase 3:    (no DB changes — Ollama needs no DB)

Phase 7:    license_cache (local cache of license validation result)
            script_deployments

Phase 9:    teams                (multi-user team records)
            team_invites         (admin-issued invite tokens)
            chat_sessions        (named DB-persisted chat containers per user)
            chat_messages        (AI conversation history)
            users.role           (added column: "admin" or "user")
            users.team_id        (added column: FK→teams.id)
```

### 4.2 Table: `users`

**Purpose:** Platform authentication — who can log into ArthaBuild  
**Created:** Phase 1  
**Owner:** Backend auth system

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, autoincrement | Internal ID |
| `first_name` | VARCHAR | NOT NULL | For login response |
| `last_name` | VARCHAR | NOT NULL | For login response |
| `email` | VARCHAR | UNIQUE, NOT NULL, indexed | Lowercase always |
| `organization` | VARCHAR | NULL | Company name |
| `password_hash` | VARCHAR | NOT NULL | bcrypt, cost=12 |
| `is_active` | BOOLEAN | DEFAULT true | Soft disable |
| `is_verified` | BOOLEAN | DEFAULT false | Email verified flag |
| `failed_attempts` | INTEGER | DEFAULT 0 | Lockout counter |
| `locked_until` | DATETIME | NULL, timezone-aware | NULL = not locked |
| `created_at` | DATETIME | server_default=now(), TZ-aware | |
| `role` | VARCHAR | NOT NULL, DEFAULT 'user' | "admin" or "user" — first registered user auto-promoted to "admin" |
| `team_id` | INTEGER | NULL, FK→teams.id | NULL = not yet on a team |

**Indexes:** `email` (unique), `id` (PK)  
**Alembic migration:** `0001_create_users_and_reset_tokens.py`; Phase 9 columns added in `a2b3c4d5e6f7`

### 4.3 Table: `password_reset_tokens`

**Purpose:** One-time password reset links  
**Created:** Phase 1  
**Owner:** Backend auth system

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, autoincrement | |
| `user_id` | INTEGER | NOT NULL, FK→users.id | |
| `token_hash` | VARCHAR | UNIQUE, NOT NULL | SHA-256(raw_token) — never store raw |
| `expires_at` | DATETIME | NOT NULL, TZ-aware | now() + 1 hour |
| `used` | BOOLEAN | DEFAULT false | True after reset completes |
| `created_at` | DATETIME | server_default=now() | |

**Security rule:** Raw token sent in email URL. SHA-256 hash stored in DB. On reset: hash the incoming token, look up hash, never compare raw strings.

### 4.4 Table: `license_cache`

**Purpose:** Local cache of the last successful license validation  
**Created:** Phase 7  
**Owner:** License check system

**Design note (v1.6):** Multi-row (not singleton) to support instance_id tracking. TechCloudPro needs to distinguish between different customer deployments using the same license key. Queries always filter by `license_key + instance_id` and take `ORDER BY last_checked DESC LIMIT 1`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, autoincrement | Row ID |
| `license_key` | VARCHAR | NOT NULL, indexed | The installed key |
| `instance_id` | VARCHAR | NOT NULL | UUID per deployment (written to data/instance_id.txt) |
| `plan` | VARCHAR | NULL | "basic", "pro", "enterprise" |
| `valid_until` | DATETIME(tz) | NULL | When cache expires (7-day TTL from last server check) |
| `last_checked` | DATETIME(tz) | NULL | When we last hit license server |
| `created_at` | DATETIME(tz) | server_default=now() | Row creation time |

**Grace period rule:** If `last_checked` < now - 72hrs AND license server unreachable → enter grace mode. If `valid_until` > now AND server is unreachable → use cached result. After cache and grace both expire → restricted mode.

### 4.5 Table: `teams` (Phase 9)

**Purpose:** Organizes users into teams for multi-user collaboration  
**Created:** Phase 9

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, autoincrement | |
| `name` | VARCHAR | NOT NULL | Team name (default from org name on first registration) |
| `created_at` | DATETIME | server_default=now() | |

### 4.6 Table: `team_invites` (Phase 9)

**Purpose:** Admin-issued invitations to join a team

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK | |
| `team_id` | INTEGER | NOT NULL, FK→teams.id | |
| `email` | VARCHAR | NOT NULL | Invitee email |
| `invited_by` | INTEGER | NOT NULL, FK→users.id | |
| `token_hash` | VARCHAR | UNIQUE, NOT NULL | SHA-256(raw_token) |
| `accepted` | BOOLEAN | DEFAULT false | |
| `expires_at` | DATETIME | NOT NULL | now() + 7 days |
| `created_at` | DATETIME | server_default=now() | |

### 4.7 Table: `chat_sessions` (Phase 9)

**Purpose:** Named chat session containers per user

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK | |
| `user_id` | INTEGER | NOT NULL, FK→users.id | Scoped per user |
| `title` | VARCHAR | NOT NULL, DEFAULT 'New Chat' | |
| `created_at` | DATETIME | server_default=now() | |
| `updated_at` | DATETIME | server_default=now() | Updated when messages added |

### 4.8 Table: `chat_messages` (Phase 9)

**Purpose:** Persisted chat messages for each session

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK | |
| `session_id` | INTEGER | NOT NULL, FK→chat_sessions.id CASCADE DELETE | |
| `role` | VARCHAR | NOT NULL | "user" or "assistant" |
| `content` | VARCHAR | NOT NULL | Message text |
| `intent` | VARCHAR | NULL | Inferred intent from AI classifier |
| `created_at` | DATETIME | server_default=now() | |

### 4.9 ERD (Entity Relationship)

```
teams (1) ──────< users (many)          [team_id FK on users]
  teams (1) ──────< team_invites (many)  [team_id FK]
  users (1) ──────< team_invites (many)  [invited_by FK]
  users (1) ──────< password_reset_tokens (many)
  users (1) ──────< chat_sessions (many)
  chat_sessions (1) ──────< chat_messages (many, CASCADE DELETE)

license_cache (no FK relations)
script_deployments (1) ──< users
```

---

## 5. Complete API Contract Specification

> Every endpoint across all 8 phases. This is the frozen interface.  
> Frontend code, Phase plans, and test cases must all derive from this table.

### 5.1 Authentication Endpoints (Phase 1)

**Base prefix:** None for register, `/api/auth` for all others

---

**POST `/api/user/register`**  
*Register a new ArthaBuild user*

Request:
```json
{
  "first_name": "string (required)",
  "last_name": "string (required)",
  "email": "string, valid email (required)",
  "password": "string, min 8 chars (required)",
  "organization": "string (optional)"
}
```
Response 201:
```json
{ "message": "Registration successful. Please check your email to verify your account." }
```
Errors: `400` weak password, `409` duplicate email, `422` validation error  
Rate limit: 10/min  
Auth required: No

---

**POST `/api/auth/check-user`**  
*Check if an email is registered (pre-login step)*

Request: `{ "email": "string" }`  
Response 200: `{ "success": true, "message": "User found", "user_id": 42, "email": "user@co.com" }`  
Response 200 (not found): `{ "success": false, "message": "User not found", "user_id": null, "email": null }`  
Note: Always 200. Never reveals existence via status code.  
Rate limit: 10/min | Auth required: No

---

**POST `/api/auth/login`**  
*Authenticate and receive JWT tokens*

Request: `{ "username": "string (email value)", "password": "string" }`  
Note: Frontend sends field named `username` containing the email address.

Response 200:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "first_name": "John",
  "last_name": "Smith",
  "email": "john@acme.com",
  "user_type": "Administrator"
}
```
Errors: `401` invalid credentials (same message whether email or password wrong), `429` account locked  
JWT format: `{ "sub": "42", "token_type": "access", "exp": unix_timestamp }`  
Rate limit: 10/min | Auth required: No

---

**POST `/api/auth/forgot-password`**  
*Send password reset email*

Request: `{ "email": "string" }`  
Response 200 (always, whether email exists or not):
```json
{ "message": "If that email is registered, you will receive a reset link shortly." }
```
Side effect: Creates `password_reset_tokens` row, sends email via SMTP (if configured)  
Reset link format: `{FRONTEND_BASE_URL}/reset-password?token={raw_token_urlsafe}`  
Rate limit: 10/min | Auth required: No

---

**POST `/api/auth/reset-password`**  
*Reset password using token from email*

Request: `{ "token": "string (from email URL)", "password": "string (new password)" }`  
Response 200: `{ "message": "Password updated successfully" }`  
Errors: `400` invalid/expired/used token, `400` weak new password  
Rate limit: 10/min | Auth required: No

---

**POST `/api/auth/refresh`**  
*Get new access token using refresh token*

Request: `{ "refresh_token": "string" }`  
Response 200: `{ "access_token": "eyJ...", "token_type": "bearer" }`  
Errors: `401` expired or invalid refresh token  
Rate limit: 10/min | Auth required: No (uses refresh token instead)

---

### 5.2 Health & Status (Phase 1)

**GET `/health`**  
Response 200: `{ "status": "ok", "service": "arthaBuild-api" }`  
Auth required: No | Rate limit: None

---

### 5.3 NetSuite Session Endpoints (Phase 2)

**Base prefix:** `/api/netsuite`  
**Auth required:** Yes (Bearer JWT access token in all requests)

---

**POST `/api/netsuite/connect`**  
*Connect NetSuite account for this session using TBA credentials*

Request:
```json
{
  "account_id": "7220160_SB2",
  "consumer_key": "string (64 hex chars)",
  "consumer_secret": "string (64 hex chars)",
  "token_id": "string (64 hex chars)",
  "token_secret": "string (64 hex chars)"
}
```
Response 200:
```json
{
  "connected": true,
  "account_id": "7220160_SB2",
  "environment": "sandbox",
  "message": "Connected to NetSuite sandbox account 7220160_SB2"
}
```
Errors: `400` invalid credentials (SuiteCloud CLI error), `401` no JWT, `422` missing fields  
Side effect: Credentials stored in `session_store[jwt_sub]` (in-memory only)

---

**GET `/api/netsuite/status`**  
*Check if NetSuite is connected for this session*

Response 200: `{ "connected": true, "account_id": "7220160_SB2", "environment": "sandbox" }`  
Response 200 (not connected): `{ "connected": false, "account_id": null, "environment": null }`

---

**POST `/api/netsuite/disconnect`**  
*Disconnect NetSuite session — credentials wiped from memory*

Response 200: `{ "message": "NetSuite disconnected. Credentials removed." }`

---

### 5.4 AI Chat Endpoints (Phase 1 structure, Phase 3 LLM swap)

**POST `/api/chatbot/process`**  
*Send message to AI — routes by intent*

Request:
```json
{
  "prompt": "string (user message)",
  "session_id": "string (optional, defaults to 'default')"
}
```
Response 200:
```json
{ "response": "string (AI response, may contain markdown and code blocks)" }
```
Response 503 (Phase 1 only, before Ollama wired): `{ "response": "AI service not yet configured." }`  
Response 403 (deploy/fetch intent, NetSuite not connected): `{ "error": "Please connect your NetSuite account first" }`  
Auth required: Yes (Phase 1: no auth guard, Phase 3+: JWT required)

**Streaming note:** Phase 4 adds `Accept: text/event-stream` header support. Same endpoint, different response format when streaming requested.

---

**POST `/reset`**  
*Clear conversation history for a session*

Request: `{ "session_id": "string" }`  
Response 200: `{ "message": "Session 'default' history cleared." }`

---

### 5.5 License Endpoints (Phase 7)

**POST `/api/license/check`** (ArthaBuild backend → License Server)  
Internal use only. Called on startup and every 24hr.

Payload sent TO license server:
```json
{
  "license_key": "string",
  "version": "1.0.0",
  "instance_id": "sha256(hostname)"
}
```
Response from license server:
```json
{
  "valid": true,
  "expiry": "2027-01-01",
  "tier": "professional",
  "features": ["netsuite_connect", "suitescript_gen", "deploy"]
}
```

---

### 5.6 JWT Token Specification (FROZEN — all phases depend on this)

| Field | Value | Notes |
|-------|-------|-------|
| Algorithm | HS256 | Signed with JWT_SECRET_KEY |
| Access token `exp` | now + 24 hours | |
| Refresh token `exp` | now + 7 days | |
| `sub` claim | `str(user.id)` | String, not integer |
| `token_type` claim | `"access"` or `"refresh"` | Validated on decode |
| Header format | `Authorization: Bearer {token}` | Frontend sends this |
| Storage | JS module memory (`api.ts` `accessToken` var) | `setAccessToken()`/`getAccessToken()` — NEVER localStorage. Cleared on page refresh. |

**FROZEN:** This spec cannot change after Phase 1. Phase 2 reads `jwt_sub` from the decoded token to key the session store. Any change to `sub` format breaks Phase 2.

---

## 6. Complete Environment Variable Specification

> Every variable across all phases. `.env.example` is generated from this table.

### 6.1 Backend Environment Variables (`src/backend/.env`)

| Variable | Phase | Required | Default | Description |
|----------|-------|----------|---------|-------------|
| `JWT_SECRET_KEY` | 1 | **YES** | — | Min 32 chars. App refuses to start if missing |
| `DATABASE_URL` | 1 | No | `sqlite+aiosqlite:///./arthaBuild.db` | SQLAlchemy async URL |
| `APP_BASE_URL` | 1 | No | `http://localhost:8000` | FastAPI base URL (NOT for user-facing links) |
| `FRONTEND_BASE_URL` | 1 | No | `http://localhost:5173` | React app URL (used in reset email links) |
| `SMTP_HOST` | 1 | No | `""` | SMTP server. Empty = suppress email (non-fatal) |
| `SMTP_PORT` | 1 | No | `587` | SMTP port |
| `SMTP_USER` | 1 | No | `""` | SMTP username |
| `SMTP_PASSWORD` | 1 | No | `""` | SMTP password |
| `SMTP_FROM` | 1 | No | `""` | From email address |
| `OLLAMA_BASE_URL` | 3 | No | `http://localhost:11434` | Ollama URL. Dev: localhost. Docker: `http://ollama:11434` (overridden by compose) |
| `OLLAMA_MODEL` | 3 | No | `llama3.1:8b` | Generation model |
| `OLLAMA_EMBED_MODEL` | 3 | No | `nomic-embed-text` | Embedding model (768-dim) |
| `FAISS_PATH` | 3 | No | `./data/vectorstore_ollama` | Directory containing index.faiss + index.pkl |
| `LICENSE_KEY` | 7 | No | `""` | ArthaBuild license key from TechCloudPro |
| `LICENSE_SERVER_URL` | 7 | No | `https://license.arthaBuild.com` | License validation endpoint |

### 6.2 Frontend Environment Variables (`src/frontend/.env`)

| Variable | Phase | Value | Description |
|----------|-------|-------|-------------|
| `VITE_API_URL` | 1 | `http://localhost:8000` | Backend base URL (dev). In Docker: empty (same-origin via nginx) |
| `VITE_ENABLE_MOCK_DATA` | 1 | `false` | Must be false — mock mode disabled permanently |
| `VITE_AUTH_SECRET` | 1 | `(any string)` | Not currently used, kept for compatibility |
| `VITE_ENABLE_STREAMING` | 4 | `false` | SSE streaming — not implemented (Phase 4 uses standard fetch) |

### 6.3 Docker Compose Environment (Phase 5)

| Variable | Service | Value | Description |
|----------|---------|-------|-------------|
| `OLLAMA_BASE_URL` | backend | `http://ollama:11434` | Docker service DNS (overrides .env default) |
| `DATABASE_URL` | backend | `sqlite+aiosqlite:////app/data/arthaBuild.db` | Absolute path inside container (4 slashes) |
| `FAISS_PATH` | backend | `/app/data/vectorstore_ollama` | Mounted from named volume `app_data` |
| `FRONTEND_BASE_URL` | backend | `https://your-domain.com` | Production: customer's domain |

---

## 7. Cross-Phase Dependency Matrix

> Read as: "Phase X decision affects Phase Y in this way"

| Decision Made In | Affects | How | Risk if Changed |
|-----------------|---------|-----|----------------|
| **Phase 1** JWT `sub` = `str(user.id)` | Phase 2 | Session store keyed by `jwt_sub` — must be string user ID | Phase 2 session isolation breaks |
| **Phase 1** Login response shape (`first_name`, `last_name`, `access_token`, `refresh_token`) | Phase 4 | Frontend `authService.ts` stores exactly these fields | Phase 4 UI shows blank user name |
| **Phase 1** `DATABASE_URL` path `./arthaBuild.db` | Phase 5 | Docker volume must mount to same directory | Phase 5 DB lost on container restart |
| **Phase 1** `requirements.txt` with pinned versions | Phase 5 | `pip install -r requirements.txt` in Dockerfile | Phase 5 Docker build fails |
| **Phase 1** Python venv at `src/backend/venv/` | Phase 5 | Dockerfile replicates venv structure | Phase 5 Dockerfile uses different Python |
| **Phase 1** Port 8000 for backend | Phase 5 | nginx proxy_pass config targets :8000 | Phase 5 all API calls 502 |
| **Phase 1** `_ai_ready` flag pattern in rawapi.py | Phase 3 | Phase 3 replaces guarded code cleanly | Phase 3 creates import tangle |
| **Phase 2** `session_store[jwt_sub]` key format | Phase 3 | Phase 3 chatbot reads session creds using same key | Phase 3 SuiteScript deploy uses wrong creds |
| **Phase 2** TBA credential dict shape | Phase 3 | `{ account_id, consumer_key, consumer_secret, token_id, token_secret }` | Phase 3 CLI command builds wrong args |
| **Phase 3** Ollama embed model `nomic-embed-text` (768-dim) | Phase 3 | FAISS index must be rebuilt with same model | Dimension mismatch crashes similarity search |
| **Phase 3** `FAISS_PATH=./data/vectorstore_ollama` | Phase 5 | Docker compose overrides to `/app/data/vectorstore_ollama`, `app_data` volume mounts at `/app/data` | Phase 5 FAISS not found on startup |
| **Phase 3** Ollama model names | Phase 5 | Docker entrypoint pulls these model names | Phase 5 wrong model downloaded |
| **Phase 4** `VITE_API_URL` empty in Docker | Phase 5 | nginx serves frontend + proxies /api to backend | Phase 5 frontend calls wrong URL |
| **Phase 5** Docker volume names | Phase 7 (License) | Terraform user_data script references volume names | Phase 7 data not persisted on EC2 |
| **Phase 5** EC2 instance type `g4dn.xlarge` | Phase 7 (License) | Terraform `instance_type` variable default | Phase 7 Ollama runs on CPU (too slow) |

---

## 8. Deployment Architecture

### 8.1 Docker Compose (Phase 5 Target)

```yaml
# Phase 5 actual service layout (docker-compose.yml at project root)

services:
  ollama:                                # GPU inference service
    image: ollama/ollama:latest
    ports: ["127.0.0.1:11434:11434"]    # Internal only — NOT public
    volumes: [ollama_models:/root/.ollama]
    deploy.resources.reservations:       # NVIDIA T4 GPU passthrough
      devices: [{driver: nvidia, count: all, capabilities: [gpu]}]

  ollama-init:                           # One-shot model puller
    image: ollama/ollama:latest
    entrypoint: ["ollama pull llama3.1:8b && ollama pull nomic-embed-text"]
    restart: no

  backend:                               # FastAPI + SuiteCloud CLI
    build: {context: ., dockerfile: Dockerfile}
    ports: ["127.0.0.1:8000:8000"]      # Internal only — NOT public
    env_file: .env                       # Root .env: JWT_SECRET_KEY, SMTP_*
    environment:                         # Override .env for Docker networking
      - OLLAMA_BASE_URL=http://ollama:11434
      - DATABASE_URL=sqlite+aiosqlite:////app/data/arthaBuild.db
      - FAISS_PATH=/app/data/vectorstore_ollama
    volumes: [app_data:/app/data]        # SQLite DB + FAISS persisted

  nginx:                                 # Public entry point
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./src/frontend/dist:/usr/share/nginx/html:ro  # Pre-built React SPA

volumes:
  ollama_models:   # llama3.1:8b (~5GB) + nomic-embed-text (~274MB)
  app_data:        # arthaBuild.db + vectorstore_ollama/ (FAISS index)
```

**Root `.env` (read by docker-compose env_file):**
```
JWT_SECRET_KEY=<openssl rand -hex 32>   # REQUIRED
SMTP_HOST=                               # Optional — password reset emails
FRONTEND_BASE_URL=https://your-domain   # For reset link URLs
LICENSE_KEY=                            # Phase 7
```
Note: `DATABASE_URL`, `OLLAMA_BASE_URL`, and `FAISS_PATH` are set in `environment:` (overrides env_file) so they don't need to be in root `.env`.

### 8.2 AWS Infrastructure (Phase 7 Target)

| Resource | Spec | Purpose |
|----------|------|---------|
| EC2 | g4dn.xlarge (4 vCPU, 16GB RAM, 1 T4 GPU) | Ollama GPU inference |
| EBS | gp3, 100GB | OS + Docker + FAISS + models + SQLite |
| Security Group | Port 80 (0.0.0.0/0), Port 22 (customer VPN CIDR only) | Web + SSH |
| Elastic IP | Static | Stable URL for customer |
| VPC | Customer's existing VPC | Air-gapped deployment |

**Alternative (CPU-only):** c5.4xlarge (16 vCPU, 32GB RAM) — inference is ~10x slower, acceptable for low-usage internal tools.

### 8.3 nginx Configuration (Phase 5 Target)

```nginx
# Core routing logic
server {
  listen 80;

  # API calls → FastAPI backend
  location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /health {
    proxy_pass http://backend:8000/health;
  }

  location /reset {
    proxy_pass http://backend:8000/reset;
  }

  # Everything else → React SPA
  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;  # SPA routing
  }
}
```

---

## 9. Security Architecture

### 9.1 Authentication Stack

| Layer | Implementation | Purpose |
|-------|---------------|---------|
| Password hashing | bcrypt, cost=12 | User passwords — never stored plain |
| JWT signing | PyJWT, HS256, `JWT_SECRET_KEY` | Stateless session |
| Rate limiting | SlowAPI, 10 req/min | Brute-force protection on all auth endpoints |
| Account lockout | 5 failed attempts → 15min lock | Credential stuffing protection |
| No enumeration | Identical responses for wrong email vs wrong password | Account existence protection |
| Reset token | `secrets.token_urlsafe(32)` raw, SHA-256 hash in DB | One-time use, cannot be reversed from DB |

### 9.2 NetSuite Credential Security

| Rule | Implementation |
|------|---------------|
| Never written to disk | Python dict in RAM only |
| Never logged | No print/logger calls with credential values |
| Session-isolated | Keyed by `jwt_sub` (user ID) — users cannot access each other's credentials |
| Destroyed on logout | `del session_store[jwt_sub]` |
| Destroyed on JWT expiry | Startup validator checks token expiry before lookup |
| Never in DB | SQLite has no credentials table |
| Never in frontend | Frontend only sends credentials once to `/api/netsuite/connect` |

### 9.3 Data Isolation

| Customer A | Customer B |
|-----------|-----------|
| Separate EC2 instance | Separate EC2 instance |
| Separate SQLite DB | Separate SQLite DB |
| Separate FAISS index | Separate FAISS index (same content, separate deployment) |
| Separate Ollama instance | Separate Ollama instance |
| Separate license key | Separate license key |

### 9.4 Identity & Access Controls (Phase 13)

#### SSO / OIDC

| Component | File | Purpose |
|-----------|------|---------|
| SSO router | `src/backend/routers/sso.py` | GET/POST /api/auth/sso/config (admin), GET /api/auth/sso/callback (OIDC code exchange) |
| IdP config storage | `SystemConfig` table | Keys: sso_idp_metadata_url, sso_client_id, sso_client_secret |
| OIDC library | authlib 1.3.2 | Authorization-code flow, userinfo endpoint |
| SSO user creation | Auto-create with password_hash="__sso__" | SSO users have no local password |
| SSO admin UI | `AdminPanel.tsx` → Security tab | Admin enters IdP discovery URL + client credentials |

#### TOTP MFA

| Component | File | Purpose |
|-----------|------|---------|
| MFA router | `src/backend/routers/mfa.py` | enroll (secret gen), verify (activate), disable, check (login gate) |
| MFA model | `MFASecret` in `models.py` | user_id FK, base32 secret, is_active, created_at |
| TOTP library | pyotp 2.9.0 | RFC 6238, 30-second window, SHA-1, 6 digits |
| Enrollment UI | `MFASetup.tsx` | QR code (data URL) + OTP input → POST /api/auth/mfa/verify |
| Route | `/mfa-setup` (Protected) | Authenticated users only |

#### Idle Session Timeout

| Setting | Default | Override |
|---------|---------|----------|
| `SESSION_IDLE_MINUTES` env | 30 minutes | Set to 0 for immediate expiry (testing) |
| Implementation | `IdleTimeoutMiddleware` checks `iat` claim | JWT iat added to all tokens via `create_access_token` |
| Skip paths | /health, /api/auth/login, /api/user/register, /api/auth/sso/callback, static assets | Always bypassed |

#### IP Allowlist

| Setting | Behavior |
|---------|----------|
| `ALLOWED_IP_RANGES` unset or empty | All IPs allowed (backward compatible) |
| `ALLOWED_IP_RANGES=10.0.0.0/8,192.168.1.0/24` | Requests from outside ranges → 403 IP not permitted |
| /health path | Always allowed (ECS health checks, monitoring) |
| Implementation | `IPAllowlistMiddleware`, `ipaddress.ip_network` CIDR matching |

### 9.5 Compliance & Data Governance (Phase 14)

#### GDPR Data Rights

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/user/export-data | POST | require_user | GDPR Art. 15 — returns JSON file of user profile, chats, audit rows |
| /api/user/erase | POST | require_user | GDPR Art. 17 — anonymises user, hard-deletes chat data, writes audit event |

Erasure pattern: email → `erased-{id}@deleted.local`, name → "Deleted User", password_hash → unusable `!sha256(...)`, `is_active=False`, `erased_at=now()`. Chat sessions and messages are hard-deleted (no PII retention).

Router file: `src/backend/routers/compliance.py` (prefix `/api/user`)

#### Immutable Audit Hash Chain (SOC2 CC7.2)

| Component | Value |
|-----------|-------|
| prev_hash | `row_hash` of previous AuditLog row (None for first) |
| row_hash | `sha256(prev_hash\|action\|actor_email\|created_at_iso)` |
| Computed in | `write_audit_event()` in `audit_utils.py` |
| Migration | `14a_audit_hash_chain` (chains from `13a_identity_access`) |
| Verification | Replay chain offline: any tampered row breaks chain |

#### Audit CSV Export

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/admin/audit/export | GET | require_admin | Returns downloadable CSV with ?start=ISO8601&end=ISO8601 filter |

CSV columns: `id, created_at, actor_email, actor_role, action, result, ip_address, prev_hash, row_hash`

#### SOC2 Evidence Generator

Script: `src/backend/scripts/generate_soc2_evidence.py`
Usage: `python3 generate_soc2_evidence.py --db-path /path/to/arthaBuild.db --out-dir docs/soc2-evidence/`

Produces 5 control files:

| File | SOC2 Control |
|------|-------------|
| CC6.1-access-control.md | Logical access controls, RBAC, MFA, sessions |
| CC6.2-least-privilege.md | Admin-only endpoints, require_admin() guard |
| CC7.2-audit-log-sample.md | Last 50 audit events with hash chain columns |
| CC9.2-incident-response.md | Reference to docs/security/INCIDENT_RESPONSE.md |
| A1.2-backup-schedule.md | Backup config (OPS_BACKUP_S3_BUCKET env), RTO/RPO |

---

## 10. Phase-by-Phase Implementation Plan

### Revised Phase Roadmap (Architecture-Informed)

| Phase | Name | Status | Builds On | Key Decisions Frozen |
|-------|------|--------|-----------|---------------------|
| **1** | Foundation & Auth | ✅ Complete | Nothing | JWT format, DB schema, port 8000, requirements.txt |
| **2** | NetSuite TBA Session | ✅ Complete | Phase 1 JWT | session_store key format, TBA dict shape |
| **3** | LLM Migration | ✅ Complete | Phase 1 structure | Ollama model names, embed dim 768, FAISS path |
| **4** | Frontend Wiring | ✅ Complete | Phase 1+3 APIs | Streaming format, VITE_API_URL empty in prod |
| **5** | Docker + Terraform | ✅ Complete | Phase 1+3 env vars | Volume names, nginx routing, EC2 instance type |
| **6** | Testing & Hardening | ✅ Complete | All phases | 59/59 tests pass, rate limiting, security audit |
| **7** | License System | ⏳ Next | Phase 5 Docker | License API contract, grace period 72hr, demo mode |
| **8** | Launch Readiness | ⏳ Pending | All phases | smoke_test.sh, CUSTOMER_DEPLOYMENT.md, v1.0.0 tag |

### Phase Interface Contracts (What Each Phase Outputs That The Next Phase Consumes)

```
Phase 1 outputs:
  → JWT token format (sub=str(user_id), token_type)       consumed by Phase 2
  → API base on port 8000                                  consumed by Phase 4, 5
  → requirements.txt with pinned deps                      consumed by Phase 5
  → _ai_ready / _suitecloud_ready flag pattern             consumed by Phase 3

Phase 2 outputs:
  → session_store[str(user_id)] = TBA cred dict           consumed by Phase 3
  → /api/netsuite/connect|status|disconnect endpoints      consumed by Phase 4

Phase 3 outputs:
  → Ollama-powered /api/chatbot/process                    consumed by Phase 4
  → Rebuilt FAISS at /data/vectorstore/                    consumed by Phase 5
  → OLLAMA_BASE_URL, OLLAMA_MODEL env vars                 consumed by Phase 5

Phase 4 outputs:
  → VITE_ENABLE_STREAMING=true                             consumed by Phase 5
  → Confirmed frontend ↔ backend contract                  consumed by Phase 8

Phase 5 outputs:
  → docker-compose.yml + Dockerfile                        consumed by Phase 7
  → Volume names, port mapping                             consumed by Phase 7
  → .env.example complete                                  consumed by Phase 7

Phase 6 outputs:
  → 59/59 test suite passing (backend)                     consumed by Phase 8 (launch gate)
  → SlowAPI rate limiting on all auth endpoints            consumed by Phase 8 security audit
  → Security audit clean (no hardcoded keys, no raw SQL)   consumed by Phase 8

Phase 7 outputs:
  → License server deployed at license.arthaBuild.com      consumed by Phase 8 smoke test
  → LICENSE_KEY env var populated in customer .env         consumed by Phase 8
  → LicenseCache table + Alembic migration                 consumed by Phase 8
  → License banner UI in frontend                          consumed by Phase 8

Phase 8 outputs:
  → benchmark.sh + smoke_test.sh                           consumed by customer
  → CUSTOMER_DEPLOYMENT.md                                 consumed by customer
  → TROUBLESHOOTING.md                                     consumed by customer
  → git tag v1.0.0                                         consumed by customer
```

---

## 11. Technology Decision Log

| Decision | Chosen | Rejected | Reason |
|----------|--------|---------|--------|
| LLM runtime | Ollama | OpenAI, Bedrock | Data never leaves VPC |
| Embed model | nomic-embed-text (768d) | OpenAI ada-002 (1536d) | Local, no API key, must rebuild FAISS |
| Generation model | llama3.1:8b | mistral:7b, llama3.2:3b | Best accuracy/speed tradeoff on T4 GPU |
| Database | SQLite + SQLAlchemy | PostgreSQL, MySQL | Single-tenant, zero config, Docker-friendly |
| Auth library | PyJWT | python-jose | python-jose abandoned (last release 3yrs), 8 CVEs |
| Password hashing | passlib[bcrypt] | argon2 | FastAPI standard, bcrypt widely understood |
| Rate limiting | SlowAPI | fastapi-limiter | SlowAPI has zero deps beyond slowapi itself |
| Deployment | Docker Compose | K8s, ECS | Single-tenant, simpler ops for customer's IT team |
| IaC | Terraform | CDK, CloudFormation | Provider-agnostic, customer familiarity |
| Frontend build | Vite | CRA, Next.js | Already in codebase, fast HMR |
| NetSuite auth | TBA (per-session) | OAuth 2.0 | NetSuite standard for CLI/SDF tooling |

---

## 11. Frontend Route Map

All routes registered in `src/frontend/src/routes.tsx`:

| Route | Component | Protected | Notes |
|-------|-----------|-----------|-------|
| `/` | Landing | No | Marketing page |
| `/log-in` | Auth | No | Email check step |
| `/log-in/password` | Password | No | Password entry step |
| `/forgot-password` | ForgotPassword | No | |
| `/reset-password/:token` | ResetPassword | No | Token from email URL |
| `/reset-success` | ResetSuccess | No | |
| `/reset-failed` | ResetFailed | No | |
| `/create-account` | SignUp | No | |
| `/signup-success` | SignUpSuccess | No | |
| `/accept-invite` | AcceptInvite | No | Invite acceptance — reads ?token= from query string |
| `/chat/new` | Chat | Yes | Creates new chat, redirects to `/chat/:token` |
| `/chat/:token` | Chat | Yes | Loads existing chat by encoded ID |
| `/history` | HistoryPage | Yes | Local chat list, links to `/chat/:token` |
| `/profile` | Profile | Yes | Logout only, no API calls |
| `/admin` | AdminPanel | AdminProtected | Admin only — team management |
| `/admin/*` | AdminPanel | AdminProtected | Admin sub-routes |
| `*` | Navigate to `/` | — | Catch-all |

**Session expiry:** When any API call returns 401, `api.ts` dispatches `auth:logout` event → `useAuth.ts` clears state and navigates to `/log-in`.

---

## 12. Test Coverage Summary (v2.1)

### 10.1 Backend Tests (pytest)

| File | Test IDs | Count | Status |
|------|----------|-------|--------|
| `test_user.py` | TC-AUTH-01..05 | 8 | ✅ Pass |
| `test_auth.py` | TC-AUTH-06..23 | 23 | ✅ Pass |
| `test_netsuite.py` | TC-NS-01..10 | ~12 | ✅ Pass |
| `test_health.py` | TC-HEALTH-01..06 | ~6 | ✅ Pass |
| `tests/security/test_csrf.py` | TC-SEC-CSRF-01..03 | 3 | ✅ Pass |
| `tests/security/test_encryption.py` | TC-SEC-ENC-01 | 1 | ✅ Pass |
| `tests/security/test_https_redirect.py` | TC-SEC-HTTPS-01..02 | 2 | ✅ Pass |
| `tests/security/test_security_headers.py` | TC-SEC-HDR-01..05 | 5 | ✅ Pass |
| `tests/security/test_tls_config.py` | TC-SEC-TLS-01..03 | 3 | ✅ Pass |
| `tests/security/test_audit_log.py` | TC-AUDIT-01..05 | 5 | ✅ Pass |
| **Total** | | **115/115** | **✅ All pass** |

Run: `cd src/backend && source venv/bin/activate && pytest tests/ -v`

### 10.2 Frontend Tests (vitest)

| File | Test IDs | Count | Status |
|------|----------|-------|--------|
| `test/api.test.ts` | TC-API-01..05 | 9 | ✅ Pass |
| `test/authService.test.ts` | TC-FE-AUTH-01..07 | 13 | ✅ Pass |
| `test/history-navigation.test.tsx` | TC-FE-NAV-01..02 | 2 | ✅ Pass |
| **Total** | | **24/24** | **✅ All pass** |

Run: `cd src/frontend && npm run test`

### 10.3 Not Yet Tested (Phase 6+ scope)
- NetSuite TBA connect/disconnect UI
- SuiteScript generation → deploy flow (requires live NetSuite sandbox)
- License validation (requires license server)

---

## 13. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-07 | Initial architecture, Phases 1-2 |
| 1.1 | 2026-04-08 | JWT storage corrected: memory-only (not localStorage) |
| 1.2 | 2026-04-09 | FAISS default path fix, Phase 4 E2E wired |
| 1.3 | 2026-04-09 | Phase 5 Docker/Terraform deployment, route map, test coverage, 401 session expiry handling, History.tsx navigation fix |
| 1.4 | 2026-04-09 | Phase 6 Testing & Hardening complete (59/59 tests). Fixed phase numbering: Phase 6=Testing, Phase 7=License, Phase 8=Launch. Fixed duplicate section headers (11/12/13). license_cache and LICENSE_SERVER_URL moved to Phase 7. Removed stale HTML files (test.html, test-report.html, architecture-diagram.html). |
| 1.5 | 2026-04-09 | Post-phase bug fixes (Session 2). 10 chatbot response gaps closed across Phase 3 (rawapi.py, suitescripts_utils.py) and Phase 4 (Chat.tsx, ChatMessage.tsx, api.ts). Key fixes: React state race on chat mount, SuiteScript JSON.parse crash, SystemExit from SuiteCloud CLI, "yes" handler wrong session index, None response guards, 500 error key mismatch. |
| 1.9 | 2026-04-10 | Phase 10 complete. Plan 01: AuditLog + SystemConfig models, Alembic migration b3c4d5e6f7a8, 8 new admin endpoints (CASE-173 to CASE-180). Plan 02: POST /api/user/accept-invite + AcceptInvite.tsx page + /accept-invite public route. Plan 03: AdminPanel.tsx extended from 3 to 5 tabs (Usage Stats + Audit Log), adminService.ts extended to 9 functions (getStats, listUsers, changeRole, deleteUser, getAuditLog), Promote button wires to PATCH /api/admin/users/{id}/role, Remove button wires to DELETE /api/admin/users/{id}. |
| 2.0 | 2026-04-11 | Phase 11 Plan 01: HTML email templates, EmailVerificationToken model + Alembic migration c4d5e6f7a8b9, 6 user endpoints (GET/PATCH/DELETE /me, change-password, verify-email, resend-verification), admin send-reset endpoint, require_user_unverified_ok alias, 11 new tests, 96/96 pass. Phase 11 Plan 02: Frontend UX — authService 4 new functions (getProfile, changePassword, resendVerification, patchUser), adminService sendPasswordReset, ForgotPassword check-email success state, ResetFailed inline 60s-cooldown resend form, ResetPassword full policy validation, Profile change-password form, EmailVerificationBanner component, Chat EmailVerificationBanner wired, AdminPanel Send Reset button, VerifyEmail page + /verify-email route. Build clean. |
| 2.8 | 2026-04-14 | Phase 18 — Cloudflare Edge Security. DNS A records proxied (orange-cloud), SSL Full Strict, email obfuscation + hotlink protection, HTTPS Redirect Rule (301), Cache Rules (API bypass + static 1yr). WAF: Cloudflare Managed Ruleset + OWASP CRS (Pro plan) in LOG mode. Transform Rules: Permissions-Policy + enforcing CSP (additive — no nginx header duplication). WAF rate limiting: /api/* at 60 req/min per IP (/api/chatbot/ excluded). Analytics: httpRequestsAdaptiveGroups GraphQL query verified. Header ownership table documents which layer owns each header. |
| 2.7 | 2026-04-14 | Phase 17 — Onboarding UX. onboarding_completed Boolean column on User (Alembic 17a_onboarding, server_default=0). Three backend endpoints in routers/admin.py: GET /api/admin/user/me/onboarding, POST /api/admin/onboarding/complete, POST /api/admin/license/validate-key (calls existing license_utils validate_license via _call_license_server). Frontend: OnboardingWizard.tsx (3-step fixed modal: NetSuite connect → invite team → verify license; fires GET onboarding on mount, POST complete on finish/skip; renders only for admin role). EmptyState.tsx (reusable: icon, message, subtext, CTA). NotificationBanner.tsx (polls /health/detail every 60s; shows amber banner for ai_ready=false/disk<5GB/license_invalid; renders nothing on 401/403). AdminPanel 7th tab "License" (key input + validate-key call + plan/status display). Chat.tsx: OnboardingWizard + NotificationBanner wired in. History.tsx + Sidebar.tsx: EmptyState replaces inline empty states. Frontend build clean (2,500 kB, 0 errors). |
| 2.6 | 2026-04-13 | Phase 16 — API Platform. APIKey model (key_hash/SHA-256, name, is_active, last_used_at) + WebhookEndpoint model (event, url, secret, is_active). Alembic migration 16a_api_key_model. APIKeyAuthMiddleware: X-API-Key header → SHA-256 lookup → inject request.state.api_key_user. require_user() falls back to api_key_user (all existing endpoints auto-accept X-API-Key). ResponseEnvelopeMiddleware: wraps /api/v1/ JSON in {data, error, meta}. routers/apikeys.py: POST/GET/DELETE /api/v1/keys. webhook_worker.py: dispatch_webhook (HMAC-SHA256 signed, httpx 10s timeout, non-fatal) + register_webhook. POST /api/admin/webhooks (admin JWT required). chat.completed dispatch after chatbot response. script.deployed dispatch after successful SuiteCloud deploy. /api/v1/chats prefix alias (same handlers). 143/146 tests pass (3 pre-existing FAISS failures, 2 pre-existing infra failures). |
| 2.5 | 2026-04-13 | Phase 15 — Operational Reliability. S3 backup script (scripts/backup.sh, AES-256 SSE, cron-ready). Sentry SDK optional init guarded by SENTRY_DSN env var (sentry-sdk>=2.0.0 in requirements.txt). SIGTERM/SIGINT graceful shutdown handler at module level (_shutdown_event asyncio.Event). /health/detail extended with db_latency_ms, disk_free_gb, ollama_status, ollama_model, sentry_active, backup_bucket_configured. 146/146 tests pass (2 pre-existing failures excluded: nginx.conf modified, alembic migration env). |
| 2.4 | 2026-04-13 | Phase 14 — Compliance & Data Governance. GDPR export (POST /api/user/export-data) + erase (POST /api/user/erase) endpoints in routers/compliance.py. Immutable audit hash chain: prev_hash + row_hash on AuditLog (sha256 chain, Alembic 14a_audit_hash_chain). erased_at on User. Admin CSV export (GET /api/admin/audit/export, date-range filter). SOC2 evidence generator script (5 control files: CC6.1/CC6.2/CC7.2/CC9.2/A1.2). 138/138 pass (excluding 4 pre-existing failures). |
| 2.3 | 2026-04-13 | Phase 13 — Identity & Access. SSO/OIDC router (GET/POST /api/auth/sso/config, GET /api/auth/sso/callback), TOTP MFA router (enroll/verify/disable/check), IdleTimeoutMiddleware (SESSION_IDLE_MINUTES env, iat claim added to JWTs), IPAllowlistMiddleware (ALLOWED_IP_RANGES CIDR env), MFASecret model + ip_allowlist on Team (Alembic 13a_identity_access), AdminPanel Security tab (6th tab: SSO config, IP allowlist, MFA policy toggle), MFASetup.tsx + /mfa-setup route. 147/149 tests pass (2 pre-existing). |
| 2.2 | 2026-04-11 | Phase 8.1 — Pre-Staging Case Resolution. Plan 01: 21 bug fixes — CASE-001 (Vite proxy port), CASE-006 (User.email NOCASE collation + migration e1f2g3h4i5j6), CASE-025 (_persist_chat_to_db returns True/False + persistence_warning), CASE-031 (/health split public/private with /health/detail requiring auth), CASE-023 (CORS_EXTRA_ORIGINS env var), CASE-033/034/035 (license env vars). Plan 02: 28 new backend tests — test_migrations.py, test_license.py, test_infrastructure.py (new); test_user/auth/netsuite/chats/rbac/security/* (extended). 121→149 tests passing. Plan 03: Static analysis (CASE-012/014/022/036/040/168 DONE), ROADMAP.md 12-01 checkbox fixed, 90 cases closed (44 DONE, 23 PASS, 23 DEFERRED). |
| 2.1 | 2026-04-11 | Phase 12 complete. Plan 01: Audit log expansion (SOC2 CC7.2) — audit_utils.py write_audit_event() shared helper, AuditLog model expanded with actor_email/actor_role/result/ip_address/target, Alembic migration d5e6f7a8b9ca, hooks in auth.py (7 events) + user.py (4 events) + admin.py (5 call site migrations), GET /api/admin/audit paginated with offset/limit, 5 security tests, 115 tests total. Plan 02: nginx.prod.conf TLS hardening (CASE-188/189/195), CORS tightening (CASE-190), EBS encryption (CASE-193), 14 static analysis tests. Plan 03: docs/security/ documentation suite (SECURITY_CONTROLS, INCIDENT_RESPONSE, DATA_CLASSIFICATION, DEPLOYMENT_SECURITY, ZAP_SCAN_REPORT), SECURITY.md at repo root, pip-audit run (14 MEDIUM, 0 CRITICAL/HIGH), CASE-188 through CASE-195 all DONE. |
| 1.6 | 2026-04-09 | 3D Landing page wired into React. Three.js r0.183 + GSAP 3.14 installed as npm packages (not CDN). Landing.tsx fully replaced: GPU particle field (5,500 particles), nebula orbs, wireframe geometries, cinematic camera, scroll pull-back, mouse parallax, chat card tilt, custom cursor, IntersectionObserver reveals, counter animations. landing.css scoped to `.landing-root` (no global contamination). React Router `<Link>` for all internal nav. Proper useEffect cleanup (cancelAnimationFrame, renderer.dispose, ScrollTrigger.kill). Build: 2,246 kB (three.js is large — lazy-load candidate Phase 8). |

### Chatbot Response Reliability Rules (v1.5)

Rules derived from Session 2 bug fixes. Any future changes to `/api/chatbot/process` or chat rendering must comply.

| Rule | Detail |
|------|--------|
| **Never return `None` as response** | All intent handlers must return a string. If a function can return `None`, add a `or "❌ ..."` fallback before setting `response_text`. |
| **`graph.invoke()` result must be guarded** | Always use `isinstance(result, dict)` check before `.get("generation")`. |
| **`manage_sdf_project` requires `_suitecloud_ready`** | Never call `handle_sdf_project()` unless `_suitecloud_ready is True`. RAG answer is the fallback. |
| **`except BaseException` in chatbot handler** | SuiteCloud CLI calls `sys.exit(1)` which raises `SystemExit` — not caught by `except Exception`. |
| **500 error key must be `"detail"`** | Frontend `api.ts` reads `err.detail`. Backend must use `{"detail": str(e)}` not `{"error": str(e)}`. |
| **"yes" handler searches backwards** | Find the last assistant message with ` ``` ` code blocks via `reversed(history[:-2])`, not a hardcoded index. |
| **ChatMessage JSON array detection** | Only treat code block as JSON array if `code.trim().startsWith('[')` AND `JSON.parse(code)` succeeds in try-catch. Never use `code.includes('[')`. |
| **Chat token effect uses `chatService.getById()`** | React `chats` state is `[]` on mount. Token effect must read localStorage directly, not state. `activeChat` useMemo must also use `chatService.getById()` as primary source. |

---

## 4.5 License System

ArthaBuild uses a privacy-preserving license system for BYOC deployments.

### Architecture
- **License cache**: SQLite `license_cache` table — validity cached 7 days, 72-hour grace period
- **Script deploy tracking**: SQLite `script_deployments` table — counts production deploys per license
- **License server**: Separate TechCloudPro-hosted service at `https://license.arthaBuild.com`
- **Instance lock**: One deployment per license key — `instance_id` (UUID) registered on first validation

### Tier Limits (enforced server-side)
| Plan | Production script deploys | Users | Sandbox |
|------|--------------------------|-------|---------|
| Starter | 10 | 1 | Unlimited |
| Growth | 100 | 3 | Unlimited |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Privacy Guarantee
Only `{license_key, instance_id, version}` is sent to the license server.
Customer NetSuite credentials, SuiteScripts, prompts, and business data NEVER leave the customer VPC.

### Offline Resilience
- Cache valid for 7 days — works without internet access
- 72-hour grace period after cache expires
- After grace period: read-only mode (existing scripts work, no new deploys)

### Environment Variables
- `LICENSE_KEY`: Customer license key (required for production)
- `LICENSE_SERVER_URL`: Defaults to `https://license.arthaBuild.com`

### Key Files
| File | Purpose |
|------|---------|
| `src/backend/routers/license.py` | validate_license(), check_deploy_quota(), record_deploy(), GET /api/license/status |
| `src/backend/models.py` | LicenseCache + ScriptDeployment models |
| `license-server/app.py` | TechCloudPro-hosted validation server (deployed separately) |
| `data/instance_id.txt` | Stable UUID per deployment (auto-generated on first run) |

---

## 4.6 NetSuite Auto-Index (Personalized RAG)

On first TBA credential connect, ArthaBuild automatically indexes the customer's existing SuiteScripts.

### Flow
1. User connects NetSuite TBA → credentials validated
2. Background task fires: `_index_customer_netsuite(account_id, credentials)`
3. SDF `object:list --type script` retrieves all script names (capped at 50)
4. Each script content fetched and embedded via `nomic-embed-text`
5. Customer-specific FAISS index saved to `data/customer_index/`

### Query Priority
1. **Customer index first** (`data/customer_index/`) — answers based on their actual scripts
2. **Bootstrap fallback** (`data/faiss_index/`) — generic NetSuite knowledge

### Result
When a user asks "why is my PO approval script failing?" — ArthaBuild answers based on their
real PO approval script code, not generic NetSuite docs.

### Key Files
| File | Purpose |
|------|---------|
| `src/backend/routers/netsuite.py` | `_index_customer_netsuite()` background task after TBA connect |
| `src/backend/model_utils.py` | `retrieve_node()` checks customer index first, falls back to bootstrap |
| `data/customer_index/` | Customer-specific FAISS index (created after first TBA connect) |

---

## 10. Phase 9 — RBAC, Team Management and Chat Persistence

**Version bump:** 1.7 → 1.8  
**Migration:** `a2b3c4d5e6f7` (Alembic batch alter — SQLite-safe)  
**Status:** Complete — 85/85 tests passing

### 10.1 New Database Tables

| Table | Purpose | Phase |
|-------|---------|-------|
| `teams` | Multi-user team records | 9 |
| `team_invites` | Admin-issued invite tokens (SHA-256 hashed, 7-day expiry) | 9 |
| `chat_sessions` | Named DB-persisted chat containers per user | 9 |
| `chat_messages` | AI conversation history per session | 9 |

### 10.2 New User Fields

| Column | Type | Notes |
|--------|------|-------|
| `role` | VARCHAR | "admin" or "user" — first registered user auto-promoted to admin |
| `team_id` | INTEGER NULL | FK → teams.id — NULL until assigned to a team |

### 10.3 New Backend Modules

| File | Router Prefix | Purpose |
|------|--------------|---------|
| `src/backend/routers/chats.py` | `/api/chats` | CRUD for chat sessions and messages per user |
| `src/backend/routers/admin.py` | `/api/admin` | Admin-only: list team, list all chats, invite, remove member |

### 10.4 RBAC Pattern

```python
# auth_utils.py FastAPI Depends

require_user()   # Any authenticated user — returns User ORM object
require_admin()  # Admin only — raises 403 if role != "admin"
```

**First-user-is-admin:** `SELECT COUNT(*) FROM users` before insert — if 0, role = "admin", else role = "user". Race-safe for SQLite single-writer deployment.

### 10.5 JWT Changes

| Field | Notes |
|-------|-------|
| `role` | Claim added — "admin" or "user" — carried in access token |
| `jti` | Unique token ID — UUID4 — enables token blacklisting on logout |

**Token blacklist:** In-memory Python `set()` of jti values. Resets on server restart. Sufficient for single-tenant BYOC deployment.

### 10.6 API Endpoints Added (Phase 9)

**Chat CRUD (`/api/chats`):**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/chats` | require_user | Create new chat session |
| GET | `/api/chats` | require_user | List own sessions (isolated — no cross-user access) |
| GET | `/api/chats/{id}/messages` | require_user | List messages in session (own only) |
| PATCH | `/api/chats/{id}` | require_user | Rename session (own only) |
| DELETE | `/api/chats/{id}` | require_user | Delete session (own only) |

**Admin Team Management (`/api/admin`):**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/admin/team` | require_admin | List all team members |
| GET | `/api/admin/chats` | require_admin | List all team chat sessions with user attribution |
| POST | `/api/admin/team/invite` | require_admin | Send invite to email (creates TeamInvite record) |
| DELETE | `/api/admin/team/{user_id}` | require_admin | Remove member from team |

**Auth Logout (`/api/auth/logout`):**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/logout` | require_user | Blacklist jti of current access token |

### 10.7 Frontend Changes (Phase 9)

| Component/File | Change | Purpose |
|----------------|--------|---------|
| `src/frontend/src/services/api.ts` | Added `listChats`, `createChatSession`, `getChatMessages`, `renameChatSession`, `deleteChatSession` | DB-backed chat CRUD |
| `src/frontend/src/pages/Dashboard.tsx` | New page | Shows recent chats from API with counts |
| `src/frontend/src/pages/AdminPanel.tsx` | New page | 3-tab admin UI: Team Members, Team Chats, Invite Member |
| `src/frontend/src/services/adminService.ts` | New file | API calls for all admin endpoints |
| `src/frontend/src/routes.tsx` | Added `/dashboard`, `/admin` routes | Dashboard is Protected; /admin is AdminProtected |
| `src/frontend/src/hooks/useAuth.ts` | role field read from login response | Gates AdminProtected component |

**AdminProtected guard (routes.tsx):**
```tsx
function AdminProtected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/log-in" replace />;
  if (user.role !== "admin") return <Navigate to="/chat/new" replace />;
  return <>{children}</>;
}
```

### 10.8 Chat Persistence in Chatbot

`POST /api/chatbot/process` accepts optional `chat_session_id` parameter. When provided:
- AI response is persisted to `chat_messages` table
- User message is also saved
- `chat_sessions.updated_at` is bumped

**Non-fatal design:** If DB persistence fails, the chat still responds. `_persist_chat_to_db()` catches all exceptions and logs warnings only.

---

## 11. Phase 10 — Admin Panel Enterprise Team Management UI

**Version bump:** 1.8 → 1.9  
**Status:** All 3 plans complete — 85/85 tests, build clean

### 11.1 New Endpoint (Plan 02)

**POST `/api/user/accept-invite`** — Consume team invite token and register invited user

Request (unauthenticated — no Bearer token required):
```json
{
  "token": "string (raw invite token from email URL)",
  "first_name": "string",
  "last_name": "string",
  "password": "string (8+ chars, upper+lower+digit+special)"
}
```

Response 200 (same shape as POST /api/auth/login):
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@acme.com",
  "role": "user"
}
```

Errors:
- `400` — missing fields, weak password, invite already accepted, invite expired
- `404` — token not found (invalid token)
- `409` — email already registered

Security rules:
- Invited user is ALWAYS assigned `role="user"` — cannot become admin via invite
- `team_id` is always taken from the invite record (cannot be overridden by caller)
- Token stored as SHA-256 hash in `team_invites.token_hash` (never the raw token)
- `accepted = True` written atomically with user creation in same DB commit

### 11.2 New Frontend Page (Plan 02)

| File | Purpose |
|------|---------|
| `src/frontend/src/pages/AcceptInvite.tsx` | Registration form for invited users |

**AcceptInvite flow:**
1. Reads `?token=` from URL query string via `useSearchParams()`
2. If no token → renders "Invalid Invite Link" error state (no form)
3. If token present → shows `first_name`, `last_name`, `password` form
4. On submit → `POST /api/user/accept-invite`
5. On success → `setAccessToken(access_token)` (memory only) + `storage.set('auth_user', {...})` + `navigate('/chat/new')`
6. On error → shows error message inline

### 11.3 Route Added (Plan 02)

| Route | Guard | Notes |
|-------|-------|-------|
| `/accept-invite` | None (public) | Invited users are unauthenticated — MUST NOT be inside Protected wrapper |

### 11.4 New DB Tables (Plan 01)

**Migration:** `b3c4d5e6f7a8` — creates `audit_logs` and `system_config` tables

| Table | Purpose | Phase Plan |
|-------|---------|-----------|
| `audit_logs` | Immutable admin action log — role changes, removes, config updates, team creates | 10-01 |
| `system_config` | Key-value configuration store — upserted by admin, consumed by backend | 10-01 |

**`audit_logs` columns:** `id`, `admin_id` (FK users), `action`, `target_user_id` (FK users nullable), `detail` (JSON string), `created_at`

**`system_config` columns:** `key` (PK), `value` (string), `updated_at`, `updated_by` (FK users nullable)

### 11.5 New Admin Endpoints (Plan 01)

8 new endpoints added to `src/backend/routers/admin.py` (all require `require_admin`):

| Method | Path | CASE | Purpose |
|--------|------|------|---------|
| GET | `/api/admin/stats` | CASE-173 | Team-scoped usage: total_users, total_chats, active_sessions, scripts_deployed |
| GET | `/api/admin/users` | CASE-174 | List team members (alias for /api/admin/team) |
| PATCH | `/api/admin/users/{id}/role` | CASE-175 | Change user role ("admin"\|"user") + write audit log |
| DELETE | `/api/admin/users/{id}` | CASE-176 | Soft-delete user (is_active=False, team_id=None) + write audit log |
| GET | `/api/admin/audit` | CASE-177 | 50 most recent AuditLog entries with actor email |
| PUT | `/api/admin/config` | CASE-178 | Upsert SystemConfig key-value + write audit log |
| GET | `/api/admin/license` | CASE-179 | Current license status via validate_license() |
| POST | `/api/admin/teams` | CASE-180 | Create team, assign admin if teamless + write audit log |

**`_write_audit()` helper:** Shared private function — adds AuditLog row to session. Caller commits. Used by role-change, delete-user, config-update, and team-create endpoints.

### 11.6 Extended Frontend (Plan 03)

**AdminPanel.tsx** extended from 3 tabs to 5 tabs:

| Tab | ID | Endpoint | Load Strategy |
|-----|----|----------|--------------|
| Team Members | `members` | `GET /api/admin/team` | On mount |
| Team Chats | `chats` | `GET /api/admin/chats` | Lazy (first activation) |
| Invite Member | `invite` | `POST /api/admin/team/invite` | On submit |
| Usage Stats | `stats` | `GET /api/admin/stats` | Lazy (first activation) |
| Audit Log | `audit` | `GET /api/admin/audit` | Lazy (first activation) |

**Usage Stats tab:** 4 stat cards grid showing `total_users`, `total_chats`, `active_sessions`, `scripts_deployed` from `/api/admin/stats`.

**Audit Log tab:** Table of 50 most recent admin actions with `action`, `actor_email`, `detail`, `created_at` columns from `/api/admin/audit`.

**Role management (Team Members tab):** Non-admin rows show a "Promote" button calling `PATCH /api/admin/users/{id}/role`. Role updates are applied optimistically to local React state on success.

**Remove action updated:** Remove button now calls `DELETE /api/admin/users/{id}` (new endpoint, soft-delete with `is_active=False` + audit log) instead of the old `DELETE /api/admin/team/{id}`.

**adminService.ts extended to 9 exported functions:**

| Function | Method | Path |
|----------|--------|------|
| `listTeamMembers` | GET | `/api/admin/team` |
| `listAllTeamChats` | GET | `/api/admin/chats` |
| `inviteMember` | POST | `/api/admin/team/invite` |
| `removeMember` | DELETE | `/api/admin/team/{id}` |
| `getStats` | GET | `/api/admin/stats` |
| `listUsers` | GET | `/api/admin/users` |
| `changeRole` | PATCH | `/api/admin/users/{id}/role` |
| `deleteUser` | DELETE | `/api/admin/users/{id}` |
| `getAuditLog` | GET | `/api/admin/audit` |

**Invite flow (end-to-end complete):** `POST /api/admin/team/invite` → `send_invite_email()` → invited user clicks link → `/accept-invite?token=xxx` → `AcceptInvite.tsx` → `POST /api/user/accept-invite` → User created with `team_id`, `role="user"`, `invite.accepted=True`.

**AuditLog written on:** `role_changed`, `user_removed`, `team_created`, `config_updated`.

---

## 12. Phase 11 — Password Management + Enterprise Email Flow

**Version bump:** 1.9 → 2.0  
**Date:** 2026-04-11  
**Cases closed:** CASE-181, CASE-184, CASE-185, CASE-186, CASE-187

### 12.1 What Was Added

**email_utils.py — Enterprise HTML Email Templates**
- `token_expiry()` changed from 1h → 15min (industry standard for reset links)
- `_render_reset_email_html()` — branded single-column email, indigo CTA, inline styles
- `_render_verification_email_html()` — click-to-verify email, 24h expiry
- `_render_admin_reset_email_html()` — admin-triggered reset with admin name in body
- `send_reset_email()` updated to send HTML (was plain-text)
- `send_verification_email()` updated: now takes `verify_link` param and sends HTML
- `send_admin_reset_email()` — new function for admin-triggered password resets

**models.py — EmailVerificationToken**
```python
class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id, user_id (FK→users CASCADE), token_hash (unique), expires_at, used, created_at
```

**Alembic migration c4d5e6f7a8b9** — creates `email_verification_tokens` table

**auth_utils.py — Email Verification Enforcement**
- `require_user()` gains `require_verified: bool = True` parameter
- Unverified users receive `403 {error: "email_not_verified"}` on protected endpoints
- `require_user_unverified_ok` alias — for endpoints that work before email is verified

**routers/user.py — 6 New Endpoints**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/user/me` | require_user_unverified_ok | Get profile |
| `PATCH /api/user/me` | require_user_unverified_ok | Update first_name/last_name |
| `DELETE /api/user/me` | require_user_unverified_ok | Soft-delete + blacklist JTI |
| `POST /api/user/change-password` | require_user_unverified_ok | Old password verification |
| `GET /api/user/verify-email?token=` | Public | Consume verification token |
| `POST /api/user/resend-verification` | Public | Anti-enumeration resend |

**register() updated:** generates `EmailVerificationToken` (24h) + sends HTML verify link.

**routers/admin.py — Admin Send Reset**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/admin/users/{user_id}/send-reset` | require_admin | Admin triggers user password reset |

Cross-tenant check: target.team_id == admin.team_id. Writes audit log entry. Sends `send_admin_reset_email` in background.

### 12.2 Email Verification Flow

```
register()
  → create User (is_verified=False)
  → create EmailVerificationToken (24h, SHA-256 hash)
  → background: send_verification_email(email, verify_link)

GET /api/user/verify-email?token=RAW
  → hash_token(raw) → lookup EmailVerificationToken
  → check: not used, not expired
  → user.is_verified = True, token.used = True

require_user(require_verified=True) — default for all protected endpoints
  → if not user.is_verified → 403 {error: "email_not_verified"}

Endpoints exempt from verification:
  GET/PATCH/DELETE /api/user/me
  POST /api/user/change-password
  GET /api/user/verify-email (public, no auth)
  POST /api/user/resend-verification (public, no auth)
```

### 12.3 Admin Password Reset Flow

```
POST /api/admin/users/{id}/send-reset
  → check target on admin's team
  → invalidate all existing reset tokens for target
  → create PasswordResetToken (15min)
  → write audit: "admin_password_reset_sent"
  → background: send_admin_reset_email(target.email, reset_link, admin_name)
```

### 12.4 Test Coverage

11 new tests covering CASE-181/184/185/186/187 (96 total, 5 skipped).

conftest.py adds `@event.listens_for(User, "init")` auto-verify listener so existing tests work correctly with the new enforcement. Tests that need unverified behavior use raw SQL UPDATE to bypass the listener.

### 12.5 Frontend UX — Plan 02 (Phase 11, 2026-04-11)

**authService.ts** — 4 new exported functions:
- `getProfile()` — GET /api/user/me with Bearer token → returns id, first_name, last_name, email, role, is_verified
- `changePassword(old_password, new_password)` — POST /api/user/change-password
- `resendVerification(email)` — POST /api/user/resend-verification (public, no auth token required)
- `patchUser(data)` — PATCH /api/user/me with first_name and/or last_name

**adminService.ts** — 1 new exported function:
- `sendPasswordReset(userId)` — POST /api/admin/users/{id}/send-reset with adminHeaders()

**ForgotPassword.tsx** — Success state: after submit, show "Check your inbox" card (Mail icon, spam note, Back to sign in). No longer navigates to /reset-password/:token (dev shortcut removed).

**ResetFailed.tsx** — Inline resend form with 60-second cooldown. Users enter email, click "Send new link", see 60s countdown before retry is enabled. No navigate-away.

**ResetPassword.tsx** — Password validation upgraded from 6-char minimum to full policy: 8+ chars, uppercase, lowercase, digit, special character (`!@#$%^&*(),.?":{}|<>`).

**Profile.tsx** — Change Password section added: three password fields (current, new, confirm), full policy validation, success/error feedback, calls `changePassword()`.

**EmailVerificationBanner.tsx** (new component) — Amber banner rendered for unverified users. Calls `getProfile()` on mount to check `is_verified`. Shows "Resend email" button with 60s cooldown. Dismissible via X button. Fails open (shows nothing if API fails).

**Chat.tsx** — `EmailVerificationBanner` imported and rendered immediately below `LicenseBanner` in the flex-1 content area.

**AdminPanel.tsx** — "Send Reset" button added to each team member row in the Team Members tab. Calls `sendPasswordReset(member.id)`. Shows "Sent!" feedback for 3 seconds after success.

**VerifyEmail.tsx** (new page) — Public route `/verify-email?token=...`. On mount calls `GET /api/user/verify-email?token=`. Shows success/error states. Error state includes inline resend form.

**routes.tsx** — `/verify-email` registered as public route (no auth required — users may not be logged in when clicking email link).

---

## 13. Phase 12 — Security Hardening and SOC2 Readiness (Plan 01)

**SOC2 CC7.2 — Audit Log Expansion**

### 13.0 Audit Log Architecture (CASE-192)

Phase 10 introduced `AuditLog` covering only admin actions (role changes, user removals). Phase 12 Plan 01 extends it to cover all authentication and user events required for SOC2 CC7.2 compliance (logical access monitoring).

**audit_utils.py** — new shared helper module. Imported by all three router files. No circular imports — only imports `models.AuditLog` and `sqlalchemy`.

```python
async def write_audit_event(db, actor_email, actor_role, action, result, ip_address=None, target=None)
```

- Caller MUST commit after calling — audit write is atomic with the parent operation
- If parent operation rolls back, audit entry is also rolled back (no orphan logs)

### 13.1 Expanded AuditLog Model

| Column | Type | Description |
|--------|------|-------------|
| `actor_email` | String (nullable) | String (not FK) — survives account deletion |
| `actor_role` | String (nullable) | "admin" or "user" at time of action |
| `action` | String (not null) | Dot-notation: "auth.login_success", "admin.role_changed" |
| `result` | String (nullable) | "success" or "failure" |
| `ip_address` | String (nullable) | Client IP from X-Real-IP or request.client.host |
| `target` | String (nullable) | user_id, email, or config key as string |
| `admin_id` | Integer (nullable) | Phase 10 legacy column (now nullable) |
| `target_user_id` | Integer (nullable) | Phase 10 legacy column |
| `detail` | String (nullable) | Phase 10 legacy column |
| `created_at` | DateTime | Auto-set on insert |

**Alembic migration:** `d5e6f7a8b9ca_phase12_audit_expansion.py`
- Adds 5 new nullable columns to `audit_logs`
- Alters `admin_id` from NOT NULL to nullable
- Creates composite index `ix_audit_logs_ts_actor` on `(created_at, actor_email)`

### 13.2 Audit Event Taxonomy

| Event | Action String | Fired In |
|-------|--------------|----------|
| Successful login | `auth.login_success` | `routers/auth.py` login |
| Failed login | `auth.login_failed` | `routers/auth.py` login (3 paths: bad email, bad password, lockout) |
| Logout | `auth.logout` | `routers/auth.py` logout |
| Token refresh success | `auth.token_refresh` | `routers/auth.py` refresh |
| Token refresh failure | `auth.token_refresh_failed` | `routers/auth.py` refresh |
| New user registration | `auth.register` | `routers/user.py` register |
| Forgot password request | `user.forgot_password` | `routers/auth.py` forgot-password |
| Password reset via link | `user.password_reset` | `routers/auth.py` reset-password |
| Password changed in-app | `user.password_changed` | `routers/user.py` change-password |
| Account deleted | `user.account_deleted` | `routers/user.py` delete /me |
| Email verification resend | `user.email_resend` | `routers/user.py` resend-verification |
| Admin changed user role | `admin.role_changed` | `routers/admin.py` PATCH /users/{id}/role |
| Admin removed user | `admin.user_removed` | `routers/admin.py` DELETE /users/{id} |
| Admin sent team invite | `admin.invite_sent` | `routers/admin.py` POST /team/invite |
| Admin updated config | `admin.config_updated` | `routers/admin.py` PUT /config |
| Admin sent password reset | `admin.password_reset_sent` | `routers/admin.py` POST /users/{id}/send-reset |
| Admin created team | `admin.team_created` | `routers/admin.py` POST /teams |

### 13.3 Paginated Audit API

`GET /api/admin/audit` now accepts `?offset=0&limit=50` (max 200). Returns newest-first. Response fields: `id`, `action`, `actor_email`, `actor_role`, `result`, `ip_address`, `target`, `target_user_id`, `detail`, `created_at`.

**Append-only invariant:** No PUT/PATCH/DELETE endpoint exists for `/api/admin/audit/{id}`. AuditLog rows are never modified after creation.

### 13.4 Security Tests (Plan 01)

5 new tests in `tests/security/test_audit_log.py`:
- `test_login_success_creates_audit_log` — verifies `auth.login_success` row in DB after successful login
- `test_login_failure_creates_audit_log` — verifies `auth.login_failed` row after wrong password
- `test_audit_log_has_no_mutation_endpoints` — PUT/DELETE on `/api/admin/audit/{id}` return 404/405
- `test_get_admin_audit_returns_paginated_results` — offset/limit params work, response is list
- `test_registration_creates_audit_log` — `auth.register` row created after user registration

---

## 14. Phase 12 — Security Hardening and SOC2 Readiness (Plan 02)

**Version bump:** 2.0 → 2.1 (network + infrastructure layer hardened)

### 14.1 Network Security Controls (CASE-188, CASE-189, CASE-195)

**nginx.prod.conf** — production-only config separates dev from production TLS:

| Control | Value | SOC2 Control |
|---------|-------|-------------|
| HTTP→HTTPS redirect | Port 80: `return 301 https://$host$request_uri` | CC6.7 |
| TLS versions | `ssl_protocols TLSv1.2 TLSv1.3` only — SSLv3, TLS 1.0, TLS 1.1 explicitly absent (RFC 8996) | CC6.7 |
| Cipher suite | Mozilla Intermediate profile (ECDHE-RSA-AES128-GCM-SHA256 et al.) | CC6.7 |
| HSTS | `Strict-Transport-Security: max-age=31536000; includeSubDomains` | CC6.7 |
| X-Frame-Options | `DENY` — prevents clickjacking | CC6.8 |
| X-Content-Type-Options | `nosniff` — prevents MIME sniffing | CC6.8 |
| Referrer-Policy | `strict-origin-when-cross-origin` | CC6.8 |
| CSP | `Content-Security-Policy-Report-Only` (report mode for v1.0 — no React blocking) | CC6.8 |

**nginx.conf** (dev) — unchanged. Port 80 only, no TLS. Docker Compose dev workflow unaffected.

File: `nginx/nginx.prod.conf`

### 14.2 CORS Tightening (CASE-190)

**rawapi.py** CORS middleware updated:
- `ALLOWED_ORIGINS` env var: comma-separated list of allowed origins (production)
- Falls back to `FRONTEND_BASE_URL` (single origin)
- Falls back to dev localhost list (ports 5173-5180, 127.0.0.1:5173)
- `allow_credentials=False` — JWT sent via `Authorization: Bearer` header, not cookies. No CSRF vector by design.
- No wildcard `*` origin permitted in any environment.

### 14.3 EBS Encryption at Rest (CASE-193)

**infra/terraform/main.tf** `root_block_device` block:
```hcl
encrypted = true   # AES-256, AWS-managed KMS key (aws/ebs default alias)
```
`kms_key_id` omitted — AWS uses default `aws/ebs` managed key. Customer does not need to manage keys for v1.0.

SOC2 control: A1.1 (availability and encryption of data at rest).

### 14.4 Static Analysis Security Tests (Plan 02)

14 new static-analysis tests in `src/backend/tests/security/`:

| File | Tests | What it verifies |
|------|-------|-----------------|
| `test_security_headers.py` | 5 | HSTS, X-Frame-Options:DENY, X-Content-Type-Options:nosniff, Referrer-Policy, CSP-Report-Only |
| `test_https_redirect.py` | 2 | Port 80 redirects to HTTPS, dev nginx.conf unchanged |
| `test_tls_config.py` | 3 | TLS 1.2/1.3 only, no deprecated protocols, Mozilla cipher suite |
| `test_csrf.py` | 3 | No JWT in Set-Cookie, no wildcard CORS, ALLOWED_ORIGINS env var |
| `test_encryption.py` | 1 | `encrypted = true` inside `root_block_device` in Terraform |

Tests parse config files on disk — no live HTTP requests. Nginx headers are not visible to HTTPX test client (which talks to FastAPI directly), so static analysis is the correct testing pattern.

### 14.5 Updated Services Table

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| Frontend (prod) | React + nginx | 443 (TLS) | UI, SPA routing, /api proxy — production only |
| Frontend (dev) | React + nginx | 80 | UI, SPA routing, /api proxy — dev only |
| Backend | Python FastAPI | 8000 | All business logic, auth, AI routing |
| LLM | Ollama | 11434 | Local inference, embeddings (internal only) |
| DB | SQLite | N/A (file) | User auth, chat, license cache — EBS-encrypted |
| FAISS | File | N/A (file) | NetSuite knowledge vector index — EBS-encrypted |

---

## 15. Phase 12 — Security Hardening and SOC2 Readiness (Plan 03)

**Documentation Closure — CASE-188 through CASE-195 all marked DONE**
**Date:** 2026-04-10

### 15.1 pip-audit Dependency Vulnerability Scan (CASE-191)

**Tool:** pip-audit v2.10.0
**Findings:** 14 vulnerabilities in 8 packages — **0 CRITICAL, 0 HIGH, 14 MEDIUM**

| Root cause | Packages | Plan |
|-----------|---------|------|
| langchain-core pinned to 0.3.63 (langgraph 0.2.38 requires <0.4) | langchain-core, langchain-community, langchain-text-splitters, langgraph, langgraph-checkpoint | v2.0 LangChain ecosystem upgrade |
| FastAPI transitive dependency | starlette 0.38.6 | v1.1 FastAPI version bump |
| Minor JWT and form-data libs | pyjwt 2.9.0, python-multipart 0.0.12 | v1.1 |

Zero attack surface for pyjwt (no external JWTs with `crit` header). Zero form-data usage on ArthaBuild auth paths.
Full triage rationale: `docs/security/ZAP_SCAN_REPORT.md`

### 15.2 OWASP ZAP Scan Documentation (CASE-194)

**Status:** Methodology documented. Live scan pending (requires running docker-compose stack).

**Manual run command:**
```bash
docker run --network=host ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \
  -t http://localhost -r zap-report.html -J zap-report.json
```

**Acceptance criterion for production release:** Zero HIGH or CRITICAL findings in ZAP active scan output.
**Static analysis equivalent (14 tests):** All nginx security controls verified via `tests/security/` test suite.

### 15.3 SOC2 Readiness Documentation Suite

**Location:** `docs/security/`

| Document | SOC2 Controls | Purpose |
|----------|--------------|---------|
| `SECURITY_CONTROLS.md` | CC6.1/2/6/7/8, CC7.2, CC8.1, A1.1/2 | Full control checklist mapping Phases 1-12 to SOC2 evidence |
| `INCIDENT_RESPONSE.md` | P1/P2/P3 severity tiers | 5-step runbook with exact containment commands |
| `DATA_CLASSIFICATION.md` | Data inventory | Sensitivity levels, retention rules, deletion procedures |
| `DEPLOYMENT_SECURITY.md` | Pre-deployment checklist | nginx.prod.conf, TLS, EBS encryption, key rotation |
| `ZAP_SCAN_REPORT.md` | CC8.1 | pip-audit results + ZAP methodology + static analysis evidence |

**SECURITY.md** at repo root — GitHub vulnerability disclosure convention.
**Email:** security@techcloudpro.com | 48-hour acknowledgment SLA.

### 15.4 Phase 12 CASE Closure

| CASE | Title | SOC2 Control | Evidence |
|------|-------|-------------|---------|
| CASE-188 | HTTPS redirect (port 80 → 443) | CC6.7 | `nginx/nginx.prod.conf:return 301` + `test_https_redirect.py` |
| CASE-189 | Security headers in nginx.prod.conf | CC6.7/CC6.8 | HSTS, X-Frame:DENY, X-Content-Type:nosniff, Referrer-Policy, CSP-Report-Only + `test_security_headers.py` |
| CASE-190 | CSRF protection via JWT-in-header design | CC6.8 | `rawapi.py` ALLOWED_ORIGINS + allow_credentials=False + `test_csrf.py` |
| CASE-191 | pip-audit: zero HIGH/CRITICAL | CC8.1 | `docs/security/ZAP_SCAN_REPORT.md` — 14 MEDIUM, all triaged |
| CASE-192 | Audit log expansion: 15+ event types | CC7.2 | `audit_utils.py` + AuditLog model + 5 security tests |
| CASE-193 | EBS encryption at rest | A1.1 | `infra/terraform/main.tf:encrypted=true` + `test_encryption.py` |
| CASE-194 | OWASP ZAP baseline scan documented | CC8.1 | `docs/security/ZAP_SCAN_REPORT.md` — methodology + static analysis |
| CASE-195 | TLS 1.2/1.3 only (no SSLv3/1.0/1.1) | CC6.7 | `nginx/nginx.prod.conf:ssl_protocols TLSv1.2 TLSv1.3` + `test_tls_config.py` |

### 15.5 Test Suite at Phase 12 Complete

| Category | Tests | Status |
|----------|-------|--------|
| Backend (pytest) — Phase 1-12 | 115 | All pass |
| Backend skipped (test ordering edge cases) | 5 | Expected |
| Frontend (vitest) | 24 | All pass |
| Phase 12 security static analysis | 19 (14 Plan 02 + 5 Plan 01) | All pass |

Full suite command: `cd src/backend && pytest tests/ -v`

---

## Phase 18: Cloudflare Edge Security (v2.8)

### 18.1 Network Topology (Updated)

Traffic flow: Browser → Cloudflare Edge (artha.build) → EC2 nginx → FastAPI backend

Cloudflare edge handles (before reaching origin):
- DDoS protection (L3/L4/L7) — automatic, no config required
- WAF: Cloudflare Managed Ruleset + OWASP CRS (Pro plan) in LOG→block mode
- WAF rate limiting: /api/* at 60 req/min per IP (excluding /api/chatbot/)
- HTTPS redirect: HTTP → HTTPS 301 at edge (Redirect Rules, not Page Rules)
- Cache rules: /api/* and /health bypass cache; static assets (JS/CSS/images) cached 1 year
- Security headers: Permissions-Policy + enforcing CSP added via Transform Rules

### 18.2 Header Ownership

| Header | Set By | Notes |
|--------|--------|-------|
| Strict-Transport-Security | nginx.prod.conf | max-age=31536000; includeSubDomains |
| X-Frame-Options | nginx.prod.conf | DENY |
| X-Content-Type-Options | nginx.prod.conf | nosniff |
| Referrer-Policy | nginx.prod.conf | strict-origin-when-cross-origin |
| Content-Security-Policy-Report-Only | nginx.prod.conf | Report-only for Phase 17 onwards |
| Content-Security-Policy (enforcing) | Cloudflare Transform Rules | Added Phase 18 |
| Permissions-Policy | Cloudflare Transform Rules | Added Phase 18 |

### 18.3 Cloudflare Configuration Artifacts

- `scripts/cloudflare-setup.sh` — Plan 01: DNS proxy, SSL Full Strict, zone settings, redirect/cache rules
- `scripts/cloudflare-setup-02.sh` — Plan 02: WAF, Transform Rules, rate limiting, analytics verification
- Analytics: Cloudflare Analytics GraphQL (httpRequestsAdaptiveGroups dataset) — pageviews, country, path, bot score

---

---

## 19. Phase 19 — Knowledge Base Expansion (Plans 01-03)

**Version bump:** 2.8 → 3.0
**Status:** Plan 03 Complete — Ingest pipeline + retrieval test suite deployed

### 19.1 Bootstrap Knowledge Base (95 files total)

Phase 19 expands the pre-built bootstrap knowledge base from 48 to 95 markdown files.

**Plan 19-01 (48 files):** SuiteScript modules, script types, and core record reference
**Plan 19-02 (47 files):** Platform features, business processes, implementation patterns
**Plan 19-03 (scripts):** Ingest pipeline (ingest_bootstrap.py) + retrieval test suite (test_retrieval.py)

### 19.2 New Knowledge File Categories

| Category                | File Count | Prefix     | Coverage                                     |
|-------------------------|------------|------------|----------------------------------------------|
| Platform Features       | 13         | feature-   | SuiteFlow, SuiteQL, ARM, OneWorld, WMS, SDF |
| Navigation Reference    | 1          | navigation-| All menu paths for common operations         |
| Error Reference         | 1          | errors-    | Common errors, debugging, troubleshooting    |
| O2C Process             | 5          | process-o2c-| Quote→SO→Fulfillment→Invoice→Payment       |
| P2P Process             | 5          | process-p2p-| PR→PO→Receipt→Bill→Payment                 |
| Other Business Processes| 17         | process-   | CRM, manufacturing, inventory, HR, tax, etc. |
| Implementation Patterns | 5          | pattern-   | Integration, bulk ops, approvals, GL, PDF   |

### 19.3 Bootstrap File Location

```
src/backend/knowledge/bootstrap/
├── feature-*.md        (13 files: features and platform capabilities)
├── module-*.md         (26 files: SuiteScript modules — from Plan 01)
├── record-*.md         (10 files: core record types — from Plan 01)
├── script-*.md         (12 files: script types — from Plan 01)
├── navigation-paths.md (comprehensive menu navigation reference)
├── errors-troubleshooting.md (error codes and debugging)
├── process-*.md        (27 files: business processes O2C/P2P/R2R/etc.)
└── pattern-*.md        (5 files: implementation patterns)
```

### 19.4 Ingest Pipeline (Plan 19-03)

```
src/backend/scripts/ingest_bootstrap.py   — rebuild FAISS from knowledge/bootstrap/
src/backend/scripts/test_retrieval.py     — 20 ground-truth retrieval tests (>= 18/20 to pass)
```

**Startup sequence (docker-compose):**
1. `ollama` service starts + healthcheck passes
2. `backend` runs `ingest_bootstrap.py` (polls nomic-embed-text ready, max 10 min)
3. Ingest: load 95 .md files → MarkdownHeaderTextSplitter + RecursiveCharacterTextSplitter (3200 char)
4. Embed 1251 chunks with nomic-embed-text → write to `_new`, atomic swap to `vectorstore_ollama/`
5. uvicorn starts after ingest completes
6. nginx healthcheck passes after uvicorn is up

**Env vars added:**
- `KNOWLEDGE_PATH=/app/knowledge/bootstrap` — source docs
- `CUSTOMER_INDEX_PATH=/app/data/customer_index` — per-tenant FAISS (future)
- `CUSTOMER_KNOWLEDGE_PATH=/app/data/customer_knowledge` — per-tenant docs (future)

**Healthcheck timing:** `start_period: 120s` (was 30s) — accounts for 60-90s ingest on cold start.

### 19.5 Customer Instance Knowledge Pull (Plan 19-04)

**Version bump:** 3.0 → 3.1
**Status:** Complete

On TBA connect, ArthaBuild pulls 6 live data sources from the customer's NetSuite account,
converts them to structured markdown, and builds a customer-specific FAISS index alongside
the bootstrap index. The customer index gives personalized RAG answers based on actual
custom fields, records, scripts, and workflows in their specific account.

#### Pull Pipeline

```
scripts/pull_customer_knowledge.py  — main puller
  ├── pull_account_metadata()       — Pull 1: SuiteQL companyPreferences
  ├── pull_custom_fields()          — Pull 2: SuiteQL customfield grouped by appliesTo
  ├── pull_custom_records()         — Pull 3: SuiteQL customrecordtype
  │   └── (per record)             — Pull 4: REST /record/v1/metadata-catalog/{scriptId}
  ├── pull_deployed_scripts()       — Pull 5: SuiteQL script table
  ├── pull_workflows()              — Pull 6: SuiteQL workflow table
  └── build_customer_index()        — embed markdown → FAISS at CUSTOMER_INDEX_PATH
```

#### Admin API

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/admin/knowledge/refresh` | POST | Admin JWT | Trigger re-pull from NetSuite |
| `/api/admin/knowledge/status` | GET | Admin JWT | doc_count, last_built, status |

#### Trigger Points

1. **Automatic:** `POST /api/netsuite/authenticate` (TBA connect) → fires `asyncio.create_task()` with `run_in_executor(pull_all)` — non-blocking, non-fatal
2. **Manual:** `POST /api/admin/knowledge/refresh` → same pipeline on demand

#### Output Locations

```
data/customer_knowledge/         — markdown files (written per pull)
  account-metadata.md
  custom-fields-{recordtype}.md  (one file per record type)
  custom-record-{scriptid}.md    (one file per custom record type)
  deployed-scripts.md
  active-workflows.md

data/customer_index/             — FAISS index (CUSTOMER_INDEX_PATH)
  index.faiss
  index.pkl
```

#### Security

- TBA credentials received as in-memory dict (never written to disk or logs)
- All 6 SuiteQL/REST calls use ephemeral OAuth 1.0a headers (HMAC-SHA256)
- Customer index is flat path (single-tenant BYOC) — no per-user subdirs

#### Deviation from Plan

- **Fixed:** Plan's `knowledge.py` called `get_session()` (does not exist in session_store.py). Corrected to `get_session_creds(user_id)` with NetSuiteCreds → dict conversion.

### 19.6 Knowledge Base Admin UI (Plan 19-05)

The AdminPanel now includes a "Knowledge Base" tab (`KnowledgeBaseTab.tsx`).

#### Component: `KnowledgeBaseTab.tsx`

| Feature | Detail |
|---|---|
| Status indicator | `ready` / `building` / `error` / `not_built` / `unknown` with color coding |
| Last updated | ISO timestamp formatted via `toLocaleString()` |
| Refresh button | `POST /api/admin/knowledge/refresh` — orange-500, disabled while building |
| Polling | `GET /api/admin/knowledge/status` on mount + every 5s while `status === 'building'` |
| Customer index stats | custom_fields, custom_records, deployed_scripts, workflows (4 stat cards) |
| Bootstrap index | 95 reference documents card |
| Token source | `getAccessToken()` from `services/api.ts` (memory-only, never localStorage) |

#### AdminPanel Integration

- `Tab` union extended with `"knowledge"`
- `navItems` entry: `{ id: "knowledge", label: "Knowledge Base", icon: Database }`
- Content rendered via `{activeTab === "knowledge" && <KnowledgeBaseTab />}`

---

## 20. Zero-Hallucination Validation Gate (v3.3)

Branch `gsd/netsuite-eval-harness`. Plan: `docs/superpowers/plans/2026-04-17-zero-hallucination-gate-implementation.md`.

### 20.1 Goal

Guarantee that every SuiteScript emitted by the LLM references only real NetSuite identifiers — no hallucinated `record.Type.*`, `N/*` module, `@NScriptType`, `search.Type.*`, or `search.*` method ever reaches the user.

### 20.2 Components (`src/backend/validators/`)

| File | Responsibility |
|---|---|
| `whitelist.py` | Committed sets: `RECORD_TYPES`, `MODULES`, `SCRIPT_TYPES`, `SEARCH_TYPES`, `SEARCH_APIS` (authoritative NetSuite canon) |
| `ast_utils.py` | `nearest(ident, whitelist, k=3)` — Levenshtein-ranked suggestions for re-prompt hints |
| `checkers/base.py` | `Checker` ABC, `LintResult`, `Violation` dataclass |
| `checkers/record_type.py` | `record.Type.<IDENT>` regex extractor |
| `checkers/module.py` | `define([...])` / `require([...])` extractor |
| `checkers/script_type.py` | `@NScriptType <IDENT>` + `search.Type.<IDENT>` extractor |
| `checkers/search_api.py` | `search.<method>(` extractor with member-expression guard |
| `linter.py` | `SuiteScriptLinter` orchestrator + non-ASCII pre-pass + `extract_first_code_block()` |
| `reprompt.py` | `run_validation_loop()` — bounded 2-attempt re-prompt loop + `build_refusal_message()` + metrics |
| `__init__.py` | Public API surface |

### 20.3 Control Flow

```
generate_suitescript intent in rawapi.py
    │
    ▼
graph.invoke(input_data)  ── initial LLM response (fenced code)
    │
    ▼
run_validation_loop(initial_response, pipeline)
    │
    ├─ extract_first_code_block()
    ├─ SuiteScriptLinter.lint(code)
    ├─ if violations == 0:         ── outcome: "clean"     ── passthrough
    ├─ else re-prompt #1 (with nearest() suggestions)
    │    └─ if clean:              ── outcome: "recovered" ── return recovered code
    ├─ else re-prompt #2
    │    └─ if clean:              ── outcome: "recovered" ── return recovered code
    ├─ else:                       ── outcome: "hard_blocked"
    │    └─ build_refusal_message() (NO code fence in reply)
    └─ budget guard: pipeline_t0 + 90s exceeded ── outcome: "hard_blocked" (no further re-prompts)
```

Wired in at `src/backend/rawapi.py:~475` (`pipeline_t0`) and the `generate_suitescript` intent branch via an inline async closure that preserves `intent` + `history_snapshot` across re-prompts. Gate runs AFTER quota record, BEFORE the review-prompt append (hard-blocks skip the append because they contain no fence).

### 20.4 Metrics (`logger.info("generate_suitescript validator metrics: %s", ...)`)

| Field | Meaning |
|---|---|
| `outcome` | `clean` / `recovered` / `hard_blocked` |
| `violations_initial` | Violation count from first LLM response |
| `violations_reprompt_1` | Violation count after re-prompt #1 (or `None` if not attempted) |
| `violations_reprompt_2` | Violation count after re-prompt #2 (or `None` if not attempted) |
| `elapsed_ms` | Wall time for the validation loop |
| `budget_exceeded` | `True` if `pipeline_t0 + 90s` was hit before validation completed |

These are the production signal for end-to-end hallucination rate.

### 20.5 Test Coverage

| Suite | Files | Tests |
|---|---|---|
| Whitelist drift | `tests/validators/test_whitelist_drift.py` | 6 |
| Per-checker | `tests/validators/test_record_type.py`, `test_module.py`, `test_script_type.py`, `test_search_api.py` | 92 |
| Reprompt + budget | `tests/validators/test_reprompt.py` | (covered by integration) |
| Integration (clean / recovered / hard_blocked / budget) | `tests/validators/test_integration.py` | 4 |
| Stress corpus (160 adversarial targets) | `tests/eval/stress/{record_type,module,script_type,search}.jsonl` | — |
| Stress runner (Path A — static linter coverage) | `tests/eval/run_stress.py` | 2 |

**Totals:** 104 validator tests + 2 stress-runner tests = **106 PASS**. Stress run: **160/160 (100%) flagged**.

See `tests/eval/stress/RESULTS.md` for full per-category breakdown.

### 20.6 Frozen Interfaces

| Interface | Value | Consumers |
|---|---|---|
| `run_validation_loop(user_input, initial_response, pipeline, pipeline_t0)` | returns `(response_str, metrics_dict)` | `rawapi.py` generate_suitescript branch |
| 90s budget | From `pipeline_t0` to validation-loop exit | Prevents runaway re-prompt cost |
| Max re-prompts | 2 (total 3 LLM calls: initial + 2 retries) | Hard-block threshold |
| Refusal message | No code fence, contains "couldn't verify" / "hold" | Downstream cannot mistake refusal for code |

---

*Document End — Version 3.3*
*All phase plans must cite this document as the source of truth.*
*Changes to this document require updating ALL dependent phase plans.*
