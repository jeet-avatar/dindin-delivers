# Phase 11: Change Management Workflow - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Enterprise-grade change management system built on top of the existing project tracker (2,512+ cases across 10 departments). All changes — code, config, docs, manual tasks — flow through a case management pipeline: request submission, department lead approval, GSD-driven execution, PR creation, CI/CD gates, staged deployment, and verified closure. Full audit trail on everything.

Builds on: Quick tasks 106-113 (ProjectCase model, Department/TeamMember/AssignmentRule models, admin UI with tabs, CRUD, CSV export, auto-assign engine).

</domain>

<decisions>
## Implementation Decisions

### Request & Approval Flow
- Change requests submitted via **both API endpoint + admin portal UI** — API is source of truth, admin portal is primary consumer
- Requests **auto-route to department lead** assigned to the affected case(s) — department lead approves/rejects in admin portal
- **No auto-approve** — every change request needs department lead sign-off regardless of priority
- Scope covers **any tracked work** — code, config, docs, infrastructure, manual tasks. Everything goes through the system.

### Case-to-PR Automation
- **GSD executor implements the change** — approved cases trigger GSD to execute, commit code, and create PR on a feature branch
- PR trigger and branch naming: **Claude's discretion** — pick the approach that best fits the existing GSD workflow and CI/CD setup (likely: auto for code changes, manual trigger for non-code; branch naming consistent with GSD conventions)
- Feature branch + PR for code changes (not direct to main) — enterprise standard requires review cycle
- Non-code work (config, docs, manual tasks) updates status without PR

### CI/CD Pipeline Gates
- **Enterprise-level checks required**: pytest full suite, TypeScript compilation (if frontend changed), staging smoke tests, approval record verification
- **Auto-deploy to staging** on green CI. **Production deploy requires manual trigger** — human gate before production always.
- **Rollback = revert PR through same approval flow** — auditable rollback trail, no shortcut buttons

### Case Status Lifecycle
- **Full enterprise lifecycle**: Draft -> Submitted -> Under Review -> Approved -> In Progress -> PR Created -> CI Running -> Staging -> Production -> Verified -> Closed
- **System-driven transitions with role-based override** — most transitions happen automatically (approval->in-progress, CI green->staging, etc). Department leads can override within their dept. Super-admins can override across departments.
- **Full audit log** — every status change, approval, comment, PR link, deploy event. Timestamped with who did it. Exportable. (Claude's discretion on exact detail level)
- **Email + in-app notifications** — dashboard notifications for everything, email for critical transitions (approval needed, deploy failed, rollback triggered)

### Claude's Discretion
- PR trigger timing (auto-immediate vs manual button) — pick what works best with GSD executor flow
- Branch naming convention — consistent with existing patterns
- Audit log detail granularity — enterprise-appropriate level
- Notification email templates and frequency throttling
- How feature branches merge (squash, merge commit, rebase)
- Database schema for audit log, change requests, approval records

</decisions>

<specifics>
## Specific Ideas

- User wants this to feel like how "any organization" handles changes — think Jira + GitHub + CI/CD integrated into one admin portal
- The 2,512 existing cases should all be trackable through this system from day one
- The 10 departments and auto-assign rules (from quick-113) are the foundation for approval routing
- "Enterprise level" was the consistent answer for CI/CD and lifecycle questions — build for auditability and process rigor, not speed

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-change-management-workflow*
*Context gathered: 2026-03-07*
