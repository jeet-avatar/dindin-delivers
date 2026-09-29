import numpy as np
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


def test_effect_recipe_follows_the_reference_and_offers_installed_plugins_only_on_opt_in():
    import chat_tools
    result = asyncio.run(chat_tools.execute("get_effect_recipe", {"role": "Bass", "genre": "melodic techno",
                                                                   "band_deltas": {"25-80 Hz": -9.2, "200-800 Hz": 5.1},
                                                                   "installed_plugins": ["FabFilter Pro-Q 3"]}, 1))
    assert result["role"] == "bass" and result["chain"][0]["device"] == "EQ Eight"
    assert "installed_alternatives" not in result["chain"][0], "third-party only after the user opts in"
    assert result["reference_adjustments"][0].startswith("boost 3-4 dB in the sub")
    opted = asyncio.run(chat_tools.execute("get_effect_recipe", {"role": "Bass", "installed_plugins": ["FabFilter Pro-Q 3"],
                                                                  "allow_third_party": True}, 1))
    assert opted["chain"][0]["installed_alternatives"] == ["FabFilter Pro-Q 3"]


def test_mix_check_flags_clipping_and_names_the_armed_track():
    import json, tempfile
    import mix_check, recordings
    live = FakeLive()
    live.arm = [0, 1, 0]
    live.clips.add((2, 1))  # the Pad plays in the Drop too
    async def query(address, args):
        extra = {"/live/track/get/mute": lambda: [args[0], 0], "/live/track/get/volume": lambda: [args[0], 0.85]}
        if address in extra:
            return extra[address]()
        return (await live._query_osc("t", address, args, 4))["args"]
    with tempfile.TemporaryDirectory() as directory, patch.object(recordings, "ROOT", Path(directory)), \
         patch.object(mix_check, "loudness", return_value=(-9.6, 0.7)), patch.object(mix_check, "stereo_samples", return_value=np.random.default_rng(1).normal(0, 0.1, (44100, 1)).repeat(2, axis=1)):
        (Path(directory) / ("b" * 32 + ".json")).write_text(json.dumps({"id": "b" * 32, "user_id": 3, "kind": "scene", "scene": 1, "scene_name": "Drop",
                                                                         "created_at": "2026-09-28T01:00:00"}))
        for rid, track, rms, when in (("d" * 32, 0, -20.0, "2026-09-28T00:01:00"), ("e" * 32, 2, -15.0, "2026-09-28T00:02:00")):
            (Path(directory) / (rid + ".json")).write_text(json.dumps({"id": rid, "user_id": 3, "track": track, "scene": 1,
                                                                        "metrics": {"rms_dbfs": rms}, "created_at": when}))
        result = asyncio.run(mix_check.run(3, "b" * 32, query))
    checks = {c["id"]: c for c in result["checks"]}
    assert checks["headroom"]["status"] == "fail" and checks["loudness"]["status"] == "warn"
    assert checks["safety"]["fix"] == "Before exporting: unsolo Bass, disarm Bass."
    assert checks["balance"]["status"] == "warn" and "Pad (+5.0 dB vs kick)" in checks["balance"]["detail"]
    part = asyncio.run(mix_check.run(3, "c" * 32, query))
    assert part["status"] == "failed"


def test_master_limiter_picks_values_from_live_display_curve():
    import json, master_chain
    state = {"devices": ["Glue Compressor"], "set": {}}
    curve = lambda unit_range: json.dumps({"min": 0.0, "max": 1.0, "displays": [f"{unit_range[0] + i * (unit_range[1] - unit_range[0]) / 10:.1f} dB" for i in range(11)]})
    async def query(address, args):
        if address.endswith("/devices"):
            return state["devices"]
        if address.endswith("/load"):
            state["devices"].append(args[0]); return ["loaded", args[0]]
        if address.endswith("/parameters"):
            return ["ok", json.dumps({"parameters": [{"name": "Input Gain"}, {"name": "Ceiling"}]})]
        if address.endswith("/curve"):
            return ["ok", curve((-3.0, 0.0) if args[1] == "Ceiling" else (0.0, 10.0))]
        if address.endswith("/set"):
            state["set"][args[1]] = args[2]; return ["ok", args[2], "set"]
    result = asyncio.run(master_chain.apply(query, AsyncMock(), measured_lufs=-18.0))
    assert result["status"] == "verified" and state["devices"][-1] == "Limiter"
    assert state["set"] == {"Ceiling": 0.7, "Input Gain": 0.4}  # -1.0 dB ceiling and +4 dB gain for -18 -> -14 LUFS
    loud = asyncio.run(master_chain.apply(query, AsyncMock(), measured_lufs=-9.6))
    assert loud["master"]["gain_db"] == 0.0 and "no gain" in loud["summary"]


def test_numbers_sent_as_text_reach_live_as_numbers():
    import automation
    assert automation.numeric_value({"value": "4000", "unit": "Hz"})["value"] == 4000.0
    assert automation.numeric_value({"value": " 2.5 ", "unit": "dB"})["value"] == 2.5
    assert automation.numeric_value({"value": "High Pass 48dB", "unit": "label"})["value"] == "High Pass 48dB"
    assert automation.numeric_value({"value": "loud", "unit": "dB"})["value"] == "loud"


def test_polish_prompt_requires_an_explicit_yes():
    from claude_tools import SYSTEM_PROMPT
    assert "apply only after an explicit yes" in SYSTEM_PROMPT


def test_sidechain_is_verified_only_when_the_source_reads_back():
    import automation
    async def send(address, args, query, timeout):
        return {"status": "ok", "address": address, "args": ['{"status": "observed", "source": "Kick", "sources": ["Kick"]}']}
    ok = asyncio.run(automation.execute_automation("set_sidechain", {"track": 3, "device": 5, "source": "Kick"}, send))
    assert ok["status"] == "verified"
    wrong = asyncio.run(automation.execute_automation("set_sidechain", {"track": 3, "device": 5, "source": "Drums"}, send))
    assert wrong["status"] == "partial" and "reads back" in wrong["summary"]


def test_clip_automation_points_sent_as_text_become_numbers():
    import automation, json
    sent = {}
    async def send(address, args, query, timeout):
        sent.update(json.loads(args[0]))
        return {"status": "ok", "address": address, "args": ['{"status": "verified", "summary": "ok"}']}
    asyncio.run(automation.execute_automation("write_clip_automation", {"track": 4, "path": [1], "scene": 1, "map_id": "a" * 24,
        "control": "Frequency", "unit": "Hz", "points": [{"beat": 0, "value": "300", "curve": "exponential"}, {"beat": 32, "value": "18000"}],
        "purpose": "tension", "reset": "Drop clip holds 20 kHz"}, send))
    assert [p["value"] for p in sent["points"]] == [300.0, 18000.0] and sent["points"][0]["curve"] == "exponential"


def test_automation_needs_purpose_reset_and_respects_limits():
    import automation, json
    sent = []
    async def send(address, args, query, timeout):
        sent.append(address)
        return {"status": "ok", "address": address, "args": ['{"status": "verified", "summary": "ok"}']}
    run = lambda data, name="": asyncio.run(automation.execute_automation("write_clip_automation", data, send, name))
    base = {"track": 4, "scene": 1, "unit": "dB", "mixer": "volume", "purpose": "movement", "reset": "next clip at 0 dB",
            "points": [{"beat": 0, "value": -6}, {"beat": 16, "value": 0}]}
    missing = {k: v for k, v in base.items() if k != "reset"}
    assert run(missing)["status"] == "failed" and "reset" in run(missing)["summary"]
    assert "2 dB" in run(base)["summary"]
    assert run({**base, "purpose": "introduce"})["status"] == "verified"
    send_ride = {**base, "mixer": "send", "send": 0, "points": [{"beat": 0, "value": -20}, {"beat": 4, "value": -19}]}
    assert "low end" in run(send_ride, "Kick")["summary"] and run(send_ride, "Chords")["status"] == "verified"
    feedback = {"track": 5, "path": [3], "scene": 1, "map_id": "a" * 24, "control": "Feedback", "unit": "%", "purpose": "tension",
                "reset": "Drop clip 30%", "points": [{"beat": 0, "value": 30}, {"beat": 4, "value": 90}]}
    assert "75%" in run(feedback)["summary"]
    assert sent == ["/live/beatmind/clip_envelope"] * 2
    control = asyncio.run(automation.execute_automation("set_device_control", {"track": 5, "path": [3], "map_id": "a" * 24,
                                                         "control": "Resonance", "value": 85, "unit": "%"}, send))
    assert "70%" in control["summary"]


def test_density_warns_after_five_controls_in_a_section():
    import automation
    registry = {}
    for i in range(6):
        result = automation.note_density(registry, {"track": i, "scene": 2, "control": "Frequency"}, {"status": "verified"})
    assert "6 controls" in result["density_warning"]
    again = automation.note_density(registry, {"track": 0, "scene": 3, "mixer": "send", "send": 1}, {"status": "verified"})
    assert "density_warning" not in again


def test_mix_analysis_bands_mono_and_energy_arc():
    import mix_check
    t = np.arange(44100 * 2) / 44100
    sub = np.sin(2 * np.pi * 50 * t)
    mono = np.stack([sub, sub], axis=1)
    wide = np.stack([sub, -sub], axis=1)
    assert mix_check.low_end_correlation(mono) == 1.0 and mix_check.low_end_correlation(wide) == -1.0
    mud = np.sin(2 * np.pi * 300 * t)
    assert mix_check.band_shares(np.stack([mud, mud], axis=1))["mud"] > 95
    problems = mix_check.energy_problems({"Build": -9.0, "Drop": -9.5, "Break": -12.0, "Drop 2": -10.0})
    assert len(problems) == 2 and "Drop (-9.5 LUFS)" in problems[0] and "Drop 2" in problems[1]
    assert mix_check.energy_problems({"Build": -12.0, "Drop": -9.0, "Break": -14.0, "Drop 2": -8.5}) == []


def test_prompt_has_sidechain_velocity_and_automation_rules():
    from claude_tools import SYSTEM_PROMPT
    for phrase in ("set_sidechain with source \"Kick\"", "Hats/percussion: base 75-80", "write_clip_automation so movement is saved",
                   "exponential for filter sweeps", "has a purpose", "loudness-matched"):
        assert phrase in SYSTEM_PROMPT


def test_cut_off_answers_are_continued_and_blank_answers_explained():
    import main
    from types import SimpleNamespace as NS

    def run(replies):
        session = main.ChatSession("long-answer", 1)
        session.planning_only = True
        session.messages = [{"role": "user", "content": "plan the arrangement"}]
        client = NS(messages=NS(create=AsyncMock(side_effect=replies)))
        with patch.object(main, "claude_client", client):
            return asyncio.run(main._run_claude_loop(session, None))[0]

    assert run([NS(stop_reason="max_tokens", content=[NS(type="text", text="Part one, ")]),
                NS(stop_reason="end_turn", content=[NS(type="text", text="part two.")])]) == "Part one, part two."
    assert "did not produce an answer" in run([NS(stop_reason="end_turn", content=[])])


def test_history_keeps_the_last_proposal_by_shrinking_old_tool_evidence():
    import json
    from model_history import bounded_history
    bulky = json.dumps({"status": "observed", "summary": "Read device tree", "devices": ["x" * 400] * 60})
    turns = []
    for n in range(6):
        turns += [{"role": "user", "content": f"request {n}"},
                  {"role": "assistant", "content": [{"type": "tool_use", "id": f"t{n}", "name": "get_track_device_tree", "input": {"track": n}}]},
                  {"role": "user", "content": [{"type": "tool_result", "tool_use_id": f"t{n}", "content": bulky}]},
                  {"role": "assistant", "content": f"PROPOSAL {n}: the full plan text"}]
    turns.append({"role": "user", "content": "Approved, go ahead"})
    kept = bounded_history(turns, max_bytes=40000)
    text = json.dumps(kept)
    assert "PROPOSAL 5: the full plan text" in text and "Approved, go ahead" in text
    assert len(text.encode()) <= 40000


def test_read_clip_automation_is_read_only_and_passes_the_target():
    import automation, json
    sent = []
    async def send(address, args, query, timeout):
        sent.append((address, json.loads(args[0])))
        return {"status": "ok", "address": address, "args": ['{"status": "observed", "has_clip": true, "automations": [], "summary": "No automation is stored in this clip."}']}
    result = asyncio.run(automation.execute_automation("read_clip_automation", {"track": 4, "scene": 1, "mixer": "send", "send": 0}, send))
    assert result["status"] == "observed" and sent == [("/live/beatmind/clip_automation", {"track": 4, "scene": 1, "mixer": "send", "send": 0})]
    from claude_tools import SYSTEM_PROMPT
    assert "read_clip_automation on that clip" in SYSTEM_PROMPT
