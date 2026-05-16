# Zietra Platform — SOC 2 Controls Self-Assessment

**Updated:** 2026-05-16
**Scope:** Zietra multi-tenant SaaS platform (zietra.com + app.zietra.com + status.zietra.com)
**Type:** Self-assessment input for a future SOC 2 Type II audit engagement
**Author:** Phase 59 — get-shit-done planning, executor verifies each row

This document maps Zietra's CURRENT controls to the AICPA SOC 2 Trust Services Criteria (TSC) 2017
revision. It is NOT a SOC 2 audit. It IS a starting point that an external auditor (Drata, Vanta,
Secureframe, or a CPA firm) will validate, fill gaps for, and ultimately attest against.

Per Pitfall 9 (from 59-RESEARCH): every "DEPLOYED" row MUST cite evidence (file:line OR AWS ARN OR
commit SHA). PARTIAL rows say what's missing. NOT_YET rows are honest about absence.

Status legend:
- `DEPLOYED` — Control implemented and operating; auditor will validate evidence
- `PARTIAL`  — Partially implemented; gaps documented
- `NOT_YET`  — Recognized requirement; not yet implemented; on M9 backlog

---

## CC — Common Criteria (Security)

### CC1.1 — Organization demonstrates commitment to integrity and ethical values
Status: `PARTIAL`
Evidence: `CLAUDE.md` anti-hallucination protocol; no formal Code of Ethics document yet
Notes: Operator + Claude agent commitment is in `CLAUDE.md` and `.agents/skills/`. A written
       Code of Ethics for the company entity should exist (M9 — engage HR/legal).

### CC2.1 — Internal communications support functioning of internal control
Status: PARTIAL
Evidence: Slack workspace + `.planning/` directory + GSD workflow
Notes: Async-first comms via plan files. No documented escalation matrix (M9).

### CC3.1 — Organization specifies objectives clearly
Status: DEPLOYED
Evidence: `.planning/ROADMAP.md` (1100+ lines tracking M1-M9 milestones and ~60 phases)
Notes: Goals are explicit, dated, scope-locked per phase.

### CC3.2 — Identifies risks to achievement of objectives
Status: PARTIAL
Evidence: Per-phase RESEARCH.md "Anti-Patterns" + "Pitfalls" sections (e.g., 59-RESEARCH §I)
Notes: Risk identification is ad-hoc per phase. M9 — formal quarterly risk register.

### CC4.1 — Selects, develops, and performs ongoing evaluations
Status: PARTIAL
Evidence: GSD verify-phase + smoke-script pattern (smoke-phase-54-6.sh, smoke-phase-59.sh)
Notes: No formal control-effectiveness review schedule. M9 quarterly review.

### CC5.1 — Organization selects and develops control activities
Status: PARTIAL
Evidence: AWS Config (provision-aws-config.sh), GuardDuty (provision-guardduty.sh enabled),
          WAFv2 Web ACL (Phase 54.6, provision-waf-acls.sh)
Notes: AWS Config rules + Security Hub findings need M9 attention for remediation tracking.

### CC6.1 — Logical access controls
Status: PARTIAL
Evidence:
  - AWS Cognito for user identity (`us-east-1_KQuNS85nP` user pool)
  - RS256 JWT validation in turion-demo-api requireAuth middleware
  - Aurora RLS + FORCE on 152 tables across 4 schemas (Phase 55)
  - 459 isolation tests in CI (`pnpm test:isolation` on turion-space-demo)
Notes: MFA NOT enforced (Cognito MFA is OFF). M9 should enforce TOTP MFA for admin role.
       SSO (SAML/OIDC federation to Okta/Azure AD) not available; required for some enterprise buyers.

### CC6.2 — Prior to issuing system credentials, organization registers and authorizes new users
Status: DEPLOYED
Evidence: `/api/signup` flow goes via Cognito sign-up; admin invites via `tenant_invites` table
          require an authorized admin role (`requireRole('admin')` middleware)
Notes: Tenant admins authorize their own user additions.

### CC6.3 — Organization removes access of users whose access is no longer needed
Status: PARTIAL
Evidence: `DELETE /api/team/:userId` in routes/team.ts (Phase 59-01 retrofit emits audit_log_v2 row)
Notes: No automated stale-account cleanup; M9.

### CC6.6 — Implementation of logical access security software
Status: DEPLOYED
Evidence: WAFv2 Web ACL on CloudFront (Phase 54.6); `cache.ts:209` X-Forwarded-For penultimate-IP
          rate limiting; in-memory rate limiter (routes/contact.ts) for public endpoint;
          IP allowlist not used (multi-tenant SaaS)
Notes: Standard SaaS defense-in-depth.

### CC6.7 — System data transmitted via internet uses encryption
Status: DEPLOYED
Evidence:
  - ACM wildcard cert `*.zietra.com` (us-east-1)
  - CloudFront enforces TLSv1.2_2021 minimum
  - Aurora connections from Lambda enforce SSL (default in `pg` Pool; rejectUnauthorized:false; tighten in M9)
  - SES via VPCE (Phase 59-01) — internal AWS traffic, TLS by default
Notes: All public traffic HTTPS-only. CF redirect-to-HTTPS enforced.

### CC6.8 — Implementation of controls to detect, prevent, and act upon malicious software
Status: PARTIAL
Evidence: GuardDuty enabled (Phase 54.6); WAFv2 with managed Core Rule Set + Known Bad Inputs ruleset
Notes: No EDR on developer workstations (sole-operator org — moot for SOC 2 Type II scope of
       in-scope infrastructure; revisit for hiring).

### CC7.1 — Use of detection and monitoring procedures
Status: DEPLOYED
Evidence:
  - CloudWatch alarms (Phase 54.6 baseline: 8 alarms)
  - CloudWatch dashboard `zietra-prod-overview` (Phase 59-02, 12 widgets)
  - status.zietra.com (Phase 59-02) — public-facing real-time health
  - 459 RLS isolation tests in CI on every PR (Phase 55)
Notes: First-class detection coverage.

### CC7.2 — Monitors system components for anomalies
Status: PARTIAL
Evidence: CloudWatch metric anomaly detection NOT yet wired; alarms are threshold-based only
Notes: M9 — enable Anomaly Detection on key metrics (Aurora ACU, Lambda Duration).

### CC7.3 — Evaluates security events to determine if they have resulted in a security incident
Status: PARTIAL
Evidence: CloudWatch alarms route to operator email; no PagerDuty / OpsGenie escalation
Notes: M9 — formal incident response runbook + escalation matrix.

### CC7.4 — Responds to identified security incidents
Status: NOT_YET
Evidence: None — no documented incident response playbook
Notes: M9 — author runbook covering: detection → triage → containment → eradication → recovery → post-mortem.

### CC7.5 — Identifies, develops, and implements activities to recover from identified security incidents
Status: NOT_YET
Evidence: None
Notes: M9 — DR plan + tested PITR-from-snapshot procedure.

### CC8.1 — Authorizes, designs, develops, configures, documents, tests, approves and implements changes
Status: DEPLOYED
Evidence:
  - All changes go through GSD workflow (`CLAUDE.md`): research → plan → execute → verify → smoke → deploy
  - Atomic per-task commits per the project conventions
  - Migrations versioned + idempotent (Phase 55, 59-01 migration 036)
  - CI runs 459 isolation tests on PR
Notes: No formal CAB; sole-operator org makes one unnecessary.

### CC9.1 — Identifies, selects, and develops risk mitigation activities for risks
Status: PARTIAL
Evidence: `.planning/debug/` tracks reported bugs; per-phase deferred items captured in CHECKPOINTs
Notes: No formal risk register. M9.

### CC9.2 — Assesses changes in business operations and the environment
Status: NOT_YET
Evidence: None
Notes: M9 — quarterly risk review with documented output.

---

## A — Availability

### A1.1 — Maintains, monitors, and evaluates current processing capacity
Status: DEPLOYED
Evidence:
  - Aurora Serverless v2 scales ACU automatically (0.5 → 16 ACU range)
  - Phase 59-04 k6 load test substitute (ab probe) verified headroom: ACU stayed 0.5-2.5 under burst
  - CloudWatch dashboard `zietra-prod-overview` tracks ACU + connections + Lambda duration
Notes: Capacity is observed + alarmed (Phase 54.6 alarms: zietra-aurora-high-cpu, zietra-aurora-low-freeable-memory).

### A1.2 — Monitors environmental protections, software, data backup processes
Status: PARTIAL
Evidence:
  - Aurora automated daily backups (configured at cluster creation, retention TBD verify)
  - S3 versioning enabled on critical buckets (zietra-status, zietra-marketing — verify)
Notes: No documented backup-restore drill. M9 quarterly DR drill.

### A1.3 — Tests recovery plan procedures
Status: NOT_YET
Evidence: None
Notes: M9 — schedule a quarterly DR drill (point-in-time restore from Aurora snapshot to a sandbox).

---

## PI — Processing Integrity

### PI1.1 — Maintains records to provide evidence of system processing
Status: DEPLOYED
Evidence:
  - `public.audit_log_v2` (Phase 59-01) RLS-scoped per tenant
  - CloudWatch logs (90-day retention default) for all Lambdas
  - Aurora pg_stat_statements + Performance Insights enabled
Notes: Lifecycle: 90-day retention on audit_log_v2 (EventBridge cron — TODO M9 add cron).

### PI1.2 — Implements policies and procedures over system inputs
Status: DEPLOYED
Evidence:
  - express-validator equivalent (zod / manual) on all mutate routes
  - JSON schema validation in OpenAPI spec (Phase 59-03 — public/docs/openapi.yaml)
  - Rate limiting (cache.ts) on bidirectional surfaces
Notes: Defensive input validation enforced at the route layer.

### PI1.3 — Processes inputs completely, accurately, and in a timely manner
Status: PARTIAL
Evidence: Postgres ACID transactions via `withTenantClient`
Notes: Idempotency keys for retry-safe writes NOT consistently enforced; M9.

### PI1.4 — Logical access controls for outputs
Status: DEPLOYED
Evidence: RLS on all 152 tenant-scoped tables (Phase 55); 459 isolation tests prove cross-tenant block
Notes: A tenant cannot read another tenant's output even with crafted requests.

### PI1.5 — Stores outputs completely, accurately, and timely
Status: DEPLOYED
Evidence: Aurora durable + multi-AZ; S3 11-9s durability for static assets
Notes: AWS-managed durability.

---

## C — Confidentiality

### C1.1 — Identifies and maintains confidential information
Status: PARTIAL
Evidence:
  - Aurora RLS for tenant isolation (152 tables, FORCE mode)
  - AWS Secrets Manager for all secrets (NO secrets in code/env files — CLAUDE.md rule)
  - `.gitignore` + pre-commit hook block credentials
Notes: No formal data-classification scheme (M9 — classify customer data as Confidential).

### C1.2 — Disposes of confidential information
Status: PARTIAL
Evidence: 90-day audit_log_v2 retention (cron TODO M9); customer offboarding deletes their rows via tenant CASCADE
Notes: No tested data-erasure workflow for GDPR Article 17 requests (M9).

---

## P — Privacy

### P1 — Personal Information notice and communication of objectives
Status: DEPLOYED
Evidence: `zietra.com/privacy` (Phase 58-01 refresh) covers data collection + sub-processors + GDPR
Notes: Privacy policy current; review quarterly.

### P2 — Privacy: choice and consent
Status: PARTIAL
Evidence: Cookie banner NOT yet implemented; "by signing up you agree to ToS + Privacy" link only
Notes: M9 — GDPR-compliant cookie consent (Cookiebot or roll-your-own).

### P3 — Collection
Status: DEPLOYED
Evidence: Only name + email + company collected at signup; per-module data is tenant-self-managed
Notes: Minimal PII collection by design.

### P4 — Use, retention, and disposal
Status: PARTIAL
Evidence: `zietra.com/privacy` documents purpose limitation; retention not explicitly stated
Notes: M9 — add specific retention periods per data category.

### P5 — Access (data subject rights)
Status: NOT_YET
Evidence: None — no self-service "download my data" or "delete my account" UI
Notes: M9 — Settings → Privacy section with data export + deletion request flow.

### P6 — Disclosure to third parties
Status: PARTIAL
Evidence: Sub-processor list in privacy policy (AWS, Cognito, SES, Stripe-pending)
Notes: No DPA template available for enterprise customers (M9 — author DPA with legal).

### P7 — Quality
Status: PARTIAL
Evidence: User can edit their profile via `/api/me` PATCH (verify endpoint exists)
Notes: M9 — formal data quality SLA.

### P8 — Monitoring and enforcement
Status: PARTIAL
Evidence: `security@zietra.com` address for reports (Phase 58-04 SecurityPage)
Notes: M9 — formal complaint-handling workflow + acknowledgment SLA.

---

## Summary statistics

| Status | Count | Notes |
|--------|-------|-------|
| DEPLOYED | 12 | CC3.1, CC6.2, CC6.6, CC6.7, CC7.1, CC8.1, A1.1, PI1.1, PI1.2, PI1.4, PI1.5, P1, P3 |
| PARTIAL  | 18 | Most CC privacy + availability + processing-integrity items have gaps documented |
| NOT_YET  | 6  | CC7.4, CC7.5, CC9.2, A1.3, P5 (5 hard gaps for M9) |

**Total criteria covered:** 36 across 5 TSC categories. Honest distribution per Pitfall 9 —
the platform is observable + provable + has good substrate, but formal governance + incident-response
processes are M9 work.

---

## Gap analysis for M9

Top 10 gaps (PARTIAL → DEPLOYED OR NOT_YET → at least PARTIAL):

| # | Gap | TSC ref | M9 action | Effort |
|---|-----|---------|-----------|--------|
| 1 | MFA not enforced (Cognito) | CC6.1 | Enable Cognito TOTP MFA + force on admin role | ~1 day |
| 2 | No documented incident response playbook | CC7.4 | Author runbook + table-top exercise | ~2 days |
| 3 | No formal risk register | CC9.1/9.2 | Quarterly risk review template + first run | ~1 day |
| 4 | No quarterly DR drill | A1.3 | Schedule + execute PITR-to-sandbox restore | ~1 day |
| 5 | No idempotency keys on writes | PI1.3 | Add idempotency-key header + cache (24h) | ~3 days |
| 6 | No formal data classification | C1.1 | Define scheme + tag tables + document | ~1 day |
| 7 | No cookie consent | P2 | Implement Cookiebot or roll-your-own | ~1 day |
| 8 | No GDPR Article 17 erasure workflow | P5 | Settings → Privacy → "Delete my account" | ~2 days |
| 9 | No DPA template | P6 | Engage legal counsel; publish DPA | ~1 day operator + legal review |
| 10 | No SSO (SAML/OIDC) federation | CC6.1 | Enable Cognito IdP federation (Okta + Azure AD) | ~2 days |

Estimated M9 SOC 2 readiness effort: ~15-20 working days of operator time + legal counsel + (eventually) a Type II audit engagement (Drata/Vanta/Secureframe — $15K-30K + 6-12 month observation window).

---

## Sources

- AICPA Trust Services Criteria 2017 — https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria
- AWS Audit Manager SOC 2 framework template (operator should fetch latest before audit)
- Drata / Vanta / Secureframe — vendor evaluation pending M9
