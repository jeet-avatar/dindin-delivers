---
phase: quick-303
status: completed
date: 2026-04-26
depends_on: [quick-302]
user_approval: explicit ("approve" — 2026-04-26)
---

# quick-303 — BrandMonkz video wizard v2: problem-statement narration + logo + emailPitch + real render

## Outcome

The BrandMonkz video wizard now produces empathic problem-identification scripts grounded in real company website content, includes a working company logo, and emits a separate `emailPitch` field that maps the identified problems to TCP's verified service catalog. End-to-end smoke test rendered actual MP4s for Versova and AMI Graphics — confirmed playable from S3.

## 5 deliverables — all shipped

| # | Deliverable | Status | Verification |
|---|---|---|---|
| 1 | Tighten `deriveDomainCandidates` (close DEVIATION-2 from quick-302) | ✅ | `researchCompany("REAL Solutions Group")` now resolves to `realsolutionsgroup.com` (not RealNetworks `real.com`) |
| 2 | Add `logoUrl` field via Clearbit | ⚠️→✅ | Clearbit dead (DEVIATION-5); pivoted to Google S2 favicon API — all 3 test companies return real PNG/JPEG (720–2650 bytes) |
| 3 | Rewrite narration prompt → problem-statement framing | ✅ | Versova + AMI Graphics narrations are observational, no sales-pitch language, traceable to source text |
| 4 | Add `emailPitch` field mapped to AWS/NetSuite/ArthaBuild AI catalog only | ✅ | Versova → NetSuite (cooperative-transition ERP fit); AMI → ArthaBuild AI (signage planning AI fit). No invented services. |
| 5 | Smoke test = real MP4 render | ✅ | 2 test MP4s rendered via localhost:5002 generator — playable URLs in deliverables section below |

## Files modified

| Path | Final md5 | Backups |
|---|---|---|
| `/var/www/crm-backend/dist/utils/companyResearch.js` | `58d0ea2175245bf9d8af87958d7261ae` | `.bak.q303` (pre-q303), `.bak.q303-logo-fix` (pre-Google-S2-swap) |
| `/var/www/crm-backend/dist/routes/videoCampaigns.js` | `0ca764b3430b0c0a999746556da4364f` | `.bak.q303` (pre-q303) |

## Smoke test outputs

### Versova (groundedness=high)
**logoUrl:** `https://www.google.com/s2/favicons?domain=versova.com&sz=128` (2,104 bytes PNG)
**Narration:** *"Versova operates as a family of independent farms transitioning to a cooperative model… coordinating across multiple farms with decades of institutional knowledge while maintaining consistent food safety, animal welfare, and environmental standards. Scaling a unified culture and biosecurity practices across independent operations requires alignment without losing the autonomy that defines family farming."*
**emailPitch:** *"…coordinating food safety, biosecurity, and operational standards across independent farms while preserving autonomy requires a unified system… NetSuite ERP can centralize your compliance tracking, inventory, and reporting across all farms—giving you one source of truth for safety protocols and animal welfare standards while letting each farm maintain its operational independence…"*
**Rendered MP4:** `https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/campaign-q303-versova-smoke-b320868b-62e5-4a7e-b137-ff3c0ee7e4b9.mp4` (2,933,525 bytes, ~30s render)

### AMI Graphics (groundedness=high)
**logoUrl:** `https://www.google.com/s2/favicons?domain=amigraphics.com&sz=128` (720 bytes PNG)
**Narration:** *"When you're managing a sports facility or stadium, signage decisions affect everything—revenue opportunities, fan experience, wayfinding clarity. But most stadium layouts are unique, and visualizing where signage actually goes before installation is where most facilities struggle…"*
**emailPitch:** *"…challenge of visualizing signage placement across your facility before installation—that's where most stadium projects hit friction. ArthaBuild AI can help your team systematically map placement decisions and material specifications across multiple locations…"*
**Rendered MP4:** `https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/campaign-q303-ami-smoke-2cc0d26a-6cfd-480e-9c93-a329e4d69994.mp4` (3,152,700 bytes, ~35s render)

### REAL Solutions Group regression test
**Domain resolved:** `realsolutionsgroup.com` (correct — NOT `real.com` like quick-302)
**logoUrl:** `https://www.google.com/s2/favicons?domain=realsolutionsgroup.com&sz=128` (2,650 bytes JPEG)
**Groundedness:** high
**Verification:** `deriveDomainCandidates("REAL Solutions Group")` returns 32 candidates, NONE include `real.com`. The firstword fallback is gone. `.co/.us/.biz/.ai/.io` added to TLD walk.

## Anti-hallucination rules (enforced in prompt)

1. "Use ONLY the provided source text. If a fact is not in the source, do not claim it." (preserved from quick-302)
2. "Problem statements must trace to specific source text — no generic 'you might be struggling with...' phrasing." (NEW)
3. "If you cannot ground a problem in the source, omit it." (NEW)
4. "Never claim TechCloudPro delivers services beyond AWS, NetSuite, and ArthaBuild AI." (NEW)
5. "Map to ONE primary TCP service unless 2+ are clearly relevant." (NEW)
6. "Never invent customer names, case studies, or quantitative claims." (NEW)
7. Groundedness signal preserved: high|medium|low with deterministic heuristic (low overrides any LLM self-upgrade)

## Deviations

| ID | Description | Resolution |
|---|---|---|
| **DEVIATION-A (benign)** | `/preview-script` handler at line 2050 (not 1934 as plan said); `/regenerate-script` at 2084 (not 2026). | quick-302 had already restructured the file; edits applied via Edit-tool unique-string match, not line numbers. No code drift. |
| **DEVIATION-B (benign)** | OLD prompt string `"Create a personalized, compelling 30-45 second"` already replaced by quick-302 with `"You are a marketing copywriter"` JSON system message. Plan's grep count was wrong. | Replaced the actual existing prompt instead. Verified by both Versova and AMI returning new problem-statement narrations through `/preview-script`. |
| **DEVIATION-5 (Clearbit dead)** | `logo.clearbit.com` DNS does not resolve from EC2 OR my local machine. Clearbit deprecated free tier late 2024. | Pivoted to Google S2 favicon API (`https://www.google.com/s2/favicons?domain={domain}&sz=128`). One-line URL swap on line 230. Verified all 3 test companies return real images. |
| **DEVIATION-C (CR skipped)** | `ADMIN_SECRET_KEY` not in env; AWS Secrets Manager `get-secret-value` blocked by sandbox permissions. | Per ticketed-task skill: "If the key is not available, log a warning and continue." |

## PM2 + SG state

- crm-backend restart count: 72 → 73 (deploy) → 74 (logo fix), status online
- video-generator service: untouched, restart count 0, ~112 min uptime, online
- SG `sg-03f88e30ec99c3b26` :22 ingress: clean — only the 3 pre-existing user IPs remain. Temp rule revoked twice during this work (once after main deploy, once after logo fix).

## Defensive scope held

- All frontend files (`~/Documents/Max 8/CRM Frontend/crm-app/`) untouched
- Other backend routes untouched (only `videoCampaigns.js` + `companyResearch.js`)
- `.env` file untouched (already had needed keys from quick-302)
- Auth middleware untouched
- Email send pipeline untouched
- Follow-Ups tab from quick-301 untouched
- Video-generator Python service untouched (only consumed via HTTP)
- DB tables: read-only, no writes

## Live verification

The wizard now produces what the user wanted: AI grounded in real company research, problem-identification framing in the video, TCP service pitch in the email body, working logos. Real MP4s rendered through localhost:5002 in 30–35 seconds. Output is "light" (~3 MB) and easily opened.

## What's NOT in this task

- Frontend wizard UI updates (still uses old wizard — backend response shape is backwards-compatible, frontend just doesn't surface `emailPitch` or `logoUrl` yet)
- Remotion / SocialFlow integration (separate later task)
- Wiring the [Follow Up] button on quick-301's Follow-Ups tab to the auto-generated video (separate later task)
- Tightening other prompt edge cases (e.g. when groundedness is medium, what's the best fallback?)
