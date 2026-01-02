#!/bin/bash

echo "🚀 EatFair Apps Testing Script"
echo "================================"
echo ""

# Set Java 17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# Android SDK paths (full paths)
EMULATOR="$HOME/Library/Android/sdk/emulator/emulator"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"

# Check if ADB exists
if [ ! -f "$ADB" ]; then
    echo "❌ ADB not found at: $ADB"
    echo "Please check your Android SDK installation."
    exit 1
fi

# Check if emulator exists
if [ ! -f "$EMULATOR" ]; then
    echo "❌ Android emulator not found!"
    echo "Please install Android Studio and set up an emulator."
    exit 1
fi

# List available emulators
echo "📱 Available Emulators:"
$EMULATOR -list-avds
echo ""

# Ask which emulator to use
echo "Which emulator would you like to use?"
read -p "Enter emulator name (or press Enter for 'Pixel_9a'): " EMULATOR_NAME
EMULATOR_NAME=${EMULATOR_NAME:-Pixel_9a}

echo ""
echo "🔄 Starting emulator: $EMULATOR_NAME"
echo "This may take a minute..."
echo ""

# Start emulator in background
$EMULATOR -avd "$EMULATOR_NAME" -no-snapshot-load &
EMULATOR_PID=$!

# Wait for emulator to boot
echo "⏳ Waiting for emulator to boot..."
$ADB wait-for-device
sleep 10

# Wait for boot to complete
while [ "$($ADB shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
    echo "   Still booting..."
    sleep 5
done

echo "✅ Emulator is ready!"
echo ""

# Install apps
echo "📦 Installing Customer App..."
$ADB install -r app/build/outputs/apk/debug/app-debug.apk

echo ""
echo "📦 Installing Partner App..."
$ADB install -r partner/build/outputs/apk/debug/partner-debug.apk

echo ""
echo "✅ Both apps installed successfully!"
echo ""
echo "📱 You can now test the apps on the emulator:"
echo "   - Customer App: 'EatFair' (com.eatfair.app)"
echo "   - Partner App: 'EatFair Partner' (com.eatfair.partner)"
echo ""
echo "💡 Tips:"
echo "   - The emulator window should be open"
echo "   - Swipe up from bottom to open app drawer"
echo "   - Find the apps and tap to open"
echo "   - To close emulator: Press Ctrl+C or close the window"
echo ""
