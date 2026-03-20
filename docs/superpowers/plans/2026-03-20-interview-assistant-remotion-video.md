# Interview Assistant Remotion Video Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a ~2:33 animated walkthrough video for the Interview Assistant macOS app using Remotion 4, render it to MP4, and copy it to the Desktop.

**Architecture:** Standalone Remotion 4 React app at `apps/offerletter-video/`. Eight scene components compose into a full timeline via `<Sequence>` in `Video.tsx`. Six reusable mock-UI components (Finder, ZoomCall, AIOverlay, etc.) and three animation primitives (spring, typewriter, cursor) are shared across scenes. All UI is CSS/React — no real screenshots.

**Tech Stack:** Remotion 4, React 18, TypeScript 5, @remotion/google-fonts, Node 24, npm

---

## Chunk 1: Project scaffold + animation primitives

### Task 1: Scaffold the project

**Files:**
- Create: `apps/offerletter-video/package.json`
- Create: `apps/offerletter-video/tsconfig.json`
- Create: `apps/offerletter-video/remotion.config.ts`
- Create: `apps/offerletter-video/src/Root.tsx` (stub)
- Create: `apps/offerletter-video/src/Video.tsx` (stub)

- [ ] **Step 1: Create the directory**

```bash
mkdir -p apps/offerletter-video/src/scenes apps/offerletter-video/src/ui apps/offerletter-video/src/animations apps/offerletter-video/public apps/offerletter-video/out
```

- [ ] **Step 2: Write package.json**

```json
{
  "name": "offerletter-video",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "npx remotion studio",
    "render": "npx remotion render src/Root.tsx InterviewWalkthrough out/interview-walkthrough.mp4",
    "still": "npx remotion still src/Root.tsx InterviewWalkthrough --frame=90 out/poster.jpg"
  },
  "dependencies": {
    "remotion": "^4.0.0",
    "@remotion/cli": "^4.0.0",
    "@remotion/google-fonts": "^4.0.0",
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

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "ES2020"],
    "jsx": "react-jsx",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write remotion.config.ts**

```ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

- [ ] **Step 5: Write stub Root.tsx**

```tsx
import { Composition } from "remotion";
import { Video } from "./Video";

export const RemotionRoot = () => {
  return (
    <Composition
      id="InterviewWalkthrough"
      component={Video}
      durationInFrames={4600}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

- [ ] **Step 6: Write stub Video.tsx**

```tsx
import React from "react";
import { AbsoluteFill } from "remotion";

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "white", fontSize: 48, fontWeight: 800 }}>Interview Assistant</span>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 7: Install dependencies**

```bash
cd apps/offerletter-video && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 8: Verify Remotion studio launches**

```bash
cd apps/offerletter-video && npx remotion studio --port 3333
```

Open http://localhost:3333 — should show dark screen with "Interview Assistant" text. Stop with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add apps/offerletter-video/ && git commit -m "feat(video): scaffold Remotion project — package.json, tsconfig, config, stub Video"
```

---

### Task 2: Copy brand assets

**Files:**
- Create: `apps/offerletter-video/public/logo.svg` (copied from offerletter.ai favicon)

- [ ] **Step 1: Copy the logo**

```bash
cp /Users/jeet/Downloads/offerletter-ai/favicon.svg apps/offerletter-video/public/logo.svg
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la apps/offerletter-video/public/logo.svg
```

Expected: file present, non-zero size.

---

### Task 3: Write spring.ts animation helpers

**Files:**
- Create: `apps/offerletter-video/src/animations/spring.ts`

- [ ] **Step 1: Write the file**

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

/** Pulse: returns scale that oscillates around 1 (for CTA buttons) */
export function pulse(frame: number, amplitude: number = 0.04, period: number = 60): number {
  return 1 + amplitude * Math.sin((frame / period) * 2 * Math.PI);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/animations/spring.ts && git commit -m "feat(video): spring animation helpers"
```

---

### Task 4: Write typewriter.ts

**Files:**
- Create: `apps/offerletter-video/src/animations/typewriter.ts`

- [ ] **Step 1: Write the file**

```ts
/**
 * charByChar: reveals text character by character.
 * @param text - full string to reveal
 * @param frame - current frame (relative to sequence start)
 * @param charsPerFrame - characters revealed per frame (default 2)
 * @returns partial string visible at this frame
 */
export function charByChar(text: string, frame: number, charsPerFrame: number = 2): string {
  const chars = Math.floor(frame * charsPerFrame);
  return text.slice(0, Math.min(chars, text.length));
}

/**
 * wordStream: reveals text word by word (simulates AI streaming).
 * @param text - full string to reveal
 * @param frame - current frame (relative to sequence start)
 * @param wordsPerSecond - words revealed per second at 30fps (default 3)
 * @returns partial string visible at this frame
 */
export function wordStream(text: string, frame: number, wordsPerSecond: number = 3): string {
  const words = text.split(" ");
  const wordsPerFrame = wordsPerSecond / 30;
  const count = Math.floor(frame * wordsPerFrame);
  return words.slice(0, Math.min(count, words.length)).join(" ");
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/animations/typewriter.ts && git commit -m "feat(video): typewriter animation — charByChar + wordStream"
```

---

### Task 5: Write cursor.ts

**Files:**
- Create: `apps/offerletter-video/src/animations/cursor.tsx`

- [ ] **Step 1: Write the cursor module**

```ts
import React from "react";

export interface Waypoint {
  frame: number;
  x: number;
  y: number;
}

/**
 * moveCursor: linearly interpolates between waypoints.
 * Returns {x, y} position at the given currentFrame.
 */
export function moveCursor(waypoints: Waypoint[], currentFrame: number): { x: number; y: number } {
  if (waypoints.length === 0) return { x: 0, y: 0 };
  if (currentFrame <= waypoints[0].frame) return { x: waypoints[0].x, y: waypoints[0].y };
  if (currentFrame >= waypoints[waypoints.length - 1].frame) {
    const last = waypoints[waypoints.length - 1];
    return { x: last.x, y: last.y };
  }
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (currentFrame >= a.frame && currentFrame <= b.frame) {
      const t = (currentFrame - a.frame) / (b.frame - a.frame);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return { x: 0, y: 0 };
}

/**
 * CursorSVG: renders an animated SVG cursor arrow at the given position.
 * Position is in 1920x1080 canvas coordinates.
 */
export const CursorSVG: React.FC<{ x: number; y: number; opacity?: number }> = ({ x, y, opacity = 1 }) => (
  <svg
    width={16}
    height={24}
    viewBox="0 0 16 24"
    style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none", zIndex: 999 }}
  >
    <path d="M0 0 L0 20 L5 15 L9 23 L11 22 L7 14 L14 14 Z" fill="white" stroke="#1E293B" strokeWidth="1.5" />
  </svg>
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/animations/cursor.tsx && git commit -m "feat(video): cursor animation — moveCursor + CursorSVG"
```

---

## Chunk 2: UI components

### Task 6: StepCard.tsx

**Files:**
- Create: `apps/offerletter-video/src/ui/StepCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from "react";
import { springEntrance, slideUp } from "../animations/spring";

interface StepCardProps {
  num: number;
  title: string;
  frame: number;
  fps: number;
}

/** Numbered step card header that springs in from below */
export const StepCard: React.FC<StepCardProps> = ({ num, title, frame, fps }) => {
  const scale = springEntrance(frame, fps, 0);
  const translateY = slideUp(frame, fps, 0);
  const opacity = Math.min(1, frame / 10);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 20,
      transform: `scale(${scale}) translateY(${translateY}px)`,
      opacity,
      marginBottom: 32,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "#2563EB", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, fontWeight: 800, flexShrink: 0,
      }}>
        {num}
      </div>
      <div style={{ fontSize: 48, fontWeight: 800, color: "#1E293B", lineHeight: 1.1 }}>
        {title}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/ui/StepCard.tsx && git commit -m "feat(video): StepCard UI component"
```

---

### Task 7: MacWindow.tsx

**Files:**
- Create: `apps/offerletter-video/src/ui/MacWindow.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from "react";

interface MacWindowProps {
  title: string;
  width: number;
  height: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/** Generic macOS window chrome — traffic light buttons + title bar */
export const MacWindow: React.FC<MacWindowProps> = ({ title, width, height, children, style }) => (
  <div style={{
    width, height,
    borderRadius: 12, overflow: "hidden",
    boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
    background: "#1E293B", border: "1px solid rgba(255,255,255,0.08)",
    display: "flex", flexDirection: "column",
    ...style,
  }}>
    {/* Title bar */}
    <div style={{
      height: 40, background: "#2D3748",
      display: "flex", alignItems: "center", gap: 8, padding: "0 16px",
      flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E" }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }} />
      <div style={{ flex: 1, textAlign: "center", fontSize: 13, color: "#94A3B8", fontWeight: 600, marginRight: 36 }}>
        {title}
      </div>
    </div>
    {/* Content */}
    <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/ui/MacWindow.tsx && git commit -m "feat(video): MacWindow UI component"
```

---

### Task 8: MacDialog.tsx

**Files:**
- Create: `apps/offerletter-video/src/ui/MacDialog.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from "react";

interface MacDialogProps {
  icon: string;
  title: string;
  message: string;
  allowLabel?: string;
  denyLabel?: string;
  highlightAllow?: boolean;
}

/** macOS system permission dialog */
export const MacDialog: React.FC<MacDialogProps> = ({
  icon, title, message, allowLabel = "Allow", denyLabel = "Don't Allow", highlightAllow = true,
}) => (
  <div style={{
    width: 420, background: "rgba(30,41,59,0.97)",
    backdropFilter: "blur(40px)",
    borderRadius: 16, padding: "28px 28px 22px",
    boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.1)",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
  }}>
    <div style={{ fontSize: 48 }}>{icon}</div>
    <div style={{ fontSize: 17, fontWeight: 700, color: "white", textAlign: "center" }}>{title}</div>
    <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", lineHeight: 1.6 }}>{message}</div>
    <div style={{ display: "flex", gap: 10, marginTop: 8, width: "100%" }}>
      <button style={{
        flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
        background: "transparent", color: "#94A3B8", fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>{denyLabel}</button>
      <button style={{
        flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
        background: highlightAllow ? "#2563EB" : "rgba(255,255,255,0.1)",
        color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
      }}>{allowLabel}</button>
    </div>
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/ui/MacDialog.tsx && git commit -m "feat(video): MacDialog UI component"
```

---

### Task 9: Finder.tsx

**Files:**
- Create: `apps/offerletter-video/src/ui/Finder.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from "react";
import { MacWindow } from "./MacWindow";

interface FinderProps {
  /** 0–1 progress of the drag animation (0 = icon at source, 1 = icon at target) */
  dragProgress: number;
  showBadge?: boolean;
}

/** Mock macOS Finder window showing DMG drag-to-Applications */
export const Finder: React.FC<FinderProps> = ({ dragProgress, showBadge = false }) => {
  const iconX = dragProgress * 560; // moves from 0 to 560px (left to right in window)

  return (
    <MacWindow title="Downloads" width={760} height={420}>
      <div style={{ display: "flex", height: "100%", background: "#1A2332" }}>
        {/* Sidebar */}
        <div style={{ width: 180, background: "#151E2D", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "12px 8px" }}>
          {["Recents", "Applications", "Downloads", "Desktop", "Documents"].map((label, i) => (
            <div key={i} style={{
              padding: "7px 12px", borderRadius: 6, fontSize: 13, color: i === 2 ? "white" : "#64748B",
              background: i === 2 ? "rgba(37,99,235,0.3)" : "transparent",
              marginBottom: 2,
            }}>{label}</div>
          ))}
        </div>

        {/* Main area */}
        <div style={{ flex: 1, padding: 24, position: "relative" }}>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>Downloads</div>

          {/* DMG icon — moves with drag */}
          <div style={{
            position: "absolute", left: 60 + iconX, top: 80,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            transition: "none",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 14, background: "#2563EB",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: dragProgress > 0 ? "0 8px 24px rgba(37,99,235,0.4)" : "none",
            }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#1D4ED8"/>
                <path d="M8 10h16M8 15h10M8 20h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="23" cy="21" r="6" fill="#F97316"/>
                <path d="M21 21l1.5 1.5L25 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", maxWidth: 80 }}>
              Interview Assistant.dmg
            </div>
          </div>

          {/* Applications arrow target */}
          <div style={{ position: "absolute", right: 40, top: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 64, height: 64, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "2px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 28 }}>📁</span>
            </div>
            <div style={{ fontSize: 11, color: "#64748B" }}>Applications</div>
          </div>

          {/* Notarized badge */}
          {showBadge && (
            <div style={{
              position: "absolute", bottom: 16, right: 16,
              background: "#10B981", borderRadius: 20, padding: "6px 14px",
              fontSize: 12, fontWeight: 700, color: "white",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              ✓ Apple notarized
            </div>
          )}
        </div>
      </div>
    </MacWindow>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/ui/Finder.tsx && git commit -m "feat(video): Finder UI component with DMG drag animation"
```

---

### Task 10: ZoomCall.tsx

**Files:**
- Create: `apps/offerletter-video/src/ui/ZoomCall.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from "react";

interface ZoomCallProps {
  speakerPulse?: boolean; // animate speaking ring on interviewer tile
}

/**
 * Mock Zoom call UI.
 * Layout: 2-tile grid — interviewer left 70% width, candidate right 30%.
 * All tiles blurred (filter: blur(4px)) to avoid distraction.
 * Bottom toolbar with mic/camera icons.
 */
export const ZoomCall: React.FC<ZoomCallProps> = ({ speakerPulse = false }) => (
  <div style={{ width: "100%", height: "100%", background: "#1C1C1E", display: "flex", flexDirection: "column" }}>
    {/* Video tiles */}
    <div style={{ flex: 1, display: "flex", gap: 4, padding: 4 }}>
      {/* Interviewer — 70% */}
      <div style={{ flex: 7, background: "#2C2C2E", borderRadius: 10, position: "relative", overflow: "hidden" }}>
        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#374151,#1F2937)", filter: "blur(4px)", transform: "scale(1.05)" }} />
        {speakerPulse && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 10,
            border: "3px solid #10B981",
            boxShadow: "inset 0 0 20px rgba(16,185,129,0.2)",
          }} />
        )}
        <div style={{ position: "absolute", bottom: 10, left: 12, fontSize: 12, color: "white", background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "2px 8px" }}>Interviewer</div>
      </div>

      {/* Candidate — 30% */}
      <div style={{ flex: 3, background: "#2C2C2E", borderRadius: 10, position: "relative", overflow: "hidden" }}>
        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1E3A5F,#0F172A)", filter: "blur(4px)", transform: "scale(1.05)" }} />
        <div style={{ position: "absolute", bottom: 10, left: 12, fontSize: 12, color: "white", background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "2px 8px" }}>You</div>
      </div>
    </div>

    {/* Bottom toolbar */}
    <div style={{ height: 64, background: "#1C1C1E", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      {["🎙️", "📷", "🖥️", "💬", "👥"].map((icon, i) => (
        <div key={i} style={{
          width: 44, height: 44, borderRadius: "50%",
          background: i === 0 ? "#10B981" : "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>{icon}</div>
      ))}
    </div>
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/ui/ZoomCall.tsx && git commit -m "feat(video): ZoomCall UI component — 2-tile grid, speaker pulse, toolbar"
```

---

### Task 11: AIOverlay.tsx

**Files:**
- Create: `apps/offerletter-video/src/ui/AIOverlay.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from "react";

interface AIOverlayProps {
  questionText: string;         // text in the input box (typewriter-driven)
  answerText: string;           // AI response (wordStream-driven)
  showWaveform?: boolean;       // show mic waveform bars
  waveformFrame?: number;       // current frame for waveform animation
}

/** Floating Interview Assistant overlay window */
export const AIOverlay: React.FC<AIOverlayProps> = ({
  questionText, answerText, showWaveform = false, waveformFrame = 0,
}) => {
  const barHeights = [0.4, 0.7, 1.0, 0.6, 0.8, 0.5, 0.9].map((base, i) =>
    base + 0.3 * Math.sin((waveformFrame / 8 + i * 0.7))
  );

  return (
    <div style={{
      width: 340, background: "rgba(15,23,42,0.95)",
      backdropFilter: "blur(20px)",
      borderRadius: 14, overflow: "hidden",
      boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      border: "1px solid rgba(37,99,235,0.4)",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", background: "rgba(37,99,235,0.15)",
        borderBottom: "1px solid rgba(37,99,235,0.2)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#93C5FD" }}>Interview Assistant</span>
        {showWaveform && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end", gap: 2, height: 16 }}>
            {barHeights.map((h, i) => (
              <div key={i} style={{ width: 3, height: 16 * h, background: "#10B981", borderRadius: 2 }} />
            ))}
          </div>
        )}
      </div>

      {/* Question input */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{
          background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px",
          fontSize: 13, color: "#CBD5E1", minHeight: 36,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          {questionText || <span style={{ color: "#475569" }}>Ask a question or speak...</span>}
          {questionText && <span style={{ opacity: 0.5 }}>|</span>}
        </div>
      </div>

      {/* Answer */}
      <div style={{ padding: "12px 14px", minHeight: 80 }}>
        {answerText ? (
          <div style={{ fontSize: 13, color: "#E2E8F0", lineHeight: 1.7 }}>{answerText}</div>
        ) : (
          <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>AI response will appear here...</div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/ui/AIOverlay.tsx && git commit -m "feat(video): AIOverlay UI component — question input, streaming answer, waveform"
```

---

## Chunk 3: Scenes 0–3

### Task 12: TitleCard.tsx

**Files:**
- Create: `apps/offerletter-video/src/scenes/TitleCard.tsx`

- [ ] **Step 1: Write the scene (90 frames = 3s)**

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, staticFile } from "remotion";
import { springEntrance, fadeIn } from "../animations/spring";

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = springEntrance(frame, fps, 0);
  const taglineOpacity = fadeIn(frame, 20, 25);

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24,
    }}>
      <div style={{ transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 80, height: 80 }} />
        <div style={{ fontSize: 72, fontWeight: 800, color: "white", textAlign: "center", lineHeight: 1 }}>
          Interview Assistant
        </div>
        <div style={{ fontSize: 26, color: "rgba(255,255,255,0.8)", opacity: taglineOpacity, textAlign: "center" }}>
          AI that coaches you through every interview.
        </div>
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 24, padding: "8px 24px", fontSize: 16, color: "white", opacity: taglineOpacity }}>
          offerletter.ai
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/scenes/TitleCard.tsx && git commit -m "feat(video): TitleCard scene"
```

---

### Task 13: PurchaseScene.tsx

**Files:**
- Create: `apps/offerletter-video/src/scenes/PurchaseScene.tsx`

- [ ] **Step 1: Write the scene (600 frames = 20s)**

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { StepCard } from "../ui/StepCard";
import { MacWindow } from "../ui/MacWindow";
import { springEntrance, fadeIn } from "../animations/spring";

export const PurchaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = springEntrance(frame, fps, 0);
  const windowSlide = springEntrance(frame, fps, 15);
  // Payment confirmed appears at frame 300 (10s in)
  const confirmOpacity = fadeIn(frame, 300, 20);
  // Redirect pulse at frame 420
  const redirectOpacity = fadeIn(frame, 420, 20);

  return (
    <AbsoluteFill style={{ background: "#F8FAFC", padding: "80px 120px" }}>
      <div style={{ transform: `scale(${cardScale})` }}>
        <StepCard num={1} title="Purchase — $19" frame={frame} fps={fps} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 40, transform: `translateY(${60 * (1 - windowSlide)}px)`, opacity: windowSlide }}>
        <MacWindow title="checkout.stripe.com" width={520} height={340}>
          <div style={{ padding: 28, background: "#0F172A", height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "white" }}>Interview Assistant</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "white" }}>$19.00</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>One-time payment · Use forever</div>

            {/* Fake card form */}
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#64748B" }}>•••• •••• •••• 4242</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#64748B" }}>12/28</div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#64748B" }}>•••</div>
              </div>
            </div>

            {/* Payment confirmed state */}
            <div style={{ opacity: confirmOpacity, background: "#10B981", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>✓</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Payment confirmed — redirecting...</span>
            </div>
          </div>
        </MacWindow>
      </div>

      {/* Callout */}
      <div style={{
        position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
        opacity: redirectOpacity,
        background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12,
        padding: "12px 24px", fontSize: 16, color: "#92400E", fontWeight: 600,
      }}>
        💡 One-time payment — use forever
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/scenes/PurchaseScene.tsx && git commit -m "feat(video): PurchaseScene — Stripe mock checkout"
```

---

### Task 14: DownloadScene.tsx

**Files:**
- Create: `apps/offerletter-video/src/scenes/DownloadScene.tsx`

- [ ] **Step 1: Write the scene (900 frames = 30s)**

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { StepCard } from "../ui/StepCard";
import { Finder } from "../ui/Finder";
import { CursorSVG, moveCursor } from "../animations/cursor";
import { springEntrance, fadeIn } from "../animations/spring";

const CURSOR_PATH = [
  { frame: 30, x: 960, y: 700 },   // starts center-bottom
  { frame: 90, x: 1100, y: 460 },  // moves to download button
  { frame: 180, x: 560, y: 480 },  // moves to DMG icon
  { frame: 500, x: 1100, y: 480 }, // moves to Applications (end of drag)
];

export const DownloadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const finderOpacity = springEntrance(frame, fps, 20);
  // Drag starts at frame 180, ends at frame 500 (10.7s)
  const dragProgress = interpolate(frame, [180, 500], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const showBadge = frame >= 520;
  const cursor = moveCursor(CURSOR_PATH, frame);

  return (
    <AbsoluteFill style={{ background: "#F8FAFC", padding: "80px 120px" }}>
      <StepCard num={2} title="Download & Install" frame={frame} fps={fps} />

      <div style={{ display: "flex", justifyContent: "center", opacity: finderOpacity, transform: `translateY(${30 * (1 - finderOpacity)}px)` }}>
        <Finder dragProgress={dragProgress} showBadge={showBadge} />
      </div>

      <CursorSVG x={cursor.x} y={cursor.y} opacity={frame > 30 ? 1 : 0} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/scenes/DownloadScene.tsx && git commit -m "feat(video): DownloadScene — Finder DMG drag animation"
```

---

### Task 15: MicScene.tsx

**Files:**
- Create: `apps/offerletter-video/src/scenes/MicScene.tsx`

- [ ] **Step 1: Write the scene (450 frames = 15s)**

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { StepCard } from "../ui/StepCard";
import { MacDialog } from "../ui/MacDialog";
import { CursorSVG, moveCursor } from "../animations/cursor";
import { springEntrance, fadeIn } from "../animations/spring";

const CURSOR_PATH = [
  { frame: 0, x: 960, y: 800 },
  { frame: 60, x: 1100, y: 580 }, // cursor reaches Allow button
];

export const MicScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dialogScale = springEntrance(frame, fps, 10);
  const dialogY = -40 * (1 - dialogScale);
  const confirmOpacity = fadeIn(frame, 180, 20);
  // Waveform bars: appear after clicking allow
  const waveformOpacity = fadeIn(frame, 200, 30);
  const cursor = moveCursor(CURSOR_PATH, frame);

  const barHeights = [0.4, 0.8, 1.0, 0.6, 0.9, 0.5, 0.7].map((base, i) =>
    waveformOpacity > 0 ? base + 0.2 * Math.sin((frame / 8 + i * 0.9)) : 0
  );

  return (
    <AbsoluteFill style={{ background: "#F8FAFC", padding: "80px 120px" }}>
      <StepCard num={3} title="Allow Microphone" frame={frame} fps={fps} />

      <div style={{ display: "flex", justifyContent: "center", marginTop: 48, transform: `scale(${dialogScale}) translateY(${dialogY}px)` }}>
        <MacDialog
          icon="🎙️"
          title='"Interview Assistant" would like to access the microphone'
          message="This app needs microphone access to listen to interview questions and generate AI coaching responses in real time."
          allowLabel="Allow"
          denyLabel="Don't Allow"
        />
      </div>

      {/* Waveform + confirmation */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 32, opacity: waveformOpacity }}>
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "16px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 28 }}>
            {barHeights.map((h, i) => (
              <div key={i} style={{ width: 4, height: 28 * h, background: "#10B981", borderRadius: 2 }} />
            ))}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#166534" }}>AI can hear you ✓</span>
        </div>
      </div>

      <CursorSVG x={cursor.x} y={cursor.y} opacity={frame > 10 ? 1 : 0} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/scenes/MicScene.tsx && git commit -m "feat(video): MicScene — microphone permission dialog + waveform"
```

---

## Chunk 4: Scenes 4–7

### Task 16: OverlayScene.tsx

**Files:**
- Create: `apps/offerletter-video/src/scenes/OverlayScene.tsx`

- [ ] **Step 1: Write the scene (600 frames = 20s)**

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ZoomCall } from "../ui/ZoomCall";
import { AIOverlay } from "../ui/AIOverlay";
import { StepCard } from "../ui/StepCard";
import { springEntrance, fadeIn, fadeOut } from "../animations/spring";

export const OverlayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom background fades in first
  const zoomOpacity = fadeIn(frame, 0, 30);
  // Overlay springs in at frame 30
  const overlayScale = springEntrance(frame, fps, 30);

  // ⌘⇧H demo: overlay blinks at frame 200–240 (hidden), reappears at 270
  const overlayOpacity = frame >= 200 && frame <= 270
    ? interpolate(frame, [200, 220, 250, 270], [1, 0, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  // Hotkey badge at frame 180–320
  const hotkeyOpacity = frame >= 180 && frame <= 320 ? fadeIn(frame, 180, 20) : fadeOut(frame, 310, 20);

  // "Invisible to screen share" label appears at frame 340
  const labelOpacity = fadeIn(frame, 340, 25);

  // Drag: overlay moves from top-right (1560,80) toward center-left (80,400) at frame 420–480
  const dragT = interpolate(frame, [420, 480], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const overlayX = interpolate(dragT, [0, 1], [1560, 80]);
  const overlayY = interpolate(dragT, [0, 1], [80, 300]);

  return (
    <AbsoluteFill>
      {/* Zoom background */}
      <div style={{ width: "100%", height: "100%", opacity: zoomOpacity }}>
        <ZoomCall speakerPulse />
      </div>

      {/* AI Overlay */}
      <div style={{
        position: "absolute", left: overlayX, top: overlayY,
        transform: `scale(${overlayScale})`,
        opacity: overlayOpacity,
        transformOrigin: "top right",
      }}>
        <AIOverlay questionText="" answerText="" />
      </div>

      {/* ⌘⇧H hotkey badge */}
      <div style={{
        position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)",
        opacity: hotkeyOpacity,
        background: "rgba(15,23,42,0.9)", borderRadius: 10, padding: "8px 20px",
        fontSize: 18, color: "white", fontWeight: 700, border: "1px solid rgba(255,255,255,0.15)",
      }}>
        ⌘ Shift H — hide / show overlay
      </div>

      {/* Invisible to screen share label */}
      <div style={{
        position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
        opacity: labelOpacity,
        background: "#10B981", borderRadius: 12, padding: "12px 24px",
        fontSize: 16, color: "white", fontWeight: 700,
      }}>
        👁️ Invisible to Zoom &amp; Teams screen share
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/scenes/OverlayScene.tsx && git commit -m "feat(video): OverlayScene — overlay spring, hotkey demo, drag"
```

---

### Task 17: CoachingScene.tsx (hero)

**Files:**
- Create: `apps/offerletter-video/src/scenes/CoachingScene.tsx`

- [ ] **Step 1: Write the scene (1200 frames = 40s)**

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ZoomCall } from "../ui/ZoomCall";
import { AIOverlay } from "../ui/AIOverlay";
import { charByChar, wordStream } from "../animations/typewriter";
import { fadeIn } from "../animations/spring";
import { CursorSVG, moveCursor } from "../animations/cursor";

const AI_ANSWER_1 = "I bring 5+ years of experience in full-stack development with a focus on building scalable systems. At my last role, I led a team that reduced API response times by 60% through strategic caching and database optimization. I thrive in collaborative environments and love turning complex problems into elegant solutions.";
const AI_ANSWER_2 = "My biggest strength is systematic problem-solving. I break down complex challenges into smaller pieces, validate assumptions early, and iterate quickly. This approach helped me deliver a critical payment integration 2 weeks ahead of schedule.";

const CURSOR_PATH = [
  { frame: 0, x: 1500, y: 600 },
  { frame: 20, x: 1540, y: 480 }, // cursor to AI overlay input
];

export const CoachingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sub-sequence: 0-300f manual typewriter, 300-750f AI answer, 750-1050f auto-detect, 1050-1200f 2nd answer
  const question1 = charByChar("Tell me about yourself", frame, 2);
  const answer1 = frame >= 300 ? wordStream(AI_ANSWER_1, frame - 300, 3) : "";

  // Auto-detect mode: show waveform from frame 750
  const showWaveform = frame >= 750;
  const question2 = frame >= 820 ? charByChar("What is your biggest strength?", frame - 820, 3) : "";
  const answer2 = frame >= 1050 ? wordStream(AI_ANSWER_2, frame - 1050, 4) : "";

  // Badges
  const speedBadgeOpacity = fadeIn(frame, 600, 20);
  const autoDetectOpacity = fadeIn(frame, 750, 25);
  const poweredByOpacity = fadeIn(frame, 1100, 30);

  const cursor = moveCursor(CURSOR_PATH, frame);
  const speakerPulse = frame >= 750; // interviewer pulse during auto-detect phase

  return (
    <AbsoluteFill style={{ display: "flex" }}>
      {/* Zoom — left 65% */}
      <div style={{ width: "65%", height: "100%" }}>
        <ZoomCall speakerPulse={speakerPulse} />
      </div>

      {/* Right side — AI Overlay + badges */}
      <div style={{ width: "35%", height: "100%", background: "#0F172A", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <AIOverlay
          questionText={question2 || question1}
          answerText={answer2 || answer1}
          showWaveform={showWaveform}
          waveformFrame={frame}
        />

        {/* ~3 second badge */}
        <div style={{ opacity: speedBadgeOpacity, background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.4)", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#93C5FD", fontWeight: 600 }}>
          ⚡ ~3 second response
        </div>

        {/* Auto-detect badge */}
        {showWaveform && (
          <div style={{ opacity: autoDetectOpacity, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#6EE7B7", fontWeight: 600 }}>
            🎧 Auto-detect mode — no typing needed
          </div>
        )}
      </div>

      {/* "Powered by Claude AI" watermark */}
      <div style={{
        position: "absolute", bottom: 20, right: 20,
        opacity: poweredByOpacity, fontSize: 12, color: "#475569",
      }}>
        Powered by Claude AI
      </div>

      <CursorSVG x={cursor.x} y={cursor.y} opacity={frame < 60 ? 1 : 0} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/scenes/CoachingScene.tsx && git commit -m "feat(video): CoachingScene hero — manual + auto-detect modes, AI streaming"
```

---

### Task 18: BlackHoleScene.tsx

**Files:**
- Create: `apps/offerletter-video/src/scenes/BlackHoleScene.tsx`

- [ ] **Step 1: Write the scene (450 frames = 15s)**

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { springEntrance, fadeIn } from "../animations/spring";

const nodes = [
  { label: "Zoom Call", icon: "📹", color: "#2563EB" },
  { label: "BlackHole 2ch", icon: "🕳️", color: "#7C3AED" },
  { label: "Interview Assistant", icon: "🤖", color: "#F97316" },
];

export const BlackHoleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#0F172A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32 }}>
      <div style={{ fontSize: 16, color: "#64748B", fontWeight: 600, opacity: fadeIn(frame, 0, 20), letterSpacing: 2, textTransform: "uppercase" }}>
        Optional — Hands-Free Audio Mode
      </div>

      {/* Routing diagram */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {nodes.map((node, i) => {
          const nodeOpacity = springEntrance(frame, fps, i * 20);
          const arrowOpacity = i < nodes.length - 1 ? fadeIn(frame, i * 20 + 30, 20) : 0;
          return (
            <React.Fragment key={i}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transform: `scale(${nodeOpacity})`, opacity: nodeOpacity }}>
                <div style={{ width: 96, height: 96, borderRadius: 24, background: node.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, boxShadow: `0 12px 40px ${node.color}55` }}>
                  {node.icon}
                </div>
                <div style={{ fontSize: 14, color: "white", fontWeight: 700, textAlign: "center", maxWidth: 120 }}>{node.label}</div>
              </div>
              {i < nodes.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", margin: "0 20px", opacity: arrowOpacity, marginBottom: 28 }}>
                  <div style={{ width: 80, height: 2, background: "rgba(255,255,255,0.2)" }} />
                  <div style={{ width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "12px solid rgba(255,255,255,0.4)" }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ opacity: fadeIn(frame, 120, 30), fontSize: 20, color: "#94A3B8", textAlign: "center" }}>
        AI listens automatically — <strong style={{ color: "white" }}>no typing needed</strong>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/scenes/BlackHoleScene.tsx && git commit -m "feat(video): BlackHoleScene — audio routing diagram"
```

---

### Task 19: EndCard.tsx

**Files:**
- Create: `apps/offerletter-video/src/scenes/EndCard.tsx`

- [ ] **Step 1: Write the scene (300 frames = 10s)**

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, staticFile } from "remotion";
import { springEntrance, fadeIn, pulse } from "../animations/spring";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = springEntrance(frame, fps, 0);
  const btnScale = pulse(frame);
  const urlOpacity = fadeIn(frame, 30, 25);

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28,
    }}>
      <div style={{ transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 80, height: 80 }} />
        <div style={{ fontSize: 56, fontWeight: 800, color: "white", textAlign: "center" }}>
          Ace your next interview.
        </div>
        <div style={{ transform: `scale(${btnScale})` }}>
          <div style={{
            background: "#F97316", borderRadius: 16, padding: "20px 48px",
            fontSize: 24, fontWeight: 800, color: "white",
            boxShadow: "0 12px 40px rgba(249,115,22,0.4)",
          }}>
            Get Interview Coach — $19
          </div>
        </div>
        <div style={{ opacity: urlOpacity, fontSize: 18, color: "rgba(255,255,255,0.7)" }}>
          offerletter.ai/interview · One-time payment
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/offerletter-video/src/scenes/EndCard.tsx && git commit -m "feat(video): EndCard scene — CTA with pulse animation"
```

---

## Chunk 5: Wire + Render

### Task 20: Wire Video.tsx full timeline

**Files:**
- Modify: `apps/offerletter-video/src/Video.tsx`

Scene start frames (at 30fps):
| Scene | Start frame | Duration |
|-------|-------------|----------|
| TitleCard | 0 | 90 |
| PurchaseScene | 90 | 600 |
| DownloadScene | 690 | 900 |
| MicScene | 1590 | 450 |
| OverlayScene | 2040 | 600 |
| CoachingScene | 2640 | 1200 |
| BlackHoleScene | 3840 | 450 |
| EndCard | 4290 | 300 |
| **Total** | | **4590** |

- [ ] **Step 1: Rewrite Video.tsx**

```tsx
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import { TitleCard } from "./scenes/TitleCard";
import { PurchaseScene } from "./scenes/PurchaseScene";
import { DownloadScene } from "./scenes/DownloadScene";
import { MicScene } from "./scenes/MicScene";
import { OverlayScene } from "./scenes/OverlayScene";
import { CoachingScene } from "./scenes/CoachingScene";
import { BlackHoleScene } from "./scenes/BlackHoleScene";
import { EndCard } from "./scenes/EndCard";

const { fontFamily } = loadFont();

export const Video: React.FC = () => (
  <AbsoluteFill style={{ fontFamily, background: "#0F172A" }}>
    <Sequence from={0} durationInFrames={90} name="TitleCard">
      <TitleCard />
    </Sequence>
    <Sequence from={90} durationInFrames={600} name="Purchase">
      <PurchaseScene />
    </Sequence>
    <Sequence from={690} durationInFrames={900} name="Download">
      <DownloadScene />
    </Sequence>
    <Sequence from={1590} durationInFrames={450} name="Microphone">
      <MicScene />
    </Sequence>
    <Sequence from={2040} durationInFrames={600} name="Overlay">
      <OverlayScene />
    </Sequence>
    <Sequence from={2640} durationInFrames={1200} name="Coaching">
      <CoachingScene />
    </Sequence>
    <Sequence from={3840} durationInFrames={450} name="BlackHole">
      <BlackHoleScene />
    </Sequence>
    <Sequence from={4290} durationInFrames={300} name="EndCard">
      <EndCard />
    </Sequence>
  </AbsoluteFill>
);
```

- [ ] **Step 2: Update durationInFrames in Root.tsx to 4590**

In `apps/offerletter-video/src/Root.tsx`, change:
```tsx
durationInFrames={4600}
```
to:
```tsx
durationInFrames={4590}
```

- [ ] **Step 3: Preview in Remotion studio**

```bash
cd apps/offerletter-video && npx remotion studio --port 3333
```

Open http://localhost:3333. Scrub through all scenes — confirm each renders at the right frame. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add apps/offerletter-video/src/Video.tsx apps/offerletter-video/src/Root.tsx && git commit -m "feat(video): wire full timeline — all 8 scenes via Sequence"
```

---

### Task 21: Render to MP4 and copy to Desktop

**Files:**
- Output: `apps/offerletter-video/out/interview-walkthrough.mp4`
- Output: `~/Desktop/Interview Assistant Walkthrough.mp4`

- [ ] **Step 1: Render the video**

```bash
cd apps/offerletter-video && npx remotion render src/Root.tsx InterviewWalkthrough out/interview-walkthrough.mp4 --concurrency=4
```

Expected: progress bar, then `Rendered 4590 frames. Output written to out/interview-walkthrough.mp4`

Note: render takes ~5–15 minutes depending on machine. `--concurrency=4` parallelizes frame rendering.

- [ ] **Step 2: Export poster frame**

```bash
cd apps/offerletter-video && npx remotion still src/Root.tsx InterviewWalkthrough --frame=90 out/poster.jpg
```

- [ ] **Step 3: Copy to Desktop**

```bash
cp "apps/offerletter-video/out/interview-walkthrough.mp4" ~/Desktop/"Interview Assistant Walkthrough.mp4"
```

- [ ] **Step 4: Open to verify**

```bash
open ~/Desktop/"Interview Assistant Walkthrough.mp4"
```

Expected: video plays in QuickTime, ~2:33 duration, all 8 scenes visible.

- [ ] **Step 5: Commit output references**

```bash
git add apps/offerletter-video/ && git commit -m "feat(video): rendered Interview Assistant walkthrough — 4590 frames, 2:33"
```

---
