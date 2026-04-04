---
phase: quick-267
plan: 01
subsystem: zietra-meet-frontend
tags: [avatar, camera-settings, video-grid, device-picker, css]
dependency_graph:
  requires: []
  provides: [gradient-initials-avatars, camera-settings-panel]
  affects: [VideoGrid.tsx, DevicePickerModal.tsx, useDevicePicker.ts, app.css, CallScreen.tsx]
tech_stack:
  added: []
  patterns: [deterministic-hash-gradient, getUserMedia-constraints, CSS-filter-live-preview]
key_files:
  created: []
  modified:
    - apps/zoom/frontend/src/components/VideoGrid.tsx
    - apps/zoom/frontend/src/components/DevicePickerModal.tsx
    - apps/zoom/frontend/src/hooks/useDevicePicker.ts
    - apps/zoom/frontend/src/styles/app.css
    - apps/zoom/frontend/src/components/CallScreen.tsx
decisions:
  - "Used deterministic hash (h*31+charCode, mod 8) for stable per-name gradient assignment"
  - "onSave() is a no-op in CallScreen since localVideoRef does not exist there; cssFilter is exposed from useDevicePicker for future VideoGrid integration"
metrics:
  duration: "~2 minutes"
  completed: "2026-04-03"
  tasks_completed: 2
  files_modified: 5
---

# Phase quick-267 Plan 01: Upgraded Avatars and Camera Settings Summary

**One-liner:** Google Meet-style deterministic gradient initials avatars for all video tiles + DevicePickerModal expanded with live camera preview, resolution/fps pickers, and brightness/contrast/blur controls wired to useDevicePicker state.

## What Was Built

### Task 1: Gradient Initials Avatars in VideoGrid (commit: 304cb944)

Added two pure helper functions above the `VideoTile` component in `VideoGrid.tsx`:

- `getAvatarStyle(name)` — computes a stable hash (`h * 31 + charCode`) mod 8 to select from 8 rich two-color linear-gradient presets. Returns an inline `React.CSSProperties` object applied to `.tile-placeholder`.
- `getInitials(name)` — splits on whitespace, takes first char of each word, returns up to 2 uppercase chars.

Replaced the old `<div className="avatar">{name.charAt(0)}</div>` with `<span className="avatar-initials">{getInitials(name)}</span>` inside a `.tile-placeholder.avatar-tile` div that receives the gradient via inline style.

Added `.avatar-tile` and `.avatar-initials` CSS rules to `app.css` (existing `.tile-placeholder` and `.avatar` rules untouched).

### Task 2: Camera Settings Panel with Live Preview (commit: 5e60ba45)

**useDevicePicker.ts** expanded:
- New state: `resolution` (360p/720p/1080p), `fps` (15/30/60), `brightness`, `contrast`, `blurEnabled`
- `getVideoConstraints(deviceId, res, fps)` maps to `MediaTrackConstraints` with ideal width/height/frameRate
- `cssFilter` computed string combining brightness/contrast/blur(4px)
- All new values returned from hook

**DevicePickerModal.tsx** fully replaced:
- Accepts all new props from the hook
- `useRef<HTMLVideoElement>` + `useEffect` for live camera preview — calls `getUserMedia` with current constraints, assigns to `previewRef.current.srcObject`, cleans up tracks on unmount or when `selectedVideoId`/`resolution`/`fps` change
- Live `<video>` element with `style={{ filter: cssFilter }}` rendered conditionally when `selectedVideoId` is set
- Controls added: Resolution `<select>`, Frame Rate `<select>`, Brightness `<input type="range">`, Contrast `<input type="range">`, Blur `<input type="checkbox">`, Save `<button>`

**CallScreen.tsx** updated to pass all new props to `DevicePickerModal` from `devices` (the useDevicePicker return).

**app.css** additions: `.camera-preview`, `.settings-row`, `.settings-row label/input[range]/.range-val/input[checkbox]`, `.settings-save-btn`, `.device-modal` max-height override.

## Verification

- Build: `tsc && vite build` — zero TypeScript errors, 189 kB JS bundle
- `getAvatarStyle`, `getInitials` present in VideoGrid.tsx at lines 16, 22
- `avatar-initials`, `avatar-tile` CSS in app.css at lines 323, 320
- `camera-preview`, `settings-save-btn` CSS in app.css at lines 924, 961
- `resolution`, `fps`, `cssFilter` exported from useDevicePicker.ts
- `previewRef`, `onSave`, `onResolutionChange` in DevicePickerModal.tsx

## Decisions Made

1. **Deterministic hash:** Used polynomial rolling hash (`h * 31 + charCode | 0`) for stable gradient assignment — same name always gets the same color across page reloads.
2. **onSave no-op:** Since `CallScreen.tsx` has no direct `localVideoRef` (the local video element lives inside `VideoGrid` → `VideoTile`), `onSave` is a stub. The `cssFilter` string is already exported from `useDevicePicker` — a future task can thread it into `VideoGrid` as a prop to apply to the local tile's `<video>` element.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `304cb944` exists: confirmed (git log)
- `5e60ba45` exists: confirmed (git log)
- `VideoGrid.tsx` modified: confirmed (getAvatarStyle, getInitials, avatar-tile)
- `DevicePickerModal.tsx` modified: confirmed (previewRef, camera-preview, settings-row)
- `useDevicePicker.ts` modified: confirmed (resolution, fps, cssFilter, getVideoConstraints)
- `app.css` modified: confirmed (avatar-initials, camera-preview, settings-save-btn)
- `CallScreen.tsx` modified: confirmed (new props passed to DevicePickerModal)
- Build: PASSED (zero TS errors)
- Pushed to origin/main: confirmed
