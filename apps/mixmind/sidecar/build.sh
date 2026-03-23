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
echo "Test with: ./dist/mixmind-sidecar/mixmind-sidecar"
