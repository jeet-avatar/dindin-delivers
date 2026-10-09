import hashlib
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bridge"))
import mixer_preview as module


class MixerPreviewTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        sample = Path(self.directory.name) / "kick.wav"
        sample.write_bytes(b"test sample identity")
        self.current = {"status": "observed", "track_name": "Kick", "sample_path": str(sample), "value": 0.8, "display": "-2 dB", "map_id": "token"}
        self.writes = []
        async def query(identifier, address, args, timeout):
            if address == "/live/beatmind/mixer":
                data = json.loads(args[0])
                if data.get("operation") == "set":
                    self.writes.append(data)
                    self.current.update(status="verified", value=data["value"], display="1 dB")
                return {"status": "ok", "args": [json.dumps(self.current)]}
            return {"status": "ok", "args": [1 if "has_clip" in address else 0]}
        self.bridge = SimpleNamespace(_query_osc=AsyncMock(side_effect=query))
        self.data = {"track": 0, "scene": 0, "track_name": "Kick", "sha256": hashlib.sha256(sample.read_bytes()).hexdigest(),
                     "map_id": "token", "expected_value": 0.8, "value": 0.9}
        self.awake = patch.object(module, "require_awake_display", AsyncMock())
        self.awake.start(); self.addCleanup(self.awake.stop)
        self.capture = patch.object(module, "capture_part", AsyncMock(return_value={"status": "verified", "audio_base64": "fixture", "summary": "Captured"}))
        self.capture_mock = self.capture.start(); self.addCleanup(self.capture.stop)

    async def test_read_only_exact_source(self):
        result = await module.mixer_preview(self.bridge, "inspect", self.data)
        self.assertEqual(result["sample_sha256"], self.data["sha256"])
        self.assertEqual(self.writes, [])
        self.capture_mock.assert_not_called()

    async def test_wrong_source_and_stale_mapping_refuse_write(self):
        for key, value in [("sha256", "wrong"), ("track_name", "Different"), ("map_id", "old"), ("expected_value", 0.1)]:
            result = await module.mixer_preview(self.bridge, "record", {**self.data, key: value})
            self.assertEqual(result["status"], "failed")
        self.assertEqual(self.writes, [])

    async def test_display_asleep_refuses_before_write(self):
        with patch.object(module, "require_awake_display", AsyncMock(side_effect=ValueError("Wake Mac"))):
            result = await module.mixer_preview(self.bridge, "record", self.data)
        self.assertEqual(result["status"], "failed")
        self.assertEqual(self.writes, [])
        self.capture_mock.assert_not_called()

    async def test_fresh_capture_after_verified_write(self):
        result = await module.mixer_preview(self.bridge, "record", self.data)
        self.assertEqual(result["status"], "verified")
        self.assertEqual(result["previous_fader"]["value"], 0.8)
        self.assertEqual(result["mixer"]["value"], 0.9)
        self.capture_mock.assert_awaited_once_with(self.bridge, 0, 0, 8)

    async def test_capture_failure_discloses_applied_fader(self):
        self.capture_mock.return_value = {"status": "failed", "summary": "Capture unavailable"}
        result = await module.mixer_preview(self.bridge, "record", self.data)
        self.assertEqual(result["status"], "failed")
        self.assertIn("Fader changed to", result["summary"])

    async def test_change_during_capture_invalidates_preview(self):
        async def capture(*args):
            self.current["value"] = 0.2
            return {"status": "verified", "audio_base64": "fixture", "summary": "Captured"}
        self.capture_mock.side_effect = capture
        result = await module.mixer_preview(self.bridge, "record", self.data)
        self.assertEqual(result["status"], "partial")
        self.assertNotIn("audio_base64", result)


if __name__ == "__main__":
    unittest.main()
