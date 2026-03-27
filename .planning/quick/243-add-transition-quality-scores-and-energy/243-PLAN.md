---
phase: quick-243
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/frontend/src/components/AIChatSidebar.tsx
  - apps/mixmind/frontend/src/App.tsx
autonomous: true
requirements: [Q-243]

must_haves:
  truths:
    - "AI playlist shows transition quality badges (perfect/ok/clash) between each track pair"
    - "Transition badges show Camelot key change and BPM % difference"
    - "Energy arc bar chart renders below the playlist showing BPM progression"
    - "Colors match: green=perfect, yellow=ok, red=clash for transitions; purple/yellow/red for energy bars"
  artifacts:
    - path: "apps/mixmind/frontend/src/components/AIChatSidebar.tsx"
      provides: "Transition scoring functions + enriched playlist rendering + energy arc"
      contains: "camelotScore"
    - path: "apps/mixmind/frontend/src/App.tsx"
      provides: "Passes tracks prop to AIChatSidebar"
      contains: "tracks={tracks}"
  key_links:
    - from: "apps/mixmind/frontend/src/App.tsx"
      to: "AIChatSidebar"
      via: "tracks prop from useLibrary()"
      pattern: "AIChatSidebar.*tracks="
    - from: "AIChatSidebar.tsx"
      to: "Track type"
      via: "resolvedTracks matching title+artist"
      pattern: "tracks\\.find"
---

<objective>
Add transition quality scores and energy arc visualizer to MixMind AIChatSidebar.

Purpose: When the AI generates a playlist, DJs need to see at a glance whether adjacent tracks mix well (Camelot key compatibility + BPM % jump) and how the energy arc flows across the set.
Output: AIChatSidebar.tsx with transition badges between tracks and a BPM bar chart below the playlist.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/mixmind/frontend/src/components/AIChatSidebar.tsx
@apps/mixmind/frontend/src/types/track.ts
@apps/mixmind/frontend/src/App.tsx
@docs/superpowers/plans/2026-03-27-mixmind-dj-complete.md (Chunk 3: Q-243 section, lines 617-841)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add transition scoring, resolve tracks, render playlist with badges and energy arc</name>
  <files>apps/mixmind/frontend/src/components/AIChatSidebar.tsx, apps/mixmind/frontend/src/App.tsx</files>
  <action>
Follow the spec in docs/superpowers/plans/2026-03-27-mixmind-dj-complete.md Chunk 3 exactly. All changes are in two files:

**AIChatSidebar.tsx — add scoring helpers at top of file:**
1. Import `Track` from `../types/track` (add to existing import line that imports AIPlaylistItem).
2. Add `camelotScore(a, b)` pure function — parses Camelot strings (e.g. "8A"), computes wheel distance with wrapping at 12, returns 0|1|2. Same key or relative major/minor or +/-1 step same letter = 2 (perfect). +/-2 steps = 1 (ok). Else 0 (clash). Unknown keys return 1.
3. Add `TransitionScore` interface: `{ keyScore: 0|1|2, bpmJumpPct: number, overall: 'perfect'|'ok'|'clash' }`.
4. Add `scoreTransition(fromCamelot, fromBpm, toCamelot, toBpm)` — uses camelotScore + BPM % difference. Overall: perfect if keyScore=2 AND bpmJump<3%, clash if keyScore=0 OR bpmJump>=6%, ok otherwise.

**AIChatSidebar.tsx — extend Props and Message:**
5. Add `tracks: Track[]` to Props interface. Update destructuring to `{ onPlaylistCreated, tracks }`.
6. Add `resolvedTracks?: (Track | null)[]` and `transitionScores?: (TransitionScore | null)[]` to Message interface.

**AIChatSidebar.tsx — compute scores in send():**
7. After `res.playlist` is received, resolve each AIPlaylistItem to a full Track by matching title+artist (case-insensitive) against the `tracks` prop. Store as `resolved: (Track | null)[]`.
8. Compute `transitionScores` array — for index 0 return null, for each subsequent index score the transition from resolved[i-1] to resolved[i]. If either is null, return null.
9. Include `resolvedTracks` and `transitionScores` in the message added to state.

**AIChatSidebar.tsx — render enriched playlist:**
10. Replace the existing minimal playlist display (the `{m.playlist.length} tracks added` div, lines 111-118) with a full playlist view per the spec:
    - For each track, show: track number, title (11px bold), artist + camelot + BPM (10px secondary).
    - Between tracks (i > 0 where score exists), show a transition arrow with color-coded badge: green "#34d399" for perfect, yellow "#fbbf24" for ok, red "#f87171" for clash. Show key change (e.g. "8A->9A") and BPM jump %.
    - Below all tracks, render an "Energy arc" section: a flex row of bars, height proportional to BPM within the set's min-max range. Colors: purple (<33% range), yellow (33-66%), red (>66%). Each bar has the BPM number below in 8px text.

**App.tsx — pass tracks prop:**
11. On line 182, change `<AIChatSidebar onPlaylistCreated={handlePlaylistCreated} />` to `<AIChatSidebar onPlaylistCreated={handlePlaylistCreated} tracks={tracks} />`.

Use exact color values and styling from the spec. Do NOT add any external dependencies.
  </action>
  <verify>
Run: `cd apps/mixmind/frontend && npm run build 2>&1 | tail -5`
Expected: `built in` with 0 errors.
Then grep verification:
- `grep -n 'camelotScore' apps/mixmind/frontend/src/components/AIChatSidebar.tsx` — function exists
- `grep -n 'scoreTransition' apps/mixmind/frontend/src/components/AIChatSidebar.tsx` — function exists
- `grep -n 'Energy arc' apps/mixmind/frontend/src/components/AIChatSidebar.tsx` — energy section renders
- `grep -n 'tracks={tracks}' apps/mixmind/frontend/src/App.tsx` — prop passed
  </verify>
  <done>
AIChatSidebar renders AI playlists with: (1) color-coded transition badges between each track pair showing Camelot key change + BPM %, (2) track rows with number/title/artist/key/bpm, (3) energy arc bar chart below the playlist. TypeScript builds with 0 errors.
  </done>
</task>

</tasks>

<verification>
1. `cd apps/mixmind/frontend && npm run build` passes with 0 errors
2. `grep -c 'camelotScore\|scoreTransition\|TransitionScore\|Energy arc' apps/mixmind/frontend/src/components/AIChatSidebar.tsx` returns 4+
3. `grep 'tracks={tracks}' apps/mixmind/frontend/src/App.tsx` confirms prop wiring
</verification>

<success_criteria>
- TypeScript build passes with zero errors
- AI playlist messages show transition quality badges (perfect green / ok yellow / clash red) between each track pair
- Each badge shows Camelot key transition and BPM % jump
- Energy arc bar chart renders below the playlist with BPM-proportional bars colored by energy level
- All scoring logic is pure functions with no external dependencies
</success_criteria>

<output>
After completion, create `.planning/quick/243-add-transition-quality-scores-and-energy/243-SUMMARY.md`
</output>
