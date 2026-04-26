---
phase: quick-302
status: completed
date: 2026-04-26
deviations: 4
user_approval: implicit (user moved forward to quick-303 scope on 2026-04-26)
---

# quick-302 — BrandMonkz video wizard: website-grounded script generation

## Outcome

The BrandMonkz video wizard's `/preview-script` and `/regenerate-script` endpoints no longer accept just a company name and let the LLM hallucinate. They now fetch the company's actual public website, strip to plain text, truncate to ≤3000 chars, and pass that real text to Anthropic with strict anti-hallucination rules. Every response includes a deterministic `groundedness: high|medium|low` signal so operators can spot weakly-sourced output before sending.

## Files

| Path | Action | md5 |
|---|---|---|
| `/var/www/crm-backend/dist/utils/companyResearch.js` | NEW (267 lines) | `2f7b4a5827923d9c7bf8d39f5944a42b` |
| `/var/www/crm-backend/dist/routes/videoCampaigns.js` | MODIFIED (2881 → 2878 lines) | `ad54c994d2d0fcb34446bb1ca630b7d2` → `aa38ef4506540b87faf51a41390a51eb` |
| `/var/www/crm-backend/.env` | added `ANTHROPIC_MODEL=claude-haiku-4-5` (backup `.env.bak.q302`) | — |

## Smoke test (5 real companies)

| Company | Domain resolved | Groundedness | Anti-hallucination judgment |
|---|---|---|---|
| AMI Graphics | amigraphics.com ✓ | high (12 specifics) | ✅ PASS — Virtual Baseball Walkthrough, real phone, exact catalog |
| Versova | versova.com ✓ | high (7 specifics) | ✅ PASS — cooperative transition, etymology, "One Team" — all verifiable |
| Corpac Steel | corpac.com ✓ (parent brand fall-through) | high (8 specifics) | ✅ PASS — API 5L, API 5CT, PVF — industry-correct |
| Garyline | null (SSL+WAF block on all candidates) | low | ✅ PASS — generic, non-fabricated, empty specifics |
| REAL Solutions Group | ⚠️ real.com (RealNetworks — wrong company) | high (faithful to real.com) | ⚠️ FALSE-HIGH — anti-halluc passes for the source, but source is wrong site |

## Deviations

| ID | Description | Resolution |
|---|---|---|
| **DEVIATION-1** | `companyToDomain` etc. in `job-leads.routes.js` are local, not exported | Wrote self-contained `deriveDomainCandidates` in `companyResearch.js` |
| **DEVIATION-2** | "REAL Solutions Group" candidate generator falls through firstword "real" → hits `real.com` (RealNetworks) which returns 200 → wins. False-high groundedness. | **Open** — operator must check `sourceMeta.domain` before accepting. Tightening planned for next iteration: drop firstword fallback, add `.co/.us/.biz` to TLD list. |
| **DEVIATION-3** | Corpac Steel cert mismatch on `corpacsteel.com`, but firstword "corpac" → `corpac.com` IS the right parent brand | Benign — landed on correct entity |
| **DEVIATION-4 (blocking, surfaced + fixed)** | `.env` missing `ANTHROPIC_MODEL`. Default `claude-3-haiku-20240307` is decommissioned for this API key — every wizard call would have returned 500. | Pre-existing infra gap. Added `ANTHROPIC_MODEL=claude-haiku-4-5` to `.env`. |

## PM2 + SG state

- crm-backend restart count: 70 → 72 (deploy + env fix), status online
- video-generator service: ONLINE (pre-existing from earlier in session, untouched)
- SG `sg-03f88e30ec99c3b26` :22 ingress: clean — only the 3 pre-existing user IPs remain. Temp rule revoked 2026-04-26.

## What's next

quick-303 will:
- Add `logoUrl` to companyResearch output (Clearbit free logo API)
- Rewrite the narration prompt from "marketing message" → "problem-statement framing" (don't sell, demonstrate understanding)
- Add `emailPitch` field that maps the company's identified problems to TCP's verified service catalog: **AWS / NetSuite / ArthaBuild AI**
- Tighten candidate generator to fix the REAL Solutions / real.com class of error (DEVIATION-2)
- Smoke test that includes an actual video render through the existing localhost:5002 pipeline

## Files NOT modified (defensive scope held)

- All frontend files in `~/Documents/Max 8/CRM Frontend/crm-app/`
- All other backend routes
- Email send pipeline
- Auth middleware
- Follow-Ups tab from quick-301
- Video generator Python service (only consumed it, didn't touch)
- `companies` and `email_logs` DB tables
