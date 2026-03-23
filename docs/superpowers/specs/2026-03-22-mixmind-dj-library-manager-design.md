# MixMind — DJ Library Manager & AI Set Builder
**Design Spec v2** | 2026-03-22 | beatmind.io additional product

---

## Overview

MixMind is a macOS desktop application (distributed as a DMG) that gives DJs AI-powered control over their Rekordbox library. It lives under the beatmind.io brand as a second product alongside BeatMind (the Ableton AI tool).

**Core problems it solves:**
- Rekordbox's built-in playlist builder is manual and tedious
- Duplicate tracks accumulate over time and waste USB space
- DJs can't ask "build me a set that flows" without knowing every track by heart
- USB export is buried inside Rekordbox

---

## Product

| Attribute | Value |
|-----------|-------|
| Name | MixMind |
| URL | beatmind.io/mixmind |
| Platform | macOS DMG |
| Price | Separate subscription tier on beatmind.io |
| Auth | Same beatmind.io backend — new subscription plan, same JWT |
| AI Model | Claude Haiku (`claude-haiku-4-5-20251001`) |

---

## Architecture

```
MixMind.app (DMG)
├── Electron shell
│   └── React frontend (3-panel layout)
│       ├── Left nav    — Library, Playlists, Duplicates, USB Ready
│       ├── Main panel  — Track table (6 columns, filterable, sortable)
│       └── Right panel — AI chat sidebar
│
└── Python sidecar (PyInstaller --onedir bundle)
    ├── Location: MixMind.app/Contents/Resources/sidecar/
    ├── Signed with hardened runtime entitlement (same Team ID PRKZ4UVCD7)
    ├── Spawned by Electron main process on app launch
    ├── Killed by Electron on app quit
    └── FastAPI on localhost:8765
        ├── pyrekordbox      — reads Rekordbox library (DB or XML, see below)
        ├── Anthropic SDK    — Claude Haiku for AI playlist generation
        ├── rapidfuzz        — duplicate detection (fuzzy string matching)
        ├── Local state DB   — ~/Library/Application Support/MixMind/state.db (SQLite)
        └── Playlist writer  — writes back to Rekordbox via XML or DB
```

### Communication
- Electron renderer → Python sidecar: HTTP REST at `localhost:8765`
- Electron main ↔ renderer: Electron IPC (context bridge via preload.js)
- Python sidecar → Rekordbox: pyrekordbox (see Library Access below)
- Python sidecar → Claude API: Anthropic SDK (streaming via SSE)
- Python sidecar → beatmind.io: JWT auth check on launch
- Local state: `~/Library/Application Support/MixMind/state.db` (SQLite, managed by sidecar)

---

## Library Access Strategy (Anti-Hallucination Critical)

Rekordbox 6.x encrypts `master.db` with SQLCipher 4. pyrekordbox handles decryption automatically **for Rekordbox versions below 6.6.5**. From version 6.6.5 onward, Pioneer obfuscated the key extraction path; pyrekordbox cannot reliably auto-unlock on these versions.

### Primary path: direct DB read
- Path: `~/Library/Pioneer/rekordbox/master.db`
- Via: `pyrekordbox.Rekordbox6()` (handles SQLCipher decryption for pre-6.6.5)
- On success: use directly

### Fallback path: Rekordbox XML export
- If DB unlock fails (6.6.5+): prompt user to export XML from Rekordbox
- Instructions: Rekordbox → File → Export Collection in xml format → save to known location
- Path: user-selected via file picker dialog
- Via: `pyrekordbox.RekordboxXml()`
- Works on ALL Rekordbox versions — no encryption involved

### Onboarding flow
```
App launch
  → Try load master.db via pyrekordbox
    → Success: load library
    → Fail (encryption/not found):
        Show onboarding: "MixMind needs your Rekordbox library.
        Export it from Rekordbox: File → Export Collection in xml format"
        → User picks XML file → load library
        → Offer: "Next time, keep Rekordbox below 6.6.5 for direct sync"
```

---

## Verified Database Schema (pyrekordbox / Rekordbox 6.x)

**Source: pyrekordbox documentation + GitHub dylanljones/pyrekordbox**

| Table | Purpose |
|-------|---------|
| `djmdContent` | All tracks (title, artist, BPM, key, length, etc.) |
| `djmdCue` | Hot cues and memory cues per track |
| `djmdPlaylist` | Playlist metadata (name, parent folder) |
| `djmdSongPlaylist` | Track membership in playlists |

**Key columns in `djmdContent`** (verified names — do NOT rename):
- `Title` — track title string
- `ArtistID` — foreign key to artist table
- `BPM` — stored as integer × 100 (e.g., 128.00 BPM = 12800)
- `Tonality` — musical key as integer (Rekordbox internal encoding, see Camelot mapping below)
- `Length` — duration in seconds (integer)
- `Rating` — user rating 0–5 stars (integer, 0 = unrated)
- `ColorID` — track colour label (integer, maps to colour)

**Note: Energy Level does NOT exist** as a native Rekordbox column. It is available only if the user has Mixed In Key installed and imported energy tags via `djmdMyTag`. This feature is removed from MVP.

**`djmdCue` columns:**
- `ContentID` — foreign key to `djmdContent`
- `InMsec` — cue start position in milliseconds
- `Kind` — 0 = memory cue, 1 = hot cue
- `Color` — cue colour (maps to Rekordbox hot cue colours: red, orange, yellow, green, aqua, blue, purple, pink)

---

## UI Layout

**3-panel layout (fixed):**

```
┌─────────────┬──────────────────────────────────┬────────────────┐
│  Left Nav   │         Main Panel               │   AI Sidebar   │
│  (120px)    │      (track table)               │   (240px)      │
│             │                                  │                │
│ 📚 Library  │  [Search] [BPM▾] [Key▾] [★▾]    │  Chat history  │
│ 🎵 Playlists│                                  │                │
│ 🔍 Dupes(3) │  TITLE  BPM  KEY  CAM  CUES  ★  LEN             │
│ 💾 USB Ready│  ─────────────────────────────   │  [Ask AI...]   │
│             │  Track row × N                   │  [Send →]      │
│ ● USB: name │                                  │                │
└─────────────┴──────────────────────────────────┴────────────────┘
```

---

## Track Table Columns (6 columns, Energy removed)

| # | Column | Source | Display |
|---|--------|--------|---------|
| 1 | Title / Artist | `djmdContent.Title` + artist join | Two lines: title bold, artist muted |
| 2 | BPM | `djmdContent.BPM ÷ 100` | Green, 2 decimal places (e.g. 128.00) |
| 3 | Key | `djmdContent.Tonality` decoded | Musical notation (Am, F#m, Bb) |
| 4 | Camelot | Derived from Key via mapping table | Badge (8A, 4A, 10B) — green bg |
| 5 | Cue Points | `djmdCue` rows for this track | Coloured dots (matching Rekordbox colours) |
| 6 | Rating | `djmdContent.Rating` | Star icons 0–5 (★★★☆☆) |
| 7 | Length | `djmdContent.Length` seconds | Formatted m:ss |

All columns sortable (click header). BPM, Key, Camelot, Rating filterable via filter chips.

---

## Camelot Wheel Mapping (Verified)

Derived from `djmdContent.Tonality` (Rekordbox integer key) → musical key string → Camelot code.

**Musical Key → Camelot mapping (complete):**

| Musical Key | Camelot | Musical Key | Camelot |
|-------------|---------|-------------|---------|
| C Major | 8B | A Minor | 8A |
| G Major | 9B | E Minor | 9A |
| D Major | 10B | B Minor | 10A |
| A Major | 11B | F# Minor | 11A |
| E Major | 12B | C# Minor | 12A |
| B Major | 1B | G# Minor | 1A |
| F# Major | 2B | D# Minor | 2A |
| C# Major | 3B | A# Minor | 3A |
| G# Major | 4B | F Minor | 4A |
| D# Major | 5B | C Minor | 5A |
| A# Major | 6B | G Minor | 6A |
| F Major | 7B | D Minor | 7A |

**NOTE:** The mapping from `Tonality` integer → musical key string must be verified against pyrekordbox source code during implementation. Do NOT hardcode the integer values without checking `pyrekordbox.utils` or equivalent.

---

## Features

### 1. Library Browser
- Load full Rekordbox library on startup (direct DB or XML fallback)
- Display all tracks with 7 columns
- Live search: title + artist, case-insensitive, debounced 300ms
- Filter chips: BPM range (slider), Key (dropdown), Camelot (wheel picker), Rating (min stars)
- Sort by any column (click header, toggle asc/desc)
- Virtual scroll for libraries with 5,000+ tracks (react-virtual or equivalent)

### 2. AI Chat Sidebar (Claude Haiku)
- Input: free-form natural language
- System prompt includes: full track list serialized as compact CSV
  - Format per track: `{title}|{artist}|{bpm}|{camelot}|{rating}|{duration_secs}`
  - Token budget: up to 1,500 tracks × ~20 tokens/track ≈ 30,000 tokens
  - If library > 1,500 tracks: sort by Rating desc, take top 1,500
  - Remaining tracks available via tool call if AI requests by BPM/key range
- Claude returns: ordered playlist JSON `[{title, artist, reason}]`
- Result creates a new playlist in the Playlists panel (pending user confirmation)
- Streaming response via SSE (`/api/chat/stream`)
- AI cannot modify the database — suggests only; user confirms

**Example prompts:**
- "Build a 2hr dark techno opening set, start 128 BPM, build to 136"
- "What tracks work after Subzero by Adam Beyer key-wise?"
- "Make a warm-up set, 90 min, starting at 118 BPM"
- "Find everything in 4A or 5A under 132 BPM with at least 3 stars"

### 3. Duplicate Finder
- Algorithm (both conditions required):
  1. `rapidfuzz.fuzz.token_sort_ratio(title+artist, title+artist) >= 85`
  2. `abs(duration_a - duration_b) <= 5` seconds
- Runs as background job on library load (non-blocking)
- Nav badge shows count (e.g. "🔍 Dupes (3)")
- UI: pairs shown side-by-side with full metadata
- Actions per pair: Keep Left | Keep Right | Keep Both | Skip
- "Keep" = mark the other as hidden in MixMind's local state.db (NOT deleted from Rekordbox)
- Hidden tracks disappear from Library and AI context; recoverable in Settings → Hidden Tracks
- Manual re-scan button

### 4. Playlist Manager
- Lists Rekordbox playlists (from `djmdPlaylist` + `djmdSongPlaylist`) and AI-generated ones
- Create new playlist manually (drag tracks from library)
- Rename, delete, reorder tracks within playlist
- Shows total duration (sum of `djmdContent.Length`) and track count
- **"Save to Rekordbox"**: writes playlist to `djmdPlaylist` + `djmdSongPlaylist` in master.db
  - Requires Rekordbox to be closed (check via `pgrep -x rekordbox`)
  - If running: modal "Close Rekordbox first, then save"
  - Insert row in `djmdPlaylist` with Name, ParentID (root), UUID
  - Insert rows in `djmdSongPlaylist` with PlaylistID, ContentID, TrackNo
  - NOTE: Exact insert syntax must be verified against pyrekordbox write API before implementation
- **"Export to XML"**: writes playlist to Rekordbox XML format via `pyrekordbox.RekordboxXml`

### 5. USB Ready Panel
**Scope adjustment from original design:** pyrekordbox does NOT support writing Pioneer USB `.pdb` format. USB export is therefore a 2-step assisted flow:

**Step 1 — Prepare in Rekordbox (MixMind does this):**
- Save playlist to `master.db` via "Save to Rekordbox" (see above)

**Step 2 — Export to USB (DJ does this in Rekordbox):**
- MixMind shows: "Your playlist '{name}' is ready in Rekordbox. Connect your USB and export from Rekordbox → Preferences → Sync Manager."
- One-click "Open Rekordbox" button (`open -a rekordbox`)
- Optional: if Pioneer USB is detected at `/Volumes/*/PIONEER/`, show confirmation it was successfully exported after user returns

**USB detection (read-only):**
- Poll `/Volumes/` for directories containing `/PIONEER/` subfolder
- Display detected USB name and size in left nav footer
- Show "No USB detected" when none mounted

---

## Local State Database

`~/Library/Application Support/MixMind/state.db` (SQLite, managed by sidecar)

```sql
-- Tracks hidden by duplicate resolution
CREATE TABLE hidden_tracks (
    content_id TEXT PRIMARY KEY,  -- stored as TEXT regardless of source (DB=integer→cast to TEXT, XML=string)
    source     TEXT,              -- 'db' or 'xml' — must match library_cache.source for joins
    hidden_at  TEXT,              -- ISO8601 timestamp
    reason     TEXT               -- 'duplicate'
);

-- Cached library snapshot (avoids re-parsing DB/XML on every launch)
-- IMPORTANT: content_id is stored as TEXT in all cases.
-- DB path: djmdContent integer ID → cast to TEXT (e.g. "12345")
-- XML path: XML string ID stored as-is
-- The 'source' column records which path was used so playlist writes
-- use the matching ID type. Never mix IDs from DB and XML sources.
CREATE TABLE library_cache (
    content_id   TEXT PRIMARY KEY,
    source       TEXT,            -- 'db' or 'xml'
    title        TEXT,
    artist       TEXT,
    bpm          REAL,
    key_musical  TEXT,
    camelot      TEXT,
    rating       INTEGER,
    duration_sec INTEGER,
    cue_count    INTEGER,
    cue_colors   TEXT,   -- JSON array of color strings
    updated_at   TEXT
);

-- User preferences
CREATE TABLE preferences (
    key   TEXT PRIMARY KEY,
    value TEXT
);
```

---

## Auth Flow

### New endpoint required on beatmind.io backend
`GET /api/auth/me` (may already exist) or `POST /api/auth/verify`

**If endpoint doesn't exist:** add to BeatMind FastAPI backend as part of this project.

```python
# Request
Authorization: Bearer {jwt}

# Response 200
{
  "user_id": "...",
  "email": "...",
  "subscriptions": ["beatmind", "mixmind"]  # list of active products
}

# Response 401: invalid/expired JWT
# Response 403: valid JWT but no mixmind subscription
```

### First-run login flow (Electron)
1. Check Keychain for stored JWT (`security find-generic-password -s mixmind-jwt`)
2. If found: call `/api/auth/verify`, proceed if 200 + `"mixmind"` in subscriptions
3. If not found or 401: open `https://beatmind.io/mixmind/login?app=1` in system browser
4. beatmind.io login page redirects to deep link: `mixmind://auth?token={jwt}`
5. Electron receives deep link, stores JWT in Keychain, proceeds to app

**macOS deep link registration (both required — omitting either silently breaks the flow):**
- `electron/main.js`: call `app.setAsDefaultProtocolClient('mixmind')` before `app.whenReady()`
- `electron/package.json` (electron-builder `extendInfo`):
  ```json
  "extendInfo": {
    "CFBundleURLTypes": [{
      "CFBundleURLSchemes": ["mixmind"],
      "CFBundleURLName": "io.beatmind.mixmind"
    }]
  }
  ```
- Handle in `main.js`: `app.on('open-url', (event, url) => { /* extract token from url */ })`
- On macOS, `setAsDefaultProtocolClient` alone does NOT work — `CFBundleURLTypes` in Info.plist is required for the OS to register the scheme. Both must be present.

### Offline mode
- If auth check fails due to network: allow library browsing + duplicate scan
- Disable AI chat features (require internet)
- Show banner: "Offline — AI features unavailable"
- Re-check every 60 seconds silently

---

## Rekordbox Open Detection

Before any write to `master.db`:

```python
import subprocess
result = subprocess.run(["pgrep", "-x", "rekordbox"], capture_output=True)
if result.returncode == 0:
    raise RekordboxOpenError("Rekordbox is open. Close it before saving changes.")
```

Read operations (library load, AI chat, duplicate scan) are safe while Rekordbox is open.

---

## Sidecar Startup

Electron main process startup sequence (two phases — port discovery first, then health poll):

**Phase 1 — Port discovery:**
1. Delete `~/.mixmind-port` if it exists (stale from previous run)
2. Spawn sidecar: `spawn(path_to_sidecar, [], { detached: false })`
3. Sidecar scans 8765–8775 for a free port, binds FastAPI to it, then writes the chosen port to `~/.mixmind-port`
4. Electron polls for `~/.mixmind-port` to appear, every 200ms, up to 5 seconds
5. If file never appears after 5s: show error dialog "MixMind failed to start (port discovery). Please reinstall."
6. Read port from `~/.mixmind-port`

**Phase 2 — Health check:**
7. Poll `GET localhost:{port}/health` every 500ms
8. Timeout: 25 seconds. If no 200 after 25s: show error dialog "MixMind backend failed to start. Please reinstall."
9. While waiting: show splash screen "Starting MixMind..."
10. On 200: hide splash, show main window
11. On sidecar exit unexpectedly mid-session: show "Reconnecting..." toast, attempt one restart (full sequence above)

---

## Packaging

| Step | Tool | Notes |
|------|------|-------|
| Python sidecar build | `PyInstaller --onedir` | NOT `--onefile` — uvicorn multiprocessing requires `--onedir` |
| Sidecar signing | `codesign --options runtime` | Hardened runtime entitlement required; sign BEFORE bundling into .app |
| macOS app | `electron-builder` | Bundles sidecar into `Contents/Resources/sidecar/` |
| DMG | `electron-builder` | `.dmg` with background image |
| App signing | `codesign` with `PRKZ4UVCD7` cert | Entire `.app` signed after bundling |
| Notarization | `notarytool` with key `9K626GB728` | Submits to Apple, waits for approval, staples ticket |

**Port conflict handling:** If 8765 is taken, sidecar scans 8765–8775 for a free port. Sidecar writes chosen port to `~/.mixmind-port`. Electron reads that file after health check succeeds.

---

## Error Handling

| Scenario | Handling |
|----------|---------|
| Rekordbox not installed / master.db not found | Onboarding: XML export instructions |
| Rekordbox 6.6.5+ DB encryption blocks access | Onboarding: XML export fallback |
| Rekordbox open on write attempt | Modal warning, no write attempted |
| Claude API unavailable | Toast "AI features offline. Check connection." |
| JWT expired | Silent re-auth; if fails, open beatmind.io login in browser |
| USB removed mid-operation | No write attempted (USB panel is read-only in MVP) |
| Sidecar fails to start (30s timeout) | Error dialog + reinstall link |
| Sidecar crashes mid-session | "Reconnecting..." toast, one restart attempt |
| Library > 1,500 tracks for AI context | Top 1,500 by rating, notice shown in chat: "Using your top-rated tracks as context" |
| Port 8765–8775 all occupied | Error dialog "Cannot start MixMind backend" |

---

## Out of Scope (MVP)

- Windows / Linux support
- Direct Pioneer USB `.pdb` write (not supported by pyrekordbox)
- Waveform editor or audio playback
- Hot cue editing (display only)
- BPM re-analysis
- Key detection
- Energy level (not a native Rekordbox field)
- Serato / Traktor support
- Offline AI
- Multi-user / cloud sync
- Auto-update (manual DMG re-download for MVP)

---

## File Structure

```
apps/mixmind/
├── electron/
│   ├── main.js          — App entry, sidecar spawn, deep link handler, window management
│   ├── preload.js       — Context bridge (IPC: renderer ↔ main)
│   └── package.json     — Electron + electron-builder config, mixmind:// protocol
│
├── frontend/            — React app (loaded by Electron)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── LeftNav.tsx
│   │   │   ├── TrackTable.tsx          — Virtual scroll, 7 columns
│   │   │   ├── AIChatSidebar.tsx       — SSE streaming chat
│   │   │   ├── PlaylistPanel.tsx
│   │   │   ├── DuplicateFinder.tsx
│   │   │   └── USBReadyPanel.tsx
│   │   ├── hooks/
│   │   │   ├── useSidecar.ts           — HTTP client for localhost:{port}
│   │   │   └── useAuth.ts              — JWT Keychain + deep link handling
│   │   └── types/
│   │       └── track.ts
│   └── package.json
│
└── sidecar/             — Python FastAPI backend
    ├── main.py          — FastAPI app, routes, CORS, health endpoint
    ├── rekordbox.py     — pyrekordbox wrapper (DB + XML, library read/write)
    ├── ai.py            — Claude Haiku streaming (playlist generation, Q&A)
    ├── duplicates.py    — rapidfuzz duplicate detection
    ├── usb.py           — /Volumes/ polling for Pioneer USB drives
    ├── auth.py          — beatmind.io JWT verification
    ├── state.py         — local state.db (hidden tracks, cache, prefs)
    ├── requirements.txt
    └── build.sh         — PyInstaller --onedir build + codesign sidecar
```

---

## Verified Dependencies

| Package | Purpose | Version Note |
|---------|---------|-------------|
| `pyrekordbox` | Rekordbox DB + XML read/write | Verify USB write NOT supported (confirmed); use XML for write-back |
| `anthropic` | Claude Haiku API | Same as BeatMind (`claude-haiku-4-5-20251001`) |
| `rapidfuzz` | Fuzzy string matching for duplicates | Standard, no caveats |
| `fastapi` + `uvicorn` | Python HTTP server | Same as Dollor/BeatMind |
| `sqlalchemy` | Local state.db | Same as Dollor backend |
| `electron` | macOS desktop shell | v28+ for hardened runtime + deep links |
| `electron-builder` | DMG packaging + code signing | v24+ |
| `PyInstaller` | Python → binary (`--onedir`) | NOT `--onefile` (uvicorn incompatible) |
| `react-virtual` or `@tanstack/virtual` | Virtual scroll for large libraries | — |

---

## beatmind.io Backend Changes Required

This project requires one addition to the existing BeatMind FastAPI backend:

1. **New endpoint**: `GET /api/auth/verify` — verify JWT + return active subscriptions list
2. **New subscription type**: `"mixmind"` in the subscriptions/plan model
3. **Deep link redirect**: `beatmind.io/mixmind/login?app=1` page that redirects to `mixmind://auth?token={jwt}` after login

These are small additions to `apps/ableton-chatbot/backend/main.py`.
