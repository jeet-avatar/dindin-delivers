---
phase: quick-241
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/sidecar/rekordbox.py
  - apps/mixmind/sidecar/library.py
  - apps/mixmind/sidecar/ai.py
autonomous: true
requirements: [Q-241]

must_haves:
  truths:
    - "Track dataclass carries genre, comment, color_hex, date_added, label, play_count fields"
    - "DB loader reads 6 new fields from DjmdContent using verified column names"
    - "XML loader reads Genre/Comments/Colour/DateAdded/Label/PlayCount attributes where available"
    - "GET /api/library/genres returns sorted unique non-empty genre strings"
    - "GET /api/library/compatible/:camelot returns 4 compatible Camelot codes"
    - "CSV serialization in ai.py includes genre column for richer Claude context"
  artifacts:
    - path: "apps/mixmind/sidecar/rekordbox.py"
      provides: "Extended Track dataclass + loaders"
      contains: "genre comment color_hex date_added label play_count"
    - path: "apps/mixmind/sidecar/library.py"
      provides: "/api/library/genres and /api/library/compatible/:camelot endpoints"
      exports: [router]
    - path: "apps/mixmind/sidecar/ai.py"
      provides: "CSV with genre column"
      contains: "genre"
  key_links:
    - from: "apps/mixmind/sidecar/rekordbox.py"
      to: "apps/mixmind/sidecar/library.py"
      via: "Track dataclass imported by TrackOut model"
      pattern: "from rekordbox import"
    - from: "apps/mixmind/sidecar/library.py"
      to: "/api/library/genres"
      via: "router.get('/library/genres')"
      pattern: "router\\.get.*genres"
---

<objective>
Extend the MixMind sidecar with 6 new metadata fields and 2 new API endpoints.

Purpose: Genre filtering, label browsing, and richer AI context require genre/comment/color/date/label/play_count on every Track. Two new endpoints expose this data to the frontend.
Output: Extended Track, updated loaders, 2 new routes, extended CSV serialization.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/mixmind/sidecar/rekordbox.py
@apps/mixmind/sidecar/library.py
@apps/mixmind/sidecar/ai.py
@apps/mixmind/sidecar/camelot.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend Track dataclass and loaders with 6 new fields</name>
  <files>apps/mixmind/sidecar/rekordbox.py</files>
  <action>
Add a `COLOR_MAP` dict at the top of rekordbox.py (after `_CUE_COLORS`):

```python
COLOR_MAP: dict[str, str] = {
    "1": "#ff7070", "2": "#ff9a3c", "3": "#f5e642", "4": "#5fd76b",
    "5": "#5bbfff", "6": "#a57bff", "7": "#ff6eb4", "8": "#c8c8c8",
}
```

Add 6 new fields to the `Track` dataclass after `analysis_data_path`, all with defaults so existing construction sites stay valid:

```python
genre: str = ""
comment: str = ""
color_hex: str = ""       # '' means no color; otherwise e.g. '#ff7070'
date_added: str = ""      # YYYY-MM-DD or ''
label: str = ""
play_count: int = 0
```

Extend `to_cache()` to include all 6 new keys.

**DB loader (`try_load_library_db`)** — inside the per-track loop, after the existing fields, read:
- `genre = t.GenreName or ""`
- `comment = t.Commnt or ""`  ← NOTE: typo is correct, matches RB schema
- `color_hex = COLOR_MAP.get(str(t.ColorID or "0"), "")` — use `"0"` as fallback key which maps to `""`; if ColorID is 0 or absent produce `""`
- `date_added = str(t.StockDate)[:10] if t.StockDate else ""`  ← slice to YYYY-MM-DD
- `label = t.LabelName or ""`
- `play_count = int(t.DJPlayCount or 0)`

Pass these into `Track(...)` constructor.

**XML loaders** — update `_track_from_xml_element` and the pyrekordbox loop in `load_library_xml`:
- `genre = el.attrib.get("Genre", "")` (pyrekordbox: `rb_track._element.attrib.get("Genre", "")`)
- `comment = el.attrib.get("Comments", "")` (XML attribute is `Comments`, not `Commnt`)
- `color_hex = COLOR_MAP.get(el.attrib.get("Colour", "0"), "")`
- `date_added = el.attrib.get("DateAdded", "")`
- `label = el.attrib.get("Label", "")`
- `play_count = int(el.attrib.get("PlayCount", "0") or "0")`

Pass into `Track(...)` for both XML paths.
  </action>
  <verify>
From the sidecar directory run:
```bash
cd /Users/jeet/doordash-p2p/apps/mixmind/sidecar
python -c "
from rekordbox import Track, COLOR_MAP
t = Track(content_id='1', source='xml', title='T', artist='A', bpm=128.0,
          key_musical='Am', camelot='8A', rating=3, duration_sec=300,
          cue_count=0, genre='Afro House', comment='test', color_hex='#ff7070',
          date_added='2024-01-01', label='Afro', play_count=42)
print(t.genre, t.comment, t.color_hex, t.date_added, t.label, t.play_count)
print(t.to_cache())
print(COLOR_MAP['1'])
"
```
Expected: `Afro House test #ff7070 2024-01-01 Afro 42` on first line, dict containing all 6 new keys on second line, `#ff7070` on third line.
  </verify>
  <done>Track dataclass accepts all 6 new fields with defaults; to_cache includes them; COLOR_MAP defined; both XML and DB loaders populate the new fields from the correct column/attribute names.</done>
</task>

<task type="auto">
  <name>Task 2: Add /api/library/genres and /api/library/compatible/:camelot endpoints + extend TrackOut + CSV</name>
  <files>apps/mixmind/sidecar/library.py, apps/mixmind/sidecar/ai.py</files>
  <action>
**library.py:**

1. Extend `TrackOut` with new fields (add after `analysis_data_path`):
```python
genre: str = ""
comment: str = ""
color_hex: str = ""
date_added: str = ""
label: str = ""
play_count: int = 0
```

2. In `get_library`, update the `TrackOut(...)` construction to pass the 6 new fields:
```python
genre=t.genre,
comment=t.comment,
color_hex=t.color_hex,
date_added=t.date_added,
label=t.label,
play_count=t.play_count,
```

3. Add `GET /api/library/genres` endpoint after `get_library`:
```python
@router.get("/library/genres")
async def get_library_genres():
    """Return sorted unique non-empty genre strings from the full library."""
    tracks = try_load_library_db()
    if tracks is None:
        if not XML_PATH.exists():
            return {"genres": []}
        tracks = load_library_xml(XML_PATH)
    genres = sorted({t.genre for t in tracks if t.genre})
    return {"genres": genres}
```

4. Add `GET /api/library/compatible/:camelot` endpoint. Implement the compatible_keys function inline or as a module-level helper. The algorithm (verified):
```python
def _compatible_keys(camelot: str) -> list[str]:
    if not camelot or camelot == "?":
        return []
    letter = camelot[-1]          # 'A' or 'B'
    number = int(camelot[:-1])    # numeric part
    other = "B" if letter == "A" else "A"
    return [
        camelot,                                      # same key
        f"{(number % 12) + 1}{letter}",               # +1 clockwise
        f"{((number - 2) % 12) + 1}{letter}",         # -1 counter-clockwise
        f"{number}{other}",                            # relative major/minor
    ]

@router.get("/library/compatible/{camelot}")
async def get_compatible_keys(camelot: str):
    """Return list of Camelot keys harmonically compatible with the given key."""
    keys = _compatible_keys(camelot.upper())
    if not keys:
        raise HTTPException(status_code=400, detail=f"Invalid Camelot key: {camelot}")
    return {"input": camelot.upper(), "compatible": keys}
```

**ai.py:**

Extend the CSV header and per-track row in `serialise_library_for_claude` to include `genre`:
- Header: `"title|artist|bpm|camelot|rating|duration_sec|genre"`
- Row: `f"{t.title}|{t.artist}|{t.bpm:.1f}|{t.camelot}|{t.rating}|{t.duration_sec}|{t.genre}"`

Also update the `SYSTEM_PROMPT_TEMPLATE` CSV format comment from:
`CSV format: title|artist|bpm|camelot|rating|duration_sec`
to:
`CSV format: title|artist|bpm|camelot|rating|duration_sec|genre`
  </action>
  <verify>
```bash
cd /Users/jeet/doordash-p2p/apps/mixmind/sidecar
python -c "
from library import _compatible_keys
print(_compatible_keys('8A'))   # ['8A', '9A', '7A', '8B']
print(_compatible_keys('12B'))  # ['12B', '1B', '11B', '12A']
print(_compatible_keys('1A'))   # ['1A', '2A', '12A', '1B']
"

# Verify CSV header
python -c "
from rekordbox import Track
from ai import serialise_library_for_claude
t = Track(content_id='1', source='xml', title='T', artist='A', bpm=128.0,
          key_musical='Am', camelot='8A', rating=3, duration_sec=300,
          cue_count=0, file_path='/tmp/fake.mp3', genre='House')
csv = serialise_library_for_claude([t])
print(csv)
"
```
Expected first call: `['8A', '9A', '7A', '8B']`. CSV header must contain `genre` column and row must include `House`.
  </verify>
  <done>TrackOut carries all 6 new fields; GET /api/library/genres returns sorted unique genres; GET /api/library/compatible/8A returns 4 compatible keys; CSV serialization includes genre column with correct header and values.</done>
</task>

</tasks>

<verification>
After both tasks complete, start the sidecar and smoke-test the new endpoints:
```bash
cd /Users/jeet/doordash-p2p/apps/mixmind/sidecar
uvicorn main:app --port 7171 &
sleep 2
curl -s http://localhost:7171/api/library/genres | python3 -m json.tool
curl -s http://localhost:7171/api/library/compatible/8A | python3 -m json.tool
# Verify compatible response: {"input":"8A","compatible":["8A","9A","7A","8B"]}
kill %1
```
</verification>

<success_criteria>
- Track dataclass has genre, comment, color_hex, date_added, label, play_count with correct defaults
- DB loader uses t.GenreName, t.Commnt, t.ColorID (via COLOR_MAP), t.StockDate, t.LabelName, t.DJPlayCount
- XML loader uses Genre, Comments, Colour, DateAdded, Label, PlayCount attributes
- GET /api/library/genres returns {"genres": [...sorted strings...]}
- GET /api/library/compatible/8A returns {"input": "8A", "compatible": ["8A", "9A", "7A", "8B"]}
- CSV header in ai.py contains genre column
- All existing tests pass (no regressions to Track construction)
</success_criteria>

<output>
After completion, create `.planning/quick/241-add-genre-comment-color-date-label-play-/241-SUMMARY.md`
</output>
