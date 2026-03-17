#!/bin/bash
# BeatMind Bridge Installer for macOS
# Double-click this file to connect BeatMind to Ableton Live

clear
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║    BeatMind Bridge Setup             ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "  Python 3 is required but not installed."
    echo ""
    echo "  Install it from: https://www.python.org/downloads/"
    echo ""
    read -p "  Press Enter to exit..."
    exit 1
fi

echo "  Python 3 found: $(python3 --version)"

# Install dependency
echo "  Installing bridge dependency..."
python3 -m pip install --quiet websockets 2>/dev/null || pip3 install --quiet websockets 2>/dev/null
echo "  Dependencies ready"
echo ""

# Download bridge.py
BRIDGE_DIR="$HOME/.beatmind"
mkdir -p "$BRIDGE_DIR"

echo "  Downloading bridge agent..."
curl -sL "BEATMIND_SERVER_URL/bridge.py" -o "$BRIDGE_DIR/bridge.py" 2>/dev/null

if [ ! -f "$BRIDGE_DIR/bridge.py" ]; then
    echo "  Could not download bridge. Using bundled version..."
fi

# Get token from user (pre-filled from dashboard)
TOKEN="BEATMIND_BRIDGE_TOKEN"
SERVER="BEATMIND_WS_URL"

if [ "$TOKEN" = "BEATMIND_BRIDGE_TOKEN" ]; then
    echo "  Enter your bridge token from the BeatMind dashboard:"
    echo ""
    read -p "     Token: " TOKEN
    echo ""
fi

if [ -z "$TOKEN" ]; then
    echo "  No token provided. Get one from your BeatMind dashboard."
    read -p "  Press Enter to exit..."
    exit 1
fi

echo "  Connecting to Ableton Live..."
echo "  ────────────────────────────────────"
echo "  Make sure Ableton Live is open!"
echo "  Press Ctrl+C to disconnect."
echo "  ────────────────────────────────────"
echo ""

python3 "$BRIDGE_DIR/bridge.py" --server "$SERVER" --token "$TOKEN"

echo ""
echo "  Bridge disconnected."
read -p "  Press Enter to exit..."
