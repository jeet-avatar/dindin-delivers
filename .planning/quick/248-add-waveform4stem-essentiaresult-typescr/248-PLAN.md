---
phase: quick-248
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/frontend/src/types/track.ts
  - apps/mixmind/frontend/src/components/DJWaveformView.tsx
  - apps/mixmind/frontend/src/components/TrackTable.tsx
  - apps/mixmind/frontend/src/App.tsx
autonomous: true
requirements: [Q-248]

must_haves:
  truths:
    - "Waveform4Stem and EssentiaResult types exist and TrackAnlzData includes optional 4-stem + essentia fields"
    - "DJWaveformView renders 4-stem stacked waveform when waveform_4stem data is present, with stem legend"
    - "TrackTable rows have an Analyze button that triggers onAnalyze callback"
    - "App.tsx wires analyze handler via sidecarPost to /api/tracks/:id/analyze"
  artifacts:
    - path: "apps/mixmind/frontend/src/types/track.ts"
      provides: "Waveform4Stem, EssentiaResult interfaces + TrackAnlzData extended"
      contains: "Waveform4Stem"
    - path: "apps/mixmind/frontend/src/components/DJWaveformView.tsx"
      provides: "4-stem canvas rendering path + stem legend overlay"
      contains: "STEM_DRUMS"
    - path: "apps/mixmind/frontend/src/components/TrackTable.tsx"
      provides: "Analyze button in row actions"
      contains: "onAnalyze"
    - path: "apps/mixmind/frontend/src/App.tsx"
      provides: "handleAnalyze function wired to sidecarPost"
      contains: "handleAnalyze"
  key_links:
    - from: "apps/mixmind/frontend/src/App.tsx"
      to: "/api/tracks/:id/analyze"
      via: "sidecarPost in handleAnalyze"
      pattern: "sidecarPost.*analyze"
    - from: "apps/mixmind/frontend/src/App.tsx"
      to: "apps/mixmind/frontend/src/components/TrackTable.tsx"
      via: "onAnalyze prop"
      pattern: "onAnalyze.*handleAnalyze"
    - from: "apps/mixmind/frontend/src/components/DJWaveformView.tsx"
      to: "apps/mixmind/frontend/src/types/track.ts"
      via: "Waveform4Stem type import"
      pattern: "import.*Waveform4Stem"
---

<objective>
Add frontend types and UI for MixMind 4-stem audio analysis: Waveform4Stem + EssentiaResult TypeScript types, 4-stem canvas rendering in DJWaveformView with stem legend, Analyze button in TrackTable rows, and wire the analyze handler in App.tsx.

Purpose: Enable the frontend to display Demucs 4-stem waveforms (drums/bass/vocals/other) and trigger per-track analysis from the UI, as part of the stem analysis pipeline (Tasks 6-8 from the implementation plan).
Output: Updated track.ts, DJWaveformView.tsx, TrackTable.tsx, App.tsx with 4-stem support
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/mixmind/frontend/src/types/track.ts
@apps/mixmind/frontend/src/components/DJWaveformView.tsx
@apps/mixmind/frontend/src/components/TrackTable.tsx
@apps/mixmind/frontend/src/App.tsx
@apps/mixmind/frontend/src/hooks/useSidecar.ts
@docs/superpowers/plans/2026-03-27-mixmind-stem-analysis.md (reference Tasks 6-8 for exact code)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Waveform4Stem + EssentiaResult types and extend TrackAnlzData</name>
  <files>apps/mixmind/frontend/src/types/track.ts</files>
  <action>
After the existing `AIPlaylistItem` interface (end of file, line 87), add two new interfaces:

```typescript
// Stem analysis types (Q-248: Demucs + Essentia)
export interface Waveform4Stem {
  drums: number;   // 0-255
  bass: number;    // 0-255
  vocals: number;  // 0-255
  other: number;   // 0-255
}

export interface EssentiaResult {
  bpm: number;
  key_musical: string;
  camelot: string;
  genre: string;
  energy: number;       // 0.0-1.0
  danceability: number; // 0.0-1.0
}
```

Add three optional fields to the existing `TrackAnlzData` interface (after `partial?: boolean` on line 68):

```typescript
  waveform_4stem?: Waveform4Stem[];   // Demucs 4-stem per-column amplitudes
  essentia?: EssentiaResult;           // Essentia feature extraction results
  analyzer_version?: string;           // e.g. "1.0"
```
  </action>
  <verify>
Run `cd apps/mixmind/frontend && npx tsc --noEmit` — should compile with 0 errors.
Grep: `grep -n 'Waveform4Stem\|EssentiaResult\|waveform_4stem\|essentia?' apps/mixmind/frontend/src/types/track.ts` shows all new types present.
  </verify>
  <done>track.ts exports Waveform4Stem and EssentiaResult interfaces, TrackAnlzData has waveform_4stem?, essentia?, analyzer_version? fields, TypeScript compiles cleanly</done>
</task>

<task type="auto">
  <name>Task 2: Add 4-stem rendering to DJWaveformView + stem legend</name>
  <files>apps/mixmind/frontend/src/components/DJWaveformView.tsx</files>
  <action>
**Step A — Update import** (line 15): Add `Waveform4Stem` to the import from `../types/track`:

```typescript
import { Track, TrackAnlzData, HotCueEntry, Waveform4Stem } from '../types/track';
```

**Step B — Add stem color constants** after `CDJ_MONO` constant (after line 25):

```typescript
// 4-stem colors (Demucs analysis)
const STEM_DRUMS  = '#FF9500';  // orange
const STEM_BASS   = '#8B00FF';  // deep purple
const STEM_VOCALS = '#00E5FF';  // cyan
const STEM_OTHER  = '#FFD700';  // gold
```

**Step C — Modify `drawOverviewCanvas` waveform bars section** (lines 78-116). Replace the entire waveform bars block with priority logic that checks `anlz.waveform_4stem` FIRST:

```typescript
  // -- Waveform bars --
  const w4 = anlz.waveform_4stem;
  const wb = anlz.waveform_3band;
  const wp = anlz.waveform_preview;
  const waveLen = w4 ? w4.length : (wb ? wb.length : wp.length);

  if (waveLen > 0) {
    const barW = Math.max(1, W / waveLen);

    if (w4) {
      // 4-stem Demucs waveform (priority 1)
      const stems = [
        { key: 'drums'  as const, color: STEM_DRUMS,  weight: 0.30 },
        { key: 'bass'   as const, color: STEM_BASS,   weight: 0.25 },
        { key: 'vocals' as const, color: STEM_VOCALS, weight: 0.25 },
        { key: 'other'  as const, color: STEM_OTHER,  weight: 0.20 },
      ];
      for (let i = 0; i < w4.length; i++) {
        const x = (i / w4.length) * W;
        const col = w4[i];
        let yOffset = 0;
        for (const stem of stems) {
          const stemH = (col[stem.key] / 255) * H * stem.weight;
          ctx.fillStyle = hexToRgba(stem.color, 0.85);
          ctx.fillRect(x, H - yOffset - stemH, barW, stemH);
          yOffset += stemH;
        }
      }
    } else if (wb) {
      // CDJ-style 3-band (existing logic preserved exactly)
      for (let i = 0; i < wb.length; i++) {
        const x = (i / wb.length) * W;
        const col = wb[i];
        const lowH = (col.low / 255) * H * 0.4;
        ctx.fillStyle = hexToRgba(CDJ_LOW, 0.85);
        ctx.fillRect(x, H - lowH, barW, lowH);
        const midH = (col.mid / 255) * H * 0.3;
        ctx.fillStyle = hexToRgba(CDJ_MID, 0.85);
        ctx.fillRect(x, H - lowH - midH, barW, midH);
        const highH = (col.high / 255) * H * 0.3;
        ctx.fillStyle = hexToRgba(CDJ_HIGH, 0.85);
        ctx.fillRect(x, H - lowH - midH - highH, barW, highH);
      }
    } else if (wp.length > 0) {
      // Mono fallback
      for (let i = 0; i < wp.length; i++) {
        const x = (i / wp.length) * W;
        const barH = (wp[i] / 255) * H;
        ctx.fillStyle = hexToRgba(CDJ_MONO, 0.8);
        ctx.fillRect(x, H - barH, barW, barH);
      }
    }
  }
```

**Step D — Apply same 4-stem priority to `drawZoomedCanvas`** (lines 228-265). Same pattern: check `anlz.waveform_4stem` first, then `wb`, then `wp`. The zoomed version uses `startIdx`/`endIdx` slicing — add the w4 branch before the wb branch with identical slicing logic.

**Step E — Add stem legend overlay** inside the overview container div (the `ref={overviewWrapRef}` div, around line 525-535). After the `<canvas>` element and before the closing `</div>`, add:

```tsx
{anlzData?.waveform_4stem && (
  <div style={{
    position: 'absolute', top: 4, right: 4, display: 'flex', gap: '6px',
    fontSize: '8px', opacity: 0.7, pointerEvents: 'none',
  }}>
    {[
      { label: 'Drums', color: STEM_DRUMS },
      { label: 'Bass', color: STEM_BASS },
      { label: 'Vocals', color: STEM_VOCALS },
      { label: 'Other', color: STEM_OTHER },
    ].map(s => (
      <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'rgba(255,255,255,0.7)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
        {s.label}
      </span>
    ))}
  </div>
)}
```

IMPORTANT: Do NOT break existing 3-band or mono rendering. The 4-stem path is additive — it only activates when `waveform_4stem` data exists on the anlz object.
  </action>
  <verify>
Run `cd apps/mixmind/frontend && npx tsc --noEmit && npm run build` — 0 errors.
Grep: `grep -n 'STEM_DRUMS\|waveform_4stem\|w4' apps/mixmind/frontend/src/components/DJWaveformView.tsx` confirms stem constants and 4-stem rendering paths exist.
  </verify>
  <done>DJWaveformView renders 4-stem stacked waveform (drums 30% orange, bass 25% purple, vocals 25% cyan, other 20% gold) when waveform_4stem data is present, falls back to existing 3-band/mono otherwise. Stem legend appears top-right of overview pane. Both overview and zoomed canvases handle 4-stem. Build passes.</done>
</task>

<task type="auto">
  <name>Task 3: Add Analyze button to TrackTable + wire handler in App.tsx</name>
  <files>apps/mixmind/frontend/src/components/TrackTable.tsx, apps/mixmind/frontend/src/App.tsx</files>
  <action>
**Step A — TrackTable.tsx: Add onAnalyze prop** to the Props interface (line 11-20). Add after `onAddToSet`:

```typescript
  onAnalyze?: (contentId: string) => void;
```

**Step B — TrackTable.tsx: Destructure onAnalyze** in the component function signature (line 194). Add `onAnalyze` to the destructured props.

**Step C — TrackTable.tsx: Add Analyze button** in the row actions area, right after the `onAddToSet` button block (after line 724, before the three-dot menu button at line 725). Add:

```tsx
{onAnalyze && (
  <button
    title="Analyze stems"
    onClick={(e) => { e.stopPropagation(); onAnalyze(t.content_id); }}
    style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontSize: '11px', padding: '2px 4px', borderRadius: '4px',
      color: '#a78bfa', opacity: 0.7, flexShrink: 0,
    }}
    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
    onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
  >
    Analyze
  </button>
)}
```

Note: Use text "Analyze" instead of emoji for consistency with the "+ Set" button style.

**Step D — App.tsx: Import sidecarPost** (line 10). Change `import { sidecarGet } from './hooks/useSidecar';` to:

```typescript
import { sidecarGet, sidecarPost } from './hooks/useSidecar';
```

**Step E — App.tsx: Add analyze handler** after the `handleSeek` function (after line 57):

```typescript
const [analyzingTrack, setAnalyzingTrack] = useState<string | null>(null);

async function handleAnalyze(contentId: string) {
  setAnalyzingTrack(contentId);
  try {
    await sidecarPost(`/api/tracks/${contentId}/analyze?force=false`, {});
  } catch (e) {
    console.error('Analysis failed:', e);
  } finally {
    setAnalyzingTrack(null);
  }
}
```

**Step F — App.tsx: Pass onAnalyze to TrackTable** (line 138). Add `onAnalyze={handleAnalyze}` prop to the `<TrackTable>` component:

```tsx
<TrackTable tracks={tracks} onReload={reload} onPlay={setNowPlaying} onAddToSet={addToSet} onAnalyze={handleAnalyze} playedIds={playedIds} compatibleKeys={compatibleKeys} nowPlayingId={nowPlaying?.content_id} />
```
  </action>
  <verify>
Run `cd apps/mixmind/frontend && npx tsc --noEmit && npm run build` — 0 errors.
Grep: `grep -n 'onAnalyze\|handleAnalyze\|analyzingTrack' apps/mixmind/frontend/src/App.tsx apps/mixmind/frontend/src/components/TrackTable.tsx` confirms wiring exists end-to-end.
  </verify>
  <done>TrackTable rows show "Analyze" button next to "+ Set" that calls onAnalyze(contentId). App.tsx has handleAnalyze that POSTs to /api/tracks/:id/analyze via sidecarPost. Build passes with 0 errors.</done>
</task>

</tasks>

<verification>
1. `cd apps/mixmind/frontend && npx tsc --noEmit` — TypeScript compiles with 0 errors
2. `cd apps/mixmind/frontend && npm run build` — Vite build succeeds
3. `grep -n 'Waveform4Stem\|EssentiaResult' apps/mixmind/frontend/src/types/track.ts` — both types exist
4. `grep -n 'STEM_DRUMS\|waveform_4stem' apps/mixmind/frontend/src/components/DJWaveformView.tsx` — stem rendering exists
5. `grep -n 'onAnalyze' apps/mixmind/frontend/src/components/TrackTable.tsx` — Analyze button wired
6. `grep -n 'handleAnalyze\|sidecarPost' apps/mixmind/frontend/src/App.tsx` — handler + import exist
</verification>

<success_criteria>
- TypeScript types Waveform4Stem and EssentiaResult exported from track.ts
- TrackAnlzData has optional waveform_4stem, essentia, analyzer_version fields
- DJWaveformView renders 4-stem stacked bars (drums/bass/vocals/other) when data present
- Stem legend (4 colored dots) appears top-right of overview canvas when 4-stem active
- Existing 3-band and mono waveform rendering unchanged (fallback paths preserved)
- TrackTable has Analyze button per row that triggers onAnalyze callback
- App.tsx wires handleAnalyze to sidecarPost /api/tracks/:id/analyze
- Frontend builds with 0 TypeScript and 0 Vite errors
</success_criteria>

<output>
After completion, create `.planning/quick/248-add-waveform4stem-essentiaresult-typescr/248-SUMMARY.md`
</output>
