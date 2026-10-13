import copy
import io
import time
import uuid
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
import jsonschema
import numpy as np
import soundfile as sf

import remix_assets
import remix_audio
import remix_chat
import remix_jobs
import remix_render
import security
import test_remix_chat as chat_fixtures
import test_remix_jobs as fixtures


class CreativeRemixTests(unittest.TestCase):
    def setUp(self):
        chat_fixtures.RemixChatTests.setUp(self)
        app = FastAPI()
        app.add_middleware(security.DoSProtectionMiddleware)
        app.include_router(remix_assets.router_for(fixtures.user))
        app.include_router(remix_jobs.router_for(fixtures.user, self.create))
        app.include_router(remix_chat.router_for(fixtures.user))
        self.client = TestClient(app)
        self.samples_url = f'/api/references/{self.id}/remix-samples'
        security._rate_store.clear()

    current = chat_fixtures.RemixChatTests.current

    def wave(self, seconds=.5, frequency=220):
        t = np.arange(round(44100 * seconds)) / 44100
        audio = .1 * np.sin(2 * np.pi * frequency * t)
        output = io.BytesIO()
        sf.write(output, audio, 44100, format='WAV', subtype='PCM_16')
        return output.getvalue()

    def upload(self, audio=None, **headers):
        return self.client.post(self.samples_url, content=audio or self.wave(), headers={
            'Content-Type': 'application/octet-stream', 'X-Sample-Name': 'Instrument.wav',
            'X-Rights-Confirmed': 'true', **headers})

    def part(self, sample_id, **changes):
        return {'id': 'part_bass', 'name': 'My sampled bass', 'sample_id': sample_id,
                'root_note': 57, 'gain_db': -6, 'loop_beats': 4,
                'notes': [{'beat': beat, 'duration_beats': .5, 'note': 69, 'velocity': 100} for beat in range(4)],
                'replaces': 'bass', 'effects': [], **changes}

    def test_upload_and_audition_are_owned_bounded_and_do_not_change_music(self):
        with self.client:
            self.assertEqual(self.upload(**{'X-Rights-Confirmed': 'false'}).status_code, 400)
            self.assertEqual(self.upload(**{'x-user': '2'}).status_code, 404)
            self.assertEqual(self.upload(b'not audio').status_code, 422)
            self.assertEqual(self.upload(self.wave(10.2)).status_code, 422)
            self.assertEqual(self.upload(**{'Content-Length': str(remix_assets.MAX_BYTES + 1)}).status_code, 413)
            self.assertEqual(list((self.source / 'remix-samples').glob('*/sample.json')), [])
            # Exceeds the default 64KB JSON body limit, but is a valid bounded audio upload.
            response = self.upload(self.wave(2))
            self.assertEqual(response.status_code, 201, response.text)
            sample = response.json()
            self.assertEqual(len(self.client.get(self.samples_url).json()['samples']), 1)
            url = self.samples_url + '/' + sample['id'] + '/audio'
            self.assertEqual(self.client.get(url).status_code, 200)
            self.assertEqual(self.client.get(url, headers={'x-user': '2'}).status_code, 404)
            self.assertEqual(self.current()['samples'][0]['id'], sample['id'])
            self.create.assert_not_awaited()

    def test_chat_replacement_and_effects_render_aligned_audio_and_require_fresh_approval(self):
        with self.client:
            sample = self.upload().json()
            current = self.current()
            recipe = copy.deepcopy(current['recipe'])
            recipe['segments'][0]['parts'] = [self.part(sample['id'])]
            recipe['segments'][0]['effects'] = {'drums': [{'kind': 'highpass', 'frequency_hz': 40}]}
            proposal = {'expected_version': current['version'], 'title': current['title'], 'recipe': recipe}
            jsonschema.validate(proposal, remix_chat.TOOLS[1]['input_schema'])
            result = remix_chat.propose(1, self.session.session_id, proposal)
            self.assertIn('remix_draft', result)
            draft = self.current()['draft']
            request = {**self.request, 'request_id': uuid.uuid4().hex, 'session_id': self.session.session_id,
                       'title': draft['title'], 'recipe': draft['recipe'], 'draft_id': draft['id']}
            response = self.client.post(self.base, json=request)
            self.assertEqual(response.status_code, 202, response.text)
            endpoint = self.base + '/' + response.json()['id']
            deadline = time.monotonic() + 120
            job = self.client.get(endpoint).json()
            while job['status'] == 'rendering' and time.monotonic() < deadline:
                time.sleep(.1)
                job = self.client.get(endpoint).json()
            self.assertEqual(job['status'], 'ready', job)
            self.assertEqual(job['review'], 'pending')
            directory = self.source / 'automatic-remixes' / job['id']
            layer = sf.read(directory / 'part_bass.wav')[0]
            bass = sf.read(directory / 'bass.wav')[0]
            self.assertGreater(np.max(np.abs(layer[:4 * 44100])), .001)
            self.assertEqual(np.max(np.abs(bass[:4 * 44100])), 0)
            self.assertEqual(np.max(np.abs(layer[4 * 44100:])), 0)
            self.assertGreater(np.max(np.abs(bass[4 * 44100:])), .001)
            # The uploaded A3 sample plays one octave higher, without shifting the section timeline.
            tone = layer[1000:10000, 0]
            frequency = np.fft.rfftfreq(len(tone), 1 / 44100)[np.abs(np.fft.rfft(tone)).argmax()]
            self.assertAlmostEqual(frequency, 440, delta=6)
            all_stems = [sf.read(directory / f'{name}.wav')[0] for name in job['result']['stems']]
            np.testing.assert_allclose(sum(all_stems), sf.read(directory / 'mix.wav')[0], atol=1e-6)
            self.assertLessEqual(job['result']['true_peak_dbtp'], -1)
            self.assertTrue(all(file['frames'] == 8 * 44100 for file in job['result']['files'].values()))
            self.assertEqual(self.client.get(endpoint + '/files/stems.zip').status_code, 409)
            self.assertEqual(self.client.post(endpoint + '/review', json={'accepted': True, 'heard': False,
                'mix_sha256': job['result']['files']['mix']['sha256']}).status_code, 422)
            self.assertEqual(self.client.post(endpoint + '/review', json={'accepted': True, 'heard': True,
                'mix_sha256': job['result']['files']['mix']['sha256']}).status_code, 200)
            self.assertEqual(self.client.get(endpoint + '/files/stems.zip').status_code, 200)
            self.assertFalse(self.client.get(endpoint + '/import-target').json()['ready'])

    def test_unknown_samples_missing_isolated_stems_and_duplicate_parts_fail_before_render(self):
        sample = self.upload().json()
        for changes in [{'sample_id': 'f' * 32}, {'replaces': 'kick'}, {'gain_db': 50},
                        {'notes': [{'beat': 9, 'duration_beats': 1, 'note': 69, 'velocity': 100}]},
                        {'effects': [{'kind': 'external_vst', 'path': '/tmp/plugin'}]}]:
            current = self.current()
            recipe = copy.deepcopy(current['recipe'])
            recipe['segments'][0]['parts'] = [{**self.part(sample['id']), **changes}]
            result = remix_chat.execute('propose_remix_changes', {'expected_version': current['version'],
                'title': current['title'], 'recipe': recipe}, 1, self.session.session_id)
            self.assertEqual(result['status'], 'failed', changes)
            self.assertIsNone(self.current()['draft'])
        self.create.assert_not_awaited()

    def test_added_instrument_preserves_source_and_effects_stay_in_requested_section(self):
        sample = self.upload().json()
        current = self.current()
        recipe = copy.deepcopy(current['recipe'])
        recipe['segments'][0]['parts'] = [self.part(sample['id'], replaces=None,
            effects=[{'kind': 'reverb', 'mix': .2}])]
        recipe['segments'][0]['effects'] = {'drums': [{'kind': 'lowpass', 'frequency_hz': 70}]}
        plan = remix_render.compile_recipe(remix_render.Recipe(**recipe), self.timing, self.names,
                                          remix_assets.catalog(self.source))
        result = remix_render.render(self.source, self.output, plan)
        gain = 10 ** (result['gain_db'] / 20)
        for name in ['bass', 'drums']:
            before = sf.read(self.source / f'{name}.wav')[0]
            after = sf.read(self.output / f'{name}.wav')[0]
            np.testing.assert_allclose(after[180000:190000], before[180000:190000] * gain, atol=2e-7)
        original = sf.read(self.source / 'bass.wav')[0]
        bass = sf.read(self.output / 'bass.wav')[0]
        np.testing.assert_allclose(bass[1000:10000], original[1000:10000] * gain, atol=2e-7)
        self.assertEqual(np.max(np.abs(sf.read(self.output / 'part_bass.wav')[0][4 * 44100:])), 0)

    def test_duplicate_parts_and_unbounded_processing_are_rejected(self):
        sample = self.upload().json()
        recipe = copy.deepcopy(self.current()['recipe'])
        part = self.part(sample['id'])
        recipe['segments'][0]['parts'] = [part, part]
        with self.assertRaisesRegex(ValueError, 'unique layer ID'):
            remix_render.compile_recipe(remix_render.Recipe(**recipe), self.timing, self.names, remix_assets.catalog(self.source))
        recipe['segments'][0]['parts'] = [self.part(sample['id'], effects=[{'kind': 'delay', 'feedback': .99}])]
        with self.assertRaises(ValueError):
            remix_render.Recipe(**recipe)

    def test_every_effect_produces_finite_changed_audio_and_delay_is_tempo_synchronized(self):
        rate = 44100
        impulse = np.zeros((2, rate * 2), dtype='float32')
        impulse[:, 100:200] = .5
        effects = [{'kind': 'reverb'}, {'kind': 'delay', 'beats': 1, 'mix': .5},
                   {'kind': 'eq', 'frequency_hz': 200, 'gain_db': -12},
                   {'kind': 'highpass', 'frequency_hz': 400}, {'kind': 'lowpass', 'frequency_hz': 400},
                   {'kind': 'compressor', 'threshold_db': -30, 'ratio': 6}]
        from pydantic import TypeAdapter
        for effect in effects:
            normalized = TypeAdapter(remix_audio.Effect).validate_python(effect).model_dump()
            output = remix_audio.board([normalized], 120)(impulse, rate)
            self.assertTrue(np.isfinite(output).all())
            self.assertEqual(output.shape, impulse.shape)
            self.assertFalse(np.array_equal(output, impulse), effect)
            if effect['kind'] == 'delay':
                self.assertGreater(np.max(np.abs(output[:, 22100:22300])), .01)
            if effect['kind'] == 'reverb':
                self.assertGreater(np.max(np.abs(output[:, 1000:20000])), .00001)

    def test_sample_tampering_stops_render_and_schema_matches_validation(self):
        sample = self.upload().json()
        path, meta = remix_assets.asset(self.source, sample['id'])
        sf.write(path, np.zeros((44100, 2)), 44100)
        with self.assertRaisesRegex(ValueError, 'changed'):
            remix_assets.asset(self.source, sample['id'], meta['sha256'])
        self.assertIn('title', remix_chat.TOOLS[1]['input_schema']['properties'])
        self.assertNotIn('$ref', str(remix_chat.TOOLS[1]['input_schema']))
