#!/bin/bash
# Build the complete Apple Silicon installer; do not publish unsigned output.
set -euo pipefail
cd "$(dirname "$0")"
: "${SIGNING_ID:?Set a Developer ID Application certificate hash}"
: "${NOTARY_PROFILE:?Set a notarytool keychain profile}"
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
HELPER="$APP/Contents/Helpers/BeatMind Audio.app"
mkdir -p "$HELPER/Contents/MacOS"
cp native/Info.plist "$HELPER/Contents/Info.plist"
xcrun swiftc native/Capture.swift -parse-as-library -O -target arm64-apple-macos13.0 \
  -framework ScreenCaptureKit -framework AVFoundation -framework CoreGraphics \
  -o "$HELPER/Contents/MacOS/BeatMindAudio"
codesign --force --options runtime --timestamp --sign "$SIGNING_ID" "$HELPER"
codesign --force --options runtime --timestamp --sign "$SIGNING_ID" "$APP"
codesign --verify --deep --strict "$APP"
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
