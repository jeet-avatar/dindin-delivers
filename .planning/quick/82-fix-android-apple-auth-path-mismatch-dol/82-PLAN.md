# Quick Task 82: Fix Android Apple Auth Path Mismatch

## Goal
Investigate and fix the HIGH priority finding from quick-79 audit: Android Apple Auth path mismatch.

## Investigation Result: FALSE POSITIVE

The quick-79 audit flagged `DollorApiService.kt:51` using `@POST("auth/customer/apple-auth")` as a mismatch with backend `/api/customer/apple-auth`.

**However**, the audit failed to account for Retrofit's base URL resolution:
- Retrofit base URL: `https://api.dollor.ai/api/` (from `AppConfig.PRODUCTION_API_URL + "/"`)
- `@POST("auth/customer/apple-auth")` resolves to: `https://api.dollor.ai/api/auth/customer/apple-auth`
- Backend registers `/api/auth/customer/apple-auth` at `main_new.py:20910` ✓

All three Apple Auth paths are correct:
| Android Retrofit | Resolves To | Backend Route | Status |
|-----------------|-------------|---------------|--------|
| `auth/customer/apple-auth` | `/api/auth/customer/apple-auth` | `main_new.py:20910` | ✓ PASS |
| `auth/driver/apple-auth` | `/api/auth/driver/apple-auth` | `main_new.py:2834` | ✓ PASS |
| `auth/vendor/apple-auth` | `/api/auth/vendor/apple-auth` | `main_new.py:2320` | ✓ PASS |

## Tasks
1. Document false positive — no code changes needed
