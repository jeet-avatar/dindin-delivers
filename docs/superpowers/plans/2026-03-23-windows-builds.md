# Windows Builds — MixMind + BeatMind Bridge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce Windows EXE installers for MixMind and BeatMind Bridge via GitHub Actions, triggered by a version tag push, with artifacts attached to a GitHub Release alongside the macOS DMG.

**Architecture:** Three parallel GitHub Actions jobs build platform artifacts (macOS DMG, Windows MixMind NSIS installer, Windows BeatMind Bridge onedir zip), then a fourth job creates or updates the GitHub Release. Python sidecar files get `sys.platform` guards for Windows paths, and `main.js` gets platform guards for sidecar binary naming, JWT storage, and rekordbox launch.

**Tech Stack:** PyInstaller 6 (onedir), electron-builder 24 (nsis), GitHub Actions (windows-latest + macos-latest), `shutil.disk_usage` (cross-platform USB), `gh` CLI (release create/upload)

---

## Chunk 1: Sidecar cross-platform path fixes

### Task 1: Fix `library.py` XML path

**Files:**
- Modify: `apps/mixmind/sidecar/library.py:14-20`

Current code at lines 13-20:
```python
# Default XML path — overridden in tests via patch
XML_PATH = (
    Path.home()
    / "Library"
    / "Music"
    / "rekordbox"
    / "rekordbox.xml"
)
```

- [ ] **Step 1: Add `sys` import and replace `XML_PATH` constant**

Edit `apps/mixmind/sidecar/library.py`. After `from pathlib import Path` (line 2), add `import sys`. Replace lines 14-20 with:

```python
# Default XML path — overridden in tests via patch
import sys
if sys.platform == "win32":
    XML_PATH = Path.home() / "AppData" / "Roaming" / "Pioneer" / "rekordbox" / "rekordbox.xml"
else:
    XML_PATH = Path.home() / "Library" / "Music" / "rekordbox" / "rekordbox.xml"
```

- [ ] **Step 2: Verify**

```bash
grep -n "XML_PATH" apps/mixmind/sidecar/library.py
```
Expected: lines showing the `if sys.platform == "win32":` block.

- [ ] **Step 3: Commit**

```bash
git add apps/mixmind/sidecar/library.py
git commit -m "feat(mixmind): cross-platform XML_PATH in library.py"
```

---

### Task 2: Fix `ai_routes.py` XML path

**Files:**
- Modify: `apps/mixmind/sidecar/ai_routes.py:14`

Current code at line 14:
```python
XML_PATH = Path.home() / "Library" / "Music" / "rekordbox" / "rekordbox.xml"
```

- [ ] **Step 1: Replace XML_PATH with platform guard**

In `apps/mixmind/sidecar/ai_routes.py`, replace line 14 with:

```python
import sys
if sys.platform == "win32":
    XML_PATH = Path.home() / "AppData" / "Roaming" / "Pioneer" / "rekordbox" / "rekordbox.xml"
else:
    XML_PATH = Path.home() / "Library" / "Music" / "rekordbox" / "rekordbox.xml"
```

- [ ] **Step 2: Verify**

```bash
grep -n "XML_PATH\|sys.platform" apps/mixmind/sidecar/ai_routes.py
```
Expected: `sys.platform == "win32"` guard visible.

- [ ] **Step 3: Commit**

```bash
git add apps/mixmind/sidecar/ai_routes.py
git commit -m "feat(mixmind): cross-platform XML_PATH in ai_routes.py"
```

---

### Task 3: Fix `duplicate_routes.py` XML path

**Files:**
- Modify: `apps/mixmind/sidecar/duplicate_routes.py:13-15`

Current code at lines 13-15:
```python
XML_PATH = (
    Path.home() / "Library" / "Music" / "rekordbox" / "rekordbox.xml"
)
```

- [ ] **Step 1: Replace XML_PATH with platform guard**

In `apps/mixmind/sidecar/duplicate_routes.py`, replace lines 13-15 with:

```python
import sys
if sys.platform == "win32":
    XML_PATH = Path.home() / "AppData" / "Roaming" / "Pioneer" / "rekordbox" / "rekordbox.xml"
else:
    XML_PATH = Path.home() / "Library" / "Music" / "rekordbox" / "rekordbox.xml"
```

- [ ] **Step 2: Verify**

```bash
grep -n "XML_PATH\|sys.platform" apps/mixmind/sidecar/duplicate_routes.py
```

- [ ] **Step 3: Commit**

```bash
git add apps/mixmind/sidecar/duplicate_routes.py
git commit -m "feat(mixmind): cross-platform XML_PATH in duplicate_routes.py"
```

---

### Task 4: Fix `rekordbox.py` DB path

**Files:**
- Modify: `apps/mixmind/sidecar/rekordbox.py:299`

Current code at line 299:
```python
_DB_PATH = Path.home() / "Library" / "Pioneer" / "rekordbox" / "master.db"
```

- [ ] **Step 1: Replace `_DB_PATH` with platform guard**

In `apps/mixmind/sidecar/rekordbox.py`, replace line 299 with:

```python
import sys
if sys.platform == "win32":
    _DB_PATH = Path.home() / "AppData" / "Roaming" / "Pioneer" / "rekordbox" / "master.db"
else:
    _DB_PATH = Path.home() / "Library" / "Pioneer" / "rekordbox" / "master.db"
```

- [ ] **Step 2: Verify**

```bash
grep -n "_DB_PATH\|sys.platform\|_sys.platform" apps/mixmind/sidecar/rekordbox.py
```
Expected: lines 299-302 showing the platform guard.

- [ ] **Step 3: Commit**

```bash
git add apps/mixmind/sidecar/rekordbox.py
git commit -m "feat(mixmind): cross-platform _DB_PATH in rekordbox.py"
```

---

### Task 5: Fix `usb.py` for Windows

**Files:**
- Modify: `apps/mixmind/sidecar/usb.py`

Current `detect_pioneer_usb()` uses `os.statvfs` (POSIX-only) and scans `/Volumes/` (macOS-only).

- [ ] **Step 1: Rewrite `detect_pioneer_usb` with platform branch**

Replace the entire `usb.py` content with:

```python
"""USB drive detection — macOS /Volumes/ scan or Windows drive-letter scan."""
import os
import sys
import string
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api/usb")


def detect_pioneer_usb() -> dict:
    if sys.platform == "win32":
        import shutil
        for letter in string.ascii_uppercase:
            drive = Path(f"{letter}:\\")
            if (drive / "PIONEER").exists():
                usage = shutil.disk_usage(str(drive))
                return {
                    "connected": True,
                    "name": f"{letter}:",
                    "path": str(drive),
                    "total_gb": round(usage.total / (1024 ** 3), 1),
                }
        return {"connected": False}
    else:
        volumes = Path("/Volumes")
        if not volumes.exists():
            return {"connected": False}
        for volume in volumes.iterdir():
            pioneer_dir = volume / "PIONEER"
            if pioneer_dir.exists() and pioneer_dir.is_dir():
                stat = os.statvfs(str(volume))
                total_gb = (stat.f_blocks * stat.f_frsize) / (1024 ** 3)
                return {
                    "connected": True,
                    "name": volume.name,
                    "path": str(volume),
                    "total_gb": round(total_gb, 1),
                }
        return {"connected": False}


@router.get("/status")
async def usb_status():
    return detect_pioneer_usb()
```

- [ ] **Step 2: Verify**

```bash
grep -n "sys.platform\|shutil\|statvfs" apps/mixmind/sidecar/usb.py
```
Expected: both `sys.platform == "win32"` branch (shutil) and the else branch (statvfs) visible.

- [ ] **Step 3: Commit**

```bash
git add apps/mixmind/sidecar/usb.py
git commit -m "feat(mixmind): cross-platform USB detection in usb.py (Windows drive scan)"
```

---

## Chunk 2: Electron main.js cross-platform guards

### Task 6: Fix `main.js` — sidecar path, keychain, open-rekordbox

**Files:**
- Modify: `apps/mixmind/electron/main.js:25-27` (sidecar path)
- Modify: `apps/mixmind/electron/main.js:165-187` (keychain helpers)
- Modify: `apps/mixmind/electron/main.js:192-194` (open-rekordbox IPC)

**Sub-task 6a: Sidecar binary path (lines 25-27)**

Current:
```js
const SIDECAR_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'sidecar', 'mixmind-sidecar')
  : path.join(__dirname, '..', 'sidecar', 'dist', 'mixmind-sidecar', 'mixmind-sidecar');
```

- [ ] **Step 1: Add `.exe` suffix on Windows**

Replace lines 25-27 with:

```js
const SIDECAR_BINARY = process.platform === 'win32' ? 'mixmind-sidecar.exe' : 'mixmind-sidecar';
const SIDECAR_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'sidecar', SIDECAR_BINARY)
  : path.join(__dirname, '..', 'sidecar', 'dist', 'mixmind-sidecar', SIDECAR_BINARY);
```

**Sub-task 6b: Keychain helpers (lines 165-187)**

Check if `os` is already imported at the top of `main.js` — it is (used for `os.homedir()`). No new import needed.

- [ ] **Step 2: Replace the keychain section**

Replace lines 165-187 (the `// ── Keychain helpers` comment through the closing `}` of `loadJWTFromKeychain`) with:

```js
// ── JWT storage helpers (macOS: Keychain; Windows/Linux: plain file) ─────────

const JWT_FILE = path.join(os.homedir(), '.mixmind', 'jwt');

function storeJWTInKeychain(token) {
  if (process.platform === 'darwin') {
    try {
      execSync(`security add-generic-password -s mixmind-jwt -a mixmind -w "${token}" -U`, { stdio: 'ignore' });
    } catch (e) { console.error('Keychain write failed:', e.message); }
  } else {
    try {
      fs.mkdirSync(path.dirname(JWT_FILE), { recursive: true });
      fs.writeFileSync(JWT_FILE, token, { mode: 0o600 });
    } catch (e) { console.error('JWT file write failed:', e.message); }
  }
}

function loadJWTFromKeychain() {
  if (process.platform === 'darwin') {
    try { return execSync('security find-generic-password -s mixmind-jwt -w', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
    catch (_) { return null; }
  } else {
    try { return fs.readFileSync(JWT_FILE, 'utf8').trim(); }
    catch (_) { return null; }
  }
}
```

> Note: verify `fs` is imported at the top of main.js (it's used for other file operations — should be `const fs = require('fs')`).

**Sub-task 6c: open-rekordbox IPC (lines 192-194)**

Current:
```js
ipcMain.handle('open-rekordbox', () => {
  spawn('open', ['-a', 'rekordbox'], { detached: true, stdio: 'ignore' });
});
```

- [ ] **Step 3: Replace with cross-platform version**

```js
ipcMain.handle('open-rekordbox', () => {
  if (process.platform === 'darwin') {
    spawn('open', ['-a', 'rekordbox'], { detached: true, stdio: 'ignore' });
  } else {
    const winPath = 'C:\\Program Files\\Pioneer\\rekordbox\\rekordbox.exe';
    if (fs.existsSync(winPath)) {
      spawn(winPath, [], { detached: true, stdio: 'ignore' });
    } else {
      shell.openExternal('https://rekordbox.com');
    }
  }
});
```

- [ ] **Step 4: Verify all three changes**

```bash
grep -n "SIDECAR_BINARY\|JWT_FILE\|process.platform\|win32" apps/mixmind/electron/main.js
```
Expected: at least 5 matches covering the three patched locations.

- [ ] **Step 5: Commit**

```bash
git add apps/mixmind/electron/main.js
git commit -m "feat(mixmind): cross-platform guards in main.js (sidecar .exe, JWT file, rekordbox)"
```

---

## Chunk 3: Windows PyInstaller specs + build scripts

### Task 7: Create `mixmind-sidecar-windows.spec`

**Files:**
- Create: `apps/mixmind/sidecar/mixmind-sidecar-windows.spec`

Identical hidden imports to the macOS spec. No `BUNDLE` section (macOS only).

- [ ] **Step 1: Create the spec file**

`apps/mixmind/sidecar/mixmind-sidecar-windows.spec`:

```python
# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = []
binaries = []
hiddenimports = ['uvicorn.logging', 'uvicorn.lifespan.on', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets.auto', 'fastapi', 'sqlalchemy.dialects.sqlite']
tmp_ret = collect_all('pyrekordbox')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='mixmind-sidecar',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='mixmind-sidecar',
)
```

- [ ] **Step 2: Verify**

```bash
grep -n "BUNDLE\|COLLECT\|EXE" apps/mixmind/sidecar/mixmind-sidecar-windows.spec
```
Expected: `EXE` and `COLLECT` present, no `BUNDLE`.

- [ ] **Step 3: Commit**

```bash
git add apps/mixmind/sidecar/mixmind-sidecar-windows.spec
git commit -m "feat(mixmind): Windows PyInstaller spec for sidecar"
```

---

### Task 8: Create `apps/mixmind/sidecar/build-windows.ps1`

**Files:**
- Create: `apps/mixmind/sidecar/build-windows.ps1`

- [ ] **Step 1: Create the PowerShell build script**

```powershell
pip install -r requirements.txt
pip install pyinstaller
pyinstaller mixmind-sidecar-windows.spec
```

- [ ] **Step 2: Commit**

```bash
git add apps/mixmind/sidecar/build-windows.ps1
git commit -m "feat(mixmind): Windows build script for sidecar"
```

---

### Task 9: Create `BeatMind Bridge-windows.spec`

**Files:**
- Create: `apps/ableton-chatbot/bridge/BeatMind Bridge-windows.spec`

Based on existing macOS spec — drop the `app = BUNDLE(...)` section.

- [ ] **Step 1: Create the spec file**

`apps/ableton-chatbot/bridge/BeatMind Bridge-windows.spec`:

```python
# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['bridge_app.py'],
    pathex=[],
    binaries=[],
    datas=[('bridge.py', '.')],
    hiddenimports=['websockets', 'websockets.legacy', 'websockets.legacy.client', 'websockets.legacy.server'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='BeatMind Bridge',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='BeatMind Bridge',
)
```

Note: no `BUNDLE` section — that's macOS `.app` only.

- [ ] **Step 2: Verify no BUNDLE**

```bash
grep -n "BUNDLE" "apps/ableton-chatbot/bridge/BeatMind Bridge-windows.spec"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "apps/ableton-chatbot/bridge/BeatMind Bridge-windows.spec"
git commit -m "feat(bridge): Windows PyInstaller spec for BeatMind Bridge"
```

---

### Task 10: Create `apps/ableton-chatbot/bridge/build-windows.ps1`

**Files:**
- Create: `apps/ableton-chatbot/bridge/build-windows.ps1`

- [ ] **Step 1: Create the PowerShell build script**

```powershell
pip install -r requirements.txt
pip install pyinstaller
pyinstaller "BeatMind Bridge-windows.spec"
```

- [ ] **Step 2: Commit**

```bash
git add apps/ableton-chatbot/bridge/build-windows.ps1
git commit -m "feat(bridge): Windows build script for BeatMind Bridge"
```

---

## Chunk 4: electron-builder Windows target + icon

### Task 11: Add Windows target to `electron/package.json`

**Files:**
- Modify: `apps/mixmind/electron/package.json`

Current `build` section has `mac`, `dmg`, `protocols`, `files`, `extraResources` — needs `win` + `nsis` added.

- [ ] **Step 1: Add `win` and `nsis` to the build section**

In `apps/mixmind/electron/package.json`, after the `"dmg": { ... }` block (which ends before `"files"`), add:

```json
"win": {
  "target": "nsis",
  "icon": "assets/icon.ico"
},
"nsis": {
  "oneClick": true,
  "perMachine": false
},
```

The full `build` section should now look like:

```json
"build": {
  "appId": "io.beatmind.mixmind",
  "productName": "MixMind",
  "mac": {
    "category": "public.app-category.music",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "entitlements.plist",
    "entitlementsInherit": "entitlements.plist",
    "identity": "77506F6C9C2A3DD24D06077E2C5ED5A00ED6B7D0"
  },
  "protocols": [
    {
      "name": "MixMind",
      "schemes": ["mixmind"]
    }
  ],
  "dmg": {
    "title": "MixMind",
    "icon": "assets/icon.icns"
  },
  "win": {
    "target": "nsis",
    "icon": "assets/icon.ico"
  },
  "nsis": {
    "oneClick": true,
    "perMachine": false
  },
  "files": [
    "main.js",
    "preload.js",
    "splash.html",
    "../frontend/build/**/*"
  ],
  "extraResources": [
    {
      "from": "../sidecar/dist/mixmind-sidecar",
      "to": "sidecar",
      "filter": ["**/*"]
    }
  ]
}
```

- [ ] **Step 2: Verify**

```bash
grep -n "win\|nsis\|icon.ico" apps/mixmind/electron/package.json
```
Expected: `"win"`, `"nsis"`, `"icon.ico"` all present.

- [ ] **Step 3: Commit**

```bash
git add apps/mixmind/electron/package.json
git commit -m "feat(mixmind): add Windows NSIS target to electron-builder config"
```

---

### Task 12: Create `assets/icon.ico`

**Files:**
- Create: `apps/mixmind/electron/assets/icon.ico`

electron-builder needs a `.ico` file for Windows. Convert the existing `icon.icns` locally — do NOT generate at CI time (ImageMagick ICNS support is unreliable on Windows runners).

- [ ] **Step 1: Convert `icon.icns` to `icon.ico` on macOS**

Run locally:

```bash
# Extract the 256x256 PNG from the icns
sips -s format png apps/mixmind/electron/assets/icon.icns \
  --out /tmp/mixmind-icon-256.png \
  --resampleHeightWidthMax 256

# Use ImageMagick to produce a multi-resolution ICO (16, 32, 48, 256)
magick /tmp/mixmind-icon-256.png \
  -define icon:auto-resize=256,48,32,16 \
  apps/mixmind/electron/assets/icon.ico
```

If ImageMagick is not installed: `brew install imagemagick`

Alternatively, convert online (e.g., cloudconvert.com) using `icon.icns` as source and download the resulting `.ico`.

- [ ] **Step 2: Verify the file exists and is non-empty**

```bash
ls -lh apps/mixmind/electron/assets/icon.ico
```
Expected: file exists, size > 5KB.

- [ ] **Step 3: Commit**

```bash
git add apps/mixmind/electron/assets/icon.ico
git commit -m "feat(mixmind): add icon.ico for Windows electron-builder"
```

---

## Chunk 5: GitHub Actions release workflow

### Task 13: Create `.github/workflows/release.yml`

**Files:**
- Create: `.github/workflows/release.yml`

**Prerequisites (user action required before running):**

Set these 4 secrets in GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `APPLE_API_KEY_ID` | `9K626GB728` |
| `APPLE_API_ISSUER` | `80d10e49-f379-462f-9668-5ea53016812e` |
| `APPLE_API_KEY_P8` | Full contents of `~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8` |
| `APPLE_CERT_FINGERPRINT` | `77506F6C9C2A3DD24D06077E2C5ED5A00ED6B7D0` |

- [ ] **Step 1: Create the workflow file**

`.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  # ── macOS: signed + notarized DMG ─────────────────────────────────────────
  macos-dmg:
    runs-on: macos-latest
    defaults:
      run:
        working-directory: apps/mixmind
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Build sidecar (PyInstaller)
        run: |
          cd sidecar
          pip install -r requirements.txt --quiet
          pip install pyinstaller --quiet
          pyinstaller mixmind-sidecar.spec

      - name: Codesign sidecar
        env:
          CERT_FINGERPRINT: ${{ secrets.APPLE_CERT_FINGERPRINT }}
          ENTITLEMENTS: ${{ github.workspace }}/apps/mixmind/electron/entitlements.plist
        run: |
          SIDECAR_DIR="sidecar/dist/mixmind-sidecar"
          find "$SIDECAR_DIR" \( -name "*.dylib" -o -name "*.so" \) | while read f; do
            codesign --force --sign "$CERT_FINGERPRINT" --options runtime --entitlements "$ENTITLEMENTS" "$f" 2>/dev/null || true
          done
          codesign --force --verify --verbose \
            --sign "$CERT_FINGERPRINT" \
            --options runtime \
            --entitlements "$ENTITLEMENTS" \
            "$SIDECAR_DIR/mixmind-sidecar"

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build

      - name: Install electron deps
        run: cd electron && npm ci

      - name: Write .p8 key
        run: echo "${{ secrets.APPLE_API_KEY_P8 }}" > /tmp/AuthKey.p8

      - name: Build DMG (notarized)
        working-directory: apps/mixmind/electron
        env:
          APPLE_API_KEY: /tmp/AuthKey.p8
          APPLE_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}
          APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
        run: npx electron-builder --mac --publish=never

      - name: Upload DMG artifact
        uses: actions/upload-artifact@v4
        with:
          name: macos-dmg
          path: apps/mixmind/electron/dist/*.dmg

  # ── Windows: MixMind NSIS installer ───────────────────────────────────────
  windows-mixmind:
    runs-on: windows-latest
    defaults:
      run:
        working-directory: apps/mixmind
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Build sidecar (PyInstaller)
        run: |
          cd sidecar
          pip install -r requirements.txt --quiet
          pip install pyinstaller --quiet
          pyinstaller mixmind-sidecar-windows.spec

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build

      - name: Build Windows NSIS installer
        working-directory: apps/mixmind/electron
        run: |
          npm ci
          npx electron-builder --win nsis --publish=never

      - name: Upload Windows installer artifact
        uses: actions/upload-artifact@v4
        with:
          name: windows-mixmind
          path: apps/mixmind/electron/dist/*.exe

  # ── Windows: BeatMind Bridge onedir ───────────────────────────────────────
  windows-bridge:
    runs-on: windows-latest
    defaults:
      run:
        working-directory: apps/ableton-chatbot/bridge
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Build BeatMind Bridge (PyInstaller)
        run: |
          pip install -r requirements.txt --quiet
          pip install pyinstaller --quiet
          pyinstaller "BeatMind Bridge-windows.spec"

      - name: Upload bridge artifact
        uses: actions/upload-artifact@v4
        with:
          name: windows-bridge
          path: apps/ableton-chatbot/bridge/dist/BeatMind Bridge/

  # ── Release: attach all artifacts to GitHub Release ───────────────────────
  release:
    needs: [macos-dmg, windows-mixmind, windows-bridge]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts/

      - name: Rename and stage release assets
        run: |
          TAG="${GITHUB_REF_NAME}"
          mkdir -p release-assets
          # macOS DMG
          cp artifacts/macos-dmg/*.dmg "release-assets/MixMind-${TAG}-mac.dmg"
          # Windows MixMind installer
          cp artifacts/windows-mixmind/*.exe "release-assets/MixMind-Setup-${TAG}-win.exe"
          # Windows BeatMind Bridge — upload-artifact@v4 auto-zips directories,
          # so the downloaded artifact is already a .zip containing the onedir bundle.
          # Note: the spec's release job description says .exe but the Bridge is a
          # directory (onedir), not a single exe — .zip is the correct container.
          cp "artifacts/windows-bridge.zip" "release-assets/BeatMind-Bridge-${TAG}-win.zip" 2>/dev/null || \
          find artifacts/windows-bridge -name "*.zip" -exec cp {} "release-assets/BeatMind-Bridge-${TAG}-win.zip" \; || \
          zip -r "release-assets/BeatMind-Bridge-${TAG}-win.zip" "artifacts/windows-bridge/"

      - name: Create or update GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          TAG="${GITHUB_REF_NAME}"
          gh release create "$TAG" \
            --title "$TAG" \
            --generate-notes \
            || true
          gh release upload "$TAG" release-assets/* --clobber
```

- [ ] **Step 2: Verify workflow file is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" && echo "YAML OK"
```
Expected: `YAML OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "feat(ci): GitHub Actions release workflow — macOS DMG + Windows EXEs"
```

---

## How to trigger a release

After all tasks above are complete and secrets are set:

```bash
# Bump version in electron/package.json (e.g., "version": "1.0.1")
git add apps/mixmind/electron/package.json
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push origin main --tags
# GitHub Actions runs → Release appears in ~15 min at github.com/<owner>/<repo>/releases
```

The release will contain:
- `MixMind-v1.0.1-mac.dmg` — signed + notarized macOS installer
- `MixMind-Setup-v1.0.1-win.exe` — unsigned Windows NSIS installer
- `BeatMind-Bridge-v1.0.1-win.zip` — Windows BeatMind Bridge onedir bundle
