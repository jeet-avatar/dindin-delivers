import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

from fastapi import HTTPException
from pydantic import ValidationError
import mido
import reference_templates
import reference_timing as timing
import references
import test_references
from test_reference_templates import BRIEF


class TimingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.report = {'duration_seconds': 180.044126984127, 'tempo': {'bpm': 85},
                       'structure': {'boundary_seconds': [0, 31.123, 104.98]}}
        self.write('report.json', self.report)
        self.map = timing.read(self.directory)
        self.decisions = dict(drums='keep', bass='keep', vocals='ignore', other='keep')
        self.write('stem-review.json', {'analysis_id': self.map['analysis_id'],
                                      'status': 'accepted', 'decisions': self.decisions})

    def write(self, name, data):
        (self.directory / name).write_text(json.dumps(data))

    def confirm(self):
        payload = {key: self.map[key] for key in ('analysis_id', 'revision', 'bpm', 'numerator', 'denominator', 'sections')}
        result = timing.validate_review(timing.TimingReview(**payload, confirm=True), self.directory)
        self.write('timing.json', result)
        return result

    def template(self):
        brief = reference_templates.CreativeBrief(**{**BRIEF, 'timing_mode': 'reference_seconds'})
        return timing.align_template(reference_templates.build(brief), self.confirm(), self.decisions)

    def test_requires_both_reviews(self):
        with self.assertRaises(HTTPException):
            timing.require_review(self.directory)
        self.confirm()
        self.assertEqual(timing.require_review(self.directory)['status'], 'confirmed')
        (self.directory / 'stem-review.json').unlink()
        with self.assertRaises(HTTPException):
            timing.require_review(self.directory)

    def test_seconds_and_fractional_bars_preserved(self):
        result = self.template()
        self.assertEqual(result['duration_seconds'], self.report['duration_seconds'])
        self.assertEqual(result['sections'][1]['start_seconds'], 31.123)
        self.assertNotEqual(result['sections'][0]['bars'], round(result['sections'][0]['bars']))
        self.assertTrue(timing.template_current(result, self.directory))

    def test_gaps_overlap_and_empty_rejected(self):
        for start, end in [(1, 5), (0, 0), (0, -1)]:
            with self.assertRaises(ValidationError):
                timing.TimingReview(analysis_id=self.map['analysis_id'], revision=0, bpm=85,
                                    sections=[{'name': 'A', 'start_seconds': start, 'end_seconds': end}])

    def test_missing_end_and_stale_review_rejected(self):
        request = timing.TimingReview(analysis_id=self.map['analysis_id'], revision=0, bpm=85,
                                     sections=[{'name': 'A', 'start_seconds': 0, 'end_seconds': 100}])
        with self.assertRaises(HTTPException) as caught:
            timing.validate_review(request, self.directory)
        self.assertEqual(caught.exception.status_code, 422)
        self.confirm()
        with self.assertRaises(HTTPException) as caught:
            timing.validate_review(request, self.directory)
        self.assertEqual(caught.exception.status_code, 409)

    def test_changed_choices_or_analysis_invalidate_approval(self):
        result = self.template()
        changed = {**self.decisions, 'vocals': 'keep'}
        self.write('stem-review.json', {'analysis_id': self.map['analysis_id'], 'status': 'accepted', 'decisions': changed})
        self.assertFalse(timing.template_current(result, self.directory))
        self.write('report.json', {**self.report, 'duration_seconds': 179})
        self.assertFalse(timing.template_current(result, self.directory))

    def test_download_gated_and_midi_timing_roundtrip(self):
        result = self.template()
        with self.assertRaises(HTTPException):
            timing.export_package(result, self.directory)
        result['status'] = 'approved'
        result['sections'][1]['name'] = '\u97f3\u697d'
        with zipfile.ZipFile(io.BytesIO(timing.export_package(result, self.directory))) as archive:
            midi = mido.MidiFile(file=io.BytesIO(archive.read('timing-guide.mid')), charset='utf8')
            self.assertAlmostEqual(midi.length, self.report['duration_seconds'], delta=0.001)
            self.assertEqual(json.loads(archive.read('template.json'))['sections'], result['sections'])
            self.assertIn('\u97f3\u697d', [m.text for m in midi.tracks[0] if m.type == 'marker'])


class TimingRouteTests(unittest.TestCase):
    setUp = test_references.ReferenceTests.setUp
    seed = test_references.ReferenceTests.seed

    def prepare(self):
        directory = self.seed()
        report = json.loads((directory / 'report.json').read_text())
        report['stem_health'] = {'checks_passed': True}
        references.write_json(directory / 'report.json', report)
        self.base = '/api/references/' + self.id
        self.headers = {'x-user': '1'}
        proposal = timing.read(directory)
        self.payload = {key: proposal[key] for key in ('analysis_id', 'revision', 'bpm', 'numerator', 'denominator', 'sections')}
        self.payload['confirm'] = True
        return directory

    def test_review_routes_owner_only(self):
        self.prepare()
        for endpoint, body in [('timing', self.payload), ('stem-review', {'analysis_id': self.payload['analysis_id'], 'decisions': {}, 'heard': True})]:
            self.assertEqual(self.client.post(self.base + '/' + endpoint, json=body, headers={'x-user': '2'}).status_code, 404)
        self.assertEqual(self.client.get(self.base + '/template/download', headers={'x-user': '2'}).status_code, 404)

    def test_changed_stem_choices_require_rebuilt_template(self):
        self.prepare()
        decisions = dict(drums='keep', bass='keep', vocals='ignore', other='keep')
        body = {'analysis_id': self.payload['analysis_id'], 'decisions': decisions, 'heard': True}
        self.assertEqual(self.client.post(self.base + '/stem-review', json=body, headers=self.headers).status_code, 200)
        self.assertEqual(self.client.post(self.base + '/timing', json=self.payload, headers=self.headers).status_code, 200)
        brief = {**BRIEF, 'timing_mode': 'reference_seconds'}
        draft = self.client.post(self.base + '/template', json=brief, headers=self.headers).json()
        self.assertEqual(draft['duration_seconds'], 10)
        self.assertEqual(self.client.post(self.base + '/template/approve', json={'revision': draft['revision']}, headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get(self.base + '/template/download', headers=self.headers).status_code, 200)
        body['decisions']['vocals'] = 'keep'
        self.client.post(self.base + '/stem-review', json=body, headers=self.headers)
        self.assertEqual(self.client.post(self.base + '/template/approve', json={'revision': draft['revision'] + 1}, headers=self.headers).status_code, 409)
        self.assertEqual(self.client.get(self.base + '/template/download', headers=self.headers).status_code, 409)

    def test_failed_integrity_blocks_review(self):
        directory = self.prepare()
        report = json.loads((directory / 'report.json').read_text())
        report['stem_health']['checks_passed'] = False
        references.write_json(directory / 'report.json', report)
        body = {'analysis_id': timing.fingerprint(directory), 'decisions': dict(drums='keep', bass='keep', vocals='ignore', other='keep'), 'heard': True}
        self.assertEqual(self.client.post(self.base + '/stem-review', json=body, headers=self.headers).status_code, 409)
