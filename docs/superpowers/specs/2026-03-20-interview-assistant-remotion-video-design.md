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
Step card transition. Mock Finder window opens showing Downloads folder with "Interview Assistant.dmg". DMG mounts — window shows app icon + Applications folder shortcut. App icon animates dragging to Applications. "Apple notarized ✓" green badge fades in. Double-click launches app.

**Scene 3 — Allow Microphone (15s)**
macOS permission dialog slides in from top (spring animation). Mic icon pulses. "Allow" button clicks (cursor animates to it). Animated waveform bars appear. "AI can hear you ✓" confirmation.

**Scene 4 — AI Overlay Appears (20s)**
Mock desktop with Zoom call in background (blurred participant boxes). Interview Assistant floating window fades in with spring. ⌘⇧H hotkey typed on-screen — overlay blinks hidden then reappears. "Invisible to screen share" label animates in. Drag animation moves overlay across screen.

**Scene 5 — Live AI Coaching — Hero Scene ⭐ (40s)**
Split: mock Zoom call (interviewer asking question) + AI overlay in corner. Manual mode: cursor clicks text box, "Tell me about yourself" types in via typewriter animation. AI answer streams in word-by-word. Second question auto-detected via mic waveform (BlackHole mode). Answer appears instantly. Callout: "~3 second response."

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
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "typescript": "^5.0.0"
}
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
| `typewriter.ts` | AI answer reveals character-by-character |
| Waveform bars | Animated mic capture indicator (interpolate on height) |
| `useCurrentFrame()` | Frame-driven cursor movement paths |

---

## Delivery

1. `npx remotion render src/Root.tsx InterviewWalkthrough out/interview-walkthrough.mp4`
2. Upload `out/interview-walkthrough.mp4` to S3 bucket `offerletter.ai` at `/video/interview-walkthrough.mp4`
3. Embed on `interview.html` above the setup steps via `<video>` tag with poster image
4. Upload to YouTube for social/ads link

---

## Visual Design

- **Background:** Dark (`#0F172A`) for mock desktop scenes, white for step cards
- **Brand colors:** Blue `#2563EB` (primary), Orange `#F97316` (CTA), matching offerletter.ai
- **Typography:** Plus Jakarta Sans — same as the website
- **Mock UI style:** Flat, clean macOS-inspired chrome — not pixel-perfect, but clearly recognizable
- **Callout labels:** Small pill badges in brand colors, spring entrance, appear after action completes

---

## Out of Scope

- Voiceover / narration
- Real screen recordings
- Remotion Lambda (cloud rendering)
- Captions / subtitles (can be added later)
- Multiple language versions
