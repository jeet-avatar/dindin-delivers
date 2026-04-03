# OfferLetter.ai — Career Companion Repositioning

**Date:** April 1, 2026
**Approach:** Content-Led Growth (Option C) — SEO content machine + product feature expansion in parallel
**Status:** Design approved, awaiting implementation plan

---

## 1. Product Identity

### Brand
- **Site:** OfferLetter.ai (unchanged)
- **App rename:** "Interview Assistant" → **"Career Companion"**
- **Tagline:** "From First Interview to First Promotion."
- **Positioning:** Your AI career partner — research, interview, negotiate, succeed.

### File Renames
| Before | After |
|--------|-------|
| `Interview Assistant.dmg` | `Career Companion.dmg` |
| `InterviewAssistant.exe` | `CareerCompanion.exe` |
| `CFBundleName: Interview Assistant` | `CFBundleName: Career Companion` |
| `ai.offerletter.interview-assistant` | `ai.offerletter.career-companion` |
| `interview.html` | `companion.html` (redirect old URL) |

Requires: new Apple notarization, updated PyInstaller spec, updated S3 paths, CloudFront invalidation paths, page download links.

---

## 2. The 4-Stage Career Journey

Each stage maps to product features (paid app) + SEO content (free site).

| Stage | Name | Status | App Features | SEO Content |
|-------|------|--------|-------------|-------------|
| 1 | **Research** | NEW | Company intel, role prep, people intel, cheat sheet | Pillar: Interview Preparation (8 articles) |
| 2 | **Interview** | EXISTS | Real-time AI coaching, audio capture, floating overlay, phone companion | Pillar: Interview Coaching & Tools (8 articles) |
| 3 | **Negotiate** | EXISTS (web) | Multi-offer comparison, total comp calculator, email drafts, counter scripts | Pillar: Salary Negotiation & Offers (8 articles) |
| 4 | **Succeed** | NEW | 90-day plan, meeting prep AI, business fluency coach, communication templates | Pillar: New Job Success (8 articles) |

---

## 3. Product Features

### 3.1 App Architecture — Mode Switcher

Top-of-window tab bar: `🔍 Research` | `🎯 Interview` | `💰 Negotiate` | `⭐ Succeed`

User clicks a tab to switch context. AI behavior, system prompts, and UI adapt to the selected stage. All modes included in the $19 one-time purchase.

### 3.2 Research Mode (NEW)

User enters company name + role. AI generates a complete briefing:

**Company Intel Card:**
- What the company does (plain English)
- Business model & revenue
- Recent news & funding
- Company culture signals
- Glassdoor sentiment summary

**Role Prep Card:**
- Key skills they're looking for
- Likely interview questions
- Talking points from user's resume
- Salary range for this role
- Red flags to watch for

**People Intel Card:**
- Key people user might meet
- Interviewer LinkedIn insights
- Team structure if available
- Common backgrounds of hires

**Cheat Sheet:**
- 1-page printable briefing
- Company jargon / buzzwords
- Questions to ask them
- "Sound like an insider" phrases

Implementation: Claude API with web search for company data, grounded in user's uploaded resume.

### 3.3 Interview Mode (EXISTS — fixes needed)

No feature changes. Current capabilities:
- Real-time audio capture from Zoom/Teams via sounddevice
- Whisper transcription → Claude AI answers
- Floating tkinter overlay invisible to screen share (NSWindowSharingNone)
- Resume-grounded personalized answers
- Earbuds TTS (AI reads answers aloud)
- Phone companion via interview_server.py (Flask on port 5050)

**Must fix (from test failures):**
- `interview_server.py` not bundled in DMG — customers cannot use phone mode
- Windows EXE filename mismatch ("Interview Assistant.exe" vs actual "InterviewAssistant.exe")

### 3.4 Negotiate Mode (web stays free, app gets deeper)

**Website (free, drives SEO):**
- Paste offer letter → instant analysis
- Salary benchmark
- Basic negotiation tips

**Desktop app ($19, deeper features):**
- Word-for-word counter scripts
- Side-by-side multi-offer comparison
- Total comp calculator (salary + equity + benefits)
- Email draft generator for negotiation

### 3.5 Succeed Mode (NEW)

User enters new role, company, and start date. AI becomes onboarding co-pilot.

**90-Day Plan Generator:**
- Week-by-week milestones
- Key relationships to build
- Quick wins to demonstrate value
- Learning priorities by role
- Customized to company size/industry

**Meeting Prep AI:**
- User describes upcoming meeting ("I have a meeting with the CFO about Q3 budget")
- AI generates: talking points, questions to ask, terms to know
- Financial literacy crash course
- Industry jargon explainer

**Business Fluency Coach:**
- "Explain P&L like I'm new here"
- "What does ARR mean in SaaS?"
- "How to read this board deck"
- Adapts to user's industry & level

**Communication Templates:**
- First-day introduction email
- Status update formats
- How to push back respectfully
- Asking for feedback scripts
- 1:1 meeting frameworks

Implementation: Claude API with new system prompts per tool. All text-based — no audio capture needed.

---

## 4. SEO Strategy

### 4.1 Four Content Pillars

Each career stage becomes a keyword cluster with a pillar page linking to supporting articles.

**Pillar 1: Interview Preparation** (`/guides/interview-preparation`)
- How to research a company before an interview
- 50 most common interview questions (+ AI answers)
- Behavioral interview prep guide (STAR method)
- Technical interview preparation by role
- How to prepare for a panel interview
- Phone screen vs video interview — what to expect
- How to make a great first impression on Zoom
- What to wear to a remote interview
- Target: 15K–50K monthly searches per article

**Pillar 2: Interview Coaching & Tools** (`/guides/interview-coaching`)
- AI interview coaching — how it works
- Best interview coaching tools 2026 (comparison)
- How to use AI during interviews (ethics guide)
- Real-time interview assistance explained
- Interview anxiety — how AI coaching helps
- Remote interview tips and tools
- How to answer questions you don't know
- Mock interview practice with AI
- Target: 5K–30K monthly searches per article

**Pillar 3: Salary Negotiation & Offers** (`/guides/salary-negotiation`)
- How to negotiate salary — complete guide
- Salary negotiation email templates
- How to evaluate a job offer (checklist)
- Should you negotiate your first job offer?
- Stock options and equity explained
- How to counter a lowball offer
- Benefits negotiation beyond salary
- When to walk away from an offer
- Target: 20K–100K monthly searches per article

**Pillar 4: New Job Success** (`/guides/new-job-success`)
- First 90 days at a new job — the playbook
- How to understand a business quickly
- Business communication for new hires
- How to impress your boss in the first month
- Building relationships at a new company
- How to read a P&L / financial statements
- Meeting preparation — how to add value fast
- From new hire to promotion — the timeline
- Target: 10K–40K monthly searches per article

### 4.2 Programmatic SEO — Company-Specific Pages

Auto-generated pages for top 500 employers.

URL pattern: `/interview-prep/{company-slug}`

Each page contains:
- Company overview
- Culture & values
- Common interview questions for that company
- Salary ranges by role
- Interview process breakdown

Each page ends with CTA: "Preparing for [Company]? Get real-time AI coaching during your interview →"

Target: ~2K searches/month each = ~1M total monthly search impressions across 500 pages.

### 4.3 Technical SEO Fixes

**Missing today (must fix):**
- No `<meta description>` on interview.html
- No Open Graph tags (bad social sharing on phones)
- No JSON-LD schema markup
- No canonical URLs
- No hreflang tags
- Title tags too generic
- No breadcrumb schema
- H1 hierarchy issues
- Images missing alt text
- No FAQ schema on guide pages

**To implement:**
- Meta descriptions on all 20+ pages
- OG image, title, description per page
- SoftwareApplication schema (app)
- Article schema (guides/blog)
- FAQ schema on guide pages
- Canonical URLs everywhere
- Optimized title tags with keywords
- Breadcrumb navigation + schema
- Internal linking strategy
- Core Web Vitals optimization

Tool: Use the SEO skills package (`/seo`, `/seo-audit`, `/seo-technical`, `/seo-schema`, `/seo-page`, `/seo-sitemap`) for audit and implementation.

### 4.4 Conversion Funnel

```
Google Search → Free Guide Page → CTA: Try the AI → Offer Analyzer (Free) → $19 Career Companion App
```

Every free page has a soft CTA to the offer analyzer (free) which upsells to the full app ($19).

---

## 5. Messaging Overhaul

### 5.1 Key Copy Changes

| Element | Before | After |
|---------|--------|-------|
| App name | Interview Assistant | Career Companion |
| Tagline | Ace Every Interview. Land the Offer. | From First Interview to First Promotion. |
| Meta description | Ace every interview with real-time AI coaching in your earbuds. | Your AI career companion — research companies, ace interviews, negotiate offers, and succeed at your new job. Free tools + $19 desktop app. |
| Homepage H1 | Ace Every Interview. Land the Offer. | From First Interview to First Promotion. |
| Nav label | Interview Coach | Career Companion |
| Interview page title | Interview Coach — OfferLetter.ai | Career Companion — AI Interview Coaching, Research & Onboarding \| OfferLetter.ai |
| CTA primary | Get Started — $19 | Analyze an Offer — Free |
| CTA secondary | (none) | Get the App — $19 |
| Value prop | AI whispers answers during interviews | AI career partner from research to onboarding |
| Tone | Secretive, "invisible to Zoom" | Professional confidence tool, career growth partner |

### 5.2 Homepage Feature Blocks

Replace current 6 interview-only features with 4 journey stages:

1. **Research Any Company** — Enter a company name, get a full briefing: culture, salary, questions, talking points.
2. **Real-Time Interview Coaching** — AI listens to Zoom/Teams and surfaces smart answers from your experience.
3. **Negotiate with Confidence** — Instant offer analysis, salary benchmarks, word-for-word negotiation scripts. Free to try.
4. **Shine from Day One** — AI-generated 90-day plan, meeting prep, business fluency coaching, communication templates.

### 5.3 Navigation Structure

```
Logo | Guides (dropdown) | Offer Analyzer | Career Companion | Blog | Pricing | [Sign Up]
```

Guides dropdown: Interview Prep | Salary Negotiation | New Job Success | Company Research

### 5.4 Revenue Model (unchanged)

| Tier | Price | Includes |
|------|-------|----------|
| Free | $0 | Offer letter analyzer, 32+ career guides, 500 company research pages, resume upload |
| Career Companion | $19 one-time | Desktop app with all 4 modes (Research, Interview, Negotiate, Succeed), phone companion |

---

## 6. Execution Timeline (6 Weeks, Parallel Tracks)

| Week | Track 1: SEO + Content | Track 2: Product Features |
|------|------------------------|--------------------------|
| 1 | Full SEO audit via seo package. Fix all meta tags, OG, schema on 20 pages. | Rename app → "Career Companion". Fix phone server + EXE filename bugs. |
| 2 | 4 pillar pages live. Homepage + interview page messaging rewrite. | Mode switcher UI. Research Mode v1 (company intel + role prep). |
| 3 | 8 guide articles published. Programmatic pages for top 100 companies. | Research Mode v2 (people intel + cheat sheet). Negotiate mode in app. |
| 4 | 8 more articles. Blog launch. Internal linking. | Succeed Mode v1 (90-day plan + meeting prep). |
| 5 | Remaining articles. 400 more company pages. Backlink outreach. | Succeed Mode v2 (biz fluency + templates). Windows build signing. |
| 6 | Google Search Console verification. Ranking monitoring. A/B test CTAs. | Full test pass. New DMG + EXE builds. Deploy to S3. Update all download links. |
| Ongoing | 2 articles/week. Monitor rankings. Update company pages. | Bug fixes, user feedback, feature iterations. |

---

## 7. Success Metrics

| Metric | Current | Target (3 months) |
|--------|---------|-------------------|
| Indexed pages | ~20 | 550+ (20 site + 32 guides + 500 company pages) |
| Monthly organic traffic | unknown | 10K+ visits/month |
| Keyword rankings (page 1) | 0 known | 20+ keywords on page 1 |
| Conversion rate (visit → purchase) | unknown | 2-3% |
| App modes | 1 (interview only) | 4 (research, interview, negotiate, succeed) |

---

## 8. Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Apple notarization for renamed app | Same signing cert (Zietra Technologies), just new bundle ID. Test notarization early in week 1. |
| Programmatic pages flagged as thin content | Each company page must have 500+ words of unique, AI-generated content. No template-only pages. |
| SEO takes 3-6 months to rank | Content hub drives immediate social sharing + backlinks. Paid ads optional for early traffic. |
| Phone server still broken | Bundle `interview_server.py` + dependencies into DMG as a standalone script, or build Flask server into the main app binary. |
| Windows code signing cost | ~$200-400/year for an EV cert. Eliminates SmartScreen warnings entirely. |
