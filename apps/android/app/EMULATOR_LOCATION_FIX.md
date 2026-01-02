# 🗺️ Fix Map and Address Issues in Emulator

## 🔧 Quick Fixes

### **Fix 1: Enable Location in Emulator**

**Option A: Via Emulator UI (Easiest)**
1. On the emulator, open **Settings** app
2. Go to **Location**
3. Turn **ON** "Use location"
4. Close Settings and reopen the EatFair app

**Option B: Via Command Line**
```bash
# Enable location services
~/Library/Android/sdk/platform-tools/adb shell settings put secure location_mode 3

# Set a mock location (Rancho Santa Margarita, CA)
~/Library/Android/sdk/platform-tools/adb emu geo fix -117.6039 33.6406
```

---

### **Fix 2: Grant Location Permission to App**

**Method 1: Via App**
1. Open the **EatFair** app
2. When it asks for location permission → Tap **"Allow"**
3. If it doesn't ask, go to Settings → Apps → EatFair → Permissions → Location → Allow

**Method 2: Via Command**
```bash
# Grant location permission
~/Library/Android/sdk/platform-tools/adb shell pm grant com.eatfair.app android.permission.ACCESS_FINE_LOCATION
~/Library/Android/sdk/platform-tools/adb shell pm grant com.eatfair.app android.permission.ACCESS_COARSE_LOCATION
```

---

### **Fix 3: Set Mock Location for Testing**

```bash
# Set location to Rancho Santa Margarita (where the restaurant is)
~/Library/Android/sdk/platform-tools/adb emu geo fix -117.6039 33.6406

# Or set to a different location (longitude, latitude)
# Example: Los Angeles
~/Library/Android/sdk/platform-tools/adb emu geo fix -118.2437 34.0522
```

---

## 🧪 Test the Fixes

### **Step 1: Run All Fixes**
```bash
# Enable location
~/Library/Android/sdk/platform-tools/adb shell settings put secure location_mode 3

# Grant permissions
~/Library/Android/sdk/platform-tools/adb shell pm grant com.eatfair.app android.permission.ACCESS_FINE_LOCATION
~/Library/Android/sdk/platform-tools/adb shell pm grant com.eatfair.app android.permission.ACCESS_COARSE_LOCATION

# Set mock location
~/Library/Android/sdk/platform-tools/adb emu geo fix -117.6039 33.6406
```

### **Step 2: Restart the App**
1. Close the EatFair app (swipe up from bottom, swipe app away)
2. Reopen it
3. Try adding an address again

---

## 📍 **Alternative: Use Emulator's Location Controls**

### **Via Extended Controls:**
1. In the emulator window, click the **"..."** (more) button on the right side
2. Click **"Location"** in the left menu
3. Enter coordinates or search for a location:
   - **Latitude**: 33.6406
   - **Longitude**: -117.6039
4. Click **"Send"**

---

## 🗺️ **If Map Still Doesn't Load**

The Google Maps API key in the app should work, but if maps still don't load:

### **Check Internet Connection:**
```bash
# Test internet in emulator
~/Library/Android/sdk/platform-tools/adb shell ping -c 3 google.com
```

### **Verify API Key:**
The app already has this API key configured:
```
AIzaSyB1ZvoKM-JerGPdWQBPR7UKMh47yNmadrk
```

If maps still don't work, you may need to:
1. Enable the Maps SDK in Google Cloud Console
2. Or use a different API key

---

## ✅ **Complete Fix Script**

Run this all-in-one command:

```bash
# All fixes in one command
~/Library/Android/sdk/platform-tools/adb shell settings put secure location_mode 3 && \
~/Library/Android/sdk/platform-tools/adb shell pm grant com.eatfair.app android.permission.ACCESS_FINE_LOCATION && \
~/Library/Android/sdk/platform-tools/adb shell pm grant com.eatfair.app android.permission.ACCESS_COARSE_LOCATION && \
~/Library/Android/sdk/platform-tools/adb emu geo fix -117.6039 33.6406 && \
echo "✅ Location fixes applied! Restart the app."
```

---

## 🎯 **Expected Result**

After applying these fixes:
- ✅ Map should load and show your location
- ✅ You can search for addresses
- ✅ You can save addresses
- ✅ Location pin should appear on map

---

## 🆘 **Still Not Working?**

### **Workaround: Skip Map and Enter Address Manually**
If the map doesn't load, you can still test other features:
1. Use the existing sample addresses in the app
2. Or manually type an address in the address fields

### **For Partner App:**
The Partner app doesn't need maps/location, so all features should work perfectly!

---

**Try the fixes above and the map should work!** 🗺️
