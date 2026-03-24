---
phase: quick-224
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Downloads/offerletter-ai/interview.html
autonomous: true
requirements: [PAYWALL-FIX, S3-HEADERS]

must_haves:
  truths:
    - "Windows EXE download button is gated by the paywall (locked to Stripe link until purchased)"
    - "After purchase verification, Windows EXE download button unlocks correctly"
    - "Both S3 files return Content-Disposition: attachment header on direct access"
  artifacts:
    - path: "/Users/jeet/Downloads/offerletter-ai/interview.html"
      provides: "Paywall gate covering both Mac DMG and Windows EXE buttons"
      contains: "downloadBtnWin"
  key_links:
    - from: "interview.html lockDownload()"
      to: "downloadBtnWin"
      via: "document.getElementById('downloadBtnWin')"
      pattern: "downloadBtnWin.*buy\\.stripe\\.com"
    - from: "interview.html unlockDownload()"
      to: "downloadBtnWin"
      via: "document.getElementById('downloadBtnWin')"
      pattern: "downloadBtnWin.*Interview Assistant\\.exe"
---

<objective>
Fix a critical paywall bypass: the Windows EXE download button (id="downloadBtnWin") is not
gated by the purchase check, allowing free downloads. Also set Content-Disposition: attachment
on both S3 objects so direct URL access forces a download.

Purpose: Prevent revenue loss from EXE bypass; ensure download UX works correctly from direct
S3/CloudFront URLs.
Output: Patched interview.html deployed to S3, both files with correct Content-Disposition headers,
CloudFront cache invalidated.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Source file: /Users/jeet/Downloads/offerletter-ai/interview.html
S3 bucket: s3://offerletter.ai
CloudFront distribution: E319UG6B4QE97L

The paywall gate lives in a self-invoking function at lines ~1636-1675.
- `unlockDownload()` at line 1641: currently only handles id="downloadBtn" (Mac DMG)
- `lockDownload()` at line 1659: currently only handles id="downloadBtn" (Mac DMG)
- id="downloadBtnWin" at line 836 points directly to /downloads/Interview Assistant.exe with no gating
</context>

<tasks>

<task type="auto">
  <name>Task 1: Gate Windows EXE button in paywall functions</name>
  <files>/Users/jeet/Downloads/offerletter-ai/interview.html</files>
  <action>
Edit interview.html to add downloadBtnWin handling inside both paywall functions.

In `unlockDownload()` (after line 1648, inside the function before the querySelectorAll block):
Add the following block after the downloadBtn block:
```
      var downloadBtnWin = document.getElementById('downloadBtnWin');
      if (downloadBtnWin) {
        downloadBtnWin.href = '/downloads/Interview Assistant.exe';
        downloadBtnWin.setAttribute('download', '');
        downloadBtnWin.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Windows App';
        downloadBtnWin.style.background = '';
      }
```
Also add a querySelectorAll block for the EXE filename (after the existing DMG querySelectorAll block):
```
      document.querySelectorAll('a[href*="Interview Assistant.exe"]').forEach(function(link) {
        link.href = '/downloads/Interview Assistant.exe';
        link.setAttribute('download', '');
        link.textContent = 'Download Interview Assistant.exe';
        link.style.background = '';
      });
```

In `lockDownload()` (after line 1665, inside the function before the querySelectorAll block):
Add the following block after the downloadBtn block:
```
      var downloadBtnWin = document.getElementById('downloadBtnWin');
      if (downloadBtnWin) {
        downloadBtnWin.href = 'https://buy.stripe.com/4gM3cx89ibeV2nw6NE1Jm00';
        downloadBtnWin.removeAttribute('download');
        downloadBtnWin.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Purchase — $19';
        downloadBtnWin.style.background = '#F97316';
      }
```
Also add a querySelectorAll block for the EXE filename (after the existing DMG querySelectorAll block in lockDownload):
```
      document.querySelectorAll('a[href*="Interview Assistant.exe"]').forEach(function(link) {
        link.href = 'https://buy.stripe.com/4gM3cx89ibeV2nw6NE1Jm00';
        link.removeAttribute('download');
        link.textContent = 'Purchase — $19 to unlock download';
        link.style.background = '#F97316';
      });
```

After editing, verify the fix by searching the file:
- `grep -n "downloadBtnWin" /Users/jeet/Downloads/offerletter-ai/interview.html` must show entries inside both unlockDownload and lockDownload function bodies
- `grep -n "Interview Assistant.exe" /Users/jeet/Downloads/offerletter-ai/interview.html` inside lockDownload must show the Stripe URL, not the direct download path
  </action>
  <verify>
grep -n "downloadBtnWin" /Users/jeet/Downloads/offerletter-ai/interview.html
grep -A2 "downloadBtnWin" /Users/jeet/Downloads/offerletter-ai/interview.html | grep "buy.stripe.com"
  </verify>
  <done>
- unlockDownload() sets downloadBtnWin.href to /downloads/Interview Assistant.exe
- lockDownload() sets downloadBtnWin.href to https://buy.stripe.com/4gM3cx89ibeV2nw6NE1Jm00
- Both querySelectorAll blocks cover the EXE filename
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy patched HTML and set Content-Disposition on S3 files</name>
  <files>S3: s3://offerletter.ai/interview.html, s3://offerletter.ai/downloads/Interview Assistant.dmg, s3://offerletter.ai/downloads/Interview Assistant.exe</files>
  <action>
Step 1 — Upload patched interview.html to S3:
```bash
aws s3 cp "/Users/jeet/Downloads/offerletter-ai/interview.html" \
  "s3://offerletter.ai/interview.html" \
  --content-type "text/html" \
  --cache-control "no-cache"
```

Step 2 — Re-upload both download files with Content-Disposition: attachment header.
Use `aws s3 cp` with `--metadata-directive REPLACE` to overwrite only headers while preserving the existing object data (this re-copies object in-place):
```bash
aws s3 cp \
  "s3://offerletter.ai/downloads/Interview Assistant.dmg" \
  "s3://offerletter.ai/downloads/Interview Assistant.dmg" \
  --metadata-directive REPLACE \
  --content-type "application/octet-stream" \
  --content-disposition "attachment; filename=\"Interview Assistant.dmg\""

aws s3 cp \
  "s3://offerletter.ai/downloads/Interview Assistant.exe" \
  "s3://offerletter.ai/downloads/Interview Assistant.exe" \
  --metadata-directive REPLACE \
  --content-type "application/octet-stream" \
  --content-disposition "attachment; filename=\"Interview Assistant.exe\""
```

Step 3 — Invalidate CloudFront to flush cached versions:
```bash
aws cloudfront create-invalidation \
  --distribution-id E319UG6B4QE97L \
  --paths "/interview.html" "/downloads/Interview%20Assistant.dmg" "/downloads/Interview%20Assistant.exe"
```

Step 4 — Verify headers after invalidation (wait ~30 seconds for CF to propagate):
```bash
curl -sI "https://offerletter.ai/downloads/Interview%20Assistant.exe" | grep -i "content-disposition"
curl -sI "https://offerletter.ai/downloads/Interview%20Assistant.dmg" | grep -i "content-disposition"
```
  </action>
  <verify>
curl -sI "https://offerletter.ai/downloads/Interview%20Assistant.exe" | grep -i "content-disposition"
curl -sI "https://offerletter.ai/downloads/Interview%20Assistant.dmg" | grep -i "content-disposition"
  </verify>
  <done>
- interview.html is live on S3 with the paywall fix
- Both download files return Content-Disposition: attachment header on direct curl
- CloudFront invalidation submitted for all 3 paths
  </done>
</task>

</tasks>

<verification>
After both tasks complete:
1. grep -n "downloadBtnWin" /Users/jeet/Downloads/offerletter-ai/interview.html — must show hits inside both lockDownload and unlockDownload
2. Confirm lockDownload block for downloadBtnWin points to buy.stripe.com (not the .exe path)
3. curl -sI on both S3 download URLs shows content-disposition: attachment
4. Load https://offerletter.ai/interview.html in browser — Windows button should show "Purchase — $19" (orange) before purchase, and unlock to "Download Windows App" after
</verification>

<success_criteria>
- Windows EXE download button is locked to Stripe purchase link by default
- After purchase verification (localStorage or session_id), both Mac and Windows buttons unlock
- Direct S3/CloudFront URL access to either file triggers a browser download (not inline display)
- No free EXE download path exists without a valid purchase
</success_criteria>

<output>
After completion, create `.planning/quick/224-fix-paywall-bypass-windows-exe-download-/224-SUMMARY.md`
</output>
