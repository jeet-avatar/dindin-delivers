import copy
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace as NS
import unittest
from unittest.mock import AsyncMock, Mock, patch

from action_view import execute_with_view, focus_target, target_for

spec = importlib.util.spec_from_file_location("beatmind_view_test", Path(__file__).parents[2] / "bridge/abletonosc/beatmind_view.py")
live_view = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live_view)


class TargetTests(unittest.TestCase):
    def test_notes_select_clip_and_duplicate_uses_destination(self):
        self.assertEqual(target_for("add_notes", {"track": 2, "scene": 3}),
                         {"view": "clip", "track": 2, "scene": 3})
        self.assertEqual(target_for("duplicate_clip", {"track": 0, "scene": 0, "target_track": 2, "target_scene": 3}),
                         {"view": "session", "track": 2, "scene": 3})

    def test_creation_uses_verified_new_index_only(self):
        self.assertEqual(target_for("create_midi_track", {"index": -1}), {"view": "session"})
        self.assertEqual(target_for("create_midi_track", {"index": -1}, {"index": 7}),
                         {"view": "track", "track": 7, "scope": "track"})
        self.assertIsNone(target_for("delete_track", {"track": 2}, {"status": "verified"}))

    def test_device_and_arrangement_and_stop(self):
        self.assertEqual(target_for("set_device_control", {"track": 4, "path": [0, 1, 2]})["path"], [0, 1, 2])
        self.assertEqual(target_for("record_arrangement", {})["view"], "arrangement")
        self.assertIsNone(target_for("stop", {}))

    def test_empty_clip_can_be_inspected_without_requiring_a_clip(self):
        data = {"track": 1, "scene": 0}
        self.assertEqual(target_for("get_clip_notes", data)["view"], "session")
        self.assertEqual(target_for("get_clip_notes", data, {"has_clip": False})["view"], "session")
        self.assertEqual(target_for("get_clip_notes", data, {"has_clip": True})["view"], "clip")


class ExecutionTests(unittest.IsolatedAsyncioTestCase):
    async def test_legacy_bridge_keeps_existing_commands_without_display_queries(self):
        import main
        bridge = NS(capabilities=set(), send_command=AsyncMock())
        with patch.object(main, "_execute_tool_unfocused", AsyncMock(return_value={"status": "verified"})) as run:
            result = await main._execute_tool("set_tempo", {"bpm": 124}, bridge)
        self.assertEqual(result["status"], "verified")
        run.assert_awaited_once()
        bridge.send_command.assert_not_awaited()

    async def test_legacy_bridge_explicit_view_fails_without_musical_write(self):
        import main
        with patch.object(main, "_execute_tool_unfocused", AsyncMock()) as run:
            result = await main._execute_tool("show_live_view", {"view": "session"}, NS(capabilities=set()))
        self.assertEqual(result["status"], "failed")
        run.assert_not_awaited()

    async def asyncSetUp(self):
        self.calls = []
        async def send(address, args, query, timeout):
            self.calls.append(address)
            return {"status": "ok", "address": address, "display_window_checked": True, "args": [json.dumps(
                {"status": "verified", "target": json.loads(args[0]), "summary": "Shown"})]}
        self.send = send
        self.execute = AsyncMock(return_value={"status": "verified", "summary": "Music checked"})

    async def test_focus_precedes_execution_and_is_rechecked_after(self):
        async def run():
            self.assertEqual(self.calls, ["/live/beatmind/focus_view", "/live/beatmind/inspect_view"])
            return {"status": "verified"}
        result = await execute_with_view("add_notes", {"track": 1, "scene": 0}, self.send, run)
        self.assertEqual(result["status"], "verified")
        self.assertEqual(len(self.calls), 4)
        self.assertEqual(result["view"]["target"]["track"], 1)

    async def test_missing_extension_blocks_music_before_write(self):
        send = AsyncMock(return_value={"status": "timeout"})
        result = await execute_with_view("set_track_volume", {"track": 1}, send, self.execute)
        self.assertEqual(result["status"], "failed")
        self.execute.assert_not_awaited()

    async def test_missing_extension_blocks_track_creation(self):
        result = await execute_with_view("create_midi_track", {"index": -1},
                                         AsyncMock(return_value={"status": "timeout"}), self.execute)
        self.assertEqual(result["status"], "failed")
        self.execute.assert_not_awaited()

    async def test_load_readback_exception_preserves_completed_action(self):
        async def send(address, *args):
            if address == "/live/track/get/num_devices":
                raise RuntimeError("Connection lost")
            return await self.send(address, *args)
        result = await execute_with_view("load_effect", {"track": 1}, send, self.execute)
        self.assertEqual(result["status"], "unverified")
        self.assertEqual(result["execution_status"], "verified")
        self.execute.assert_awaited_once()

    async def test_lost_post_focus_never_repeats_musical_action(self):
        async def send(*args):
            if len(self.calls) >= 2:
                return {"status": "timeout"}
            return await self.send(*args)
        result = await execute_with_view("set_track_volume", {"track": 1}, send, self.execute)
        self.assertEqual(result["status"], "unverified")
        self.assertEqual(result["execution_status"], "verified")
        self.execute.assert_awaited_once()

    async def test_stop_does_not_depend_on_display_extension(self):
        send = AsyncMock()
        result = await execute_with_view("stop", {}, send, self.execute)
        self.assertEqual(result["status"], "verified")
        send.assert_not_awaited()

    async def test_wrong_target_readback_is_rejected(self):
        send = AsyncMock(return_value={"status": "ok", "address": "/live/beatmind/focus_view",
                                      "display_window_checked": True,
                                      "args": [json.dumps({"status": "verified", "target": {"track": 99}})]})
        result = await focus_target(send, {"view": "track", "track": 1})
        self.assertEqual(result["status"], "unverified")

    async def test_missing_window_check_blocks_even_with_live_selection(self):
        target = {"view": "track", "track": 1}
        send = AsyncMock(return_value={"status": "ok", "address": "/live/beatmind/focus_view",
                                      "args": [json.dumps({"status": "verified", "target": target})]})
        result = await focus_target(send, target)
        self.assertEqual(result["status"], "unverified")
        self.assertIn("Update BeatMind Bridge", result["summary"])

    async def test_explicit_show_does_not_execute_music(self):
        result = await execute_with_view("show_live_view", {"view": "track", "track": 1}, self.send, self.execute)
        self.assertEqual(result["status"], "observed")
        self.execute.assert_not_awaited()


class LiveSelectionTests(unittest.TestCase):
    def setUp(self):
        self.tracks = []
        for i in range(3):
            device = NS(name="Instrument " + str(i), parameters=[], view=NS())
            clip = NS(name="Pattern " + str(i), view=NS(show_envelope=Mock(), select_envelope_parameter=Mock(),
                                                       hide_envelope=Mock(), show_loop=Mock()))
            self.tracks.append(NS(name="Track " + str(i), devices=[device], view=NS(selected_device=device),
                                  clip_slots=[NS(has_clip=True, clip=clip)], arrangement_clips=[clip]))
        self.song = NS(tracks=self.tracks, return_tracks=[], master_track=self.tracks[0], scenes=[NS(name="Intro")],
                       is_playing=False, tempo=124, view=NS(selected_track=self.tracks[0], selected_scene=None, detail_clip=None))
        self.song.view.select_device = lambda device: setattr(self.song.view.selected_track.view, "selected_device", device)
        self.visible = set()
        self.app = NS(view=NS(show_view=self.visible.add, is_view_visible=lambda name: name in self.visible))

    def test_track_changes_instead_of_staying_on_previous_track(self):
        for index in (0, 2, 1):
            result = live_view.focus(self.song, self.app, {"view": "device", "track": index, "path": [0]})
            self.assertEqual(result["status"], "verified")
            self.assertIs(self.song.view.selected_track, self.tracks[index])
            self.assertFalse(self.song.is_playing)
            self.assertEqual(self.song.tempo, 124)

    def test_clip_changes_and_inspection_catches_wrong_selection(self):
        target = {"view": "clip", "track": 2, "scene": 0}
        result = live_view.focus(self.song, self.app, target)
        self.assertEqual(result["status"], "verified")
        self.assertIs(self.song.view.detail_clip, self.tracks[2].clip_slots[0].clip)
        self.song.view.detail_clip.view.hide_envelope.assert_called_once()
        self.song.view.detail_clip.view.show_loop.assert_called_once()
        self.song.view.selected_track = self.tracks[0]
        self.assertEqual(live_view.focus(self.song, self.app, target, True)["status"], "unverified")
        self.song.view.detail_clip.view.hide_envelope.assert_called_once()

    def test_missing_target_does_not_change_selection(self):
        for target in ({"view": "track", "track": 99}, {"view": "device", "track": 2, "path": [99]},
                       {"view": "clip", "track": 2, "scene": 99}):
            with self.assertRaises((ValueError, IndexError)):
                live_view.focus(self.song, self.app, target)
            self.assertIs(self.song.view.selected_track, self.tracks[0])

    def test_arrangement_selection_does_not_start_transport(self):
        result = live_view.focus(self.song, self.app, {"view": "arrangement"})
        self.assertEqual(result["status"], "verified")
        self.assertIn("Arranger", self.visible)
        self.assertFalse(self.song.is_playing)

    def test_switching_views_does_not_restore_the_wrong_track(self):
        def show(name):
            self.visible.add(name)
            if name in {"Session", "Arranger"}:
                self.song.view.selected_track = self.tracks[0]
                self.song.view.detail_clip = self.tracks[0].arrangement_clips[0]
        self.app.view.show_view = show
        for target in ({"view": "arrangement", "track": 2},
                       {"view": "clip", "track": 1, "arrangement_clip": 0},
                       {"view": "clip", "track": 2, "scene": 0}):
            result = live_view.focus(self.song, self.app, target)
            self.assertEqual(result["status"], "verified")
            self.assertIs(self.song.view.selected_track, self.tracks[target["track"]])
