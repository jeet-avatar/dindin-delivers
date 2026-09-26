import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest

spec = importlib.util.spec_from_file_location("beatmind_mixer", Path(__file__).resolve().parents[2] / "bridge/abletonosc/beatmind_mixer.py")
mixer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mixer)


class MixerMappingTests(unittest.TestCase):
    def setUp(self):
        self.parameter = SimpleNamespace(value=0.8, min=0.0, max=1.0, is_enabled=True, automation_state=0, state=0,
                                         str_for_value=lambda value: f"Live display {value:.4f}")
        self.track = SimpleNamespace(name="Kick", _live_ptr=11,
                                     mixer_device=SimpleNamespace(volume=self.parameter),
                                     devices=[SimpleNamespace(type=1, sample=SimpleNamespace(file_path="/exact/kick.wav"))])
        callbacks = {}
        self.song = SimpleNamespace(_live_ptr=10, tracks=[self.track])
        mixer.register(SimpleNamespace(song=self.song, osc_server=SimpleNamespace(add_handler=lambda name, fn: callbacks.update({name: fn}))), None)
        self.callback = callbacks["/live/beatmind/mixer"]

    def call(self, **data):
        return json.loads(self.callback((json.dumps({"track": 0, **data}),))[0])

    def write(self, **data):
        current = self.call()
        return self.call(operation="set", **{"map_id": current["map_id"], "expected_value": current["value"], "value": 0.9, **data})

    def test_curve_is_read_from_live_without_writes(self):
        result = self.call()
        self.assertEqual(len(result["curve"]), 201)
        self.assertEqual(result["curve"][100]["display"], "Live display 0.5000")
        self.assertEqual(self.parameter.value, 0.8)

    def test_verified_value_and_display(self):
        result = self.write()
        self.assertEqual(result["status"], "verified")
        self.assertEqual(result["display"], "Live display 0.9000")

    def test_stale_map_cannot_write(self):
        self.assertEqual(self.write(map_id="stale")["status"], "failed")
        self.assertEqual(self.parameter.value, 0.8)

    def test_external_fader_change_cannot_be_overwritten(self):
        self.assertEqual(self.write(expected_value=0.4)["status"], "failed")
        self.assertEqual(self.parameter.value, 0.8)

    def test_automation_disabled_and_controlled_block_writes(self):
        for prop, value in [("automation_state", 1), ("state", 1), ("is_enabled", False)]:
            old = getattr(self.parameter, prop); setattr(self.parameter, prop, value)
            self.assertEqual(self.write()["status"], "failed")
            self.assertEqual(self.parameter.value, 0.8)
            setattr(self.parameter, prop, old)

    def test_invalid_values_cannot_write(self):
        for value in [-1, 2, True, "0.5", float("nan"), float("inf")]:
            self.assertEqual(self.write(value=value)["status"], "failed")
            self.assertEqual(self.parameter.value, 0.8)

    def test_different_song_or_sample_invalidates_map(self):
        before = self.call()["map_id"]
        self.song._live_ptr = 20
        self.assertNotEqual(before, self.call()["map_id"])
        self.song._live_ptr = 10
        self.track.devices[0].sample.file_path = "/different.wav"
        self.assertNotEqual(before, self.call()["map_id"])

    def test_missing_source_refuses_mapping(self):
        self.track.devices = []
        self.assertEqual(self.call()["status"], "failed")


if __name__ == "__main__":
    unittest.main()
