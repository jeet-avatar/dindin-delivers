import base64
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import main
import recordings
import production


class RecordingReviewTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.patches = [patch.object(recordings, "ROOT", root / "audio"), patch.object(production, "ROOT", root / "plans")]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in reversed(self.patches):
            p.stop()
        self.temp.cleanup()

    def capture(self):
        return recordings.save_recording(1, {"status": "verified", "track_name": "Test part", "track": 0, "scene": 0,
            "metrics": {}, "audio_base64": base64.b64encode(b"0000ftyp-test-audio").decode()})["recording"]

    async def test_accept_persists_and_repeated_accept_does_not_continue_twice(self):
        item = self.capture()
        production.save({"user_id": 1, "session_id": "test", "parts": [
            {"status": "awaiting_review", "recording_id": item["id"]}, {"status": "planned", "role": "Next"}]})
        first = await main.recording_decision(item["id"], main.RecordingDecision(decision="accepted"), {"id": 1})
        again = await main.recording_decision(item["id"], main.RecordingDecision(decision="accepted"), {"id": 1})
        self.assertIsNotNone(first["continuation"])
        self.assertIsNone(again["continuation"])
        self.assertEqual(recordings.list_recordings(1)[0]["decision"], "accepted")
        recordings.attach_evidence(item["id"], 1, [])
        self.assertEqual(recordings.owned_recording(item["id"], 1)["decision"], "accepted")

    async def test_new_recording_does_not_reset_accepted_version(self):
        old = self.capture()
        recordings.decide_recording(old["id"], 1, "accepted")
        new = self.capture()
        self.assertNotEqual(old["id"], new["id"])
        self.assertEqual(new["decision"], "pending")
        self.assertEqual(recordings.owned_recording(old["id"], 1)["decision"], "accepted")

    async def test_other_account_cannot_read_or_accept(self):
        item = self.capture()
        self.assertEqual(recordings.list_recordings(2), [])
        with self.assertRaises(main.HTTPException) as error:
            await main.recording_decision(item["id"], main.RecordingDecision(decision="accepted"), {"id": 2})
        self.assertEqual(error.exception.status_code, 404)
        self.assertEqual(recordings.owned_recording(item["id"], 1)["decision"], "pending")
