---
phase: quick-217
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/diagram.html
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/generate-pdf.js
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/package.json
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.html
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.json
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/CampaignTutorialScenes.tsx
  - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/Root.tsx
autonomous: true
requirements: [BRANDMONKZ-217]

must_haves:
  truths:
    - "diagram.html opens in browser and shows 8 animated steps with orange numbered circles"
    - "generate-pdf.js runs with node and produces campaign-guide.pdf"
    - "8 campaign tutorial Remotion scenes exist, each 5 seconds at 30fps"
    - "email-template.html renders a professional placement email with $2/hr contract and 15% FT pricing"
    - "email-template.json contains subject, preheader, and body fields for CRM import"
  artifacts:
    - path: "/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/diagram.html"
      provides: "Self-contained HTML flowchart, 8 steps, BrandMonkz branding"
    - path: "/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/generate-pdf.js"
      provides: "Puppeteer script producing campaign-guide.pdf"
    - path: "/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.html"
      provides: "Placement email with pricing + feasibility comment block"
    - path: "/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/CampaignTutorialScenes.tsx"
      provides: "8 Remotion scenes for campaign tutorial"
  key_links:
    - from: "generate-pdf.js"
      to: "diagram.html"
      via: "puppeteer page.goto()"
      pattern: "diagram.html"
    - from: "Root.tsx"
      to: "CampaignTutorialScenes.tsx"
      via: "import + Composition registration"
      pattern: "CampaignTutorial"
---

<objective>
Build 4 BrandMonkz campaign tutorial artifacts: an HTML visual flowchart, a puppeteer PDF generator, 8 Remotion video scenes, and a professional IT placement email template.

Purpose: Give Rajesh ready-to-use materials to onboard BrandMonkz clients and pitch IT staffing placements.
Output: diagram.html, generate-pdf.js, package.json, email-template.html, email-template.json, CampaignTutorialScenes.tsx (registered in Root.tsx)
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/ROADMAP.md

Existing Remotion project: /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/
- fps: 30, width: 1280, height: 720
- Existing scenes: WelcomeScene, LoginScene, CampaignsScene, ContactsScene, ChatbotScene, OutroScene
- Root.tsx has single Composition "BrandMonkzExplainer" with durationInFrames=900
- Root.tsx must be updated to add a new "CampaignTutorial" Composition (8 scenes × 150 frames = 1200 frames)

Output directory for new files: /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/
(Create this directory — it does not yet exist)
</context>

<tasks>

<task type="auto">
  <name>Task 1: HTML Visual Flowchart (diagram.html)</name>
  <files>/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/diagram.html</files>
  <action>
Create directory `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/` then write `diagram.html` as a fully self-contained single HTML file (no CDN, no external deps).

Visual design:
- Dark background (#1A1A2E), orange accent (#FF6B35), indigo (#4F46E5)
- Full-viewport centered layout, max-width 900px, scrollable vertically
- BrandMonkz logo text header (orange gradient "BrandMonkz", subtitle "Campaign Tutorial")

8 steps displayed as a vertical connected flow:

| # | Emoji | Title (3 words max) | 1-line description |
|---|-------|--------------------|--------------------|
| 1 | 🔑 | Login & Enter | Sign in at app.brandmonkz.com with your email |
| 2 | 📧 | Setup Email Server | Connect your Gmail or SMTP so emails actually land |
| 3 | 📣 | Go To Campaigns | Click "Campaigns" in the left menu |
| 4 | ✏️ | Create Campaign | Hit "New Campaign", give it a name and subject line |
| 5 | 🤖 | Write With AI | Click "AI Write" — describe your goal in one sentence |
| 6 | 👥 | Add Your Contacts | Pick a contact group or paste a list of emails |
| 7 | 🚀 | Review & Launch | Check preview, hit Send — your campaign is live |
| 8 | 📊 | Track Your Results | Watch opens, clicks, and replies roll in |

Each step card:
- Rounded card (border-radius: 16px), subtle glass-morphism (rgba white 0.05 bg, 1px rgba white 0.1 border)
- Left side: large numbered circle (60px, orange bg #FF6B35, white number, font-size 28px bold)
- Center: emoji (font-size 64px, display block)
- Right side: title (font-size 22px, bold, white), description (font-size 16px, #B0B0C3)
- Hover: card lifts (transform translateY -4px, box-shadow glow orange)

Connecting arrows between cards:
- SVG chevron arrow (↓), orange color, 32px, centered between cards
- CSS animation: `arrowPulse` — opacity cycles 0.4→1→0.4 over 1.5s ease-in-out, infinite
- No animation on the cards themselves (arrows only animate)

Footer: "BrandMonkz — Smart Email Marketing for Growing Businesses"
  </action>
  <verify>open /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/diagram.html</verify>
  <done>Browser shows 8 step cards with orange numbered circles, large emojis, animated arrows between steps, dark background. No external network requests needed.</done>
</task>

<task type="auto">
  <name>Task 2: PDF Generator (generate-pdf.js + package.json)</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/generate-pdf.js
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/package.json
  </files>
  <action>
Write `package.json`:
```json
{
  "name": "brandmonkz-campaign-guide",
  "version": "1.0.0",
  "scripts": { "generate": "node generate-pdf.js" },
  "dependencies": { "puppeteer": "^21.0.0" }
}
```

Write `generate-pdf.js` using puppeteer to produce `campaign-guide.pdf` in the same directory.

Structure: 10 pages total (A4 size, portrait).

Page layout approach: Build one long HTML string with CSS `@page` breaks (page-break-after: always on each section div). Puppeteer renders the HTML string via `page.setContent()` (NOT file path — avoids file:// permission issues with puppeteer on some systems).

Pages:

**Page 1 — Cover**
- Dark bg (#1A1A2E), centered
- BrandMonkz logo (orange, 72px)
- Subtitle: "Email Campaign Tutorial" (white, 36px)
- Date: "2026" (gray)
- Tagline: "Smart Email Marketing for Growing Businesses"

**Pages 2-9 — One page per step**
Each page:
- Top-left: step number pill (orange bg, "Step X of 8", white 14px)
- Center: emoji (120px)
- Title (bold, 42px, white)
- Description (18px, #B0B0C3)
- 4 bullet points (16px, white, left-aligned, max-width 600px centered):
  - Step 1 bullets: Go to app.brandmonkz.com · Enter email + password · Click "Login" · You're in!
  - Step 2 bullets: Go to Settings → Email · Choose Gmail OAuth or SMTP · Test connection · Green check = ready
  - Step 3 bullets: Look for "Campaigns" in sidebar · Click it · You'll see all past campaigns · Top-right = "New Campaign"
  - Step 4 bullets: Click "New Campaign" · Enter campaign name · Write subject line · Choose campaign type
  - Step 5 bullets: Click "AI Write" button · Describe your goal in 1 sentence · AI drafts the email · Edit or use as-is
  - Step 6 bullets: Click "Add Contacts" · Choose a saved group OR paste emails · Preview recipient count · Confirm list
  - Step 7 bullets: Click "Preview" to see final email · Check subject line · Hit "Send Now" or schedule · Confirm launch
  - Step 8 bullets: Go to Campaign → Results · See open rate, click rate, replies · Export CSV if needed · Adjust next campaign
- Screenshot placeholder box: 400×200px dashed border (#FF6B35), text "[ Screenshot goes here ]" centered in gray

**Page 10 — Pricing + Email Template Preview**
Two sections side by side:
Left: "Our Pricing" — two pricing cards (Contract: $2/hr flat, Full-Time: 15% first-year salary)
Right: "Email Template Preview" — small preview box showing the placement email subject + first 3 lines

Dark bg throughout. All inline styles (no external CSS files).

Puppeteer config:
```js
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setContent(htmlString, { waitUntil: 'networkidle0' });
await page.pdf({
  path: 'campaign-guide.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' }
});
```

After writing, run: `cd /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide && npm install && node generate-pdf.js`
  </action>
  <verify>ls -lh /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/campaign-guide.pdf</verify>
  <done>campaign-guide.pdf exists and is >50KB. Running `node generate-pdf.js` completes without errors.</done>
</task>

<task type="auto">
  <name>Task 3: Remotion Campaign Tutorial Scenes</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/CampaignTutorialScenes.tsx
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/Root.tsx
  </files>
  <action>
Create `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/CampaignTutorialScenes.tsx`.

This file exports 8 scene components + one master `CampaignTutorialVideo` component that sequences them all.

Each scene component (Scene1Login, Scene2EmailSetup, Scene3Campaigns, Scene4CreateCampaign, Scene5WriteAI, Scene6Contacts, Scene7Launch, Scene8Results):
- Props: none (uses `useCurrentFrame`, `useVideoConfig` from remotion)
- Duration: 150 frames each (5 seconds at 30fps)
- Layout: 1280×720, dark bg (#1A1A2E), centered flex column

Animations (use `interpolate` and `spring` from remotion):
- Emoji: scale spring from 0→1, starts at frame 0, mass=0.5, stiffness=200, damping=12
- Step number pill (e.g., "Step 1 of 8"): slides in from left, opacity interpolate 0→1 frames 0-15
- Title: slides up from +30px, opacity 0→1, frames 10-25
- Description: fades in, frames 20-40
- Progress bar at bottom: orange (#FF6B35) bar width interpolates from 0% to (stepIndex/8 × 100)% over frames 0-60

Step data (same as HTML steps):
```
1: emoji=🔑 title="Login & Enter" desc="Sign in at app.brandmonkz.com with your email"
2: emoji=📧 title="Setup Email Server" desc="Connect your Gmail or SMTP so emails actually land"
3: emoji=📣 title="Go To Campaigns" desc="Click Campaigns in the left menu"
4: emoji=✏️ title="Create Campaign" desc="Hit New Campaign, give it a name and subject line"
5: emoji=🤖 title="Write With AI" desc="Click AI Write — describe your goal in one sentence"
6: emoji=👥 title="Add Your Contacts" desc="Pick a contact group or paste a list of emails"
7: emoji=🚀 title="Review & Launch" desc="Check preview, hit Send — your campaign is live"
8: emoji=📊 title="Track Your Results" desc="Watch opens, clicks, and replies roll in"
```

`CampaignTutorialVideo` master component:
- Total 1200 frames (8 × 150)
- Uses `<Sequence from={stepIndex * 150} durationInFrames={150}>` for each scene
- Renders all 8 scenes in sequence

Update `Root.tsx`: add a second `<Composition>` for the campaign tutorial:
```tsx
<Composition
  id="CampaignTutorial"
  component={CampaignTutorialVideo}
  durationInFrames={1200}
  fps={30}
  width={1280}
  height={720}
  defaultProps={{}}
/>
```
Import `CampaignTutorialVideo` from `./scenes/CampaignTutorialScenes`.

Do NOT modify the existing "BrandMonkzExplainer" composition.

Use only: `remotion` (already installed), React (already installed). No new dependencies.
  </action>
  <verify>cd /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video && npx tsc --noEmit 2>&1 | tail -20</verify>
  <done>TypeScript compiles without errors. Root.tsx has two Compositions: BrandMonkzExplainer (900 frames) and CampaignTutorial (1200 frames). CampaignTutorialScenes.tsx exports 8 scene components and CampaignTutorialVideo.</done>
</task>

<task type="auto">
  <name>Task 4: Placement Email Template (email-template.html + email-template.json)</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.html
    /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.json
  </files>
  <action>
Write `email-template.html` — a professional HTML email (table-based layout for email client compatibility, max-width 600px, inline styles).

Structure:
- Preheader text (hidden, 1px): "Contract at $2/hr. Full-time at 15%. No surprises, no markups."
- Header: white bg, BrandMonkz logo (orange text), tagline "Powered by TechCloudPro"
- Body (light gray bg #F5F5F5, body white card):

  **Opening paragraph:**
  "Hi [First Name],
  Finding the right tech talent shouldn't cost you a fortune — or your sanity. Most staffing firms charge 15–20% markup on contractor rates and 20–25% on full-time salaries. We do it differently."

  **Two pricing cards (side by side, table layout):**

  Left card (orange border-top 4px #FF6B35):
  - Heading: "Contract Placements"
  - Price: "$2/hr flat fee" (large, orange, bold)
  - Fine print: "You pay the candidate's rate + $2/hr. That's it."
  - Bullets: No percentage markups · Scales with your team · Transparent billing every month

  Right card (indigo border-top 4px #4F46E5):
  - Heading: "Full-Time Placements"
  - Price: "15% of first-year salary" (large, indigo, bold)
  - Fine print: "Industry standard is 20–25%. We're 15%."
  - Bullets: One-time fee, no recurring costs · Guaranteed replacement if hire leaves in 90 days · No hidden fees

  **Why transparent pricing paragraph:**
  "We built our pricing model to earn long-term partnerships, not one-time deals. When you know exactly what you'll pay upfront, you can plan better, hire faster, and trust us with your next role — and the one after that."

  **Database section:**
  "Our database: **18,000+ pre-screened tech candidates** — NetSuite specialists, developers, QA engineers, project managers, and more. Pre-screened means we've already verified their skills, availability, and right-to-work status."

  **CTA button:** "Book a 15-Min Call" — orange bg (#FF6B35), white text, border-radius 6px, padding 14px 32px, centered, href="https://calendly.com/rajesh-techcloudpro" (placeholder)

  **Signature:**
  "Rajesh Kumar
  Senior Talent Partner — TechCloudPro / BrandMonkz
  rajesh@techcloudpro.com | +1 (555) 000-0000"

  **Footer:** dark bg (#1A1A2E), white small text: "TechCloudPro | BrandMonkz | Unsubscribe"

Include this feasibility comment block at the TOP of the HTML file (inside an HTML comment `<!-- ... -->`):

```
PRICING FEASIBILITY ASSESSMENT
================================
CONTRACT $2/HR FLAT:
- FEASIBLE for volume play.
- Example: 10 contractors × 40hr/wk × 50wks = 20,000 hrs/yr × $2 = $40,000/yr revenue per 10 placements.
- Industry context: Traditional staffing marks up 15-20% on contractor rates (e.g., on $50/hr candidate = $7.50-$10/hr markup). We charge $2/hr — a massive differentiator.
- Risk: Low margin per placement requires consistent volume (10+ active contractors to be meaningful).
- Mitigation: Use contract model to win clients fast, then upsell full-time placements.

FULL-TIME 15%:
- FEASIBLE and competitive. Industry range is 15-25%, so we're at the low end — credible and attractive.
- Example: $100K salary × 15% = $15,000 fee per placement. Strong margin, low overhead.
- Risk: Longer sales cycle. Clients need trust before handing you a FT hire.

RECOMMENDATION:
- Lead with contract model in cold outreach (low commitment, immediate ROI for client).
- Introduce full-time fee structure after first successful contract placement.
- Volume target: 15 active contractors + 3 FT placements/quarter to reach meaningful revenue.
```

Write `email-template.json`:
```json
{
  "subject": "We Place the Right Talent. You Pay Only When It Works.",
  "preheader": "Contract at $2/hr. Full-time at 15%. No surprises, no markups.",
  "from_name": "Rajesh Kumar at TechCloudPro",
  "from_email": "rajesh@techcloudpro.com",
  "body_plain": "Hi [First Name],\n\nFinding the right tech talent shouldn't cost you a fortune.\n\nCONTRACT PLACEMENTS: $2/hr flat fee. You pay the candidate rate + $2/hr. That's it.\n\nFULL-TIME PLACEMENTS: 15% of first-year salary. Industry standard is 20-25%. We're 15%.\n\nOur database: 18,000+ pre-screened tech candidates.\n\nBook a 15-min call: https://calendly.com/rajesh-techcloudpro\n\nRajesh Kumar\nSenior Talent Partner — TechCloudPro / BrandMonkz",
  "cta_text": "Book a 15-Min Call",
  "cta_url": "https://calendly.com/rajesh-techcloudpro",
  "tags": ["staffing", "placement", "contract", "full-time", "techcloudpro"]
}
```
  </action>
  <verify>open /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.html && cat /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.json | python3 -m json.tool</verify>
  <done>email-template.html renders a professional email in browser with two pricing cards, CTA button, and feasibility comment block at top. email-template.json is valid JSON with subject, preheader, body_plain, cta_text, cta_url, and tags fields.</done>
</task>

</tasks>

<verification>
Run these checks after all tasks complete:

1. `ls -lh /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/`
   Expect: diagram.html, generate-pdf.js, package.json, campaign-guide.pdf, email-template.html, email-template.json

2. `cd /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video && npx tsc --noEmit 2>&1 | grep -c error`
   Expect: 0

3. `wc -l /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/diagram.html`
   Expect: >100 lines (substantial HTML)

4. `python3 -m json.tool /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.json > /dev/null && echo OK`
   Expect: OK
</verification>

<success_criteria>
- diagram.html: self-contained, 8 steps, orange numbered circles, animated arrows, dark BrandMonkz theme, opens offline
- campaign-guide.pdf: exists and >50KB after running `node generate-pdf.js`
- CampaignTutorialScenes.tsx: 8 scene components + CampaignTutorialVideo master, TypeScript clean
- Root.tsx: two Compositions registered (BrandMonkzExplainer + CampaignTutorial), existing composition untouched
- email-template.html: table-based email layout, $2/hr + 15% pricing cards, feasibility comment block, CRM-import-ready
- email-template.json: valid JSON with all required fields
</success_criteria>

<output>
After completion, create `.planning/quick/217-build-brandmonkz-campaign-tutorial-html-/217-SUMMARY.md`
</output>
