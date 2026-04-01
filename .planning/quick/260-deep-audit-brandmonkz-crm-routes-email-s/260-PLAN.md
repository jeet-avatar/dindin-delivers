---
phase: quick-260
plan: 01
type: execute
wave: 1
autonomous: true
---

<objective>
Deep audit of BrandMonkz CRM codebase — find ALL fragile code paths, conflicting routes, duplicate functions, nginx misconfigs, CORS issues, rate limiter conflicts. Research only — produce AUDIT_REPORT.md, no code changes.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Full codebase audit and report</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/backend/src/routes/*.ts
    /Users/jeet/Documents/production-crm-backup/backend/src/app.ts
    /Users/jeet/Documents/production-crm-backup/backend/src/middleware/*.ts
    /Users/jeet/Documents/production-crm-backup/frontend/src/pages/Campaigns/CampaignsPage.tsx
    EC2: /etc/nginx/conf.d/*.conf
  </files>
  <action>
  Audit ALL backend routes, email send functions, nginx configs, rate limiters, CORS setup, auth middleware.
  Produce comprehensive AUDIT_REPORT.md at .planning/quick/260-deep-audit-brandmonkz-crm-routes-email-s/AUDIT_REPORT.md
  </action>
  <done>AUDIT_REPORT.md produced with all issues, severities, and fix recommendations</done>
</task>

</tasks>
