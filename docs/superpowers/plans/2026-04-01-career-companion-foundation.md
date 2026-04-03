# Career Companion — Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename "Interview Assistant" → "Career Companion", fix the two critical bugs (phone server not bundled, EXE filename mismatch), apply all technical SEO fixes, and ship the new homepage messaging — laying the foundation for all subsequent plans.

**Architecture:** Static S3 website (bucket: `offerletter.ai`, CloudFront: `E319UG6B4QE97L`). Mac app built locally via PyInstaller + Apple notarization. Windows app built via GitHub Actions. Both apps are Python/tkinter bundles. HTML pages live directly on S3 (not in git repo — use the snapshot in `.planning/quick/225...` as the working copy).

**Tech Stack:** Python 3.11, tkinter, PyInstaller, AWS S3/CloudFront, HTML/CSS/JS (vanilla), Apple notarization (Zietra Technologies inc, Team ID: PRKZ4UVCD7)

**Critical constraints:**
- Mac build is LOCAL only (no CI/CD workflow exists for Mac)
- The interview.html source of truth is the live S3 file — use snapshot at `.planning/quick/225-implement-server-side-download-protectio/html-snapshot/interview.html` as base
- Mac app source lives OUTSIDE the git repo at `/Users/jeet/Downloads/interview-assistant/`
- Windows app source lives IN the git repo at `apps/interview-assistant/`

---

## Chunk 1: Windows App Rename + Bug Fixes

### Task 1: Rename Windows app title in Python source

**Files:**
- Modify: `apps/interview-assistant/interview_assistant_windows.py`

- [ ] **Step 1: Verify current title string**

```bash
grep -n "Interview Assistant" apps/interview-assistant/interview_assistant_windows.py
```

Expected: one line with `self.root.title("🎯 Interview Assistant")`

- [ ] **Step 2: Update the title**

Find line with `self.root.title("🎯 Interview Assistant")` and change to:

```python
self.root.title("🎯 Career Companion")
```

- [ ] **Step 3: Update all other user-visible strings in Windows source**

Also find and update these additional user-facing strings:

```bash
grep -n "Interview Assistant" apps/interview-assistant/interview_assistant_windows.py
```

Update every user-visible occurrence:
- Welcome dialog title: `"Welcome to Interview Assistant"` → `"Welcome to Career Companion"`
- Purchase message: `"Thanks for purchasing Interview Assistant!\n\n"` → `"Thanks for purchasing Career Companion!\n\n"`
- Any inner `tk.Label` text referencing "Interview Assistant" → "Career Companion"

- [ ] **Step 3b: Verify all user-visible strings updated**

```bash
grep -n "Interview Assistant" apps/interview-assistant/interview_assistant_windows.py
```

Expected: zero matches

- [ ] **Step 4: Commit**

```bash
git add apps/interview-assistant/interview_assistant_windows.py
git commit -m "feat(career-companion): rename Windows app title to Career Companion"
```

---

### Task 2: Update Windows PyInstaller spec (rename EXE)

**Files:**
- Modify: `apps/interview-assistant/InterviewAssistant_Windows.spec`

- [ ] **Step 1: Verify current EXE name**

```bash
grep -n "name=" apps/interview-assistant/InterviewAssistant_Windows.spec
```

Expected: `name='InterviewAssistant'` at the EXE block

- [ ] **Step 2: Update EXE name**

Change `name='InterviewAssistant'` → `name='CareerCompanion'` in the EXE block.

Full updated EXE block:
```python
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='CareerCompanion',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    onefile=True,
    icon=None,
)
```

- [ ] **Step 3: Verify**

```bash
grep -n "name=" apps/interview-assistant/InterviewAssistant_Windows.spec
```

Expected: `name='CareerCompanion'`

- [ ] **Step 4: Commit**

```bash
git add apps/interview-assistant/InterviewAssistant_Windows.spec
git commit -m "feat(career-companion): rename Windows EXE to CareerCompanion"
```

---

### Task 3: Update GitHub Actions workflow for Windows build

**Files:**
- Modify: `.github/workflows/build-interview-assistant-windows.yml`

- [ ] **Step 1: Audit all references to old names**

```bash
grep -n "InterviewAssistant\|Interview Assistant\|interview-assistant" .github/workflows/build-interview-assistant-windows.yml
```

Expected: references to `InterviewAssistant.exe`, S3 path `/downloads/InterviewAssistant.exe`, artifact name `interview-assistant-windows`

- [ ] **Step 2: Update all references**

Make the following changes:
1. Verify EXE step: `dist\InterviewAssistant.exe` → `dist\CareerCompanion.exe`
2. S3 upload source: `dist/InterviewAssistant.exe` → `dist/CareerCompanion.exe`
3. S3 upload destination: `s3://offerletter.ai/downloads/InterviewAssistant.exe` → `s3://offerletter.ai/downloads/CareerCompanion.exe`
4. S3 content-disposition: `filename=\"InterviewAssistant.exe\"` → `filename=\"CareerCompanion.exe\"`
5. CloudFront invalidation path: `/downloads/InterviewAssistant.exe` → `/downloads/CareerCompanion.exe`
6. Artifact upload path: `apps/interview-assistant/dist/InterviewAssistant.exe` → `apps/interview-assistant/dist/CareerCompanion.exe`
7. Artifact name: `interview-assistant-windows` → `career-companion-windows`

Full updated workflow step sections:

```yaml
      - name: Verify EXE was created
        run: |
          if (!(Test-Path "dist\CareerCompanion.exe")) {
            Write-Error "EXE not found at dist\CareerCompanion.exe"
            exit 1
          }
          Write-Output "EXE size: $((Get-Item 'dist\CareerCompanion.exe').Length / 1MB) MB"
        shell: pwsh

      - name: Upload EXE to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: us-east-1
        run: |
          aws s3 cp "dist/CareerCompanion.exe" "s3://offerletter.ai/downloads/CareerCompanion.exe" --content-type "application/octet-stream" --content-disposition "attachment; filename=\"CareerCompanion.exe\"" --cache-control "no-cache"
        shell: bash

      - name: Invalidate CloudFront cache
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: us-east-1
        run: |
          export MSYS_NO_PATHCONV=1
          aws cloudfront create-invalidation --distribution-id E319UG6B4QE97L --paths "/downloads/CareerCompanion.exe"
        shell: bash

      - name: Upload EXE as workflow artifact (backup)
        uses: actions/upload-artifact@v4
        with:
          name: career-companion-windows
          path: apps/interview-assistant/dist/CareerCompanion.exe
          retention-days: 30
```

- [ ] **Step 3: Verify all old names are gone**

```bash
grep -n "InterviewAssistant\|Interview Assistant" .github/workflows/build-interview-assistant-windows.yml
```

Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/build-interview-assistant-windows.yml
git commit -m "feat(career-companion): update Windows CI/CD for CareerCompanion.exe rename"
```

---

### Task 4: Rename Mac app source title

**Files:**
- Modify: `/Users/jeet/Downloads/interview-assistant/interview_assistant.py`

> Note: This file is OUTSIDE the git repo. Changes here are local-only until the Mac DMG is rebuilt and uploaded (Task 9).

- [ ] **Step 1: Verify current title**

```bash
grep -n 'root.title' /Users/jeet/Downloads/interview-assistant/interview_assistant.py
```

Expected: `self.root.title("🎯 Interview Assistant")` near line 543

- [ ] **Step 2: Update title and all user-visible strings**

Change:
```python
self.root.title("🎯 Interview Assistant")
```
To:
```python
self.root.title("🎯 Career Companion")
```

Also update these additional user-facing strings:
- Welcome dialog title: `"Welcome to Interview Assistant"` → `"Welcome to Career Companion"`
- Purchase message: `"Thanks for purchasing Interview Assistant!\n\n"` → `"Thanks for purchasing Career Companion!\n\n"`
- Any inner `tk.Label` text referencing "Interview Assistant" → "Career Companion"
- Microphone privacy message in any dialogs: "Interview Assistant needs microphone" → "Career Companion needs microphone"

- [ ] **Step 3: Verify all user-visible strings updated**

```bash
grep -n "Interview Assistant" /Users/jeet/Downloads/interview-assistant/interview_assistant.py
```

Expected: zero matches

---

### Task 5: Update Mac PyInstaller spec

**Files:**
- Modify: `/Users/jeet/Downloads/interview-assistant/InterviewAssistant.spec`

> Note: Also outside the git repo. Part of the local Mac build.

- [ ] **Step 1: Make all name changes**

Update the spec with these changes:

```python
# NOTE: Mac uses COLLECT/BUNDLE multi-file pattern — NOT onefile.
# Keep exclude_binaries=True. Do NOT add onefile=True.
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,             # keep — required for COLLECT pattern
    name='Career Companion',          # was: 'Interview Assistant'
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=True,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='Career Companion',           # was: 'Interview Assistant'
)

app = BUNDLE(
    coll,
    name='Career Companion.app',       # was: 'Interview Assistant.app'
    icon=None,
    bundle_identifier='ai.offerletter.career-companion',  # was: ai.offerletter.interview-assistant
    info_plist={
        'NSMicrophoneUsageDescription': 'Career Companion needs microphone access to capture audio.',
        'NSPrincipalClass': 'NSApplication',
        'NSAppleScriptEnabled': False,
        'CFBundleDisplayName': 'Career Companion',        # was: 'Interview Assistant'
        'CFBundleShortVersionString': '2.0.0',            # bump version for rename
        'CFBundleVersion': '2',
        'LSMinimumSystemVersion': '12.0',
        'NSHighResolutionCapable': True,
    },
)
```

- [ ] **Step 2: Verify**

```bash
grep -n "Interview Assistant\|Career Companion\|bundle_identifier" /Users/jeet/Downloads/interview-assistant/InterviewAssistant.spec
```

Expected: only "Career Companion" and `ai.offerletter.career-companion` — no "Interview Assistant"

---

## Chunk 2: Website HTML — SEO + Messaging Overhaul

### Task 6: Download live interview.html from S3

> The snapshot at `.planning/quick/225.../interview.html` may be slightly out of date. Always work from the live S3 file.

- [ ] **Step 1: Download live file**

```bash
aws s3 cp s3://offerletter.ai/interview.html /tmp/companion_work.html
```

- [ ] **Step 2: Verify download**

```bash
wc -c /tmp/companion_work.html
# Should be similar to the snapshot (several KB)
```

- [ ] **Step 3: Copy to working location in repo**

```bash
cp /tmp/companion_work.html apps/interview-assistant/companion.html
```

This gives us a git-tracked working copy. All edits happen here, then upload to S3.

- [ ] **Step 4: Commit base file**

```bash
git add apps/interview-assistant/companion.html
git commit -m "feat(career-companion): add companion.html as working copy for SEO+messaging overhaul"
```

---

### Task 7: Apply SEO meta tags to companion.html

**Files:**
- Modify: `apps/interview-assistant/companion.html`

- [ ] **Step 1: Verify current head section**

```bash
grep -n "meta\|title\|og:\|canonical" apps/interview-assistant/companion.html | head -30
```

Expected: title tag present but no meta description, no OG tags, no canonical

- [ ] **Step 2: Replace title tag and add SEO meta block**

Find the existing `<title>` tag:
```html
<title>Interview Coach — OfferLetter.ai</title>
```

Replace with:
```html
<title>Career Companion — AI Interview Coaching, Research & Onboarding | OfferLetter.ai</title>
<meta name="description" content="Your AI career companion — research companies, ace interviews, negotiate offers, and succeed at your new job. Free tools + $19 desktop app for Mac and Windows." />
<link rel="canonical" href="https://offerletter.ai/companion.html" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://offerletter.ai/companion.html" />
<meta property="og:title" content="Career Companion — AI Interview Coaching, Research & Onboarding | OfferLetter.ai" />
<meta property="og:description" content="Your AI career companion — research companies, ace interviews, negotiate offers, and succeed at your new job. Free tools + $19 desktop app." />
<meta property="og:image" content="https://offerletter.ai/og-image.png" />
<meta property="og:site_name" content="OfferLetter.ai" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Career Companion — AI Interview Coaching, Research & Onboarding | OfferLetter.ai" />
<meta name="twitter:description" content="Your AI career companion — research companies, ace interviews, negotiate offers, and succeed at your new job." />
<meta name="twitter:image" content="https://offerletter.ai/og-image.png" />
```

- [ ] **Step 3: Add JSON-LD SoftwareApplication schema**

Add before `</head>`:
```html
<!-- JSON-LD: SoftwareApplication Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Career Companion",
  "operatingSystem": "macOS, Windows",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "19",
    "priceCurrency": "USD"
  },
  "description": "AI career companion for interview preparation, real-time coaching, salary negotiation, and new job success.",
  "url": "https://offerletter.ai/companion.html",
  "publisher": {
    "@type": "Organization",
    "name": "OfferLetter.ai"
  }
}
</script>
```

- [ ] **Step 4: Verify tags are present**

```bash
grep -n "meta name=\"description\"\|og:title\|canonical\|application/ld+json" apps/interview-assistant/companion.html
```

Expected: all 4 grep terms match

---

### Task 8: Update hero messaging in companion.html

**Files:**
- Modify: `apps/interview-assistant/companion.html`

- [ ] **Step 1: Find current H1 text**

```bash
grep -n "launch-hero-top h1\|Interview Coach\|Ace Every Interview" apps/interview-assistant/companion.html | head -10
```

- [ ] **Step 2: Update hero H1 and tagline**

Find (inside `.launch-hero-top`):
```html
<h1>...</h1>
<p>AI listens in real-time and whispers answers into your earbuds. Invisible to Zoom screen share. Works on Mac and mobile.</p>
```

Replace H1 and paragraph with:
```html
<h1>From First Interview to First Promotion.</h1>
<p>Your AI career companion — research companies, ace interviews, negotiate offers, and shine at your new job. Works on Mac, Windows, and mobile.</p>
```

- [ ] **Step 3: Update navigation label**

Find nav link for the interview/companion page (current text: "Interview Coach"):
```bash
grep -n "Interview Coach\|nav-pill" apps/interview-assistant/companion.html | head -10
```

Change "Interview Coach" nav label to "Career Companion".

- [ ] **Step 4: Update the feature blocks section**

Find the 6-feature grid (current: 6 interview-only features). Replace with 4 journey stage blocks:

```html
<!-- 4 Journey Stage Feature Blocks -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0;">
  <div style="padding:18px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
    <div style="font-size:15px;font-weight:700;color:#1E40AF;margin-bottom:6px;">🔍 Research Any Company</div>
    <div style="font-size:13px;color:#64748B;line-height:1.6;">Enter a company name — get a full briefing: culture signals, salary ranges, likely interview questions, and talking points matched to your resume.</div>
    <div style="margin-top:10px;font-size:12px;color:#2563EB;font-weight:600;">Walk in knowing more than the interviewer expects.</div>
  </div>
  <div style="padding:18px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;">
    <div style="font-size:15px;font-weight:700;color:#16A34A;margin-bottom:6px;">🎯 Real-Time Interview Coaching</div>
    <div style="font-size:13px;color:#64748B;line-height:1.6;">AI listens to your Zoom or Teams call and surfaces smart answers grounded in your experience. Floating overlay stays invisible to screen sharing.</div>
    <div style="margin-top:10px;font-size:12px;color:#16A34A;font-weight:600;">Your personal coach, whispering in your ear.</div>
  </div>
  <div style="padding:18px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;">
    <div style="font-size:15px;font-weight:700;color:#EA580C;margin-bottom:6px;">💰 Negotiate with Confidence</div>
    <div style="font-size:13px;color:#64748B;line-height:1.6;">Paste your offer letter — instant analysis of salary, equity, and hidden clauses. Get word-for-word negotiation scripts to maximize your package.</div>
    <div style="margin-top:10px;font-size:12px;color:#EA580C;font-weight:600;">Free to try. Average users negotiate $18K more.</div>
  </div>
  <div style="padding:18px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px;">
    <div style="font-size:15px;font-weight:700;color:#7C3AED;margin-bottom:6px;">⭐ Shine from Day One</div>
    <div style="font-size:13px;color:#64748B;line-height:1.6;">AI-generated 90-day plan, meeting prep coaching, business fluency explainer, and communication templates to make an impact fast.</div>
    <div style="margin-top:10px;font-size:12px;color:#7C3AED;font-weight:600;">From new hire to standout performer.</div>
  </div>
</div>
```

- [ ] **Step 5: Update CTA buttons**

Find primary CTA button (current: `Get Started — $19`):
```bash
grep -n "Get Started\|downloadBtn\|CTA\|btn.*primary" apps/interview-assistant/companion.html | head -10
```

Change:
- Primary CTA: `Get Started — $19` → `Analyze an Offer — Free` (links to offer analyzer page)
- Add secondary CTA: `Get the App — $19` (links to download)

- [ ] **Step 6: Fix Windows EXE filename in instructions**

Find Windows step where it says "double-click Interview Assistant.exe":
```bash
grep -n "Interview Assistant\.exe\|InterviewAssistant\.exe" apps/interview-assistant/companion.html
```

Change any reference to "Interview Assistant.exe" (with space) → "CareerCompanion.exe"

- [ ] **Step 7: Verify no hardcoded download URLs in HTML**

The download button URLs (`downloadBtn`, `downloadBtnWin`) are set dynamically from the Lambda response (`data.mac_url`, `data.win_url`) — NOT hardcoded in the HTML. The Lambda (`verify_payment.py`) is the source of truth for S3 paths. Task 16 below handles the Lambda update. No HTML JS changes needed here.

```bash
# Confirm no hardcoded S3 download paths in HTML
grep -n "downloads/Interview\|downloads/Career" apps/interview-assistant/companion.html
```

Expected: no matches (or only in instructional text, not JS)

- [ ] **Step 8: Fix phone server instructions for Mac**

Find Step 5 phone server instructions. Update the folder path:

Change:
```
cd ~/Downloads/interview-assistant
```
To:
```
cd ~/Downloads/Career\ Companion
```

And update the `python3 interview_server.py` note to clarify the file is included alongside the app in the DMG:
```
The interview_server.py file is included in the Career Companion DMG — copy the entire folder to ~/Downloads before running this command.
```

- [ ] **Step 9: Verify all "Interview Assistant" references replaced**

```bash
grep -in "interview assistant\|interview coach" apps/interview-assistant/companion.html | grep -v "og:image\|schema\|alt=\|aria"
```

Expected: zero matches (or only legitimate legacy text references)

- [ ] **Step 10: Commit changes**

```bash
git add apps/interview-assistant/companion.html
git commit -m "feat(career-companion): apply SEO meta tags + messaging overhaul to companion.html"
```

---

### Task 9: Create interview.html redirect page

> Keep the old URL working so existing links don't break.

**Files:**
- Create: `apps/interview-assistant/interview_redirect.html` (will be uploaded as `interview.html` to S3)

- [ ] **Step 1: Create redirect HTML**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Redirecting to Career Companion — OfferLetter.ai</title>
  <meta http-equiv="refresh" content="0;url=/companion.html" />
  <link rel="canonical" href="https://offerletter.ai/companion.html" />
  <script>window.location.replace('/companion.html');</script>
</head>
<body>
  <p>Redirecting to <a href="/companion.html">Career Companion</a>...</p>
</body>
</html>
```

Save as `apps/interview-assistant/interview_redirect.html`.

- [ ] **Step 2: Commit**

```bash
git add apps/interview-assistant/interview_redirect.html
git commit -m "feat(career-companion): add redirect from interview.html to companion.html"
```

---

### Task 10: Deploy companion.html + redirect to S3

- [ ] **Step 1: Upload companion.html**

```bash
aws s3 cp apps/interview-assistant/companion.html s3://offerletter.ai/companion.html \
  --content-type "text/html" \
  --cache-control "max-age=300"
```

- [ ] **Step 2: Backup live interview.html before overwriting**

```bash
aws s3 cp s3://offerletter.ai/interview.html s3://offerletter.ai/interview.html.bak
echo "Backup created at s3://offerletter.ai/interview.html.bak"
```

- [ ] **Step 3: Upload interview.html redirect (overwrites old page)**

```bash
aws s3 cp apps/interview-assistant/interview_redirect.html s3://offerletter.ai/interview.html \
  --content-type "text/html" \
  --cache-control "max-age=60"
```

> Rollback: `aws s3 cp s3://offerletter.ai/interview.html.bak s3://offerletter.ai/interview.html`

- [ ] **Step 4: Invalidate CloudFront**

```bash
export MSYS_NO_PATHCONV=1
aws cloudfront create-invalidation \
  --distribution-id E319UG6B4QE97L \
  --paths "/companion.html" "/interview.html"
```

- [ ] **Step 5: Verify live companion.html has SEO tags**

```bash
# Wait ~60 seconds for invalidation to propagate
curl -s -A "Mozilla/5.0" https://offerletter.ai/companion.html | grep -i "description\|og:title\|Career Companion\|application/ld+json" | head -10
```

Expected: meta description, og:title, "Career Companion" in H1, JSON-LD present

- [ ] **Step 6: Verify interview.html redirects**

```bash
curl -sI https://offerletter.ai/interview.html | head -10
# OR open in browser and confirm redirect to /companion.html
```

---

## Chunk 3: Mac DMG Build with Phone Server Bundled

> This chunk is LOCAL only — no CI/CD. Must be run on the Mac with Apple developer certs installed.

### Task 11: Bundle interview_server.py into Mac DMG

**The fix:** The DMG must contain a folder with BOTH `Career Companion.app` AND `interview_server.py`, so customers have the server script available after downloading.

**Files:**
- Create: `/Users/jeet/Downloads/interview-assistant/build_dmg.sh`

- [ ] **Step 1: Create DMG build script**

```bash
cat > /Users/jeet/Downloads/interview-assistant/build_dmg.sh << 'EOF'
#!/bin/bash
set -e

APP_NAME="Career Companion"
FOLDER_NAME="Career Companion"
DMG_NAME="Career Companion.dmg"
VOLUME_NAME="Career Companion"

echo "→ Building Career Companion.app with PyInstaller..."
cd /Users/jeet/Downloads/interview-assistant
pyinstaller InterviewAssistant.spec --clean

APP_BUNDLE="dist/Career Companion.app"
if [ ! -d "$APP_BUNDLE" ]; then
  echo "ERROR: $APP_BUNDLE not found after PyInstaller build"
  exit 1
fi
echo "✓ App bundle created: $APP_BUNDLE"

echo "→ Creating DMG staging folder..."
STAGING="/tmp/cc_dmg_staging"
rm -rf "$STAGING"
mkdir -p "$STAGING/$FOLDER_NAME"

# Copy app bundle into staging folder
cp -R "$APP_BUNDLE" "$STAGING/$FOLDER_NAME/"

# Copy phone server script alongside the app
cp interview_server.py "$STAGING/$FOLDER_NAME/interview_server.py"
echo "✓ interview_server.py included in DMG folder"

echo "→ Creating DMG..."
hdiutil create \
  -volname "$VOLUME_NAME" \
  -srcfolder "$STAGING/$FOLDER_NAME" \
  -ov \
  -format UDRW \
  "/tmp/cc_temp.dmg"

# Convert to read-only compressed DMG
hdiutil convert "/tmp/cc_temp.dmg" -format UDZO -o "dist/$DMG_NAME"
rm -f "/tmp/cc_temp.dmg"
rm -rf "$STAGING"

echo "✓ DMG created: dist/$DMG_NAME"
ls -lh "dist/$DMG_NAME"
EOF
chmod +x /Users/jeet/Downloads/interview-assistant/build_dmg.sh
```

- [ ] **Step 2: Run the build script**

```bash
cd /Users/jeet/Downloads/interview-assistant
./build_dmg.sh
```

Expected: `dist/Career Companion.dmg` created (size ~55-65 MB)

- [ ] **Step 3: Verify DMG contents**

```bash
hdiutil attach "dist/Career Companion.dmg"
ls -la "/Volumes/Career Companion/"
```

Expected:
```
Career Companion.app
interview_server.py
```

```bash
hdiutil detach "/Volumes/Career Companion"
```

---

### Task 12: Notarize and staple the Mac DMG

> Requires: Apple Developer ID cert installed, `xcrun notarytool` available, App Store Connect API key at `~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8`

- [ ] **Step 1: Submit DMG for notarization**

```bash
xcrun notarytool submit \
  "/Users/jeet/Downloads/interview-assistant/dist/Career Companion.dmg" \
  --key ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  --key-id 9K626GB728 \
  --issuer 80d10e49-f379-462f-9668-5ea53016812e \
  --wait
```

Expected output: `status: Accepted` (takes 1-5 min)

- [ ] **Step 2: Staple the notarization ticket**

```bash
xcrun stapler staple "/Users/jeet/Downloads/interview-assistant/dist/Career Companion.dmg"
```

Expected: `The staple and validate action worked!`

- [ ] **Step 3: Verify notarization**

```bash
spctl --assess --type open --context context:primary-signature \
  "/Users/jeet/Downloads/interview-assistant/dist/Career Companion.dmg" \
  && echo "NOTARIZATION OK"
```

Expected: `NOTARIZATION OK`

---

### Task 13: Upload Mac DMG to S3

- [ ] **Step 1: Upload DMG**

```bash
aws s3 cp "/Users/jeet/Downloads/interview-assistant/dist/Career Companion.dmg" \
  "s3://offerletter.ai/downloads/Career Companion.dmg" \
  --content-type "application/x-apple-diskimage" \
  --content-disposition 'attachment; filename="Career Companion.dmg"' \
  --cache-control "no-cache"
```

- [ ] **Step 2: Invalidate CloudFront**

```bash
export MSYS_NO_PATHCONV=1
aws cloudfront create-invalidation \
  --distribution-id E319UG6B4QE97L \
  --paths "/downloads/Career%20Companion.dmg"
```

- [ ] **Step 3: Verify download works**

```bash
curl -sI "https://offerletter.ai/downloads/Career%20Companion.dmg" | grep -i "content-length\|content-type\|200\|302"
```

Expected: HTTP 200 or 302 with content-type `application/x-apple-diskimage`

- [ ] **Step 4: Download and verify DMG notarization**

```bash
# Download from S3 to verify it's the notarized version
curl -L -o /tmp/CC_from_s3.dmg "https://offerletter.ai/downloads/Career%20Companion.dmg"
spctl --assess --type open --context context:primary-signature /tmp/CC_from_s3.dmg && echo "LIVE DMG OK"
```

---

## Chunk 4: Lambda Update — Fix Download URLs

> **CRITICAL:** The `verify_payment` Lambda generates pre-signed S3 URLs for the download buttons. It has hardcoded S3 keys pointing to the old file paths. If not updated before the old files are removed, paying customers will receive 404 download links.

### Task 14: Update verify_payment Lambda with new S3 keys

**Files:**
- Modify: `.planning/quick/225-implement-server-side-download-protectio/verify_payment.py`

> Note: The deployed Lambda source. This file may or may not be the exact deployed version — verify by checking the Lambda console or running `aws lambda get-function --function-name verify-payment-offerletter`.

- [ ] **Step 1: Verify current hardcoded S3 keys**

```bash
grep -n "S3_KEY_MAC\|S3_KEY_WIN" .planning/quick/225-implement-server-side-download-protectio/verify_payment.py
```

Expected:
```
S3_KEY_MAC = "downloads/Interview Assistant.dmg"
S3_KEY_WIN = "downloads/InterviewAssistant.exe"
```

- [ ] **Step 2: Update S3 keys**

Change lines 16-17:
```python
S3_KEY_MAC = "downloads/Career Companion.dmg"
S3_KEY_WIN = "downloads/CareerCompanion.exe"
```

- [ ] **Step 3: Package and deploy Lambda**

```bash
cd .planning/quick/225-implement-server-side-download-protectio/

# Package Lambda (zip with dependencies)
zip -j verify_payment.zip verify_payment.py

# Deploy to AWS Lambda
aws lambda update-function-code \
  --function-name verify-payment-offerletter \
  --zip-file fileb://verify_payment.zip \
  --region us-east-1
```

Wait for deployment confirmation:
```bash
aws lambda wait function-updated \
  --function-name verify-payment-offerletter \
  --region us-east-1
echo "Lambda deployed"
```

- [ ] **Step 4: Verify Lambda returns correct pre-signed URL keys**

```bash
# Test Lambda response (use a real verified session ID or check the presign URL path)
aws lambda invoke \
  --function-name verify-payment-offerletter \
  --payload '{"body": "{\"session_id\": \"test_invalid\"}"}' \
  --region us-east-1 \
  /tmp/lambda_response.json

cat /tmp/lambda_response.json
```

> The Lambda will return an error for an invalid session_id, but the error message should confirm it's looking for the new S3 keys. For a real test, use a valid session_id from DynamoDB.

- [ ] **Step 5: Verify old S3 files still exist during transition**

```bash
# While transitioning, KEEP old files. Only remove after confirming new files are live and tested.
aws s3 ls s3://offerletter.ai/downloads/
```

Expected: both old (`Interview Assistant.dmg`, `InterviewAssistant.exe`) and new (`Career Companion.dmg`, `CareerCompanion.exe`) exist during transition period.

- [ ] **Step 6: Commit Lambda source update**

```bash
git add .planning/quick/225-implement-server-side-download-protectio/verify_payment.py
git commit -m "feat(career-companion): update Lambda S3 keys for renamed Mac/Windows downloads"
```

---

## Chunk 5: Trigger Windows Build + Full Verification

### Task 16: Push all Windows changes and verify CI build succeeds

- [ ] **Step 1: Push changes to main**

```bash
git push origin main
```

- [ ] **Step 2: Watch GitHub Actions workflow**

```bash
gh run list --workflow=build-interview-assistant-windows.yml --limit 3
# Get the run ID from the most recent run
gh run watch <run-id>
```

Expected: All steps green. Final step: `Upload EXE as workflow artifact (backup)` succeeds.

- [ ] **Step 3: Verify CareerCompanion.exe is live on S3**

```bash
aws s3 ls s3://offerletter.ai/downloads/ | grep Career
```

Expected:
```
... Career Companion.dmg
... CareerCompanion.exe
```

- [ ] **Step 4: Verify companion.html download buttons work**

Open `https://offerletter.ai/companion.html` in browser:
1. Click "Download for Mac" → should trigger download of `Career Companion.dmg`
2. Click "Download for Windows" → should trigger download of `CareerCompanion.exe`

Verify the Lambda `get-app-config` returns the updated download URLs:
```bash
curl -s "https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/get-app-config" | python3 -m json.tool | grep -i "download\|dmg\|exe"
```

> If `get-app-config` returns hardcoded S3 URLs, update the Lambda to return new paths. Check Lambda source code first.

---

### Task 17: Full end-to-end verification checklist

- [ ] **SEO verification**

```bash
# Meta description present
curl -s -A "Mozilla/5.0" https://offerletter.ai/companion.html | grep 'meta name="description"'

# OG tags present
curl -s -A "Mozilla/5.0" https://offerletter.ai/companion.html | grep 'og:title'

# JSON-LD present
curl -s -A "Mozilla/5.0" https://offerletter.ai/companion.html | grep 'application/ld+json'

# Title updated
curl -s -A "Mozilla/5.0" https://offerletter.ai/companion.html | grep '<title>'
```

Expected:
```
meta name="description" content="Your AI career companion..."
og:title content="Career Companion..."
application/ld+json
<title>Career Companion — AI Interview Coaching...
```

- [ ] **Redirect verification**

```bash
curl -sI https://offerletter.ai/interview.html | head -10
```

Expected: HTML with `<meta http-equiv="refresh"` or JS redirect to companion.html

- [ ] **Mac DMG verification**

```bash
# Download and mount
curl -L -o /tmp/test_cc.dmg "https://offerletter.ai/downloads/Career%20Companion.dmg"
hdiutil attach /tmp/test_cc.dmg
ls "/Volumes/Career Companion/"
# Must show: Career Companion.app AND interview_server.py
hdiutil detach "/Volumes/Career Companion"
```

- [ ] **Windows EXE verification**

```bash
curl -sI "https://offerletter.ai/downloads/CareerCompanion.exe" | grep "200\|content-length"
```

Expected: HTTP 200

- [ ] **Final commit: update docs**

```bash
git add docs/test-results/
# Create or update test results doc if needed
git commit -m "docs(career-companion): foundation plan complete — all tasks verified"
```

---

## Verification Checklist

```
## Foundation Plan Verification
- [ ] Windows app title shows "Career Companion" (not "Interview Assistant")
- [ ] Windows EXE built as CareerCompanion.exe (CI confirmed green)
- [ ] Mac app title shows "Career Companion"
- [ ] Mac DMG contains BOTH Career Companion.app AND interview_server.py
- [ ] Mac DMG notarized (spctl passes)
- [ ] companion.html live at https://offerletter.ai/companion.html
- [ ] companion.html has meta description
- [ ] companion.html has OG tags
- [ ] companion.html has JSON-LD SoftwareApplication schema
- [ ] companion.html title: "Career Companion — AI Interview Coaching..."
- [ ] companion.html H1: "From First Interview to First Promotion."
- [ ] companion.html shows 4 journey stage feature blocks
- [ ] companion.html CTA primary: "Analyze an Offer — Free"
- [ ] companion.html CTA secondary: "Get the App — $19"
- [ ] companion.html Windows instruction says "CareerCompanion.exe" (not "Interview Assistant.exe")
- [ ] interview.html redirects to companion.html
- [ ] Mac download link → Career Companion.dmg
- [ ] Windows download link → CareerCompanion.exe
```
