import unittest

import numpy as np

from reference_worker import refine_tempo


def clicks(bpm, seconds=40, sr=22050):
    y = np.zeros(int(seconds * sr), dtype='float32')
    for t in np.arange(0, seconds, 60 / bpm):
        i = int(t * sr)
        y[i:i + 200] += np.hanning(200).astype('float32')
    return y, sr


class TempoRefinementTests(unittest.TestCase):
    def test_quantized_estimates_are_refined_to_the_true_tempo(self):
        for true_bpm, coarse in ((128.0, 129.2), (123.0, 123.05), (122.0, 123.0)):
            with self.subTest(true_bpm=true_bpm):
                y, sr = clicks(true_bpm)
                self.assertAlmostEqual(refine_tempo(y, sr, coarse), true_bpm, delta=0.1)

    def test_missing_estimate_is_left_alone(self):
        y, sr = clicks(128)
        self.assertEqual(refine_tempo(y, sr, 0.0), 0.0)


if __name__ == '__main__':
    unittest.main()
