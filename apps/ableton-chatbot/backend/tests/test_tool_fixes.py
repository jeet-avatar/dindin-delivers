import unittest

from claude_tools import fader_from_db, tool_to_osc


class VolumeTests(unittest.TestCase):
    def test_db_matches_faders_measured_in_live(self):
        # Live 12 displayed these dB values for these fader positions.
        for db, fader in ((0, 0.85), (-4, 0.75), (-12, 0.55), (-14, 0.5), (6, 1.0), (-18, 0.4)):
            self.assertAlmostEqual(fader_from_db(db), fader, places=4)
        self.assertLess(fader_from_db(-40), 0.4)
        self.assertGreater(fader_from_db(-40), 0)

    def test_db_input_becomes_a_native_fader_value(self):
        self.assertEqual(tool_to_osc('set_track_volume', {'track': 2, 'volume_db': -6}),
                         [{'address': '/live/track/set/volume', 'args': [2, 0.7]}])
        self.assertEqual(tool_to_osc('set_track_volume', {'track': 2, 'volume': 0.85})[0]['args'], [2, 0.85])

    def test_ambiguous_or_linear_gain_input_is_refused(self):
        with self.assertRaises(ValueError):
            tool_to_osc('set_track_volume', {'track': 1})
        with self.assertRaises(ValueError):
            tool_to_osc('set_track_volume', {'track': 1, 'volume': 0.8, 'volume_db': -2})
        with self.assertRaises(ValueError):
            tool_to_osc('set_track_volume', {'track': 1, 'volume': 1.2589})  # +2 dB as linear gain, the old bug


class EmptyRackTests(unittest.TestCase):
    def test_bare_racks_are_refused_but_kits_load(self):
        for uri in ('Drums/Drum Rack', 'Instrument Rack', 'drum rack'):
            with self.assertRaises(ValueError) as caught:
                tool_to_osc('load_instrument', {'track': 3, 'instrument_uri': uri})
            self.assertIn('Core Kit', str(caught.exception))
        commands = tool_to_osc('load_instrument', {'track': 3, 'instrument_uri': 'Drums/909 Core Kit.adg'})
        self.assertEqual(commands[1]['args'], ['909 Core Kit.adg'])


if __name__ == '__main__':
    unittest.main()


def test_prompt_reuses_beatmind_starter_tracks():
    from claude_tools import SYSTEM_PROMPT
    assert "BeatMind Starter" in SYSTEM_PROMPT
    assert "matching empty track instead of" in SYSTEM_PROMPT


def test_audition_refuses_midi_track_without_instrument():
    import asyncio
    from types import SimpleNamespace
    from unittest.mock import AsyncMock
    import main

    replies = {"/live/track/get/has_midi_input": [0, True], "/live/track/get/num_devices": [0, 0]}
    bridge = SimpleNamespace(user_id=1, capture_part=AsyncMock(),
                             send_command=AsyncMock(side_effect=lambda address, args, query=False, timeout=5.0:
                                                    {"status": "ok", "args": replies[address]}))
    result = asyncio.run(main._execute_tool("audition_part", {"track": 0, "scene": 0, "seconds": 4}, bridge))
    assert result["status"] == "failed"
    assert "no instrument" in result["summary"] and "load_instrument" in result["summary"]
    bridge.capture_part.assert_not_called()

    replies["/live/track/get/num_devices"] = [0, 1]
    bridge.capture_part.return_value = {"status": "failed", "error": "stub", "summary": "stub"}
    asyncio.run(main._execute_tool("audition_part", {"track": 0, "scene": 0, "seconds": 4}, bridge))
    bridge.capture_part.assert_called_once()


def test_prompt_says_starter_tracks_need_an_instrument():
    from claude_tools import SYSTEM_PROMPT
    assert "Starter tracks contain no" in SYSTEM_PROMPT and "load_instrument before writing notes" in SYSTEM_PROMPT
