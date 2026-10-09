import tempfile
from pathlib import Path
import unittest

import references
import reference_timing as timing
import separation
import stems
import test_references

DETAILED = ['drums', 'bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals']


class TaxonomyTests(unittest.TestCase):
    def test_legacy_reports_stay_four_stem(self):
        for report in ({}, {'stems': []}, {'stems': [{'name': n} for n in stems.CORE_STEMS]}):
            self.assertEqual(stems.review_stems(report), list(stems.CORE_STEMS))

    def test_drum_parts_replace_parent_drums_as_review_choices(self):
        report = {'stems': [{'name': n} for n in DETAILED]}
        self.assertEqual(stems.audio_stems(report), DETAILED)
        self.assertEqual(stems.review_stems(report), ['bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals'])


class DrumModelTests(unittest.TestCase):
    def test_only_the_reviewed_checkpoint_is_accepted(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'drumsep.th'
            path.write_bytes(b'not the reviewed model')
            self.assertFalse(separation.drumsep_ready(path))
        self.assertFalse(separation.drumsep_ready(Path('/nonexistent/drumsep.th')))
        self.assertFalse(separation.drumsep_ready(None))


class DetailedRouteTests(unittest.TestCase):
    setUp = test_references.ReferenceTests.setUp
    seed = test_references.ReferenceTests.seed

    def seed_detailed(self):
        directory = self.seed()
        report = {'stems': [{'name': n} for n in DETAILED], 'tempo': {'bpm': 124}, 'duration_seconds': 10,
                  'stem_health': {'checks_passed': True}}
        references.write_json(directory / 'report.json', report)
        for name in DETAILED:
            (directory / f'{name}.wav').write_bytes(name.encode())
        return directory

    def test_drum_part_audio_is_served_and_unknown_layers_are_not(self):
        self.seed_detailed()
        path = '/api/references/' + self.id + '/audio/'
        self.assertEqual(self.client.get(path + 'kick', headers={'x-user': '1'}).content, b'kick')
        self.assertEqual(self.client.get(path + 'drums', headers={'x-user': '1'}).content, b'drums')
        self.assertEqual(self.client.get(path + 'piano', headers={'x-user': '1'}).status_code, 404)

    def test_four_stem_audio_does_not_expose_drum_parts(self):
        directory = self.seed()
        (directory / 'kick.wav').write_bytes(b'stray')
        self.assertEqual(self.client.get('/api/references/' + self.id + '/audio/kick', headers={'x-user': '1'}).status_code, 404)

    def test_review_requires_every_detailed_choice_and_not_parent_drums(self):
        directory = self.seed_detailed()
        analysis_id = timing.fingerprint(directory)
        url = '/api/references/' + self.id + '/stem-review'
        choices = {name: 'keep' for name in stems.review_stems(references.report_of(directory))}
        four = {'analysis_id': analysis_id, 'heard': True,
                'decisions': dict(drums='keep', bass='keep', vocals='keep', other='keep')}
        self.assertEqual(self.client.post(url, json=four, headers={'x-user': '1'}).status_code, 422)
        with_parent = {'analysis_id': analysis_id, 'heard': True, 'decisions': {**choices, 'drums': 'keep'}}
        self.assertEqual(self.client.post(url, json=with_parent, headers={'x-user': '1'}).status_code, 422)
        response = self.client.post(url, json={'analysis_id': analysis_id, 'heard': True,
                                               'decisions': {**choices, 'vocals': 'ignore'}}, headers={'x-user': '1'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'accepted')
        self.assertEqual(timing.stem_review(directory)['decisions']['kick'], 'keep')


if __name__ == '__main__':
    unittest.main()
