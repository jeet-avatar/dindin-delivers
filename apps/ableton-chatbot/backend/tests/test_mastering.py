import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
from scipy.io import wavfile

import mastering


def tone(frequency=110, gain=0.2, seconds=3, rate=44100):
    times = np.arange(round(seconds * rate)) / rate
    audio = gain * np.sin(2 * np.pi * frequency * times)
    return np.column_stack((audio, audio)).astype('float32')


class LoudnessTests(unittest.TestCase):
    def test_loudness_measures_a_known_tone(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'tone.wav'
            wavfile.write(path, 44100, tone(gain=0.5))
            lufs, peak = mastering.loudness(path)
            # A -6 dBFS-ish full-bandwidth sine reads roughly -9 to -15 LUFS integrated;
            # this just pins the function to a plausible, stable range, not an exact value.
            self.assertTrue(-20 < lufs < -5, lufs)
            self.assertTrue(-10 < peak < 0, peak)

    def test_band_shares_places_energy_in_the_right_band(self):
        samples = tone(frequency=3000, gain=0.5, seconds=1)
        bands = mastering.band_shares(samples)
        self.assertGreater(bands['harsh'], 80)
        self.assertLess(bands['low'], 5)

    def test_loudness_is_deterministic_on_identical_input(self):
        # Pins the invariant Chunk 3's sound_comparison LUFS-delta note depends on: two independent
        # FFmpeg ebur128 runs on byte-identical audio must agree exactly, not just approximately,
        # or test_identical_audio_has_zero_deltas_without_match_claim (existing test) would be flaky.
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'tone.wav'
            wavfile.write(path, 44100, tone(gain=0.5))
            first = mastering.loudness(path)
            second = mastering.loudness(path)
            self.assertEqual(first, second)


class ReferenceTargetsTests(unittest.TestCase):
    """`REFERENCES_ROOT` is read once at import time (see Step 3), so patching the
    BEATMIND_REFERENCES_DIR env var after import has no effect — patch the module attribute
    directly, the same technique that already has to be used for producer_profile.ROOT elsewhere."""

    def test_reads_the_reference_mix_file(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            reference_id = 'a' * 32
            (root / reference_id).mkdir()
            wavfile.write(root / reference_id / 'mix.wav', 44100, tone(gain=0.5))
            with mock.patch.object(mastering, 'REFERENCES_ROOT', root):
                target = mastering.reference_targets(reference_id)
            self.assertTrue(-20 < target['target_lufs'] < -5)
            self.assertIn('band_percent', target)

    def test_missing_reference_raises(self):
        with tempfile.TemporaryDirectory() as temporary:
            with mock.patch.object(mastering, 'REFERENCES_ROOT', Path(temporary)):
                with self.assertRaises(ValueError):
                    mastering.reference_targets('b' * 32)
