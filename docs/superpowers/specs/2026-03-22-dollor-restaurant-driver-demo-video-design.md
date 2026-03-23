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

## Video Structure & Clip Mapping

Each scene specifies which clips play on which phone and approximate playback range within that clip.

| # | Scene | Duration | Left Phone (restaurant) | Right Phone (driver) |
|---|-------|----------|------------------------|----------------------|
| 1 | Title card — "Dollor.ai — Restaurant & Driver App Demo" | 0:00–0:06 | R1 (login screen, frozen) | D1 (idle screen, frozen) |
| 2 | Section card — "Flow 1: Pool Delivery" | 0:06–0:10 | — | — |
| 3 | Restaurant login → Apple Restaurant dashboard | 0:10–0:25 | R1 full playback (~15s) | D1 idle, frozen |
| 4 | Order received → pool assign → driver notified | 0:25–0:55 | R2 full playback (~30s) | D2 from start, plays in sync |
| 5 | Driver accepts → picks up → marks delivered | 0:55–1:15 | R2 freeze on last frame | D2 continues (~20s) |
| 6 | Section card — "Flow 2: Direct Delivery" | 1:15–1:20 | — | — |
| 7 | New order → restaurant assigns specific driver | 1:20–1:50 | R3 full playback (~30s) | D3 from start, plays in sync |
| 8 | Driver accepts direct → delivers → completes | 1:50–2:10 | R3 freeze on last frame | D3 continues (~20s) |
| 9 | End card — "Dollor.ai — Connecting Restaurants & Drivers" | 2:10–2:20 | Both phones fade out | Both phones fade out |

**Sync rule for dual-phone scenes (4 and 7):** Both clips start at the same Remotion frame. The restaurant clip drives timing — the pool assign tap / direct assign tap is the shared sync point. If D2/D3 naturally starts with the driver waiting for a notification, trim the idle wait from the driver clip so the notification arrives ~2s after the restaurant assigns.

**Clip length vs scene duration:** Record clips longer than needed (45–90s raw). Trim in Remotion using `startFrom` / `endAt` props on `<Video>`. No speed ramping — 1:1 playback to keep UI interactions legible.

**If a phone is "idle/frozen" in a scene:** The clip is paused at its last frame using `pauseWhenBuffering` or by ending the `<OffthreadVideo>` component at that frame.

---

## Recording Plan

Six simulator clips required. Record from Xcode Simulator (iPhone 15 Pro model — matches the SVG frame).

| Clip | App | Account | Start state | End state | Target raw length |
|------|-----|---------|-------------|-----------|-------------------|
| R1 | Restaurant | demo.restaurant@dollor.ai | App launch / login screen | Apple Restaurant dashboard fully loaded | ~20s |
| R2 | Restaurant | demo.restaurant@dollor.ai | Dashboard with incoming order notification | Order assigned to driver pool, confirmation shown | ~40s |
| R3 | Restaurant | demo.restaurant@dollor.ai | Dashboard with incoming order notification | Specific driver selected and assigned, confirmation shown | ~40s |
| D1 | Driver | demo.driver@dollor.ai | App launch / login screen | Idle delivery dashboard (no active orders) | ~20s |
| D2 | Driver | demo.driver@dollor.ai | Idle dashboard (pool notification arrives) | Delivery marked as complete | ~60s |
| D3 | Driver | demo.driver@dollor.ai | Idle dashboard (direct assignment notification arrives) | Delivery marked as complete | ~60s |

**Recording method:** Xcode Simulator → `File > Record Screen` (or `Cmd+R`). Exports `.mov`. Convert:
```bash
ffmpeg -i input.mov -vcodec h264 -acodec aac output.mp4
```
Drop into `apps/dollor-video/src/assets/recordings/` named exactly `R1.mp4`–`R3.mp4`, `D1.mp4`–`D3.mp4`.

**Simulator model:** iPhone 15 Pro (to match SVG frame — Dynamic Island, not notch)

**Demo credentials:**
- Restaurant: `demo.restaurant@dollor.ai` / `DemoRestaurant2025!`
- Driver: `demo.driver@dollor.ai` / `DemoDriver2025!`
- Backend: staging `https://d34u5ixl0bulv4.cloudfront.net`

**Audio:** Strip audio from all recordings — `ffmpeg -i input.mp4 -an output.mp4`. Video is silent; no background music needed for Apple reviewer submission.

---

## Remotion Project Architecture

### File Structure

```
apps/dollor-video/
├── package.json
├── remotion.config.ts
├── src/
│   ├── Root.tsx                  # registers DollorDemo composition (1920×1080, 30fps)
│   ├── Video.tsx                 # main timeline using <Series> — all scenes in order
│   ├── scenes/
│   │   ├── TitleCard.tsx         # intro + end card
│   │   ├── SectionCard.tsx       # "Flow 1 — Pool Delivery" divider
│   │   └── DualPhoneScene.tsx    # reusable: left phone + right phone + callouts
│   ├── components/
│   │   ├── IPhoneFrame.tsx       # SVG iPhone 15 Pro frame with Dynamic Island
│   │   ├── PhoneVideo.tsx        # <OffthreadVideo> clipped inside phone screen area
│   │   └── Callout.tsx           # animated text badge
│   ├── utils/
│   │   ├── spring.ts             # copied from apps/offerletter-video/src/spring.ts
│   │   └── typewriter.ts         # copied from apps/offerletter-video/src/typewriter.ts
│   └── assets/
│       ├── recordings/           # R1.mp4–R3.mp4, D1.mp4–D3.mp4
│       └── logo.svg              # Dollor.ai $ logo (gold)
└── out/
    └── dollor-demo.mp4
```

### Component Specs

**`DualPhoneScene`**
```tsx
interface CalloutConfig {
  text: string;
  startFrame: number;   // relative to this scene's frame 0
  duration: number;     // frames to display (hold time; spring in/out adds ~10f each end)
  side: 'left' | 'right' | 'center';
  color: string;        // left border color: '#06C167' restaurant, '#F2994A' driver
}

interface DualPhoneSceneProps {
  leftClip: string;          // e.g. '/assets/recordings/R2.mp4'
  rightClip: string;         // e.g. '/assets/recordings/D2.mp4'
  leftStartFrom?: number;    // trim: skip N frames at start of left clip (default 0)
  rightStartFrom?: number;   // trim: skip N frames at start of right clip (default 0)
  leftEndAt?: number;        // freeze left phone after this frame (default: play to end)
  rightEndAt?: number;
  callouts: CalloutConfig[];
}
```
Both clips start at the same scene frame. Left clip drives primary action; right clip is trimmed to sync notification arrival ~2s (60 frames) after left clip's assign action.

**`IPhoneFrame`** — pure SVG, no external image. iPhone 15 Pro proportions: 393×852pt logical, Dynamic Island cutout at top center. Screen area defined as `<clipPath id="screenClip">` — `PhoneVideo` uses this clip path. Frame rendered at 380px wide × 820px tall in the 1080px canvas (leaves 130px vertical padding top/bottom).

**`PhoneVideo`** — wraps `<OffthreadVideo>` inside the screen clip path. Props: `src`, `startFrom`, `endAt`. When `endAt` is reached, renders the last frame frozen.

**`Callout`** — springs in from 20px below its final position (using `spring.ts`), holds for `duration` frames, springs out upward. Dark background pill (`#1a1a1a`), 4px left border in `color`, white text 14px medium. Positioned at bottom-left of left phone area (left callouts), bottom-right of right phone area (right callouts), or bottom-center of canvas (center callouts).

**`TitleCard`** — dark `#0a0a0a` background. Dollor.ai `$` logo SVG centered, gold `#FFD700`. Title text below in white 48px bold. Subtitle in `#888` 24px. Both phones visible at sides showing login screens (R1/D1 frozen at frame 0). Fade in over 20 frames.

**`SectionCard`** — full canvas overlay fading in/out. Section number in small gold label. Flow name in 48px white bold. Description subtitle in `#888`. No phone frames visible during section cards. Duration: 4 seconds (120 frames).

### Canvas & Composition

| Property | Value |
|----------|-------|
| Width | 1920px |
| Height | 1080px |
| FPS | 30 |
| Background | `#0a0a0a` |
| Left phone center | `(480, 540)` — left quarter |
| Right phone center | `(1440, 540)` — right quarter |
| Center channel (960px wide) | Used for callouts + section cards |
| Phone frame size | 380×820px |
| Brand green | `#06C167` |
| Brand orange | `#F2994A` |
| Brand gold | `#FFD700` |

The 960px center channel between the phones is used for: callouts that span both phones (`side: 'center'`), section card text, and the title/end card content.

### Render & Output

```bash
cd apps/dollor-video
npm run build    # type-check
npm run render   # outputs out/dollor-demo.mp4
```

**Output spec:** H.264, AAC (silent), MP4 container, 1920×1080, 30fps. Remotion render config:
```ts
// remotion.config.ts
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(18);  // high quality, ~50-80MB for 2:20
```

**Delivery:** Attach `dollor-demo.mp4` to App Store Connect review notes or upload to S3 and share the URL.

---

## Callout Schedule

| Scene | Frame (abs) | Text | Side | Color |
|-------|-------------|------|------|-------|
| 3 | 390 (0:13) | "Apple Restaurant — demo account" | left | #06C167 |
| 4 | 780 (0:26) | "New order received" | left | #06C167 |
| 4 | 930 (0:31) | "Assigned to driver pool" | center | #06C167 |
| 4 | 1080 (0:36) | "Driver notified in real time" | right | #F2994A |
| 5 | 1350 (0:45) | "Driver accepts delivery" | right | #F2994A |
| 5 | 1590 (0:53) | "Delivery completed ✓" | right | #F2994A |
| 7 | 2430 (1:21) | "New order received" | left | #06C167 |
| 7 | 2580 (1:26) | "Direct assignment — no bidding" | center | #06C167 |
| 7 | 2700 (1:30) | "Driver assigned directly" | right | #F2994A |
| 8 | 3000 (1:40) | "Driver accepts" | right | #F2994A |
| 8 | 3300 (1:50) | "Delivery completed ✓" | right | #F2994A |

---

## Dependencies

- `remotion` + `@remotion/renderer` (match version in `apps/offerletter-video/package.json`)
- `ffmpeg` — simulator `.mov` → `.mp4` conversion + audio strip
- No new cloud infrastructure — render locally, deliver manually

---

*Spec revised after review: 2026-03-22*
