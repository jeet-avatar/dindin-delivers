import asyncio
import json
from pathlib import Path
import tempfile
import subprocess
import unittest
from unittest.mock import AsyncMock, patch

import numpy as np
from scipy.io import wavfile
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

import recordings
import references
import sound_comparison as comparison
from security import _rate_store


def tone(frequency=110, gain=0.2, seconds=3):
    times = np.arange(round(seconds * comparison.RATE)) / comparison.RATE
    audio = gain * np.sin(2 * np.pi * frequency * times)
    return np.column_stack((audio, audio))


class MeasurementTests(unittest.TestCase):
    def test_identical_audio_has_zero_deltas_without_match_claim(self):
        report, a, b = comparison.compare_arrays(tone(), tone())
        self.assertTrue(all(value == 0 for value in report['candidate_minus_reference'].values()))
        self.assertNotIn('similarity', report)
        np.testing.assert_array_equal(a, b)
        self.assertIn('does not prove', report['next_checks'][0])

    def test_gain_changes_level_not_spectral_shape_and_previews_match(self):
        report, a, b = comparison.compare_arrays(tone(), tone(gain=0.05))
        self.assertAlmostEqual(report['candidate_minus_reference']['rms_dbfs'], -12.041, places=2)
        self.assertAlmostEqual(report['candidate_minus_reference']['spectral_centroid_hz'], 0, places=2)
        self.assertAlmostEqual(float(np.sqrt(np.mean(a*a))), float(np.sqrt(np.mean(b*b))), places=5)
        self.assertTrue(all(gain <= 0 for gain in report['preview_gain_db'].values()))
        self.assertLess(np.max(np.abs(a)), 10 ** (-3 / 20) + 0.001)

    def test_frequency_and_phase_are_measured_without_mono_cancellation(self):
        stereo = tone(880)
        stereo[:, 1] *= -1
        report, _, _ = comparison.compare_arrays(tone(), stereo)
        self.assertGreater(report['candidate_minus_reference']['spectral_centroid_hz'], 700)
        self.assertEqual(report['candidate']['side_energy_percent'], 100)
        self.assertEqual(report['reference']['side_energy_percent'], 0)

    def test_silence_clipping_short_and_nonfinite_fail(self):
        for samples in (tone(gain=0), tone(gain=0.0001), tone(gain=1.1), tone(seconds=1), tone() * np.nan):
            with self.subTest(samples=samples.shape), self.assertRaises(ValueError):
                comparison.compare_arrays(tone(), samples)

    def test_validation_rejects_paths_nan_and_excessive_duration(self):
        for kwargs in ({'recording_id': '../secret'}, {'duration_seconds': 17},
                       {'reference_start_seconds': float('nan')}, {'layer': '../mix'}, {'extra': True}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                comparison.ComparisonRequest.model_validate({'recording_id': 'b'*32, **kwargs})

    def test_real_ffmpeg_worker_creates_playable_bounded_previews(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            wavfile.write(root / 'a.wav', comparison.RATE, tone().astype('float32'))
            wavfile.write(root / 'b.wav', comparison.RATE, tone(220).astype('float32'))
            request = comparison.ComparisonRequest(recording_id='b'*32, duration_seconds=2)
            result = asyncio.run(comparison.run(root/'a.wav', root/'b.wav', root, request))
            self.assertEqual(result['duration_seconds'], 2)
            self.assertEqual(len(result['excerpt_pcm_sha256']['reference']), 64)
            for side in ('reference', 'candidate'):
                rate, samples = wavfile.read(root / f'{side}.wav')
                self.assertEqual((rate, samples.shape), (44100, (88200, 2)))
                self.assertGreater(np.max(np.abs(samples)), 100)
            request.reference_start_seconds = 2
            with self.assertRaises(HTTPException) as error:
                asyncio.run(comparison.run(root/'a.wav', root/'b.wav', root, request))
            self.assertEqual(error.exception.status_code, 422)
            self.assertIn('extends past', error.exception.detail)


def user(x_user: str | None = Header(default=None)):
    if not x_user:
        raise HTTPException(401)
    return {'id': int(x_user)}


class ComparisonApiTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.reference_id, self.recording_id = 'a'*32, 'b'*32
        self.directory = self.root / self.reference_id
        self.directory.mkdir()
        self.recordings = self.root / 'recordings'
        self.recordings.mkdir()
        for module, value in ((references, self.root), (recordings, self.recordings)):
            patcher = patch.object(module, 'ROOT', value)
            patcher.start()
            self.addCleanup(patcher.stop)
        references.COMPARING.clear()
        _rate_store.clear()
        references.write_json(self.directory/'meta.json', {'id': self.reference_id, 'name': 'reference.wav',
            'user_id': 1, 'status': 'ready', 'created_at': '2026-09-26'})
        references.write_json(self.directory/'report.json', {'stems': [], 'duration_seconds': 10})
        references.write_json(self.recordings/f'{self.recording_id}.json',
                              {'id': self.recording_id, 'user_id': 1, 'track_name': 'Bass audition', 'decision': 'accepted'})
        (self.directory/'bass.wav').write_bytes(b'reference')
        (self.recordings/f'{self.recording_id}.m4a').write_bytes(b'candidate')
        app = FastAPI()
        app.include_router(references.router_for(user, user))
        self.client = TestClient(app)
        self.url = f'/api/references/{self.reference_id}/comparisons'
        self.payload = {'recording_id': self.recording_id, 'duration_seconds': 2}
        self.headers = {'x-user': '1'}
        self.mock = patch.object(comparison, 'run', AsyncMock(side_effect=self.fake_run))
        self.real_run = comparison.run
        self.worker = self.mock.start()
        self.addCleanup(self.mock.stop)
        capability = patch.object(comparison, 'capability', return_value={'available': True, 'reason': None})
        capability.start()
        self.addCleanup(capability.stop)

    async def fake_run(self, source, candidate, directory, request):
        (directory/'reference.wav').write_bytes(b'preview-a')
        (directory/'candidate.wav').write_bytes(b'preview-b')
        return comparison.compare_arrays(tone(), tone())[0]

    def create(self):
        result = self.client.post(self.url, json=self.payload, headers=self.headers)
        self.assertEqual(result.status_code, 201, result.text)
        return result.json()

    def test_owner_auth_and_recording_ownership(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.assertEqual(self.client.post(self.url, json=self.payload, headers={'x-user': '2'}).status_code, 404)
        foreign = self.recordings / f'{self.recording_id}.json'
        metadata = json.loads(foreign.read_text())
        metadata['user_id'] = 2
        foreign.write_text(json.dumps(metadata))
        self.assertEqual(self.client.post(self.url, json=self.payload, headers=self.headers).status_code, 404)
        self.worker.assert_not_awaited()

    def test_subscription_is_required_to_generate(self):
        def unsubscribed():
            raise HTTPException(403, 'Subscription required')
        app = FastAPI()
        app.include_router(references.router_for(user, unsubscribed))
        client = TestClient(app)
        self.assertEqual(client.get(self.url, headers=self.headers).status_code, 200)
        self.assertEqual(client.post(self.url, json=self.payload, headers=self.headers).status_code, 403)
        self.worker.assert_not_awaited()

    def test_real_m4a_recording_through_api_worker_and_audio_route(self):
        wavfile.write(self.directory/'bass.wav', comparison.RATE, tone().astype('float32'))
        source = self.root/'audition.wav'
        wavfile.write(source, comparison.RATE, tone(220, gain=0.1).astype('float32'))
        subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(source), '-c:a', 'aac',
                        str(self.recordings/f'{self.recording_id}.m4a')], check=True, capture_output=True)
        with patch.object(comparison, 'run', self.real_run):
            result = self.create()
        response = self.client.get(self.url+f"/{result['id']}/audio/candidate", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content[:4], b'RIFF')
        self.assertGreater(result['candidate_minus_reference']['spectral_centroid_hz'], 100)
        self.assertEqual(recordings.owned_recording(self.recording_id, 1)['decision'], 'accepted')

    def test_worker_deadline_kills_process_group(self):
        child = AsyncMock()
        child.pid = 987654
        child.returncode = None
        child.communicate.side_effect = asyncio.TimeoutError
        with patch.object(comparison.asyncio, 'create_subprocess_exec', AsyncMock(return_value=child)), \
             patch.object(comparison.os, 'killpg') as kill:
            with self.assertRaises(HTTPException) as error:
                asyncio.run(self.real_run(self.directory/'bass.wav', self.recordings/f'{self.recording_id}.m4a',
                                          self.directory, comparison.ComparisonRequest(**self.payload)))
            self.assertEqual(error.exception.status_code, 504)
            kill.assert_called_once()
            child.wait.assert_awaited_once()

    def test_saved_history_private_audio_context_and_decision_unchanged(self):
        result = self.create()
        history = self.client.get(self.url, headers=self.headers).json()['comparisons']
        self.assertEqual(history[0]['id'], result['id'])
        for side, content in (('reference', b'preview-a'), ('candidate', b'preview-b')):
            url = self.url + f"/{result['id']}/audio/{side}"
            response = self.client.get(url, headers=self.headers)
            self.assertEqual(response.content, content)
            self.assertIn('no-store', response.headers['cache-control'])
            self.assertEqual(self.client.get(url, headers={'x-user': '2'}).status_code, 404)
        self.assertEqual(recordings.owned_recording(self.recording_id, 1)['decision'], 'accepted')
        context = references.reference_context(self.reference_id, 1)
        self.assertIn('SAVED SOUND COMPARISONS', context)
        self.assertIn(self.recording_id, context)
        self.assertIn('never accept it automatically', context)
        self.assertFalse(references.COMPARING)
        self.assertFalse(list((self.directory/'comparisons').glob('*.pending')))

    def test_missing_audio_invalid_side_and_id(self):
        result = self.create()
        self.assertEqual(self.client.get(self.url+f"/{result['id']}/audio/report", headers=self.headers).status_code, 404)
        self.assertEqual(self.client.get(self.url+'/invalid/audio/reference', headers=self.headers).status_code, 404)
        (self.directory/'bass.wav').unlink()
        self.assertEqual(self.client.post(self.url, json=self.payload, headers=self.headers).status_code, 404)

    def test_busy_blocks_comparison_reference_delete_and_refresh(self):
        references.COMPARING.add(self.reference_id)
        try:
            self.assertEqual(self.client.post(self.url, json=self.payload, headers=self.headers).status_code, 409)
            self.assertEqual(self.client.delete(f'/api/references/{self.reference_id}', headers=self.headers).status_code, 409)
            self.assertEqual(self.client.post(f'/api/references/{self.reference_id}/refresh-analysis', headers=self.headers).status_code, 409)
        finally:
            references.COMPARING.clear()
        self.worker.assert_not_awaited()

    def test_worker_failure_does_not_publish_and_releases_busy_state(self):
        self.worker.side_effect = HTTPException(422, 'Silent excerpt')
        response = self.client.post(self.url, json=self.payload, headers=self.headers)
        self.assertEqual(response.status_code, 422)
        self.assertFalse(references.COMPARING)
        self.assertEqual(references.saved_comparisons(self.directory), [])
        self.assertFalse(list((self.directory/'comparisons').iterdir()))

    def test_delete_removes_only_comparison(self):
        result = self.create()
        url = self.url + '/' + result['id']
        self.assertEqual(self.client.delete(url, headers={'x-user': '2'}).status_code, 404)
        self.assertEqual(self.client.delete(url, headers=self.headers).status_code, 200)
        self.assertTrue((self.directory/'bass.wav').exists())
        self.assertTrue((self.recordings/f'{self.recording_id}.m4a').exists())
        self.assertEqual(references.saved_comparisons(self.directory), [])

    def test_pending_files_are_not_exposed(self):
        path = self.directory / 'comparisons' / ('c'*32 + '.pending')
        path.mkdir(parents=True)
        references.write_json(path/'report.json', {'created_at': '2026-09-26'})
        self.assertEqual(references.saved_comparisons(self.directory), [])


if __name__ == '__main__':
    unittest.main()
