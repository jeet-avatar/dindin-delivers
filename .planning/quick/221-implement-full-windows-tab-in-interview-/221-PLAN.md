---
id: 221
title: Implement full Windows tab in interview.html
date: 2026-03-23
status: in_progress
---

# Q-221: Full Windows Tab — interview.html

## Goal
Replace the incomplete Windows tab in `/Users/jeet/Downloads/offerletter-ai/interview.html` with a complete, Mac-quality setup experience. Add phone connection, earbuds/TTS, styled VB-Audio instructions, pre-flight checklist, and Start Session button.

## Current State
- Windows tab (lines 632–704) is missing:
  - Step 3 (hotkey) has no body
  - Step 4 (VB-Audio) is plain unformatted text
  - No phone connection section
  - No earbuds/TTS section
  - No pre-flight checklist
  - No "Start Session" button
- setup.html Step 2 says "Mac only — skip to Step 3" with no Windows path

## Tasks

### Task 1: Rewrite Windows tab in interview.html
**File:** `/Users/jeet/Downloads/offerletter-ai/interview.html`
**Lines:** 632–704 (the `<div class="setup-steps">` block + closing tag)

Replace the entire setup-steps block with:
- Step 1: Download & run (keep SmartScreen gk-guide, already good)
- Step 2: Microphone permission (keep existing)
- Step 3: App window + hotkey (add step-success body with Ctrl+Shift+H)
- Step 4: VB-Audio (restyle with numbered circles + gk-guide "hear audio" tip)
- Step 5 (NEW): Connect your phone (Command Prompt → python interview_server.py → same WiFi → phone browser)
- Step 6 (NEW): Earbuds/TTS (pair Bluetooth → set as default audio → Enable Earbuds toggle in app)
- Pre-flight checklist (4 items)
- Big "Start Session" button (id="launchWin", onclick="startSession('launchWin')")

### Task 2: Update setup.html Step 2
**File:** `/Users/jeet/Downloads/offerletter-ai/setup.html`
**Lines:** ~478–480 (the "Mac only" info-banner)

Update the orange banner to: "Mac only for BlackHole. Windows users: install VB-Audio Virtual Cable instead — see Step 2 on the Windows tab of the Interview page."
Add a Windows VB-Audio mini-card below the banner (collapsed/brief) pointing to vb-audio.com/Cable.

### Task 3: Deploy to S3 + invalidate CloudFront
```bash
aws s3 cp /Users/jeet/Downloads/offerletter-ai/interview.html s3://offerletter.ai/interview.html --content-type "text/html" --cache-control "no-cache"
aws s3 cp /Users/jeet/Downloads/offerletter-ai/setup.html s3://offerletter.ai/setup.html --content-type "text/html" --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id E319UG6B4QE97L --paths "/interview.html" "/setup.html"
```

## Must-Haves
- `id="launchWin"` button exists with `onclick="startSession('launchWin')"`
- Step 5 includes `python interview_server.py` cmd-box with copy button
- Step 6 earbuds section mentions Windows Sound Settings → set Bluetooth as default output
- VB-Audio section uses styled numbered circles (not bare `<strong>1.</strong>`)
- Mac tab unchanged — no regressions on Mac panel
- No JS changes — HTML only
