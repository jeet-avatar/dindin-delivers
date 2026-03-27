---
phase: quick-245
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/frontend/src/App.tsx
  - apps/mixmind/frontend/src/components/TrackTable.tsx
  - apps/mixmind/frontend/src/components/MiniPlayer.tsx
  - apps/mixmind/frontend/src/components/CamelotWheel.tsx
autonomous: true
requirements: [Q-245]
must_haves:
  truths:
    - "When a track is playing, library rows with compatible Camelot keys show green left-border highlight"
    - "Rows for tracks already played this session are dimmed (opacity ~0.45)"
    - "A 'compatible tracks' info bar appears above the table showing count of compatible tracks"
    - "Clicking the Camelot key badge in MiniPlayer opens the CamelotWheel SVG popup"
    - "CamelotWheel shows 12x2 slices (A inner/minor, B outer/major) with current key bright and compatible keys highlighted"
    - "Clicking outside CamelotWheel closes it"
  artifacts:
    - path: "apps/mixmind/frontend/src/components/CamelotWheel.tsx"
      provides: "SVG Camelot wheel popup component"
      min_lines: 80
    - path: "apps/mixmind/frontend/src/App.tsx"
      provides: "playedIds Set + compatibleKeys state + CamelotWheel wiring"
    - path: "apps/mixmind/frontend/src/components/TrackTable.tsx"
      provides: "Compatible row highlighting + played dimming + compat info bar"
    - path: "apps/mixmind/frontend/src/components/MiniPlayer.tsx"
      provides: "Clickable Camelot badge that opens wheel"
  key_links:
    - from: "App.tsx"
      to: "/api/library/compatible/{camelot}"
      via: "sidecarGet in useEffect on nowPlaying change"
      pattern: "sidecarGet.*compatible"
    - from: "App.tsx"
      to: "TrackTable"
      via: "playedIds, compatibleKeys, nowPlayingId props"
      pattern: "playedIds=|compatibleKeys=|nowPlayingId="
    - from: "MiniPlayer"
      to: "CamelotWheel"
      via: "onOpenCamelotWheel callback -> showCamelotWheel state in App"
      pattern: "onOpenCamelotWheel"
---

<objective>
Add three DJ performance features to MixMind: (1) compatible track highlighting in TrackTable when a track is playing, using the existing `/api/library/compatible/{camelot}` sidecar endpoint, (2) session played history tracking via a `Set<string>` of content_ids in App state that dims already-played rows, and (3) a CamelotWheel SVG popup component showing the 12-position wheel with current + compatible keys highlighted, triggered from MiniPlayer's key badge.

Purpose: These features help DJs quickly identify what to play next by visually surfacing harmonic compatibility and avoiding replaying tracks during a session.
Output: Updated App.tsx, TrackTable.tsx, MiniPlayer.tsx, and new CamelotWheel.tsx.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/mixmind/frontend/src/App.tsx
@apps/mixmind/frontend/src/components/TrackTable.tsx
@apps/mixmind/frontend/src/components/MiniPlayer.tsx
@apps/mixmind/frontend/src/types/track.ts
@docs/superpowers/plans/2026-03-27-mixmind-dj-complete.md (Chunk 5: Q-245 section, lines 1218-1550)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add playedIds/compatibleKeys state to App.tsx + create CamelotWheel.tsx + wire MiniPlayer trigger</name>
  <files>
    apps/mixmind/frontend/src/App.tsx
    apps/mixmind/frontend/src/components/CamelotWheel.tsx
    apps/mixmind/frontend/src/components/MiniPlayer.tsx
  </files>
  <action>
**App.tsx changes:**

1. Add import: `import { sidecarGet } from './hooks/useSidecar';` and `import { CamelotWheel } from './components/CamelotWheel';`

2. Add state after existing `setTracks` state:
   - `const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());`
   - `const [compatibleKeys, setCompatibleKeys] = useState<string[]>([]);`
   - `const [showCamelotWheel, setShowCamelotWheel] = useState(false);`

3. Add useEffect keyed on `nowPlaying?.content_id` that:
   - Adds `nowPlaying.content_id` to `playedIds` set (using spread into new Set)
   - Calls `sidecarGet<{ compatible: string[] }>('/api/library/compatible/' + nowPlaying.camelot)` and sets `compatibleKeys` from response
   - On error or if `nowPlaying.camelot` is falsy or '?', sets `compatibleKeys` to `[]`

4. Pass new props to TrackTable: `playedIds={playedIds}`, `compatibleKeys={compatibleKeys}`, `nowPlayingId={nowPlaying?.content_id}`

5. Pass `onOpenCamelotWheel={() => setShowCamelotWheel(true)}` to MiniPlayer

6. Render CamelotWheel conditionally: when `showCamelotWheel && nowPlaying`, render `<CamelotWheel currentCamelot={nowPlaying.camelot} compatibleKeys={compatibleKeys} onClose={() => setShowCamelotWheel(false)} />` — place it after the MiniPlayer in JSX.

**CamelotWheel.tsx (NEW file):**

Create `apps/mixmind/frontend/src/components/CamelotWheel.tsx` following the exact spec from the plan doc (lines 1354-1479). Key details:
- Props: `{ currentCamelot: string; compatibleKeys: string[]; onClose: () => void; onSelectKey?: (camelot: string) => void }`
- SVG 240x240 viewBox, cx=120, cy=120, R=100, r=60
- 12 slices clockwise from top (-90 deg), each with inner ring (A/minor, radius r to R-4) and outer ring (B/major, radius R+2 to R+36)
- Current key slice is bright (full color), compatible keys are semi-transparent (`baseColor + '88'`), others are `rgba(255,255,255,0.04)`
- Center circle shows current camelot key text + "now playing" label
- Fixed overlay with `rgba(0,0,0,0.6)` backdrop — clicking backdrop calls `onClose`
- Inner div has `onClick={e => e.stopPropagation()}` to prevent close on wheel click
- Use WHEEL_COLORS map: keys '1'-'12' mapped to the same color palette as CAMELOT_COLORS in TrackTable
- 1-degree gap between slices for visual separation

**MiniPlayer.tsx changes:**

1. Add `onOpenCamelotWheel?: () => void;` to Props interface

2. Destructure it in the component function signature

3. In the track info area (where track.camelot badge is displayed, or add one if missing), make the Camelot key badge clickable:
   ```tsx
   {track.camelot && (
     <span onClick={onOpenCamelotWheel} title="Open Camelot Wheel"
       style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px',
         background: 'rgba(124,58,237,0.15)', color: '#a78bfa', cursor: 'pointer' }}>
       {track.camelot}
     </span>
   )}
   ```
   If the MiniPlayer already displays a camelot badge, just add the onClick handler to it. If not, add this badge near the BPM/title info.
  </action>
  <verify>
`cd /Users/jeet/doordash-p2p/apps/mixmind/frontend && npx tsc --noEmit 2>&1 | tail -10` — should show 0 errors.
Grep checks:
- `grep -n "playedIds" apps/mixmind/frontend/src/App.tsx` — state + prop pass
- `grep -n "compatibleKeys" apps/mixmind/frontend/src/App.tsx` — state + prop pass + sidecarGet call
- `grep -n "onOpenCamelotWheel" apps/mixmind/frontend/src/components/MiniPlayer.tsx` — prop + onClick
- `wc -l apps/mixmind/frontend/src/components/CamelotWheel.tsx` — should be 80+ lines
  </verify>
  <done>
App.tsx lifts playedIds (Set), compatibleKeys (string[]), and showCamelotWheel state. nowPlaying change triggers sidecarGet to /api/library/compatible/{camelot}. CamelotWheel.tsx renders a 12x2 SVG wheel popup. MiniPlayer has a clickable Camelot badge that opens the wheel. TypeScript compiles with 0 errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add compatible track highlighting + played dimming + compat info bar to TrackTable</name>
  <files>
    apps/mixmind/frontend/src/components/TrackTable.tsx
  </files>
  <action>
1. **Extend Props interface** — add three optional props:
   - `playedIds?: Set<string>;`
   - `compatibleKeys?: string[];`
   - `nowPlayingId?: string;`

2. **Destructure new props** in the component function.

3. **Add compatible tracks info bar** — between the genre filter chips section and the column headers, render a conditional bar:
   ```tsx
   {compatibleKeys && compatibleKeys.length > 0 && (
     <div style={{
       padding: '5px 20px', fontSize: '11px', color: '#34d399',
       background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.12)',
       flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
     }}>
       <span style={{ fontSize: '9px' }}>&#10003;</span>
       Showing {filtered.filter(t => compatibleKeys.includes(t.camelot)).length} compatible tracks
       {nowPlayingId && (() => { const np = tracks.find(t => t.content_id === nowPlayingId); return np ? ` for ${np.camelot}` : ''; })()}
     </div>
   )}
   ```

4. **Modify virtual row rendering** — inside the `rowVirtualizer.getVirtualItems().map()` callback, after `const t = sorted[vRow.index];` and `const isPlaying = ...`:

   Compute highlight state:
   ```typescript
   const isPlayed = playedIds?.has(t.content_id) ?? false;
   const isCompatible = compatibleKeys && compatibleKeys.length > 0
     ? compatibleKeys.includes(t.camelot)
     : false;
   const isNowPlaying = t.content_id === nowPlayingId;
   ```

   Update the row div's inline style:
   - `background`: if `isNowPlaying` -> `'rgba(124,58,237,0.1)'`, else if `isCompatible` -> `'rgba(16,185,129,0.06)'`, else `'transparent'`
   - `borderLeft`: if `isNowPlaying` -> `'2px solid #a78bfa'`, else if `isCompatible` -> `'2px solid rgba(16,185,129,0.4)'`, else `'2px solid transparent'`
   - `opacity`: if `isPlayed && !isNowPlaying` -> `0.45`, else `1`

   Update mouse enter/leave to respect isNowPlaying AND isCompatible (don't reset compatible background on mouse leave).

5. **Enhance Key badge column** — wrap the `<KeyBadge>` in a div that also shows a green checkmark when `isCompatible && !isNowPlaying`:
   ```tsx
   <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
     <KeyBadge camelot={t.camelot} />
     {isCompatible && !isNowPlaying && (
       <span style={{ fontSize: '9px', color: '#34d399' }}>&#10003;</span>
     )}
   </div>
   ```

6. **Add "played" label** on played rows — in the actions column area or as an overlay, show a small "played" text for `isPlayed && !isNowPlaying`:
   ```tsx
   {isPlayed && !isNowPlaying && (
     <span style={{ fontSize: '9px', color: '#374151', fontWeight: 500 }}>played</span>
   )}
   ```
   Place this in the actions cell, before the "+ Set" button.
  </action>
  <verify>
`cd /Users/jeet/doordash-p2p/apps/mixmind/frontend && npx tsc --noEmit 2>&1 | tail -10` — 0 errors.
`cd /Users/jeet/doordash-p2p/apps/mixmind/frontend && npm run build 2>&1 | tail -5` — build succeeds.
Grep checks:
- `grep -n "isCompatible" apps/mixmind/frontend/src/components/TrackTable.tsx` — row highlight logic
- `grep -n "isPlayed" apps/mixmind/frontend/src/components/TrackTable.tsx` — played dimming logic
- `grep -n "compatibleKeys" apps/mixmind/frontend/src/components/TrackTable.tsx` — info bar + row logic
  </verify>
  <done>
TrackTable accepts playedIds, compatibleKeys, nowPlayingId props. Compatible rows show green left border + subtle green background. Played rows are dimmed to 0.45 opacity with "played" label. A green info bar shows compatible track count when a track is playing. Key badge shows green checkmark on compatible rows. TypeScript and Vite build both pass.
  </done>
</task>

</tasks>

<verification>
1. `cd /Users/jeet/doordash-p2p/apps/mixmind/frontend && npm run build` — full Vite build passes
2. `grep -rn "sidecarGet.*compatible" apps/mixmind/frontend/src/App.tsx` — confirms API wiring
3. `grep -rn "playedIds" apps/mixmind/frontend/src/App.tsx apps/mixmind/frontend/src/components/TrackTable.tsx` — confirms state flow
4. `grep -rn "CamelotWheel" apps/mixmind/frontend/src/App.tsx apps/mixmind/frontend/src/components/CamelotWheel.tsx` — confirms component exists and is imported
5. `grep -rn "onOpenCamelotWheel" apps/mixmind/frontend/src/components/MiniPlayer.tsx apps/mixmind/frontend/src/App.tsx` — confirms wheel trigger wiring
</verification>

<success_criteria>
- Compatible track rows show green highlight when a track is playing (using /api/library/compatible/{camelot} data)
- Previously played tracks are dimmed in the library view (session-only, React state)
- CamelotWheel SVG popup opens from MiniPlayer key badge click, showing 12x2 wheel with current + compatible keys
- All TypeScript compiles with 0 errors, Vite build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/245-add-compatible-track-highlighting-sessio/245-SUMMARY.md`
</output>
