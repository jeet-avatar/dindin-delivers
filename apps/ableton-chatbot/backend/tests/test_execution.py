import asyncio
import copy
import importlib.util
from pathlib import Path
import socket
import struct
import unittest
from unittest.mock import AsyncMock, patch

from claude_tools import tool_to_osc
from direct_runner import OscClient, _osc_string, parse_osc_message
from execution import compare_notes, execute_verified


NOTE = {"pitch": 36, "start": 0.0, "duration": 0.25, "velocity": 100, "muted": False}


class LiveDouble:
    """Stateful OSC fixture with independently defined Live reply shapes."""
    def __init__(self):
        self.calls = []
        self.notes = []
        self.drop_last_note = False
        self.has_clip = 1
        self.device_names = []
        self.browser_status = "loaded"
        self.fail_address = None
        self.wrong_target = False
        self.values = {"/live/song/get/tempo": [120.0], "/live/song/get/num_tracks": [2],
                       "/live/song/get/num_scenes": [4], "/live/song/get/is_playing": [True],
                       "/live/view/get/selected_track": [0],
                       "/live/clip/get/length": [16.0], "/live/clip/get/is_midi_clip": [True],
                       "/live/track/get/has_midi_input": [True], "/live/track/get/volume": [0.5],
                       "/live/device/get/parameters/name": ["Cutoff", "Mode"],
                       "/live/device/get/parameters/value": [1000.0, 0],
                       "/live/device/get/parameters/min": [20.0, 0],
                       "/live/device/get/parameters/max": [20000.0, 3],
                       "/live/device/get/parameters/is_quantized": [False, True],
                       "/live/device/get/parameter/value": [1000.0]}

    async def send(self, address, args, query=False, timeout=5):
        self.calls.append((address, args, query, timeout))
        if self.fail_address == address:
            return {"status": "timeout", "address": address}
        if query:
            if address.startswith("/live/browser/load"):
                if self.browser_status == "loaded":
                    self.device_names.append(args[0])
                return {"status": "ok", "address": address, "args": [self.browser_status, args[0]]}
            if address == "/live/clip/get/notes":
                values = [v for n in self.notes for v in (n["pitch"], n["start"], n["duration"], n["velocity"], n["muted"])]
            elif address == "/live/clip_slot/get/has_clip":
                values = [self.has_clip]
            elif address == "/live/track/get/devices/name":
                values = self.device_names[:]
            elif address == "/live/track/get/devices/type":
                values = [1 for _ in self.device_names]
            else:
                values = self.values[address]
            prefix = []
            if address.startswith("/live/device/get/parameter/"):
                prefix = args[:3]
            elif address.startswith(("/live/device/", "/live/clip/", "/live/clip_slot/")):
                prefix = args[:2]
            elif address.startswith("/live/track/"):
                prefix = args[:1]
            if self.wrong_target and prefix:
                prefix = [99] + prefix[1:]
            return {"status": "ok", "address": address, "args": prefix + values}
        if address == "/live/clip/add/notes":
            notes = [{"pitch": args[i], "start": args[i + 1], "duration": args[i + 2], "velocity": args[i + 3], "muted": bool(args[i + 4])}
                     for i in range(2, len(args), 5)]
            self.notes.extend(notes[:-1] if self.drop_last_note else notes)
        elif address == "/live/clip/remove/notes":
            low, span, start, length = args[2], args[3], args[4], args[5]
            self.notes[:] = [n for n in self.notes
                             if not (low <= n["pitch"] < low + span and start <= n["start"] < start + length)]
        elif address == "/live/clip_slot/create_clip":
            self.has_clip = 1
            self.values["/live/clip/get/length"] = [args[2]]
        elif "/set/" in address:
            self.values[address.replace("/set/", "/get/")] = [args[-1]]
        return {"status": "sent", "address": address}


class ExecutionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.live = LiveDouble()

    async def run_tool(self, name, data):
        return await execute_verified(name, data, self.live.send)

    async def test_remove_notes_keeps_every_note_outside_the_range(self):
        self.live.notes = [{"pitch": 57, "start": float(b), "duration": 0.9, "velocity": 100, "muted": False} for b in range(16)]
        result = await self.run_tool("remove_notes", {"track": 0, "scene": 0, "start": 15, "length": 1})
        self.assertEqual(result["status"], "verified", result)
        self.assertEqual([n["start"] for n in self.live.notes], [float(b) for b in range(15)])
        empty = await self.run_tool("remove_notes", {"track": 0, "scene": 0, "start": 15.5, "length": 0.5})
        self.assertEqual(empty["status"], "observed")
        self.assertIn("nothing needed removing", empty["summary"])
        held = await self.run_tool("remove_notes", {"track": 0, "scene": 0, "start": 14.5, "length": 0.5})
        self.assertIn("still sound into it", held["summary"])

    async def test_notes_of_an_empty_slot_answer_without_querying_notes(self):
        self.live.has_clip = 0
        result = await self.run_tool("get_clip_notes", {"track": 0, "scene": 1})
        self.assertEqual((result["status"], result["notes"]), ("observed", []))
        self.assertNotIn("/live/clip/get/notes", [call[0] for call in self.live.calls])

    async def test_reject_invalid_commands_before_any_io(self):
        cases = [("set_tempo", {"bpm": float("nan")}), ("set_tempo", {"bpm": True}),
                 ("set_track_volume", {"track": -1, "volume": 0.5}),
                 ("set_track_volume", {"track": 0, "volume": 1.1}),
                 ("add_notes", {"track": 0, "scene": 0, "notes": [{**NOTE, "pitch": 128}]}),
                 ("add_notes", {"track": 0, "scene": 0, "notes": []}),
                 ("not_a_tool", {})]
        for name, data in cases:
            with self.subTest(name=name, data=data):
                result = await self.run_tool(name, data)
                self.assertEqual(result["status"], "failed")
                self.assertEqual(self.live.calls, [])

    async def test_notes_read_back_existing_and_new_with_pitch_127(self):
        self.live.notes = [copy.copy(NOTE)]
        added = {"pitch": 127, "start": 1.5, "duration": 0.25, "velocity": 82}
        result = await self.run_tool("add_notes", {"track": 0, "scene": 0, "notes": [added]})
        self.assertEqual(result["status"], "verified")
        self.assertEqual(result["note_count"], 2)
        self.assertEqual(result["notes"][1]["pitch"], 127)
        queries = [args for address, args, query, _ in self.live.calls if address == "/live/clip/get/notes"]
        self.assertTrue(all(args[2:4] == [0, 128] for args in queries))

    async def test_lost_note_is_partial_and_batch_is_not_retried(self):
        self.live.drop_last_note = True
        result = await self.run_tool("add_notes", {"track": 0, "scene": 0, "notes": [{k: v for k, v in NOTE.items() if k != "muted"}]})
        self.assertEqual(result["status"], "partial")
        self.assertIn("1 missing", result["error"])
        self.assertEqual(sum(a == "/live/clip/add/notes" for a, *_ in self.live.calls), 1)

    async def test_preflight_timeout_makes_no_changes(self):
        self.live.fail_address = "/live/clip/get/notes"
        result = await self.run_tool("clear_notes", {"track": 0, "scene": 0})
        self.assertEqual(result["status"], "failed")
        self.assertTrue(all(query for _, _, query, _ in self.live.calls))

    async def test_clear_includes_highest_midi_pitch(self):
        self.live.notes = [{**NOTE, "pitch": 127}]
        result = await self.run_tool("clear_notes", {"track": 0, "scene": 0})
        self.assertEqual(result["status"], "verified")
        write = next(args for a, args, *_ in self.live.calls if a == "/live/clip/remove/notes")
        self.assertEqual(write[2:4], [0, 128])

    async def test_occupied_clip_is_not_overwritten(self):
        result = await self.run_tool("create_clip", {"track": 0, "scene": 0, "length_beats": 16})
        self.assertEqual(result["status"], "failed")
        self.assertTrue(all(query for _, _, query, _ in self.live.calls))

    async def test_creation_reads_back_length(self):
        self.live.has_clip = 0
        result = await self.run_tool("create_clip", {"track": 0, "scene": 0, "length_beats": 8})
        self.assertEqual(result["status"], "verified")

    async def test_wrong_object_reply_cannot_verify_write(self):
        self.live.wrong_target = True
        result = await self.run_tool("set_track_volume", {"track": 0, "volume": 0.6})
        self.assertEqual(result["status"], "partial")
        self.assertIn("does not match", result["error"])

    async def test_parameter_uses_native_range(self):
        result = await self.run_tool("set_device_parameter", {"track": 0, "device": 0, "parameter": 0, "value": 2500})
        self.assertEqual(result["status"], "verified")
        result = await self.run_tool("set_device_parameter", {"track": 0, "device": 0, "parameter": 0, "value": 0.8})
        self.assertEqual(result["status"], "failed")

    async def test_discrete_parameter_rejects_fraction(self):
        result = await self.run_tool("set_device_parameter", {"track": 0, "device": 0, "parameter": 1, "value": 1.5})
        self.assertEqual(result["status"], "failed")
        self.assertTrue(all(query for _, _, query, _ in self.live.calls))

    async def test_browser_not_found_is_not_success(self):
        self.live.browser_status = "not_found"
        result = await self.run_tool("load_instrument", {"track": 0, "instrument_uri": "Drums/Missing Kick"})
        self.assertEqual(result["status"], "partial")
        self.assertIn("not_found", result["error"])

    async def test_browser_load_waits_for_reply_and_chain(self):
        result = await self.run_tool("load_instrument", {"track": 0, "instrument_uri": "Drums/DS Kick"})
        self.assertEqual(result["status"], "verified")
        self.assertEqual(result["devices"], ["DS Kick"])
        self.assertIn(("/live/browser/load_device", ["DS Kick"], True, 20.0), self.live.calls)

    async def test_existing_instrument_is_not_replaced(self):
        self.live.device_names = ["Operator"]
        result = await self.run_tool("load_sample", {"track": 0, "sample_name": "Kick.wav"})
        self.assertEqual(result["status"], "failed")
        self.assertTrue(all(query for _, _, query, _ in self.live.calls))

    async def test_note_limit_and_clip_bounds(self):
        note = {k: v for k, v in NOTE.items() if k != "muted"}
        result = await self.run_tool("add_notes", {"track": 0, "scene": 0, "notes": [note] * 41})
        self.assertEqual(result["status"], "failed")
        self.assertEqual(self.live.calls, [])
        result = await self.run_tool("add_notes", {"track": 0, "scene": 0, "notes": [{**note, "start": 16}]})
        self.assertEqual(result["status"], "failed")

    async def test_automation_is_honest_about_endpoint_only(self):
        data = {"track": 0, "device": 0, "parameter": 0, "from_value": 1000, "to_value": 2000, "duration_seconds": 2, "steps": 4}
        with patch("execution.asyncio.sleep", new_callable=AsyncMock):
            result = await self.run_tool("automate_parameter", data)
        self.assertEqual(result["status"], "unverified")
        self.assertIn("endpoint verified", result["summary"])
        self.assertEqual(sum(c["delay"] for c in tool_to_osc("automate_parameter", data)), 2)


class ProtocolTests(unittest.TestCase):
    def test_note_comparison_detects_duplicates_and_muting(self):
        self.assertEqual(compare_notes([NOTE], [NOTE, NOTE]), ([NOTE], []))
        self.assertEqual(len(compare_notes([{**NOTE, "muted": True}], [NOTE])[0]), 1)
        self.assertEqual(compare_notes([{**NOTE, "start": 0.000001}], [NOTE]), ([], []))

    def test_boolean_nil_and_double_reply_tags(self):
        path = Path(__file__).resolve().parents[2] / "bridge" / "bridge.py"
        spec = importlib.util.spec_from_file_location("beatmind_bridge", path)
        bridge = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(bridge)
        packet = _osc_string("/live/test") + _osc_string(",TFNdi") + struct.pack(">di", 1.25, 36)
        for parser in (parse_osc_message, bridge.parse_osc_message):
            self.assertEqual(parser(packet), ("/live/test", [True, False, None, 1.25, 36]))

    def test_direct_query_ignores_wrong_address_and_track(self):
        def packet(address, ids):
            return _osc_string(address) + _osc_string("," + "i" * len(ids)) + b"".join(struct.pack(">i", n) for n in ids)
        replies = [(packet("/live/track/get/mute", [0, 1]), None),
                   (packet("/live/track/get/volume", [1, 1]), None),
                   (packet("/live/track/get/volume", [0, 1]), None)]
        from unittest.mock import Mock
        osc = OscClient.__new__(OscClient)
        osc.send_sock = Mock()
        osc.recv_sock = Mock()
        osc.recv_sock.recv.side_effect = BlockingIOError
        osc.recv_sock.recvfrom.side_effect = replies
        result = osc.query("/live/track/get/volume", [0])
        self.assertEqual(result["args"], [0, 1])
        self.assertEqual(osc.recv_sock.recvfrom.call_count, 3)


if __name__ == "__main__":
    unittest.main()
