---
phase: quick-220
plan: 01
subsystem: interview-assistant
tags: [windows, pyinstaller, github-actions, s3, offerletter]
key-files:
  created:
    - /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py
    - /Users/jeet/Downloads/interview-assistant/InterviewAssistant_Windows.spec
    - /Users/jeet/doordash-p2p/.github/workflows/build-interview-assistant-windows.yml
  modified:
    - /Users/jeet/Downloads/offerletter-ai/interview.html
decisions:
  - "Used ctypes.windll.user32.SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE=0x11) for screen hiding (replaces AppKit/NSApp)"
  - "Audio priority: VB-Audio CABLE Output -> WASAPI Stereo Mix -> default mic (replaces BlackHole)"
  - "Global hotkey changed from Cmd+Shift+H to Ctrl+Shift+H"
  - "PyInstaller one-file EXE (no BUNDLE, no COLLECT, no argv_emulation)"
  - "Updated method-tabs grid from repeat(3) to repeat(4) columns for Windows tab"
metrics:
  completed: "2026-03-23"
  tasks: 3
  files: 4
---

# Quick-220: Windows Interview Assistant

One-liner: Windows port of the Mac Interview Assistant app — ctypes screen hiding, VB-Audio loopback, Ctrl+Shift+H hotkey, PyInstaller one-file EXE, GitHub Actions CI/CD to S3, and Windows download tab in interview.html.

## Tasks Completed

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Windows Python source + PyInstaller spec | Done | (local files in Downloads/) |
| 2 | GitHub Actions workflow: windows-latest build + S3 upload | Done | b005d319 |
| 3 | Windows tab in interview.html + S3 deploy + CloudFront invalidation | Done | (interview.html deployed) |

## What Was Built

### Task 1 — Windows Python source (`interview_assistant_windows.py`)
Complete 715-line standalone Windows port. Key changes from Mac original:
- `hide_from_screen_capture(hwnd)` — uses `ctypes.windll.user32.SetWindowDisplayAffinity(hwnd, 0x11)` (WDA_EXCLUDEFROMCAPTURE). Accepts `hwnd` argument obtained from `self.root.winfo_id()` after window renders.
- `find_windows_loopback_device()` — searches for VB-Audio CABLE Output first, then WASAPI Stereo Mix, then any loopback device by name. Returns `(device_idx, name)`.
- `find_best_input_device()` — calls `find_windows_loopback_device()` then falls back to default mic.
- `_start_global_hotkey()` — Ctrl+Shift+H via `pynput_keyboard.Key.ctrl` + `.Key.shift` + `KeyCode.from_char('h')`.
- `_toggle_visibility()` — re-hide call passes `self.root.winfo_id()` as hwnd.
- Bottom bar: "Ctrl+Shift+H hide/show  •  Alt+F4 quit  •  drag to move".
- Entry point: references `find_windows_loopback_device()` and VB-Audio setup URL.
- Zero Mac-only imports (AppKit, Foundation, objc, NSApp, pynput._util.darwin all absent).

### Task 1 — Windows PyInstaller spec (`InterviewAssistant_Windows.spec`)
One-file EXE spec:
- `Analysis(['interview_assistant_windows.py'])`
- `hiddenimports` includes `pynput._util.win32` (not darwin)
- `EXE` receives `a.binaries` and `a.datas` directly (one-file mode)
- No `COLLECT` block, no `BUNDLE` block
- `argv_emulation=False`, `onefile=True`

### Task 2 — GitHub Actions workflow (`build-interview-assistant-windows.yml`)
- Trigger: push to `interview-assistant/**` on main, plus `workflow_dispatch`
- Runner: `windows-latest`
- Steps: checkout → Python 3.11 → pip install → PyInstaller build → PowerShell EXE size check → `aws s3 cp` to `s3://offerletter.ai/downloads/Interview Assistant.exe` → CloudFront invalidation `E319UG6B4QE97L` → upload-artifact (30d retention)
- Uses `shell: bash` for AWS CLI commands to avoid PowerShell escaping issues with spaces

### Task 3 — interview.html Windows tab
- CSS: `method-tabs` grid updated from `repeat(3,1fr)` to `repeat(4,1fr)`
- Tab button: Windows logo SVG (4 squares), `switchMethod(this,'windows')`
- Panel `id="windows"`: download card linking to `/downloads/Interview Assistant.exe` (`id="downloadBtnWin"`), 4 setup steps (SmartScreen warning, microphone permission, Ctrl+Shift+H hotkey, optional VB-Audio 5-step instructions)
- `switchMethod` JS already uses generic `querySelectorAll` — no modifications needed
- Deployed to `s3://offerletter.ai/interview.html` and CloudFront invalidation `IDMIDKEQ5JRA89G433BKHYUIHU` created

## Verification Results

| Check | Expected | Actual |
|-------|----------|--------|
| Mac imports in windows source | 0 | 0 |
| Windows-specific code hits | 3+ | 6 |
| BUNDLE in spec | 0 | 0 |
| argv_emulation=True in spec | 0 | 0 |
| win32 in spec | 1 | 1 |
| S3 path in workflow | present | present |
| interview.html Windows tab | present | present |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `/Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py` — exists, 715 lines
- `/Users/jeet/Downloads/interview-assistant/InterviewAssistant_Windows.spec` — exists
- `/Users/jeet/doordash-p2p/.github/workflows/build-interview-assistant-windows.yml` — exists, commit b005d319
- `/Users/jeet/Downloads/offerletter-ai/interview.html` — updated, deployed to S3, CloudFront invalidated
