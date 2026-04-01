---
phase: quick-260
plan: 01
subsystem: brandmonkz-crm
tags: [audit, routes, email, nginx, cors, rate-limiter]
metrics:
  duration: ~20 minutes
  completed: 2026-04-01
---

# Quick Task 260: Deep Audit BrandMonkz CRM

Research-only audit of the full BrandMonkz CRM stack. Found 15 issues across backend, nginx, and infrastructure.

## Key Findings

- **4 email send functions** in campaigns.ts with different behaviors — root cause of every email breakage
- **Route ordering bug** — `:id` routes shadow named routes in 3 files (contacts, companies, campaigns)
- **26 duplicate PrismaClient instances** — connection pool exhaustion risk
- **Nginx CORS missing** on forgot-password and reset-password sub-locations
- **Double rate limiting** (nginx + Express) caused login lockouts
- **Two frontend directories** — deployment goes to wrong dir sometimes
- **Mock-send marks campaign as SENT** — misleading status

## Report Location

`.planning/quick/260-deep-audit-brandmonkz-crm-routes-email-s/AUDIT_REPORT.md`

## No Code Changes

This was research only. No files modified.
