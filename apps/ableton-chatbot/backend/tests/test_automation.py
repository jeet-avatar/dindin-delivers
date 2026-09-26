import importlib.util
import json
import math
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from automation import execute_automation
import production

spec = importlib.util.spec_from_file_location("automation_extension", Path(__file__).resolve().parents[2] / "bridge/abletonosc/beatmind_automation.py")
extension = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extension)


class Parameter:
    def __init__(self, name="Frequency", quantized=False):
        self.name, self.min, self.max, self.value = name, 0.0, 1.0, 0.5
        self.is_enabled, self.is_quantized, self.automation_state = True, quantized, 0
        self.value_items = ["Off", "On"] if quantized else []
        self.state = 0

    def str_for_value(self, value):
        hz = 20 * 1000 ** value
        return f"{hz / 1000:.4f} kHz" if hz >= 1000 else f"{hz:.3f} Hz"


class MappingTests(unittest.TestCase):
    def test_unit_conversion_uses_nonlinear_display_without_writes(self):
        parameter = Parameter()
        value = extension.native_value(parameter, 2, "kHz")
        self.assertAlmostEqual(value, 2 / 3, delta=0.001)
        self.assertEqual(parameter.value, 0.5)

    def test_unique_alias_and_exact_name(self):
        parameter = Parameter()
        self.assertEqual(extension.resolve_parameter([parameter], "filter_cutoff"), (0, parameter))
        self.assertEqual(extension.resolve_parameter([parameter], "frequency"), (0, parameter))

    def test_ambiguous_filter_never_picks_first(self):
        with self.assertRaises(ValueError):
            extension.resolve_parameter([Parameter("Frequency"), Parameter("Cutoff")], "filter_cutoff")

    def test_stale_map_changes_with_parameter_identity(self):
        device = SimpleNamespace(class_name="Drift", name="Drift", parameters=[Parameter()])
        before = extension.map_id(device)
        device.parameters[0].name = "Resonance"
        self.assertNotEqual(before, extension.map_id(device))

    def test_enums_are_labels_not_guessed_numbers(self):
        parameter = Parameter("Mode", True)
        self.assertEqual(extension.native_value(parameter, "On", "label"), 1)
        for value, unit in [(0.5, "native"), (0.5, "normalized"), ("Other", "label")]:
            with self.assertRaises(ValueError):
                extension.native_value(parameter, value, unit)

    def test_disabled_inactive_and_invalid_units_are_rejected(self):
        parameter = Parameter()
        for value, unit in [(30000, "Hz"), (1, "ms"), (float("nan"), "native"), (True, "native")]:
            with self.assertRaises(ValueError):
                extension.native_value(parameter, value, unit)
        parameter.is_enabled = False
        with self.assertRaises(ValueError):
            extension.native_value(parameter, 0.2, "native")
        parameter.is_enabled, parameter.state = True, 1
        with self.assertRaises(ValueError):
            extension.native_value(parameter, 0.2, "native")

    def test_nonmonotonic_display_is_not_guessed(self):
        parameter = Parameter()
        parameter.str_for_value = lambda value: f"{100 + math.sin(value * 10) * 50} Hz"
        with self.assertRaises(ValueError):
            extension.native_value(parameter, 110, "Hz")

    def test_existing_automation_is_not_overridden(self):
        parameter = Parameter()
        parameter.automation_state = 1
        device = SimpleNamespace(class_name="Drift", name="Drift", parameters=[parameter])
        callbacks = {}
        handler = SimpleNamespace(song=SimpleNamespace(tracks=[SimpleNamespace(devices=[device])]),
                                  osc_server=SimpleNamespace(add_handler=lambda address, fn: callbacks.update({address: fn})))
        extension.register(handler, SimpleNamespace())
        result = json.loads(callbacks["/live/beatmind/set_control"]([json.dumps({
            "track": 0, "path": [0], "map_id": extension.map_id(device), "control": "Frequency", "value": 2, "unit": "kHz"})])[0])
        self.assertEqual(result["status"], "failed")
        self.assertEqual(parameter.value, 0.5)


class BackendTests(unittest.IsolatedAsyncioTestCase):
    async def test_bad_device_path_never_reaches_live(self):
        send = AsyncMock()
        result = await execute_automation("get_device_control_map", {"track": 0, "path": [0, 1]}, send)
        self.assertEqual(result["status"], "failed")
        send.assert_not_awaited()

    async def test_lost_control_reply_is_partial_not_replayed(self):
        send = AsyncMock(return_value={"status": "timeout"})
        result = await execute_automation("set_device_control", {"track": 0, "path": [0], "map_id": "a" * 24,
                                          "control": "Frequency", "value": 2, "unit": "kHz"}, send)
        self.assertEqual(result["status"], "partial")
        send.assert_awaited_once()

    async def test_independent_readback_is_required(self):
        async def send(address, args, query, timeout):
            payload = ({"status": "verified", "control": {"index": 0, "name": "Frequency", "value": 0.5}}
                       if address.endswith("set_control") else
                       {"status": "observed", "map_id": "a" * 24, "parameters": [{"index": 0, "value": 0.1, "display": "40 Hz"}]})
            return {"status": "ok", "address": address, "args": [json.dumps(payload)]}
        result = await execute_automation("set_device_control", {"track": 0, "path": [0], "map_id": "a" * 24,
                                          "control": "Frequency", "value": 0.5, "unit": "native"}, send)
        self.assertEqual(result["status"], "partial")


class PlanTests(unittest.TestCase):
    def test_persisted_plan_progress_is_owner_scoped(self):
        data = {"title": "Test", "genre": "House", "bpm": 120, "key": "Am", "scope": "loop", "assumptions": [],
                "parts": [{"role": role, "source_kind": "instrument", "source": "Drift", "sound": "Soft", "bars": 2} for role in ("Keys", "Bass")]}
        with tempfile.TemporaryDirectory() as directory, patch.object(production, "ROOT", Path(directory)):
            result = production.create_plan(7, "session", data)
            self.assertEqual(result["status"], "observed")
            production.link_audition(7, "session", {"id": "recording", "track": 4, "scene": 0})
            self.assertIsNone(production.review_part(8, "recording", "accepted"))
            next_part = production.review_part(7, "recording", "accepted")
            self.assertEqual(next_part["session_id"], "session")
            self.assertIn("Bass", next_part["message"])
            self.assertIn("Do not create the next part or change any music yet", next_part["message"])
            self.assertIn("Wait for my choice before building it", next_part["message"])
            self.assertEqual(production.get_plan(7, "session")["parts"][1]["status"], "planned")
            self.assertIsNone(production.review_part(7, "recording", "accepted"))
            self.assertEqual(production.get_plan(7, "session")["parts"][0]["status"], "accepted")
            self.assertEqual(production.create_plan(7, "session", data)["status"], "failed")

    def test_refinement_audition_does_not_consume_next_part(self):
        data = {"title": "Test", "genre": "Minimal", "bpm": 124, "key": "C", "scope": "loop", "assumptions": [],
                "parts": [{"role": role, "source_kind": "instrument", "source": "Simpler", "sound": "Dry", "bars": 4}
                          for role in ("Kick", "Hat")]}
        with tempfile.TemporaryDirectory() as directory, patch.object(production, "ROOT", Path(directory)):
            production.create_plan(7, "session", data)
            production.link_audition(7, "session", {"id": "dry", "track": 0, "scene": 0})
            production.review_part(7, "dry", "accepted")
            production.link_audition(7, "session", {"id": "saturated", "track": 0, "scene": 0})
            parts = production.get_plan(7, "session")["parts"]
            self.assertEqual(parts[0]["recording_id"], "saturated")
            self.assertEqual(parts[0]["status"], "awaiting_review")
            self.assertEqual(parts[1]["status"], "planned")
            self.assertNotIn("recording_id", parts[1])
            self.assertIsNone(production.review_part(7, "dry", "accepted"))


class OrchestrationTests(unittest.IsolatedAsyncioTestCase):
    async def run_actions(self, names, pending=False, plan=None):
        from types import SimpleNamespace
        import main
        blocks = [SimpleNamespace(type="tool_use", id=str(i), name=name, input={}) for i, name in enumerate(names)]
        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(side_effect=[
            SimpleNamespace(content=blocks, stop_reason="tool_use"),
            SimpleNamespace(content=[], stop_reason="end_turn"),
        ])))
        session = main.ChatSession("orchestration-test", 7)
        session.pending_review = pending
        execute = AsyncMock(return_value={"status": "observed" if pending else "verified", "steps": []})
        with patch.object(main, "claude_client", client), patch.object(main, "get_plan", return_value=plan), patch.object(main, "_execute_tool", execute):
            _, actions = await main._run_claude_loop(session, None)
        return actions, execute

    async def test_pending_review_does_not_block_requested_controls(self):
        actions, execute = await self.run_actions(["get_track_names", "set_device_control"], pending=True)
        self.assertEqual([a["result"]["status"] for a in actions], ["observed", "observed"])
        self.assertEqual(execute.await_count, 2)

    async def test_creation_requires_a_saved_plan(self):
        actions, execute = await self.run_actions(["create_midi_track"])
        self.assertEqual(actions[0]["result"]["status"], "failed")
        execute.assert_not_awaited()

    async def test_only_one_track_creation_per_request(self):
        actions, execute = await self.run_actions(["create_midi_track", "create_audio_track"], plan={"parts": []})
        self.assertEqual([a["result"]["status"] for a in actions], ["verified", "failed"])
        execute.assert_awaited_once()
