import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import sections
from execution import execute_verified


class SectionTests(unittest.IsolatedAsyncioTestCase):
    async def test_same_pack_is_validated_saved_and_constrains_loads(self):
        bridge = SimpleNamespace(local_operation=AsyncMock(return_value={"status":"observed", "packs":[{"pack_id":"pack-a", "name":"User Selected Pack"}]}),
                                 send_command=AsyncMock(return_value={"status":"ok", "args":["Intro", "Chorus"]}))
        with tempfile.TemporaryDirectory() as directory, patch.object(sections, "ROOT", Path(directory)):
            result = await sections.set_brief(1, "chat", {"name":"Chorus", "sound":"Wide dark chords", "bars":12, "source_mode":"pack", "pack_id":"pack-a"}, bridge)
            self.assertEqual(result["status"], "observed")
            brief = sections.get_brief(1, "chat")
            self.assertEqual(brief["scene_candidates"], [1])
            self.assertIsNone(sections.get_brief(2, "chat"))
            self.assertIsNone(sections.source_error(brief, "load_pack_sample", {"pack_id":"pack-a"}))
            self.assertIsNotNone(sections.source_error(brief, "load_pack_sample", {"pack_id":"pack-b"}))
            self.assertIsNotNone(sections.source_error(brief, "load_instrument", {}))
            self.assertIsNone(sections.source_error(brief, "load_effect", {}))

    async def test_unavailable_pack_and_ambiguous_scene_do_not_save(self):
        bridge = SimpleNamespace(local_operation=AsyncMock(return_value={"status":"observed", "packs":[]}),
                                 send_command=AsyncMock(return_value={"status":"ok", "args":["Drop", "Drop"]}))
        with tempfile.TemporaryDirectory() as directory, patch.object(sections, "ROOT", Path(directory)):
            for data in [{"name":"Drop", "sound":"Heavy", "bars":8, "source_mode":"pack", "pack_id":"missing"},
                         {"name":"Drop", "sound":"Heavy", "bars":8, "source_mode":"existing"}]:
                result = await sections.set_brief(1, "chat", data, bridge)
                self.assertEqual(result["status"], "failed")
                self.assertIsNone(sections.get_brief(1, "chat"))

    async def test_existing_sound_mode_blocks_replacement_but_allows_pattern_edits(self):
        brief = {"source_mode":"existing"}
        self.assertIsNotNone(sections.source_error(brief, "load_pack_sample", {}))
        self.assertIsNone(sections.source_error(brief, "add_notes", {}))


class ScenePlaybackTests(unittest.IsolatedAsyncioTestCase):
    async def test_missing_tenth_track_cannot_load_an_effect(self):
        send = AsyncMock(return_value={"status":"ok", "address":"/live/song/get/num_tracks", "args":[9]})
        result = await execute_verified("load_effect", {"track":9, "effect_uri":"Audio Effects/Reverb"}, send)
        self.assertEqual(result["status"], "failed")
        self.assertTrue(all(call.args[2] for call in send.await_args_list))
        self.assertIn("does not exist", result["summary"])

    def sender(self, occupied, playing):
        async def send(address, args, query=False, timeout=5):
            if not query:
                return {"status":"sent"}
            values = {"/live/song/get/num_scenes":[2], "/live/song/get/track_names":["Kick", "Hat"],
                      "/live/clip_slot/get/has_clip": [args[0], args[1], int(args[0] in occupied)] if args else [],
                      "/live/clip/get/is_playing": [args[0], args[1], int(args[0] in playing)] if args else []}
            return {"status":"ok", "address":address, "args":values[address]}
        return AsyncMock(side_effect=send)

    async def test_empty_scene_does_not_fire(self):
        send = self.sender([], [])
        result = await execute_verified("fire_scene", {"scene":0}, send)
        self.assertEqual(result["status"], "failed")
        self.assertNotIn("/live/scene/fire", [call.args[0] for call in send.await_args_list])

    async def test_playback_readback_does_not_claim_audible_success(self):
        send = self.sender([0, 1], [0, 1])
        result = await execute_verified("fire_scene", {"scene":0}, send)
        self.assertEqual(result["status"], "verified")
        self.assertFalse(result["audio_verified"])
        self.assertEqual(result["playing_tracks"], [0, 1])
        self.assertEqual(sum(call.args[0] == "/live/scene/fire" for call in send.await_args_list), 1)

    async def test_partial_playback_does_not_relaunch(self):
        send = self.sender([0, 1], [0])
        with patch("execution.asyncio.sleep", AsyncMock()):
            result = await execute_verified("fire_scene", {"scene":0}, send)
        self.assertEqual(result["status"], "unverified")
        self.assertEqual(sum(call.args[0] == "/live/scene/fire" for call in send.await_args_list), 1)
