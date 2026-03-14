# Identity & Authentication Security — Complete Backend Audit

> **Anti-hallucination rule applied**: Every claim below has a verified `file:line` reference.
> Last audited: 2026-03-14 against commit `be055f5c`

---

## 1. JWT Implementation

| Property | Value | Source |
|----------|-------|--------|
| Algorithm | HS256 (HMAC-SHA256) | `main_new.py:1045` |
| Secret key | `JWT_SECRET_KEY` env var | `main_new.py:1042` |
| Missing key behaviour | `RuntimeError` at startup | `main_new.py:1043–1044` |
| Token lifetime | 30 days (43 200 min) | `main_new.py:1046` |
| Token creation fn | `create_access_token()` | `main_new.py:1177–1185` |

**JWT Claims carried in every token:**

| Claim | Value | Set at |
|-------|-------|--------|
| `sub` | User email | `main_new.py:1970`, `2485`, `3047`, `3451` |
| `role` | `customer / driver / vendor / admin` | Same locations |
| `customer_id` | Customer DB id | `main_new.py:3451` |
| `driver_id` | Driver DB id | `main_new.py:3047` |
| `vendor_id` | Vendor DB id | `main_new.py:2485` |
| `exp` | Unix timestamp (30 days out) | `main_new.py:1183` |

Password-reset tokens additionally carry `"type": "password_reset"` with 1-hour TTL (`main_new.py:2775–2776`).

---

## 2. Password Hashing

- **Library**: `passlib` with `CryptContext` — `main_new.py:1038`
- **Algorithm**: bcrypt (auto-salted) — `CryptContext(schemes=["bcrypt"], deprecated="auto")`
- **Hash fn**: `get_password_hash(password)` → `pwd_context.hash()` — `main_new.py:1174–1175`
- **Verify fn**: `verify_password(plain, hashed)` → `pwd_context.verify()` (constant-time) — `main_new.py:1171–1172`

**Hashed on**: customer register (`3499`), driver register (`3010`), vendor register (`2471`), password reset (`2813`, `6523`, `6603`), Apple OAuth fallback (`6377`).

---

## 3. Password Policy

Function: `_validate_password(password)` — `main_new.py:604–634`

| Rule | Code location |
|------|---------------|
| Min 8 characters | `main_new.py:615` |
| ≥1 uppercase letter | `main_new.py:620` |
| ≥1 lowercase letter | `main_new.py:625` |
| ≥1 digit | `main_new.py:630` |

Enforced on: vendor register (`2441`), driver register (`2987`), customer register (`3484`), food-customer register (`6230`).

---

## 4. Login Endpoints (All 4 Roles)

### `/api/auth/customer/login` — `main_new.py:3417–3460`
- Form: `OAuth2PasswordRequestForm` (username = email)
- Password verified via `verify_password()` at `main_new.py:3437`
- Checks `is_active` flag at `main_new.py:3444`
- Rate limit: 10/min/IP — `main_new.py:3423` (demo accounts exempt)
- Returns: `access_token`, `customer_id`, `name`, `email`, `phone`
- Generic error: "Incorrect email or password" — `main_new.py:3433`

### `/api/auth/driver/login` — `main_new.py:2874–2925`
- Same form pattern; filters by `UserRole.DRIVER`
- Checks status ≠ SUSPENDED at `main_new.py:2910`
- Rate limit: 10/min/IP — `main_new.py:2879`
- Returns: `access_token`, `driver_id`, `driver_code`, `name`, `is_approved`

### `/api/auth/vendor/login` — `main_new.py:2011–2066`
- Checks `onboarding_status == APPROVED` at `main_new.py:2041`
- Rate limit: 10/min/IP — `main_new.py:2016`
- Returns: `access_token`, `vendor_id`, `business_name`

### `/api/admin/login` — `main_new.py:1940–1981`
- Filters by `UserRole.ADMIN`
- Rate limit: 10/min/IP — `main_new.py:1988`
- Returns: `access_token`, full user object

---

## 5. OAuth Flows

### Google OAuth
- Token decode fn: `decode_google_jwt()` — `main_new.py:2535–2554`
  - ⚠️ Decodes WITHOUT signature verification (splits JWT, base64-decodes middle segment)
  - Extracts `email`, `name`, `sub` (google_id)
- Endpoints: customer (`3567`), driver (`3093`), vendor (`2556`)
- **New user / new role**: Returns 403 + `registration_url` + `requires_registration: true` — `main_new.py:2604–2611`, `3135–3151`
- **Returning user**: Issues JWT and returns

### Apple OAuth
- Uses same `decode_google_jwt()` to decode `identity_token` — `main_new.py:3190`
- ⚠️ No nonce validation
- Lookup order: `apple_id` first → email fallback — `main_new.py:3209`
- Stores `apple_id` on first Apple login — `main_new.py:3236`
- Endpoints: customer (`6325`), driver (`3179`), vendor (`2652`)

---

## 6. Auth Middleware Stack (Execution Order)

```
Request
  │
  ├─ fix_cors_and_security_headers     main_new.py:162
  ├─ limit_request_size (10 MB)         main_new.py:185
  ├─ bot_blocklist_middleware            main_new.py:262
  │   └─ exempts: 127.0.0.1, /robots.txt, /health endpoints
  ├─ admin_auth_middleware               main_new.py:308
  │   └─ applied to: /api/admin/*
  │   └─ accepts: JWT Bearer OR ADMIN_SECRET_KEY query param
  └─ require_auth_middleware             main_new.py:516
      └─ global catch-all, defence-in-depth
      └─ exempts: 39 exact public paths + prefixes + patterns
```

**Public paths (39 exact, `main_new.py:378–462`)**: auth endpoints, health, legal, config, public listings, WebSocket, fare estimates, etc.

---

## 7. Auth Utility Functions (`auth_utils.py`)

| Function | Returns | Checks | Location |
|----------|---------|--------|----------|
| `require_any_auth` | JWT payload dict | Valid JWT | `auth_utils.py:43–74` |
| `require_customer` | Customer ORM | `customer_id` claim + DB lookup | `auth_utils.py:77–120` |
| `require_driver` | Driver ORM | `driver_id` claim + DB lookup | `auth_utils.py:123–169` |
| `require_vendor` | Vendor ORM | `vendor_id` claim + DB lookup | `auth_utils.py:172–215` |
| `require_admin` | User ORM | `role == ADMIN` in DB | `auth_utils.py:218–265` |

All use `auto_error=False` on `OAuth2PasswordBearer` for cleaner 401 messages — `auth_utils.py:36`.

---

## 8. Role-Based Access Control (RBAC)

Four enforcement layers:
1. **JWT claim check** (lightweight, in endpoint) — `main_new.py:1970`, `3451`
2. **ID claim check** via `require_*` dependency — `auth_utils.py:97–107`
3. **DB role column check** (admin) — `auth_utils.py:253`
4. **Entity query filter** (e.g. `UserRole.DRIVER` on login) — `main_new.py:2020–2021`

---

## 9. Token Refresh / Session Management

- **Status**: ❌ No refresh token support
- Access tokens: 30-day absolute expiry (`main_new.py:1046`)
- No sliding window, no renewal endpoint
- No server-side session store
- **Logout**: No token blacklist — client deletes token locally
  - Exception: password reset tokens are one-time-use (`main_new.py:2796–2806`)

---

## 10. Rate Limiting on Auth Endpoints

| Limiter | Limit | Applied to |
|---------|-------|-----------|
| `auth_rate_limiter` | 10 req/min/IP | All 4 login endpoints |
| `registration_rate_limiter` | 5 req/hr/IP | All 4 register endpoints |
| `password_reset_limiter` | 5 req/hr/email | Password reset request |
| `password_reset_ip_limiter` | 5 req/hr/IP | Password reset request (anti-SMTP amplification) |

Source: `main_new.py:572–578`. Implementation: Redis sorted-set sliding window, in-memory fallback — `cache.py:143–177`.

IP extracted from `X-Forwarded-For[-2]` (CloudFront real IP) — `cache.py:209–211`.

Demo account emails exempt — `main_new.py:585–590`.

---

## 11. Account Enumeration Protection

| Scenario | Error returned | Source |
|----------|---------------|--------|
| Login — email not found | "Incorrect email or password" | `main_new.py:1959`, `2027`, `3433` |
| Login — wrong password | Same message above | same |
| Register — email already exists | "Registration failed. If you already have an account, please log in." | `main_new.py:2448`, `2994`, `3480` |
| Password reset — email not found | "If this email exists, a password reset link has been sent" | `main_new.py:2771`, `6471` |

---

## 12. Password Reset Flow

### Vendor/Driver/Admin — JWT-based (`main_new.py:2763–2826`)
1. `POST /api/auth/password-reset/request` — creates JWT with `type=password_reset`, 1-hour TTL
2. Token is stateless (not stored); email sending is TODO `main_new.py:2780`
3. `POST /api/auth/password-reset/confirm` — decodes JWT, checks Redis key `pwd_reset_used:{hash}` (1-use enforcement), hashes new password

### Customer/Driver — 6-digit code (`main_new.py:6460–6530`)
1. `POST /api/customer/password-reset/request` — generates 6-digit code, stores in Redis (15-min TTL)
2. `POST /api/customer/password-reset/confirm` — exact match of code; hashes new password

---

## 13. Multi-Factor Authentication

- **Status**: ❌ Not implemented
- No TOTP, SMS OTP, backup codes, or hardware key support

---

## 14. Account Lockout

- **Status**: ❌ Not implemented
- Rate limiting (10/min) throttles brute force but does not lock the account
- No `failed_login_count`, no `locked_until` field on User model
- Lockout is per-IP, not per-account

---

## 15. WebSocket Authentication

Endpoint: `/ws/{client_id}` — `main_new.py:18967`

1. JWT required via `?token=` query param — `main_new.py:18968`
2. Missing token → close code 4001 — `main_new.py:18982`
3. Invalid token → close code 4001 — `main_new.py:18988`
4. `client_id` format: `{role}_{id}` (e.g. `customer_123`) must match JWT claims — `main_new.py:18993–19014`
5. Mismatch → close code 4003 — `main_new.py:19014`
6. Admins may connect as any `client_id` — `main_new.py:19003`

---

## 16. Admin Authentication

- Admin JWT: `{"sub": email, "role": "admin"}` — `main_new.py:1970`
- Middleware accepts: JWT Bearer **or** `?secret_key=ADMIN_SECRET_KEY` — `main_new.py:355–357`
- `ADMIN_SECRET_KEY` env var — `main_new.py:639`
- Admin role verified against `User.role` in DB — `main_new.py:341`, `auth_utils.py:253`

---

## 17. Demo Account Handling

Exempt from rate limits: `demo.customer@dollor.ai`, `demo.driver@dollor.ai`, `demo.restaurant@dollor.ai`, `support@dollor.ai` — `main_new.py:585–590`

Dedicated demo-login endpoints (require `ADMIN_SECRET_KEY`):
- `/api/customer/demo-login` — `main_new.py:2261`
- `/api/auth/driver/demo-login` — `main_new.py:2311`
- `/api/auth/vendor/demo-login` — `main_new.py:2078`

---

## 18. Identity Verification (KYC)

- **Provider**: Persona (primary) — `verification_routes.py`, `document_verification_service.py`
- **Credentials**: `PERSONA_API_KEY`, `PERSONA_TEMPLATE_ID`, `PERSONA_WEBHOOK_SECRET`
- **Rate limit**: 10 verifications/hr/entity — `verification_routes.py:156–160`
- **Flow**: Separate from auth; required AFTER registration for drivers/vendors
- Additional providers: Onfido, Veriff (multi-provider support)

---

## 19. Apple Sign-In Nonce

- **Status**: ❌ No nonce generated or validated
- `identity_token` (Apple JWT) decoded but nonce claim not checked — `main_new.py:3177`, `6326`
- Risk: token replay/hijacking possible if token is intercepted

---

## 20. Session Invalidation / Logout

- **Normal sessions**: ❌ No logout endpoint, no token blacklist
- **Password reset tokens**: ✅ One-time-use enforced via Redis `pwd_reset_used:{hash}` — `main_new.py:2796–2806`
- **FCM unregister**: Optional push token removal on logout — `main_new.py:19064–19090`
- Compromise window: 30 days until natural token expiry

---

## Security Gaps Summary

| # | Gap | Severity | Ticket |
|---|-----|----------|--------|
| G1 | Google/Apple OAuth tokens decoded without signature verification | HIGH | TODO-AUTH-001 |
| G2 | No Apple Sign-In nonce validation | MEDIUM | TODO-AUTH-002 |
| G3 | No token blacklist / logout revocation | MEDIUM | TODO-AUTH-003 |
| G4 | 30-day JWT lifetime — no rotation mechanism | MEDIUM | TODO-AUTH-004 |
| G5 | No account lockout after N failed logins | LOW | TODO-AUTH-005 |
| G6 | No MFA support | LOW | TODO-AUTH-006 |
| G7 | Rate limiting per-IP, not per-account | MEDIUM | TODO-AUTH-007 |
| G8 | 6-digit password reset code (low entropy, 1M possibilities) | LOW | TODO-AUTH-008 |

## Implemented Controls Summary

| Control | Source |
|---------|--------|
| bcrypt password hashing | `main_new.py:1038` |
| Password policy (8+, upper, lower, digit) | `main_new.py:604–634` |
| Generic error messages (enumeration protection) | `main_new.py:1959`, `2027`, `3433` |
| Rate limiting on all auth endpoints | `main_new.py:572–578`, `cache.py:143–177` |
| JWT signature verification on all endpoints | `main_new.py:550`, `auth_utils.py:60` |
| WebSocket JWT + client_id binding | `main_new.py:18986–19014` |
| Global auth middleware (defence-in-depth) | `main_new.py:516–558` |
| Role-based access control (4 roles) | `auth_utils.py`, throughout |
| Password reset one-time-use (Redis) | `main_new.py:2796–2806` |
| Admin dual-auth (JWT + secret key) | `main_new.py:308–364` |
| CloudFront IP extraction (anti-spoofing) | `cache.py:202–211` |
| Persona/Onfido/Veriff KYC integration | `verification_routes.py` |
