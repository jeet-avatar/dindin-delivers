#!/bin/bash

# iOS Apps Build & Fix Script

echo "🔧 EatFair iOS Apps - Build & Fix Script"
echo "========================================"
echo ""

WORKSPACE_DIR="/Users/jeet/StudioProjects/eatfair-ios"
cd "$WORKSPACE_DIR" || exit 1

# Check if workspace exists
if [ ! -f "EatFair.xcworkspace/contents.xcworkspacedata" ]; then
    echo "❌ Workspace not found!"
    exit 1
fi

echo "✅ Workspace found"
echo ""

# List available schemes
echo "📋 Available schemes:"
xcodebuild -workspace EatFair.xcworkspace -list 2>/dev/null | grep -A 100 "Schemes:" | tail -n +2 | grep -v "^$" | head -10
echo ""

# Clean derived data
echo "🧹 Cleaning build artifacts..."
rm -rf ~/Library/Developer/Xcode/DerivedData/EatFair-* 2>/dev/null || true
echo "   ✅ Cleaned"
echo ""

echo "========================================="
echo "🎯 To build apps manually:"
echo ""
echo "1. Open workspace:"
echo "   open EatFair.xcworkspace"
echo ""
echo "2. Or build via command line (replace SCHEME_NAME):"
echo "   xcodebuild -workspace EatFair.xcworkspace \\"
echo "     -scheme SCHEME_NAME \\"
echo "     -sdk iphonesimulator \\"
echo "     -configuration Debug build"
echo ""
echo "📍 Workspace location:"
echo "   $WORKSPACE_DIR/EatFair.xcworkspace"
echo ""
echo "🚀 Opening workspace in Xcode..."

# Open in Xcode
open EatFair.xcworkspace

echo ""
echo "✅ Xcode opened! Select a scheme and press ⌘+R to run"
