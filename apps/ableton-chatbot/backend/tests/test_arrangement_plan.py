import copy
import asyncio
from functools import wraps
import importlib.util
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

import arrangement_plan as engine
import chat_store


spec = importlib.util.spec_from_file_location("arrangement_extension_test", Path(__file__).resolve().parents[2] / "bridge/abletonosc/beatmind_automation.py")
extension = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extension)


def async_test(fn):
    @wraps(fn)
    def run(*args, **kwargs):
        return asyncio.run(fn(*args, **kwargs))
    return run


class Clip:
    def __init__(self, start=0, length=16):
        self.name = "Approved kick"
        self.start_time, self.end_time = start, start + length
        self.loop_start, self.loop_end = 0, length
        self.start_marker, self.end_marker = 0, length
        self.looping = True
        self.muted = self.is_audio_clip = False
        self.velocity = 96

    def get_notes_extended(self, *args):
        return getattr(self, "notes", [SimpleNamespace(note_id=1, pitch=36, start_time=0, duration=0.25, velocity=self.velocity, mute=False)])

    def get_all_notes_extended(self):
        return self.get_notes_extended()

    def remove_notes_by_id(self, ids):
        self.notes = [n for n in self.get_notes_extended() if n.note_id not in ids]

    def add_new_notes(self, specs):
        self.notes = [SimpleNamespace(**vars(n), note_id=i + 1) for i, n in enumerate(specs)]


class Track:
    def __init__(self):
        self.name = "Kick"
        self.mute = self.muted_via_solo = False
        self.has_audio_output = True
        self.devices = [SimpleNamespace(name="Drum Rack")]
        self.clip_slots = [SimpleNamespace(has_clip=True, clip=Clip())]
        self.arrangement_clips = []
        self.copies = 0

    def duplicate_clip_to_arrangement(self, source, start):
        target = copy.copy(source)
        if source in self.arrangement_clips:
            length = source.end_time - source.start_time
        else:
            length = source.loop_end - source.loop_start if source.looping else source.end_marker - source.start_marker
        target.end_time = start + length
        target.start_time = start
        self.arrangement_clips.append(target)
        self.arrangement_clips.sort(key=lambda c: c.start_time)
        self.copies += 1


class Bridge:
    def __init__(self):
        self.song = SimpleNamespace(tempo=128, signature_numerator=4, signature_denominator=4,
            tracks=[Track()], cue_points=[], is_playing=False, record_mode=False, session_record=False,
            begin_undo_step=lambda: None, end_undo_step=lambda: None)
        self.handlers = {}
        extension.register(SimpleNamespace(song=self.song, osc_server=SimpleNamespace(
            add_handler=lambda path, fn: self.handlers.update({path: fn}))), None)
        self.drop_write_reply = False
        self.drop_revision_reply = False

    async def send_command(self, address, args, expect_reply):
        result = self.handlers[address](args)
        if self.drop_write_reply and json.loads(args[0])["action"] == "place_clip":
            return {"status": "timeout"}
        if self.drop_revision_reply and json.loads(args[0])["action"] == "revise_notes":
            return {"status": "timeout"}
        return {"status": "ok", "args": result}


def section(name="Intro", start=1, bars=8):
    return {"id": name.lower().replace(" ", "_"), "name": name, "kind": "intro", "purpose": "Establish groove",
            "start_bar": start, "bars": bars, "energy": 0.3, "vocal_state": "absent", "percussion_density": 0.2,
            "depends_on": [], "assignments": [{"track": 0, "kind": "session", "index": 0,
                "clip_id": "source", "role": "kick", "offset_bars": 0, "repeats": bars // 4}],
            "transition": {"type": "none", "bars": 0, "instructions": ""}, "effects": []}


def plan_data():
    return {"title": "Minimal development", "genre": "deep minimal house", "bpm": 128,
            "numerator": 4, "denominator": 4, "sections": [section(), section("Drop", 9)]}


@pytest.fixture
def session(tmp_path, monkeypatch):
    monkeypatch.setattr(chat_store, "ROOT", tmp_path)
    return SimpleNamespace(user_id=42, session_id="arrangement-test", messages=[],
                           project={"live_set": {"title": "Disposable test"}})


@pytest.mark.parametrize("bars,seconds", [(4, 7.5), (8, 15), (16, 30), (32, 60), (64, 120), (192, 360)])
def test_exact_reference_spec_timing(bars, seconds):
    assert engine.timing(128, 4, 4, bars) == (bars * 4, seconds)


def test_non_four_four_meter():
    assert engine.timing(120, 7, 8, 8) == (28, 14)
    assert engine.timing(120, 3, 4, 8) == (24, 12)


@pytest.mark.parametrize("value", [0, -1, True, float("nan"), float("inf")])
def test_invalid_timing(value):
    with pytest.raises(ValueError):
        engine.timing(value, 4, 4, 8)


def test_six_minutes_and_section_purposes():
    data = plan_data()
    data.update(target_seconds=360, sections=[section("DJ Intro", 1, 32), section("Main Groove", 33, 64),
                section("Breakdown", 97, 32), section("Final Drop", 129, 32), section("DJ Outro", 161, 32)])
    plan = engine.compile_plan(data)
    assert plan["duration_seconds"] == 360
    assert plan["total_bars"] == 192
    assert plan["sections"][-1]["end_bar_exclusive"] == 193
    assert not plan["approved"] and not plan["complete"]


@pytest.mark.parametrize("change", ["gap", "overlap", "dependency", "duplicate", "transition", "duration", "nan"])
def test_bad_plan_never_passes(change):
    data = plan_data()
    if change == "gap": data["sections"][1]["start_bar"] = 10
    if change == "overlap": data["sections"][1]["start_bar"] = 8
    if change == "dependency": data["sections"][0]["depends_on"] = ["drop"]
    if change == "duplicate": data["sections"][1]["id"] = "intro"
    if change == "transition": data["sections"][0]["transition"]["bars"] = 10
    if change == "duration": data["target_seconds"] = 360
    if change == "nan": data["bpm"] = float("nan")
    with pytest.raises(ValueError):
        engine.compile_plan(data)


async def propose(bridge, session):
    state = await engine.inventory(bridge)
    data = plan_data()
    for s in data["sections"]:
        s["assignments"][0]["clip_id"] = state["tracks"][0]["clips"][0]["clip_id"]
    return await engine.execute("plan_song_arrangement", data, session, bridge)


@async_test
async def test_staged_workflow_preserves_source_and_does_not_claim_complete(session):
    bridge = Bridge()
    result = await propose(bridge, session)
    assert result["status"] == "observed", result
    plan = result["arrangement_plan"]
    assert bridge.song.tracks[0].copies == 0
    refused = await engine.execute("execute_arrangement_section", {"revision": plan["revision"], "section_id": "intro"}, session, bridge)
    assert refused["status"] == "unverified"
    engine.approve_from_message(session, "Approve arrangement " + plan["revision"])
    out_of_order = await engine.execute("execute_arrangement_section", {"revision": plan["revision"], "section_id": "drop"}, session, bridge)
    assert out_of_order["status"] == "unverified"
    for s in plan["sections"]:
        result = await engine.execute("execute_arrangement_section", {"revision": plan["revision"], "section_id": s["id"]}, session, bridge)
        assert result["status"] == "verified", result
        assert not result["complete"]
    track = bridge.song.tracks[0]
    assert [(c.start_time, c.end_time) for c in track.arrangement_clips] == [(0, 16), (16, 32), (32, 48), (48, 64)]
    assert (track.clip_slots[0].clip.velocity, track.clip_slots[0].clip.end_time, track.devices[0].name) == (96, 16, "Drum Rack")
    checked = await engine.execute("verify_song_arrangement", {}, session, bridge)
    assert checked["status"] == "observed" and not checked["complete"]
    assert all(c["all_present"] for c in checked["section_checks"])
    restored = chat_store.load(42, session.session_id)
    assert restored["project"]["arrangement_plan"]["sections"][-1]["state"] == "placed"
    track.arrangement_clips[-1].velocity = 50
    assert (await engine.execute("verify_song_arrangement", {}, session, bridge))["status"] == "unverified"


@async_test
async def test_timeout_checkpoint_survives_reload_without_duplicate(session):
    bridge = Bridge()
    plan = (await propose(bridge, session))["arrangement_plan"]
    engine.approve_from_message(session, "Approve arrangement " + plan["revision"])
    bridge.drop_write_reply = True
    args = {"revision": plan["revision"], "section_id": "intro"}
    result = await engine.execute("execute_arrangement_section", args, session, bridge)
    assert result["status"] == "unverified"
    assert bridge.song.tracks[0].copies == 1
    session.project = chat_store.load(42, session.session_id)["project"]
    bridge.drop_write_reply = False
    again = await engine.execute("execute_arrangement_section", args, session, bridge)
    assert again["status"] == "unverified" and "already attempted" in again["summary"]
    assert bridge.song.tracks[0].copies == 1


@async_test
async def test_rejects_occupied_destination_before_any_copy(session):
    bridge = Bridge()
    old = Clip(16)
    bridge.song.tracks[0].arrangement_clips.append(old)
    result = await propose(bridge, session)
    assert result["status"] == "unverified" and "existing music" in result["summary"]
    assert bridge.song.tracks[0].copies == 0
    assert bridge.song.tracks[0].arrangement_clips == [old]


@pytest.mark.parametrize("change", ["tempo", "source", "mute", "occupied", "set", "playing"])
@async_test
async def test_changes_after_approval_fail_closed(session, change):
    bridge = Bridge()
    plan = (await propose(bridge, session))["arrangement_plan"]
    engine.approve_from_message(session, "Approve arrangement " + plan["revision"])
    if change == "tempo": bridge.song.tempo = 130
    if change == "source": bridge.song.tracks[0].clip_slots[0].clip.velocity = 110
    if change == "mute": bridge.song.tracks[0].mute = True
    if change == "occupied": bridge.song.tracks[0].arrangement_clips.append(Clip(16))
    if change == "set": plan["set_id"] = "wrong-set"
    if change == "playing": bridge.song.is_playing = True
    result = await engine.execute("execute_arrangement_section", {"revision": plan["revision"], "section_id": "intro"}, session, bridge)
    assert result["status"] == "unverified", result
    assert bridge.song.tracks[0].copies == 0


@async_test
async def test_inspection_paginates_clips_without_losing_them():
    bridge = Bridge()
    bridge.song.tracks[0].arrangement_clips = [Clip(i * 16) for i in range(35)]
    state = await engine.inventory(bridge)
    assert len(state["tracks"][0]["clips"]) == 36
    assert len({c["clip_id"] for c in state["tracks"][0]["clips"]}) == 36


def test_stale_or_embedded_approval_does_not_authorize(session):
    session.project["arrangement_plan"] = {"revision": "a" * 16, "approved": False}
    for message in ["Approve arrangement " + "b" * 16, "not: Approve arrangement " + "a" * 16, "yes"]:
        engine.approve_from_message(session, message)
        assert not session.project["arrangement_plan"]["approved"]


@async_test
async def test_session_launch_history_is_not_used_as_musical_duration(session):
    bridge = Bridge()
    bridge.song.tracks[0].clip_slots[0].clip.start_time = -88
    result = await propose(bridge, session)
    assert result["status"] == "observed", result
    rows = result["arrangement_plan"]["placements"]["intro"]
    assert [(r["start"], r["end"]) for r in rows] == [(0, 16), (16, 32)]


@async_test
async def test_pickup_is_not_silently_removed(session):
    bridge = Bridge()
    bridge.song.tracks[0].clip_slots[0].clip.start_marker = -1
    result = await propose(bridge, session)
    assert result["status"] == "unverified" and "pickup" in result["summary"]
    assert bridge.song.tracks[0].clip_slots[0].clip.start_marker == -1


@async_test
async def test_retains_existing_arrangement_clip_without_duplication(session):
    bridge = Bridge()
    track = bridge.song.tracks[0]
    source = Clip(0, 32)
    track.arrangement_clips.append(source)
    state = await engine.inventory(bridge)
    data = plan_data()
    data["sections"] = [section()]
    data["sections"][0]["assignments"][0].update(kind="arrangement", repeats=1,
        clip_id=next(c["clip_id"] for c in state["tracks"][0]["clips"] if c["kind"] == "arrangement"))
    result = await engine.execute("plan_song_arrangement", data, session, bridge)
    assert result["status"] == "observed", result
    plan = result["arrangement_plan"]
    engine.approve_from_message(session, "Approve arrangement " + plan["revision"])
    placed = await engine.execute("execute_arrangement_section", {"revision": plan["revision"], "section_id": "intro"}, session, bridge)
    assert placed["status"] == "verified", placed
    assert track.arrangement_clips == [source] and track.copies == 0


async def revision_fixture(session, monkeypatch):
    monkeypatch.setitem(sys.modules, "Live", SimpleNamespace(Clip=SimpleNamespace(MidiNoteSpecification=SimpleNamespace)))
    bridge = Bridge()
    plan = (await propose(bridge, session))["arrangement_plan"]
    engine.approve_from_message(session, "Approve arrangement " + plan["revision"])
    for s in plan["sections"]:
        result = await engine.execute("execute_arrangement_section", {"revision": plan["revision"], "section_id": s["id"]}, session, bridge)
        assert result["status"] == "verified", result
    source = Clip()
    source.velocity = 72
    bridge.song.tracks[0].clip_slots.append(SimpleNamespace(has_clip=True, clip=source))
    state = await engine.inventory(bridge)
    source_id = next(c["clip_id"] for c in state["tracks"][0]["clips"] if c["kind"] == "session" and c["index"] == 1)
    proposal = await engine.execute("plan_arrangement_revision", {
        "section_id": "drop", "track": 0, "source_id": source_id, "reason": "Make the drop kick softer"}, session, bridge)
    assert proposal["status"] == "observed", proposal
    return bridge, plan, plan["pending_revision"]


@async_test
async def test_scoped_revision_preserves_intro_and_original_session(session, monkeypatch):
    bridge, plan, revision = await revision_fixture(session, monkeypatch)
    args = {"revision": revision["revision"]}
    rejected = await engine.execute("execute_arrangement_revision", args, session, bridge)
    assert rejected["status"] == "unverified"
    engine.approve_from_message(session, "Approve part revision " + revision["revision"])
    result = await engine.execute("execute_arrangement_revision", args, session, bridge)
    assert result["status"] == "verified", result
    assert all("notes" not in c for c in result["arrangement_plan"]["pending_revision"]["checkpoints"])
    track = bridge.song.tracks[0]
    assert [c.get_notes_extended()[0].velocity for c in track.arrangement_clips] == [96, 96, 72, 72]
    assert [(c.start_time, c.end_time) for c in track.arrangement_clips] == [(0, 16), (16, 32), (32, 48), (48, 64)]
    assert track.clip_slots[0].clip.velocity == 96 and track.copies == 4
    assert revision["audition_status"] == "required" and not plan["complete"]
    saved = chat_store.load(42, session.session_id)["project"]["arrangement_plan"]["pending_revision"]
    assert len(saved["checkpoints"]) == 2
    assert saved["checkpoints"][0]["notes"][0]["velocity"] == 96
    assert (await engine.execute("verify_song_arrangement", {}, session, bridge))["status"] == "observed"
    assert (await engine.execute("execute_arrangement_revision", args, session, bridge))["status"] == "unverified"


@pytest.mark.parametrize("changed", ["source", "target", "position", "tempo", "playing", "approval"])
@async_test
async def test_revision_rechecks_before_writing(session, monkeypatch, changed):
    bridge, plan, revision = await revision_fixture(session, monkeypatch)
    engine.approve_from_message(session, "Approve part revision " + revision["revision"])
    track = bridge.song.tracks[0]
    if changed == "source": track.clip_slots[1].clip.velocity = 60
    if changed == "target": track.arrangement_clips[-1].velocity = 80
    if changed == "position": track.arrangement_clips[-1].start_time += 1
    if changed == "tempo": bridge.song.tempo = 129
    if changed == "playing": bridge.song.is_playing = True
    args = {"revision": "0" * 16 if changed == "approval" else revision["revision"]}
    result = await engine.execute("execute_arrangement_revision", args, session, bridge)
    assert result["status"] == "unverified", result
    assert revision["state"] == "proposed"
    assert all(not hasattr(c, "notes") for c in track.arrangement_clips)


@async_test
async def test_revision_timeout_never_replays_or_loses_backup(session, monkeypatch):
    bridge, plan, revision = await revision_fixture(session, monkeypatch)
    engine.approve_from_message(session, "Approve part revision " + revision["revision"])
    bridge.drop_revision_reply = True
    args = {"revision": revision["revision"]}
    assert (await engine.execute("execute_arrangement_revision", args, session, bridge))["status"] == "unverified"
    session.project = chat_store.load(42, session.session_id)["project"]
    checkpoint = session.project["arrangement_plan"]["pending_revision"]["checkpoints"][0]
    assert checkpoint["state"] == "sent" and checkpoint["notes"][0]["velocity"] == 96
    bridge.drop_revision_reply = False
    again = await engine.execute("execute_arrangement_revision", args, session, bridge)
    assert again["status"] == "unverified" and "already attempted" in again["summary"]
    assert [c.get_notes_extended()[0].velocity for c in bridge.song.tracks[0].arrangement_clips] == [96, 96, 72, 96]
