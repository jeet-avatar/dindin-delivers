import unittest

import bus_mastering


class ClassificationTests(unittest.TestCase):
    def test_classifies_common_track_names(self):
        names = ['Kick', 'Snare', 'Hats', 'Sub Bass', 'Lead Vocal', 'Pad', 'FX Riser']
        result = bus_mastering.classify_tracks(names)
        self.assertEqual(result[0], 'drums')   # Kick
        self.assertEqual(result[1], 'drums')   # Snare
        self.assertEqual(result[2], 'drums')   # Hats
        self.assertEqual(result[3], 'bass')    # Sub Bass
        self.assertEqual(result[4], 'vocals')  # Lead Vocal
        self.assertEqual(result[5], 'other')   # Pad
        self.assertIsNone(result[6])           # FX Riser — unclassified, never guessed
