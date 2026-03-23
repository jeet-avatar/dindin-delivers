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

const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execSync } = require('child_process');
const http = require('http');

// Register mixmind:// URL scheme BEFORE app.whenReady()
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

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// ── Keychain helpers (macOS `security` CLI) ───────────────────────────────────

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

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
ipcMain.handle('open-rekordbox', () => {
  spawn('open', ['-a', 'rekordbox'], { detached: true, stdio: 'ignore' });
});

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createSplashWindow();

  deleteStalePortFile();
  sidecarProcess = spawnSidecar();

  try {
    sidecarPort = await waitForPortFile();
    console.log(`Sidecar port: ${sidecarPort}`);
  } catch (err) {
    dialog.showErrorBox('MixMind', 'MixMind failed to start (port discovery timeout).\n\nPlease reinstall.');
    app.quit();
    return;
  }

  try {
    await pollHealth(sidecarPort);
    console.log('Sidecar healthy');
  } catch (err) {
    dialog.showErrorBox('MixMind', 'MixMind backend failed to start.\n\nPlease reinstall.');
    app.quit();
    return;
  }

  createMainWindow(sidecarPort);
  if (splashWindow) { splashWindow.close(); splashWindow = null; }
});

app.on('window-all-closed', () => {
  if (sidecarProcess) sidecarProcess.kill('SIGTERM');
  app.quit();
});
