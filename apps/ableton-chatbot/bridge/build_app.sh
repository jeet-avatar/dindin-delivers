#!/bin/bash
# Build the complete Apple Silicon installer; do not publish unsigned output.
set -euo pipefail
cd "$(dirname "$0")"
: "${SIGNING_ID:?Set a Developer ID Application certificate hash}"
MODE="${1:-release}"
if [[ "$MODE" != "release" && "$MODE" != "--local-test" ]]; then
  echo "Usage: $0 [--local-test]" >&2
  exit 2
fi
if [[ "$MODE" == "release" ]]; then
  : "${NOTARY_PROFILE:?Set a notarytool keychain profile}"
fi
WORK=$(mktemp -d "${TMPDIR:-/tmp}/beatmind-build.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
"${PYTHON:-python3}" -m venv "$WORK/venv"
"$WORK/venv/bin/pip" install -r requirements-build.txt
"$WORK/venv/bin/pyinstaller" --noconfirm --windowed --onedir \
  --name "BeatMind Bridge" --osx-bundle-identifier com.zietra.beatmind-bridge \
  --codesign-identity "$SIGNING_ID" --target-arch arm64 \
  --hidden-import audio_preview --hidden-import live_set \
  --hidden-import mixer_preview --hidden-import sample_library \
  --distpath "$WORK/dist" --workpath "$WORK/work" --specpath "$WORK" bridge_app.py
APP="$WORK/dist/BeatMind Bridge.app"
"$WORK/venv/bin/python" - "$APP/Contents/Info.plist" <<'PY'
import plistlib
import sys
from launch_link import URL_TYPES
path = sys.argv[1]
with open(path, 'rb') as source:
    info = plistlib.load(source)
info['CFBundleURLTypes'] = URL_TYPES
with open(path, 'wb') as target:
    plistlib.dump(info, target)
PY
HELPER="$APP/Contents/Helpers/BeatMind Audio.app"
mkdir -p "$HELPER/Contents/MacOS"
cp native/Info.plist "$HELPER/Contents/Info.plist"
xcrun swiftc native/Capture.swift -parse-as-library -O -target arm64-apple-macos13.0 \
  -framework ScreenCaptureKit -framework AVFoundation -framework CoreGraphics \
  -o "$HELPER/Contents/MacOS/BeatMindAudio"
codesign --force --options runtime --timestamp --sign "$SIGNING_ID" "$HELPER"
codesign --force --options runtime --timestamp --sign "$SIGNING_ID" "$APP"
codesign --verify --deep --strict "$APP"
"$APP/Contents/MacOS/BeatMind Bridge" --network-check "$WORK/network-check.json"
"$WORK/venv/bin/python" - "$WORK/network-check.json" <<'PY'
import json
import sys
with open(sys.argv[1]) as source:
    result = json.load(source)
assert result == {'https_health': True, 'wss_tls': True, 'unauthenticated_rejected': True}, result
print('Packaged HTTPS and WebSocket TLS checks passed; no credentials or Ableton commands used.')
PY
if [[ "$MODE" == "--local-test" ]]; then
  mkdir -p dist/local-test
  ditto "$APP" "dist/local-test/BeatMind Bridge.app"
  echo "Local test app only: dist/local-test/BeatMind Bridge.app (not notarized; do not publish)"
  exit 0
fi
mkdir -p "$WORK/image/AbletonOSC-Extensions"
ditto "$APP" "$WORK/image/BeatMind Bridge.app"
cp abletonosc/*.py abletonosc/README.md "$WORK/image/AbletonOSC-Extensions/"
ln -s /Applications "$WORK/image/Applications"
hdiutil create -volname "BeatMind Bridge" -srcfolder "$WORK/image" -format UDZO "$WORK/BeatMind-Bridge.dmg"
codesign --sign "$SIGNING_ID" --timestamp "$WORK/BeatMind-Bridge.dmg"
xcrun notarytool submit "$WORK/BeatMind-Bridge.dmg" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$WORK/BeatMind-Bridge.dmg"
hdiutil verify "$WORK/BeatMind-Bridge.dmg"
mkdir -p dist
cp "$WORK/BeatMind-Bridge.dmg" dist/BeatMind-Bridge.dmg
echo "Verified installer: $PWD/dist/BeatMind-Bridge.dmg"
