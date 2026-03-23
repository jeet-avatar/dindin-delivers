# Dollor.ai Restaurant & Driver Demo Video — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 2:20 Remotion video at `apps/dollor-video/` that composites real Xcode Simulator screen recordings of the Restaurant and Driver apps inside dual iPhone 15 Pro frames for Apple reviewer submission.

**Architecture:** New standalone Remotion project (approach C from brainstorm). `<Series>` timeline with 7 sequence slots: title card, 2× section cards, 3× `DualPhoneScene` instances, end card. `DualPhoneScene` is a parameterized component used for all three recording pairs (R1/D1, R2/D2, R3/D3). Phone frames are pure CSS/div (no SVG foreignObject) so Remotion's Chromium renderer clips video reliably. Recordings land in `public/recordings/` and are referenced via Remotion's `staticFile()`.

**Tech Stack:** Remotion 4.x, React 18, TypeScript 5, ffmpeg (CLI, for `.mov`→`.mp4` conversion)

---

## File Map

| File | Role |
|------|------|
| `apps/dollor-video/package.json` | Remotion 4.x dependencies + render scripts |
| `apps/dollor-video/tsconfig.json` | TypeScript config (extends strict, JSX react) |
| `apps/dollor-video/remotion.config.ts` | Output format: JPEG frames, quality 95 |
| `apps/dollor-video/src/Root.tsx` | Registers `DollorDemo` composition (1920×1080, 30fps, 4200 frames) |
| `apps/dollor-video/src/Video.tsx` | Main `<Series>` timeline — all 7 sequences wired up with clip paths + callout configs |
| `apps/dollor-video/src/scenes/TitleCard.tsx` | Intro (variant=intro) and end card (variant=end) |
| `apps/dollor-video/src/scenes/SectionCard.tsx` | Flow divider card — "Flow 1 — Pool Delivery" / "Flow 2 — Direct Delivery" |
| `apps/dollor-video/src/scenes/DualPhoneScene.tsx` | Reusable dual-phone layout: left phone + right phone + callouts[] |
| `apps/dollor-video/src/components/IPhoneFrame.tsx` | iPhone 15 Pro frame: dark bezel, Dynamic Island, clips children via CSS overflow:hidden |
| `apps/dollor-video/src/components/PhoneVideo.tsx` | `<OffthreadVideo>` inside phone frame with freeze-at-frame support |
| `apps/dollor-video/src/components/Callout.tsx` | Animated text badge: spring in from bottom, hold, spring out |
| `apps/dollor-video/src/utils/spring.ts` | Copied from `apps/offerletter-video/src/animations/spring.ts` |
| `apps/dollor-video/src/utils/typewriter.ts` | Copied from `apps/offerletter-video/src/animations/typewriter.ts` |
| `apps/dollor-video/public/recordings/` | R1.mp4–R3.mp4, D1.mp4–D3.mp4 (added manually after recording) |
| `apps/dollor-video/public/logo.svg` | Dollor.ai gold $ logo |

---

## Chunk 1: Project Scaffold + Utility Files + Primitive Components

### Task 1: Create project scaffold

**Files:**
- Create: `apps/dollor-video/package.json`
- Create: `apps/dollor-video/tsconfig.json`
- Create: `apps/dollor-video/remotion.config.ts`

- [ ] **Step 1: Create `apps/dollor-video/package.json`**

```json
{
  "name": "dollor-video",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "npx remotion studio",
    "render": "npx remotion render src/Root.tsx DollorDemo out/dollor-demo.mp4 --codec=h264 --crf=18",
    "typecheck": "npx tsc --noEmit"
  },
  "dependencies": {
    "remotion": "^4.0.0",
    "@remotion/cli": "^4.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

- [ ] **Step 2: Create `apps/dollor-video/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/dollor-video/remotion.config.ts`**

```ts
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
```

- [ ] **Step 4: Create output and public directories**

```bash
mkdir -p apps/dollor-video/out apps/dollor-video/public/recordings apps/dollor-video/src/scenes apps/dollor-video/src/components apps/dollor-video/src/utils apps/dollor-video/src/assets
```

- [ ] **Step 5: Install dependencies**

```bash
cd apps/dollor-video && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/dollor-video/package.json apps/dollor-video/tsconfig.json apps/dollor-video/remotion.config.ts
git commit -m "feat(video): scaffold dollor-video Remotion project"
```

---

### Task 2: Copy and verify utility files

**Files:**
- Create: `apps/dollor-video/src/utils/spring.ts`
- Create: `apps/dollor-video/src/utils/typewriter.ts`

- [ ] **Step 1: Copy spring.ts from offerletter-video**

Create `apps/dollor-video/src/utils/spring.ts` with this content (verified from `apps/offerletter-video/src/animations/spring.ts`):

```ts
import { spring } from "remotion";

/** Spring entrance: returns 0→1 scale/opacity value starting at `from` frame */
export function springEntrance(frame: number, fps: number, from: number = 0): number {
  return spring({
    frame: frame - from,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
    durationInFrames: 30,
  });
}

/** Slide in from bottom: returns translateY offset (px) starting at `from` frame */
export function slideUp(frame: number, fps: number, from: number = 0, distance: number = 60): number {
  const s = springEntrance(frame, fps, from);
  return distance * (1 - s);
}

/** Fade in: returns opacity 0→1 starting at `from` frame over `durationInFrames` */
export function fadeIn(frame: number, from: number = 0, durationInFrames: number = 20): number {
  if (frame < from) return 0;
  return Math.min(1, (frame - from) / durationInFrames);
}

/** Fade out: returns opacity 1→0 starting at `from` frame over `durationInFrames` */
export function fadeOut(frame: number, from: number, durationInFrames: number = 20): number {
  if (frame < from) return 1;
  return Math.max(0, 1 - (frame - from) / durationInFrames);
}

/** Pulse: returns scale that oscillates around 1 */
export function pulse(frame: number, amplitude: number = 0.04, period: number = 60): number {
  return 1 + amplitude * Math.sin((frame / period) * 2 * Math.PI);
}
```

- [ ] **Step 2: Copy typewriter.ts**

Create `apps/dollor-video/src/utils/typewriter.ts`:

```ts
/**
 * charByChar: reveals text character by character.
 */
export function charByChar(text: string, frame: number, charsPerFrame: number = 2): string {
  const chars = Math.floor(frame * charsPerFrame);
  return text.slice(0, Math.min(chars, text.length));
}

/**
 * wordStream: reveals text word by word (simulates AI streaming).
 */
export function wordStream(text: string, frame: number, wordsPerSecond: number = 3): string {
  const words = text.split(" ");
  const wordsPerFrame = wordsPerSecond / 30;
  const count = Math.floor(frame * wordsPerFrame);
  return words.slice(0, Math.min(count, words.length)).join(" ");
}
```

- [ ] **Step 3: Create `public/logo.svg`**

Create `apps/dollor-video/public/logo.svg`:

```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" rx="28" fill="#0a0a0a"/>
  <text x="60" y="90" text-anchor="middle" font-size="88" font-weight="900" fill="#FFD700" font-family="-apple-system, Arial, sans-serif">$</text>
</svg>
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/dollor-video && npx tsc --noEmit
```

Expected: no errors (only utils exist, nothing to compile yet — this should just succeed silently).

- [ ] **Step 5: Commit**

```bash
git add apps/dollor-video/src/utils/ apps/dollor-video/public/logo.svg
git commit -m "feat(video): add spring/typewriter utils and Dollor logo asset"
```

---

### Task 3: Build IPhoneFrame component

**Files:**
- Create: `apps/dollor-video/src/components/IPhoneFrame.tsx`

The iPhone 15 Pro frame uses layered divs (not SVG foreignObject) so Remotion's Chromium renderer clips video correctly via CSS `overflow: hidden`.

Constants (at 380×820px render size):
- Corner radius: 46px
- Screen inset: 5px (bezel thickness)
- Dynamic Island: 116×34px, centered horizontally, 12px from top, pill (rx = 17px)

- [ ] **Step 1: Create `apps/dollor-video/src/components/IPhoneFrame.tsx`**

```tsx
import React from 'react';

const PHONE_W = 380;
const PHONE_H = 820;
const CORNER_R = 46;
const BEZEL = 5;
const SCREEN_W = PHONE_W - BEZEL * 2;
const SCREEN_H = PHONE_H - BEZEL * 2;
const SCREEN_CORNER_R = CORNER_R - 2;
const DI_W = 116;
const DI_H = 34;
const DI_X = (PHONE_W - DI_W) / 2;
const DI_Y = 12;
const DI_R = DI_H / 2;

interface IPhoneFrameProps {
  width?: number;
  height?: number;
  children?: React.ReactNode;
}

export const IPhoneFrame: React.FC<IPhoneFrameProps> = ({
  width = PHONE_W,
  height = PHONE_H,
  children,
}) => {
  const scaleX = width / PHONE_W;
  const scaleY = height / PHONE_H;

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        transform: `scale(${scaleX}, ${scaleY})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Phone bezel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#1c1c1e',
          borderRadius: CORNER_R,
          boxShadow: '0 0 0 1.5px #3a3a3c, 0 24px 64px rgba(0,0,0,0.7)',
        }}
      />

      {/* Screen area — clips video */}
      <div
        style={{
          position: 'absolute',
          left: BEZEL,
          top: BEZEL,
          width: SCREEN_W,
          height: SCREEN_H,
          borderRadius: SCREEN_CORNER_R,
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {children}
      </div>

      {/* Dynamic Island */}
      <div
        style={{
          position: 'absolute',
          left: DI_X,
          top: DI_Y,
          width: DI_W,
          height: DI_H,
          borderRadius: DI_R,
          background: '#000',
          zIndex: 10,
        }}
      />

      {/* Side buttons (decorative) */}
      <div
        style={{
          position: 'absolute',
          right: -3,
          top: 140,
          width: 3,
          height: 72,
          background: '#2c2c2e',
          borderRadius: '0 2px 2px 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: 120,
          width: 3,
          height: 44,
          background: '#2c2c2e',
          borderRadius: '2px 0 0 2px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: 180,
          width: 3,
          height: 44,
          background: '#2c2c2e',
          borderRadius: '2px 0 0 2px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: 240,
          width: 3,
          height: 44,
          background: '#2c2c2e',
          borderRadius: '2px 0 0 2px',
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dollor-video && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dollor-video/src/components/IPhoneFrame.tsx
git commit -m "feat(video): add IPhoneFrame component (iPhone 15 Pro, CSS layers)"
```

---

### Task 4: Build PhoneVideo component

**Files:**
- Create: `apps/dollor-video/src/components/PhoneVideo.tsx`

`PhoneVideo` wraps `<OffthreadVideo>` inside `IPhoneFrame`. Supports `endAt` to freeze the clip at a specific frame using Remotion's `<Freeze>`.

- [ ] **Step 1: Create `apps/dollor-video/src/components/PhoneVideo.tsx`**

```tsx
import React from 'react';
import {Freeze, OffthreadVideo, useCurrentFrame} from 'remotion';
import {IPhoneFrame} from './IPhoneFrame';

interface PhoneVideoProps {
  src: string;
  startFrom?: number;   // skip N frames at start of source clip
  endAt?: number;       // freeze clip at this frame within the composition sequence
  width?: number;
  height?: number;
}

export const PhoneVideo: React.FC<PhoneVideoProps> = ({
  src,
  startFrom = 0,
  endAt,
  width = 380,
  height = 820,
}) => {
  const frame = useCurrentFrame();
  const shouldFreeze = endAt !== undefined && frame >= endAt;

  const videoEl = (
    <OffthreadVideo
      src={src}
      startFrom={startFrom}
      style={{width: '100%', height: '100%', objectFit: 'cover'}}
    />
  );

  return (
    <IPhoneFrame width={width} height={height}>
      {shouldFreeze && endAt !== undefined ? (
        <Freeze frame={endAt}>{videoEl}</Freeze>
      ) : (
        videoEl
      )}
    </IPhoneFrame>
  );
};
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dollor-video && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dollor-video/src/components/PhoneVideo.tsx
git commit -m "feat(video): add PhoneVideo component with freeze-at-frame support"
```

---

### Task 5: Build Callout component

**Files:**
- Create: `apps/dollor-video/src/components/Callout.tsx`

Callout springs in from 20px below its final y position, holds for `duration` frames, then springs out upward. Uses `spring.ts` utilities.

- [ ] **Step 1: Create `apps/dollor-video/src/components/Callout.tsx`**

```tsx
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {slideUp, fadeIn, fadeOut} from '../utils/spring';

export interface CalloutConfig {
  text: string;
  startFrame: number;   // relative to containing sequence frame 0
  duration: number;     // hold frames (spring in/out adds ~10f each)
  side: 'left' | 'right' | 'center';
  color: string;        // left border color
}

// Canvas-absolute positions per side (1920×1080 canvas)
// Left phone center: (480, 540), frame 380×820, bottom at y=950
// Right phone center: (1440, 540), frame 380×820, bottom at y=950
const CALLOUT_X: Record<CalloutConfig['side'], number> = {
  left: 295,    // left edge of left phone (480 - 190 = 290, +5 padding)
  right: 1255,  // left edge of right phone (1440 - 190 = 1250, +5 padding)
  center: 760,  // center channel midpoint (960 - ~200px half-width estimate)
};
const CALLOUT_Y = 870; // near bottom of phone frame

const SPRING_IN = 10;  // frames for entrance animation
const SPRING_OUT = 10; // frames for exit animation

interface CalloutProps extends CalloutConfig {}

export const Callout: React.FC<CalloutProps> = ({
  text,
  startFrame,
  duration,
  side,
  color,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const inStart = startFrame - SPRING_IN;
  const outStart = startFrame + duration;
  const outEnd = outStart + SPRING_OUT;

  // Not visible yet or already gone
  if (frame < inStart || frame > outEnd) return null;

  const opacity =
    frame < startFrame
      ? fadeIn(frame, inStart, SPRING_IN)
      : frame > outStart
      ? fadeOut(frame, outStart, SPRING_OUT)
      : 1;

  const translateY =
    frame < startFrame
      ? slideUp(frame, fps, inStart, 20)
      : frame > outStart
      ? -slideUp(outEnd - frame, fps, 0, 20) // spring out upward
      : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: CALLOUT_X[side],
        top: CALLOUT_Y,
        opacity,
        transform: `translateY(${translateY}px)`,
        background: '#1a1a1a',
        borderLeft: `4px solid ${color}`,
        borderRadius: 6,
        padding: '8px 16px',
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
        zIndex: 20,
        fontFamily: '-apple-system, "SF Pro Text", Arial, sans-serif',
      }}
    >
      {text}
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dollor-video && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dollor-video/src/components/Callout.tsx
git commit -m "feat(video): add Callout animated text badge component"
```

---

## Chunk 2: Scenes + Video Timeline

### Task 6: Build TitleCard scene

**Files:**
- Create: `apps/dollor-video/src/scenes/TitleCard.tsx`

Shows the intro or end card. Variant `intro`: logo + title + subtitle + both phones visible at sides (frozen login screens). Variant `end`: same layout, different text, phones fade out.

- [ ] **Step 1: Create `apps/dollor-video/src/scenes/TitleCard.tsx`**

```tsx
import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {fadeIn, fadeOut} from '../utils/spring';

interface TitleCardProps {
  variant: 'intro' | 'end';
}

export const TitleCard: React.FC<TitleCardProps> = ({variant}) => {
  const frame = useCurrentFrame();

  const opacity = variant === 'intro'
    ? fadeIn(frame, 0, 20)
    : fadeOut(frame, 0, 30);

  const title = variant === 'intro'
    ? 'Restaurant & Driver App Demo'
    : 'Connecting Restaurants & Drivers';

  const subtitle = variant === 'intro'
    ? 'Dollor.ai — How It Works'
    : 'dollor.ai';

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        fontFamily: '-apple-system, "SF Pro Display", Arial, sans-serif',
      }}
    >
      {/* $ Logo */}
      <div
        style={{
          width: 96,
          height: 96,
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={staticFile('logo.svg')}
          style={{width: 96, height: 96}}
          alt="Dollor.ai"
        />
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.5px',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 26,
          fontWeight: 400,
          color: '#888888',
          letterSpacing: '0.5px',
          textAlign: 'center',
        }}
      >
        {subtitle}
      </div>

      {/* Dollor green accent line */}
      <div
        style={{
          width: 64,
          height: 3,
          background: '#06C167',
          borderRadius: 2,
          marginTop: 32,
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dollor-video && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dollor-video/src/scenes/TitleCard.tsx
git commit -m "feat(video): add TitleCard scene (intro + end card variants)"
```

---

### Task 7: Build SectionCard scene

**Files:**
- Create: `apps/dollor-video/src/scenes/SectionCard.tsx`

Full-canvas overlay that divides the two delivery flows. Fades in over 10 frames, holds, fades out over 10 frames.

- [ ] **Step 1: Create `apps/dollor-video/src/scenes/SectionCard.tsx`**

```tsx
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {fadeIn, fadeOut} from '../utils/spring';

interface SectionCardProps {
  flowNumber: number;
  title: string;
  description: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  flowNumber,
  title,
  description,
}) => {
  const frame = useCurrentFrame();

  // 120-frame section card: fade in 10f, hold 100f, fade out 10f
  const opacity =
    frame < 10
      ? fadeIn(frame, 0, 10)
      : frame > 110
      ? fadeOut(frame, 110, 10)
      : 1;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        fontFamily: '-apple-system, "SF Pro Display", Arial, sans-serif',
      }}
    >
      {/* Flow number badge */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '2px',
          color: '#FFD700',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}
      >
        Flow {flowNumber}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.5px',
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        {title}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 400,
          color: '#888888',
          textAlign: 'center',
          maxWidth: 800,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>

      {/* Green accent bar */}
      <div
        style={{
          width: 48,
          height: 3,
          background: '#06C167',
          borderRadius: 2,
          marginTop: 36,
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dollor-video && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dollor-video/src/scenes/SectionCard.tsx
git commit -m "feat(video): add SectionCard flow divider scene"
```

---

### Task 8: Build DualPhoneScene

**Files:**
- Create: `apps/dollor-video/src/scenes/DualPhoneScene.tsx`

The core scene. Renders two `PhoneVideo` instances side by side at canvas positions `(480, 540)` and `(1440, 540)`, plus all callouts. Background is `#0a0a0a`. Phone labels (green/orange) appear at bottom of each phone.

- [ ] **Step 1: Create `apps/dollor-video/src/scenes/DualPhoneScene.tsx`**

```tsx
import React from 'react';
import {staticFile} from 'remotion';
import {PhoneVideo} from '../components/PhoneVideo';
import {Callout, CalloutConfig} from '../components/Callout';

const PHONE_W = 380;
const PHONE_H = 820;

// Phone center positions on 1920×1080 canvas
const LEFT_CENTER_X = 480;
const RIGHT_CENTER_X = 1440;
const CENTER_Y = 530;

// Top-left corner of each phone
const LEFT_X = LEFT_CENTER_X - PHONE_W / 2;   // 290
const LEFT_Y = CENTER_Y - PHONE_H / 2;         // 120
const RIGHT_X = RIGHT_CENTER_X - PHONE_W / 2;  // 1250
const RIGHT_Y = CENTER_Y - PHONE_H / 2;        // 120

interface DualPhoneSceneProps {
  leftClip: string;
  rightClip: string;
  leftStartFrom?: number;
  rightStartFrom?: number;
  leftEndAt?: number;    // freeze left phone at this frame within this sequence
  rightEndAt?: number;
  leftLabel?: string;    // label under left phone, default 'Restaurant'
  rightLabel?: string;   // label under right phone, default 'Driver'
  callouts: CalloutConfig[];
}

export const DualPhoneScene: React.FC<DualPhoneSceneProps> = ({
  leftClip,
  rightClip,
  leftStartFrom = 0,
  rightStartFrom = 0,
  leftEndAt,
  rightEndAt,
  leftLabel = 'Restaurant',
  rightLabel = 'Driver',
  callouts,
}) => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: '#0a0a0a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left phone */}
      <div style={{position: 'absolute', left: LEFT_X, top: LEFT_Y}}>
        <PhoneVideo
          src={leftClip}
          startFrom={leftStartFrom}
          endAt={leftEndAt}
          width={PHONE_W}
          height={PHONE_H}
        />
      </div>

      {/* Left label */}
      <div
        style={{
          position: 'absolute',
          left: LEFT_X,
          top: LEFT_Y + PHONE_H + 14,
          width: PHONE_W,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#06C167',
          fontFamily: '-apple-system, "SF Pro Text", Arial, sans-serif',
        }}
      >
        {leftLabel}
      </div>

      {/* Right phone */}
      <div style={{position: 'absolute', left: RIGHT_X, top: RIGHT_Y}}>
        <PhoneVideo
          src={rightClip}
          startFrom={rightStartFrom}
          endAt={rightEndAt}
          width={PHONE_W}
          height={PHONE_H}
        />
      </div>

      {/* Right label */}
      <div
        style={{
          position: 'absolute',
          left: RIGHT_X,
          top: RIGHT_Y + PHONE_H + 14,
          width: PHONE_W,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#F2994A',
          fontFamily: '-apple-system, "SF Pro Text", Arial, sans-serif',
        }}
      >
        {rightLabel}
      </div>

      {/* Center channel connector line (subtle) */}
      <div
        style={{
          position: 'absolute',
          left: LEFT_X + PHONE_W + 20,
          top: CENTER_Y - 1,
          width: RIGHT_X - (LEFT_X + PHONE_W) - 40,
          height: 1,
          background: 'rgba(255,255,255,0.06)',
        }}
      />

      {/* Callouts */}
      {callouts.map((c, i) => (
        <Callout key={i} {...c} />
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dollor-video && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dollor-video/src/scenes/DualPhoneScene.tsx
git commit -m "feat(video): add DualPhoneScene with dual phones, labels, callouts"
```

---

### Task 9: Wire up Root.tsx and Video.tsx

**Files:**
- Create: `apps/dollor-video/src/Root.tsx`
- Create: `apps/dollor-video/src/Video.tsx`

Total: 4200 frames (140s × 30fps).

Frame layout:
| Sequence | Frames | Duration |
|----------|--------|----------|
| TitleCard (intro) | 180 | 0:00-0:06 |
| SectionCard Flow 1 | 120 | 0:06-0:10 |
| DualPhoneScene R1/D1 | 450 | 0:10-0:25 |
| DualPhoneScene R2/D2 (leftEndAt=900) | 1500 | 0:25-1:15 |
| SectionCard Flow 2 | 150 | 1:15-1:20 |
| DualPhoneScene R3/D3 (leftEndAt=900) | 1500 | 1:20-2:10 |
| TitleCard (end) | 300 | 2:10-2:20 |

- [ ] **Step 1: Create `apps/dollor-video/src/Root.tsx`**

```tsx
import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Video} from './Video';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DollorDemo"
      component={Video}
      durationInFrames={4200}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);
```

- [ ] **Step 2: Create `apps/dollor-video/src/Video.tsx`**

```tsx
import React from 'react';
import {Series, staticFile} from 'remotion';
import {TitleCard} from './scenes/TitleCard';
import {SectionCard} from './scenes/SectionCard';
import {DualPhoneScene} from './scenes/DualPhoneScene';

const FPS = 30;
const R2_FREEZE = 30 * FPS;   // R2/R3 clip freezes at 30s = 900 frames into each DualPhoneScene

export const Video: React.FC = () => {
  return (
    <Series>
      {/* 0:00-0:06 — Title card (intro) */}
      <Series.Sequence durationInFrames={6 * FPS}>
        <TitleCard variant="intro" />
      </Series.Sequence>

      {/* 0:06-0:10 — Section card: Flow 1 */}
      <Series.Sequence durationInFrames={4 * FPS}>
        <SectionCard
          flowNumber={1}
          title="Flow 1 — Pool Delivery"
          description="Apple Restaurant assigns a delivery to the nearest available driver from the pool"
        />
      </Series.Sequence>

      {/* 0:10-0:25 — Restaurant login + driver idle */}
      <Series.Sequence durationInFrames={15 * FPS}>
        <DualPhoneScene
          leftClip={staticFile('recordings/R1.mp4')}
          rightClip={staticFile('recordings/D1.mp4')}
          callouts={[
            {
              text: 'Apple Restaurant — demo account',
              startFrame: 3 * FPS,  // 3s after scene starts
              duration: 3 * FPS,
              side: 'left',
              color: '#06C167',
            },
          ]}
        />
      </Series.Sequence>

      {/* 0:25-1:15 — Pool delivery flow (R2 freezes at 30s, D2 continues) */}
      <Series.Sequence durationInFrames={50 * FPS}>
        <DualPhoneScene
          leftClip={staticFile('recordings/R2.mp4')}
          rightClip={staticFile('recordings/D2.mp4')}
          leftEndAt={R2_FREEZE}
          callouts={[
            {text: 'New order received',           startFrame:  1 * FPS, duration: 3 * FPS, side: 'left',   color: '#06C167'},
            {text: 'Assigned to driver pool',      startFrame:  6 * FPS, duration: 3 * FPS, side: 'center', color: '#06C167'},
            {text: 'Driver notified in real time', startFrame: 11 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
            {text: 'Driver accepts delivery',      startFrame: 20 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
            {text: 'Delivery completed ✓',         startFrame: 28 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
          ]}
        />
      </Series.Sequence>

      {/* 1:15-1:20 — Section card: Flow 2 */}
      <Series.Sequence durationInFrames={5 * FPS}>
        <SectionCard
          flowNumber={2}
          title="Flow 2 — Direct Delivery"
          description="Apple Restaurant assigns a delivery directly to a specific driver"
        />
      </Series.Sequence>

      {/* 1:20-2:10 — Direct delivery flow (R3 freezes at 30s, D3 continues) */}
      <Series.Sequence durationInFrames={50 * FPS}>
        <DualPhoneScene
          leftClip={staticFile('recordings/R3.mp4')}
          rightClip={staticFile('recordings/D3.mp4')}
          leftEndAt={R2_FREEZE}
          callouts={[
            {text: 'New order received',           startFrame:  1 * FPS, duration: 3 * FPS, side: 'left',   color: '#06C167'},
            {text: 'Direct assignment — no bidding', startFrame: 6 * FPS, duration: 3 * FPS, side: 'center', color: '#06C167'},
            {text: 'Driver assigned directly',     startFrame: 11 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
            {text: 'Driver accepts',               startFrame: 20 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
            {text: 'Delivery completed ✓',         startFrame: 30 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
          ]}
        />
      </Series.Sequence>

      {/* 2:10-2:20 — End card */}
      <Series.Sequence durationInFrames={10 * FPS}>
        <TitleCard variant="end" />
      </Series.Sequence>
    </Series>
  );
};
```

- [ ] **Step 3: Add `import React` to Root.tsx** (already there in the above, verify it's present)

- [ ] **Step 4: Typecheck**

```bash
cd apps/dollor-video && npx tsc --noEmit
```

Expected: no errors. If Remotion types complain about `staticFile` return type, it returns `string` — no cast needed.

- [ ] **Step 5: Open Remotion Studio and verify composition loads**

```bash
cd apps/dollor-video && npm run start
```

Expected: browser opens at `http://localhost:3000`, `DollorDemo` composition visible, 4200 frames, 1920×1080. Video will show placeholder/black for phone areas since recordings don't exist yet. Title cards and section cards should render correctly.

- [ ] **Step 6: Commit**

```bash
git add apps/dollor-video/src/Root.tsx apps/dollor-video/src/Video.tsx
git commit -m "feat(video): wire up Root and Video timeline — 4200f, 7 sequences"
```

---

## Chunk 3: Recording Workflow + Render + Deliver

### Task 10: Record simulator clips

**Note:** This task is done by the developer (you), not automated. Follow these steps exactly.

**Setup:** Ensure the Restaurant and Driver apps are running against the **staging** backend (`https://d34u5ixl0bulv4.cloudfront.net`). Open Xcode, launch both simulators on **iPhone 15 Pro** device.

- [ ] **Step 1: Record R1 — Restaurant login**

1. Open Xcode Simulator (iPhone 15 Pro), launch Restaurant app
2. Start on the login screen
3. Press `Cmd+R` in Simulator to start recording
4. Log in with `demo.restaurant@dollor.ai` / `DemoRestaurant2025!`
5. Wait for the Apple Restaurant dashboard to fully load (all items visible)
6. Press `Cmd+R` to stop — Simulator saves `.mov` to Desktop
7. Rename it `R1.mov`

- [ ] **Step 2: Record R2 — Pool delivery assignment**

1. On the Restaurant dashboard, trigger an incoming order (use the demo customer app OR ask backend to create one via the demo setup endpoint: `POST https://d34u5ixl0bulv4.cloudfront.net/api/demo/setup`)
2. Start recording (`Cmd+R`)
3. Show: order notification banner → tap notification → order details screen → tap "Assign to Driver Pool" → confirmation shown
4. Stop recording → rename `R2.mov`

- [ ] **Step 3: Record R3 — Direct delivery assignment**

1. Trigger another incoming order on the dashboard
2. Start recording
3. Show: notification → order details → tap "Assign Driver" or "Select Driver" → choose a specific driver from list → confirm → assignment confirmation
4. Stop → rename `R3.mov`

- [ ] **Step 4: Record D1 — Driver login**

1. Switch to Driver simulator (iPhone 15 Pro)
2. Start recording
3. Log in with `demo.driver@dollor.ai` / `DemoDriver2025!`
4. Wait for idle delivery dashboard
5. Stop → rename `D1.mov`

- [ ] **Step 5: Record D2 — Driver accepts pool delivery**

1. On Driver simulator, idle dashboard visible
2. Start recording
3. From another device/terminal trigger a pool delivery to this driver (R2 must have assigned to pool)
4. Show: push notification arrives → accept delivery → en-route to restaurant → pick up → en-route to customer → mark delivered → completion screen
5. Stop → rename `D2.mov`

- [ ] **Step 6: Record D3 — Driver accepts direct delivery**

1. Same as D2 but this time R3 direct-assigned to this driver
2. Show full flow from notification to completion
3. Stop → rename `D3.mov`

- [ ] **Step 7: Convert all .mov to .mp4 and strip audio**

```bash
cd ~/Desktop

for clip in R1 R2 R3 D1 D2 D3; do
  ffmpeg -i ${clip}.mov -vcodec h264 -acodec aac -y ${clip}_tmp.mp4
  ffmpeg -i ${clip}_tmp.mp4 -an -vcodec copy -y ${clip}.mp4
  rm ${clip}_tmp.mp4
done
```

Expected: 6 `.mp4` files on Desktop, each silent.

- [ ] **Step 8: Move recordings into project**

```bash
mv ~/Desktop/R1.mp4 ~/Desktop/R2.mp4 ~/Desktop/R3.mp4 \
   ~/Desktop/D1.mp4 ~/Desktop/D2.mp4 ~/Desktop/D3.mp4 \
   /Users/jeet/doordash-p2p/apps/dollor-video/public/recordings/
```

- [ ] **Step 9: Add recordings to .gitignore (large binary files)**

Add to `apps/dollor-video/.gitignore`:

```
public/recordings/
out/
node_modules/
```

Create `apps/dollor-video/.gitignore` with that content.

```bash
git add apps/dollor-video/.gitignore
git commit -m "chore(video): ignore recordings, out, node_modules from git"
```

---

### Task 11: Preview and tune in Remotion Studio

- [ ] **Step 1: Open Remotion Studio**

```bash
cd apps/dollor-video && npm run start
```

- [ ] **Step 2: Verify all 7 sequence slots**

Navigate through the timeline and check:
- Frame 0: TitleCard intro — gold $ logo, white title, green accent bar
- Frame 180: SectionCard Flow 1 — gold "Flow 1" badge, white title
- Frame 300: DualPhoneScene R1/D1 — restaurant login on left, driver idle on right
- Frame 750: DualPhoneScene R2/D2 — pool delivery flow
- Frame 2250: SectionCard Flow 2
- Frame 2400: DualPhoneScene R3/D3 — direct delivery flow
- Frame 3900: TitleCard end — fade out

- [ ] **Step 3: Check callout timing**

For R2/D2 sequence (starts at frame 750):
- Scrub to frame 780 → "New order received" callout appears on left
- Scrub to frame 930 → "Assigned to driver pool" appears in center
- Scrub to frame 1080 → "Driver notified in real time" appears on right

If callouts appear too early or late, adjust `startFrame` values in `Video.tsx` and save — Studio hot-reloads.

- [ ] **Step 4: Verify R2 freezes at correct point**

Scrub to frame ~1650 (750 + 900 = 1650) — left phone should freeze while right phone continues.

- [ ] **Step 5: Commit any timing adjustments**

```bash
git add apps/dollor-video/src/Video.tsx
git commit -m "fix(video): tune callout timing after preview"
```

---

### Task 12: Render final video

- [ ] **Step 1: Run render**

```bash
cd apps/dollor-video && npm run render
```

This runs: `npx remotion render src/Root.tsx DollorDemo out/dollor-demo.mp4 --codec=h264 --crf=18`

Expected output:
```
Rendering DollorDemo...
4200 frames
✓ Rendered in ~X minutes
Output: out/dollor-demo.mp4
```

- [ ] **Step 2: Verify output**

```bash
ffprobe apps/dollor-video/out/dollor-demo.mp4 2>&1 | grep -E 'Duration|Video|Audio'
```

Expected:
```
Duration: 00:02:20.xx
Video: h264, 1920x1080, 30 fps
```
No Audio stream (silent).

- [ ] **Step 3: Check file size**

```bash
ls -lh apps/dollor-video/out/dollor-demo.mp4
```

Expected: 40–90 MB (CRF 18 at 1080p 30fps for 2:20).

- [ ] **Step 4: Play and watch the full video**

```bash
open apps/dollor-video/out/dollor-demo.mp4
```

Watch all 2:20 and verify:
- All recordings play correctly
- Callouts appear at the right moments
- R2/R3 freeze correctly when driver takes over
- Title cards and section cards look polished
- No black frames, no crashes

---

### Task 13: Deliver to Downloads

- [ ] **Step 1: Copy to Downloads**

```bash
cp apps/dollor-video/out/dollor-demo.mp4 ~/Downloads/dollor-demo.mp4
```

- [ ] **Step 2: Verify**

```bash
ls -lh ~/Downloads/dollor-demo.mp4
```

Expected: file exists, same size as source.

- [ ] **Step 3: Final commit**

```bash
git add apps/dollor-video/src/
git commit -m "feat(video): complete dollor restaurant+driver demo video for Apple reviewer"
```

---

## Timing Reference

| Time | Frame | Sequence | Notes |
|------|-------|----------|-------|
| 0:00 | 0 | TitleCard intro | |
| 0:06 | 180 | SectionCard Flow 1 | |
| 0:10 | 300 | R1/D1 DualPhone | Callout at frame 390 |
| 0:25 | 750 | R2/D2 DualPhone | Pool delivery flow starts |
| 0:26 | 780 | | "New order received" |
| 0:31 | 930 | | "Assigned to driver pool" |
| 0:36 | 1080 | | "Driver notified" |
| 0:45 | 1350 | | "Driver accepts" |
| 0:53 | 1590 | | R2 freezes at frame 1650 |
| 0:55 | 1650 | | R2 frozen, D2 continues |
| 1:15 | 2250 | SectionCard Flow 2 | |
| 1:20 | 2400 | R3/D3 DualPhone | Direct delivery flow starts |
| 2:10 | 3900 | TitleCard end | |
| 2:20 | 4200 | End | |

---

*Plan written: 2026-03-23*
*Spec: `docs/superpowers/specs/2026-03-22-dollor-restaurant-driver-demo-video-design.md`*
