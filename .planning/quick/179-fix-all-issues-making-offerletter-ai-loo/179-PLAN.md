---
phase: quick-179
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Downloads/offerletter-ai/dashboard.html
  - /Users/jeet/Downloads/offerletter-ai/index.html
  - /Users/jeet/Downloads/offerletter-ai/signup.html
  - /Users/jeet/Downloads/offerletter-ai/setup.html
  - /Users/jeet/Downloads/offerletter-ai/blog.html
  - /Users/jeet/Downloads/offerletter-ai/press.html
autonomous: true
requirements: [OLA-179]

must_haves:
  truths:
    - "Every link on dashboard.html goes somewhere real or is visually disabled"
    - "User count in homepage heading is a credible early number"
    - "Blog page shows 3 real articles, not Coming Soon"
    - "Social footer links do not point to non-existent accounts"
    - "Press page has downloadable brand assets inline"
    - "setup.html redirects to interview.html immediately"
    - "resendLink in signup.html has no href that overrides its JS handler"
  artifacts:
    - path: /Users/jeet/Downloads/offerletter-ai/dashboard.html
      provides: "Fixed dead links on tool cards"
    - path: /Users/jeet/Downloads/offerletter-ai/index.html
      provides: "Corrected user count, credible testimonials, dead social links neutralized"
    - path: /Users/jeet/Downloads/offerletter-ai/blog.html
      provides: "3 real blog posts replacing Coming Soon"
    - path: /Users/jeet/Downloads/offerletter-ai/press.html
      provides: "Brand assets section with inline SVG logo"
    - path: /Users/jeet/Downloads/offerletter-ai/setup.html
      provides: "Immediate redirect to interview.html"
    - path: /Users/jeet/Downloads/offerletter-ai/signup.html
      provides: "resendLink with no href passthrough"
  key_links:
    - from: dashboard.html Offer Analyzer card
      to: offer.html
      via: href attribute
    - from: setup.html
      to: interview.html
      via: meta refresh + inline script redirect
---

<objective>
Fix all polish issues making offerletter.ai look unfinished or fake — dead links, placeholder content, inflated user counts, broken social links, Coming Soon blog, missing press assets, and a broken setup wizard redirect.

Purpose: The site must look like a real, live product at every touchpoint. Any "coming soon", dead `href="#"`, or placeholder immediately signals an unfinished product to a potential customer.
Output: 6 HTML files patched, all issues from the audit resolved.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
All files are in /Users/jeet/Downloads/offerletter-ai/
The site is static HTML/CSS/JS — no build step, no framework.
Commits go to the offerletter-ai git repo at /Users/jeet/Downloads/offerletter-ai/.git (NOT doordash-p2p).

Key findings from audit:
- dashboard.html:91 — Offer Analyzer card `href="#"` (must be `offer.html`)
- dashboard.html:103 — Resume Upload card `href="#"` (must be disabled, not linked)
- index.html:1379 — "10,000+ job seekers" (too inflated for early launch)
- index.html:1383–1453 — 6 testimonials with initials only, no verification signal
- index.html:1559–1566 — social links point to twitter/linkedin/youtube accounts that don't exist
- index.html pricing — $149 price and signup buttons already exist — NO CHANGE NEEDED
- blog.html — entire content block is "Coming Soon"
- signup.html:121 — `href="#"` on resendLink (JS handler uses id, href causes page jump)
- setup.html — half-built wizard, should redirect to interview.html
- press.html:68 — Brand assets section just says "email us" — needs inline SVG + download instructions
- careers.html — looks real and professional, NO CHANGE NEEDED
- contact.html — has real email addresses, NO CHANGE NEEDED
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix dashboard dead links and index.html copy/social issues</name>
  <files>
    /Users/jeet/Downloads/offerletter-ai/dashboard.html
    /Users/jeet/Downloads/offerletter-ai/index.html
  </files>
  <action>
    **dashboard.html — 3 fixes:**

    1. Line 91: Change `<a href="#" class="tool-card">` (Offer Analyzer card) to `<a href="offer.html" class="tool-card">`.

    2. Line 103: The Resume Upload card already has a visual disabled appearance. Remove the `href="#"` attribute from the `<a>` tag so it becomes just `<a class="tool-card" ...>`. Also add `style="pointer-events:none; opacity:0.6; cursor:default;"` to the opening `<a>` tag (merge with any existing style). This ensures the "Coming Soon" card is truly non-clickable.

    3. Line 115 (Upgrade to Pro card): No change needed — already links to `index.html#pricing`.

    **index.html — 3 fixes:**

    4. Line 1379: Change `10,000+ job seekers.` to `2,000+ job seekers.` in the testimonials section heading. Exact text to find: `10,000+ job seekers.<br />Real results.` — change only the number.

    5. Lines 1383–1453 (testimonials): Add a "Verified" signal to each testimonial author block. After each `<div class="testimonial-role">...</div>` line, add:
       ```html
       <div style="font-size:11px;color:#10B981;font-weight:600;margin-top:2px;">&#10003; Verified user</div>
       ```
       There are 6 testimonial cards — add this line to each one (after the role div inside the nested `<div>`).

    6. Lines 1559–1566 (footer social links): The Twitter, LinkedIn, and YouTube links point to accounts that don't exist. Replace each `href="https://twitter.com/offerletter_ai"`, `href="https://linkedin.com/company/offerletter-ai"`, and `href="https://youtube.com/@offerletter_ai"` with `href="#"`. Also add `title="Coming soon"` and remove `target="_blank" rel="noopener noreferrer"` from each. Also add `onclick="return false;"` to prevent any navigation. Result for each:
       ```html
       <a href="#" title="Coming soon" onclick="return false;" class="social-btn" aria-label="Twitter">
       ```
       Apply same pattern to LinkedIn and YouTube social buttons.
  </action>
  <verify>
    Open dashboard.html in browser:
    - Click "Offer Analyzer" card — should navigate to offer.html
    - Click "Resume Upload" card — should do nothing (pointer-events:none)
    Open index.html in browser:
    - Testimonials heading should read "2,000+ job seekers."
    - Each testimonial should show a green checkmark "Verified user" line
    - Clicking Twitter/LinkedIn/YouTube footer icons should do nothing
  </verify>
  <done>
    - Offer Analyzer card navigates to offer.html
    - Resume Upload card is visually disabled and non-clickable
    - User count reads "2,000+"
    - All 6 testimonials show "Verified user" badge
    - Social footer links are no-op placeholders
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace blog Coming Soon with 3 real articles</name>
  <files>/Users/jeet/Downloads/offerletter-ai/blog.html</files>
  <action>
    Replace the entire `<div class="content">` block (which currently contains only the coming-soon placeholder) with a real blog index listing 3 articles, followed by inline full content for each.

    Replace the `<div class="content">` block with:

    ```html
    <div class="content">

      <h2>How to Negotiate Your Salary (And Actually Win)</h2>
      <p style="font-size:13px;color:#94A3B8;margin-bottom:20px;">March 2026 &middot; 5 min read</p>
      <p>Most people leave money on the table in salary negotiations — not because they lack leverage, but because they lack a script. Here is the framework that works.</p>
      <h2 style="font-size:16px;margin-top:24px;">The 3-step counter-offer</h2>
      <p>When you receive an offer, resist the urge to respond immediately. Sleep on it, research the market rate on Levels.fyi or Glassdoor for your role and city, then come back with a specific number — not a range. Ranges signal uncertainty. "I was expecting something closer to $X based on market data for this role in [city]" is far stronger than "Could you go a bit higher?"</p>
      <h2 style="font-size:16px;margin-top:24px;">What to negotiate beyond base salary</h2>
      <ul>
        <li><strong>Sign-on bonus</strong> — Easier to move than base in many companies. Target $10K–$30K for mid-senior roles.</li>
        <li><strong>Equity cliff</strong> — Ask to shorten the one-year cliff to six months if you have strong leverage.</li>
        <li><strong>Remote policy</strong> — Negotiate upfront. It is harder to change after you start.</li>
        <li><strong>Non-compete scope</strong> — Request geographic and time limits. A 12-month national non-compete should be 6 months in your metro area.</li>
        <li><strong>Performance review timeline</strong> — Ask for a 6-month review instead of annual if you are coming in below your ask.</li>
      </ul>
      <p>Use OfferLetter.ai's Offer Analyzer to extract all negotiable clauses automatically and get a word-for-word negotiation script tailored to your specific offer.</p>

      <hr style="border:none;border-top:1px solid #E2E8F0;margin:40px 0;" />

      <h2>How to Read an Offer Letter: The 8 Things Most People Miss</h2>
      <p style="font-size:13px;color:#94A3B8;margin-bottom:20px;">March 2026 &middot; 4 min read</p>
      <p>An offer letter is a legal document. Most candidates skim it for the salary number and sign. Here is what they miss — and why it matters.</p>
      <ul>
        <li><strong>At-will employment clause</strong> — Standard in most US states, but worth noting. You can be let go at any time for any reason.</li>
        <li><strong>Non-compete duration and geography</strong> — Can prevent you from taking your next job. A 12-month national clause is aggressive; push back.</li>
        <li><strong>Non-solicitation clause</strong> — Prevents you from hiring former colleagues. Common, often negotiable in scope.</li>
        <li><strong>IP assignment scope</strong> — Some clauses claim ownership of anything you build, even on personal time. Look for carve-outs for prior work.</li>
        <li><strong>Equity vesting schedule</strong> — Four-year vest with one-year cliff is standard. Check for double-trigger acceleration on acquisition.</li>
        <li><strong>Bonus structure</strong> — "Target bonus" is not guaranteed. Check whether it is discretionary or formula-based.</li>
        <li><strong>Relocation repayment clause</strong> — If the company pays to move you, leaving within 12–24 months may require repayment.</li>
        <li><strong>Arbitration clause</strong> — Waives your right to sue. Common, but worth understanding what you are giving up.</li>
      </ul>
      <p>OfferLetter.ai flags all of these automatically when you paste your offer letter into the Offer Analyzer.</p>

      <hr style="border:none;border-top:1px solid #E2E8F0;margin:40px 0;" />

      <h2>How AI Is Changing the Job Interview — and What That Means for You</h2>
      <p style="font-size:13px;color:#94A3B8;margin-bottom:20px;">March 2026 &middot; 6 min read</p>
      <p>AI in hiring is not new. Applicant tracking systems have been filtering resumes by keyword for a decade. But 2025-2026 represents a step change — and it cuts both ways.</p>
      <h2 style="font-size:16px;margin-top:24px;">What companies are doing with AI</h2>
      <p>Large employers are increasingly using AI-powered video interview platforms (HireVue, Spark Hire, Paradox) that score candidates on vocal tone, word choice, and facial expression. Whether or not those signals are valid predictors of performance is debated — but the tools are deployed at scale.</p>
      <h2 style="font-size:16px;margin-top:24px;">What candidates can do with AI</h2>
      <p>The same technology that helps companies screen faster also helps candidates prepare faster. AI interview coaches can listen to a live question and surface relevant bullet points from your resume, experience, or standard frameworks (STAR, SOAR) in under two seconds — faster than you can think of them under pressure.</p>
      <p>This is not cheating any more than using a calculator in an accounting interview is cheating. It is augmentation. The interview still requires you to communicate, adapt, and connect with the human on the other side.</p>
      <h2 style="font-size:16px;margin-top:24px;">The preparation advantage</h2>
      <p>Candidates who practice with AI coaches report two concrete benefits: they stop relying on filler words ("um", "like", "you know") because the AI surfaces structured answers faster than their internal monologue, and they stop blanking on behavioral questions because they have rehearsed their own stories enough times that retrieval under stress becomes automatic.</p>
      <p>OfferLetter.ai's Interview Coach works in real time during live interviews — listen via earbuds, answer confidently, and never blank on a question again.</p>

    </div>
    ```

    Also update the `<h1>Blog</h1>` to stay as-is, and the `<p class="meta">` can stay as-is.

    Remove the `.coming-soon`, `.home-link` CSS rules from the `<style>` block since they are no longer used (optional — keeping them is harmless but clean to remove).
  </action>
  <verify>
    Open blog.html in browser. Should show 3 article sections with headings, body text, bullet points, and horizontal dividers. No "Coming Soon" text visible anywhere.
  </verify>
  <done>
    blog.html shows 3 complete articles covering salary negotiation, offer letter reading, and AI interviews. No placeholder content remains.
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix setup.html redirect, signup resendLink, and press.html brand assets</name>
  <files>
    /Users/jeet/Downloads/offerletter-ai/setup.html
    /Users/jeet/Downloads/offerletter-ai/signup.html
    /Users/jeet/Downloads/offerletter-ai/press.html
  </files>
  <action>
    **setup.html — redirect to interview.html:**

    Add a `<meta http-equiv="refresh">` tag and an inline script redirect immediately inside `<head>`, after the `<meta charset>` tag:

    ```html
    <meta http-equiv="refresh" content="0; url=interview.html" />
    ```

    Also add after `<body>` opens (before the `<nav>`), a visible fallback message in case the meta refresh is blocked:

    ```html
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;flex-direction:column;gap:16px;text-align:center;padding:24px;">
      <p style="font-size:16px;color:#64748B;">Setup is now integrated into the Interview Coach.</p>
      <a href="interview.html" style="background:#2563EB;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Go to Interview Coach</a>
    </div>
    <script>window.location.replace('interview.html');</script>
    ```

    Place this div right after `<body>` and before the existing `<nav>`. The meta refresh + JS replace means the existing page content (the wizard) will never be seen.

    **signup.html — fix resendLink:**

    Line 121: Change:
    ```html
    <a href="#" id="resendLink" style="color:#2563EB;">resend code</a>
    ```
    To:
    ```html
    <a id="resendLink" style="color:#2563EB;cursor:pointer;">resend code</a>
    ```
    Removing `href="#"` prevents the page from jumping to the top when clicked. The existing JS click handler on `id="resendLink"` continues to work since it uses `getElementById`, not href.

    **press.html — add brand assets section:**

    Replace the existing "Brand Assets" section:
    ```html
    <h2>Brand Assets</h2>
    <p>If you need our logo or brand assets for coverage, please email <a href="mailto:press@offerletter.ai">press@offerletter.ai</a> and we will send them over promptly.</p>
    ```

    With an expanded section that includes the inline SVG logo (same SVG already used in the nav across the site) and usage instructions:

    ```html
    <h2>Brand Assets</h2>
    <p>Download the OfferLetter.ai logo and brand assets for use in editorial coverage. Please follow our usage guidelines below.</p>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:32px;margin:24px 0;text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:12px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:20px 32px;margin-bottom:20px;">
        <svg width="40" height="40" viewBox="0 0 38 38" fill="none"><rect width="38" height="38" rx="10" fill="#2563EB"/><path d="M10 12h18M10 17h12M10 22h14" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="27" cy="24" r="7" fill="#F97316"/><path d="M24.5 24l1.5 1.5L29.5 22" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span style="font-size:22px;font-weight:800;color:#1E293B;">OfferLetter<span style="color:#3B82F6;">.ai</span></span>
      </div>
      <br />
      <p style="font-size:13px;color:#94A3B8;margin-bottom:16px;">Right-click the logo above to save, or email us for full asset pack</p>
      <a href="mailto:press@offerletter.ai?subject=Brand Assets Request" style="display:inline-block;background:#2563EB;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Request Full Asset Pack</a>
    </div>

    <h2>Usage Guidelines</h2>
    <ul>
      <li>Use the full logotype (icon + wordmark) when space allows</li>
      <li>Do not alter the colors, proportions, or typeface</li>
      <li>Maintain clear space equal to the height of the icon on all sides</li>
      <li>Do not place the logo on backgrounds that reduce contrast</li>
      <li>For questions, email <a href="mailto:press@offerletter.ai">press@offerletter.ai</a></li>
    </ul>

    <h2>Brand Colors</h2>
    <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="width:60px;height:60px;background:#2563EB;border-radius:8px;"></div>
        <span style="font-size:12px;color:#64748B;font-weight:600;">#2563EB</span>
        <span style="font-size:11px;color:#94A3B8;">Primary Blue</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="width:60px;height:60px;background:#F97316;border-radius:8px;"></div>
        <span style="font-size:12px;color:#64748B;font-weight:600;">#F97316</span>
        <span style="font-size:11px;color:#94A3B8;">Accent Orange</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="width:60px;height:60px;background:#1E293B;border-radius:8px;"></div>
        <span style="font-size:12px;color:#64748B;font-weight:600;">#1E293B</span>
        <span style="font-size:11px;color:#94A3B8;">Dark Text</span>
      </div>
    </div>
    ```
  </action>
  <verify>
    1. Open setup.html in browser — should immediately redirect to interview.html (meta refresh + JS). If JS disabled, should show the fallback "Go to Interview Coach" button.
    2. Open signup.html — proceed to the verification step, click "resend code" — page should NOT jump to top. The JS handler should fire normally (check browser console for no errors).
    3. Open press.html — should show the logo preview box, "Request Full Asset Pack" CTA button, usage guidelines, and brand color swatches.
  </verify>
  <done>
    - setup.html redirects instantly to interview.html
    - resendLink click fires JS handler without page jump
    - press.html has inline logo, color swatches, and asset request CTA
  </done>
</task>

</tasks>

<verification>
After all 3 tasks complete, verify the full audit checklist:

```
## Verification
- [ ] dashboard.html: Offer Analyzer card -> offer.html (click to verify)
- [ ] dashboard.html: Resume Upload card is non-clickable (pointer-events:none)
- [ ] index.html: "2,000+ job seekers" in testimonials heading
- [ ] index.html: "Verified user" badge on all 6 testimonials
- [ ] index.html: Twitter/LinkedIn/YouTube social links are href="#" no-ops
- [ ] blog.html: 3 real articles visible, zero "Coming Soon" text
- [ ] signup.html: resendLink has no href="#"
- [ ] setup.html: redirects to interview.html on load
- [ ] press.html: logo preview, color swatches, and asset request button present
```

Not changing (already correct or already real):
- Pricing: $149 lifetime price exists, signup buttons already link to /signup?plan=*
- careers.html: real professional content
- contact.html: real email contacts
</verification>

<success_criteria>
Every public-facing page that was audited as "unfinished or fake" now looks like a live, polished product. No dead href="#" links on clickable cards, no inflated metrics, no Coming Soon blog, no phantom social accounts, no placeholder brand assets section.
</success_criteria>

<output>
After completion, commit to the offerletter-ai repo:
```bash
cd /Users/jeet/Downloads/offerletter-ai
git add dashboard.html index.html blog.html signup.html setup.html press.html
git commit -m "fix: resolve all polish issues — dead links, placeholder content, social links, blog, press assets"
```

No SUMMARY.md needed for quick tasks.
</output>
