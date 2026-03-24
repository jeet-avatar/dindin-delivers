---
id: 222
status: complete
date: 2026-03-24
---

# Q-222 Summary: Mac Tab — Phone Connection + Earbuds

## What Was Done

### Task 1: interview.html Mac tab additions

- **Step 3 body**: Updated "Step 4 below" reference → "Step 5 below" for phone pointer
- **Step 4 (BlackHole)**: Restyled from plain `<strong>1.</strong>` text to blue numbered circles + blue gk-guide "hear audio via Multi-Output Device" callout — now matches Windows VB-Audio style
- **Step 5 (NEW — phone)**: Full 5-step phone connection section:
  - ⌘ Space → Terminal opener note
  - `cd ~/Downloads/interview-assistant` cmd-box with Copy button (`copyMacStep2`)
  - `python3 interview_server.py` cmd-box with Copy button (`copyMacStep3`)
  - Same WiFi requirement
  - Safari (iPhone) / Chrome (Android) browser step with `http://192.168.1.21:5050` example
  - step-success: "Terminal will print: Serving at http://192.168.x.x:5050 — that's your join link"
  - Blue info box: "This address IS the Interview Assistant itself"
- **Step 6 (NEW — earbuds)**: 4-step earbuds section with purple numbered circles:
  - System Settings → Bluetooth pairing
  - System Settings → Sound → Output (+ Control Center shortcut)
  - Enable Earbuds (TTS) toggle
  - Face-down phone tip
  - step-success with AirPods iCloud note
- **Pre-flight checklist**: 4 checkboxes matching Windows tab
- **`launchMac` button**: Unchanged and intact

### Task 2: Deployed
- S3 upload: `s3://offerletter.ai/interview.html` ✓
- CloudFront invalidation: `IDBAU7LLN7TWGNSY9J99W2GO2R` → InProgress ✓

## Verification
- `cd ~/Downloads/interview-assistant` cmd-box: line 640 ✓
- `python3 interview_server.py` cmd-box: line 652 ✓
- `Serving at http://192.168.1.21:5050` join link display: line 668 ✓
- Step 5 phone section: line 616 ✓
- Step 6 earbuds section: line 678 ✓
- Pre-flight checklist: line 714 ✓
- `launchMac` button: line 735 ✓
- Windows tab unchanged: `launchWin` at line 993 ✓
