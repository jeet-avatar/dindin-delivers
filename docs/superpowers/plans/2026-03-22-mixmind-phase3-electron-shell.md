# MixMind Phase 3 — Electron Shell + Auth

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Prerequisite:** Phase 1 + 2 complete — sidecar binary built and passing all tests.

**Goal:** Build the Electron macOS desktop app shell: spawns the Python sidecar, handles the two-phase startup (port discovery + health check), registers the `mixmind://` deep link protocol for auth, and displays a splash screen while the sidecar boots.

**Architecture:** Electron main process spawns the PyInstaller sidecar binary, polls `~/.mixmind-port` then `/health`, then loads the React frontend. Deep link `mixmind://auth?token=JWT` is handled in main process — token stored in macOS Keychain via `security` CLI.

**Tech Stack:** Electron 28+, electron-builder, Node.js

---

## Chunk 1: Electron scaffold + sidecar spawn

### File Structure
```
apps/mixmind/electron/
├── package.json        — Electron deps, electron-builder config, mixmind:// extendInfo
├── main.js             — App entry, sidecar spawn, port discovery, health check, window
├── preload.js          — Context bridge (exposes sidecar port + keychain to renderer)
└── splash.html         — Startup splash screen ("Starting MixMind...")
```

---

### Task 1: Electron scaffold

**Files:**
- Create: `apps/mixmind/electron/package.json`
- Create: `apps/mixmind/electron/splash.html`

- [ ] **Step 1.1: Create package.json**

```json
{
  "name": "mixmind",
  "version": "1.0.0",
  "description": "MixMind — DJ Library Manager by beatmind.io",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder --mac --dir",
    "dist": "electron-builder --mac --publish=never"
  },
  "build": {
    "appId": "io.beatmind.mixmind",
    "productName": "MixMind",
    "mac": {
      "category": "public.app-category.music",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "entitlements.plist",
      "entitlementsInherit": "entitlements.plist",
      "identity": "PRKZ4UVCD7"
    },
    "dmg": {
      "title": "MixMind",
      "icon": "assets/icon.icns"
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
    ],
    "extendInfo": {
      "CFBundleURLTypes": [
        {
          "CFBundleURLSchemes": ["mixmind"],
          "CFBundleURLName": "io.beatmind.mixmind"
        }
      ]
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

- [ ] **Step 1.2: Install dependencies**

```bash
cd apps/mixmind/electron
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 1.3: Create splash.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f0f0f;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    h1 { font-size: 32px; font-weight: 700; color: #a78bfa; margin-bottom: 8px; }
    p  { font-size: 14px; color: #9ca3af; }
    .dot { animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
  </style>
</head>
<body>
  <h1>MixMind</h1>
  <p>Starting<span class="dot">...</span></p>
</body>
</html>
```

- [ ] **Step 1.4: Commit**

```bash
git add apps/mixmind/electron/
git commit -m "feat(mixmind): Electron scaffold with package.json and splash screen"
```

---

### Task 2: main.js — sidecar spawn + two-phase startup

**Files:**
- Create: `apps/mixmind/electron/main.js`

- [ ] **Step 2.1: Implement main.js**

```javascript
/**
 * MixMind Electron main process.
 *
 * Startup sequence:
 *   Phase 1 — Port discovery: poll ~/.mixmind-port every 200ms (5s timeout)
 *   Phase 2 — Health check: poll localhost:{port}/health every 500ms (25s timeout)
 *   Then: show main window with React frontend
 *
 * Deep link: mixmind://auth?token=JWT
 *   Requires CFBundleURLTypes in package.json extendInfo (already set).
 *   setAsDefaultProtocolClient called before app.whenReady().
 */

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const http = require('http');

// Register mixmind:// URL scheme BEFORE app.whenReady()
// Both this call AND CFBundleURLTypes in package.json extendInfo are required on macOS.
app.setAsDefaultProtocolClient('mixmind');

const PORT_FILE = path.join(os.homedir(), '.mixmind-port');
const SIDECAR_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'sidecar', 'mixmind-sidecar')
  : path.join(__dirname, '..', 'sidecar', 'dist', 'mixmind-sidecar', 'mixmind-sidecar');

let sidecarProcess = null;
let mainWindow = null;
let splashWindow = null;
let sidecarPort = null;

// ── Sidecar management ────────────────────────────────────────────────────────

function deleteStalePortFile() {
  try { fs.unlinkSync(PORT_FILE); } catch (_) {}
}

function spawnSidecar() {
  if (!fs.existsSync(SIDECAR_PATH)) {
    console.error(`Sidecar binary not found at: ${SIDECAR_PATH}`);
    return null;
  }
  const proc = spawn(SIDECAR_PATH, [], {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', d => console.log('[sidecar]', d.toString().trim()));
  proc.stderr.on('data', d => console.error('[sidecar]', d.toString().trim()));
  proc.on('exit', code => {
    console.log(`Sidecar exited with code ${code}`);
    sidecarProcess = null;
  });
  return proc;
}

// ── Phase 1: Port discovery ───────────────────────────────────────────────────

function waitForPortFile(timeoutMs = 5000, intervalMs = 200) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (fs.existsSync(PORT_FILE)) {
        clearInterval(timer);
        const port = parseInt(fs.readFileSync(PORT_FILE, 'utf8').trim(), 10);
        if (isNaN(port)) return reject(new Error('Invalid port in ~/.mixmind-port'));
        resolve(port);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Port discovery timed out (5s) — sidecar did not write ~/.mixmind-port'));
      }
    }, intervalMs);
  });
}

// ── Phase 2: Health check ─────────────────────────────────────────────────────

function pollHealth(port, timeoutMs = 25000, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const req = http.get(`http://127.0.0.1:${port}/health`, res => {
        if (res.statusCode === 200) {
          clearInterval(timer);
          resolve(port);
        }
      });
      req.on('error', () => {}); // ignore connection refused during startup
      req.end();

      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Health check timed out (25s) on port ${port}`));
      }
    }, intervalMs);
  });
}

// ── Windows ───────────────────────────────────────────────────────────────────

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400, height: 300,
    frame: false, transparent: true,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 900, minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // In production, load built React app; in dev, load from React dev server
  const frontendPath = app.isPackaged
    ? path.join(__dirname, '..', 'frontend', 'build', 'index.html')
    : 'http://localhost:3000';

  if (app.isPackaged) {
    mainWindow.loadFile(frontendPath);
  } else {
    mainWindow.loadURL(frontendPath);
  }

  // Pass sidecar port to renderer via IPC
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('sidecar-port', port);
  });
}

// ── Deep link handler ─────────────────────────────────────────────────────────

function handleDeepLink(url) {
  // url = mixmind://auth?token=JWT
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'auth') {
      const token = parsed.searchParams.get('token');
      if (token) {
        storeJWTInKeychain(token);
        if (mainWindow) {
          mainWindow.webContents.send('auth-token', token);
        }
      }
    }
  } catch (e) {
    console.error('Deep link parse error:', e);
  }
}

// macOS: app:// links arrive via 'open-url' event
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// ── Keychain helpers (macOS `security` CLI) ───────────────────────────────────

const { execSync } = require('child_process');

function storeJWTInKeychain(token) {
  try {
    execSync(
      `security add-generic-password -s mixmind-jwt -a mixmind -w "${token}" -U`,
      { stdio: 'ignore' }
    );
  } catch (e) {
    console.error('Keychain write failed:', e.message);
  }
}

function loadJWTFromKeychain() {
  try {
    return execSync(
      'security find-generic-password -s mixmind-jwt -w',
      { stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString().trim();
  } catch (_) {
    return null;
  }
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createSplashWindow();

  // Phase 1: spawn sidecar + wait for port file
  deleteStalePortFile();
  sidecarProcess = spawnSidecar();

  try {
    sidecarPort = await waitForPortFile();
    console.log(`Sidecar port: ${sidecarPort}`);
  } catch (err) {
    showStartupError('MixMind failed to start (port discovery timeout).\n\nPlease reinstall.');
    return;
  }

  // Phase 2: health check
  try {
    await pollHealth(sidecarPort);
    console.log('Sidecar healthy');
  } catch (err) {
    showStartupError('MixMind backend failed to start.\n\nPlease reinstall.');
    return;
  }

  // Ready — show main window
  createMainWindow(sidecarPort);
  if (splashWindow) { splashWindow.close(); splashWindow = null; }
});

app.on('window-all-closed', () => {
  if (sidecarProcess) sidecarProcess.kill('SIGTERM');
  app.quit();
});

function showStartupError(message) {
  const { dialog } = require('electron');
  dialog.showErrorBox('MixMind', message);
  app.quit();
}
```

- [ ] **Step 2.2: Verify Electron starts (development mode)**

First build the sidecar binary (Phase 1 must be complete):
```bash
cd apps/mixmind/sidecar && ./build.sh
```

Then start Electron:
```bash
cd apps/mixmind/electron
npx electron .
```

Expected: splash screen appears, sidecar binary spawns (check `~/.mixmind-port` is created), health check passes, main window loads (will show blank/error since frontend not built yet — that's fine for Phase 3).

If sidecar binary not found: ensure `apps/mixmind/sidecar/dist/mixmind-sidecar/` exists.

- [ ] **Step 2.3: Commit**

```bash
git add apps/mixmind/electron/main.js
git commit -m "feat(mixmind): Electron main.js — sidecar spawn, two-phase startup, deep link auth"
```

---

### Task 3: preload.js — context bridge

**Files:**
- Create: `apps/mixmind/electron/preload.js`

- [ ] **Step 3.1: Implement preload.js**

```javascript
/**
 * Preload script — exposes safe APIs to the renderer via contextBridge.
 * The renderer can call window.mixmind.* to communicate with the main process.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mixmind', {
  // Called by renderer on boot to get sidecar port
  onSidecarPort: (callback) => ipcRenderer.on('sidecar-port', (_, port) => callback(port)),

  // Called by renderer when auth token arrives via deep link
  onAuthToken: (callback) => ipcRenderer.on('auth-token', (_, token) => callback(token)),

  // Open external URL in system browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
```

Add handlers in main.js (add after `app.whenReady()`):
```javascript
const { ipcMain } = require('electron');
const { spawn } = require('child_process');  // already imported above

ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

// Open Rekordbox via spawn rather than URL scheme (more reliable on macOS)
ipcMain.handle('open-rekordbox', () => {
  spawn('open', ['-a', 'rekordbox'], { detached: true, stdio: 'ignore' });
});
```

- [ ] **Step 3.2: Commit**

```bash
git add apps/mixmind/electron/preload.js
git commit -m "feat(mixmind): preload.js context bridge — sidecar port + auth token + openExternal"
```

---

### Task 4: BeatMind backend — add /api/auth/verify endpoint

> This task modifies the existing BeatMind backend at `apps/ableton-chatbot/backend/main.py`.
> Before modifying, read the current auth flow in that file to understand the JWT model.

**Files:**
- Modify: `apps/ableton-chatbot/backend/main.py`
- Modify: `apps/ableton-chatbot/backend/database.py` (if subscription model needs extending)

- [ ] **Step 4.1: Read current auth code**

```bash
grep -n "jwt\|token\|subscription\|verify" apps/ableton-chatbot/backend/main.py | head -40
grep -n "jwt\|token\|subscription" apps/ableton-chatbot/backend/database.py | head -20
```

Record: what does the JWT payload contain? What does the users table look like? Is there already a subscription column?

- [ ] **Step 4.2: Add subscriptions column if needed**

If the users table has no `subscription` or `plan` column, add one:

In `database.py`, find the User model and add:
```python
subscription = Column(String, default="none")  # 'none', 'beatmind', 'mixmind', 'both'
```

Run any migration needed (SQLite: recreate or ALTER TABLE depending on existing approach).

- [ ] **Step 4.3: Add /api/auth/verify endpoint to main.py**

Find the existing auth section in `main.py` and add:

```python
@app.get("/api/auth/verify")
async def verify_token(authorization: str = Header(...)):
    """
    Verify JWT and return user's active subscriptions.
    Used by MixMind desktop app on launch.

    Response 200: {"user_id": "...", "email": "...", "subscriptions": ["mixmind"]}
    Response 401: invalid or expired token
    Response 403: valid token but no mixmind subscription
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]
    try:
        # Use the same JWT decode as existing auth — verify against JWT_SECRET
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    # NOTE: adjust field names to match actual JWT payload structure in this codebase
    email = payload.get("email", "")

    # Load subscription from DB
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")

    subscriptions = []
    if getattr(db_user, "is_subscribed", False):
        subscriptions.append("beatmind")
    # MixMind subscription check — adjust field name after Step 4.1
    if getattr(db_user, "subscription", "") in ("mixmind", "both"):
        subscriptions.append("mixmind")

    return {
        "user_id": str(user_id),
        "email": email,
        "subscriptions": subscriptions,
    }
```

> **IMPORTANT:** Adjust `JWT_SECRET`, `jwt.decode()` call, `User` model, and field names to match the actual code you found in Step 4.1. Do NOT assume field names.

- [ ] **Step 4.4: Test the endpoint manually**

```bash
cd apps/ableton-chatbot/backend
source venv/bin/activate
JWT_SECRET=test-secret uvicorn main:app --port 8000 &
sleep 2

# Get a valid token first (use existing login endpoint)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/auth/verify
# Expected: {"user_id":"...","email":"...","subscriptions":["beatmind"]}

kill %1
```

- [ ] **Step 4.5: Commit backend change**

```bash
git add apps/ableton-chatbot/backend/main.py apps/ableton-chatbot/backend/database.py
git commit -m "feat(mixmind): add /api/auth/verify endpoint to BeatMind backend"
```

---

### Task 5: Entitlements for code signing

**Files:**
- Create: `apps/mixmind/electron/entitlements.plist`

- [ ] **Step 5.1: Create entitlements.plist**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key><false/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key><false/>
  <key>com.apple.security.cs.disable-library-validation</key><true/>
  <key>com.apple.security.network.client</key><true/>
  <key>com.apple.security.files.user-selected.read-write</key><true/>
  <key>com.apple.security.keychain-access-groups</key>
  <array><string>io.beatmind.mixmind</string></array>
</dict>
</plist>
```

> `cs.disable-library-validation` is required to load the PyInstaller sidecar binary (unsigned third-party dylibs). `keychain-access-groups` allows Keychain JWT storage.

- [ ] **Step 5.2: Commit**

```bash
git add apps/mixmind/electron/entitlements.plist
git commit -m "feat(mixmind): Electron entitlements.plist for hardened runtime + Keychain access"
```
