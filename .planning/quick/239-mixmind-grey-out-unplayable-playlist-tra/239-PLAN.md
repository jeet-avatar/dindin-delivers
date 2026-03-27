---
phase: quick-239
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/frontend/src/App.tsx
  - apps/mixmind/sidecar/ai.py
autonomous: true
requirements: [Q-239]
must_haves:
  truths:
    - "Playlist tracks with no file_path render greyed out (opacity ~0.35) and are visually distinct from playable tracks"
    - "No hover highlight or pointer cursor appears on unplayable tracks"
    - "AI playlist suggestions never include tracks that lack a file_path"
  artifacts:
    - path: "apps/mixmind/frontend/src/App.tsx"
      provides: "Greyed-out style for unplayable playlist rows"
    - path: "apps/mixmind/sidecar/ai.py"
      provides: "Library filtered to file_path-only tracks before AI context serialisation"
  key_links:
    - from: "App.tsx playlist track row"
      to: "t.file_path check"
      via: "conditional style: opacity + strikethrough badge"
    - from: "ai.py serialise_library_for_claude"
      to: "tracks list"
      via: "filter(lambda t: t.file_path, tracks) before sorting"
---

<objective>
Grey out unplayable playlist tracks in the UI and exclude them from AI suggestions.

Purpose: 46 of 8213 library tracks have file_path = null (USB-analyzed, not locally available). These currently look identical to playable tracks in the playlist panel, causing DJs to click them and get silence. The AI can also suggest them, wasting playlist slots.
Output: Playlist rows with no file_path get opacity 0.35 + "unavailable" badge + no hover/cursor. AI serialisation filters them out before sending context to Claude.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Grey out unplayable tracks in playlist panel (App.tsx)</name>
  <files>apps/mixmind/frontend/src/App.tsx</files>
  <action>
In the playlist track map (lines 142-164), update the track row div styles for tracks where `!t.file_path`:

1. Add `opacity: t.file_path ? 1 : 0.35` to the row's style object (alongside the existing cursor/transition).

2. After the camelot badge span (line 162), add a conditional "unavailable" badge:
   ```tsx
   {!t.file_path && (
     <span style={{ fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', background: 'rgba(107,114,128,0.15)', color: '#6b7280', flexShrink: 0, letterSpacing: '0.03em' }}>
       UNAVAILABLE
     </span>
   )}
   ```

3. The existing `onMouseEnter` guard (`if (t.file_path)`) already prevents hover highlight — no change needed there.

No other changes. Do not touch track title/artist text color (opacity on the row handles it).
  </action>
  <verify>
    Visually: run `npm run dev` in apps/mixmind/frontend, open playlist panel. Tracks with file_path render normally; tracks without render at ~35% opacity with "UNAVAILABLE" badge and no hover effect.
    Code check: `grep -n "UNAVAILABLE\|opacity" apps/mixmind/frontend/src/App.tsx` shows both changes at playlist track rows.
  </verify>
  <done>Playlist rows where t.file_path is falsy render at opacity 0.35 with an UNAVAILABLE badge; playable rows are unaffected.</done>
</task>

<task type="auto">
  <name>Task 2: Filter unplayable tracks from AI context in ai.py</name>
  <files>apps/mixmind/sidecar/ai.py</files>
  <action>
In `serialise_library_for_claude` (line 36), add a filter before the sort so tracks without a local file are never included in the AI's context window:

Change:
```python
sorted_tracks = sorted(tracks, key=lambda t: t.rating, reverse=True)
```

To:
```python
playable = [t for t in tracks if t.file_path]
sorted_tracks = sorted(playable, key=lambda t: t.rating, reverse=True)
```

This is the single correct place to fix it — `build_system_prompt` calls `serialise_library_for_claude`, which feeds the CSV to Claude. By filtering here, the AI never sees unplayable tracks and therefore can never suggest them.

No other changes needed. The `parse_playlist_response` path and `chat` endpoint in ai_routes.py are unaffected.
  </action>
  <verify>
    `grep -n "playable\|file_path" apps/mixmind/sidecar/ai.py` shows the new filter line.
    Run existing test suite: `cd apps/mixmind/sidecar && python -m pytest tests/test_ai.py -v` — all tests must pass (SAMPLE_TRACKS in the test fixture already have non-empty file_path values so no test changes needed).
  </verify>
  <done>serialise_library_for_claude only serialises tracks where file_path is truthy. AI can no longer suggest unplayable tracks.</done>
</task>

</tasks>

<verification>
1. `grep -n "UNAVAILABLE\|opacity.*file_path\|file_path.*opacity" apps/mixmind/frontend/src/App.tsx`
2. `grep -n "playable.*file_path" apps/mixmind/sidecar/ai.py`
3. `cd apps/mixmind/sidecar && python -m pytest tests/test_ai.py -v` — all pass
</verification>

<success_criteria>
- Playlist rows with no file_path are visually greyed (opacity 0.35) with UNAVAILABLE badge
- Hover/cursor behaviour unchanged for unplayable rows (already guarded by existing code)
- AI serialiser filters to file_path-truthy tracks only
- Existing ai.py tests pass without modification
</success_criteria>

<output>
After completion, create `.planning/quick/239-mixmind-grey-out-unplayable-playlist-tra/239-SUMMARY.md`
</output>
