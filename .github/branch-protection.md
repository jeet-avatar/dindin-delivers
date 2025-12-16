# Branch Protection Rules Configuration

## Overview

This document defines the branch protection rules for the repository. These rules ensure code quality and prevent accidental deployments.

---

## Branch: `main` (Production)

### Settings
| Setting | Value |
|---------|-------|
| Require pull request before merging | Yes |
| Required approving reviews | 2 |
| Dismiss stale reviews when new commits pushed | Yes |
| Require review from Code Owners | Yes |
| Require status checks to pass | Yes |
| Require branches to be up to date | Yes |
| Require signed commits | Recommended |
| Require linear history | Yes |
| Include administrators | Yes |
| Restrict pushes | Only deploy keys |
| Allow force pushes | No |
| Allow deletions | No |

### Required Status Checks
- `Lint & Format`
- `Semgrep SAST`
- `Tests & Coverage`
- `SonarCloud Analysis`
- `Quality Gate`
- `Build & Scan Image`

### Environment Protection
- **Environment:** `production`
- **Required reviewers:** 2 (from team leads)
- **Wait timer:** 10 minutes
- **Prevent self-review:** Yes

---

## Branch: `staging`

### Settings
| Setting | Value |
|---------|-------|
| Require pull request before merging | Yes |
| Required approving reviews | 1 |
| Dismiss stale reviews | Yes |
| Require status checks to pass | Yes |
| Require branches to be up to date | Yes |
| Include administrators | No |
| Allow force pushes | No |
| Allow deletions | No |

### Required Status Checks
- `Lint & Format`
- `Semgrep SAST`
- `Tests & Coverage`
- `Quality Gate`

### Environment Protection
- **Environment:** `staging`
- **Required reviewers:** 1
- **Wait timer:** 5 minutes

---

## Branch: `develop`

### Settings
| Setting | Value |
|---------|-------|
| Require pull request before merging | Yes |
| Required approving reviews | 1 |
| Dismiss stale reviews | Yes |
| Require status checks to pass | Yes |
| Require branches to be up to date | No |
| Include administrators | No |
| Allow force pushes | No |
| Allow deletions | No |

### Required Status Checks
- `Lint & Format`
- `Semgrep SAST`
- `Tests & Coverage`

### Environment Protection
- **Environment:** `development`
- **Required reviewers:** 0 (auto-deploy)
- **Wait timer:** 0

---

## Branch Naming Convention

| Pattern | Purpose | Example |
|---------|---------|---------|
| `feature/*` | New features | `feature/user-auth` |
| `fix/*` | Bug fixes | `fix/login-error` |
| `hotfix/*` | Production hotfixes | `hotfix/critical-bug` |
| `release/*` | Release preparation | `release/v1.2.0` |
| `chore/*` | Maintenance tasks | `chore/update-deps` |

---

## CODEOWNERS

```
# .github/CODEOWNERS

# Default owners for everything
*                                   @tech-lead @senior-dev

# Backend code
/apps/web/p2p-platform/backend/     @backend-team

# Frontend code
/apps/web/p2p-platform/frontend/    @frontend-team

# iOS apps
/apps/ios/                          @ios-team

# Infrastructure
/infrastructure/                    @devops-team @tech-lead

# CI/CD
/.github/                           @devops-team

# Security-sensitive files
*.env*                              @tech-lead @security-team
*secret*                            @tech-lead @security-team
/infrastructure/kustomize/overlays/production/  @tech-lead @devops-team
```

---

## Merge Strategies

| Branch | Merge Strategy | Reason |
|--------|---------------|--------|
| `feature/*` → `develop` | Squash and merge | Clean history |
| `develop` → `staging` | Merge commit | Preserve commits |
| `staging` → `main` | Merge commit | Full audit trail |
| `hotfix/*` → `main` | Merge commit | Emergency fixes |

---

## Setup via GitHub CLI

```bash
# Install GitHub CLI if not already installed
brew install gh

# Authenticate
gh auth login

# Set up main branch protection
gh api repos/{owner}/{repo}/branches/main/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{"strict":true,"contexts":["Lint & Format","Semgrep SAST","Tests & Coverage","SonarCloud Analysis","Quality Gate","Build & Scan Image"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismissal_restrictions":{},"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":2}' \
  -f restrictions=null \
  -f required_linear_history=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false

# Set up staging branch protection
gh api repos/{owner}/{repo}/branches/staging/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{"strict":true,"contexts":["Lint & Format","Semgrep SAST","Tests & Coverage","Quality Gate"]}' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"required_approving_review_count":1}' \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false

# Set up develop branch protection
gh api repos/{owner}/{repo}/branches/develop/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{"strict":false,"contexts":["Lint & Format","Semgrep SAST","Tests & Coverage"]}' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"required_approving_review_count":1}' \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

---

## Environment Secrets

### Development
```
DATABASE_URL=postgresql://user:pass@dev-db.internal:5432/dollor_dev
REDIS_URL=redis://dev-redis.internal:6379
SECRET_KEY=dev-secret-key-xxx
```

### Staging
```
DATABASE_URL=postgresql://user:pass@staging-db.internal:5432/dollor_staging
REDIS_URL=redis://staging-redis.internal:6379
SECRET_KEY=${{ secrets.STAGING_SECRET_KEY }}
SENTRY_DSN=${{ secrets.SENTRY_DSN }}
```

### Production
```
DATABASE_URL=${{ secrets.PRODUCTION_DATABASE_URL }}
REDIS_URL=${{ secrets.PRODUCTION_REDIS_URL }}
SECRET_KEY=${{ secrets.PRODUCTION_SECRET_KEY }}
SENTRY_DSN=${{ secrets.SENTRY_DSN }}
STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}
```

---

## Quick Reference

### Deployment Flow
```
feature/* → develop → staging → main
             ↓          ↓        ↓
            Dev     Staging   Production
          (auto)   (canary)  (blue-green)
```

### Emergency Hotfix Flow
```
hotfix/* → main (with 2 approvals)
             ↓
        Production
      (fast blue-green)
             ↓
         Backport
             ↓
    develop + staging
```
