import asyncio
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bridge"))
import arrangement
import audio_preview


class FakeLive:
    """Session with 3 tracks x 3 scenes; song time advances half a beat per time query while playing."""
    def __init__(self, arrangement_clips=None):
        self.names = ["Kick", "Bass", "Pad"]
        self.clips = {(0, 0), (0, 1), (1, 1), (2, 2)}
        self.playing = False
        self.record_mode = 0
        self.time = 0.0
        self.solo = [0, 1, 0]
        self.arm = [0, 1, 0]
        self.quantization = 0
        self.loop = 1
        self.arrangement = arrangement_clips or {}
        self.fired = []
        self.back_to_arranger = 0
        self.recorded_during = []

    async def _query_osc(self, request, address, args, timeout):
        a = list(args)
        value = {
            "/live/song/get/is_playing": lambda: [int(self.playing)],
            "/live/song/get/record_mode": lambda: [self.record_mode],
            "/live/song/get/session_record": lambda: [0],
            "/live/song/get/track_names": lambda: self.names[:],
            "/live/song/get/num_scenes": lambda: [3],
            "/live/scene/get/name": lambda: [a[0], ["Intro", "Drop", "Break"][a[0]]],
            "/live/clip_slot/get/has_clip": lambda: [*a, int(tuple(a) in self.clips)],
            "/live/clip/get/is_playing": lambda: [*a, int(self.playing)],
            "/live/song/get/current_song_time": self._tick,
            "/live/song/get/clip_trigger_quantization": lambda: [self.quantization],
            "/live/song/get/loop": lambda: [self.loop],
            "/live/song/get/tempo": lambda: [124.0],
            "/live/song/get/signature_numerator": lambda: [4],
            "/live/song/get/signature_denominator": lambda: [4],
            "/live/track/get/solo": lambda: [a[0], self.solo[a[0]]],
            "/live/track/get/arm": lambda: [a[0], self.arm[a[0]]],
            "/live/track/get/can_be_armed": lambda: [a[0], True],
            "/live/track/get/arrangement_clips/name": lambda: [a[0], *self.arrangement.get(a[0], [])],
            "/live/track/get/arrangement_clips/start_time": lambda: [a[0], *([0.0] * len(self.arrangement.get(a[0], [])))],
            "/live/song/get/back_to_arranger": lambda: [self.back_to_arranger],
        }[address]()
        return {"status": "ok", "args": value}

    def _tick(self):
        if self.playing:
            self.time += 0.5
        return [self.time]

    def _send_osc(self, address, args):
        if address == "/live/scene/fire":
            self.fired.append((args[0], self.time))
            self.playing = True  # Live starts the transport when a scene launches
            if self.record_mode:
                self.recorded_during.append(args[0])
        elif address == "/live/song/set/back_to_arranger":
            self.back_to_arranger = args[0]
        elif address == "/live/song/stop_all_clips" and any(self.arrangement.values()):
            self.back_to_arranger = 1  # like Live: touching Session clips re-enables the Session override
        elif address == "/live/song/start_playing":
            self.playing = True
        elif address == "/live/song/stop_playing":
            if self.record_mode:
                for track in range(len(self.names)):
                    self.arrangement.setdefault(track, []).append("take")
            self.playing = False
        elif address == "/live/song/set/record_mode":
            if self.record_mode and not args[0] and self.playing:  # ending Arrangement Record keeps the takes
                for track in range(len(self.names)):
                    self.arrangement.setdefault(track, []).append("take")
            self.record_mode = args[0]
        elif address == "/live/song/set/current_song_time":
            self.time = args[0]
        elif address == "/live/song/set/clip_trigger_quantization":
            self.quantization = args[0]
        elif address == "/live/song/set/loop":
            self.loop = args[0]
        elif address == "/live/track/set/solo":
            self.solo[args[0]] = args[1]
        elif address == "/live/track/set/arm":
            self.arm[args[0]] = args[1]


SECTIONS = [{"scene": 0, "bars": 2}, {"scene": 1, "bars": 4}, {"scene": 2, "bars": 2}]


def test_arrangement_fires_each_scene_just_before_its_boundary_and_restores():
    live = FakeLive()
    with patch.object(arrangement.asyncio, "sleep", AsyncMock()):
        result = asyncio.run(arrangement.record_arrangement(live, SECTIONS))
    assert result["status"] == "verified", result
    assert [scene for scene, _ in live.fired] == [0, 1, 2]
    # Intro 2 bars -> Drop at beat 8, Break at beat 24; each is launched 2 beats early under 1-bar quantization.
    assert [round(t) for _, t in live.fired[1:]] == [6, 22]
    assert live.recorded_during == [1, 2]
    assert [s["start_bar"] for s in result["sections"]] == [1, 3, 7]
    assert result["bars"] == 8
    assert (live.record_mode, live.playing, live.quantization, live.loop, live.arm) == (0, False, 0, 1, [0, 1, 0])
    assert live.back_to_arranger == 0, "the new Arrangement must be what plays next"


def test_arrangement_never_records_over_existing_clips():
    live = FakeLive(arrangement_clips={1: ["old bass take"]})
    result = asyncio.run(arrangement.record_arrangement(live, SECTIONS))
    assert result["status"] == "failed" and "Bass" in result["summary"]
    assert live.fired == [] and live.record_mode == 0


def test_arrangement_rejects_bad_plans_before_touching_live():
    live = FakeLive()
    for sections in ([], [{"scene": 0, "bars": 0}], [{"scene": 0, "bars": 128}] * 5, [{"scene": 5, "bars": 4}]):
        result = asyncio.run(arrangement.record_arrangement(live, sections))
        assert result["status"] == "failed"
    assert live.fired == []


def test_scene_preview_plays_the_full_mix_and_restores_solos():
    live = FakeLive()
    recorded = {}

    async def fake_record(helper, seconds, on_ready):
        await on_ready()
        recorded["solos"] = live.solo[:]
        return {"has_signal": True, "peak_dbfs": -3.0, "duration_seconds": seconds}, b"\x00\x00\x00\x18ftypM4A "

    with patch.object(audio_preview, "helper_path", return_value=Path("/")), \
         patch.object(audio_preview, "record_with_helper", fake_record), \
         patch.object(audio_preview.asyncio, "sleep", AsyncMock()):
        result = asyncio.run(audio_preview.capture_scene(live, 1, 8))
    assert result["status"] == "verified", result
    assert (result["kind"], result["track"], result["scene_name"]) == ("scene", -1, "Drop")
    assert result["tracks"] == ["Kick", "Bass"]
    assert recorded["solos"] == [0, 0, 0], "every track must be heard in a full-mix preview"
    assert live.solo == [0, 1, 0] and live.fired == [(1, 0.0)]


def test_song_tools_ask_older_bridges_to_update():
    import main
    bridge = SimpleNamespace(capabilities={"local_separation_v1"}, local_operation=AsyncMock(), user_id=1)
    result = asyncio.run(main._execute_tool("record_arrangement", {"sections": SECTIONS}, bridge))
    assert result["status"] == "failed" and "Bridge 1.3" in result["summary"]
    bridge.local_operation.assert_not_called()


def test_full_mix_recordings_are_not_linked_to_a_planned_part():
    import recordings
    result = {"status": "verified", "audio_base64": "AAAAGGZ0eXBNNEEg", "kind": "scene", "scene_name": "Drop",
              "track": -1, "scene": 2, "track_name": "Full mix - Drop", "metrics": {"duration_seconds": 8}}
    import tempfile
    with tempfile.TemporaryDirectory() as directory, patch.object(recordings, "ROOT", Path(directory)):
        saved = recordings.save_recording(7, result)
    assert saved["recording"]["kind"] == "scene" and saved["recording"]["scene_name"] == "Drop"
