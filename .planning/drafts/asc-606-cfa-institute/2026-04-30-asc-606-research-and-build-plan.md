# ASC 606 Software for CFA Institute — Research + Build Plan

**Date filed:** 2026-04-30 (next-session brief)
**Source conversation:** User got off a call with CFA Institute who want to create an ASC 606 software. Wants a working demo to show them; rest of the build is staged for later sessions. **Constraint: do not dilute the ArthaBuild go-live focus.**
**Status:** Research only. **No code written yet.** Pick this up in a fresh session before showing the demo.

---

## 0. TL;DR for Future Self

- **What it is:** ASC 606 (FASB Topic 606) is the US GAAP standard for revenue recognition from contracts with customers. IFRS 15 is the global twin. Five-step model.
- **What CFA Institute wants:** Unclear — they said "create an ASC 606 software." Three plausible scenarios in §3 below. **Before building, confirm scope with them in the next call.**
- **What we should demo:** A working **5-step walk-through** for one realistic SaaS contract: contract upload → AI parses → POs identified → SSPs allocated → rev rec schedule → journal entries → audit trail. ~1–2 sessions to ship a credible demo.
- **Strategic alignment:** This is a **natural adjacency for ArthaBuild**. Same AI engine (Claude-powered contract parsing → structured output → audit trail) — different vertical (revenue recognition instead of NetSuite BRDs). Same code spine, repackaged. Means we can ship fast without distracting ArthaBuild engineering.
- **Competitive moat:** Existing vendors (Zuora Revenue, Aptitude RevStream, Workiva, Oracle) cost **$75k–$250k+/year** and require months of implementation. AI-first + 3-minute setup (the ArthaBuild thesis applied to rev rec) is a real wedge.

---

## 1. What is ASC 606

### 1.1 The standard
- **Issued by:** FASB (with IASB-aligned IFRS 15)
- **Replaces:** ASC 605 + all prior industry-specific revenue rules including ASC 985-605 (software)
- **Effective dates:** Public companies — fiscal years beginning after **Dec 15, 2017**. Private companies — after **Dec 15, 2018**.
- **Core principle:** Revenue is recognized when control of promised goods/services transfers to the customer, in an amount reflecting the consideration the entity expects to be entitled to.
- **Scope:** All entities with contracts with customers, except leases (ASC 842), insurance (ASC 944), financial instruments (ASC 825/815), and guarantees (ASC 460).
- **Companion:** ASC 340-40 — Other Assets and Deferred Costs — covers contract acquisition + fulfilment costs (sales commissions, etc.). Most "ASC 606 software" must also handle 340-40.

### 1.2 The five-step model

| Step | Name | What software needs to do |
|------|------|---------------------------|
| 1 | Identify the contract with the customer | Contract intake, validate the 5 contract criteria (approval, identifiable rights, payment terms, commercial substance, collectibility) |
| 2 | Identify the performance obligations | Decompose contract into distinct goods/services; flag bundles; handle series guidance |
| 3 | Determine the transaction price | Compute fixed + variable consideration; apply the constraint; significant financing component; non-cash consideration |
| 4 | Allocate transaction price to POs | Compute SSP per PO (observable, market-assessment, cost+margin, or residual); allocate; reallocate on contract mods |
| 5 | Recognize revenue | Determine point-in-time vs over-time; apply input/output measure of progress; generate schedule + journals |

### 1.3 The hard parts (where software earns its money)

| Hard problem | Why it's hard | Software opportunity |
|--------------|---------------|----------------------|
| **Contract identification** | Side letters, oral modifications, email commitments often escape ERP | AI parses email + uploaded docs; flags hidden modifications |
| **Distinct PO determination** | Bundles, integration services, customization, hosting+licence combos | AI trained on industry contract patterns; rules engine for SaaS/software/services |
| **SSP estimation** | Required even when never sold standalone (residual + cost+margin + market) | Auto-calc from historical pricing data; confidence intervals; auditor-ready justification |
| **Variable consideration constraint** | Estimate refunds/rebates/usage; constrain so cumulative reversal is unlikely | Historical-deal-data-driven probability models with human override |
| **Contract modifications** | Treat as new contract, separate, or termination + new — rules are non-trivial | Decision tree + reallocation engine + roll-forward |
| **Disclosures** | ASC 606 disclosures (disaggregation, contract balances, POs remaining, judgments) are extensive | Auto-populated quarterly/annual disclosure pack |
| **Audit trail** | Every judgment must be documented for auditor + SEC review | Append-only event log of every decision + override |

Per [ChatFin's 2026 AI for ASC 606 analysis](https://chatfin.ai/blog/ai-revenue-recognition-asc-606-automation-cfo-2026/): *"AI does not eliminate the need for accounting judgment. 78% of companies using AI for ASC 606 still maintain dedicated revenue accounting headcount."* So the product **must augment**, not replace, the rev rec accountant — same model as ArthaBuild's BRD generator augmenting (not replacing) the implementation consultant.

---

## 2. Industry-Specific Wrinkles

ASC 606 was supposed to harmonize. In practice, every vertical has unique gotchas. **Pick which ones we support first.**

| Industry | The wrinkle | Priority for v1 |
|----------|-------------|-----------------|
| **SaaS / subscription** | Ratable recognition, term licences, multi-tenant, usage-based, free trials, multi-year discounts | ⭐ **P0** — biggest market, simplest wedge |
| **Software (perpetual + maintenance)** | Licence vs PCS bifurcation, on-prem vs hosted, termination rights | P1 |
| **Professional services** | T&M vs fixed-price, milestone billing, percentage-of-completion | P1 |
| **Telecom** | Bundled handsets+plans, free minutes, retention discounts, material rights (loyalty) | P3 (defer) |
| **Real estate / leases** | Lease component separation (ASC 842 boundary), sale vs lease | P3 |
| **Healthcare** | Variable consideration (capitation, value-based), implicit price concessions | P2 |
| **Construction** | POC, contract assets, retention | P2 |
| **Pharma** | Variable consideration (rebates, returns), milestone payments, IP licences | P3 |

**Recommendation:** Demo + v1 = **SaaS only**. CFA Institute is most likely interested in the SaaS use case (most ASC 606 questions in CFA financial reporting curriculum are SaaS-flavoured). One vertical = clean demo. Expand later.

---

## 3. The CFA Institute Angle — What Are They Actually Asking For?

**Before the next call, ask the user to clarify with CFA Institute. Three plausible scenarios:**

### Scenario A — Educational / Training Tool *(highest probability)*
CFA Institute already covers ASC 606 / IFRS 15 in the **Financial Reporting and Analysis** track of the CFA curriculum (Levels 1 + 2). They might want a **hands-on training simulator** — give CFA candidates real contracts, let them practice the 5-step model, get instant grading, see the audit trail.

- **Audience:** CFA candidates (~250k globally) + member firms doing CPE
- **Business model:** Bundled with curriculum subscription, or sold as a CPE/CE add-on
- **Build profile:** Simpler — no production-grade GL integration needed, focus on UX and worked-example library
- **Unique angle:** The world's first **AI-tutored ASC 606 simulator** — the AI plays the auditor and challenges your judgment

### Scenario B — Reference Implementation for Member Firms
CFA Institute serves analysts at thousands of investment + corporate finance firms. They might want a **production rev rec tool** branded for / endorsed by CFA Institute, sold to those firms.

- **Audience:** Mid-market companies (~$50M–$1B revenue) — the segment Workiva + Aptitude are too expensive for
- **Business model:** SaaS, ~$10k–$30k/year per company
- **Build profile:** Heavier — needs production-grade GL integrations, SOC 2, 24/7 ops
- **Unique angle:** AI-first + 3-min setup — same wedge as ArthaBuild

### Scenario C — Internal Tool for CFA Institute's Own Books
CFA Institute is itself a $400M+/year revenue organization (membership dues, exam fees, conferences, e-learning, certifications, sponsorships). They have legitimate ASC 606 complexity. They might want internal automation.

- **Audience:** CFA Institute's own controller / finance team
- **Business model:** Internal tool, no commercial component
- **Build profile:** One client, one chart of accounts, NetSuite-integrated (assume) — easy scope
- **Unique angle:** Reference-ready showpiece for the next conversation

### How to figure out which scenario
**Send these questions to the CFA Institute contact before our next call:**
1. "Is this for CFA Institute's own internal revenue recognition, for a product you'd offer to members, or for educational/training purposes?"
2. "Who is the intended end-user — a controller / rev-rec accountant, an analyst learning rev rec, or both?"
3. "Are you looking for a production system that posts journal entries to your GL, or an analytical / training tool?"
4. "What's the timeline — pilot in Q3 2026, production in 2027, or faster/slower?"
5. "Have you scoped the budget? (Determines whether we're competing with $250k Workiva or with a $500 CPE course.)"

**Build the demo to fit ALL THREE scenarios** so we don't have to guess. The 5-step walkthrough is the common core; we can pivot the framing on the call.

---

## 4. Functional Requirements (the "what we build")

### 4.1 Demo MVP (1–2 sessions, before next CFA Institute call)

**Goal:** Show CFA Institute a working software in 30 minutes. Convince them we know the domain and can ship.

| Module | What it does | Effort |
|--------|--------------|--------|
| **Landing page** | One-page explainer: 5-step model, why-AI, what-this-replaces | ~2h |
| **Contract upload** | Drop a PDF/DOCX or paste a SaaS contract → store + trigger parse | ~3h |
| **AI parser (Step 1+2)** | Claude extracts: customer, products, prices, dates, term, modifications. Identifies distinct POs with confidence scores + reasoning. Editable. | ~4h |
| **SSP determination (Step 4 helper)** | For each PO, suggest SSP via observable / market / cost+margin / residual. Show calculation + auditor justification. Editable. | ~3h |
| **Allocation engine (Step 4)** | Allocate transaction price across POs by relative SSP. Handle discounts. | ~2h |
| **Rev rec schedule (Step 5)** | Generate month-by-month rev rec for each PO. Support point-in-time + ratable. | ~3h |
| **Journal entries** | Generate the JEs (DR Contract Asset / CR Revenue, etc.) with proper account codes. CSV export. | ~2h |
| **Audit trail** | Every step logged with AI reasoning + human override. Export PDF. | ~2h |
| **One worked example** | Pre-loaded SaaS contract: 3-yr subscription + 1-time onboarding services + ongoing support. The "wow" moment. | ~2h |

**Total demo MVP effort: 1.5–2 sessions.**

### 4.2 Production v1 (post-demo, multi-session)

Add to the MVP:

- **Multiple contracts** — contract library, customer master, product catalog with global SSP table
- **Contract modifications** — decision tree (new contract / separate / termination + new), automatic reallocation
- **Variable consideration** — input forms, expected-value vs most-likely-amount, constraint check
- **Significant financing component** — present-value calc when payment terms exceed 12 months
- **ASC 340-40 cost capitalization** — sales commission amortization over expected customer life
- **Disclosure pack** — auto-generate the standard ASC 606 disclosures (disaggregation, contract balances, POs remaining, significant judgments)
- **GL export** — NetSuite, QuickBooks, Sage Intacct, Workday, Xero
- **CRM ingestion** — pull contracts from Salesforce / HubSpot
- **User roles** — preparer / reviewer / approver / auditor with separation of duties
- **SOC 2 readiness** — audit log, encryption, access controls

### 4.3 Production v2 (advanced)

- **Industry verticals** — telecom, construction, real estate
- **IFRS 15 mode** — toggle for non-US companies
- **Series guidance assessment** — automatic detection of series of distinct goods/services
- **Material right (loyalty programs)** — separate PO carve-out
- **SOX controls** — pre-built control matrix + testing evidence
- **Quarterly close automation** — revenue cut-off, accruals, reversals
- **Predictive disclosures** — forecast next-quarter rev rec based on backlog

---

## 5. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Auditability** | Append-only event log. Every AI suggestion + every human override is a row. Full re-derivation possible from log. |
| **Explainability** | Every AI judgment must show its reasoning (which clause it read, which authority it relied on). No black-box outputs. |
| **Anti-hallucination** | When the AI is unsure, it MUST flag — not guess. Same discipline as the ArthaBuild anti-hallucination layer. |
| **Privacy** | Contracts contain commercially sensitive terms. Must support customer-cloud deployment (BYOC) — same model as ArthaBuild on AWS. |
| **Performance** | Parse a 30-page contract in under 60 seconds. Render rev rec schedule for 100 POs in under 2 seconds. |
| **Compliance** | SOC 2 Type II readiness in roadmap. PCAOB audit-trail standards. SOX 404 controls. |
| **Versioning** | When the AI model is upgraded, prior decisions must be reproducible — pin the model version per decision. |

---

## 6. Competitive Landscape

The market is mature. Most incumbents are **expensive + slow to implement**. That's the wedge.

| Vendor | Positioning | Pricing (2026, per public sources) | Implementation time |
|--------|-------------|------------------------------------|---------------------|
| **Zuora Revenue** (formerly RevPro) | Subscription/usage-based champion. Big logos: VMware, etc. | ~$75k starting / $250k+ enterprise | 6–12 months |
| **Aptitude RevStream** (Aptitude 1Revenue) | ASC 606 + IFRS 15 enterprise. Logos: Red Hat, Intuit, Ciena | Custom quote, enterprise-only | 6–18 months |
| **Workiva** | Reporting + disclosures focus, ASC 606 module on top | Custom, enterprise | 4–9 months |
| **Oracle Revenue Management Cloud** | Bundled with Oracle ERP cloud | Bundled with Oracle ERP | 6–12 months |
| **NetSuite ARM** (Advanced Revenue Mgmt) | Bundled with NetSuite | Add-on to NetSuite licence | 2–4 months |
| **Sage Intacct** | Built-in for mid-market | Bundled with Intacct | Included |
| **DualEntry / Hubifi / Tabs / Chargebee** | New AI-first SaaS-only entrants | $5k–$50k/yr | 2–8 weeks |

**Where ArthaBuild-adjacent product fits:**
- **Smaller than** Zuora/Workiva/Oracle (won't compete on enterprise feature breadth)
- **Bigger thinker than** Hubifi/Tabs (which are SMB billing tools that bolt on rev rec)
- **AI-first + 3-minute setup + transparent reasoning** is the wedge — same playbook as ArthaBuild for NetSuite BRDs
- **Mid-market SaaS** ($10M–$500M ARR) is the sweet spot

---

## 7. Strategic Alignment with ArthaBuild

**This is the single most important point in this brief: an ASC 606 product is not a distraction from ArthaBuild — it's an adjacency that uses 70% of the same engineering.**

| ArthaBuild capability | ASC 606 reuse |
|-----------------------|---------------|
| AI parses long messy unstructured input | Same: parses contracts instead of stakeholder interviews |
| Anti-hallucination layer (deterministic pre-check + Claude + verified registry) | Same: same anti-fake-fact discipline applied to legal/accounting clauses |
| Structured output (BRD with sections + judgments) | Same: structured rev rec schedule with judgments |
| Audit trail (every judgment logged) | Same: PCAOB requires it for ASC 606 anyway |
| Customer-cloud deployment (your AWS, your data) | Same: huge selling point for finance/audit data |
| "3-minute setup" UX | Same wedge against $250k incumbents |
| TechCloudPro 2015+ implementation track record | Pivots: same firm-credibility, different domain |

**What's NEW for ASC 606:**
- Domain knowledge: 5-step model + ASUs + industry-specific guidance
- Calculation engines: SSP, allocation, rev rec schedule, JE generation
- Disclosure pack templates
- GL integrations (most have NetSuite — covered already)

**Resource load:** Demo MVP = 1–2 sessions of focused work, leveraging existing ArthaBuild infrastructure (auth, AI layer, deployment). Won't slow down the ArthaBuild launch.

**Naming option:** "ArthaBuild for Revenue" — same brand, same engine, different vertical. Or a separate brand under TechCloudPro umbrella. **Discuss with user before the demo.**

---

## 8. Tech Stack Recommendation

Match ArthaBuild's existing stack so we get reuse:

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | Next.js 16 + Tailwind v4 + shadcn/ui (Base UI) | Same as ArthaBuild + Sunkraft — proven, fast |
| Backend | Python FastAPI | Same as `dollor-p2p` backend — auth, anti-hallucination layer reusable |
| AI | Claude Opus 4.7 / Sonnet 4.6 with prompt caching | Same as ArthaBuild |
| Anti-hallucination | Same `_detect_hallucination_traps()` registry pattern from arthaBuild | Direct reuse |
| DB | PostgreSQL on AWS RDS | Same as ArthaBuild (separate DB instance to avoid cross-contamination) |
| Charts | Recharts | For rev rec waterfall, contract balance roll-forward |
| Auth | JWT, MFA, Supabase Auth (option) | Reuse ArthaBuild auth pattern |
| Deployment | Vercel frontend + AWS ECS backend | Same as ArthaBuild |
| Storage | S3 for uploaded contracts (encrypted at rest) | New (ArthaBuild doesn't store user contracts today) |
| Audit log | Append-only Postgres table + S3 archival | Standard pattern |

**New repo or fork ArthaBuild?** **New standalone repo.** Different product, different audience, separate go-to-market. Prevents accidental cross-contamination of demo data. Pattern: `github.com/jeet-avatar/asc606` (private) at `/Users/jeet/asc606/`. **Same playbook as Sunkraft, VishMed, Pacific Premier.**

---

## 9. Demo Plan for the CFA Institute Meeting

Assume 30-minute slot. Here's the demo flow:

| Time | Section | What we show |
|------|---------|--------------|
| 0:00–0:03 | Setup | "Here's a real SaaS contract — 3-year subscription, $300k/yr + $50k onboarding services + ongoing support. How long does your current rev rec process take to set this up?" Establish the 6-week pain point. |
| 0:03–0:06 | Step 1 — Contract identification | Drag the PDF in. AI extracts customer, terms, payment schedule. Highlights any ambiguous terms (right to cancel, side letters, etc.). |
| 0:06–0:11 | Step 2 — Performance obligations | Show three POs identified: subscription (over time), onboarding (point in time on go-live), support (over time). AI explains *why* each is distinct (cite ASC 606-10-25-19+). |
| 0:11–0:15 | Step 3+4 — Transaction price + allocation | Show SSP table (with provenance: "based on your last 50 deals", "residual approach used because never sold standalone"). Allocation calc visible. |
| 0:15–0:20 | Step 5 — Rev rec schedule | Month-by-month rev rec for 36 months. Visual waterfall. Cumulative + remaining POs. |
| 0:20–0:23 | Journal entries + GL export | Click "Generate JEs" → 36 monthly entries with proper account codes. CSV export, mapped to NetSuite chart of accounts. |
| 0:23–0:26 | Modification scenario | "Customer adds 2 more users in month 8 for $50k." Drop the change order. AI determines this is a contract modification → separate contract (new POs prospectively). Reallocation runs. |
| 0:26–0:28 | Audit trail | Click "Audit pack". PDF: every judgment, every override, every AI reasoning, with timestamps + user. |
| 0:28–0:30 | Pricing + next steps | Position vs Workiva/Zuora ($75k–$250k+ vs ours), AI-first wedge. Ask: "What problem inside CFA Institute is this solving?" → uncover the Scenario A/B/C answer. |

**The single hero moment:** the modification flow. Most incumbents handle this with a 2-week consulting engagement. We do it in 30 seconds with a full audit trail. That's the "I have to have this" moment.

---

## 10. Open Questions (to verify before next session)

### For the user
1. **Naming + branding** — "ArthaBuild for Revenue" vs separate brand?
2. **Repo location** — confirm new standalone repo at `github.com/jeet-avatar/asc606`?
3. **Demo target date** — when's the next CFA Institute meeting? Sets sprint length.
4. **Existing ArthaBuild engine reuse** — are you comfortable forking the anti-hallucination + AI parser code into a sibling repo, or want a clean re-write?
5. **Pricing for the pitch** — is $10k–$30k/yr / mid-market a positioning you're comfortable with, or should we go enterprise like Workiva?

### For CFA Institute (send before the call)
6. Internal tool, member-firm product, or training? (See §3, scenarios A/B/C.)
7. Who's the end user — controller, analyst, learner?
8. Is this a procurement engagement (you select vendors), or a build engagement (you commission us)?
9. Timeline + budget?
10. Are there incumbent vendors already in the running we should benchmark against?

### Anti-hallucination notes
- ASUs after April 2024 — we cited Grant Thornton's 2026 edition; verify which specific ASUs landed before quoting them in the demo
- Vendor pricing is from public 2026 sources but should be re-verified at demo time (search `"Zuora Revenue pricing 2026"` etc.)
- CFA Institute's actual revenue model + needs are conjectured here — confirm with the contact before the call
- Don't claim ArthaBuild "implements ASC 606" until we've actually shipped the demo and tested it against a known-correct example (e.g. a textbook ASC 606 case study)

---

## 11. What NOT to do this session

The user explicitly said: *"give me the deep research and what we need to build in other session so we stay true to go live of artha."*

**Therefore:**
- ✅ Filed: this research doc
- ⛔ DO NOT scaffold a new repo today
- ⛔ DO NOT write code today
- ⛔ DO NOT distract the ArthaBuild launch path
- ⛔ DO NOT pause the ArthaBuild video brainstorm in a way that loses context — leave a TODO note (see §12)

---

## 12. Loose ends parked for resumption

### ArthaBuild marketing videos brainstorm — PAUSED mid-flight
- Decided: 5 videos × 60s
- Decided: NOT YET — aspect ratio question was open ("dual: 16:9 + 1:1" was my recommendation)
- Open: topic selection per video, voice tone, render pipeline (existing Remotion repo at `/Users/jeet/arthabuild-launch-video/` vs `socialflow-prod/backend/app/utils/storyboard_parser.py`), distribution (BrandMonkz email + LinkedIn post)
- Resume by reading this doc + the prior conversation memory

### ASC 606 demo MVP — to spawn in next session
- Read this doc in full
- Confirm answers to the user-facing questions in §10
- Send the CFA-Institute-facing questions (§10) to the contact
- Once §10 #1–#5 are answered, scaffold `/Users/jeet/asc606/` per §8
- Build the demo per §4.1 (target: 1–2 sessions)
- Re-verify all ASU citations and vendor pricing immediately before the demo

---

## 13. Sources

### Standard + implementation guidance
- [PwC Viewpoint — ASC 606 five-step model (Healthcare guide §3.2)](https://viewpoint.pwc.com/dt/us/en/pwc/accounting_guides/health-care/health_care_guide/chapter_3_revenue/3_2_asc_606.html)
- [Grant Thornton — Navigating the guidance in ASC 606 and ASC 340-40 (2026 edition)](https://www.grantthornton.com/insights/articles/audit/2022/navigating-asc-606-and-340-40)
- [Deloitte — Revenue recognition for SaaS and software companies](https://www.deloitte.com/us/en/services/audit-assurance/articles/revenue-recognition-saas-software-guidance.html)
- [Cube Software — ASC 606 revenue recognition: A 2026 guide for SaaS CFOs & FP&A teams](https://www.cubesoftware.com/blog/asc-606-revenue-recognition)
- [Madras Accountancy — SaaS Revenue Recognition Under ASC 606: Implementation Guide](https://madrasaccountancy.com/blog-posts/saas-revenue-recognition-under-asc-606-implementation-guide)
- [Chargebee — Ultimate Guide to SaaS Revenue Recognition in 2026](https://www.chargebee.com/resources/guides/saas-revenue-recognition-guide/)
- [Cohen & Co — 3 Revenue Recognition Challenges for Software and SaaS Companies in 2025](https://www.cohenco.com/knowledge-center/insights/january-2025/3-revenue-recognition-challenges-and-tips-for-software-and-saas-companies-in-2025)
- [DualEntry — ASC 606 Revenue Recognition: 5 Steps & Compliance Guide](https://www.dualentry.com/blog/asc-606-revenue-recognition)
- [BillingPlatform — ASC 606 Revenue Recognition Explained: The 5-Step Framework](https://billingplatform.com/blog/what-is-asc-606-revenue-recognition)

### AI for ASC 606
- [ChatFin — AI for Revenue Recognition Under ASC 606: 2026 CFO Guide](https://chatfin.ai/blog/ai-revenue-recognition-asc-606-automation-cfo-2026/) — *cited 78%-still-need-accountants stat in §1.3*

### Vendor / market analysis
- [SaaSHub — Zuora RevPro vs Aptitude RevStream](https://www.saashub.com/compare-zuora-revpro-vs-aptitude-revstream)
- [Hubifi — Evaluating Zuora for ASC 606 & IFRS 15 Compliance](https://www.hubifi.com/blog/revpro-software-guide)
- [Hubifi — ASC 606 Software Revenue Recognition](https://www.hubifi.com/blog/asc-606-software-revenue-recognition-overcome-challenges-and-enhance-financial-accuracy)
- [Gitnux — Top 10 Best ASC 606 Revenue Recognition Software of 2026](https://gitnux.org/best/asc-606-revenue-recognition-software/)
- [Gitnux — Top 10 Best ASC 606 Automation Software of 2026](https://gitnux.org/best/asc-606-automation-software/)
- [Zenskar — Top 6 Revenue Recognition Software Solutions in 2026](https://www.zenskar.com/buyers-guide/revenue-recognition-software)
- [Alguna — 7 best SaaS revenue recognition software (2026)](https://blog.alguna.com/best-tools-for-saas-revenue-recognition/)
- [RightRev — 4 Best Revenue Accounting Automation Software](https://www.rightrev.com/revenue-accounting-automation-software/)
- [Zuora — ASC 606: A Guide to Revenue Recognition Compliance](https://www.zuora.com/glossary/asc-606/)
- [DualEntry — Revenue Recognition Software for ASC 606 & IFRS 15](https://www.dualentry.com/core-financials/revenue-recognition-software)

### Variable consideration / SSP detail
- [RevenueHub — Allocating Variable Consideration in ASC 606](https://www.revenuehub.org/article/allocating-variable-consideration)
- [Houseblend — ASC 606 Revenue Recognition: The 5-Step Model Explained](https://www.houseblend.io/articles/asc-606-revenue-recognition-5-step-model)

### CFA Institute curriculum context
- [FindMyCollege — CFA 2026: Eligibility, Levels, Exam Dates, Fees, Syllabus](https://articles.findmycollege.com/cfa-complete-guide/) — for confirming ASC 606 / IFRS 15 are in CFA Level 1+2 Financial Reporting track

### Verification status
- 5-step model: ✅ verified across PwC + Grant Thornton + multiple secondary sources
- Effective dates (Dec 2017 / Dec 2018): ✅ widely documented; do final FASB cross-check before demo
- ASUs after Apr 2024: ⚠️ cited via Grant Thornton 2026 edition, verify specific ASU numbers before quoting
- Vendor pricing: ⚠️ from public 2026 sources, re-verify at demo time
- CFA Institute scenarios A/B/C: ⚠️ conjecture, must confirm with the contact

---

*End of research brief. Pick this up in a fresh session before the next CFA Institute meeting.*
