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
    def envelope_writer(self, readback=None):
        steps = [(0.0, 8.0, 0.3)]
        clears = []
        class Envelope:
            def insert_step(self, beat, length, value): steps.append((beat, length, value))
            def value_at_time(self, t):
                return readback if readback is not None else [v for b, length, v in steps if b <= t][-1]
        envelope = Envelope()
        def clear(parameter):
            clears.append(parameter)
            steps.clear()
        parameter = Parameter()
        clip = SimpleNamespace(length=8.0, clear_envelope=clear, automation_envelope=lambda p: envelope,
                               create_automation_envelope=lambda p: envelope)
        track = SimpleNamespace(devices=[], mixer_device=SimpleNamespace(volume=parameter),
                                clip_slots=[SimpleNamespace(has_clip=True, clip=clip)])
        handlers = {}
        server = SimpleNamespace(add_handler=lambda address, callback: handlers.update({address: callback}))
        extension.register(SimpleNamespace(song=SimpleNamespace(tracks=[track]), osc_server=server), SimpleNamespace())
        def write(points):
            return json.loads(handlers["/live/beatmind/clip_envelope"]((json.dumps({
                "track": 0, "scene": 0, "mixer": "volume", "unit": "native", "points": points}),))[0])
        return write, steps, clears

    def test_invalid_automation_preserves_existing_envelope(self):
        for points in ([{"beat": 0, "value": 0.2}, {"beat": 8, "value": 2}],
                       [{"beat": 0, "value": 0.2}, {"beat": 0, "value": 0.5}],
                       [{"beat": 0, "value": 0.2}, {"beat": 8, "value": "invalid"}],
                       [{"beat": 0, "value": 0.2}, {"beat": float("nan"), "value": 0.5}]):
            with self.subTest(points=points):
                write, steps, clears = self.envelope_writer()
                result = write(points)
                self.assertEqual(result["status"], "failed", result)
                self.assertEqual(steps, [(0.0, 8.0, 0.3)])
                self.assertEqual(clears, [])

    def test_automation_does_not_claim_verified_when_live_ignores_values(self):
        for readback in (0.9, float("nan")):
            with self.subTest(readback=readback):
                write, _, _ = self.envelope_writer(readback)
                result = write([{"beat": 0, "value": 0.2}, {"beat": 8, "value": 0.5}])
                self.assertEqual(result["status"], "partial", result)
                self.assertIn("readback differs", result["summary"])

    def test_valid_automation_replaces_and_verifies_existing_envelope(self):
        write, steps, clears = self.envelope_writer()
        result = write([{"beat": 0, "value": 0.2}, {"beat": 8, "value": 0.5}])
        self.assertEqual(result["status"], "verified", result)
        self.assertEqual(len(clears), 1)
        self.assertAlmostEqual(steps[0][2], 0.2)
        self.assertAlmostEqual(steps[-1][2], 0.5)

    def test_minus_inf_db_means_fully_off(self):
        class Send:
            name, min, max, value, is_enabled, is_quantized, state, automation_state = "B-Delay", 0.0, 1.0, 0.0, True, False, 0, 0
            def str_for_value(self, v):
                return "-inf dB" if v <= 0 else f"{20 * math.log10(v):.1f} dB"
        self.assertEqual(extension.native_value(Send(), "-inf", "dB"), 0.0)
        self.assertEqual(extension.native_value(Send(), "\u2212inf", "dB"), 0.0)
        with self.assertRaises(ValueError):
            extension.native_value(Parameter("Frequency"), "-inf", "Hz")

    def test_send_can_hold_off_across_a_clip(self):
        steps = []
        class Envelope:
            def insert_step(self, beat, length, value): steps.append(value)
            def value_at_time(self, t): return steps[-1]
        send = SimpleNamespace(name="B-Delay", min=0.0, max=1.0, value=0.0, is_enabled=True, is_quantized=False, state=0,
                               automation_state=0, str_for_value=lambda v: "-inf dB" if v <= 0 else f"{20 * math.log10(v):.1f} dB")
        clip = SimpleNamespace(length=8.0, clear_envelope=lambda p: None, automation_envelope=lambda p: None,
                               create_automation_envelope=lambda p: Envelope())
        mixer = SimpleNamespace(volume=None, panning=None, sends=[send, send])
        track = SimpleNamespace(devices=[], mixer_device=mixer, clip_slots=[SimpleNamespace(has_clip=True, clip=clip)])
        handlers = {}
        server = SimpleNamespace(add_handler=lambda address, callback: handlers.update({address: callback}))
        extension.register(SimpleNamespace(song=SimpleNamespace(tracks=[track]), osc_server=server), SimpleNamespace())
        write = lambda points: json.loads(handlers["/live/beatmind/clip_envelope"]((json.dumps(
            {"track": 0, "scene": 0, "mixer": "send", "send": 1, "unit": "dB", "points": points}),))[0])
        held = write([{"beat": 0, "value": "-inf"}, {"beat": 8, "value": "-inf"}])
        self.assertEqual(held["status"], "verified", held)
        self.assertEqual(set(steps), {0.0})
        ramp = write([{"beat": 0, "value": "-inf"}, {"beat": 8, "value": -12}])
        self.assertEqual(ramp["status"], "failed")
        self.assertIn("step curve", ramp["summary"])

    def test_note_feel_sets_chance_and_nudges_only_chosen_notes(self):
        class Note:
            def __init__(self, i, pitch, start): self.note_id, self.pitch, self.start_time, self.duration, self.probability, self.velocity, self.velocity_deviation = i, pitch, start, 0.25, 1.0, 100, 0.0
        notes = [Note(1, 42, 0.5), Note(2, 42, 1.0), Note(3, 42, 1.5), Note(4, 36, 0.0)]
        clip = SimpleNamespace(is_midi_clip=True, length=4.0, get_notes_extended=lambda *a: notes,
                               apply_note_modifications=lambda n: None)
        track = SimpleNamespace(clip_slots=[SimpleNamespace(clip=clip)])
        handlers = {}
        server = SimpleNamespace(add_handler=lambda address, callback: handlers.update({address: callback}))
        extension.register(SimpleNamespace(song=SimpleNamespace(tracks=[track], tempo=125.0), osc_server=server), SimpleNamespace())
        feel = lambda data: json.loads(handlers["/live/beatmind/note_feel"]((json.dumps({"track": 0, "scene": 0, **data}),))[0])
        result = feel({"pitches": [42], "positions_in_bar": [0.5, 1.5], "probability": 0.7, "velocity_deviation": 12, "nudge_ms": 4.8})
        self.assertEqual(result["status"], "verified", result)
        self.assertEqual([n.probability for n in notes], [0.7, 1.0, 0.7, 1.0])
        self.assertAlmostEqual(notes[0].start_time, 0.51)  # 4.8 ms at 125 BPM is 0.01 beat
        self.assertEqual(notes[1].start_time, 1.0)
        self.assertEqual(notes[3].velocity_deviation, 0.0)
        self.assertIn("30 ms", feel({"pitches": [42], "nudge_ms": 40})["summary"])
        self.assertEqual(feel({"pitches": [50]})["status"], "failed")

    def test_groove_pool_global_amount_and_assign(self):
        swing = SimpleNamespace(name="Swing MPC 3000 16ths 57", timing_amount=100.0, random_amount=0.0, velocity_amount=0.0, quantization_amount=0.0)
        clip = SimpleNamespace(groove=None)
        song = SimpleNamespace(groove_pool=SimpleNamespace(grooves=[swing]), groove_amount=0.0, scenes=[1],
                               tracks=[SimpleNamespace(clip_slots=[SimpleNamespace(has_clip=True, clip=clip)])])
        handlers = {}
        server = SimpleNamespace(add_handler=lambda address, callback: handlers.update({address: callback}))
        extension.register(SimpleNamespace(song=song, osc_server=server), SimpleNamespace())
        groove = lambda data: json.loads(handlers["/live/beatmind/groove"]((json.dumps(data),))[0])
        self.assertIn("no effect", groove({"action": "pool"})["summary"])
        self.assertEqual(groove({"action": "global", "amount": 100})["global_amount"], 100)
        assigned = groove({"action": "assign", "track": 0, "scene": 0, "groove": 0})
        self.assertEqual((assigned["status"], assigned["previous"]), ("verified", None))
        self.assertEqual(groove({"action": "clips"})["clips"], [{"track": 0, "scene": 0, "groove": "Swing MPC 3000 16ths 57"}])
        amounts = groove({"action": "amounts", "groove": 0, "timing": 60, "random": 3, "velocity": -20})
        self.assertEqual((swing.timing_amount, swing.random_amount, swing.velocity_amount), (60.0, 3.0, -20.0))
        self.assertEqual(groove({"action": "assign", "track": 0, "scene": 0, "groove": None})["groove"], None)

    def test_mixer_state_reads_sends_as_live_displays_them(self):
        def parameter(text, automated=0):
            return SimpleNamespace(value=0.5, automation_state=automated, str_for_value=lambda v: text)
        mixer = SimpleNamespace(volume=parameter("-6.0 dB"), panning=parameter("C"),
                                sends=[parameter("-15 dB"), parameter("-inf dB", automated=1)])
        track = SimpleNamespace(name="Lead", mixer_device=mixer)
        song = SimpleNamespace(tracks=[track], return_tracks=[SimpleNamespace(name="A-Reverb"), SimpleNamespace(name="B-Delay")])
        handlers = {}
        server = SimpleNamespace(add_handler=lambda address, callback: handlers.update({address: callback}))
        extension.register(SimpleNamespace(song=song, osc_server=server), SimpleNamespace())
        result = json.loads(handlers["/live/beatmind/mixer_state"]((json.dumps({"track": 0}),))[0])
        self.assertEqual(result["volume"]["display"], "-6.0 dB")
        self.assertEqual([(x["return"], x["display"], x["automated"]) for x in result["sends"]],
                         [("A-Reverb", "-15 dB", False), ("B-Delay", "-inf dB", True)])
        self.assertIn("A-Reverb -15 dB", result["summary"])

    def test_clip_envelope_ramp_lands_on_its_end_value(self):
        steps = []
        class Envelope:
            def insert_step(self, beat, length, value): steps.append((beat, length, value))
            def value_at_time(self, t): return [v for b, l, v in steps if b <= t][-1]
        cutoff = Parameter("Frequency")
        clip = SimpleNamespace(length=32.0, clear_envelope=lambda p: None, automation_envelope=lambda p: None,
                               create_automation_envelope=lambda p: Envelope())
        device = SimpleNamespace(name="Auto Filter", class_name="AutoFilter", parameters=[cutoff], can_have_chains=False)
        track = SimpleNamespace(devices=[device], clip_slots=[SimpleNamespace(has_clip=True, clip=clip)])
        handlers = {}
        server = SimpleNamespace(add_handler=lambda address, callback: handlers.update({address: callback}))
        extension.register(SimpleNamespace(song=SimpleNamespace(tracks=[track]), osc_server=server), SimpleNamespace())
        result = json.loads(handlers["/live/beatmind/clip_envelope"]((json.dumps({
            "track": 0, "scene": 0, "path": [0], "map_id": extension.map_id(device), "control": "Frequency", "unit": "Hz",
            "points": [{"beat": 0, "value": 20}, {"beat": 16, "value": 20, "curve": "exponential"}, {"beat": 32, "value": 300}]}),))[0])
        self.assertEqual(result["status"], "verified", result)
        hz = lambda native: 20 * 1000 ** native
        self.assertAlmostEqual(hz(steps[0][2]), 20, delta=0.5)
        self.assertAlmostEqual(hz(steps[63][2]), 20, delta=0.5)   # held until beat 16
        self.assertAlmostEqual(hz(steps[64][2]), 20, delta=0.5)   # the ramp starts from the start value
        self.assertAlmostEqual(hz(steps[-1][2]), 300, delta=3)    # and its last step is the end value
        self.assertEqual(len(steps), 128)
        self.assertIn("300", result["end_display"])

    def test_clip_automation_reads_stored_envelopes_only(self):
        class Envelope:
            def __init__(self, start, end, length): self.start, self.end, self.length = start, end, length
            def value_at_time(self, t): return self.start + (self.end - self.start) * t / self.length
        cutoff, volume = Parameter("Frequency"), Parameter("Track Volume")
        volume.str_for_value = lambda v: f"{v:.2f}"
        envelopes = {id(cutoff): Envelope(0.3, 1.0, 32.0)}
        clip = SimpleNamespace(length=32.0, automation_envelope=lambda p: envelopes.get(id(p)))
        sustain = Parameter("Ve Sustain")
        envelopes[id(sustain)] = Envelope(0.2, 0.8, 32.0)
        hat = SimpleNamespace(name="Simpler", parameters=[sustain], can_have_chains=False)
        kit = SimpleNamespace(name="909 Core Kit", parameters=[], can_have_chains=True, can_have_drum_pads=True,
                              chains=[SimpleNamespace(name="Kick", devices=[]), SimpleNamespace(name="Open Hat", devices=[hat])])
        device = SimpleNamespace(name="Auto Filter", parameters=[cutoff], can_have_chains=False)
        mixer = SimpleNamespace(volume=volume, panning=Parameter("Pan"), sends=[Parameter("A-Reverb")])
        track = SimpleNamespace(devices=[device, kit], mixer_device=mixer,
                                clip_slots=[SimpleNamespace(has_clip=True, clip=clip), SimpleNamespace(has_clip=False)])
        handlers = {}
        server = SimpleNamespace(add_handler=lambda address, callback: handlers.update({address: callback}))
        extension.register(SimpleNamespace(song=SimpleNamespace(tracks=[track]), osc_server=server), SimpleNamespace())
        read = lambda data: json.loads(handlers["/live/beatmind/clip_automation"]((json.dumps(data),))[0])
        result = read({"track": 0, "scene": 0, "samples": 3})
        self.assertEqual([a["name"] for a in result["automations"]], ["Frequency", "Ve Sustain"])
        self.assertEqual(result["automations"][1]["path"], [1, 1, 0])
        nested = read({"track": 0, "scene": 0, "path": [1, 1, 0], "control": "Ve Sustain"})
        self.assertEqual([a["device"] for a in nested["automations"]], ["Simpler"])
        self.assertEqual(result["automations"][0]["path"], [0])
        self.assertEqual([t for t, _ in result["automations"][0]["points"]], [0.01, 16.01, 31.99])
        self.assertTrue(result["automations"][0]["points"][0][1].endswith("Hz"))
        self.assertEqual(read({"track": 0, "scene": 0, "mixer": "volume"})["automations"], [])
        self.assertFalse(read({"track": 0, "scene": 1})["has_clip"])

    def test_curve_shapes_between_points(self):
        shape = lambda curve: [round(extension.curve_value(300, 18000, f, curve)) for f in (0, 0.25, 0.5, 0.75, 1)]
        self.assertEqual(shape("linear"), [300, 4725, 9150, 13575, 18000])
        self.assertEqual(shape("exponential"), [300, 835, 2324, 6467, 18000])
        self.assertEqual(shape("logarithmic")[1:4], [8044, 13575, 16894])
        self.assertEqual(shape("step"), [300] * 5)
        self.assertEqual(extension.curve_value(-30, 0, 0.5, "exponential"), -22.5)

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
            self.assertIsNone(next_part, "Approval must not automatically request another model turn")
            self.assertEqual(production.get_plan(7, "session")["parts"][1]["status"], "planned")
            self.assertIsNone(production.review_part(7, "recording", "accepted"))
            self.assertEqual(production.get_plan(7, "session")["parts"][0]["status"], "accepted")
            again = production.create_plan(7, "session", data)
            # An in-progress plan is continued, never overwritten, and is not reported as a failure.
            self.assertEqual(again["status"], "observed")
            self.assertEqual(again["plan"]["parts"][0]["status"], "accepted")
            self.assertEqual(production.get_plan(7, "session")["parts"][0]["status"], "accepted")

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
