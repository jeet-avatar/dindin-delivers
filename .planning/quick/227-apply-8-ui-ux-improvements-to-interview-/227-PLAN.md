---
phase: quick-227
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Downloads/offerletter-ai/interview.html
autonomous: true
requirements: [Q-227]
must_haves:
  truths:
    - "resumeBanner is hidden on page load (only JS sets display:flex when resume exists)"
    - "purchaseNoticeWin is shown alongside purchaseNotice when lockDownload() fires"
    - "Optional steps 4/5/6 (Mac) and 4/5 (Windows) are collapsed by default with a chevron toggle"
    - "Switching tabs persists in localStorage; page reload restores last selected tab"
    - "Type tab shows a visible lock overlay with Purchase button when user is not purchased"
    - "Using AI Effectively sidebar tip is open (expanded) by default"
    - "Mac download card shows 'macOS 12+ · One-time $19' (no '36 KB')"
  artifacts:
    - path: /Users/jeet/Downloads/offerletter-ai/interview.html
      provides: All 8 UI/UX changes applied
  key_links:
    - from: resumeBanner element
      to: JS IIFE at line ~1531
      via: style attribute must start as display:none only
    - from: lockDownload()
      to: purchaseNoticeWin element
      via: notice.style.display = 'block' added after purchaseNotice block
    - from: optional setup-step-body
      to: CSS + JS toggle
      via: hidden by default, chevron click reveals
    - from: switchMethod()
      to: localStorage key 'ol_tab'
      via: save on switch, restore on DOMContentLoaded
    - from: Type panel (unpurchased state)
      to: lock overlay div
      via: shown when !sessionId check, hidden when purchased
---

<objective>
Apply 8 targeted UI/UX fixes to /Users/jeet/Downloads/offerletter-ai/interview.html then deploy to S3/CloudFront.

Purpose: Fix display bug, missing paywall notice, scroll overwhelm, tab memory, Type tab UX, collapsed default tip, and two text corrections.
Output: Updated interview.html live at https://offerletter.ai/interview.html
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
File to edit: /Users/jeet/Downloads/offerletter-ai/interview.html

Key findings from file inspection:
- resumeBanner line 501: has BOTH `style="display:none;..."` AND `display:flex` in the same style attribute — the second overrides the first, making it always visible
- lockDownload() at line ~1698: shows `purchaseNotice` but never touches `purchaseNoticeWin` (line 820)
- Optional steps (Mac: 4/5/6, Windows: 4/5) use `.setup-step-body` — no collapse mechanism currently
- switchMethod() at line 1544: saves nothing to localStorage; no restore on load
- Type panel (id="type") at line 1248: when !sessionId the error appears in answerBox as text — no visible lock overlay before the input
- "Using AI Effectively" tip-body-wrap at line ~1443: currently has no `open` class (closed by default)
- "36 KB" appears at line 557 in mac download card meta and line 1094 in inline download section
</context>

<tasks>

<task type="auto">
  <name>Task 1: Apply fixes 1, 2, 6, 7 — targeted HTML/JS text edits</name>
  <files>/Users/jeet/Downloads/offerletter-ai/interview.html</files>
  <action>
Make these four targeted edits:

**Fix 1 — resumeBanner display bug (line ~501):**
Find the element: `<div id="resumeBanner" style="display:none;...display:flex;..."`
Remove the trailing `display:flex;` from the inline style so it reads only `display:none;` (plus the other non-display properties). The JS at line ~1538 already sets `banner.style.display = 'flex'` when a resume exists — so the inline style must start as `display:none` only.

**Fix 2 — purchaseNoticeWin not shown in lockDownload() (line ~1698-1700):**
In `function lockDownload()`, after the block:
```js
var notice = document.getElementById('purchaseNotice');
if (notice) notice.style.display = 'block';
```
Add immediately after:
```js
var noticeWin = document.getElementById('purchaseNoticeWin');
if (noticeWin) noticeWin.style.display = 'block';
```
Also in `function unlockDownload()`, after `if (notice) notice.style.display = 'none';` add:
```js
var noticeWinU = document.getElementById('purchaseNoticeWin');
if (noticeWinU) noticeWinU.style.display = 'none';
```

**Fix 6 — Auto-expand "Using AI Effectively" sidebar tip:**
Find the tip-body-wrap div immediately following the button that contains "Using AI Effectively" text (line ~1443). It currently has `class="tip-body-wrap"` with no `open`. Change it to `class="tip-body-wrap open"`. Also add `open` class to its preceding button: find `<button class="tip-card-btn"` that contains "Using AI Effectively" and change to `<button class="tip-card-btn open"`.

**Fix 7 — Mac download card text (two locations):**
1. Line ~557: Change `macOS 12+ · $19 · 36 KB` → `macOS 12+ · One-time $19`
2. Line ~1094: Change `macOS 12+ · 36 KB` → `macOS 12+ · One-time $19`
  </action>
  <verify>
After edits, grep to confirm:
```bash
grep -n "resumeBanner" /Users/jeet/Downloads/offerletter-ai/interview.html | head -5
# Must NOT show display:flex in the style attribute on the element itself

grep -n "purchaseNoticeWin\|noticeWin" /Users/jeet/Downloads/offerletter-ai/interview.html | head -10
# Must show the new noticeWin lines inside lockDownload and unlockDownload

grep -n "Using AI Effectively" /Users/jeet/Downloads/offerletter-ai/interview.html -A 3
# The tip-body-wrap after it must have class="tip-body-wrap open"

grep -n "36 KB\|One-time" /Users/jeet/Downloads/offerletter-ai/interview.html
# Must show "One-time $19", no "36 KB" remaining
```
  </verify>
  <done>
- resumeBanner element has only display:none in inline style (no display:flex)
- lockDownload() and unlockDownload() both handle purchaseNoticeWin
- "Using AI Effectively" tip starts expanded (open class on button and body)
- Both "36 KB" occurrences replaced with "One-time $19"
  </done>
</task>

<task type="auto">
  <name>Task 2: Apply fixes 3, 4, 5 — collapsible optional steps, tab persistence, Type tab lock overlay</name>
  <files>/Users/jeet/Downloads/offerletter-ai/interview.html</files>
  <action>
**Fix 3 — Collapsible optional steps:**

Add CSS in the `<style>` block (before the closing `</style>` tag):
```css
/* Collapsible optional steps */
.setup-step-body.optional-hidden { display: none; }
.setup-step-chevron {
  margin-left: auto; flex-shrink: 0;
  color: var(--text-light); transition: transform 0.2s;
}
.setup-step.optional-open .setup-step-chevron { transform: rotate(180deg); }
.setup-step-head.optional-head { cursor: pointer; user-select: none; }
.setup-step-head.optional-head:hover { background: var(--bg); border-radius: 8px; }
```

For each optional step in Mac panel (steps 4, 5, 6) and Windows panel (steps 4, 5):
- On the `<div class="setup-step-head">`, add class `optional-head` and wrap it in an `onclick` that calls `toggleOptionalStep(this)`
- Add a chevron SVG as the last child of `setup-step-head`:
  `<svg class="setup-step-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`
- On the sibling `<div class="setup-step-body">`, add class `optional-hidden` so it starts collapsed

Add JS function (in the `<script>` block, after `toggleTip`):
```js
function toggleOptionalStep(head) {
  var step = head.parentElement;
  var body = head.nextElementSibling;
  var open = step.classList.toggle('optional-open');
  if (open) {
    body.classList.remove('optional-hidden');
  } else {
    body.classList.add('optional-hidden');
  }
}
```

**Fix 4 — Persist tab selection in localStorage:**

Replace `switchMethod` function:
```js
function switchMethod(btn, id) {
  document.querySelectorAll('.method-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
  document.querySelectorAll('.method-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  btn.setAttribute('aria-selected','true');
  document.getElementById(id).classList.add('active');
  try { localStorage.setItem('ol_tab', id); } catch(e) {}
}
```

Add tab restore logic immediately after the resumeBanner IIFE (after line ~1541):
```js
// Restore last selected tab
(function() {
  var lastTab = null;
  try { lastTab = localStorage.getItem('ol_tab'); } catch(e) {}
  if (lastTab) {
    var tabBtn = document.querySelector('.method-tab[onclick*="\'' + lastTab + '\'"]');
    if (tabBtn && document.getElementById(lastTab)) {
      document.querySelectorAll('.method-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.method-panel').forEach(p => p.classList.remove('active'));
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected','true');
      document.getElementById(lastTab).classList.add('active');
    }
  }
})();
```

**Fix 5 — Type tab paywall lock overlay:**

Add CSS in `<style>` block:
```css
/* Type tab lock overlay */
.type-lock-overlay {
  display: none;
  background: linear-gradient(135deg, #FFF7ED, #FEF3C7);
  border: 1.5px solid #FED7AA;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 14px;
  text-align: center;
}
.type-lock-overlay.show { display: block; }
.type-lock-overlay h4 { font-size: 15px; font-weight: 800; color: #92400E; margin-bottom: 6px; }
.type-lock-overlay p { font-size: 13px; color: #B45309; line-height: 1.6; margin-bottom: 14px; }
.type-lock-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: #F97316; color: white;
  font-size: 14px; font-weight: 700;
  padding: 10px 24px; border-radius: 8px;
  text-decoration: none; border: none;
  cursor: pointer; transition: background 0.2s;
}
.type-lock-btn:hover { background: #EA6C00; }
```

In the TYPE PANEL div (id="type"), insert the lock overlay div immediately BEFORE the `<div class="manual-input-wrap">`:
```html
<div class="type-lock-overlay" id="typeLockOverlay">
  <h4>🔒 Purchase required to use AI answers</h4>
  <p>A one-time $19 payment unlocks unlimited AI coaching for your interviews. After payment, you're returned here automatically.</p>
  <a href="https://buy.stripe.com/4gM3cx89ibeV2nw6NE1Jm00" class="type-lock-btn">Purchase — $19</a>
</div>
```

In `lockDownload()`, add after the existing purchaseNoticeWin block:
```js
var typeLock = document.getElementById('typeLockOverlay');
if (typeLock) typeLock.classList.add('show');
```

In `unlockDownload()`, add after the noticeWinU block:
```js
var typeLockU = document.getElementById('typeLockOverlay');
if (typeLockU) typeLockU.classList.remove('show');
```

Also update the `askManual()` function — remove the plain-text error fallback (it will no longer be seen since lock overlay explains the state) but keep the early return behavior. The existing code at line ~1592 checks `if (!sessionId)` and puts text in answerBox — keep that as-is (belt-and-suspenders), but the lock overlay is the primary visual signal.
  </action>
  <verify>
```bash
grep -n "optional-hidden\|toggleOptionalStep\|optional-head\|optional-open" /Users/jeet/Downloads/offerletter-ai/interview.html | head -20
# Must show CSS classes and JS function present

grep -n "ol_tab\|lastTab" /Users/jeet/Downloads/offerletter-ai/interview.html | head -10
# Must show localStorage.setItem('ol_tab') in switchMethod and restore IIFE

grep -n "typeLockOverlay\|type-lock-overlay\|type-lock-btn" /Users/jeet/Downloads/offerletter-ai/interview.html | head -10
# Must show CSS, HTML element, and JS references in lockDownload/unlockDownload

# Count optional step bodies that now have optional-hidden class
grep -c "optional-hidden" /Users/jeet/Downloads/offerletter-ai/interview.html
# Must return 5 (Mac steps 4,5,6 + Windows steps 4,5)
```
  </verify>
  <done>
- Optional steps 4/5/6 (Mac) and 4/5 (Windows) have collapsed bodies with clickable chevron headers
- switchMethod() saves 'ol_tab' to localStorage; page load restores last selected tab
- Type tab shows prominent orange lock overlay with Purchase button when user is not purchased; overlay hidden when purchased
  </done>
</task>

<task type="auto">
  <name>Task 3: Deploy to S3 and invalidate CloudFront</name>
  <files>/Users/jeet/Downloads/offerletter-ai/interview.html</files>
  <action>
Deploy the updated file:

```bash
aws s3 cp /Users/jeet/Downloads/offerletter-ai/interview.html s3://offerletter.ai/interview.html \
  --content-type "text/html" \
  --cache-control "max-age=0"

aws cloudfront create-invalidation \
  --distribution-id E319UG6B4QE97L \
  --paths "/interview.html"
```

Wait ~30 seconds for invalidation to propagate, then verify the deployed file reflects the changes by fetching a portion:

```bash
curl -s "https://offerletter.ai/interview.html" | grep -E "36 KB|One-time|ol_tab|typeLockOverlay|optional-hidden" | head -10
```
  </action>
  <verify>
```bash
# S3 upload exit code 0
# CloudFront invalidation creates with status "InProgress" or "Completed"
# curl grep shows: "One-time" (not "36 KB"), "ol_tab", "typeLockOverlay", "optional-hidden"
```
  </verify>
  <done>
- S3 upload completes without error
- CloudFront invalidation created successfully
- Live site no longer contains "36 KB" and contains the new JS identifiers confirming all 8 changes are deployed
  </done>
</task>

</tasks>

<verification>
After all tasks complete:

1. Open https://offerletter.ai/interview.html in a browser
2. If no resume in localStorage: resumeBanner should NOT be visible
3. Switch to Windows tab, verify purchaseNoticeWin appears in the orange purchase notice area
4. Mac panel: steps 4, 5, 6 should be collapsed; click chevron to expand each
5. Switch to Phone tab, refresh — page should restore to Phone tab
6. Switch to Type tab — orange lock overlay with "Purchase — $19" button visible above input
7. Sidebar: "Using AI Effectively" tip is open/expanded by default
8. Mac download card shows "macOS 12+ · One-time $19" (no "36 KB")
</verification>

<success_criteria>
All 8 changes live at https://offerletter.ai/interview.html:
1. resumeBanner hidden by default (display:none only in element style)
2. purchaseNoticeWin shown when lockDownload() fires
3. Optional steps collapsed by default with working chevron toggle
4. Tab selection persisted in localStorage and restored on page load
5. Type tab shows lock overlay with Purchase button for non-purchased users
6. "Using AI Effectively" starts expanded
7. Mac card text is "macOS 12+ · One-time $19" (both occurrences)
8. Windows "~35 MB" text unchanged (already correct)
</success_criteria>

<output>
After completion, create `.planning/quick/227-apply-8-ui-ux-improvements-to-interview-/227-SUMMARY.md` with:
- What was changed (all 8 items with file:line references)
- Deploy confirmation (S3 + CloudFront invalidation ID)
- Any deviations from plan
</output>
