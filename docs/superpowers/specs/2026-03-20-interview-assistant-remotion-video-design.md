# Interview Assistant Walkthrough Video — Remotion Design Spec
**Date:** 2026-03-20
**Project:** `apps/offerletter-video/`
**Output:** MP4 embedded on `interview.html` + YouTube/social

---

## Overview

A ~2:33 product walkthrough video for the Interview Assistant macOS app on offerletter.ai. Built with Remotion 4 (React-based video framework). All UI is mocked in React/CSS — no real screenshots required. Renders locally to MP4, delivered via S3 embed + YouTube.

**Style:** Hybrid — numbered step cards (context) + embedded mock UI animations per scene (proof).

---

## Scene Breakdown

| # | Scene | Start | Duration | Type |
|---|-------|-------|----------|------|
| 0 | Title Card | 0:00 | 3s | Branding |
| 1 | Purchase ($19) | 0:03 | 20s | Mock Browser / Stripe |
| 2 | Download & Install DMG | 0:23 | 30s | Mock Finder |
| 3 | Allow Microphone | 0:53 | 15s | Mock macOS Dialog |
| 4 | AI Overlay Appears | 1:08 | 20s | Mock Desktop |
| 5 | Live AI Coaching ⭐ | 1:28 | 40s | Mock Zoom + AI Overlay |
| 6 | BlackHole (Optional) | 2:08 | 15s | Audio Routing Diagram |
| 7 | End Card — CTA | 2:23 | 10s | Branding |

**Total: ~2:33 (4600 frames at 30fps)**

### Scene Details

**Scene 0 — Title Card (3s)**
Logo + tagline animate in with spring entrance. "AI that coaches you through every interview." Blue gradient background matching offerletter.ai brand.

**Scene 1 — Purchase ($19) (20s)**
Step card flies in. Mock browser window showing the offerletter.ai interview page. Download button highlighted with pulse animation. Transitions to mock Stripe checkout. "Payment confirmed ✓" badge appears. Browser mock redirects back with session_id. Callout: "One-time payment — use forever."

**Scene 2 — Download & Install DMG (30s)**
Step card transition. Mock Finder window (600×400px, centered at canvas 960×540) shows Downloads folder. "Interview Assistant.dmg" icon at x≈300, y≈540. Applications folder shortcut at x≈1200, y≈540. App icon spring-animates dragging (300,540)→(1200,540) over 20 frames. "Apple notarized ✓" green badge fades in top-right. Cursor double-tap on icon to launch.

**Scene 3 — Allow Microphone (15s)**
macOS permission dialog slides in from top (spring animation). Mic icon pulses. "Allow" button clicks (cursor animates to it). Animated waveform bars appear. "AI can hear you ✓" confirmation.

**Scene 4 — AI Overlay Appears (20s)**
Mock desktop with Zoom call in background (blurred). Interview Assistant floating window (300×200px) fades in with spring at top-right (x≈1560, y≈80). ⌘⇧H hotkey badge appears — overlay fades out then back in. "Invisible to screen share" label pill animates in below the overlay. Drag animation: overlay moves from (1560,80) → (80,400) over 30 frames (top-right to center-left), demonstrating repositioning.

**Scene 5 — Live AI Coaching — Hero Scene ⭐ (40s)**
Split layout: ZoomCall component left 65% of canvas, AIOverlay component top-right corner. ZoomCall: 2-tile grid (interviewer left tile 70% width, candidate right tile 30%), gray name labels ("Interviewer", "You"), bottom toolbar with mic/camera icons, all tiles blurred via CSS `filter: blur(4px)` except interviewer who has a subtle speaking pulse ring.

Sub-sequence timing (1200 frames total):
- **0–10s (0–300f):** Manual mode — cursor moves to AIOverlay text input, `charByChar("Tell me about yourself", frame, 2)` types question
- **10–25s (300–750f):** `wordStream(aiAnswer, frame, 3)` streams AI answer word-by-word into overlay response area. "~3 sec" badge fades in.
- **25–35s (750–1050f):** Mic waveform bars animate in AIOverlay header. Callout label: "🎧 Auto-detect mode — no typing needed". Second question appears in text box automatically via `charByChar`.
- **35–40s (1050–1200f):** Second AI answer streams. "Powered by Claude AI" watermark fades in bottom-right.

**Scene 6 — BlackHole Optional (15s)**
Clean audio routing diagram: [Zoom Call] → [BlackHole 2ch] → [Interview Assistant]. Arrows animate. "AI listens automatically — no typing needed." Labeled as optional.

**Scene 7 — End Card (10s)**
offerletter.ai logo. "Get Interview Coach — $19" button pulses with orange CTA color. URL: offerletter.ai/interview. "One-time payment. Use forever."

---

## Architecture

### Location
```
apps/offerletter-video/          ← new package in monorepo
```

### File Structure
```
apps/offerletter-video/
├── src/
│   ├── Root.tsx                 ← Remotion composition entry point
│   ├── Video.tsx                ← Full timeline (all scenes via <Sequence>)
│   ├── scenes/
│   │   ├── TitleCard.tsx
│   │   ├── PurchaseScene.tsx
│   │   ├── DownloadScene.tsx
│   │   ├── MicScene.tsx
│   │   ├── OverlayScene.tsx
│   │   ├── CoachingScene.tsx    ← hero scene, most complex
│   │   ├── BlackHoleScene.tsx
│   │   └── EndCard.tsx
│   ├── ui/                      ← reusable mock UI components
│   │   ├── MacWindow.tsx        ← generic macOS window chrome
│   │   ├── MacDialog.tsx        ← macOS permission dialog
│   │   ├── Finder.tsx           ← mock Finder window
│   │   ├── ZoomCall.tsx         ← mock Zoom call UI
│   │   ├── AIOverlay.tsx        ← floating Interview Assistant window
│   │   └── StepCard.tsx         ← numbered step card (shared header)
│   └── animations/
│       ├── spring.ts            ← spring() wrappers for common entrances
│       └── typewriter.ts        ← character-by-character text reveal
├── public/
│   └── logo.svg                 ← offerletter.ai logo
├── package.json
└── remotion.config.ts
```

### Dependencies
```json
{
  "remotion": "^4.0.0",
  "@remotion/cli": "^4.0.0",
  "@remotion/google-fonts": "^4.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "typescript": "^5.0.0"
}
```

Font loading in `Root.tsx`:
```ts
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
const { fontFamily } = loadFont();
// pass fontFamily to all scene components via a shared constant
```

### Tech Specs
| Property | Value |
|----------|-------|
| Resolution | 1920 × 1080 (16:9) |
| FPS | 30 |
| Duration | ~2:33 (~4600 frames) |
| Output format | MP4 (H.264) |
| Render method | Local — `npx remotion render` |
| Audio | None (text callouts only) |
| Font | Plus Jakarta Sans (matches offerletter.ai) |

---

## Animation Primitives

| Primitive | Usage |
|-----------|-------|
| `spring()` | Element entrances — cards, windows, dialogs |
| `interpolate()` | Fades, slides, progress bars, opacity transitions |
| `<Sequence>` | Per-scene timing and start-frame offsets |
| `typewriter.ts` | Two exports: `charByChar(text, frame, charsPerFrame)` for typed input; `wordStream(text, frame, wordsPerSecond)` for AI answer streaming |
| Waveform bars | Animated mic capture indicator (interpolate on height) |
| `cursor.ts` | Cursor movement between waypoints. Interface: `moveCursor(waypoints: {frame: number, x: number, y: number}[], currentFrame: number) → {x, y}` — linear interpolation between waypoints. Renders as 16×24px SVG arrow pointer absolutely positioned on scene canvas. |

### Cursor waypoint examples
Scene 3 (mic dialog): `[{frame:0, x:960, y:800}, {frame:30, x:1100, y:620}]` — cursor moves from center-bottom to the "Allow" button over 1 second.
Scene 5 (coaching): `[{frame:0, x:800, y:540}, {frame:20, x:960, y:460}]` — cursor moves to AI overlay text input.

---

## Delivery

1. **Render:**
   ```bash
   npx remotion render src/Root.tsx InterviewWalkthrough out/interview-walkthrough.mp4
   ```
2. **Export poster frame** (frame 90 = ~3s, title card fully in):
   ```bash
   npx remotion still src/Root.tsx InterviewWalkthrough --frame=90 out/poster.jpg
   ```
3. **Upload to S3** (served via CloudFront E319UG6B4QE97L):
   ```bash
   aws s3 cp out/interview-walkthrough.mp4 s3://offerletter.ai/video/interview-walkthrough.mp4 --content-type video/mp4
   aws s3 cp out/poster.jpg s3://offerletter.ai/video/poster.jpg --content-type image/jpeg
   aws cloudfront create-invalidation --distribution-id E319UG6B4QE97L --paths "/video/*"
   ```
4. **Public URL:** `https://www.offerletter.ai/video/interview-walkthrough.mp4` (served via CloudFront)
5. **Embed on `interview.html`** above the setup steps:
   ```html
   <video
     src="https://www.offerletter.ai/video/interview-walkthrough.mp4"
     poster="https://www.offerletter.ai/video/poster.jpg"
     controls
     width="100%"
     style="border-radius:12px;max-width:860px;display:block;margin:0 auto 24px;"
   ></video>
   ```
6. **Upload to YouTube** for social/ads — download MP4 from S3 or use `out/interview-walkthrough.mp4` directly.

---

## Visual Design

- **Background:** Dark (`#0F172A`) for mock desktop scenes, white for step cards
- **Brand colors:** Blue `#2563EB` (primary), Orange `#F97316` (CTA), matching offerletter.ai
- **Typography:** Plus Jakarta Sans — same as the website
- **Mock UI style:** Flat, clean macOS-inspired chrome — not pixel-perfect, but clearly recognizable
- **Callout labels:** Small pill badges in brand colors, spring entrance, appear after action completes

---

## remotion.config.ts

```ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// No webpack overrides needed — no SVG imports, no special loaders
```

Composition definition in `Root.tsx`:
```tsx
<Composition
  id="InterviewWalkthrough"
  component={Video}
  durationInFrames={4600}
  fps={30}
  width={1920}
  height={1080}
/>
```

## Out of Scope

- Voiceover / narration
- Real screen recordings
- Remotion Lambda (cloud rendering)
- Captions / subtitles (can be added later)
- Multiple language versions
