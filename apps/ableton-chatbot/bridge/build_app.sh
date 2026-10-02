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
if [[ "$MODE" == "release" && -z "${NOTARY_PROFILE:-}" && -z "${NOTARY_KEY:-}" ]]; then
  echo "Set NOTARY_PROFILE, or NOTARY_KEY with NOTARY_KEY_ID and NOTARY_ISSUER (App Store Connect API key)" >&2
  exit 2
fi
WORK=$(mktemp -d "${TMPDIR:-/tmp}/beatmind-build.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
"${PYTHON:-python3}" -m venv "$WORK/venv"
"$WORK/venv/bin/pip" install -r requirements-build.txt -r requirements-separation.txt
# The on-device separation worker is the backend's own reference_worker/separation code.
"$WORK/venv/bin/pyinstaller" --noconfirm --windowed --onedir \
  --name "BeatMind Bridge" --osx-bundle-identifier com.zietra.beatmind-bridge \
  --codesign-identity "$SIGNING_ID" --osx-entitlements-file entitlements.plist --target-arch arm64 \
  --paths ../backend \
  --hidden-import audio_preview --hidden-import live_set --hidden-import arrangement \
  --hidden-import mixer_preview --hidden-import arrangement_preview --hidden-import sample_library \
  --hidden-import local_separation --hidden-import stem_import \
  --hidden-import reference_worker --hidden-import separation --hidden-import stems \
  --collect-data demucs --collect-submodules demucs --collect-data librosa \
  --add-data "$PWD/THIRD_PARTY_NOTICES.txt:." \
  --add-data "$PWD/abletonosc:abletonosc" \
  --distpath "$WORK/dist" --workpath "$WORK/work" --specpath "$WORK" bridge_app.py
APP="$WORK/dist/BeatMind Bridge.app"
"$WORK/venv/bin/python" bundle_metadata.py "$APP/Contents/Info.plist"
HELPER="$APP/Contents/Helpers/BeatMind Audio.app"
mkdir -p "$HELPER/Contents/MacOS"
cp native/Info.plist "$HELPER/Contents/Info.plist"
xcrun swiftc native/Capture.swift -parse-as-library -O -target arm64-apple-macos13.0 \
  -framework ScreenCaptureKit -framework AVFoundation -framework CoreGraphics \
  -o "$HELPER/Contents/MacOS/BeatMindAudio"
codesign --force --options runtime --timestamp --sign "$SIGNING_ID" "$HELPER"
codesign --force --options runtime --timestamp --entitlements entitlements.plist --sign "$SIGNING_ID" "$APP"
codesign --verify --deep --strict "$APP"
# Separation smoke test inside the signed bundle: real models, a generated tone, no network credentials.
"$WORK/venv/bin/python" - "$APP" "$WORK/separation-check" <<'PY'
import json, math, subprocess, sys, wave, struct
from pathlib import Path
app, work = Path(sys.argv[1]), Path(sys.argv[2])
work.mkdir()
with wave.open(str(work / 'tone.wav'), 'wb') as out:
    out.setnchannels(2); out.setsampwidth(2); out.setframerate(44100)
    out.writeframes(b''.join(struct.pack('<hh', *(int(8000 * math.sin(2 * math.pi * f * i / 44100)) for f in (110, 220)))
                             for i in range(44100 * 8)))
(work / 'meta.json').write_text(json.dumps({'id': 'check', 'name': 'tone.wav', 'source_file': str(work / 'tone.wav')}))
worker = subprocess.run([str(app / 'Contents/MacOS/BeatMind Bridge'), '--separate', str(work)], check=True, timeout=1800,
               capture_output=True, text=True,
               env={'DEMUCS_MODEL': 'htdemucs', 'DEMUCS_DEVICE': 'cpu', 'BEATMIND_DECODER': 'afconvert', 'HOME': str(Path.home())})
assert 'Starting Ableton Chat Bridge' not in worker.stdout + worker.stderr, 'Separation unexpectedly started a Bridge connection.'
tracker = subprocess.run([str(app / 'Contents/MacOS/BeatMind Bridge'), '-B', '-S', '-I', '-c',
                          'from multiprocessing.resource_tracker import main;main(0)'],
                         stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=20, check=True)
assert not tracker.stdout + tracker.stderr, 'A resource-tracker subprocess unexpectedly ran application code.'
report = json.loads((work / 'report.json').read_text())
assert report['stem_health']['checks_passed'], report['stem_health']
print('Packaged separation check passed:', [s['name'] for s in report['stems']])
PY
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
cp THIRD_PARTY_NOTICES.txt "$WORK/image/Third-Party Notices.txt"
ln -s /Applications "$WORK/image/Applications"
hdiutil create -volname "BeatMind Bridge" -srcfolder "$WORK/image" -format UDZO "$WORK/BeatMind-Bridge.dmg"
codesign --sign "$SIGNING_ID" --timestamp "$WORK/BeatMind-Bridge.dmg"
if [[ -n "${NOTARY_PROFILE:-}" ]]; then
  xcrun notarytool submit "$WORK/BeatMind-Bridge.dmg" --keychain-profile "$NOTARY_PROFILE" --wait
else
  xcrun notarytool submit "$WORK/BeatMind-Bridge.dmg" --key "$NOTARY_KEY" --key-id "$NOTARY_KEY_ID" --issuer "$NOTARY_ISSUER" --wait
fi
xcrun stapler staple "$WORK/BeatMind-Bridge.dmg"
hdiutil verify "$WORK/BeatMind-Bridge.dmg"
mkdir -p dist
cp "$WORK/BeatMind-Bridge.dmg" dist/BeatMind-Bridge.dmg
echo "Verified installer: $PWD/dist/BeatMind-Bridge.dmg"
