import base64
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, Mock, patch

import main
import recordings
import chat_store


class RecordingTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.patcher = patch.object(recordings, "ROOT", Path(self.directory.name))
        self.patcher.start()
        self.chat_patcher = patch.object(chat_store, "ROOT", Path(self.directory.name) / "chats")
        self.chat_patcher.start()

    def tearDown(self):
        self.chat_patcher.stop()
        self.patcher.stop()
        self.directory.cleanup()

    def saved(self):
        return recordings.save_recording(7, {
            "status": "verified", "audio_base64": base64.b64encode(b"\x00\x00\x00\x20ftypM4A test").decode(),
            "track_name": "Drift", "track": 5, "scene": 0, "metrics": {"has_signal": True}})

    def test_audio_never_leaks_into_model_result(self):
        result = self.saved()
        self.assertNotIn("audio_base64", result)
        self.assertEqual(result["recording"]["decision"], "pending")

    def test_recordings_are_owner_scoped_and_paths_validated(self):
        item = self.saved()["recording"]
        self.assertIsNone(recordings.owned_recording(item["id"], 8))
        self.assertIsNone(recordings.owned_recording("../../etc/passwd", 7))
        self.assertEqual(recordings.list_recordings(8), [])
        self.assertIsNone(recordings.decide_recording(item["id"], 8, "accepted"))
        self.assertEqual(recordings.decide_recording(item["id"], 7, "accepted")["decision"], "accepted")

    async def test_pending_review_blocks_same_track_but_not_new_live_set(self):
        self.saved()
        import asyncio
        session = main.ChatSession("s", 7)
        # An existing legacy conversation can review unscoped recordings; a new
        # song intentionally starts in planning without inheriting old approvals.
        session.messages = [{"role": "user", "content": "Continue this existing set"}]
        chat_store.save(session, "complete")
        bridge = Mock(lock=asyncio.Lock(), send_command=AsyncMock(return_value={"status": "ok", "args": ["A", "B", "C", "D", "E", "Drift"]}))
        with patch.object(main, "_run_claude_loop", AsyncMock(return_value=("Inspected", []))) as run:
            await main.produce_chat(main.ChatRequest(message="Inspect current part"), session, bridge)
            self.assertTrue(session.pending_review)
            bridge.send_command.return_value = {"status": "ok", "args": ["1 MIDI", "2 MIDI"]}
            await main.produce_chat(main.ChatRequest(message="Inspect new set"), session, bridge)
            self.assertFalse(session.pending_review)
            self.assertEqual(run.await_count, 2)

    async def test_invalid_coordinates_do_not_reach_bridge(self):
        bridge = Mock(user_id=7, capture_part=AsyncMock())
        result = await main._execute_tool("audition_part", {"track": -1, "scene": 0}, bridge)
        self.assertEqual(result["status"], "failed")
        bridge.capture_part.assert_not_awaited()

    async def test_capture_audio_stripped_before_tool_response(self):
        result = self.saved()
        bridge = Mock(user_id=7, capture_part=AsyncMock(return_value=result),
                      send_command=AsyncMock(return_value={"status": "ok", "args": [5, 1]}))  # MIDI track with one device
        response = await main._execute_tool("audition_part", {"track": 5, "scene": 0, "seconds": 12}, bridge)
        self.assertNotIn("audio_base64", response)
