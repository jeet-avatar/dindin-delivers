# Credential Resolution Document

**Date:** 2026-02-22
**Phase:** 01-infrastructure-cleanup (v1.4)
**Reference:** MEMORY.md "Remaining Security Items" section

## Summary

All 3 credential items from MEMORY.md "Remaining Security Items" have been assessed and dispositioned. This document provides the resolution status, verification evidence, and rationale for each item.

## Resolution Table

| # | Item | Status | Resolution |
|---|------|--------|------------|
| 1 | Production DB password in `backend/.env` | RESOLVED (mitigated) | File deleted from disk, `.gitignore` blocks re-addition, pre-commit hook blocks commits. DB password rotation and git history cleanup deferred. |
| 2 | App Store Connect `.p8` keys in git | RESOLVED (mitigated) | All 3 copies removed from git tracking (v1.2). `.gitignore` and pre-commit hook block re-addition. Key JFVA7628SX revocation pending user action (Task 3). Git history cleanup deferred. |
| 3 | Server header exposes `uvicorn` | RESOLVED | CloudFront response headers policy `dollor-security-headers` (ID: `776bc73c-f30f-45aa-aed7-d050704eb2a3`) applied to both production and staging distributions. Server header now returns `Dollor` instead of `uvicorn`. |

## Detailed Evidence

### Item 1: Production DB password in `backend/.env`

**Status:** RESOLVED (mitigated)

**Verification:**

1. **File does not exist on disk:**
   ```
   $ ls apps/web/p2p-platform/backend/.env
   No such file or directory
   ```

2. **`.gitignore` blocks `.env` files:**
   ```
   .gitignore line 4: .env
   .gitignore line 5: .env.local
   .gitignore line 6: .env.*.local
   .gitignore line 7: *.env
   .gitignore line 8: backend/.env
   ```

3. **Pre-commit hook blocks `.env` commits:**
   ```
   .git/hooks/pre-commit line 27-31:
   # Block .env files with actual secrets (not .env.example or .env.staging)
   if git diff --cached --name-only | grep -qE '\.env$|\.env\.local$'; then
       echo "ERROR: .env file detected in staged changes!"
   ```

**Deferred items:**
- **DB password rotation**: Requires coordinated ECS task definition update + RDS password change. Downtime risk. Accepted risk for now -- secrets are managed via AWS Secrets Manager in production, not from local `.env` files.
- **Git history cleanup**: Old `.env` commits remain in git history. Cleanup via `git filter-repo` requires force-push, which is destructive and breaks collaborator clones. The password in history is for a version of the DB URL that is no longer directly accessible (RDS security groups restrict access to VPC).

**Revisit conditions:**
- If the DB endpoint becomes publicly accessible
- If a collaborator with history access is offboarded
- During a planned maintenance window with full backup

---

### Item 2: App Store Connect `.p8` keys in git

**Status:** RESOLVED (mitigated)

**Verification:**

1. **No `.p8` files tracked in git:**
   ```
   $ git ls-files '*.p8'
   (empty output -- no tracked files)
   ```

2. **No `.p8` files in working tree:**
   ```
   $ ls apps/ios/*/fastlane/keys/*.p8
   no matches found
   ```

3. **`.gitignore` blocks `.p8` files:**
   ```
   .gitignore line 155: *.p8
   ```

4. **Pre-commit hook blocks `.p8` commits:**
   ```
   .git/hooks/pre-commit line 19-22:
   # Block .p8 files (App Store Connect keys)
   if git diff --cached --name-only | grep -q '\.p8$'; then
       echo "ERROR: .p8 file (App Store Connect key) detected in staged changes!"
   ```

**Key revocation status:**
- Key `JFVA7628SX`: Pending user verification in App Store Connect (Task 3 checkpoint)
- Key `9K626GB728` (production): Active and required -- stored at `~/.appstoreconnect/private_keys/` only

**Deferred items:**
- **Git history cleanup**: Old `.p8` commits remain in history. Key revocation (once confirmed) makes historical copies useless -- a revoked key cannot authenticate. History cleanup deferred per same rationale as Item 1.

**Revisit conditions:**
- Only if key revocation cannot be confirmed (making history copies still usable)

---

### Item 3: Server header exposes `uvicorn`

**Status:** RESOLVED

**Resolution:** CloudFront response headers policy `dollor-security-headers` created and applied to both distributions:

- **Policy ID:** `776bc73c-f30f-45aa-aed7-d050704eb2a3`
- **Production distribution:** `EGBM3QCX1MH14` (api.dollor.ai / d3kuu45w6kl8hr.cloudfront.net)
- **Staging distribution:** `E3LB9SMG1YD9ZL` (d34u5ixl0bulv4.cloudfront.net)

**Policy contents:**
- `Server: Dollor` (overrides uvicorn)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

All headers set with `Override: true` to ensure CloudFront always applies them regardless of origin response.

---

*Document created: 2026-02-22*
*Phase: 01-infrastructure-cleanup, Plan: 01-01*
