import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
import soundfile as sf

import drum_pattern

SR = 22050
BPM = 125.0
BEAT = 60 / BPM
START = 0.3                          # The music starts a little after the file does.
FOUR_ON_FLOOR = [0, 1, 2, 3]
BROKEN = [0, 1, 2, 2.75, 3.5]        # The fill in the last bars.


def kick(level):
    t = np.arange(int(0.2 * SR)) / SR
    return level * np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.05)


def hat(level):
    t = np.arange(int(0.03 * SR)) / SR
    return level * np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t / 0.005)


def reference(directory, bars=16, drums_only=False):
    y = np.zeros(int((START + bars * 4 * BEAT + 1) * SR))
    def place(sound, beat):
        at = int((START + beat * BEAT) * SR)
        y[at:at + len(sound)] += sound
    for bar in range(bars):
        pattern = BROKEN if bar >= 12 else FOUR_ON_FLOOR
        for beat in pattern:
            place(kick(0.6 if beat % 1 else 0.9), bar * 4 + beat)
        for eighth in range(8):
            place(hat(0.05), bar * 4 + eighth / 2 + 0.25)   # Spill from the hats, between the kicks.
    sf.write(directory / ('drums.wav' if drums_only else 'kick.wav'), y, SR)
    beats = [START + i * BEAT for i in range(bars * 4)]
    (directory / 'report.json').write_text(json.dumps({
        'duration_seconds': len(y) / SR, 'tempo': {'bpm': BPM}, 'beat_times_seconds': beats}))


class DrumPatternTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.dir = Path(self.temp.name)

    def starts(self, result, name):
        return [note['start'] for note in result['patterns'][name]['notes']]

    def test_reads_the_exact_kick_pattern_and_where_it_changes(self):
        reference(self.dir)
        result = drum_pattern.extract(self.dir)
        self.assertEqual(result['status'], 'observed', result)
        self.assertEqual(result['main_pattern'], 'A')
        self.assertEqual(self.starts(result, 'A'), FOUR_ON_FLOOR)
        self.assertEqual(result['patterns']['A']['bars_using_it'], 12)
        self.assertEqual(self.starts(result, 'B'), BROKEN)
        self.assertEqual(result['timeline'], [{'from_bar': 1, 'to_bar': 12, 'pattern': 'A'},
                                              {'from_bar': 13, 'to_bar': 16, 'pattern': 'B'}])
        self.assertAlmostEqual(result['bar_1_starts_at_seconds'], START, delta=0.02)
        self.assertGreaterEqual(result['hits_on_16th_grid'], 0.95)

    def test_softer_off_beat_kicks_keep_lower_velocity(self):
        reference(self.dir)
        notes = {note['start']: note['velocity'] for note in drum_pattern.extract(self.dir)['patterns']['B']['notes']}
        self.assertLess(notes[2.75], notes[0])

    def test_falls_back_to_the_low_end_of_the_drums_stem(self):
        reference(self.dir, drums_only=True)
        result = drum_pattern.extract(self.dir)
        self.assertEqual(result['source'], 'drums (below 150 Hz)')
        self.assertEqual(self.starts(result, 'A'), FOUR_ON_FLOOR)

    def test_reference_without_audio_explains_what_to_do(self):
        (self.dir / 'report.json').write_text(json.dumps({'duration_seconds': 10, 'tempo': {'bpm': 120}}))
        result = drum_pattern.extract(self.dir)
        self.assertEqual(result['status'], 'failed')
        self.assertIn('Cloud HQ', result['summary'])


class DrumPatternToolTests(unittest.IsolatedAsyncioTestCase):
    async def test_chat_tool_reads_an_owned_reference(self):
        from unittest.mock import patch
        import chat_tools
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            reference(directory)
            with patch.object(chat_tools.references, 'owned', return_value=(directory, {})) as owned:
                result = await chat_tools.execute('get_reference_drum_pattern', {'reference_id': 'a' * 32, 'part': 'kick'}, 7)
            owned.assert_called_once_with('a' * 32, 7)
        self.assertEqual(result['status'], 'observed')
        self.assertEqual([n['start'] for n in result['patterns']['A']['notes']], FOUR_ON_FLOOR)

    async def test_chat_tool_refuses_someone_elses_reference(self):
        import chat_tools
        result = await chat_tools.execute('get_reference_drum_pattern', {'reference_id': 'b' * 32, 'part': 'kick'}, 7)
        self.assertEqual(result['status'], 'failed')


if __name__ == '__main__':
    unittest.main()
