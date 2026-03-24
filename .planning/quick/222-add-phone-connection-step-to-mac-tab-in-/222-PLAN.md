---
id: 222
title: Add phone connection + earbuds to Mac tab in interview.html
date: 2026-03-24
status: in_progress
---

# Q-222: Mac Tab — Phone Connection + Earbuds

## Problem
Mac tab in interview.html is missing:
- Phone connection section (Step 5) — no `cd ~/Downloads/interview-assistant` + `python3 interview_server.py` commands, no URL display
- Earbuds/TTS section (Step 6)
- Pre-flight checklist
- Step 4 (BlackHole) still uses old plain `<strong>1.</strong>` style — needs blue numbered circles

Windows tab (Q-221) already has all of these. Mac tab must match.

## Tasks

### Task 1: Rewrite Mac tab setup-steps block (lines 576–598)
Replace Step 4 (BlackHole plain text) + closing tag with:
- Step 4: BlackHole — restyled with blue numbered circles + gk-guide "hear audio" tip (matching Windows VB-Audio style)
- Step 5 (NEW): Connect your phone — cd ~/Downloads/interview-assistant cmd-box, python3 interview_server.py cmd-box, URL display, same WiFi note, Safari/Chrome browser step
- Step 6 (NEW): Earbuds/TTS — System Settings → Bluetooth, System Settings → Sound → Output, Enable Earbuds toggle
- Pre-flight checklist (4 items)
- Keep existing `launchMac` Start Session button

### Task 2: Deploy to S3 + invalidate CloudFront
```bash
aws s3 cp /Users/jeet/Downloads/offerletter-ai/interview.html s3://offerletter.ai/interview.html --content-type "text/html" --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id E319UG6B4QE97L --paths "/interview.html"
```

## Mac-specific details
- Terminal command 1: `cd ~/Downloads/interview-assistant`
- Terminal command 2: `python3 interview_server.py` (python3, not python)
- URL display: "You'll see something like: http://192.168.1.21:5050"
- Bluetooth: System Settings → Bluetooth (not Windows Settings)
- Audio output: System Settings → Sound → Output (not Windows Sound settings)
- Earbuds: AirPods, Beats, or any Bluetooth earbuds
- Step 3 body text: update "Step 4 below" → "Step 5 below" for phone reference
