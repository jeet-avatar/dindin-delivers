# Play Store Graphics Guide

## Required Graphics for Dollor.ai

### 1. App Icon (512x512 PNG)
- Export from: `app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp`
- Convert to 512x512 PNG
- No transparency, no rounded corners (Google adds these)

### 2. Feature Graphic (1024x500 PNG/JPG)
**Design specs:**
- Background: Dark (#1A1A1A) or Orange gradient (#F2994A → #D97706)
- Center: Dollor.ai logo (gold $ on dark circle)
- Text: "No Commission. Just $1."
- Tagline: "Food Delivery & Rideshare"

**Suggested layout:**
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│        [Logo]   Dollor.ai                             │
│                                                        │
│        No Commission. Just $1.                        │
│        Food Delivery & Rideshare                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 3. Phone Screenshots (1080x1920 or similar 9:16)
Capture these screens from the app:

1. **Home Screen** - Show restaurant cards and service selector
2. **Restaurant Menu** - Food items with prices
3. **Cart/Checkout** - Show $1 fee prominently
4. **Order Tracking** - Map with driver location
5. **Rideshare Request** - Fare estimate with $1-3 fee shown
6. **Profile** - Account features

**Tips:**
- Use demo mode or staging with good data
- Hide status bar or use a clean mockup frame
- Add caption overlays: "Just $1 Delivery Fee"

### 4. Tablet Screenshots (Optional but recommended)
- 7-inch: 1200x1920
- 10-inch: 1600x2560

---

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Brand Orange | #F2994A | Primary |
| Brand Orange Light | #FFB876 | Highlights |
| Brand Green | #06C167 | Success |
| Brand Black | #1A1A1A | Text/Background |
| Gold | #FFD700 | Logo $ symbol |

---

## Tools

- [Figma](https://figma.com) - Design graphics
- [Canva](https://canva.com) - Quick designs
- [Screenshot Frames](https://mockuphone.com) - Device frames
