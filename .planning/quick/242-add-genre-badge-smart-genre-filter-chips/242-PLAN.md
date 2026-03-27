---
phase: quick-242
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/frontend/src/types/track.ts
  - apps/mixmind/frontend/src/components/TrackTable.tsx
autonomous: true
requirements: [Q-242]
must_haves:
  truths:
    - "Track type includes genre, comment, color_hex, date_added, label, play_count fields"
    - "Genre filter chips appear above the track list populated from /api/library/genres"
    - "Clicking a genre chip filters tracks to that genre only"
    - "Each row shows genre badge with hash-based color + energy label based on BPM"
    - "Tracks with color_hex show a colored dot in their row"
    - "Tracks with comments show a tooltip icon that reveals comment on hover"
    - "Tracks with play_count > 0 show play count in the row"
    - "Date added column shows YYYY-MM for each track"
  artifacts:
    - path: "apps/mixmind/frontend/src/types/track.ts"
      provides: "Track interface with 6 new optional fields"
      contains: "genre?: string"
    - path: "apps/mixmind/frontend/src/components/TrackTable.tsx"
      provides: "Enhanced TrackTable with genre badges, filters, metadata columns"
      contains: "GenreBadge"
  key_links:
    - from: "TrackTable.tsx"
      to: "/api/library/genres"
      via: "sidecarGet in useEffect"
      pattern: "sidecarGet.*genres"
    - from: "TrackTable.tsx"
      to: "track.ts"
      via: "Track type import"
      pattern: "import.*Track.*from.*track"
---

<objective>
Add genre badges, smart genre filter chips, energy labels, color dots, comment tooltips, play count, and date added column to the MixMind TrackTable component.

Purpose: Expose the 6 new metadata fields (genre, comment, color_hex, date_added, label, play_count) added by Q-241 sidecar enrichment in the TrackTable UI, giving DJs richer filtering and at-a-glance metadata.

Output: Enhanced TrackTable with genre filtering, visual badges, and metadata columns.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/mixmind/frontend/src/types/track.ts
@apps/mixmind/frontend/src/components/TrackTable.tsx
@apps/mixmind/frontend/src/hooks/useSidecar.ts
@apps/mixmind/frontend/src/index.css
@docs/superpowers/plans/2026-03-27-mixmind-dj-complete.md (Q-242 section, lines 350-613)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend Track TypeScript type with 6 new fields</name>
  <files>apps/mixmind/frontend/src/types/track.ts</files>
  <action>
Add 6 new optional fields to the Track interface in track.ts, after the `analysis_data_path` field (line 15):

```typescript
  // Metadata fields from Rekordbox (Q-242)
  genre?: string;
  comment?: string;
  color_hex?: string;      // '#rrggbb' or empty
  date_added?: string;     // 'YYYY-MM-DD' or empty
  label?: string;          // Record label name
  play_count?: number;     // DJ play count
```

All fields are optional (?) since XML-source tracks may not have them. This matches the sidecar Track dataclass defaults (empty string / 0).

Verify TypeScript compiles: `cd apps/mixmind/frontend && npx tsc --noEmit`
  </action>
  <verify>
`cd apps/mixmind/frontend && npx tsc --noEmit` exits 0 (no type errors).
`grep -c 'genre' apps/mixmind/frontend/src/types/track.ts` returns at least 1.
  </verify>
  <done>Track interface has genre, comment, color_hex, date_added, label, play_count as optional fields. TypeScript compiles clean.</done>
</task>

<task type="auto">
  <name>Task 2: TrackTable genre badges, filter chips, energy label, color dot, comment tooltip, play count, date column</name>
  <files>apps/mixmind/frontend/src/components/TrackTable.tsx</files>
  <action>
Enhance TrackTable.tsx with the following changes. The spec is in docs/superpowers/plans/2026-03-27-mixmind-dj-complete.md lines 405-613. Follow it precisely:

**A) New imports:**
- Add `useEffect` to the existing React import (line 2 currently has `useRef, useState, useMemo`)
- Add `import { sidecarGet } from '../hooks/useSidecar';`

**B) Add energyLabel helper** (after formatDuration, before camelotNum):
```typescript
function energyLabel(bpm: number): string {
  if (bpm < 90)  return 'Ambient';
  if (bpm < 110) return 'Hip-Hop';
  if (bpm < 118) return 'Soulful';
  if (bpm < 122) return 'Deep';
  if (bpm < 126) return 'Tech';
  if (bpm < 130) return 'House';
  if (bpm < 135) return 'Peak';
  if (bpm < 140) return 'Techno';
  return 'Hard';
}
```

**C) Add GenreBadge component** (after BpmBadge):
- GENRE_COLORS array with 7 muted palette entries (each has bg, text, border)
- genreColorIndex(genre) — hash string to index via `h = (h * 31 + charCode) & 0xffff; return h % 7`
- GenreBadge({ genre, bpm }) — shows genre pill (truncated to 12 chars) + energy label pill. Genre uses hash-colored bg; energy label uses muted gray bg.
- See spec lines 434-477 for exact JSX.

**D) Update SortKey type** to add `'genre' | 'date_added' | 'play_count'`

**E) Update Filter type** to accept string (for dynamic genre names):
```typescript
type Filter = 'all' | 'major' | 'minor' | 'slow' | 'mid' | 'fast' | string;
```

**F) Add genre state and fetch** inside TrackTable component:
```typescript
const [genreFilter, setGenreFilter] = useState<string>('all');
const [availableGenres, setAvailableGenres] = useState<string[]>([]);

useEffect(() => {
  sidecarGet<{ genres: string[] }>('/api/library/genres')
    .then(r => setAvailableGenres(r.genres))
    .catch(() => {});
}, []);
```

**G) Add genre filter to the filtered useMemo** — after the existing filter conditions, add:
```typescript
if (genreFilter !== 'all') list = list.filter(t => t.genre === genreFilter);
```

Also extend search to include genre: `t.genre?.toLowerCase().includes(q)`

**H) Update COL_WIDTHS** to add new columns. Change from:
```
['44px', 'auto', '70px', '70px', '72px', '70px', '48px']
```
to:
```
['44px', 'auto', '130px', '70px', '70px', '72px', '50px', '50px', '58px', '48px']
```
New columns: Genre+Energy (130px), Play Count (50px), Date Added (58px).

**I) Add genre filter chips row** — render a second chip row (below the toolbar, above column headers) when availableGenres.length > 0. Shows "All Genres" + each genre as a pill/chip button. Clicking sets genreFilter. Style: 11px font, pill radius 20px, purple accent when active, var(--border) when inactive. Wrap with flexWrap so genres overflow to next line.

**J) Update column headers** — add Genre, Plays, Added headers between existing Key and Rating:
- After the Key ColHeader, add: `<ColHeader label="Genre" sortK="genre" />`
- After Rating, add: `<ColHeader label="Plays" sortK="play_count" />`
- After Duration clock icon, add: `<ColHeader label="Added" sortK="date_added" />`

**K) Update virtual row cells** — add new cells in the grid row (matching new COL_WIDTHS order):
1. After Key column cell, add Genre cell:
   - Show color dot (7px circle with track.color_hex background) if color_hex is truthy
   - GenreBadge component with genre + bpm
   - Comment tooltip: if track.comment, show a small chat icon with `title={track.comment}`

2. After Duration cell, add Play Count cell:
   - Show `track.play_count` if > 0, styled in purple (#a78bfa), 10px font
   - Append a small play triangle character

3. After Play Count, add Date Added cell:
   - Show `track.date_added?.slice(0, 7)` (YYYY-MM format)
   - 10px font, var(--text-tertiary) color, tabular nums

**L) Ensure sort works for new keys:**
- genre sorts as string (localeCompare)
- date_added sorts as string (localeCompare — YYYY-MM-DD format sorts correctly)
- play_count sorts as number

The existing sort logic at line 157-161 already handles string vs number via typeof check. Since genre and date_added are optional strings (may be undefined), add fallback: in the sort comparator, treat undefined as empty string for string keys and 0 for number keys. Replace the sort logic with:
```typescript
return [...filtered].sort((a, b) => {
  const av = a[sortKey] ?? (typeof a[sortKey] === 'number' ? 0 : '');
  const bv = b[sortKey] ?? (typeof b[sortKey] === 'number' ? 0 : '');
  const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
  return sortDir === 'asc' ? cmp : -cmp;
});
```

NOTE: The sort fallback needs to handle the case where both values could be undefined. A simpler approach:
```typescript
const av = a[sortKey];
const bv = b[sortKey];
const sa = av ?? '', sb = bv ?? '';
const cmp = typeof av === 'number' || typeof bv === 'number'
  ? ((av as number ?? 0) - (bv as number ?? 0))
  : String(sa).localeCompare(String(sb));
return sortDir === 'asc' ? cmp : -cmp;
```

**M) Update status bar** — add genre count: `{availableGenres.length} genres` between the tracks count and avg BPM.

After all changes, run: `cd apps/mixmind/frontend && npx tsc --noEmit && npm run build`
  </action>
  <verify>
1. `cd apps/mixmind/frontend && npx tsc --noEmit` — exits 0
2. `cd apps/mixmind/frontend && npm run build 2>&1 | tail -3` — shows "built in Xs"
3. `grep -c 'GenreBadge' apps/mixmind/frontend/src/components/TrackTable.tsx` — returns >= 2 (definition + usage)
4. `grep -c 'genreFilter' apps/mixmind/frontend/src/components/TrackTable.tsx` — returns >= 3
5. `grep -c 'energyLabel' apps/mixmind/frontend/src/components/TrackTable.tsx` — returns >= 2
6. `grep -c 'sidecarGet' apps/mixmind/frontend/src/components/TrackTable.tsx` — returns >= 1
7. `grep -c 'play_count' apps/mixmind/frontend/src/components/TrackTable.tsx` — returns >= 2
8. `grep -c 'date_added' apps/mixmind/frontend/src/components/TrackTable.tsx` — returns >= 2
  </verify>
  <done>
TrackTable renders genre badges with hash-colored backgrounds, energy labels (Ambient/Deep/Tech/House/Peak/Techno/Hard), genre filter chips populated from sidecar API, color dots for colored tracks, comment tooltips, play count, and date added column. All new columns are sortable. TypeScript and production build pass clean.
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `cd apps/mixmind/frontend && npx tsc --noEmit`
2. Production build: `cd apps/mixmind/frontend && npm run build`
3. Visual check (dev server): genre chips appear, clicking filters works, badges render, metadata columns populated
</verification>

<success_criteria>
- Track type has 6 new optional fields (genre, comment, color_hex, date_added, label, play_count)
- Genre filter chips row renders dynamically from /api/library/genres
- Genre badge shows per-row with hash-based color + energy label
- Color dot appears for tracks with color_hex
- Comment icon with tooltip appears for tracks with comments
- Play count column shows for tracks with play_count > 0
- Date added column shows YYYY-MM
- All new columns sortable
- TypeScript + Vite build pass clean
</success_criteria>

<output>
After completion, create `.planning/quick/242-add-genre-badge-smart-genre-filter-chips/242-SUMMARY.md`
</output>
