---
phase: 35-editable-cad-drawings-part-management
plan: 04
subsystem: turion-satellite-frontend
tags: [svg-editor, frontend, cad, audit-tooling]
requires: ["35-01"]
provides:
  - "window.svgEditor.open(svgString,{onSave,onCancel,onRevert?}) — hand-rolled vanilla SVG editor modal"
  - "satelliteApi.del(path) — DELETE helper"
  - "button-audit script now scans/validates .del()/.delete()/.put() calls"
affects:
  - "35-05 (mounts svgEditor on part.html/instance.html)"
  - "35-06 (uses satelliteApi.del; its DELETE calls now audited)"
tech-stack:
  added: []
  patterns: ["no-bundler plain <script> IIFE module", "DOMParser image/svg+xml + XMLSerializer round-trip", "editor UI isolated in <g class='__editor-ui'> stripped on serialize"]
key-files:
  created:
    - /Users/jeet/turion-space-demo/satellite/svg-editor.js
  modified:
    - /Users/jeet/turion-space-demo/satellite/satellite-api.js
    - /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs
decisions:
  - "svg-editor.js takes onSave/onCancel/onRevert callbacks (host-agnostic) instead of importing satelliteApi — the host page wires the PATCH/regenerate calls"
  - "interactive transforms composed onto the element's `transform` attr (pre-multiplied translate/scale/rotate) rather than rewriting geometry — simplest round-trip"
  - "parsererror -> raw <textarea> fallback; structured toolbar buttons disabled in that mode"
metrics:
  duration: ~25m
  tasks: 3
  files: 3
  completed: 2026-05-12
---

# Phase 35 Plan 04: SVG Editor Frontend Plumbing Summary

Hand-rolled the vanilla `svg-editor.js` SVG editor module (no bundler, plain `<script>`), added a `del()` DELETE helper to `satellite-api.js`, and widened the button-audit regex so `.del()/.delete()/.put()` calls are validated against the route allowlist.

## What Was Built

### Task 1 — `satellite/svg-editor.js` (new, 783 lines)
- `window.svgEditor.open(svgString, { onSave, onCancel, onRevert? })` → full-screen modal overlay (`createElement`, appended to `document.body`), injects a one-time `<style>` block (`#__svg-ed-styles`).
- Toolbar (all `addEventListener`, no inline handlers): Select / + Rect / + Line / + Circle / + Ellipse / + Polyline / + Text / Delete / Undo / Redo / [Revert to generated — only if `onRevert` passed] / Save / Cancel.
- Parses `svgString` via `new DOMParser().parseFromString(s, 'image/svg+xml')`; on `parsererror` (or non-`<svg>` root) → shows a warning note + a raw `<textarea>` prefilled with the source (Save = textarea value), and disables the structured tools.
- Otherwise imports the `<svg>` into the canvas, ensures sensible `width`/`height`/`viewBox` (derives from attrs or, once attached, `getBBox()`).
- Editing model works on the **live SVG DOM**:
  - **Select** — click an element → `selectableTarget()` walks up to the nearest `rect/circle/ellipse/line/polyline/polygon/path/text` (never into `.__editor-ui`); draws a dashed selection box + 8 resize handles + 1 rotate handle into a `<g class="__editor-ui">` appended to the SVG. Click empty space → deselect.
  - **Move** — pointerdown on the selected body → track `clientToSvg()` deltas → `transform="translate(dx dy) …existing…"`; pointerup commits a snapshot + redraws handles.
  - **Resize** — drag a handle → scale-about-anchor matrix `translate(anchor) scale(sx,sy) translate(-anchor) …existing…` (anchor = opposite corner/edge); edge handles lock one axis.
  - **Rotate** — drag the rotate handle (above bbox center) → `transform="rotate(deg cx cy) …existing…"`.
  - **Delete** — `Delete`/`Backspace` key (ignored while typing in an input) or the Delete button → `sel.remove()` + snapshot.
  - **Edit text** — double-click a `<text>` → inline `<input>` overlay positioned at the click; Enter commits (`textContent`), Esc cancels.
  - **Add primitive** — a toolbar `+ *` button arms `pendingTool`; the next click-drag on the canvas creates the element via `createElementNS` with sensible defaults (stroke/fill discovered from existing drawing elements, else `#444`/`#cccccc`), appended to the first `<g>` (or the root `<svg>`); snapshot + auto-select.
  - **Properties panel** — floating panel (top-right) listing the selected element's editable attributes per-tag (`x/y/width/height/cx/cy/r/rx/ry/x1..y2/points/d/fill/stroke/stroke-width/font-size/font-family/text-anchor/opacity`) + (for `<text>`) an editable text-content field; `input` updates the element live, `change` commits a snapshot.
  - **Undo/redo** — every committed mutation pushes `serialize()` (an `XMLSerializer` string of the SVG with `.__editor-ui` removed) onto `undoStack` (cap 50, clears `redoStack`). Undo/Redo re-parse the popped string, replace the canvas `<svg>`, re-wire pointer handlers. `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` / `Ctrl/Cmd+Y` bound too.
  - **Editor UI isolation** — `serialize()` clones the SVG, removes `.__editor-ui` and any `data-svged-sel` markers, returns the string.
- **Save** → `onSave(serialize())` (or the textarea value in fallback mode), then close. **Cancel / Esc / overlay backdrop click** → `onCancel?.()` + close. **Revert to generated** (only rendered when `onRevert` passed) → close + `onRevert()`.
- Double-load guard: `if (window.svgEditor) return;` at the top.
- `node --check` clean; `grep -c "onclick="` → 0.

### Task 2 — `satellite/satellite-api.js` (+1 line)
- Added `del: (path) => api(path, { method: 'DELETE' })` to `window.satelliteApi`. The internal `api()` does `res.json()` unconditionally — safe because the new backend DELETE routes return `200 {ok:true}`, not `204`. All existing methods untouched. `node --check` clean.

### Task 3 — `backend/scripts/audit-satellite-buttons.mjs` (in `/Users/jeet/turion-satellite/`)
- Widened `iterApiCalls`'s regex from `/satelliteApi\.(get|post|patch)\s*\(/gi` → `/satelliteApi\.(get|post|patch|put|delete|del)\s*\(/gi` and mapped the captured `DEL` → `DELETE` so those calls match the `DELETE /api/...` allowlist entries `buildRouteAllowlist` already emits (the router-method regex already included `delete`). Nothing else changed.
- `node backend/scripts/audit-satellite-buttons.mjs` → `routes: 74 · onclick: 16 · apiCalls: 67 · violations: 0 · exit 0` (no `.del()` in the frontend yet — 35-06 adds them; the tweak is a no-op against the current frontend, as expected).

## Deviations from Plan

None — plan executed exactly as written. (Tasks 1 and 2 were committed in `turion-space-demo`; Task 3 in `turion-satellite` — both with `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar"`, named-file adds only, NOT pushed — 35-07 owns push + Lambda redeploy + frontend deploy.)

## Verification

- `node --check /Users/jeet/turion-space-demo/satellite/svg-editor.js` → OK
- `node --check /Users/jeet/turion-space-demo/satellite/satellite-api.js` → OK
- `grep -c "onclick=" satellite/svg-editor.js` → 0
- `grep -n "del:" satellite/satellite-api.js` → line 60
- `grep -n "put|delete|del" backend/scripts/audit-satellite-buttons.mjs` → widened regex present
- `node backend/scripts/audit-satellite-buttons.mjs` → `violations: 0`, exit 0
- `svg-editor.js` is 783 lines (> 350 min), exports `window.svgEditor.open`

## Commits

- `d06360c` (turion-space-demo) — feat(35-04): add hand-rolled vanilla SVG editor module (svg-editor.js)
- `4053c0e` (turion-space-demo) — feat(35-04): add satelliteApi.del(path) DELETE helper
- `ab2814b` (turion-satellite) — chore(35-04): widen button-audit iterApiCalls regex to scan .del()/.delete()/.put()

## Self-Check: PASSED
- FOUND: /Users/jeet/turion-space-demo/satellite/svg-editor.js
- FOUND: /Users/jeet/turion-space-demo/satellite/satellite-api.js (del: line 60)
- FOUND: /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs (widened regex)
- FOUND commit d06360c (turion-space-demo)
- FOUND commit 4053c0e (turion-space-demo)
- FOUND commit ab2814b (turion-satellite)
