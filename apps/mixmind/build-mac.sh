#!/bin/bash
# build-mac.sh — Build, sign, notarize, and upload MixMind DMG
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SIDECAR_DIR="$SCRIPT_DIR/sidecar"
ELECTRON_DIR="$SCRIPT_DIR/electron"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
IDENTITY="77506F6C9C2A3DD24D06077E2C5ED5A00ED6B7D0"
ENTITLEMENTS="$ELECTRON_DIR/entitlements.plist"
TIMESTAMP_URL="http://timestamp.apple.com/ts01"
API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8"
API_KEY_ID="9K626GB728"
API_ISSUER="80d10e49-f379-462f-9668-5ea53016812e"
S3_BUCKET="s3://beatmind-frontend"
CLOUDFRONT_ID="E3F24X4TEVJ9X2"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MixMind — Build, Sign, Notarize & Upload"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 0. UNLOCK KEYCHAIN ───────────────────────────────────
echo ""
echo "▸ Unlocking login keychain..."
security unlock-keychain ~/Library/Keychains/login.keychain-db
echo "✅  Keychain unlocked"

# ── 1. BUILD SIDECAR ─────────────────────────────────────
echo ""
echo "▸ Building sidecar with PyInstaller..."
cd "$SIDECAR_DIR"
pip install -r requirements.txt --quiet
pip install pyinstaller --quiet
rm -rf build dist
pyinstaller mixmind-sidecar.spec --noconfirm
echo "✅  Sidecar built"

# ── 2. SIGN SIDECAR ──────────────────────────────────────
echo ""
echo "▸ Signing sidecar binaries..."
find "$SIDECAR_DIR/dist/mixmind-sidecar" \( -name "*.so" -o -name "*.dylib" \) | sort | while IFS= read -r f; do
  codesign --force --sign "$IDENTITY" \
    --options runtime \
    --entitlements "$ENTITLEMENTS" \
    "$f" 2>/dev/null || true
done
codesign --force --sign "$IDENTITY" \
  --options runtime \
  --entitlements "$ENTITLEMENTS" \
  --timestamp="$TIMESTAMP_URL" \
  "$SIDECAR_DIR/dist/mixmind-sidecar/mixmind-sidecar"
echo "✅  Sidecar signed"

# ── 3. BUILD FRONTEND ─────────────────────────────────────
echo ""
echo "▸ Building frontend..."
cd "$FRONTEND_DIR"
npm ci --silent
npm run build
echo "✅  Frontend built"

# ── 4. BUILD DMG ─────────────────────────────────────────
echo ""
echo "▸ Building DMG with electron-builder..."
cd "$ELECTRON_DIR"
npm ci --silent
APPLE_API_KEY="$API_KEY_PATH" \
APPLE_API_KEY_ID="$API_KEY_ID" \
APPLE_API_ISSUER="$API_ISSUER" \
npx electron-builder --mac --publish=never
echo "✅  DMG built"

DMG_PATH=$(ls "$ELECTRON_DIR/dist/"*.dmg | head -1)
echo "    DMG: $DMG_PATH"

# ── 5. UPLOAD TO S3 ──────────────────────────────────────
echo ""
echo "▸ Uploading MixMind-mac.dmg to S3..."
aws s3 cp "$DMG_PATH" "$S3_BUCKET/MixMind-mac.dmg" \
  --content-type "application/octet-stream" \
  --cache-control "no-cache"
echo "✅  Uploaded"

echo ""
echo "▸ Invalidating CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_ID" \
  --paths "/MixMind-mac.dmg" \
  --query 'Invalidation.Id' --output text
echo "✅  Done"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ALL DONE ✅"
echo "  Live: https://www.beatmind.io/MixMind-mac.dmg"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
