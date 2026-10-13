import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

import arrangement_audio

spec = importlib.util.spec_from_file_location("preview_extension", Path(__file__).resolve().parents[1] / "abletonosc/beatmind_arrangement_audio.py")
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


class Bridge:
    def __init__(self):
        self.song = SimpleNamespace(start_time=8, current_song_time=12, loop=True, tempo=124,
            is_playing=False, record_mode=False, session_record=False, back_to_arranger=False,
            song_length=640, tracks=[SimpleNamespace(solo=False)])
        self.song.start_playing = self.start
        self.wrong_position = False
        self.drop_start_reply = False
        self.set_id = "disposable"
        self.starts = 0

    def start(self):
        self.starts += 1
        self.song.is_playing = True
        self.song.current_song_time = 0 if self.wrong_position else self.song.start_time

    async def _query_osc(self, request_id, address, args, timeout):
        request = json.loads(args[0])
        result = native.execute(self.song, request, self.set_id)
        if self.drop_start_reply and request["action"] == "preview_start":
            return {"status": "timeout"}
        return {"status": "ok", "args": [json.dumps(result)]}

    def _send_osc(self, address, args):
        assert address == "/live/song/stop_playing"
        self.song.is_playing = False


class ArrangementAudioTests(unittest.IsolatedAsyncioTestCase):
    async def capture(self, bridge, silent=False):
        async def record(helper, seconds, start):
            await start()
            return {"has_signal": not silent}, b"\0\0\0\x20ftypM4A test"
        with patch.object(arrangement_audio, "helper_path", return_value=Path(__file__).parent), \
                patch.object(arrangement_audio, "record_with_helper", side_effect=record), \
                patch.object(arrangement_audio.asyncio, "sleep", AsyncMock()):
            return await arrangement_audio.capture(bridge, {"set_id": "disposable", "beat": 64,
                "seconds": 8, "section_id": "drop", "section_name": "Main drop"})

    async def test_records_exact_arrangement_and_restores_transport(self):
        bridge = Bridge()
        result = await self.capture(bridge)
        self.assertEqual(result["status"], "verified", result)
        self.assertEqual((result["kind"], result["start_beat"]), ("arrangement", 64))
        self.assertEqual((bridge.song.start_time, bridge.song.current_song_time, bridge.song.loop), (8, 12, True))
        self.assertFalse(bridge.song.is_playing)
        self.assertIn("audio_base64", result)

    async def test_wrong_start_is_never_a_successful_recording(self):
        bridge = Bridge()
        bridge.wrong_position = True
        result = await self.capture(bridge)
        self.assertEqual(result["status"], "failed", result)
        self.assertNotIn("audio_base64", result)
        self.assertEqual(bridge.song.current_song_time, 12)
        self.assertFalse(bridge.song.is_playing)

    async def test_lost_start_response_stops_safely_without_retry(self):
        bridge = Bridge()
        bridge.drop_start_reply = True
        result = await self.capture(bridge)
        self.assertEqual(result["status"], "failed")
        self.assertEqual(bridge.starts, 1)
        self.assertFalse(bridge.song.is_playing)

    async def test_silence_does_not_produce_an_approvable_recording(self):
        result = await self.capture(Bridge(), silent=True)
        self.assertEqual(result["status"], "failed")
        self.assertNotIn("audio_base64", result)

    async def test_session_override_or_solo_is_not_silently_changed(self):
        for field in ("back_to_arranger", "record_mode", "session_record", "is_playing"):
            bridge = Bridge()
            setattr(bridge.song, field, True)
            result = await self.capture(bridge)
            self.assertEqual(result["status"], "failed")
            self.assertEqual(bridge.starts, 0)
            self.assertTrue(getattr(bridge.song, field))

    def test_new_set_identity_prevents_transport_writes(self):
        bridge = Bridge()
        with self.assertRaisesRegex(ValueError, "Set changed"):
            native.execute(bridge.song, {"set_id": "old", "action": "preview_start", "beat": 64}, bridge.set_id)
        self.assertEqual(bridge.starts, 0)


if __name__ == "__main__":
    unittest.main()
