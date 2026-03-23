#!/bin/bash
# Build the MixMind Python sidecar as a PyInstaller --onedir bundle.
# Run from: apps/mixmind/sidecar/
# Output: dist/mixmind-sidecar/

set -euo pipefail

cd "$(dirname "$0")"

source venv/bin/activate

# Verify pyinstaller is installed
pip install pyinstaller --quiet

# Clean previous build
rm -rf build/ dist/

pyinstaller \
  --onedir \
  --name mixmind-sidecar \
  --hidden-import uvicorn.logging \
  --hidden-import uvicorn.lifespan.on \
  --hidden-import uvicorn.protocols.http.auto \
  --hidden-import uvicorn.protocols.websockets.auto \
  --hidden-import fastapi \
  --hidden-import sqlalchemy.dialects.sqlite \
  --collect-all pyrekordbox \
  --noconfirm \
  main.py

echo "Build complete: dist/mixmind-sidecar/"

# Sign all dylibs/so files first, then the main binary (hardened runtime)
echo "Signing sidecar binary..."
IDENTITY="77506F6C9C2A3DD24D06077E2C5ED5A00ED6B7D0"  # Developer ID Application: Zietra Technologies inc (PRKZ4UVCD7)
ENTITLEMENTS="$(dirname "$0")/../electron/entitlements.plist"
SIDECAR_DIR="dist/mixmind-sidecar"

find "$SIDECAR_DIR" \( -name "*.dylib" -o -name "*.so" \) | while read f; do
  codesign --force --sign "$IDENTITY" --options runtime --entitlements "$ENTITLEMENTS" "$f" 2>/dev/null
done

codesign --force --verify --verbose \
  --sign "$IDENTITY" \
  --options runtime \
  --entitlements "$ENTITLEMENTS" \
  "$SIDECAR_DIR/mixmind-sidecar"

echo "Sidecar signed."
echo "Test with: ./dist/mixmind-sidecar/mixmind-sidecar"
