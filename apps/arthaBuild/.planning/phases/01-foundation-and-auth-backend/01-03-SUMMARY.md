---
phase: 01-foundation-and-auth-backend
plan: 03
subsystem: auth-backend
tags: [auth, jwt, fastapi, pydantic, slowapi, bcrypt]
dependency_graph:
  requires: [01-02]
  provides: [auth_utils, schemas, routers/auth, routers/user]
  affects: [phase-2-netsuite, phase-4-frontend-wiring]
tech_stack:
  added: [PyJWT==2.9.0, passlib==1.7.4, bcrypt==4.1.3, slowapi==0.1.9, greenlet==3.3.2]
  patterns: [JWT HS256 with str(sub), bcrypt rounds=12, SlowAPI rate limiter, account lockout 5-attempt]
key_files:
  created:
    - src/backend/auth_utils.py
    - src/backend/schemas.py
    - src/backend/routers/__init__.py
    - src/backend/routers/auth.py
    - src/backend/routers/user.py
  modified:
    - src/backend/rawapi.py
    - src/backend/requirements.txt
decisions:
  - "JWT sub is str(user_id) always — verified by decoding token in smoke test"
  - "Login endpoint uses 'username' field per frontend authService.ts contract (email value)"
  - "Account lockout: 5 failed attempts → locked_until = now+15min, returns 429"
  - "No email enumeration: login returns identical 401 whether email not found or wrong password"
  - "validate_password requires 8+ chars, uppercase, lowercase, digit, special char"
  - "rawapi.py: changed except Exception to except BaseException to catch SystemExit from tester.py"
  - "greenlet==3.3.2 added to requirements.txt (SQLAlchemy async greenlet_spawn dependency)"
metrics:
  duration: "~35 minutes"
  completed: "2026-04-08"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 1 Plan 3: Auth Utils, Schemas, and Core Auth Endpoints Summary

**One-liner:** JWT HS256 auth with bcrypt password hashing, SlowAPI rate limiting, and 5-attempt account lockout across register/check-user/login endpoints.

## What Was Built

### Task 1: auth_utils.py + schemas.py

**auth_utils.py** provides:
- `hash_password` / `verify_password`: passlib CryptContext with bcrypt rounds=12
- `validate_password`: 8+ chars, upper, lower, digit, special character
- `create_access_token(user_id)`: 24h TTL, sub=str(user_id), token_type=access
- `create_refresh_token(user_id)`: 7d TTL, sub=str(user_id), token_type=refresh
- `decode_token(token, expected_type)`: validates JWT and token_type claim
- `is_locked(user)`: checks locked_until > now
- `limiter`: SlowAPI shared instance (must be wired to app.state.limiter)

**schemas.py** provides:
- `RegisterRequest`: first_name, last_name, email, password, organization
- `LoginRequest`: username (email value), password
- `CheckUserRequest` / `CheckUserResponse`: success, message, user_id, email
- `TokenResponse`: access_token, refresh_token, token_type, first_name, last_name, email, user_type
- `ForgotPasswordRequest`, `ResetPasswordRequest`, `RefreshRequest` (for Phase 1 Plans 4+)

### Task 2: routers/auth.py + routers/user.py

**POST /api/user/register:**
- 201 on success with message
- 400 if password fails policy (specific error message)
- 409 if email already registered
- Rate limited 10/minute per IP

**POST /api/auth/check-user:**
- Always 200
- Returns `{success: true, user_id, email}` if found
- Returns `{success: false}` if not found
- Rate limited 10/minute per IP

**POST /api/auth/login:**
- 200 + TokenResponse on success (resets failed_attempts and locked_until)
- 401 generic `"Invalid email or password"` whether email not found OR wrong password (no enumeration)
- 429 `"Too many failed attempts"` if account is currently locked
- 429 after 5th failed attempt (sets locked_until = now + 15min)
- Rate limited 10/minute per IP

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SystemExit from tester.py crashed rawapi.py import**
- **Found during:** Live smoke test setup (rawapi.py import returned exit code 1)
- **Issue:** `tester.py:run_command()` calls `sys.exit(1)` when suitecloud CLI is not installed. `except Exception` in rawapi.py does not catch `SystemExit` (which inherits from `BaseException`, not `Exception`).
- **Fix:** Changed `except Exception as _e` to `except BaseException as _e` in rawapi.py startup guard block
- **Files modified:** `src/backend/rawapi.py`
- **Commit:** 7f66e1eb

**2. [Rule 3 - Missing Dependency] greenlet not installed**
- **Found during:** First live POST to /api/user/register (ValueError: No module named 'greenlet')
- **Issue:** SQLAlchemy async engine requires greenlet for `greenlet_spawn`. It was not in requirements.txt or installed in venv.
- **Fix:** `pip install greenlet==3.3.2`; added `greenlet==3.3.2` to requirements.txt
- **Files modified:** `src/backend/requirements.txt`
- **Commit:** 7f66e1eb

**3. [Rule 2 - Router Wiring] Routers not registered in rawapi.py**
- **Found during:** Reviewing rawapi.py before smoke tests
- **Issue:** Plan did not include task to wire routers into the FastAPI app
- **Fix:** Added `app.include_router()` calls for auth and user routers in rawapi.py; attached limiter to app.state; added RateLimitExceeded handler
- **Files modified:** `src/backend/rawapi.py`
- **Commit:** 7f66e1eb

## Smoke Test Results

| Test | Endpoint | Condition | Expected | Actual |
|------|----------|-----------|----------|--------|
| 1 | POST /api/user/register | Valid payload | 201 | 201 |
| 2 | POST /api/user/register | Duplicate email | 409 | 409 |
| 3 | POST /api/user/register | Weak password | 400 | 400 |
| 4 | POST /api/auth/check-user | Known email | 200 success=true | 200 success=true |
| 5 | POST /api/auth/check-user | Unknown email | 200 success=false | 200 success=false |
| 6 | POST /api/auth/login | Correct credentials | 200 + tokens | 200 + tokens |
| 7 | POST /api/auth/login | Wrong password | 401 | 401 |
| 8 | JWT sub field | Decoded token | str("1") | str("1") |
| 9 | POST /api/auth/login | Nonexistent email | 401 (same as wrong pw) | 401 |
| 10 | POST /api/auth/login | 5 consecutive fails | 429 on 5th | 429 on 5th |

All 10 tests passed.

## Self-Check: PASSED

**Files verified:**
- FOUND: src/backend/auth_utils.py
- FOUND: src/backend/schemas.py
- FOUND: src/backend/routers/__init__.py
- FOUND: src/backend/routers/auth.py
- FOUND: src/backend/routers/user.py

**Commits verified:**
- 4536efe5: feat(01-03): add auth_utils.py and schemas.py
- 757641f9: feat(01-03): add routers/auth.py and routers/user.py
- 7f66e1eb: fix(01-03): wire auth/user routers into rawapi.py; catch SystemExit from tester.py
