---
phase: quick-244
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/frontend/src/components/SetBuilderPanel.tsx
  - apps/mixmind/frontend/src/components/LeftNav.tsx
  - apps/mixmind/frontend/src/components/TrackTable.tsx
  - apps/mixmind/frontend/src/App.tsx
autonomous: true
requirements: [Q-244]

must_haves:
  truths:
    - "Set Builder nav item appears in LeftNav and switches to the SetBuilderPanel"
    - "User can add tracks from TrackTable via a '+ Set' button on each row"
    - "Tracks in Set Builder can be reordered via drag-and-drop"
    - "BPM arc visualization renders above the track list showing BPM progression"
    - "Transition scores (perfect/ok/clash) display between adjacent tracks"
    - "Export CSV button downloads a valid CSV with all set tracks"
    - "Clear button empties the set"
  artifacts:
    - path: "apps/mixmind/frontend/src/components/SetBuilderPanel.tsx"
      provides: "Drag-drop set builder with BPM arc, transition scores, CSV export"
      min_lines: 100
    - path: "apps/mixmind/frontend/src/components/LeftNav.tsx"
      provides: "Set Builder nav entry with track count badge"
    - path: "apps/mixmind/frontend/src/App.tsx"
      provides: "Set state management (add/remove/reorder/clear) and panel wiring"
  key_links:
    - from: "App.tsx"
      to: "SetBuilderPanel.tsx"
      via: "setTracks state + onRemove/onReorder/onClear props"
      pattern: "panel === 'setbuilder'"
    - from: "TrackTable.tsx"
      to: "App.tsx"
      via: "onAddToSet callback prop"
      pattern: "onAddToSet"
    - from: "LeftNav.tsx"
      to: "App.tsx"
      via: "Panel type union includes 'setbuilder'"
      pattern: "setbuilder"
---

<objective>
Build a SetBuilderPanel component for MixMind that lets DJs manually curate a set list with drag-drop reordering, BPM arc visualization, transition quality scores between adjacent tracks, and CSV export. Wire it into the LeftNav and App routing.

Purpose: DJs need a manual set planning tool beyond AI-generated playlists -- drag tracks in, reorder them, see harmonic compatibility at a glance, and export the set.
Output: New SetBuilderPanel.tsx component, updated LeftNav/App/TrackTable wiring.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/mixmind/frontend/src/components/LeftNav.tsx
@apps/mixmind/frontend/src/components/AIChatSidebar.tsx
@apps/mixmind/frontend/src/components/TrackTable.tsx
@apps/mixmind/frontend/src/App.tsx
@apps/mixmind/frontend/src/types/track.ts
@docs/superpowers/plans/2026-03-27-mixmind-dj-complete.md (lines 845-1213, Q-244 spec)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create SetBuilderPanel.tsx and wire Panel type + state into App.tsx</name>
  <files>
    apps/mixmind/frontend/src/components/SetBuilderPanel.tsx
    apps/mixmind/frontend/src/App.tsx
  </files>
  <action>
**1a. Create SetBuilderPanel.tsx** at `apps/mixmind/frontend/src/components/SetBuilderPanel.tsx`.

Follow the complete component code from the spec (docs/superpowers/plans/2026-03-27-mixmind-dj-complete.md lines 940-1125). Key features:

- Props: `tracks: Track[], onRemove: (contentId: string) => void, onReorder: (fromIdx: number, toIdx: number) => void, onClear: () => void`
- Local `camelotScore(a, b)` function (copy logic from AIChatSidebar.tsx lines 16-45 -- do NOT import, it is not exported). Simplified version per spec: handles same key, relative major/minor, +/-1 same letter = 2, wrappedDiff <= 2 = 1, else 0. Unknown/empty = 1.
- `formatDuration(secs)` helper for display.
- `exportCSV()` -- generates CSV with header `title,artist,bpm,camelot,duration,genre,label`, creates Blob, triggers download as `mixmind-set-YYYY-MM-DD.csv`.
- HTML5 drag-and-drop: `draggable` rows, `onDragStart`/`onDragOver`/`onDrop` handlers using `useState<number|null>(null)` for dragIdx and `useRef<number|null>(null)` for dragOverIdx.
- **Header**: shows "Set Builder", track count + total minutes, Export CSV button, Clear button.
- **Empty state**: centered message "Click + Set button on any track row to add it" with a plus icon.
- **BPM arc**: horizontal bar chart (flex row, `alignItems: flex-end`, height 32px). Color: purple <0.4, yellow 0.4-0.7, red >0.7 of normalized BPM range. Show when 2+ tracks.
- **Track list**: each row has drag handle (braille dots), index number, title/artist, camelot badge, BPM, remove (x) button. Between rows, show transition indicator with arrow, key transition, overall score (perfect/ok/clash), and BPM jump %.
- Transition scoring: `score === 2 && bpmJump < 3` = perfect, `score >= 1 && bpmJump < 6` = ok, else clash.
- Colors: perfect=#34d399, ok=#fbbf24, clash=#f87171. Use MixMind CSS variables (--bg-base, --border, --text-primary, --text-secondary, --text-tertiary, etc).

**1b. Update App.tsx**:

- Change Panel type (line 13) to: `type Panel = 'library' | 'playlists' | 'duplicates' | 'usb' | 'setbuilder';`
- Add state: `const [setTracks, setSetTracks] = useState<Track[]>([]);`
- Add functions:
  - `addToSet(track: Track)` -- adds if not already present (check by content_id)
  - `removeFromSet(contentId: string)` -- filters out by content_id
  - `reorderSet(fromIdx: number, toIdx: number)` -- splice-based reorder
- Import SetBuilderPanel, render `{panel === 'setbuilder' && <SetBuilderPanel tracks={setTracks} onRemove={removeFromSet} onReorder={reorderSet} onClear={() => setSetTracks([])} />}` inside main area after usb panel.
- Pass `onAddToSet={addToSet}` to TrackTable.
- Pass `setTrackCount={setTracks.length}` to LeftNav.
  </action>
  <verify>
`cd apps/mixmind/frontend && npx tsc --noEmit 2>&1 | head -20` -- should show no errors related to SetBuilderPanel, App, or type mismatches.
  </verify>
  <done>SetBuilderPanel.tsx exists with drag-drop, BPM arc, transition scores, CSV export. App.tsx has set state management and renders the panel when selected. TypeScript compiles clean.</done>
</task>

<task type="auto">
  <name>Task 2: Add Set Builder to LeftNav and "+ Set" button to TrackTable</name>
  <files>
    apps/mixmind/frontend/src/components/LeftNav.tsx
    apps/mixmind/frontend/src/components/TrackTable.tsx
  </files>
  <action>
**2a. Update LeftNav.tsx**:

- Change Panel type (line 2) to include `'setbuilder'`: `type Panel = 'library' | 'playlists' | 'duplicates' | 'usb' | 'setbuilder';`
- Add `setTrackCount?: number` to Props interface.
- Update function signature to destructure `setTrackCount`.
- Add `setbuilder` entry to `icons` record -- use a music note + list SVG:
  ```
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
    <line x1="6" y1="2" x2="6" y2="15"/>
  </svg>
  ```
- Add a new section label "Tools" (styled like the existing "Library" label at line 69-73) BEFORE the Set Builder item in the items array. To keep things simple, just add the setbuilder item to the existing items array:
  `{ id: 'setbuilder', label: 'Set Builder', badge: setTrackCount && setTrackCount > 0 ? setTrackCount : undefined }`
  Place it after the 'usb' entry.

**2b. Update TrackTable.tsx**:

- Add `onAddToSet?: (track: Track) => void` to the Props interface (line 11-16).
- Destructure `onAddToSet` in the component function signature.
- In each virtual track row, add a "+ Set" button that appears on hover. Place it after the last data column (before the row closing tag). Style:
  - `fontSize: '10px'`, `padding: '2px 6px'`, `borderRadius: '4px'`
  - `background: 'rgba(124,58,237,0.15)'`, `color: '#a78bfa'`
  - `border: '1px solid rgba(124,58,237,0.2)'`, `cursor: 'pointer'`
  - `fontFamily: 'var(--font)'`, `flexShrink: 0`
  - `opacity: 0` by default, set to `1` on hover via inline event handlers (onMouseEnter/onMouseLeave on the BUTTON itself -- or better: set opacity: 1 when the row is hovered). Since TrackTable uses inline styles, the simplest approach: always show the button (opacity: 1) -- it is small enough to not clutter.
  - `onClick`: call `e.stopPropagation(); onAddToSet(track);`
  - Only render the button if `onAddToSet` is provided.
  </action>
  <verify>
`cd apps/mixmind/frontend && npm run build 2>&1 | tail -5` -- should show successful build with no errors.
  </verify>
  <done>LeftNav shows "Set Builder" item with track count badge. TrackTable rows have a "+ Set" button that triggers onAddToSet callback. Full build succeeds.</done>
</task>

</tasks>

<verification>
1. `cd apps/mixmind/frontend && npm run build` -- clean build, no TypeScript errors
2. Visual check: LeftNav shows "Set Builder" entry below USB Export
3. Functional check: clicking "+ Set" on a track row adds it to set builder, switching to Set Builder panel shows the track with BPM arc and transition scores
4. Drag a track to reorder -- list updates
5. Click Export CSV -- downloads valid CSV file
6. Click Clear -- empties the set
</verification>

<success_criteria>
- SetBuilderPanel.tsx renders drag-drop list with BPM arc, transition scores, CSV export, and clear
- LeftNav has "Set Builder" entry with track count badge
- TrackTable rows have "+ Set" button wired through App.tsx state
- `npm run build` passes with zero errors
</success_criteria>

<output>
After completion, create `.planning/quick/244-build-setbuilderpanel-drag-drop-set-buil/244-SUMMARY.md`
</output>
