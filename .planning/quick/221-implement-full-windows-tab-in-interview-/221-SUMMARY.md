---
id: 221
status: complete
date: 2026-03-23
---

# Q-221 Summary: Full Windows Tab — interview.html

## What Was Done

### Task 1: interview.html Windows tab rewrite
Replaced the sparse 4-step Windows tab with a complete 6-step setup experience matching Mac tab quality.

**Changes:**
- **Step 3** (was empty body): Added `step-success` callout with `Ctrl+Shift+H` hotkey, drag/move note, screen-share exclusion note, and manual vs audio mode explanation
- **Step 4** (VB-Audio): Replaced plain `<strong>1.</strong>` text with blue numbered circles, added "Still hear the interview" blue `gk-guide` callout explaining the "Listen to this device" Windows Sound Settings trick
- **Step 5** (NEW — phone): Full phone connection section — orange Python requirement warning, 5 numbered steps (Command Prompt → `cd %USERPROFILE%\Downloads\interview-assistant` cmd-box with copy → `python interview_server.py` cmd-box with copy → same WiFi note → open browser on phone), green info box explaining what the address is
- **Step 6** (NEW — earbuds): Purple-numbered 4-step earbuds setup: pair Bluetooth → set as default Windows audio output → Enable Earbuds (TTS) toggle → place phone face-down. Includes `step-success` callout
- **Pre-flight checklist**: 4 checkbox items (EXE running, mic allowed, audio capture working, hotkey tested)
- **Start Session button**: `id="launchWin"` with `onclick="startSession('launchWin')"` — matching Mac pattern exactly

**Mac tab**: Completely untouched. Verified `launchMac`, `⌘ + Shift + H`, and BlackHole all intact.

### Task 2: setup.html Step 2 banner update
Updated the "Mac only" orange info-banner to mention Windows users should use VB-Audio Virtual Cable, with links to vb-audio.com/Cable and the Interview page Windows tab.

### Task 3: Deployed to S3 + CloudFront
- `interview.html` → `s3://offerletter.ai/interview.html` ✓
- `setup.html` → `s3://offerletter.ai/setup.html` ✓
- CloudFront invalidation `I8LQLMDA7V86E89SG6J73OH01C` → InProgress ✓

## Verification

- `launchWin` button: line 858 ✓
- `Ctrl + Shift + H`: line 684 ✓
- `VB-Audio Virtual Cable`: lines 700, 708, 716, 720 ✓
- `python interview_server.py` cmd-box: line 780 ✓
- `Enable Earbuds`: line 822 ✓
- Pre-flight checklist: line 837 ✓
- Mac `launchMac` intact: line 600 ✓
- Mac `⌘ + Shift + H` intact: line 565 ✓
