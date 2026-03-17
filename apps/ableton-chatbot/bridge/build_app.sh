#!/bin/bash
# Build BeatMind Bridge as a macOS .app
# Requires: pip install pyinstaller

set -e
cd "$(dirname "$0")"

echo "Building BeatMind Bridge.app..."

# Install build deps
pip3 install pyinstaller websockets

# Build .app bundle
pyinstaller \
  --name "BeatMind Bridge" \
  --windowed \
  --onefile \
  --add-data "bridge.py:." \
  --hidden-import websockets \
  --hidden-import websockets.legacy \
  --hidden-import websockets.legacy.client \
  --hidden-import websockets.legacy.server \
  --osx-bundle-identifier "com.zietra.beatmind-bridge" \
  bridge_app.py

echo ""
echo "Built: dist/BeatMind Bridge.app"
echo ""

# Code sign (requires Apple Developer ID)
if command -v codesign &>/dev/null; then
  IDENTITY="Developer ID Application: Zietra Technologies inc (PRKZ4UVCD7)"
  echo "Code signing with: $IDENTITY"
  codesign --deep --force --options runtime \
    --sign "$IDENTITY" \
    "dist/BeatMind Bridge.app" 2>/dev/null && echo "Signed!" || echo "Signing skipped (no matching identity)"
fi

echo ""
echo "To create DMG:"
echo "  hdiutil create -volname 'BeatMind Bridge' -srcfolder 'dist/BeatMind Bridge.app' -ov 'dist/BeatMind Bridge.dmg'"
