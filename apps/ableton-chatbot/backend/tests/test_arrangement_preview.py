import copy
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bridge"))
from arrangement_preview import capture_arrangement
from test_audio_preview import FakeBridge


class ArrangementBridge(FakeBridge):
    def __init__(self):
        super().__init__()
        self.values.update({("song", "loop", ()): 1, ("song", "back_to_arranger", ()): 1,
                            ("beatmind", "arrangement_start", ()): 16.})
        self.empty = False
        self.stop_fails = False

    async def _query_osc(self, request, address, args, timeout):
        if address == "/live/track/get/arrangement_clips/name":
            return {"status": "ok", "args": [args[0]] + ([] if self.empty else ["Voice"])}
        return await super()._query_osc(request, address, args, timeout)

    def _send_osc(self, address, args):
        if address == "/live/song/stop_playing" and self.stop_fails:
            self.writes.append((address, args))
            return
        super()._send_osc(address, args)
        if address in {"/live/song/start_playing", "/live/song/continue_playing"} and not self.fail_fire:
            self.values[("song", "is_playing", ())] = 1
            if address == "/live/song/start_playing":
                self.values[("song", "current_song_time", ())] = self.values[("beatmind", "arrangement_start", ())]


class ArrangementPreviewTests(unittest.IsolatedAsyncioTestCase):
    async def capture(self, bridge, signal=True, fail_helper=False):
        async def record(helper, seconds, start):
            await start()
            bridge.values[("song", "current_song_time", ())] += 16
            if fail_helper:
                raise RuntimeError("Capture failed")
            return {"has_signal": signal}, b"\0\0\0\x20ftypM4A fake"
        with tempfile.TemporaryDirectory() as helper, patch("arrangement_preview.helper_path", return_value=Path(helper)), \
             patch("arrangement_preview.record_with_helper", side_effect=record), \
             patch("arrangement_preview.asyncio.sleep", new=AsyncMock()):
            return await capture_arrangement(bridge, 1, 256, 8)

    async def test_arrangement_audio_with_transport_restored(self):
        bridge = ArrangementBridge()
        before = copy.deepcopy(bridge.values)
        result = await self.capture(bridge)
        self.assertEqual(result["status"], "verified")
        self.assertIsNone(result["scene"])
        self.assertEqual(result["arrangement_start_beat"], 256)
        before[("song", "back_to_arranger", ())] = 0
        self.assertEqual(bridge.values, before)
        self.assertEqual(sum(a == "/live/song/start_playing" for a, _ in bridge.writes), 1)
        self.assertIn(("/live/beatmind/set/arrangement_start", [256.]), bridge.writes)
        self.assertFalse(any("clip/" in a for a, _ in bridge.writes))

    async def test_playing_recording_or_no_clips_blocks_all_writes(self):
        for mode in ("is_playing", "record_mode", "session_record", "empty"):
            bridge = ArrangementBridge()
            if mode == "empty":
                bridge.empty = True
            else:
                bridge.values[("song", mode, ())] = 1
            self.assertEqual((await self.capture(bridge))["status"], "failed")
            self.assertFalse(bridge.writes)

    async def test_silence_or_capture_error_restores_state(self):
        for options in ({"signal": False}, {"fail_helper": True}):
            bridge = ArrangementBridge()
            before = bridge.values.copy()
            before[("song", "back_to_arranger", ())] = 0
            result = await self.capture(bridge, **options)
            self.assertEqual(result["status"], "failed")
            self.assertNotIn("audio_base64", result)
            self.assertEqual(bridge.values, before)

    async def test_failed_stop_never_returns_approvable_audio(self):
        bridge = ArrangementBridge()
        bridge.stop_fails = True
        result = await self.capture(bridge)
        self.assertEqual(result["status"], "partial")
        self.assertNotIn("audio_base64", result)

    async def test_delayed_stop_is_read_again_without_repeating_write(self):
        bridge = ArrangementBridge()
        original = bridge._query_osc
        reads = 0
        async def query(request, address, args, timeout):
            nonlocal reads
            if address == "/live/song/get/is_playing" and any(a == "/live/song/stop_playing" for a, _ in bridge.writes):
                reads += 1
                if reads <= 3:
                    return {"status": "ok", "args": [True]}
            return await original(request, address, args, timeout)
        bridge._query_osc = query
        result = await self.capture(bridge)
        self.assertEqual(result["status"], "verified")
        self.assertEqual(reads, 4)
        self.assertEqual(sum(a == "/live/song/stop_playing" for a, _ in bridge.writes), 1)
        self.assertEqual(bridge.values[("track", "solo", (0,))], 1)
        self.assertEqual(bridge.values[("track", "solo", (1,))], 0)

    async def test_invalid_range_never_writes(self):
        for beat in (float("nan"), -1, float("inf"), True):
            bridge = ArrangementBridge()
            self.assertEqual((await capture_arrangement(bridge, 1, beat, 8))["status"], "failed")
            self.assertFalse(bridge.writes)

    async def test_wrong_playback_position_cannot_be_approved(self):
        bridge = ArrangementBridge()
        send = bridge._send_osc
        def wrong_position(address, args):
            send(address, args)
            if address == "/live/song/start_playing":
                bridge.values[("song", "current_song_time", ())] = 0
        bridge._send_osc = wrong_position
        result = await self.capture(bridge)
        self.assertEqual(result["status"], "failed")
        self.assertIn("not the requested beat", result["summary"])
        self.assertNotIn("audio_base64", result)
