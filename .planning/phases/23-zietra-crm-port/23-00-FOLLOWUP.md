# Wave B Followups — Phase 23

Items deferred from Wave A (scope: boot + smoke test + deploy).

## Content quality pass

Brand-name replacement was mechanical sed. 14 files had NetSuite-specific templates/subject lines/example content. The replacement `NetSuite → your ERP` leaves working code but awkward copy like "your ERP team ready for 2026.1?".

**Files needing content rewrite** (grep `"your ERP"` after Wave A):
- `backend/src/routes/campaigns.ts` — 5 subject-line variants (`NETSUITE_SUBJECTS` array, now renamed), hardcoded HTML template
- `backend/src/services/ai-orchestrator.service.ts` — AI prompt templates
- `backend/src/services/chatbot-openai.service.ts` — chatbot system prompt
- `backend/src/routes/job-leads.routes.ts` — lead-gen prompt for Claude
- `app/src/components/CampaignWizard.tsx` — example subject lines
- `app/src/components/AIChat.tsx` — intro copy
- `app/src/components/MigrationWizardModal.tsx` — migration steps
- `app/src/pages/Settings/SettingsPage.tsx` — settings copy
- `app/src/pages/JobLeads/JobLeadsPage.tsx` — page intro
- `app/src/pages/Contracts/ContractsPage.tsx` — example contract fields
- `app/src/pages/EmailTemplates/CreateTemplateModal.tsx` — template examples
- `app/src/pages/Campaigns/CampaignsPage.tsx` — UI labels
- `app/src/pages/Import/ImportPage.tsx` — field mapping hints
- `app/src/types/index.ts` — type enum values

**Approach:** Generic CRM copy. Use "your ERP", "your pipeline", "your sequence" where context allows; delete vertical-specific example content.

## Auth swap to Supabase (Task #8 — deferred)

Current state: BrandMonkz JWT auth code copied over (Passport + passport-jwt strategy). Zietra uses Supabase (project `lbpkbpfwdpnwlccmlfxn`, key `sb_publishable_4FngZKlSAjtDY0iFr30Eiw_eoAxqHKK`).

Decision needed before swap:
- **Option A:** Verify Supabase JWT in Express middleware using the project's JWKS endpoint. Session storage stays client-side. Users created in Supabase.
- **Option B:** Keep copied JWT auth, disable Supabase signup, migrate existing `demo@zietra.com` via admin script.

Option A is cleaner (matches Zietra's existing flow). ~60-90 minutes work + testing.

## Theme tokens (Task #9 — deferred)

Needs: Zietra brand spec. Current apps/zietra/ marketing site uses CSS tokens in `globals.css` — grab palette from there and swap in the copied app's `brandColors.ts` / Tailwind config.

Files to change:
- `app/src/config/brandColors.ts`
- `app/tailwind.config.*` if present
- `app/src/config/ui.ts`
- `app/src/config/branding.ts`

## Campaign physical merge (from Task #6 — deferred)

Wave A unified URL namespace under `/api/campaigns/*`. Physical merge of `videoCampaigns.ts` + `emailComposer.ts` + tracking sub-routes into single `campaigns.ts` deferred until port boots and smoke-test passes.

## DB / Prisma

- Run `prisma migrate deploy` against Zietra Supabase (fresh DB, no data migration)
- Some models referenced in comments as "non-existent" (tasks/projects/tickets/internal) — decide: implement models or drop routes
- Seed generic email templates (no NetSuite content)

## Infra

- `app.zietra.com` currently serves old Zietra-lite. New CloudFront distribution + S3 bucket needed, OR re-point existing to new built frontend.
- Backend: extend `api.zietra.com` Lambda OR stand up ECS. Port is Express+TS, heavy — Lambda cold-start might be rough. Recommend ECS.
- ACM cert for `app.zietra.com` (renewable).
- Route53 A record.

## Testing

- No tests copied audited. `npm test` before deploy.
- Smoke tests: signup → login → create contact → create company → create campaign → send test email via a configured email server → view analytics.
