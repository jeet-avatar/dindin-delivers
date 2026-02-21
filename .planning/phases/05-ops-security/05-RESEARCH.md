# Phase 05: Ops Security -- Credential Cleanup - Research

**Researched:** 2026-02-21
**Domain:** Secret management, credential hygiene, git history cleanup
**Confidence:** HIGH

## Summary

A comprehensive inventory of the repository reveals three categories of credential risk: (1) an App Store Connect `.p8` private key tracked in git history across 3 copies, (2) a root-level `backend/.env` on disk (not tracked) containing the production RDS password and Stripe test keys, and (3) the old/wrong staging URL `d3kuu45w6kl8hr.cloudfront.net` embedded in 365 files (45 of which are actual code/config files, the rest are docs/planning artifacts). Production secrets are properly managed via AWS Secrets Manager -- the ECS task definitions pull 11 secrets from Secrets Manager ARNs and never expose them in code.

The `.p8` key `AuthKey_JFVA7628SX.p8` tracked in git is NOT the production key -- the Fastlane Appfiles all reference key `9K626GB728` (stored only at `~/.appstoreconnect/private_keys/`, NOT in git). The `JFVA7628SX` key should be revoked in App Store Connect and removed from git + history. Firebase GoogleService-Info.plist and google-services.json are already properly gitignored and NOT in git history.

**Primary recommendation:** Remove the `.p8` key from git (delete files + add `*.p8` to `.gitignore`), delete the root `backend/.env` from disk, fix the old staging URL in 45 code/config files, and add `detect-secrets` as a pre-commit hook. Git history cleanup with `git-filter-repo` should be a separate, carefully planned operation.

## Credential Inventory

### A. App Store Connect `.p8` Keys

| Key ID | Location | In Git? | Active? | Action |
|--------|----------|---------|---------|--------|
| `JFVA7628SX` | `apps/ios/customer/fastlane/keys/AuthKey_JFVA7628SX.p8` | YES (tracked) | NOT used by Fastlane | REMOVE + REVOKE |
| `JFVA7628SX` | `apps/ios/delivery/fastlane/keys/AuthKey_JFVA7628SX.p8` | YES (tracked) | NOT used by Fastlane | REMOVE + REVOKE |
| `JFVA7628SX` | `apps/ios/restaurant/fastlane/keys/AuthKey_JFVA7628SX.p8` | YES (tracked) | NOT used by Fastlane | REMOVE + REVOKE |
| `9K626GB728` | `~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8` | NO | YES -- production key | KEEP (already safe) |
| `9K626GB728` | `~/.appstoreconnect/private_keys/api_key.json` | NO | YES -- contains private key | KEEP (already safe) |

**Evidence:** All 3 Fastlane `Appfile` configs reference `key_id: "9K626GB728"` (not `JFVA7628SX`). The 3 `.p8` files in git are identical (MD5: `7cb456ed75a65ec4674e5a206385b3a4`). They were added in commits `ec10a8da` and `6046e09d`.

**Confidence:** HIGH -- verified from Appfile source code and file checksums.

### B. Firebase/Google Config Files

| File | Bundle ID | Project | In Git? | Status |
|------|-----------|---------|---------|--------|
| `apps/ios/customer/eatfaircustomer/GoogleService-Info.plist` | `com.dollorai.customer` | `dollorai-production` | NO (gitignored) | KEEP -- production |
| `apps/ios/delivery/eatffairdelivery/GoogleService-Info.plist` | `com.dollorai.delivery` | `dollorai-production` | NO (gitignored) | KEEP -- production |
| `apps/ios/restaurant/eatffairrestaurant/GoogleService-Info.plist` | `com.dollorai.restaurant` | `dollorai-production` | NO (gitignored) | KEEP -- production |
| `apps/android/*/google-services.json` (9 files) | various | `dollorai-production` | NO (gitignored) | KEEP -- production |

**All Firebase files are safe.** They exist on disk but `.gitignore` properly excludes `GoogleService-Info.plist` and `google-services.json`.

**Confidence:** HIGH -- verified with `git ls-files`.

### C. `.env` Files

| File | In Git? | Contains Secrets? | Action |
|------|---------|-------------------|--------|
| `backend/.env` (root) | NO (not tracked, not in history) | YES -- production RDS password + Stripe test keys | DELETE from disk |
| `apps/web/p2p-platform/backend/.env` | NEVER committed | Does not exist on disk | N/A |
| `apps/web/p2p-platform/backend/.env.example` | YES (tracked) | NO -- placeholder values only | KEEP |
| `apps/web/p2p-platform/frontend/.env.production` | YES (tracked) | Google OAuth client ID (public, not secret) | KEEP |
| `apps/web/p2p-platform/frontend/.env.staging` | YES (tracked) | WRONG staging URL | FIX URL |
| `backend/.env.example` | YES (tracked) | NO -- placeholder values only | KEEP |
| `frontend/.env` | NO (not tracked) | NO -- just `VITE_API_URL` | KEEP |
| `services/core/location-service/.env.example` | YES (tracked) | NO -- placeholder values only | KEEP |

**Critical finding:** `backend/.env` (root level) contains:
- `DATABASE_URL=postgresql://dolloradmin:Dollor2024SecureDB@dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/dollor`
- `STRIPE_SECRET_KEY=sk_test_51SjEw6...` (test key, but still sensitive)
- `JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production-please` (placeholder, not real)

This file is NOT tracked by git (confirmed: `git ls-files -- backend/.env` returns empty). It exists only on the local machine. Action: delete from disk.

**Confidence:** HIGH -- verified with `git ls-files` and `git log --all`.

### D. Stripe Keys

| Location | Type | In Code? | Action |
|----------|------|----------|--------|
| `backend/.env` (root, untracked) | `sk_test_*` / `pk_test_*` | On disk only | DELETE file |
| `apps/web/p2p-platform/backend/stripe_integration.py:110` | `pk_test_your_key_here` fallback | In code (placeholder) | KEEP -- it is a non-functional placeholder |
| ECS Secrets Manager `dollor/production/stripe-vT8WRA` | `sk_live_*` / `pk_live_*` | NOT in code | KEEP -- proper secret management |
| ECS Secrets Manager (staging) | Stripe keys | NOT in code | KEEP |

No hardcoded LIVE Stripe keys exist anywhere in the codebase.

**Confidence:** HIGH -- verified with grep across all file types.

### E. AWS Keys

No AWS access keys (`AKIA*`) found anywhere in the codebase. CI/CD uses GitHub Actions secrets (`${{ secrets.AWS_ACCESS_KEY_ID }}`).

**Confidence:** HIGH.

### F. JWT Secrets

All backend files reference `os.getenv("JWT_SECRET_KEY")` with either no fallback or empty string fallback. The only actual value is the placeholder in `backend/.env` (untracked). Production/staging get their JWT secrets from Secrets Manager.

**Confidence:** HIGH.

### G. Google Maps API Keys

| Key | Location | In Git? | Notes |
|-----|----------|---------|-------|
| `AIzaSyCELfWMuckt-Bbx5tyuiOSS3sYNywxVTXc` | Customer Info.plist + GoogleService-Info.plist | Info.plist is tracked; GSI plist is not | API key is restricted to iOS app bundle |
| `AIzaSyA0j4nKeV5N9UKpNFCDTcMVxtBfR9BI8Z4` | Delivery + Restaurant GSI plists | Not tracked | Firebase API keys |
| `AIzaSyAO-5YOhyNNr3kvr52vN8ktODtcpzqZ-CU` | Android production google-services.json | Not tracked | Firebase API keys |
| `AIzaSyAepfv31h7GlkJE3oWT-hfrfkQZQAAq13M` | Android staging google-services.json | Not tracked | Firebase API keys |

Google Maps/Firebase API keys are restricted by platform (bundle ID / SHA fingerprint). They are not considered secret by Google's own security model. The customer app Info.plist has a hardcoded Google Maps key -- this is the standard iOS pattern. No action needed.

**Confidence:** HIGH.

## Production Secret Management (ECS)

Production and staging both use AWS Secrets Manager properly. The ECS task definition pulls 11 secrets:

| Secret | Source ARN | Status |
|--------|-----------|--------|
| `DATABASE_URL` | `dollor/production/database-v2-gd1oKf` | Secure |
| `JWT_SECRET_KEY` | `dollor/production/jwt-secret-kvk9j9` | Secure |
| `STRIPE_SECRET_KEY` | `dollor/production/stripe-vT8WRA` | Secure |
| `STRIPE_PUBLISHABLE_KEY` | `dollor/production/stripe-vT8WRA` | Secure |
| `ADMIN_SECRET_KEY` | `dollor/production/admin-yCDIFY` | Secure |
| `DASHBOARD_SECRET` | `dollor/production/admin-yCDIFY` | Secure |
| `SMTP_USER` | `dollor/production/smtp-credentials-eqAwat` | Secure |
| `SMTP_PASSWORD` | `dollor/production/smtp-credentials-eqAwat` | Secure |
| `PERSONA_API_KEY` | `dollor/production/persona-aqEOSX` | Secure |
| `PERSONA_TEMPLATE_ID` | `dollor/production/persona-aqEOSX` | Secure |
| `FIREBASE_CREDENTIALS_JSON` | `dollor/production/firebase-creds-DG9fC5` | Secure |

Staging ECS has the same 11 secrets from separate staging ARNs.

**No production secrets are in the codebase.** This is the correct architecture.

## Old/Wrong Staging URL Problem

**The wrong staging URL `d3kuu45w6kl8hr.cloudfront.net` appears in 365 files** (see MEMORY.md: "Old staging URL was NEVER staging -- it was production CF's raw domain").

The correct staging URL is: `d34u5ixl0bulv4.cloudfront.net`

### Code/Config Files to Fix (45 files)

**Critical (affect app behavior):**

| File | Impact |
|------|--------|
| `apps/ios/customer/Config/Debug.xcconfig` | iOS debug builds hit production, not staging |
| `apps/ios/delivery/Config/Debug.xcconfig` | Same |
| `apps/ios/restaurant/Config/Debug.xcconfig` | Same |
| `apps/android/app/build.gradle.kts` | Android staging URL is production |
| `apps/android/driver/build.gradle.kts` | Same |
| `apps/android/partner/build.gradle.kts` | Same |
| `apps/web/p2p-platform/frontend/.env.staging` | Frontend staging config |
| `apps/web/p2p-platform/backend/main_new.py` (CORS list line 105) | CORS allows old URL |
| `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` | iOS staging config comment |
| `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/EnterpriseNetworkLayer.swift` | Hardcoded staging URL |
| `infrastructure/kubernetes/api-gateway/nginx.conf` | K8s config |
| `apps/web/p2p-platform/backend/endpoint_config.py` | Endpoint config |

**Test/Script Files (fix but lower priority):**

| File | Impact |
|------|--------|
| `scripts/qa-runner.sh` | QA scripts |
| `scripts/uat-comprehensive.sh` | UAT scripts |
| `scripts/validation-meta.sh` | Validation scripts |
| 6 backend test files | Test suites |
| Various iOS staging test files | Staging tests |

**Docs/Planning (320+ files):**

These are historical artifacts in `.planning/`, `.claude/`, `docs/`, session handoff files. Many are archived and immutable. The planner should decide whether to bulk-fix or leave as historical record.

## `.gitignore` Coverage Analysis

### Currently Protected
- `*.env` (generic) -- covers `.env` files
- `GoogleService-Info.plist` -- covers Firebase iOS
- `google-services.json` -- covers Firebase Android
- `*.pem`, `*.key`, `*.crt` -- covers certificate files
- `*.keystore`, `*.jks` -- covers Android signing

### MISSING from `.gitignore`
| Pattern | Risk | Priority |
|---------|------|----------|
| `*.p8` | App Store Connect keys currently tracked | CRITICAL |
| `api_key.json` | App Store Connect API key JSON | HIGH |
| `**/fastlane/keys/` | Entire Fastlane keys directory | HIGH |

### Recommended Additions to `.gitignore`
```
# App Store Connect API Keys (NEVER commit)
*.p8
**/fastlane/keys/

# App Store Connect API key config
api_key.json
```

## CLAUDE.md State Analysis

Current CLAUDE.md references that need updating for Phase 05:

| Section | Current State | Correct State | Action |
|---------|---------------|---------------|--------|
| Required Env Vars table | Lists 4 vars | Correct and complete | KEEP |
| Auth Architecture | Up to date (Phase 02 work) | Correct | KEEP |
| iOS build commands | Uses `-configuration Staging` | Should note debug builds hit staging | MINOR FIX |
| Security section | No mention of Secrets Manager | Should document that production uses SM | ADD |
| No `.p8` warning | Not mentioned | Should note `.p8` files must never be committed | ADD |

## Git History Cleanup

### .p8 Keys in Git History

The `.p8` files were added in two commits:
- `ec10a8da` -- "Complete P2P backend integration for all iOS apps - App Store Ready"
- `6046e09d` -- "feat(ios): Add Fastlane configuration for TestFlight uploads"

**Option 1: `git-filter-repo` (Recommended)**
```bash
# Install
pip3 install git-filter-repo

# Remove .p8 files from ALL history
git filter-repo --invert-paths --path apps/ios/customer/fastlane/keys/AuthKey_JFVA7628SX.p8 --path apps/ios/delivery/fastlane/keys/AuthKey_JFVA7628SX.p8 --path apps/ios/restaurant/fastlane/keys/AuthKey_JFVA7628SX.p8

# Force push (DESTRUCTIVE -- rewrites ALL commit hashes)
git push --force
```

**Impact:** Rewrites 1,404 commits. All open PRs become invalid. All local clones need `git fetch --all && git reset --hard origin/main`.

**Option 2: Delete + Revoke (Simpler, Recommended for this project)**
- Delete the `.p8` files from the working tree
- Add `*.p8` to `.gitignore`
- Revoke key `JFVA7628SX` in App Store Connect
- The key in git history becomes useless once revoked

This is safer because:
- No force push needed
- No broken commit history
- The key is rendered non-functional by revocation
- There is only ONE contributor to this repo

### RDS Password in `backend/.env`

The file `backend/.env` was NEVER committed to git (verified: no git history). It exists only on disk. Simply delete it.

The `apps/web/p2p-platform/backend/.env` was also NEVER committed (verified). No git history cleanup needed for `.env` files.

**Confidence:** HIGH -- verified with `git log --all` for both paths.

### Production DB Password Rotation

Per MEMORY.md: "Production DB password in `backend/.env` -- needs rotation." However, since the file was never committed to git, the password has NOT been exposed in git history. The only risk is the local disk file. After deleting the file, rotation is a SHOULD, not a MUST.

If the user wants to rotate:
1. Update the password in RDS
2. Update `dollor/production/database-v2-gd1oKf` in Secrets Manager
3. Redeploy ECS tasks to pick up the new secret

## Pre-Commit Hook for Secret Prevention

### Recommended: `detect-secrets` by Yelp

Install and configure:
```bash
pip install detect-secrets
detect-secrets scan > .secrets.baseline
```

`.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

**Alternative: Simple shell-based pre-commit hook**

A lightweight alternative (no dependencies):
```bash
#!/bin/sh
# .git/hooks/pre-commit
# Block commits containing secrets

if git diff --cached --diff-filter=d | grep -qE "(sk_live_|sk_test_|AKIA[A-Z0-9]{16}|-----BEGIN.*PRIVATE KEY-----)"; then
    echo "ERROR: Potential secret detected in staged changes"
    echo "Review your changes before committing"
    exit 1
fi
```

**Recommendation:** Use the simple shell hook for now (zero dependencies, immediate protection). Upgrade to `detect-secrets` later if the team grows.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret scanning | Custom regex scanner | `detect-secrets` or GitHub Secret Scanning | Maintained, comprehensive pattern database |
| Git history cleanup | Manual `git rebase` | `git-filter-repo` | Handles all edge cases, officially recommended |
| Secret management | `.env` files on ECS | AWS Secrets Manager (already in use) | Rotation, audit trail, IAM-scoped access |
| API key rotation | Manual revoke + regenerate | App Store Connect UI + update `api_key.json` | Standard Apple workflow |

## Common Pitfalls

### Pitfall 1: Force-Pushing After History Rewrite
**What goes wrong:** After `git filter-repo`, force-pushing can break other clones and CI caches.
**Why it happens:** Rewriting history changes ALL commit SHAs from the rewritten point forward.
**How to avoid:** For a single-contributor repo, simply revoke the exposed key instead of rewriting history. If history rewrite is needed, coordinate with all clone holders.
**Warning signs:** CI pipelines fail after force push; `git pull` errors on other machines.

### Pitfall 2: `.gitignore` Doesn't Remove Already-Tracked Files
**What goes wrong:** Adding `*.p8` to `.gitignore` doesn't remove the files already in git.
**Why it happens:** `.gitignore` only prevents NEW additions. Already-tracked files must be explicitly removed.
**How to avoid:** Run `git rm --cached <file>` before or after adding to `.gitignore`.
**Warning signs:** `git status` still shows the file as tracked after updating `.gitignore`.

### Pitfall 3: Deleting `.env` Breaks Local Development
**What goes wrong:** Developer can't run backend locally after deleting `backend/.env`.
**Why it happens:** Backend needs `DATABASE_URL`, `JWT_SECRET_KEY`, etc. to start.
**How to avoid:** Ensure `.env.example` files are up-to-date. Document local setup in README.
**Warning signs:** `uvicorn` crashes on startup with missing env var errors.

### Pitfall 4: Old Staging URL Points to Production
**What goes wrong:** Debug/staging builds accidentally hit the production API.
**Why it happens:** The URL `d3kuu45w6kl8hr.cloudfront.net` is production's CloudFront domain, not staging.
**How to avoid:** Replace ALL instances with `d34u5ixl0bulv4.cloudfront.net` (actual staging).
**Warning signs:** Test data appears in production DB; staging tests modify production state.

### Pitfall 5: Revoking the Wrong App Store Connect Key
**What goes wrong:** Production Fastlane uploads break.
**Why it happens:** Confusing key IDs -- `JFVA7628SX` (to revoke) vs `9K626GB728` (to keep).
**How to avoid:** Double-check key ID before revoking. The Appfiles reference `9K626GB728`.
**Warning signs:** `fastlane beta` fails with "API key not found" after revocation.

## Action Matrix

### KEEP (Production Keys -- Currently Safe)

| Item | Location | Why Safe |
|------|----------|----------|
| App Store Connect key `9K626GB728` | `~/.appstoreconnect/private_keys/` | NOT in git, local only |
| Firebase iOS plists (3) | `apps/ios/*/GoogleService-Info.plist` | Gitignored, not tracked |
| Firebase Android JSON (9) | `apps/android/*/google-services.json` | Gitignored, not tracked |
| Google Maps API key in Info.plist | `apps/ios/customer/eatfaircustomer/Info.plist` | Platform-restricted, standard iOS pattern |
| All Secrets Manager ARNs | ECS task definitions | Proper secret management |

### REMOVE (Must Delete)

| Item | Location | Risk Level | Method |
|------|----------|------------|--------|
| `.p8` key `JFVA7628SX` (3 copies) | `apps/ios/*/fastlane/keys/` | HIGH -- in git | `git rm` + revoke in ASC |
| Root `backend/.env` | `backend/.env` (disk only) | MEDIUM -- prod DB password on disk | `rm` |
| Frontend `.env.staging` wrong URL | `apps/web/p2p-platform/frontend/.env.staging` | MEDIUM -- points to production | Fix URL |

### FIX (Update References)

| Item | Count | Priority |
|------|-------|----------|
| Old staging URL in code/config | 45 files | HIGH |
| Old staging URL in docs/planning | 320+ files | LOW (historical artifacts) |
| `.gitignore` missing `*.p8` | 1 file | CRITICAL |
| CLAUDE.md missing Secrets Manager docs | 1 file | MEDIUM |

## Open Questions

1. **Should we rewrite git history?**
   - What we know: The `.p8` key `JFVA7628SX` is in git history across 2 commits
   - What's unclear: Whether the user prefers history rewrite or simple revocation
   - Recommendation: Revoke + delete (simpler). Key becomes useless once revoked. History rewrite is optional and can be done later.

2. **Should we fix all 320+ doc files with old staging URL?**
   - What we know: Most are in `.planning/`, `.claude/`, `docs/` -- historical artifacts
   - What's unclear: Whether these docs are referenced by any tooling
   - Recommendation: Fix only the 45 code/config files. Leave docs as historical record unless specifically requested.

3. **Should we rotate the production RDS password?**
   - What we know: The password exists in `backend/.env` on disk (never committed). The password is `Dollor2024SecureDB`.
   - What's unclear: Whether anyone else has had access to this machine
   - Recommendation: Rotate as a precaution, but it's lower priority since it was never in git.

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `.gitignore`, `backend/.env`, all `.p8` files, all `GoogleService-Info.plist`, all `Appfile` configs
- `git ls-files` verification: Confirmed tracked/untracked status of all credential files
- `git log --all` verification: Confirmed `.env` files were never committed to history
- AWS ECS task definition: Confirmed Secrets Manager integration for all 11 production secrets
- AWS ECS staging task definition: Confirmed separate staging secrets

### Secondary (MEDIUM confidence)
- [GitHub Docs - Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git-filter-repo repository](https://github.com/newren/git-filter-repo) -- official recommended tool
- [Yelp/detect-secrets](https://github.com/Yelp/detect-secrets) -- pre-commit hook for secret detection
- [GitGuardian blog on pre-commit hooks](https://blog.gitguardian.com/setting-up-a-pre-commit-git-hook-with-gitguardian-shield-to-scan-for-secrets/)

### Tertiary (LOW confidence)
- None -- all findings verified from source

## Metadata

**Confidence breakdown:**
- Credential inventory: HIGH -- every file verified with `git ls-files` and on-disk inspection
- Secret management (ECS): HIGH -- verified via `aws ecs describe-task-definition`
- Old staging URL scope: HIGH -- verified with grep across entire codebase
- Git history cleanup approach: HIGH -- well-documented tools with clear trade-offs
- Pre-commit hook approach: MEDIUM -- tool versions may need verification at install time

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable domain -- credentials don't change frequently)
