# MixMind Phase 5 — Packaging, Signing & DMG

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Prerequisite:** Phases 1–4 complete — sidecar binary built, Electron app loading React frontend end-to-end.

**Goal:** Package MixMind as a signed, notarized macOS DMG ready for distribution. Sidecar binary is individually signed before bundling into the `.app`. The DMG is notarized with Apple Notary Service.

**Architecture:** PyInstaller `--onedir` binary → `codesign` (hardened runtime) → electron-builder bundles into `MixMind.app` → `codesign` whole `.app` → `notarytool` submits to Apple → staple ticket → create DMG.

**Tech Stack:** PyInstaller, electron-builder, `codesign`, `notarytool` (Xcode 13+), Team ID `PRKZ4UVCD7`, API Key `9K626GB728`

---

## Chunk 1: Sidecar signing + DMG build

### Task 1: Sign Python sidecar binary

- [ ] **Step 1.1: Verify signing identity is available**

```bash
security find-identity -v -p codesigning | grep "PRKZ4UVCD7"
```

Expected: one or more lines with `Developer ID Application: Zietra Technologies inc (PRKZ4UVCD7)`.
If none: open Xcode → Preferences → Accounts → download certificates.

- [ ] **Step 1.2: Build sidecar binary (clean)**

```bash
cd apps/mixmind/sidecar
source venv/bin/activate
./build.sh
```

Expected: `dist/mixmind-sidecar/` directory exists.

- [ ] **Step 1.3: Sign all binaries inside the sidecar dist directory**

Sign all executables and dylibs inside the `--onedir` bundle. Sign deepest first:

```bash
SIDECAR_DIR="apps/mixmind/sidecar/dist/mixmind-sidecar"
IDENTITY="Developer ID Application: Zietra Technologies inc (PRKZ4UVCD7)"
ENTITLEMENTS="apps/mixmind/electron/entitlements.plist"

# Sign all .dylib and .so files first
find "$SIDECAR_DIR" -name "*.dylib" -o -name "*.so" | while read f; do
  codesign --force --verify --verbose \
    --sign "$IDENTITY" \
    --options runtime \
    --entitlements "$ENTITLEMENTS" \
    "$f"
done

# Sign the main binary
codesign --force --verify --verbose \
  --sign "$IDENTITY" \
  --options runtime \
  --entitlements "$ENTITLEMENTS" \
  "$SIDECAR_DIR/mixmind-sidecar"

echo "Sidecar signing complete"
```

- [ ] **Step 1.4: Verify sidecar signature**

```bash
codesign --verify --verbose=4 apps/mixmind/sidecar/dist/mixmind-sidecar/mixmind-sidecar
```

Expected: `valid on disk`, `satisfies its Designated Requirement`

- [ ] **Step 1.5: Commit build script update (add signing step to build.sh)**

Update `apps/mixmind/sidecar/build.sh` to include the codesign step after PyInstaller:

```bash
# After PyInstaller block, add:
echo "Signing sidecar binary..."
IDENTITY="Developer ID Application: Zietra Technologies inc (PRKZ4UVCD7)"
ENTITLEMENTS="$(dirname "$0")/../electron/entitlements.plist"
SIDECAR_DIR="dist/mixmind-sidecar"

find "$SIDECAR_DIR" \( -name "*.dylib" -o -name "*.so" \) | while read f; do
  codesign --force --sign "$IDENTITY" --options runtime --entitlements "$ENTITLEMENTS" "$f" 2>/dev/null
done

codesign --force --verify --sign "$IDENTITY" --options runtime --entitlements "$ENTITLEMENTS" \
  "$SIDECAR_DIR/mixmind-sidecar"

echo "Sidecar signed."
```

```bash
git add apps/mixmind/sidecar/build.sh
git commit -m "feat(mixmind): add codesign step to sidecar build.sh (hardened runtime)"
```

---

### Task 2: Build and sign the Electron DMG

- [ ] **Step 2.1: Build React frontend for production**

```bash
cd apps/mixmind/frontend
npm run build
```

Expected: `build/` directory with `index.html` and hashed JS bundles.

- [ ] **Step 2.2: Create assets directory with icon**

```bash
mkdir -p apps/mixmind/electron/assets
```

**IMPORTANT: electron-builder on macOS requires `.icns` format** — the `dmg.icon` in `package.json` points to `assets/icon.icns`. A `.png` copy will NOT satisfy it and will produce a warning or default icon.

To create an `.icns` from a 1024×1024 PNG:
```bash
# If you have a PNG source:
mkdir icon.iconset
sips -z 1024 1024 your_icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o apps/mixmind/electron/assets/icon.icns
rm -r icon.iconset
```

If no icon is ready yet, use the BeatMind icon as a placeholder (replace before release):
```bash
# Only works if an .icns already exists in the BeatMind electron assets:
cp apps/ableton-chatbot/electron/assets/icon.icns apps/mixmind/electron/assets/icon.icns 2>/dev/null || \
  echo "Create icon.icns manually before building DMG — see sips/iconutil steps above."
```

- [ ] **Step 2.3: Run electron-builder**

```bash
cd apps/mixmind/electron
npx electron-builder --mac --dir
```

This creates `dist/mac/MixMind.app` (unsigned, for testing).

- [ ] **Step 2.4: Test unsigned app locally**

```bash
open dist/mac/MixMind.app
```

Expected: app launches, splash screen appears, sidecar starts (check `~/.mixmind-port` created), main window loads.

If app refuses to open: `xattr -cr dist/mac/MixMind.app` to clear quarantine for local testing.

- [ ] **Step 2.5: Build signed + notarized DMG**

```bash
cd apps/mixmind/electron

# Set env vars for notarization
export APPLE_API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8"
export APPLE_API_KEY="9K626GB728"
export APPLE_API_ISSUER="80d10e49-f379-462f-9668-5ea53016812e"

npx electron-builder --mac --publish=never
```

electron-builder will:
1. Build `MixMind.app`
2. Sign with Team ID `PRKZ4UVCD7` (auto-detected from `mac.identity` in package.json)
3. Submit to Apple Notary Service (uses `notarytool` via API key)
4. Wait for notarization approval (typically 2–5 minutes)
5. Staple notarization ticket
6. Create `dist/MixMind-1.0.0.dmg`

Expected final output: `apps/mixmind/electron/dist/MixMind-1.0.0.dmg`

- [ ] **Step 2.6: Verify DMG**

```bash
# Mount and inspect
hdiutil attach apps/mixmind/electron/dist/MixMind-1.0.0.dmg

# Check Gatekeeper
spctl -a -vvv /Volumes/MixMind/MixMind.app
```

Expected: `accepted` from Gatekeeper assessment.

```bash
# Unmount
hdiutil detach /Volumes/MixMind
```

- [ ] **Step 2.7: Test DMG install**

1. Double-click `MixMind-1.0.0.dmg`
2. Drag `MixMind.app` to `/Applications`
3. Open from `/Applications/MixMind.app`
4. Expected: app launches without Gatekeeper warning, splash screen, sidecar starts, main window appears

- [ ] **Step 2.8: Commit packaging artifacts (not the DMG — add to .gitignore)**

```bash
# Add DMG and build artifacts to .gitignore
echo "apps/mixmind/electron/dist/" >> .gitignore
echo "apps/mixmind/sidecar/dist/" >> .gitignore
echo "apps/mixmind/sidecar/build/" >> .gitignore
echo "apps/mixmind/frontend/build/" >> .gitignore

git add .gitignore
git commit -m "chore(mixmind): add build output directories to .gitignore"
```

---

### Task 3: End-to-end smoke test

- [ ] **Step 3.1: Smoke test checklist**

Install from DMG and verify each item:

```
[ ] App launches without Gatekeeper warning
[ ] Splash screen appears during startup (<10s)
[ ] ~/.mixmind-port created with valid port number
[ ] /health endpoint responds: curl http://localhost:$(cat ~/.mixmind-port)/health
[ ] Left nav shows: Library, Playlists, Duplicates, USB Ready
[ ] Library panel shows "No Rekordbox library found" when no XML at default path
[ ] AI sidebar renders and shows placeholder text
[ ] "Ask AI" with ANTHROPIC_API_KEY set responds (even with empty library)
[ ] Duplicates "Scan Library" returns empty array (or pairs if XML loaded)
[ ] USB panel shows connection status
[ ] App quits cleanly (no zombie sidecar process after quit)
```

Verify sidecar cleanup on quit:
```bash
open /Applications/MixMind.app
sleep 5
PORT=$(cat ~/.mixmind-port)
curl http://localhost:$PORT/health  # should return 200

# Quit the app
osascript -e 'tell application "MixMind" to quit'
sleep 2
curl http://localhost:$PORT/health  # should FAIL — sidecar killed
```

Expected: second curl fails with `Connection refused`.

- [ ] **Step 3.2: Test with real Rekordbox XML**

If Rekordbox is installed:
1. Open Rekordbox → File → Export Collection in xml format
2. Save to `~/Library/Music/rekordbox/rekordbox.xml`
3. Reload MixMind library
4. Expected: tracks appear in table with BPM, Key, Camelot, Rating, Length columns

- [ ] **Step 3.3: Commit final smoke test notes**

```bash
git add .
git commit -m "feat(mixmind): Phase 5 complete — signed notarized DMG, smoke test passing"
```

---

## Build Order Summary

For a clean full build from scratch:

```bash
# 1. Build Python sidecar
cd apps/mixmind/sidecar
source venv/bin/activate
./build.sh   # builds + signs dist/mixmind-sidecar/

# 2. Build React frontend
cd ../frontend
npm install
npm run build   # outputs build/

# 3. Build Electron DMG
cd ../electron
npm install
export APPLE_API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8"
export APPLE_API_KEY="9K626GB728"
export APPLE_API_ISSUER="80d10e49-f379-462f-9668-5ea53016812e"
npx electron-builder --mac --publish=never
# Output: dist/MixMind-1.0.0.dmg
```
