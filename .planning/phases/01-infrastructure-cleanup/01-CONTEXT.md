# Phase 01: Infrastructure Cleanup - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve all deferred infrastructure security items from v1.3: suppress server header via CloudFront, verify App Store Connect key status, and address remaining credential items. No feature work, no app changes — ops/security disposition only.

</domain>

<decisions>
## Implementation Decisions

### CloudFront header suppression (INFRA-01)
- Replace uvicorn Server header with `Server: Dollor` (branded)
- Apply CloudFront response headers policy to BOTH production and staging distributions
- Also add standard security headers in the same policy: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- Verification: `curl -I` against api.dollor.ai + staging CF URL, confirm `Server: Dollor` and security headers present

### App Store Connect key (INFRA-02)
- User will check JFVA7628SX status in App Store Connect console themselves
- Scope: Just JFVA7628SX — no broader key audit
- Only the production key 9K626GB728 should remain active
- If JFVA7628SX is still active: revoke it
- Evidence: Note the outcome in resolution docs (no screenshot needed)

### Credential resolution (INFRA-03)
- **Production DB password**: Defer with written rationale (requires coordinated ECS+RDS downtime — accepted risk)
- **App Store Connect .p8 keys in git**: Verify removal from current repo + .gitignore blocks them (already removed in v1.2, just validate)
- **Server header**: Covered by INFRA-01 above
- Scope: Only the 3 items from MEMORY.md "Remaining Security Items" — no broader scan

### Claude's Discretion
- Exact CloudFront response headers policy configuration details
- Ordering of security headers in the policy
- Format of the written deferral rationale for DB password rotation

</decisions>

<specifics>
## Specific Ideas

- Production ASC key starts with "pk" prefix — key ID 9K626GB728, stored at `~/.appstoreconnect/private_keys/`
- Pre-commit hook already blocks .p8 files and credentials — just need to verify it's working
- All GSD workflow rules apply — every change goes through GSD

</specifics>

<deferred>
## Deferred Ideas

- Production DB password rotation — explicitly deferred to future milestone (requires coordinated ECS+RDS downtime)
- Git history cleanup (filter-repo) for old .p8 commits — key revocation makes history copies useless (decided in v1.2)

</deferred>

---

*Phase: 01-infrastructure-cleanup*
*Context gathered: 2026-02-22*
