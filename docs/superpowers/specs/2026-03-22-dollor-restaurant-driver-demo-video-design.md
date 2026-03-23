# Dollor.ai Restaurant & Driver Demo Video — Design Spec

**Date:** 2026-03-22
**Purpose:** Apple reviewer demo video showing how the Restaurant and Driver apps work end-to-end
**Format:** 1920×1080 landscape, ~2:20 runtime, dual iPhone frame composition
**Remotion project:** `apps/dollor-video/`

---

## Goals

- Give Apple reviewers a clear, authentic view of the app working in a live demo environment
- Show two food delivery flows: pool delivery and direct delivery
- Use real screen recordings (no mockups) to avoid any ambiguity about app behavior
- Annotate flows with text callouts so reviewers understand each step without guessing

## Out of Scope

- Customer app flows
- Rideshare flows
- Marketing / social media use
- App Store public preview (different format requirements)

---

## Video Structure

| # | Scene | Duration | Active Phone(s) |
|---|-------|----------|-----------------|
| 1 | Title card — "Dollor.ai — Restaurant & Driver App Demo" | 0:00–0:06 | Both (login screen) |
| 2 | Section card — "Flow 1: Pool Delivery" | 0:06–0:10 | — |
| 3 | Restaurant login → Apple Restaurant dashboard | 0:10–0:25 | Left (restaurant) |
| 4 | Order received → restaurant assigns to driver pool → driver notified | 0:25–0:55 | Both |
| 5 | Driver accepts pool delivery → picks up → marks delivered | 0:55–1:15 | Right (driver) |
| 6 | Section card — "Flow 2: Direct Delivery" | 1:15–1:20 | — |
| 7 | New order → restaurant assigns to specific driver directly | 1:20–1:50 | Both |
| 8 | Driver accepts direct assignment → delivers → completes | 1:50–2:10 | Right (driver) |
| 9 | End card — "Dollor.ai — Connecting Restaurants & Drivers" | 2:10–2:20 | Both (fade out) |

**Total:** ~2:20

---

## Recording Plan

Six simulator clips required. Record from Xcode Simulator using demo accounts.

| Clip | App | Account | Flow |
|------|-----|---------|------|
| R1 | Restaurant | demo.restaurant@dollor.ai | Login → Apple Restaurant dashboard |
| R2 | Restaurant | demo.restaurant@dollor.ai | Receive order → tap "Assign to Driver Pool" |
| R3 | Restaurant | demo.restaurant@dollor.ai | Receive order → select specific driver → assign directly |
| D1 | Driver | demo.driver@dollor.ai | Login → idle delivery dashboard |
| D2 | Driver | demo.driver@dollor.ai | Receive pool delivery notification → accept → mark delivered |
| D3 | Driver | demo.driver@dollor.ai | Receive direct assignment notification → accept → mark delivered |

**Recording method:** Xcode Simulator built-in screen recording (`File > Record Screen` or `Cmd+R`). Export as `.mov`, convert to `.mp4` with `ffmpeg -i input.mov -vcodec copy output.mp4`. Drop into `apps/dollor-video/src/assets/recordings/`.

**Demo credentials:**
- Restaurant: `demo.restaurant@dollor.ai` / `DemoRestaurant2025!`
- Driver: `demo.driver@dollor.ai` / `DemoDriver2025!`
- Backend: staging `https://d34u5ixl0bulv4.cloudfront.net`

---

## Remotion Project Architecture

### File Structure

```
apps/dollor-video/
├── package.json
├── remotion.config.ts
├── src/
│   ├── Root.tsx                  # registers DollorDemo composition (1920×1080, 30fps)
│   ├── Video.tsx                 # main timeline using <Series>
│   ├── scenes/
│   │   ├── TitleCard.tsx         # intro + end card — brand logo centered on dark bg
│   │   ├── SectionCard.tsx       # flow divider cards ("Flow 1 — Pool Delivery")
│   │   └── DualPhoneScene.tsx    # reusable dual-phone layout with callouts
│   ├── components/
│   │   ├── IPhoneFrame.tsx       # SVG iPhone 15 Pro frame — clips video inside screen area
│   │   ├── PhoneVideo.tsx        # <Video> clipped to phone screen bounds
│   │   └── Callout.tsx           # animated text badge: fade in → hold → fade out
│   ├── utils/
│   │   ├── spring.ts             # copied from apps/offerletter-video/src/spring.ts
│   │   └── typewriter.ts         # copied from apps/offerletter-video/src/typewriter.ts
│   └── assets/
│       ├── recordings/           # R1.mp4, R2.mp4, R3.mp4, D1.mp4, D2.mp4, D3.mp4
│       └── logo.svg              # Dollor.ai logo
└── out/
    └── dollor-demo.mp4           # rendered output
```

### Key Components

**`DualPhoneScene`** — parameterized scene component used for all 4 two-phone scenes:
```tsx
interface DualPhoneSceneProps {
  leftClip: string;         // path to restaurant recording
  rightClip: string;        // path to driver recording
  leftStartFrom?: number;   // trim: start frame in source clip
  rightStartFrom?: number;
  callouts: Array<{
    text: string;
    startFrame: number;     // relative to scene start
    duration: number;
    side: 'left' | 'right' | 'center';
    color: string;          // #06C167 restaurant, #F2994A driver
  }>;
}
```

**`IPhoneFrame`** — pure SVG iPhone 15 Pro frame. Screen area defined as a `<clipPath>` so `PhoneVideo` is naturally masked inside the phone boundary. No external image assets.

**`Callout`** — springs in from bottom, holds, springs out. Uses `spring.ts` utility. Text badge with colored left border matching the app (green = restaurant, orange = driver).

### Canvas & Composition

| Property | Value |
|----------|-------|
| Width | 1920px |
| Height | 1080px |
| FPS | 30 |
| Background | `#0a0a0a` (near-black) |
| Left phone center | `(480, 540)` |
| Right phone center | `(1440, 540)` |
| Phone frame height | ~800px (fits 1080px canvas with padding) |
| Brand colors | Green `#06C167`, Orange `#F2994A`, Gold `#FFD700` |

### Render & Delivery

```bash
cd apps/dollor-video
npm run render
# outputs: out/dollor-demo.mp4
```

Upload to S3 and share URL with Apple reviewer submission notes, OR attach directly to the App Store Connect review notes.

---

## Callout Text (per scene)

| Scene | Callout | Timing |
|-------|---------|--------|
| Restaurant login | "Apple Restaurant — demo account" | After dashboard loads |
| Order arrives | "New order received" | When notification appears |
| Pool assign | "Assigned to nearest driver pool" | When restaurant taps assign |
| Driver notified | "Nearby driver notified in real time" | When driver phone lights up |
| Driver accepts | "Driver accepts delivery" | On accept tap |
| Delivery complete | "Delivery completed ✓" | On completion |
| Direct assign | "Direct assignment — no bidding" | When restaurant selects driver |
| Direct complete | "Delivery completed ✓" | On completion |

---

## Dependencies

- `remotion` + `@remotion/player` (same version as `apps/offerletter-video`)
- `ffmpeg` — for `.mov` → `.mp4` conversion of simulator recordings
- No new cloud infrastructure needed — render locally, upload manually

---

*Spec approved: 2026-03-22*
