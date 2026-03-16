---
phase: quick-180
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Downloads/offerletter-ai/consent.js
  - /Users/jeet/Downloads/offerletter-ai/auth.js
  - /Users/jeet/Downloads/offerletter-ai/signup.html
  - /Users/jeet/Downloads/offerletter-ai/login.html
  - /Users/jeet/Downloads/offerletter-ai/index.html
  - /Users/jeet/Downloads/offerletter-ai/privacy.html
  - /Users/jeet/Downloads/offerletter-ai/terms.html
  - /Users/jeet/Downloads/offerletter-ai/cookies.html
  - /Users/jeet/Downloads/offerletter-ai/about.html
  - /Users/jeet/Downloads/offerletter-ai/contact.html
  - /Users/jeet/Downloads/offerletter-ai/blog.html
  - /Users/jeet/Downloads/offerletter-ai/press.html
  - /Users/jeet/Downloads/offerletter-ai/security.html
  - /Users/jeet/Downloads/offerletter-ai/changelog.html
  - /Users/jeet/Downloads/offerletter-ai/404.html
  - /Users/jeet/Downloads/offerletter-ai/sitemap.html
autonomous: true
requirements: [CONSENT-01]

must_haves:
  truths:
    - "Cookie consent banner appears on every page for first-time visitors"
    - "Banner does not appear again after user accepts"
    - "Signup cannot be submitted without agreeing to Terms, Privacy Policy, and confirming age 13+"
    - "Login page shows passive consent reminder below the sign-in button"
    - "Manage button opens modal with functional (locked on) and analytics toggles"
  artifacts:
    - path: "/Users/jeet/Downloads/offerletter-ai/consent.js"
      provides: "initCookieConsent() shared across all pages"
    - path: "/Users/jeet/Downloads/offerletter-ai/auth.js"
      provides: "calls initCookieConsent() at end of file"
    - path: "/Users/jeet/Downloads/offerletter-ai/signup.html"
      provides: "agreeTerms checkbox + submit validation"
    - path: "/Users/jeet/Downloads/offerletter-ai/login.html"
      provides: "passive consent reminder paragraph"
  key_links:
    - from: "consent.js:initCookieConsent"
      to: "localStorage ol_consent"
      via: "Accept All button onclick"
    - from: "auth.js"
      to: "consent.js:initCookieConsent"
      via: "call at end of auth.js (after Auth object + helpers)"
    - from: "signup.html form submit handler"
      to: "agreeTerms checkbox"
      via: "check BEFORE honeypot checks"
---

<objective>
Add GDPR/privacy-compliant cookie consent infrastructure and legal consent checkboxes to offerletter.ai.

Purpose: Legal compliance (GDPR, COPPA age gate), user trust, and cookie policy acknowledgment before any data use.
Output: consent.js shared file, banner on all 16 pages, terms checkbox on signup, passive reminder on login.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
All files are in /Users/jeet/Downloads/offerletter-ai/
Repo git root: /Users/jeet/Downloads/offerletter-ai/

Key facts from reading the code:
- auth.js ends at line 428 (after togglePasswordVisibility function and a trailing blank line)
- auth.js Auth object closes at line 393 (closing brace + semicolon)
- signup.html submit handler: honeypot check is at line 158-161, timing check at 162-166, then field validation
  The agreeTerms check must be added BEFORE line 158 (before honeypot checks)
- login.html: submit button is at line 78, followed by closing </form> at line 79
  The passive reminder goes between line 78 and 79 (directly after the button, inside the form)
  Wait — re-read: line 79 is </form>. The reminder goes AFTER </form> is fine too — spec says "directly below the submit button"
  Safest: insert the <p> immediately after the </form> closing tag (line 79), before the signup-link paragraph
- Pages that already load auth.js (and will get banner via auth.js call): login.html, signup.html, dashboard.html, offer.html, interview.html
- Pages that need consent.js directly: index.html, privacy.html, terms.html, cookies.html, about.html, contact.html, blog.html, press.html, careers.html, security.html, changelog.html, 404.html, sitemap.html
- forgot-password.html and setup.html also load auth.js (need to verify) — if they do, they're covered automatically
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create consent.js with initCookieConsent() and append call to auth.js</name>
  <files>
    /Users/jeet/Downloads/offerletter-ai/consent.js
    /Users/jeet/Downloads/offerletter-ai/auth.js
  </files>
  <action>
Create /Users/jeet/Downloads/offerletter-ai/consent.js as a new file containing the full initCookieConsent() function:

```javascript
/**
 * OfferLetter.ai — Cookie Consent Module
 * Shared across all pages. Called by auth.js automatically on auth pages;
 * included directly via <script src="consent.js"> on non-auth pages.
 */
function initCookieConsent() {
  const CONSENT_KEY = 'ol_consent';

  // Already consented — do nothing
  try {
    if (localStorage.getItem(CONSENT_KEY)) return;
  } catch (e) { return; }

  // ── Styles ─────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #ol-consent-banner {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
      background: #fff; border-top: 1px solid #E2E8F0;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
      padding: 16px 24px; display: flex; align-items: center;
      justify-content: space-between; gap: 16px; flex-wrap: wrap;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    #ol-consent-banner p {
      margin: 0; font-size: 13px; color: #475569; flex: 1; min-width: 200px; line-height: 1.5;
    }
    #ol-consent-banner a { color: #2563EB; text-decoration: underline; }
    #ol-consent-btns { display: flex; gap: 10px; flex-shrink: 0; }
    #ol-consent-accept {
      padding: 9px 20px; background: #2563EB; color: #fff; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: background 0.2s;
    }
    #ol-consent-accept:hover { background: #1D4ED8; }
    #ol-consent-manage {
      padding: 9px 20px; background: transparent; color: #374151;
      border: 1.5px solid #CBD5E1; border-radius: 8px; font-size: 13px;
      font-weight: 600; cursor: pointer; font-family: inherit; transition: border-color 0.2s;
    }
    #ol-consent-manage:hover { border-color: #2563EB; color: #2563EB; }
    /* Modal */
    #ol-consent-modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 10000;
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    #ol-consent-modal {
      background: #fff; border-radius: 16px; padding: 32px;
      width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.18);
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    #ol-consent-modal h2 { font-size: 18px; font-weight: 700; margin: 0 0 8px; color: #1E293B; }
    #ol-consent-modal p { font-size: 13px; color: #64748B; margin: 0 0 24px; line-height: 1.5; }
    .ol-toggle-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 0; border-bottom: 1px solid #F1F5F9;
    }
    .ol-toggle-row:last-of-type { border-bottom: none; }
    .ol-toggle-label { font-size: 14px; font-weight: 600; color: #1E293B; }
    .ol-toggle-desc { font-size: 12px; color: #94A3B8; margin-top: 2px; }
    .ol-toggle {
      position: relative; width: 44px; height: 24px; flex-shrink: 0;
    }
    .ol-toggle input { opacity: 0; width: 0; height: 0; }
    .ol-toggle-slider {
      position: absolute; inset: 0; border-radius: 12px;
      background: #CBD5E1; cursor: pointer; transition: background 0.2s;
    }
    .ol-toggle-slider::before {
      content: ''; position: absolute; left: 3px; top: 3px;
      width: 18px; height: 18px; border-radius: 50%; background: #fff;
      transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .ol-toggle input:checked ~ .ol-toggle-slider { background: #2563EB; }
    .ol-toggle input:checked ~ .ol-toggle-slider::before { transform: translateX(20px); }
    .ol-toggle input:disabled ~ .ol-toggle-slider { background: #93C5FD; cursor: not-allowed; }
    #ol-save-prefs {
      margin-top: 24px; width: 100%; padding: 12px; background: #2563EB; color: #fff;
      border: none; border-radius: 10px; font-size: 15px; font-weight: 700;
      cursor: pointer; font-family: inherit; transition: background 0.2s;
    }
    #ol-save-prefs:hover { background: #1D4ED8; }
    @media (max-width: 480px) {
      #ol-consent-banner { flex-direction: column; align-items: flex-start; }
      #ol-consent-btns { width: 100%; }
      #ol-consent-accept, #ol-consent-manage { flex: 1; text-align: center; }
    }
  `;
  document.head.appendChild(style);

  // ── Banner HTML ────────────────────────────────────────────────────────
  const banner = document.createElement('div');
  banner.id = 'ol-consent-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML = `
    <p>We use cookies and local storage to keep you signed in and improve your experience.
       By continuing you agree to our
       <a href="/privacy.html">Privacy Policy</a> and
       <a href="/cookies.html">Cookie Policy</a>.</p>
    <div id="ol-consent-btns">
      <button id="ol-consent-manage" aria-label="Manage cookie preferences">Manage</button>
      <button id="ol-consent-accept" aria-label="Accept all cookies">Accept All</button>
    </div>
  `;
  document.body.appendChild(banner);

  // ── Save helper ────────────────────────────────────────────────────────
  function saveConsent(analytics) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        analytics: analytics,
        functional: true,
        ts: Date.now()
      }));
    } catch (e) {}
  }

  // ── Accept All ─────────────────────────────────────────────────────────
  document.getElementById('ol-consent-accept').addEventListener('click', () => {
    saveConsent(true);
    banner.remove();
  });

  // ── Manage Modal ───────────────────────────────────────────────────────
  document.getElementById('ol-consent-manage').addEventListener('click', () => {
    openManageModal();
  });

  function openManageModal() {
    const overlay = document.createElement('div');
    overlay.id = 'ol-consent-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ol-modal-title');

    overlay.innerHTML = `
      <div id="ol-consent-modal">
        <h2 id="ol-modal-title">Manage Cookie Preferences</h2>
        <p>Choose which cookies you allow. Functional cookies are required for the site to work.</p>

        <div class="ol-toggle-row">
          <div>
            <div class="ol-toggle-label">Functional (Required)</div>
            <div class="ol-toggle-desc">Authentication, session management, security</div>
          </div>
          <label class="ol-toggle" aria-label="Functional cookies (always on)">
            <input type="checkbox" id="ol-toggle-functional" checked disabled />
            <span class="ol-toggle-slider"></span>
          </label>
        </div>

        <div class="ol-toggle-row">
          <div>
            <div class="ol-toggle-label">Analytics</div>
            <div class="ol-toggle-desc">Helps us understand how the site is used</div>
          </div>
          <label class="ol-toggle" aria-label="Analytics cookies">
            <input type="checkbox" id="ol-toggle-analytics" checked />
            <span class="ol-toggle-slider"></span>
          </label>
        </div>

        <button id="ol-save-prefs">Save preferences</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Focus trap: focus the save button on open
    const saveBtn = overlay.querySelector('#ol-save-prefs');
    saveBtn.focus();

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });

    // Escape key closes modal
    function handleEscape(e) {
      if (e.key === 'Escape') { closeModal(overlay); document.removeEventListener('keydown', handleEscape); }
    }
    document.addEventListener('keydown', handleEscape);

    saveBtn.addEventListener('click', () => {
      const analyticsOn = overlay.querySelector('#ol-toggle-analytics').checked;
      saveConsent(analyticsOn);
      closeModal(overlay);
      banner.remove();
    });
  }

  function closeModal(overlay) {
    overlay.remove();
    // Return focus to manage button (may no longer exist if banner gone)
    const manageBtn = document.getElementById('ol-consent-manage');
    if (manageBtn) manageBtn.focus();
  }
}
```

Then open /Users/jeet/Downloads/offerletter-ai/auth.js and append the following two lines at the very end of the file (after the existing `togglePasswordVisibility` function and trailing blank line):

```javascript
// ── Cookie Consent ───────────────────────────────────────────────────────────
if (typeof initCookieConsent === 'function') initCookieConsent();
```

Note: auth.js does NOT define initCookieConsent — consent.js does. Since auth.js is loaded after consent.js on non-auth pages, and on auth pages (login, signup, etc.) consent.js is loaded as a separate include too (see Task 3), the guard `typeof initCookieConsent === 'function'` prevents silent errors if load order is wrong.

Wait — re-read the spec: auth.js calls initCookieConsent() at the bottom. But consent.js is the file that defines it. On auth pages (login.html, signup.html, etc.) we need consent.js loaded BEFORE auth.js. So in Task 3 we add `<script src="consent.js"></script>` before `<script src="auth.js"></script>` on those pages. On non-auth pages, consent.js is loaded standalone (no auth.js).

So the correct approach for auth.js is: just call `initCookieConsent()` (no guard needed if load order is enforced). Use the guard version for safety.
  </action>
  <verify>
    Check file exists: ls -la /Users/jeet/Downloads/offerletter-ai/consent.js
    Check auth.js ends with the call: tail -5 /Users/jeet/Downloads/offerletter-ai/auth.js
    Check consent.js has the key function: grep -n "function initCookieConsent" /Users/jeet/Downloads/offerletter-ai/consent.js
    Check CONSENT_KEY: grep -n "ol_consent" /Users/jeet/Downloads/offerletter-ai/consent.js
    Check Accept All saves JSON with analytics+functional+ts: grep -n "analytics.*functional.*ts" /Users/jeet/Downloads/offerletter-ai/consent.js
  </verify>
  <done>
    consent.js exists with initCookieConsent() defined.
    auth.js last lines include the initCookieConsent() call.
    Banner is position:fixed bottom, z-index:9999, has Accept All and Manage buttons.
    Modal has functional (disabled/checked) toggle and analytics toggle.
    Escape key and overlay click close the modal.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add terms+privacy+age checkbox to signup.html and passive reminder to login.html</name>
  <files>
    /Users/jeet/Downloads/offerletter-ai/signup.html
    /Users/jeet/Downloads/offerletter-ai/login.html
  </files>
  <action>
**signup.html changes:**

1. Add `<script src="consent.js"></script>` immediately BEFORE the existing `<script src="auth.js"></script>` at line 126. Result:
   ```html
   <script src="consent.js"></script>
   <script src="auth.js"></script>
   ```

2. Insert the agreeTerms checkbox div directly above the submit button (before line 95: `<button type="submit" class="btn" id="submitBtn">Create free account</button>`):
   ```html
   <div class="form-group" style="margin-bottom:12px;">
     <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-weight:400;font-size:14px;color:#374151;">
       <input type="checkbox" id="agreeTerms" required style="margin-top:3px;width:16px;height:16px;flex-shrink:0;accent-color:#2563EB;" />
       <span>I agree to the <a href="terms.html" style="color:#2563EB;">Terms of Service</a> and <a href="privacy.html" style="color:#2563EB;">Privacy Policy</a>, and confirm I am 13 years of age or older.</span>
     </label>
   </div>
   ```

3. In the form submit handler (line 150+), add the agreeTerms check as the VERY FIRST validation — before the honeypot checks at line 158. Insert after `alertBox.className = 'alert';` (line 152) and after the variable declarations (lines 154-156), before the honeypot check block:
   ```javascript
   // Terms agreement check (must be first)
   if (!document.getElementById('agreeTerms').checked) {
     showError('Please agree to the Terms of Service and Privacy Policy to continue.');
     return;
   }
   ```

**login.html changes:**

1. Add `<script src="consent.js"></script>` immediately BEFORE the existing `<script src="auth.js"></script>` at line 86. Result:
   ```html
   <script src="consent.js"></script>
   <script src="auth.js"></script>
   ```

2. Insert the passive consent reminder paragraph immediately after `</form>` (after line 79) and before the `<p class="signup-link">` line:
   ```html
   <p style="text-align:center;font-size:12px;color:#94A3B8;margin-top:10px;">By signing in you agree to our <a href="terms.html" style="color:#64748B;">Terms</a> and <a href="privacy.html" style="color:#64748B;">Privacy Policy</a>.</p>
   ```
  </action>
  <verify>
    Check checkbox exists: grep -n "agreeTerms" /Users/jeet/Downloads/offerletter-ai/signup.html
    Check terms validation is before honeypot: grep -n "agreeTerms\|hp_website" /Users/jeet/Downloads/offerletter-ai/signup.html | head -10
    Check passive reminder: grep -n "By signing in" /Users/jeet/Downloads/offerletter-ai/login.html
    Check consent.js script tag on both pages before auth.js:
      grep -n "consent.js\|auth.js" /Users/jeet/Downloads/offerletter-ai/signup.html
      grep -n "consent.js\|auth.js" /Users/jeet/Downloads/offerletter-ai/login.html
  </verify>
  <done>
    signup.html has agreeTerms checkbox above submit button.
    Submitting without checking it shows "Please agree to the Terms of Service and Privacy Policy to continue." before any other validation.
    login.html shows passive reminder below the Sign in button.
    Both pages load consent.js before auth.js (so banner is defined when auth.js calls it).
  </done>
</task>

<task type="auto">
  <name>Task 3: Add consent.js script tag to all non-auth HTML pages</name>
  <files>
    /Users/jeet/Downloads/offerletter-ai/index.html
    /Users/jeet/Downloads/offerletter-ai/privacy.html
    /Users/jeet/Downloads/offerletter-ai/terms.html
    /Users/jeet/Downloads/offerletter-ai/cookies.html
    /Users/jeet/Downloads/offerletter-ai/about.html
    /Users/jeet/Downloads/offerletter-ai/contact.html
    /Users/jeet/Downloads/offerletter-ai/blog.html
    /Users/jeet/Downloads/offerletter-ai/press.html
    /Users/jeet/Downloads/offerletter-ai/careers.html
    /Users/jeet/Downloads/offerletter-ai/security.html
    /Users/jeet/Downloads/offerletter-ai/changelog.html
    /Users/jeet/Downloads/offerletter-ai/404.html
    /Users/jeet/Downloads/offerletter-ai/sitemap.html
  </files>
  <action>
For each of the 13 files listed above, insert `<script src="consent.js"></script>` immediately before the closing `</body>` tag.

For each file:
1. Read the file
2. Find the `</body>` tag (it appears once, near the end)
3. Insert `\n  <script src="consent.js"></script>\n` directly before `</body>`
4. Write the updated file

Also check forgot-password.html and setup.html — if they load auth.js, add consent.js before auth.js (same as Task 2 pattern). If they don't load auth.js and don't have consent.js, add consent.js before `</body>`.

After editing all files, verify coverage:
  grep -rL "consent.js\|auth.js" /Users/jeet/Downloads/offerletter-ai/*.html

This command should return no files (every HTML page should have either consent.js or auth.js, both of which trigger the banner).
  </action>
  <verify>
    Check all 13 target pages have the tag:
      grep -l "consent.js" /Users/jeet/Downloads/offerletter-ai/*.html
    Should list all 13 non-auth pages plus login.html and signup.html (from Task 2).

    Confirm no HTML page is missing both consent.js and auth.js:
      grep -rL "consent.js\|auth.js" /Users/jeet/Downloads/offerletter-ai/*.html
    Should return empty output.

    Commit to git from /Users/jeet/Downloads/offerletter-ai/:
      cd /Users/jeet/Downloads/offerletter-ai && git add consent.js auth.js index.html login.html signup.html privacy.html terms.html cookies.html about.html contact.html blog.html press.html careers.html security.html changelog.html 404.html sitemap.html forgot-password.html setup.html && git diff --cached --stat
  </verify>
  <done>
    Every .html file in offerletter-ai loads either consent.js (directly) or auth.js (which calls initCookieConsent()).
    grep -rL "consent.js\|auth.js" *.html returns empty output.
    Git staged with all modified files ready to commit.
    Commit message: "feat(quick-180): add cookie consent banner, terms checkbox on signup, passive reminder on login"
  </done>
</task>

</tasks>

<verification>
After all 3 tasks complete:

1. Open /Users/jeet/Downloads/offerletter-ai/index.html in a browser (file:// or local server).
   Clear localStorage first: localStorage.clear() in DevTools console, then reload.
   Banner should appear at bottom.

2. Click "Manage" — modal should open with two toggles (Functional locked on, Analytics toggleable).
   Press Escape — modal closes.
   Click "Manage" again, toggle Analytics off, click "Save preferences" — banner disappears.
   Reload page — no banner (consent saved to localStorage as ol_consent).

3. Open signup.html, fill all fields, leave agreeTerms unchecked, click submit.
   Should see: "Please agree to the Terms of Service and Privacy Policy to continue."
   No honeypot/timing check fires first.

4. Open login.html — should see small grey text below Sign in button: "By signing in you agree to our Terms and Privacy Policy."

5. Verify all pages covered:
   grep -rL "consent.js\|auth.js" /Users/jeet/Downloads/offerletter-ai/*.html
   Should return empty.
</verification>

<success_criteria>
- consent.js exists and defines initCookieConsent()
- auth.js calls initCookieConsent() at end of file
- All 20 HTML pages trigger the consent check (via consent.js or auth.js)
- Banner never re-appears after acceptance (localStorage guard)
- Signup form rejects submission without terms checkbox (checked BEFORE honeypot)
- Login page shows passive terms reminder
- Modal has WCAG-compliant focus management (focus on open, Escape closes)
- git commit created in /Users/jeet/Downloads/offerletter-ai/ repo
</success_criteria>

<output>
After completion, create /Users/jeet/doordash-p2p/.planning/quick/180-add-cookie-consent-banner-to-all-pages-v/180-SUMMARY.md

Include:
- Files created/modified with line counts
- Verification proof (grep outputs)
- Any deviations from plan
</output>
