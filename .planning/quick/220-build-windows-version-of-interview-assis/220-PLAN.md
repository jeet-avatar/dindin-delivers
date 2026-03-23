---
phase: quick-220
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py
  - /Users/jeet/Downloads/interview-assistant/InterviewAssistant_Windows.spec
  - /Users/jeet/doordash-p2p/.github/workflows/build-interview-assistant-windows.yml
  - /Users/jeet/Downloads/offerletter-ai/interview.html
autonomous: true
requirements: [Q-220]

must_haves:
  truths:
    - "Windows Python source exists as a complete standalone file with no Mac-only imports"
    - "Audio capture finds VB-Audio CABLE Output first, falls back to WASAPI Stereo Mix, then default mic"
    - "Screen-share hiding uses SetWindowDisplayAffinity (WDA_EXCLUDEFROMCAPTURE) via ctypes, not AppKit"
    - "Global hotkey is Ctrl+Shift+H (not Cmd+Shift+H)"
    - "PyInstaller spec produces a one-file EXE with pynput._util.win32, no BUNDLE/COLLECT/argv_emulation"
    - "GitHub Actions workflow builds on windows-latest and uploads exe to S3"
    - "interview.html has a Windows tab alongside Mac Desktop with VB-Audio setup steps and .exe download button"
  artifacts:
    - path: "/Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py"
      provides: "Complete Windows Python source"
      contains: "SetWindowDisplayAffinity"
    - path: "/Users/jeet/Downloads/interview-assistant/InterviewAssistant_Windows.spec"
      provides: "Windows PyInstaller one-file EXE spec"
      contains: "Interview Assistant.exe"
    - path: "/Users/jeet/doordash-p2p/.github/workflows/build-interview-assistant-windows.yml"
      provides: "GitHub Actions workflow for windows-latest build + S3 upload"
      contains: "windows-latest"
    - path: "/Users/jeet/Downloads/offerletter-ai/interview.html"
      provides: "Updated download page with Windows tab"
      contains: "Interview Assistant.exe"
  key_links:
    - from: "InterviewAssistant_Windows.spec"
      to: "interview_assistant_windows.py"
      via: "Analysis(['interview_assistant_windows.py'])"
    - from: "build-interview-assistant-windows.yml"
      to: "s3://offerletter.ai/downloads/Interview Assistant.exe"
      via: "aws s3 cp"
    - from: "interview.html windows tab"
      to: "/downloads/Interview Assistant.exe"
      via: "download-btn href"
---

<objective>
Build the Windows version of Interview Assistant: complete Python source adapted from Mac original, PyInstaller one-file EXE spec, GitHub Actions workflow to auto-build and upload to S3, and a Windows tab in interview.html.

Purpose: Mac app is live — Windows users currently have no download option. This extends the product to Windows without any changes to the Mac source or workflow.
Output: 4 files — windows .py, windows .spec, GitHub Actions workflow, updated interview.html
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/Downloads/interview-assistant/interview_assistant.py
@/Users/jeet/Downloads/interview-assistant/InterviewAssistant.spec
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Windows Python source and PyInstaller spec</name>
  <files>
    /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py
    /Users/jeet/Downloads/interview-assistant/InterviewAssistant_Windows.spec
  </files>
  <action>
    Create `/Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py` as a COMPLETE standalone file (full 700+ lines — not a diff). Copy the entire Mac source verbatim, then apply these targeted changes:

    **1. Replace the hide_from_screen_capture() function (lines 17-27 of Mac source):**
    Remove the AppKit/NSApp implementation entirely. Replace with:
    ```python
    def hide_from_screen_capture(root_hwnd: int = 0):
        """Exclude window from screen capture on Windows 10 2004+ using WDA_EXCLUDEFROMCAPTURE."""
        try:
            import ctypes
            WDA_EXCLUDEFROMCAPTURE = 0x00000011
            hwnd = root_hwnd or 0
            if hwnd:
                ctypes.windll.user32.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
                print("Window hidden from screen capture")
        except Exception as e:
            print(f"Could not hide from screen capture: {e}")
    ```

    **2. Replace find_blackhole_device() with find_windows_loopback_device():**
    ```python
    def find_windows_loopback_device():
        """Find VB-Audio Virtual Cable or WASAPI Stereo Mix loopback device."""
        devices = sd.query_devices()
        # Priority 1: VB-Audio Virtual Cable output (the loopback capture side)
        for i, d in enumerate(devices):
            if 'cable output' in d['name'].lower() and d['max_input_channels'] > 0:
                return i, d['name']
        # Priority 2: WASAPI Stereo Mix
        for i, d in enumerate(devices):
            if 'stereo mix' in d['name'].lower() and d['max_input_channels'] > 0:
                return i, d['name']
        # Priority 3: Any loopback
        for i, d in enumerate(devices):
            name = d['name'].lower()
            if ('loopback' in name or 'virtual' in name) and d['max_input_channels'] > 0:
                return i, d['name']
        return None, None
    ```

    **3. Replace find_best_input_device() to call the new function:**
    ```python
    def find_best_input_device():
        """Find best available input: VB-Audio CABLE -> Stereo Mix -> default mic."""
        lb_idx, lb_name = find_windows_loopback_device()
        if lb_idx is not None:
            return lb_idx, lb_name, True
        default = sd.default.device[0]
        devices = sd.query_devices()
        return default, devices[default]['name'], False
    ```

    **4. In InterviewOverlay.__init__, change the screen capture call:**
    Replace:
    ```python
    self.root.after(500, hide_from_screen_capture)
    ```
    With:
    ```python
    def _hide_win():
        hwnd = self.root.winfo_id()
        hide_from_screen_capture(hwnd)
    self.root.after(500, _hide_win)
    ```
    Also in _toggle_visibility(), change `self.root.after(100, hide_from_screen_capture)` to:
    ```python
    self.root.after(100, lambda: hide_from_screen_capture(self.root.winfo_id()))
    ```

    **5. Replace _start_global_hotkey() to use Ctrl+Shift+H:**
    ```python
    def _start_global_hotkey(self):
        """Listen for Ctrl+Shift+H globally."""
        current_keys = set()

        def on_press(key):
            current_keys.add(key)
            ctrl  = pynput_keyboard.Key.ctrl
            shift = pynput_keyboard.Key.shift
            try:
                h = pynput_keyboard.KeyCode.from_char('h')
            except Exception:
                return
            if ctrl in current_keys and shift in current_keys and h in current_keys:
                self._toggle_visibility()

        def on_release(key):
            current_keys.discard(key)

        listener = pynput_keyboard.Listener(on_press=on_press, on_release=on_release)
        listener.daemon = True
        listener.start()
    ```

    **6. In _build_ui(), replace the bottom bar hotkey hint label:**
    Change `"⌘⇧H hide/show  •  ⌘Q quit  •  drag to move"` to `"Ctrl+Shift+H hide/show  •  Alt+F4 quit  •  drag to move"`

    **7. Remove Mac-only key binding:**
    Remove `self.root.bind("<Command-q>", lambda e: self._quit())` (Command key does not exist on Windows).

    **8. In `__main__` block, update the print statements:**
    Change `"   ⌘H = hide/show   |   ⌘Q = quit   |   drag title bar to move"` to
    `"   Ctrl+Shift+H = hide/show   |   Alt+F4 = quit   |   drag title bar to move"`

    And change the BlackHole detection block to reference VB-Audio:
    ```python
    lb_idx, lb_name = find_windows_loopback_device()
    if lb_idx is None:
        print("VB-Audio CABLE not found — running in MICROPHONE mode.")
        print("   To capture Zoom/Teams audio, install VB-Audio Virtual Cable (free):")
        print("   https://vb-audio.com/Cable/")
        print("   Then set Zoom audio output to 'CABLE Input (VB-Audio Virtual Cable)'")
        print()
    ```

    Do NOT import AppKit, Foundation, or objc anywhere in the Windows file.

    ---

    Create `/Users/jeet/Downloads/interview-assistant/InterviewAssistant_Windows.spec` as a one-file EXE (no BUNDLE, no COLLECT, no argv_emulation). Base it on the Mac spec but with these changes:

    ```python
    # -*- mode: python ; coding: utf-8 -*-
    from PyInstaller.utils.hooks import collect_data_files

    anthropic_datas = collect_data_files('anthropic')
    openai_datas    = collect_data_files('openai')
    httpx_datas     = collect_data_files('httpx')
    certifi_datas   = collect_data_files('certifi')

    a = Analysis(
        ['interview_assistant_windows.py'],
        pathex=[],
        binaries=[],
        datas=anthropic_datas + openai_datas + httpx_datas + certifi_datas,
        hiddenimports=[
            'sounddevice',
            '_sounddevice_data',
            'numpy',
            'numpy.core._methods',
            'numpy.lib.format',
            'pynput',
            'pynput.keyboard',
            'pynput.mouse',
            'pynput._util',
            'pynput._util.win32',      # Windows-specific (replaces darwin)
            'tkinter',
            'tkinter.ttk',
            'anthropic',
            'anthropic._legacy_response',
            'anthropic._streaming',
            'openai',
            'httpx',
            'httpcore',
            'anyio',
            'anyio._backends._asyncio',
            'anyio._backends._trio',
            'sniffio',
            'certifi',
            'h11',
            'queue',
            'wave',
            'struct',
        ],
        excludes=[
            'sklearn', 'scikit_learn',
            'selenium', 'nltk', 'scipy', 'pandas', 'matplotlib',
            'PIL', 'Pillow', 'cv2', 'tensorflow', 'torch',
            'flask', 'fastapi', 'uvicorn', 'django', 'aiohttp',
            'PyQt5', 'PyQt6', 'PySide2', 'PySide6', 'Qt',
            'pytest', 'IPython', 'jupyter',
            'cryptography', 'paramiko',
            'boto3', 'botocore',
            'google', 'grpc',
            'docutils', 'sphinx',
            'AppKit', 'Foundation', 'objc',  # macOS only — exclude on Windows
        ],
        hookspath=[],
        hooksconfig={},
        runtime_hooks=[],
        noarchive=False,
    )

    pyz = PYZ(a.pure)

    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.datas,
        [],
        name='Interview Assistant',
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

    Key differences from Mac spec:
    - `Analysis` points to `interview_assistant_windows.py`
    - hiddenimports uses `pynput._util.win32` (not darwin)
    - No AppKit/Foundation/objc in hiddenimports
    - `EXE` receives `a.binaries` and `a.datas` directly (one-file mode)
    - No `COLLECT` block
    - No `BUNDLE` block (Windows has no .app bundles)
    - `argv_emulation=False` (macOS-only feature)
    - `onefile=True` produces a single .exe
  </action>
  <verify>
    Check no Mac-only imports remain:
    grep -n "AppKit\|Foundation\|objc\|NSApp\|darwin\|from_char.*cmd\|Key.cmd" /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py

    Check Windows-specific code exists:
    grep -n "SetWindowDisplayAffinity\|CABLE Output\|cable output\|Stereo Mix\|ctrl\|Ctrl+Shift" /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py

    Check spec points to correct source and has no BUNDLE:
    grep -n "interview_assistant_windows\|BUNDLE\|argv_emulation\|win32" /Users/jeet/Downloads/interview-assistant/InterviewAssistant_Windows.spec
  </verify>
  <done>
    - interview_assistant_windows.py exists, contains SetWindowDisplayAffinity, find_windows_loopback_device, Ctrl+Shift+H hotkey, zero Mac imports
    - InterviewAssistant_Windows.spec exists, references interview_assistant_windows.py, has pynput._util.win32, no BUNDLE block, no argv_emulation=True
  </done>
</task>

<task type="auto">
  <name>Task 2: Create GitHub Actions workflow for Windows EXE build + S3 upload</name>
  <files>
    /Users/jeet/doordash-p2p/.github/workflows/build-interview-assistant-windows.yml
  </files>
  <action>
    Create `/Users/jeet/doordash-p2p/.github/workflows/build-interview-assistant-windows.yml`:

    ```yaml
    name: Build Interview Assistant (Windows)

    on:
      push:
        branches: [main]
        paths:
          - 'interview-assistant/**'
      workflow_dispatch:

    jobs:
      build-windows:
        runs-on: windows-latest
        defaults:
          run:
            working-directory: interview-assistant

        steps:
          - name: Checkout repository
            uses: actions/checkout@v4

          - name: Set up Python 3.11
            uses: actions/setup-python@v5
            with:
              python-version: '3.11'

          - name: Install dependencies
            run: |
              python -m pip install --upgrade pip
              pip install pyinstaller sounddevice numpy openai anthropic pynput

          - name: Build EXE with PyInstaller
            run: |
              pyinstaller InterviewAssistant_Windows.spec --clean

          - name: Verify EXE was created
            run: |
              if (!(Test-Path "dist\Interview Assistant.exe")) {
                Write-Error "EXE not found at dist\Interview Assistant.exe"
                exit 1
              }
              Write-Output "EXE size: $((Get-Item 'dist\Interview Assistant.exe').Length / 1MB) MB"
            shell: pwsh

          - name: Upload EXE to S3
            env:
              AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
              AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
              AWS_DEFAULT_REGION: us-east-1
            run: |
              aws s3 cp "dist/Interview Assistant.exe" "s3://offerletter.ai/downloads/Interview Assistant.exe" --content-type "application/octet-stream" --cache-control "no-cache"
            shell: bash

          - name: Invalidate CloudFront cache
            env:
              AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
              AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
              AWS_DEFAULT_REGION: us-east-1
            run: |
              aws cloudfront create-invalidation --distribution-id E319UG6B4QE97L --paths "/downloads/Interview Assistant.exe"
            shell: bash

          - name: Upload EXE as workflow artifact (backup)
            uses: actions/upload-artifact@v4
            with:
              name: interview-assistant-windows
              path: interview-assistant/dist/Interview Assistant.exe
              retention-days: 30
    ```

    Important notes:
    - `working-directory: interview-assistant` assumes the interview-assistant source files live at `interview-assistant/` in the repo root. The spec file `InterviewAssistant_Windows.spec` and `interview_assistant_windows.py` must both be at `interview-assistant/` in the repo.
    - The `paths` trigger fires when any file under `interview-assistant/` changes.
    - AWS CLI is pre-installed on `windows-latest` runners but the `aws s3 cp` and CloudFront commands use `shell: bash` to avoid PowerShell escaping issues with spaces in the filename.
    - `--cache-control "no-cache"` ensures browsers always download the latest build.
    - CloudFront distribution `E319UG6B4QE97L` matches the offerletter.ai distribution specified in the task brief.
    - `workflow_dispatch` allows manual triggering from GitHub Actions UI.
  </action>
  <verify>
    Check workflow file exists and has correct runner and S3 path:
    grep -n "windows-latest\|offerletter.ai\|E319UG6B4QE97L\|Interview Assistant.exe" /Users/jeet/doordash-p2p/.github/workflows/build-interview-assistant-windows.yml

    Validate YAML syntax:
    python3 -c "import yaml; yaml.safe_load(open('/Users/jeet/doordash-p2p/.github/workflows/build-interview-assistant-windows.yml'))" && echo "YAML valid"
  </verify>
  <done>
    Workflow file exists, contains windows-latest runner, correct S3 bucket path, correct CloudFront distribution ID, triggers on interview-assistant/ path changes and manual dispatch.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add Windows tab to interview.html download section</name>
  <files>
    /Users/jeet/Downloads/offerletter-ai/interview.html
  </files>
  <action>
    In `/Users/jeet/Downloads/offerletter-ai/interview.html`, make two targeted edits:

    **Edit 1 — Add Windows tab button** (inside the `div.method-tabs` after the Mac Desktop button, before the Phone Browser button):

    Find this exact line:
    ```html
          <button class="method-tab" onclick="switchMethod(this,'phone')" role="tab" aria-selected="false">
    ```
    Insert BEFORE it:
    ```html
          <button class="method-tab" onclick="switchMethod(this,'windows')" role="tab" aria-selected="false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>
            Windows
          </button>
    ```

    **Edit 2 — Add Windows panel** (inside `div.method-panels`, after the closing `</div>` of the `id="mac"` panel, before the phone panel):

    Find the comment `<!-- PHONE PANEL -->` (or the opening of the next panel after mac) and insert the full Windows panel block before it:

    ```html
        <!-- WINDOWS PANEL -->
        <div class="method-panel" id="windows">

          <!-- Purchase notice (hidden once purchased) -->
          <div id="purchaseNoticeWin" style="display:none;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:12px 16px;margin-bottom:12px;font-size:13px;color:#92400E;line-height:1.6;">
            <strong>🔒 Purchase required.</strong> A one-time $19 payment unlocks the download. After payment, your download unlocks automatically.<br/>
            <span style="font-size:12px;color:#B45309;margin-top:4px;display:block;">Already paid? Make sure you used the same browser — your purchase is stored here.</span>
          </div>

          <!-- Download card -->
          <div class="download-card">
            <div class="download-card-left">
              <div class="app-icon-wrap">
                <svg width="32" height="32" viewBox="0 0 38 38" fill="none"><rect width="38" height="38" rx="10" fill="#2563EB"/><path d="M10 12h18M10 17h12M10 22h14" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="27" cy="24" r="7" fill="#F97316"/><path d="M24.5 24l1.5 1.5L29.5 22" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div>
                <div class="app-name">Interview Assistant</div>
                <div class="app-meta">Windows 10+ · $19 · ~35 MB</div>
              </div>
            </div>
            <a href="/downloads/Interview Assistant.exe" class="download-btn" id="downloadBtnWin" download>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download .exe
            </a>
          </div>

          <div class="setup-steps">

            <!-- Step 1 -->
            <div class="setup-step">
              <div class="setup-step-head">
                <div class="setup-step-num">1</div>
                <div>
                  <div class="setup-step-title">Download and run the app</div>
                  <div class="setup-step-sub">Click Download above, then double-click <strong>Interview Assistant.exe</strong> in your Downloads folder</div>
                </div>
              </div>
              <div class="setup-step-body">
                <div class="gk-guide" style="background:#FFF7ED;border-color:#FED7AA;">
                  <div class="gk-guide-title" style="color:#92400E;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400E" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Windows SmartScreen may appear — click "More info" then "Run anyway"
                  </div>
                  <div style="font-size:13px;color:#92400E;margin-top:8px;">
                    This is expected for new apps without a code-signing certificate. Click <strong>More info</strong> in the SmartScreen dialog, then click <strong>Run anyway</strong>.
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2 -->
            <div class="setup-step">
              <div class="setup-step-head">
                <div class="setup-step-num">2</div>
                <div>
                  <div class="setup-step-title">Allow microphone access when asked</div>
                  <div class="setup-step-sub">The app needs this to listen to your interview audio</div>
                </div>
              </div>
              <div class="setup-step-body">
                <div style="font-size:13px;color:var(--text-muted);line-height:1.6;">
                  Windows will ask for microphone permission on first launch. Click <strong>Allow</strong>.<br/>
                  <strong>If you missed it:</strong> Settings → Privacy &amp; security → Microphone → toggle <strong>Let apps access your microphone</strong> on.
                </div>
              </div>
            </div>

            <!-- Step 3 -->
            <div class="setup-step">
              <div class="setup-step-head">
                <div class="setup-step-num">3</div>
                <div>
                  <div class="setup-step-title">Hotkey: Ctrl+Shift+H to hide / show</div>
                  <div class="setup-step-sub">Works even when the window is hidden behind other apps</div>
                </div>
              </div>
            </div>

            <!-- Step 4 — optional VB-Audio -->
            <div class="setup-step">
              <div class="setup-step-head">
                <div class="setup-step-num">4</div>
                <div>
                  <div class="setup-step-title">Optional: Enable hands-free audio (VB-Audio Virtual Cable)</div>
                  <div class="setup-step-sub">Skip this if you prefer typing questions manually. VB-Audio lets the AI hear your Zoom/Teams call automatically.</div>
                </div>
              </div>
              <div class="setup-step-body">
                <div style="font-size:13px;color:var(--text-muted);line-height:1.8;">
                  <strong>1.</strong> Download VB-Audio Virtual Cable (free) from <a href="https://vb-audio.com/Cable/" target="_blank" rel="noopener" style="color:#2563EB;">vb-audio.com/Cable</a><br/>
                  <strong>2.</strong> Run the installer as Administrator and restart Windows<br/>
                  <strong>3.</strong> In Zoom: Settings → Audio → Speaker → select <strong>CABLE Input (VB-Audio Virtual Cable)</strong><br/>
                  <strong>4.</strong> Launch Interview Assistant — it will auto-detect and show "Capturing: CABLE Output (VB-Audio Virtual Cable)"<br/>
                  <strong>5.</strong> Plug in earbuds and set your physical speakers as default output in Windows Sound settings so you can still hear the interview
                </div>
              </div>
            </div>

          </div><!-- /.setup-steps -->
        </div><!-- /#windows -->
    ```

    After both edits, verify the `switchMethod` JavaScript function already handles arbitrary panel IDs (it should use `document.querySelectorAll('.method-panel')` and `document.querySelectorAll('.method-tab')` generically — do NOT modify it unless it hard-codes panel IDs, in which case add 'windows' to its list).
  </action>
  <verify>
    Check Windows tab button and panel exist:
    grep -n "windows\|Windows\|CABLE\|VB-Audio\|downloadBtnWin\|Interview Assistant.exe" /Users/jeet/Downloads/offerletter-ai/interview.html | head -20

    Check switchMethod function is generic (not hard-coded to specific IDs):
    grep -n "switchMethod\|method-panel\|method-tab" /Users/jeet/Downloads/offerletter-ai/interview.html | head -20
  </verify>
  <done>
    interview.html contains a Windows tab button (method-tab calling switchMethod with 'windows'), a Windows method-panel with download-btn pointing to /downloads/Interview Assistant.exe, VB-Audio setup steps in 4 numbered instructions, SmartScreen warning note, and Ctrl+Shift+H hotkey info.
  </done>
</task>

</tasks>

<verification>
After all 3 tasks:

1. No Mac-only imports in windows source:
   grep -c "AppKit\|objc\|NSApp\|darwin\|Key.cmd" /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py
   (expect: 0)

2. Windows-specific code present:
   grep -c "SetWindowDisplayAffinity\|cable output\|Ctrl+Shift" /Users/jeet/Downloads/interview-assistant/interview_assistant_windows.py
   (expect: 3+)

3. Spec is one-file, no Mac blocks:
   grep -c "BUNDLE\|argv_emulation=True\|win32" /Users/jeet/Downloads/interview-assistant/InterviewAssistant_Windows.spec
   (expect: BUNDLE=0, argv_emulation=True=0, win32=1)

4. Workflow targets correct S3 path:
   grep "offerletter.ai/downloads" /Users/jeet/doordash-p2p/.github/workflows/build-interview-assistant-windows.yml
   (expect: s3://offerletter.ai/downloads/Interview Assistant.exe)

5. interview.html has Windows tab and .exe download:
   grep -c "method-tab.*windows\|downloadBtnWin\|Interview Assistant.exe" /Users/jeet/Downloads/offerletter-ai/interview.html
   (expect: 3+)
</verification>

<success_criteria>
- interview_assistant_windows.py: complete standalone file, VB-Audio/Stereo Mix audio priority, ctypes WDA_EXCLUDEFROMCAPTURE screen hiding, Ctrl+Shift+H hotkey, zero Mac-only imports
- InterviewAssistant_Windows.spec: one-file EXE output, pynput._util.win32, no BUNDLE/COLLECT, argv_emulation=False
- build-interview-assistant-windows.yml: windows-latest runner, pip installs correct deps, PyInstaller build, aws s3 cp to s3://offerletter.ai/downloads/Interview Assistant.exe, CloudFront invalidation for E319UG6B4QE97L
- interview.html: Windows tab renders alongside Mac Desktop, download button links to /downloads/Interview Assistant.exe, VB-Audio 5-step setup instructions present
</success_criteria>

<output>
No SUMMARY.md needed for quick tasks. After completion, verify all 4 files exist at their target paths.
</output>
