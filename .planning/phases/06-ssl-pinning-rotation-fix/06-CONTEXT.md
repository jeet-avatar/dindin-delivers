# Phase 06: SSL Pinning Rotation Fix - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate iOS SSL certificate pinning from leaf/intermediate pins to Amazon Root CA SPKI pins so ACM certificate renewals don't break API connectivity across all 3 iOS apps. Set up CloudWatch monitoring for certificate expiry. Write a rotation runbook. Does NOT include App Store submission — builds go to TestFlight only.

</domain>

<decisions>
## Implementation Decisions

### Pin Strategy
- Pin ALL Amazon Root CAs (Root CA 1, 2, 3, 4 + Starfield) for maximum resilience
- All 3 iOS apps share NetworkSecurity.swift — change applies to all simultaneously
- Hardcoded in Swift source vs remote config: Claude's discretion
- Old leaf/intermediate pin removal vs transition period: Claude's discretion

### Failure Behavior
- Hard-block vs fallback to standard TLS on pin mismatch: Claude's discretion (use CTO-level judgment — balance security posture with user impact)
- Pin failure reporting (backend vs local): Claude's discretion
- Old app version handling: Claude's discretion (CTO-level judgment — consider TestFlight auto-update behavior and current user base size)
- Minimum app version check endpoint: Claude's discretion (CTO-level judgment — weigh complexity vs benefit for current scale)

### Monitoring & Alerts
- CloudWatch alarm at 30 days before certificate expiry (warning threshold)
- Second alarm at 7 days before expiry (critical escalation)
- Notifications to support@dollor.ai via SNS
- Terraform vs AWS Console provisioning: Claude's discretion (follow existing infra patterns)

### Runbook
- Audience: Jeet only — concise, assumes AWS/iOS familiarity, exact commands
- Scenario coverage: Claude's discretion (CTO-level judgment on happy path vs emergency scenarios)
- Location: detailed runbook in `.planning/runbooks/` AND summary in CLAUDE.md
- Include both current SPKI pin hashes AND extraction commands for future reference

### Claude's Discretion
- Whether to keep old leaf pins temporarily alongside new root CA pins (transition strategy)
- Hardcoded pins vs remote config approach
- Hard-block vs TLS fallback on pin mismatch
- Pin failure reporting mechanism
- Old app version migration path / force-update handling
- CloudWatch alarm provisioning method (Terraform vs Console)
- Runbook scenario depth (happy path only vs emergency coverage)
- Rollout strategy (all 3 apps at once vs canary)

</decisions>

<specifics>
## Specific Ideas

- Current implementation in `NetworkSecurity.swift` has real SHA-256 leaf pins for `dollor.ai` + `api.dollor.ai`
- `P2PAPIService.swift` uses `secureSession` (182 API calls) — all will break if pins mismatch
- ACM now renews every ~198 days — next renewal is the ticking time bomb
- Current iOS builds on TestFlight: Customer 1095, Driver 203, Restaurant 172
- Two-tier alarm system (30-day + 7-day) for defense in depth

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-ssl-pinning-rotation-fix*
*Context gathered: 2026-02-26*
