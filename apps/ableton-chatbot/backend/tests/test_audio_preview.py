import asyncio
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bridge"))
from audio_preview import capture_part


class FakeBridge:
    def __init__(self):
        self.names = ["Original", "Preview"]
        self.values = {("song", "is_playing", ()): 0, ("song", "record_mode", ()): 0,
                       ("song", "session_record", ()): 0, ("song", "current_song_time", ()): 8.0,
                       ("song", "clip_trigger_quantization", ()): 4,
                       ("track", "solo", (0,)): 1, ("track", "solo", (1,)): 0,
                       ("track", "mute", (1,)): 1, ("clip_slot", "has_clip", (1, 0)): 1,
                       ("clip", "is_playing", (1, 0)): 0}
        self.writes = []
        self.fail_fire = False

    async def _query_osc(self, request, address, args, timeout):
        if address == "/live/song/get/track_names":
            return {"status": "ok", "args": self.names[:]}
        parts = address.split("/")
        return {"status": "ok", "args": [*args, self.values[(parts[2], parts[-1], tuple(args))]]}

    def _send_osc(self, address, args):
        self.writes.append((address, args))
        parts = address.split("/")
        if "/set/" in address:
            self.values[(parts[2], parts[-1], tuple(args[:-1]))] = args[-1]
        elif address == "/live/clip/fire" and not self.fail_fire:
            self.values[("clip", "is_playing", tuple(args))] = 1
            self.values[("song", "is_playing", ())] = 1
        elif address == "/live/clip/stop":
            self.values[("clip", "is_playing", tuple(args))] = 0
        elif address == "/live/song/stop_playing":
            self.values[("song", "is_playing", ())] = 0


class AudioTests(unittest.IsolatedAsyncioTestCase):
    async def run_capture(self, bridge, signal=True):
        async def launch(*args, **kwargs):
            output = Path(args[args.index("--stdout") + 1])
            audio = Path(args[args.index("--args") + 1])
            output.write_text(json.dumps({"type": "ready"}) + "\n" + json.dumps({"type": "complete", "metrics": {"has_signal": signal}}))
            audio.write_bytes(b"\x00\x00\x00\x20ftypM4A fake")
            return SimpleNamespace(wait=AsyncMock(return_value=0))
        with tempfile.TemporaryDirectory() as helper, patch.dict("os.environ", {"BEATMIND_AUDIO_APP": helper}), \
             patch("audio_preview.asyncio.create_subprocess_exec", side_effect=launch), \
             patch("audio_preview.asyncio.sleep", new=AsyncMock()):
            return await capture_part(bridge, 1, 0, 12)

    async def test_capture_restores_transport_mute_solos_and_position(self):
        bridge = FakeBridge()
        before = bridge.values.copy()
        result = await self.run_capture(bridge)
        self.assertEqual(result["status"], "verified")
        self.assertIn("audio_base64", result)
        self.assertEqual(bridge.values, before)

    async def test_silence_fails_and_restores_all_settings(self):
        bridge = FakeBridge()
        before = bridge.values.copy()
        result = await self.run_capture(bridge, signal=False)
        self.assertEqual(result["status"], "failed")
        self.assertNotIn("audio_base64", result)
        self.assertEqual(bridge.values, before)

    async def test_failed_launch_restores_all_settings(self):
        bridge = FakeBridge()
        bridge.fail_fire = True
        before = bridge.values.copy()
        result = await self.run_capture(bridge)
        self.assertEqual(result["status"], "failed")
        self.assertEqual(bridge.values, before)

    async def test_active_transport_and_recording_are_never_changed(self):
        for mode in ("is_playing", "record_mode", "session_record"):
            bridge = FakeBridge()
            bridge.values[("song", mode, ())] = 1
            result = await self.run_capture(bridge)
            self.assertEqual(result["status"], "failed")
            self.assertEqual(bridge.writes, [])

    async def test_delayed_seek_readback_is_retried_without_repeating_write(self):
        bridge = FakeBridge()
        query = bridge._query_osc
        stale = False

        async def delayed(request, address, args, timeout):
            nonlocal stale
            if address == "/live/song/get/current_song_time" and not stale and any(a == "/live/song/set/current_song_time" for a, _ in bridge.writes):
                stale = True
                return {"status": "ok", "args": [30.0]}
            return await query(request, address, args, timeout)

        bridge._query_osc = delayed
        result = await self.run_capture(bridge)
        self.assertEqual(result["status"], "verified")
        self.assertEqual(sum(address == "/live/song/set/current_song_time" for address, _ in bridge.writes), 1)
