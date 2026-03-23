# Windows Builds — MixMind + BeatMind Bridge
**Date:** 2026-03-23
**Status:** Approved

---

## Goal

Produce Windows EXE installers for MixMind and BeatMind Bridge via GitHub Actions, triggered by a version tag push. Artifacts are attached to a GitHub Release alongside the existing macOS DMG.

---

## Architecture

Three parallel GitHub Actions jobs build platform artifacts, then a fourth job creates the release.

```
git tag v1.0.1 && git push --tags
         │
         ▼ (parallel)
┌──────────────────────────────────────────┐
│ job: macos-dmg  (macos-latest)           │
│ • PyInstaller → sidecar binary           │
│ • codesign sidecar (cert fingerprint)    │
│ • npm run build (React/Vite frontend)    │
│ • electron-builder → notarized .dmg      │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ job: windows-mixmind  (windows-latest)   │
│ • pip install -r requirements.txt        │
│ • PyInstaller → sidecar .exe (onedir)    │
│ • npm run build (React/Vite frontend)    │
│ • electron-builder --win nsis → .exe     │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ job: windows-bridge  (windows-latest)    │
│ • pip install -r requirements.txt        │
│ • PyInstaller → BeatMind Bridge.exe      │
│ • zip onedir output for artifact upload  │
└──────────────────────────────────────────┘
         │ all 3 succeed
         ▼
┌──────────────────────────────────────────┐
│ job: release  (ubuntu-latest)            │
│ • download all artifacts                 │
│ • gh release create vX.Y.Z (idempotent)  │
│   ├─ MixMind-vX.Y.Z-mac.dmg             │
│   ├─ MixMind-Setup-vX.Y.Z-win.exe       │
│   └─ BeatMind-Bridge-vX.Y.Z-win.exe     │
└──────────────────────────────────────────┘
```

**Code signing:**
- macOS: signed + notarized (Developer ID, Apple Notary Service)
- Windows: unsigned (SmartScreen "Run anyway" prompt on first launch; EV certificate can be added later)

---

## Component 1: Cross-platform path fixes (MixMind sidecar)

### Rekordbox XML path
Affects: `library.py` (line 14), `ai_routes.py` (line 14), `duplicate_routes.py` (lines 13–15) — all module-level constants.

| Platform | Path |
|----------|------|
| macOS | `~/Library/Music/rekordbox/rekordbox.xml` |
| Windows | `~/AppData/Roaming/Pioneer/rekordbox/rekordbox.xml` |

Apply this pattern identically to all three files:

```python
import sys
from pathlib import Path

if sys.platform == "win32":
    XML_PATH = Path.home() / "AppData" / "Roaming" / "Pioneer" / "rekordbox" / "rekordbox.xml"
else:
    XML_PATH = Path.home() / "Library" / "Music" / "rekordbox" / "rekordbox.xml"
```

`library.py` specifically: replace the existing `XML_PATH = Path.home() / "Library" / "Music" / ...` constant at line 14 with the above pattern. Same edit for `ai_routes.py:14` and `duplicate_routes.py:13–15`.

### Rekordbox DB path
Affects: `rekordbox.py` line 299 (module-level constant `_DB_PATH`)

| Platform | Path |
|----------|------|
| macOS | `~/Library/Pioneer/rekordbox/master.db` |
| Windows | `~/AppData/Roaming/Pioneer/rekordbox/master.db` |

```python
import sys
if sys.platform == "win32":
    _DB_PATH = Path.home() / "AppData" / "Roaming" / "Pioneer" / "rekordbox" / "master.db"
else:
    _DB_PATH = Path.home() / "Library" / "Pioneer" / "rekordbox" / "master.db"
```

### USB detection
Affects: `usb.py` — `os.statvfs` is POSIX-only and must not be called on Windows.

```python
import sys, string
from pathlib import Path

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
        # existing macOS /Volumes logic (uses os.statvfs)
        ...
```

`shutil.disk_usage` is cross-platform and provides the same `total` field, preserving the API contract.

---

## Component 2: Cross-platform fixes (Electron main.js)

Three macOS-specific blocks in `apps/mixmind/electron/main.js` must be made cross-platform.

### 2a. Sidecar executable path (line 25–27)
On Windows, PyInstaller names the binary `mixmind-sidecar.exe`. `fs.existsSync` will return false without the `.exe` suffix, preventing the sidecar from ever spawning.

```js
const SIDECAR_BINARY = process.platform === 'win32' ? 'mixmind-sidecar.exe' : 'mixmind-sidecar';
const SIDECAR_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'sidecar', SIDECAR_BINARY)
  : path.join(__dirname, '..', 'sidecar', 'dist', 'mixmind-sidecar', SIDECAR_BINARY);
```

### 2b. Keychain helpers (lines 165–187)
`security` is a macOS CLI — calling it on Windows throws "command not found". Replace with a platform branch: macOS uses `security` CLI (existing behaviour), Windows uses a plain file at `~/.mixmind/jwt` (adequate for a local desktop app with no multi-user concern).

```js
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

### 2c. open-rekordbox IPC handler (line 192–194)
`open -a rekordbox` is macOS-only. Windows equivalent uses `shell.openPath` to the default install location, with a fallback dialog if not found.

```js
ipcMain.handle('open-rekordbox', () => {
  if (process.platform === 'darwin') {
    spawn('open', ['-a', 'rekordbox'], { detached: true, stdio: 'ignore' });
  } else {
    const winPath = 'C:\\Program Files\\Pioneer\\rekordbox\\rekordbox.exe';
    if (fs.existsSync(winPath)) {
      spawn(winPath, [], { detached: true, stdio: 'ignore' });
    } else {
      shell.openExternal('https://rekordbox.com');  // fallback: open download page
    }
  }
});
```

### 2d. Deep-link handling
`app.on('open-url', ...)` fires on macOS. On Windows, deep links arrive via `second-instance`. Both are already handled correctly if `setAsDefaultProtocolClient` is called (which it is). No code change required — Electron handles the routing internally.

---

## Component 3: Windows PyInstaller specs

### `apps/mixmind/sidecar/mixmind-sidecar-windows.spec`
Identical hidden imports to the macOS spec. Produces `dist/mixmind-sidecar/mixmind-sidecar.exe` (onedir). No `BUNDLE` section (macOS only).

### `apps/ableton-chatbot/bridge/BeatMind Bridge-windows.spec`
Based on existing macOS spec. Drops the `app = BUNDLE(...)` section. Produces `dist/BeatMind Bridge/BeatMind Bridge.exe` (onedir).

### `apps/mixmind/sidecar/build-windows.ps1`
```powershell
pip install -r requirements.txt
pip install pyinstaller
pyinstaller mixmind-sidecar-windows.spec
```

### `apps/ableton-chatbot/bridge/build-windows.ps1`
```powershell
pip install -r requirements.txt
pip install pyinstaller
pyinstaller "BeatMind Bridge-windows.spec"
```

**Note on `sqlcipher3`:** `sqlcipher3 >= 0.6.2` ships pre-built Windows wheels on PyPI (`cp312-win_amd64`) that bundle the native SQLCipher library. No system-level Chocolatey or DLL install is required — `pip install -r requirements.txt` handles it automatically.

**Note on test dependencies:** `requirements.txt` currently includes `pytest`, `pytest-asyncio`, `httpx`. These will be bundled into the frozen binary, adding unnecessary size. A `requirements-dev.txt` split is a known gap — acceptable for now, addressable in a follow-up.

---

## Component 4: electron-builder Windows target

Add to `apps/mixmind/electron/package.json` `build` section:

```json
"win": {
  "target": "nsis",
  "icon": "assets/icon.ico"
},
"nsis": {
  "oneClick": true,
  "perMachine": false
}
```

**`assets/icon.ico`:** Commit a pre-converted ICO file to the repo rather than generating at CI time. `icns` → `ico` conversion requires ImageMagick with ICNS support which is unreliable on Windows runners. Convert locally using an online tool or GIMP, then commit. The existing `icon.icns` serves as the source.

---

## Component 5: GitHub Actions workflow

**File:** `.github/workflows/release.yml`
**Trigger:** `push` to tags matching `v*`

### Permissions
```yaml
permissions:
  contents: write   # required for gh release create
```

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `APPLE_API_KEY_ID` | `9K626GB728` |
| `APPLE_API_ISSUER` | `80d10e49-f379-462f-9668-5ea53016812e` |
| `APPLE_API_KEY_P8` | Full contents of `AuthKey_9K626GB728.p8` |
| `APPLE_CERT_FINGERPRINT` | `77506F6C9C2A3DD24D06077E2C5ED5A00ED6B7D0` |

Set via: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

### Job: `macos-dmg`
1. `actions/checkout`
2. `actions/setup-python@v5` (3.12)
3. `pip install -r sidecar/requirements.txt && pip install pyinstaller`
4. `cd sidecar && pyinstaller mixmind-sidecar.spec`
5. `codesign` sidecar dylibs + main binary (cert fingerprint from secret)
6. `actions/setup-node@v4` (20)
7. `cd frontend && npm ci && npm run build` (Vite → `build/`)
8. `cd electron && npm ci`
9. Write `.p8` from secret: `echo "$APPLE_API_KEY_P8" > /tmp/AuthKey.p8`
10. `electron-builder --mac --publish=never` with env `APPLE_API_KEY=/tmp/AuthKey.p8`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`
11. `upload-artifact`: `dist/MixMind-*.dmg` → name `macos-dmg`

### Job: `windows-mixmind`
1. `actions/checkout`
2. `actions/setup-python@v5` (3.12)
3. `pip install -r sidecar/requirements.txt && pip install pyinstaller`
5. `cd sidecar && pyinstaller mixmind-sidecar-windows.spec`
6. `actions/setup-node@v4` (20)
7. `cd frontend && npm ci && npm run build` (Vite → `build/`)
8. `cd electron && npm ci && electron-builder --win nsis --publish=never`
9. `upload-artifact`: `dist/*.exe` → name `windows-mixmind`

### Job: `windows-bridge`
1. `actions/checkout`
2. `actions/setup-python@v5` (3.12)
3. `cd apps/ableton-chatbot/bridge && pip install -r requirements.txt && pip install pyinstaller`
4. `pyinstaller "BeatMind Bridge-windows.spec"`
5. `upload-artifact`: `dist/BeatMind Bridge/` directory (upload-artifact zips directories automatically) → name `windows-bridge`

### Job: `release`
- `needs: [macos-dmg, windows-mixmind, windows-bridge]`
- `runs-on: ubuntu-latest`
- Download all three artifacts
- Rename files to include version tag: `MixMind-${TAG}-mac.dmg`, `MixMind-Setup-${TAG}-win.exe`, `BeatMind-Bridge-${TAG}-win.exe`
- `gh release create "$TAG" --title "v$TAG" --generate-notes || true` (idempotent — `|| true` prevents failure if release already exists on re-run)
- `gh release upload "$TAG" <files> --clobber` (overwrites assets on re-run)

---

## Vite frontend output — confirmed correct
The MixMind frontend uses Vite (not Next.js) with `build.outDir: 'build'` in `vite.config.ts`. The `electron/package.json` `files` array references `../frontend/build/**/*` — this matches. No change needed.

---

## Release Trigger

```bash
# In apps/mixmind/electron/package.json, bump "version"
git add apps/mixmind/electron/package.json
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push origin main --tags
# GitHub Actions runs → Release appears in ~15 min
```

---

## Files Created / Modified

| File | Action |
|------|--------|
| `apps/mixmind/sidecar/library.py` | Add Windows XML path |
| `apps/mixmind/sidecar/ai_routes.py` | Add Windows XML path |
| `apps/mixmind/sidecar/duplicate_routes.py` | Add Windows XML path |
| `apps/mixmind/sidecar/rekordbox.py` | Add Windows DB path at line 299 (`_DB_PATH` constant) |
| `apps/mixmind/sidecar/usb.py` | Add Windows drive-letter scan using `shutil.disk_usage` |
| `apps/mixmind/sidecar/mixmind-sidecar-windows.spec` | New — Windows PyInstaller spec |
| `apps/mixmind/sidecar/build-windows.ps1` | New — Windows CI build script |
| `apps/mixmind/electron/main.js` | Platform guards: sidecar path (.exe), Keychain→file, open-rekordbox |
| `apps/mixmind/electron/package.json` | Add `win` + `nsis` build targets |
| `apps/mixmind/electron/assets/icon.ico` | New — Windows icon (pre-converted from icon.icns, committed to repo) |
| `apps/ableton-chatbot/bridge/BeatMind Bridge-windows.spec` | New — Windows spec (no BUNDLE) |
| `apps/ableton-chatbot/bridge/build-windows.ps1` | New — Windows CI build script |
| `.github/workflows/release.yml` | New — release workflow |

---

## Out of Scope

- Windows code signing (EV certificate — add later if SmartScreen warnings become a blocker)
- Auto-update (Squirrel/electron-updater — separate feature)
- Linux builds
- `requirements-dev.txt` split (test dep cleanup — follow-up)
