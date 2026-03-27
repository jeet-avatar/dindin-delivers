"""
Tests for Q-241 through Q-245 MixMind DJ Complete features.

Covers:
  Q-241: Track enrichment (genre/comment/color/date/label/play_count),
         COLOR_MAP, _compatible_keys, /api/library/genres, /api/library/compatible
  Q-242: (frontend — no backend logic to test here)
  Q-243: (frontend — transition scoring logic tested via equivalent Python)
  Q-244: (frontend — no backend logic)
  Q-245: (frontend — no backend logic)
"""
import pytest
from pathlib import Path
from unittest.mock import patch

from rekordbox import Track, COLOR_MAP, load_library_xml
from library import _compatible_keys
from ai import serialise_library_for_claude, build_system_prompt

FIXTURE_XML = Path(__file__).parent / "fixtures" / "sample_library.xml"


# ===========================================================================
# Q-241: COLOR_MAP
# ===========================================================================


class TestColorMap:
    def test_all_8_colors_present(self):
        assert len(COLOR_MAP) == 8

    def test_keys_are_strings_1_to_8(self):
        assert set(COLOR_MAP.keys()) == {"1", "2", "3", "4", "5", "6", "7", "8"}

    def test_values_are_hex_colors(self):
        for k, v in COLOR_MAP.items():
            assert v.startswith("#"), f"COLOR_MAP[{k}] = {v} is not hex"
            assert len(v) == 7, f"COLOR_MAP[{k}] = {v} wrong length"

    def test_known_colors(self):
        assert COLOR_MAP["1"] == "#ff7070"  # red
        assert COLOR_MAP["4"] == "#5fd76b"  # green
        assert COLOR_MAP["5"] == "#5bbfff"  # blue
        assert COLOR_MAP["6"] == "#a57bff"  # purple

    def test_zero_not_in_map(self):
        """ColorID 0 means 'no color' — should not be in map."""
        assert "0" not in COLOR_MAP


# ===========================================================================
# Q-241: Track dataclass — new fields
# ===========================================================================


class TestTrackNewFields:
    def test_defaults_are_empty(self):
        t = Track("1", "xml", "T", "A", 128.0, "Am", "8A", 5, 300, 0)
        assert t.genre == ""
        assert t.comment == ""
        assert t.color_hex == ""
        assert t.date_added == ""
        assert t.label == ""
        assert t.play_count == 0

    def test_explicit_values(self):
        t = Track(
            "1", "xml", "T", "A", 128.0, "Am", "8A", 5, 300, 0,
            genre="Deep House", comment="fire", color_hex="#ff7070",
            date_added="2024-01-15", label="Afterlife", play_count=42,
        )
        assert t.genre == "Deep House"
        assert t.comment == "fire"
        assert t.color_hex == "#ff7070"
        assert t.date_added == "2024-01-15"
        assert t.label == "Afterlife"
        assert t.play_count == 42

    def test_to_cache_includes_new_fields(self):
        t = Track(
            "1", "xml", "T", "A", 128.0, "Am", "8A", 5, 300, 0,
            genre="Techno", comment="banger", color_hex="#ff9a3c",
            date_added="2023-06-01", label="Drumcode", play_count=10,
        )
        cache = t.to_cache()
        assert cache["genre"] == "Techno"
        assert cache["comment"] == "banger"
        assert cache["color_hex"] == "#ff9a3c"
        assert cache["date_added"] == "2023-06-01"
        assert cache["label"] == "Drumcode"
        assert cache["play_count"] == 10

    def test_to_cache_defaults(self):
        t = Track("1", "xml", "T", "A", 128.0, "Am", "8A", 5, 300, 0)
        cache = t.to_cache()
        assert cache["genre"] == ""
        assert cache["play_count"] == 0


# ===========================================================================
# Q-241: XML loader — reads new attributes
# ===========================================================================


class TestXMLLoaderNewFields:
    def test_xml_genre(self):
        tracks = load_library_xml(FIXTURE_XML)
        assert tracks[0].genre == "Melodic House & Techno"
        assert tracks[1].genre == "Techno"

    def test_xml_comment(self):
        tracks = load_library_xml(FIXTURE_XML)
        assert tracks[0].comment == "Peak time opener"
        assert tracks[1].comment == ""  # empty Comments attribute

    def test_xml_color_hex_from_colour_id(self):
        tracks = load_library_xml(FIXTURE_XML)
        assert tracks[0].color_hex == "#ff7070"  # Colour="1" -> COLOR_MAP["1"]
        assert tracks[1].color_hex == ""  # Colour="0" -> no color

    def test_xml_date_added(self):
        tracks = load_library_xml(FIXTURE_XML)
        assert tracks[0].date_added == "2023-06-15"
        assert tracks[1].date_added == "2022-08-23"

    def test_xml_label(self):
        tracks = load_library_xml(FIXTURE_XML)
        assert tracks[0].label == "Afterlife Records"
        assert tracks[1].label == "Drumcode"

    def test_xml_play_count(self):
        tracks = load_library_xml(FIXTURE_XML)
        assert tracks[0].play_count == 42
        assert tracks[1].play_count == 7

    def test_xml_missing_attributes_default(self):
        """Tracks without new attributes should get defaults."""
        # Create a minimal XML without the new attributes
        import tempfile
        xml = """<?xml version="1.0"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.0.0" Company="AlphaTheta"/>
  <COLLECTION Entries="1">
    <TRACK TrackID="99" Name="Minimal" Artist="Test"
           TotalTime="200" AverageBpm="120.00" Tonality="Cm" Rating="0"/>
  </COLLECTION>
</DJ_PLAYLISTS>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".xml", delete=False) as f:
            f.write(xml)
            f.flush()
            tracks = load_library_xml(Path(f.name))
        assert tracks[0].genre == ""
        assert tracks[0].comment == ""
        assert tracks[0].color_hex == ""
        assert tracks[0].date_added == ""
        assert tracks[0].label == ""
        assert tracks[0].play_count == 0


# ===========================================================================
# Q-241: _compatible_keys
# ===========================================================================


class TestCompatibleKeys:
    """Test the Camelot harmonic compatibility function."""

    def test_same_key_returned(self):
        keys = _compatible_keys("8A")
        assert "8A" in keys

    def test_returns_4_keys(self):
        keys = _compatible_keys("8A")
        assert len(keys) == 4

    def test_8A_compatible(self):
        """8A should be compatible with 8A, 9A, 7A, 8B."""
        keys = _compatible_keys("8A")
        assert set(keys) == {"8A", "9A", "7A", "8B"}

    def test_1A_wraps_backwards(self):
        """1A - 1 = 12A (wraps around)."""
        keys = _compatible_keys("1A")
        assert "12A" in keys
        assert "2A" in keys
        assert "1B" in keys

    def test_12B_wraps_forward(self):
        """12B + 1 = 1B (wraps around)."""
        keys = _compatible_keys("12B")
        assert "1B" in keys
        assert "11B" in keys
        assert "12A" in keys

    def test_relative_major_minor(self):
        """Same number, different letter = compatible."""
        keys = _compatible_keys("5A")
        assert "5B" in keys
        keys = _compatible_keys("5B")
        assert "5A" in keys

    def test_all_12_positions(self):
        """Every position 1-12 should return exactly 4 keys."""
        for n in range(1, 13):
            for letter in ["A", "B"]:
                keys = _compatible_keys(f"{n}{letter}")
                assert len(keys) == 4, f"Failed for {n}{letter}: got {keys}"

    def test_empty_string_returns_empty(self):
        assert _compatible_keys("") == []

    def test_question_mark_returns_empty(self):
        assert _compatible_keys("?") == []

    def test_edge_case_12A(self):
        keys = _compatible_keys("12A")
        assert set(keys) == {"12A", "1A", "11A", "12B"}

    def test_edge_case_1B(self):
        keys = _compatible_keys("1B")
        assert set(keys) == {"1B", "2B", "12B", "1A"}


# ===========================================================================
# Q-241: /api/library/genres endpoint
# ===========================================================================


@pytest.mark.asyncio
class TestGenresEndpoint:
    async def test_returns_sorted_genres(self, client):
        with patch("library.XML_PATH", FIXTURE_XML):
            resp = await client.get("/api/library/genres")
        assert resp.status_code == 200
        data = resp.json()
        assert "genres" in data
        genres = data["genres"]
        assert isinstance(genres, list)
        assert genres == sorted(genres)

    async def test_no_empty_genres(self, client):
        with patch("library.XML_PATH", FIXTURE_XML):
            resp = await client.get("/api/library/genres")
        genres = resp.json()["genres"]
        assert "" not in genres

    async def test_genres_unique(self, client):
        with patch("library.XML_PATH", FIXTURE_XML):
            resp = await client.get("/api/library/genres")
        genres = resp.json()["genres"]
        assert len(genres) == len(set(genres))

    async def test_expected_genres_from_fixture(self, client):
        with patch("library.XML_PATH", FIXTURE_XML):
            resp = await client.get("/api/library/genres")
        genres = resp.json()["genres"]
        assert "Techno" in genres
        assert "Melodic House & Techno" in genres

    async def test_missing_xml_returns_empty(self, client):
        with patch("library.try_load_library_db", return_value=None), \
             patch("library.XML_PATH", Path("/nonexistent/fake.xml")):
            resp = await client.get("/api/library/genres")
        assert resp.status_code == 200
        assert resp.json()["genres"] == []


# ===========================================================================
# Q-241: /api/library/compatible/{camelot} endpoint
# ===========================================================================


@pytest.mark.asyncio
class TestCompatibleEndpoint:
    async def test_returns_4_keys(self, client):
        resp = await client.get("/api/library/compatible/8A")
        assert resp.status_code == 200
        data = resp.json()
        assert data["input"] == "8A"
        assert len(data["compatible"]) == 4

    async def test_case_insensitive(self, client):
        resp = await client.get("/api/library/compatible/8a")
        assert resp.status_code == 200
        assert resp.json()["input"] == "8A"

    async def test_invalid_key_returns_400(self, client):
        resp = await client.get("/api/library/compatible/%3F")  # URL-encoded '?'
        assert resp.status_code == 400

    async def test_12B_wraps(self, client):
        resp = await client.get("/api/library/compatible/12B")
        data = resp.json()
        assert "1B" in data["compatible"]
        assert "12A" in data["compatible"]


# ===========================================================================
# Q-241: /api/library includes new fields
# ===========================================================================


@pytest.mark.asyncio
class TestLibraryEndpointNewFields:
    async def test_track_has_genre(self, client):
        with patch("library.try_load_library_db", return_value=None), \
             patch("library.XML_PATH", FIXTURE_XML):
            resp = await client.get("/api/library")
        t = resp.json()["tracks"][0]
        assert "genre" in t
        assert t["genre"] == "Melodic House & Techno"

    async def test_track_has_all_6_new_fields(self, client):
        with patch("library.try_load_library_db", return_value=None), \
             patch("library.XML_PATH", FIXTURE_XML):
            resp = await client.get("/api/library")
        t = resp.json()["tracks"][0]
        for field in ["genre", "comment", "color_hex", "date_added", "label", "play_count"]:
            assert field in t, f"Missing field: {field}"

    async def test_track_play_count_is_int(self, client):
        with patch("library.try_load_library_db", return_value=None), \
             patch("library.XML_PATH", FIXTURE_XML):
            resp = await client.get("/api/library")
        t = resp.json()["tracks"][0]
        assert isinstance(t["play_count"], int)
        assert t["play_count"] == 42


# ===========================================================================
# Q-241: CSV serialization includes genre
# ===========================================================================


class TestCSVGenreColumn:
    def test_header_has_genre(self):
        tracks = [
            Track("1", "xml", "T", "A", 128.0, "Am", "8A", 5, 300, 0,
                  file_path="/music/t.mp3", genre="House"),
        ]
        csv = serialise_library_for_claude(tracks)
        header = csv.strip().split("\n")[0]
        assert header == "title|artist|bpm|camelot|rating|duration_sec|genre"

    def test_row_has_genre_value(self):
        tracks = [
            Track("1", "xml", "T", "A", 128.0, "Am", "8A", 5, 300, 0,
                  file_path="/music/t.mp3", genre="Deep House"),
        ]
        csv = serialise_library_for_claude(tracks)
        row = csv.strip().split("\n")[1]
        assert row.endswith("|Deep House")

    def test_empty_genre_still_has_column(self):
        tracks = [
            Track("1", "xml", "T", "A", 128.0, "Am", "8A", 5, 300, 0,
                  file_path="/music/t.mp3"),
        ]
        csv = serialise_library_for_claude(tracks)
        row = csv.strip().split("\n")[1]
        fields = row.split("|")
        assert len(fields) == 7  # 6 original + genre

    def test_system_prompt_mentions_genre(self):
        tracks = [
            Track("1", "xml", "T", "A", 128.0, "Am", "8A", 5, 300, 0,
                  file_path="/music/t.mp3", genre="Techno"),
        ]
        prompt = build_system_prompt(tracks)
        assert "genre" in prompt.lower()
        assert "Techno" in prompt


# ===========================================================================
# Q-243: Transition scoring (Python equivalent of frontend logic)
# These verify the ALGORITHM is correct — the frontend copies this logic.
# ===========================================================================


class TestCamelotScoring:
    """Test Camelot wheel distance logic (matches AIChatSidebar.tsx camelotScore)."""

    @staticmethod
    def camelot_score(a: str, b: str) -> int:
        """Python equivalent of the frontend camelotScore function."""
        if not a or not b:
            return 1
        try:
            num_a = int(a[:-1])
            letter_a = a[-1].upper()
            num_b = int(b[:-1])
            letter_b = b[-1].upper()
        except (ValueError, IndexError):
            return 1
        if letter_a not in ("A", "B") or letter_b not in ("A", "B"):
            return 1
        # Same key
        if num_a == num_b and letter_a == letter_b:
            return 2
        # Relative major/minor
        if num_a == num_b and letter_a != letter_b:
            return 2
        # Same letter — circular distance
        if letter_a == letter_b:
            dist = min(abs(num_a - num_b), 12 - abs(num_a - num_b))
            if dist <= 1:
                return 2
            if dist <= 2:
                return 1
            return 0
        return 0

    def test_same_key_is_perfect(self):
        assert self.camelot_score("8A", "8A") == 2

    def test_relative_major_minor_is_perfect(self):
        assert self.camelot_score("8A", "8B") == 2

    def test_plus_1_same_letter_is_perfect(self):
        assert self.camelot_score("8A", "9A") == 2

    def test_minus_1_same_letter_is_perfect(self):
        assert self.camelot_score("8A", "7A") == 2

    def test_plus_2_same_letter_is_ok(self):
        assert self.camelot_score("8A", "10A") == 1

    def test_minus_2_same_letter_is_ok(self):
        assert self.camelot_score("8A", "6A") == 1

    def test_plus_3_same_letter_is_clash(self):
        assert self.camelot_score("8A", "11A") == 0

    def test_different_number_different_letter_is_clash(self):
        assert self.camelot_score("8A", "3B") == 0

    def test_wraps_12_to_1(self):
        assert self.camelot_score("12A", "1A") == 2

    def test_wraps_1_to_12(self):
        assert self.camelot_score("1A", "12A") == 2

    def test_empty_key_is_neutral(self):
        assert self.camelot_score("", "8A") == 1
        assert self.camelot_score("8A", "") == 1

    def test_opposite_side_of_wheel_is_clash(self):
        """6 steps apart = maximum distance on 12-position wheel."""
        assert self.camelot_score("1A", "7A") == 0


class TestTransitionScoring:
    """Test full transition scoring (matches AIChatSidebar.tsx scoreTransition)."""

    @staticmethod
    def score_transition(from_cam: str, from_bpm: float, to_cam: str, to_bpm: float) -> dict:
        """Python equivalent of frontend scoreTransition."""
        key_score = TestCamelotScoring.camelot_score(from_cam, to_cam)
        avg_bpm = (from_bpm + to_bpm) / 2
        bpm_jump_pct = abs(from_bpm - to_bpm) / avg_bpm * 100 if avg_bpm > 0 else 0

        if key_score == 0 or bpm_jump_pct >= 6:
            overall = "clash"
        elif key_score == 2 and bpm_jump_pct < 3:
            overall = "perfect"
        else:
            overall = "ok"
        return {"keyScore": key_score, "bpmJumpPct": bpm_jump_pct, "overall": overall}

    def test_same_key_same_bpm_is_perfect(self):
        r = self.score_transition("8A", 128.0, "8A", 128.0)
        assert r["overall"] == "perfect"
        assert r["bpmJumpPct"] == 0.0

    def test_compatible_key_small_bpm_jump(self):
        r = self.score_transition("8A", 128.0, "9A", 130.0)
        assert r["overall"] == "perfect"

    def test_compatible_key_large_bpm_jump_is_clash(self):
        """Even compatible keys become clash if BPM jump >= 6%."""
        r = self.score_transition("8A", 100.0, "9A", 140.0)
        assert r["overall"] == "clash"

    def test_incompatible_key_is_clash(self):
        r = self.score_transition("1A", 128.0, "7A", 128.0)
        assert r["overall"] == "clash"

    def test_ok_transition(self):
        """±2 key distance with small BPM jump = ok."""
        r = self.score_transition("8A", 128.0, "10A", 130.0)
        assert r["overall"] == "ok"

    def test_bpm_jump_percentage_calculation(self):
        r = self.score_transition("8A", 100.0, "8A", 110.0)
        # |100-110| / ((100+110)/2) * 100 = 10/105 * 100 ≈ 9.52%
        assert abs(r["bpmJumpPct"] - 9.52) < 0.1

    def test_zero_bpm_no_crash(self):
        r = self.score_transition("8A", 0.0, "8A", 0.0)
        assert r["bpmJumpPct"] == 0.0


# ===========================================================================
# Q-242: Energy label (Python equivalent of frontend logic)
# ===========================================================================


class TestEnergyLabel:
    """Test BPM-to-energy mapping (matches TrackTable.tsx energyLabel)."""

    @staticmethod
    def energy_label(bpm: float) -> str:
        if bpm < 90:
            return "Ambient"
        if bpm < 110:
            return "Hip-Hop"
        if bpm < 118:
            return "Soulful"
        if bpm < 122:
            return "Deep"
        if bpm < 126:
            return "Tech"
        if bpm < 130:
            return "House"
        if bpm < 135:
            return "Peak"
        if bpm < 140:
            return "Techno"
        return "Hard"

    def test_ambient(self):
        assert self.energy_label(70) == "Ambient"
        assert self.energy_label(89) == "Ambient"

    def test_hiphop(self):
        assert self.energy_label(90) == "Hip-Hop"
        assert self.energy_label(109) == "Hip-Hop"

    def test_soulful(self):
        assert self.energy_label(110) == "Soulful"
        assert self.energy_label(117) == "Soulful"

    def test_deep(self):
        assert self.energy_label(118) == "Deep"
        assert self.energy_label(121) == "Deep"

    def test_tech(self):
        assert self.energy_label(122) == "Tech"
        assert self.energy_label(125) == "Tech"

    def test_house(self):
        assert self.energy_label(126) == "House"
        assert self.energy_label(129) == "House"

    def test_peak(self):
        assert self.energy_label(130) == "Peak"
        assert self.energy_label(134) == "Peak"

    def test_techno(self):
        assert self.energy_label(135) == "Techno"
        assert self.energy_label(139) == "Techno"

    def test_hard(self):
        assert self.energy_label(140) == "Hard"
        assert self.energy_label(175) == "Hard"

    def test_boundaries_are_exclusive(self):
        """Each boundary falls into the next category."""
        assert self.energy_label(90) == "Hip-Hop"   # not Ambient
        assert self.energy_label(110) == "Soulful"  # not Hip-Hop
        assert self.energy_label(118) == "Deep"      # not Soulful
        assert self.energy_label(122) == "Tech"      # not Deep
        assert self.energy_label(126) == "House"     # not Tech
        assert self.energy_label(130) == "Peak"      # not House
        assert self.energy_label(135) == "Techno"    # not Peak
        assert self.energy_label(140) == "Hard"      # not Techno
