# Phase 03: Rate Limiting Expansion - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend Redis-based rate limiting from login endpoints to password reset, payment/checkout, admin mutations, and registration endpoints. Prevent abuse of sensitive operations. Backend-only changes unless Claude determines client-side 429 handling is warranted.

</domain>

<decisions>
## Implementation Decisions

### Threshold tuning
- Registration: 5 requests/hour per IP (locked by user)
- Password reset: Claude's discretion (roadmap suggests 5/hr per email)
- Payment/checkout: Claude's discretion (roadmap suggests 10/min per user)
- Admin mutations: Claude's discretion (roadmap suggests 30/min per admin)

### Rate limit scope
- Claude's discretion for all scoping decisions (per IP, per user ID, per email, or combinations)
- Existing pattern: login rate limiting already uses Redis (ElastiCache) — follow established patterns

### Response behavior
- Claude's discretion for 429 response body format
- Retry-After header required (from RATE-05 success criteria)
- Client app 429 handling: Claude's discretion on whether to add iOS/Android retry logic or keep backend-only

### Bypass & exceptions
- Admin endpoints: leave rate limiting as-is (user decision)
- Demo accounts: leave as-is — user unsure if demo passwords still work, not a priority for rate limiting
- No special bypass rules needed

### Claude's Discretion
- All threshold values except registration (5/hr per IP)
- Rate limit scoping strategy (per IP vs per user vs per email)
- 429 response body format
- Whether to add client-side 429 handling in iOS/Android apps
- Redis key naming and TTL patterns
- Whether to reuse existing rate limiting middleware or create new

</decisions>

<specifics>
## Specific Ideas

- Existing Redis infrastructure already in place (ElastiCache `dollor-redis.uwva3u.0001.use1.cache.amazonaws.com:6379`)
- Login rate limiting already implemented (10 req/min per IP) — extend this pattern
- All 429 responses must include Retry-After header (RATE-05 requirement)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-rate-limiting-expansion*
*Context gathered: 2026-02-22*
