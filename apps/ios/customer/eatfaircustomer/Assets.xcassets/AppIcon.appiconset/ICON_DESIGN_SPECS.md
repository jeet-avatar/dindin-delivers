# Dollor.ai App Icon Design Specifications

## Target Design (Match Android)
The iOS app icon should match the Android gold $ design for brand consistency.

## Color Specifications
- **Background**: #1A1A1A (Dark/Near Black)
- **Dollar Sign**: #FFD700 (Gold)

## Dimensions
- iOS requires: 1024x1024 PNG (no alpha channel)
- The dollar sign should be centered and sized proportionally

## Design Reference
The Android vector design (`ic_launcher_foreground.xml`) contains the exact dollar sign path:

```xml
<!-- Gold Dollar Sign - Dollor.ai Logo -->
<path
    android:fillColor="#FFD700"
    android:pathData="M54,18v8c-10,1 -18,6 -18,15c0,10 9,14 18,16v20c-6,-1 -11,-5 -14,-10l-9,5c4,8 12,13 23,14v8h5v-8c11,-1 20,-7 20,-17c0,-11 -9,-15 -20,-17v-18c5,1 9,4 11,8l9,-5c-4,-6 -10,-10 -20,-11v-8h-5z" />

<path
    android:fillColor="#FFD700"
    android:pathData="M49,41c0,-5 4,-8 10,-9v16c-6,-2 -10,-5 -10,-7z" />

<path
    android:fillColor="#FFD700"
    android:pathData="M59,77v-18c8,2 12,5 12,10c0,5 -5,7 -12,8z" />
```

## How to Generate
1. Use Figma, Sketch, or Adobe Illustrator
2. Create 1024x1024 canvas with #1A1A1A background
3. Import the SVG paths above and fill with #FFD700
4. Center the dollar sign (scale to ~60% of canvas size)
5. Export as PNG without alpha channel
6. Replace `AppIcon.png` in this folder

## Alternative Quick Method
Use an online SVG to PNG converter:
1. Create SVG with the paths above
2. Set viewBox="0 0 108 108"
3. Add background rect with #1A1A1A
4. Export at 1024x1024
