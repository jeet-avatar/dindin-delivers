import json
import time
import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI, Header
from fastapi.testclient import TestClient

import billing
import references
import reference_timing
import remix_jobs
import remix_render
import test_remix_render
from beatmind_auth import create_stem_download_token
import reference_imports


async def user(x_user: str = Header('1')):
    return {'id': int(x_user)}


class RemixJobTests(unittest.TestCase):
    def setUp(self):
        test_remix_render.RemixRenderTests.setUp(self)
        self.id = 'a' * 32
        target = self.root / self.id
        self.source.rename(target)
        self.source = target
        for patcher in [patch.object(references, 'ROOT', self.root), patch.object(billing, 'require_reference_access')]:
            patcher.start()
            self.addCleanup(patcher.stop)
        references.write_json(target / 'meta.json', {'id': self.id, 'user_id': 1, 'status': 'ready',
            'name': 'Synthetic fixture.wav', 'created_at': '2026-10-13'})
        references.write_json(target / 'report.json', {'duration_seconds': 8, 'tempo': {'bpm': 120},
            'stems': [{'name': name} for name in self.names]})
        self.timing['analysis_id'] = reference_timing.fingerprint(target)
        references.write_json(target / 'timing.json', self.timing)
        self.request = {'request_id': uuid.uuid4().hex, 'title': 'Synthetic remix',
            'source_use': {'rights_confirmed': True, 'intended_use': 'private'},
            'recipe': {'analysis_id': self.timing['analysis_id'], 'timing_revision': 1, 'target_bpm': 120,
                       'segments': [{'section': i, 'levels': {'drums': 0, 'bass': -6}} for i in [1, 0]]}}
        self.create = AsyncMock(return_value={'sessionId': 'remix_test', 'referenceId': self.id,
            'project': {'title': 'Synthetic remix', 'mode': 'remix'}})
        app = FastAPI()
        app.include_router(remix_jobs.router_for(user, self.create))
        self.client = TestClient(app)
        self.base = f'/api/references/{self.id}/automatic-remixes'

    def test_real_worker_preview_then_hash_bound_approval_and_download(self):
        before = remix_render.digest(self.source / 'bass.wav')
        with self.client as client:
            setup = client.get(self.base).json()
            self.assertTrue(setup['available'])
            response = client.post(self.base, json=self.request)
            self.assertEqual(response.status_code, 202, response.text)
            endpoint = self.base + '/' + response.json()['id']
            retry = client.post(self.base, json=self.request)
            self.assertEqual(retry.json()['id'], response.json()['id'])
            # Real subprocess startup and FFmpeg also run on shared CI workers.
            deadline = time.monotonic() + 120
            result = client.get(endpoint).json()
            while result['status'] == 'rendering' and time.monotonic() < deadline:
                time.sleep(.1)
                result = client.get(endpoint).json()
            self.assertEqual(result['status'], 'ready', result)
            self.assertEqual(client.get(endpoint, headers={'x-user': '2'}).status_code, 404)
            self.assertEqual(client.get(endpoint + '/files/mix.wav').status_code, 200)
            self.assertEqual(client.get(endpoint + '/files/stems.zip').status_code, 409)
            review = {'mix_sha256': result['result']['files']['mix']['sha256'], 'accepted': True, 'heard': False}
            self.assertEqual(client.post(endpoint + '/review', json=review).status_code, 422)
            self.assertEqual(client.post(endpoint + '/review', json={**review, 'heard': True, 'mix_sha256': '0' * 64}).status_code, 409)
            approved = client.post(endpoint + '/review', json={**review, 'heard': True})
            self.assertEqual(approved.json()['review'], 'accepted', approved.text)
            self.assertEqual(client.get(endpoint + '/files/stems.zip').status_code, 200)
            self.assertEqual(client.get(self.base).json()['jobs'][0]['review'], 'accepted')
            self.assertEqual(client.post(self.base, json={**self.request, 'title': 'changed'}).status_code, 409)
        self.assertEqual(self.create.await_count, 1)
        self.assertEqual(remix_render.digest(self.source / 'bass.wav'), before)

    def test_permission_local_audio_and_stale_timing_reject_before_song_creation(self):
        with self.client as client:
            self.assertEqual(client.post(self.base, json={**self.request,
                'source_use': {'rights_confirmed': False, 'intended_use': 'private'}}).status_code, 400)
            self.assertEqual(client.post(self.base, headers={'x-user': '2'}, json=self.request).status_code, 404)
            request = {**self.request, 'recipe': {**self.request['recipe'], 'timing_revision': 9}}
            self.assertEqual(client.post(self.base, json=request).status_code, 422)
            meta = json.loads((self.source / 'meta.json').read_text())
            references.write_json(self.source / 'meta.json', {**meta, 'storage': 'local'})
            self.assertFalse(client.get(self.base).json()['available'])
            self.assertEqual(client.post(self.base, json=self.request).status_code, 409)
        self.create.assert_not_awaited()

    def test_orphaned_render_is_interrupted_and_not_restarted_by_poll_or_retry(self):
        directory = remix_jobs.job_directory(self.source, self.request['request_id'])
        directory.mkdir(parents=True)
        remix_jobs.save(directory / 'job.json', {'id': self.request['request_id'], 'title': 'Interrupted',
            'request': remix_jobs.RenderRequest(**self.request).model_dump(), 'status': 'rendering', 'stage': 'Rendering', 'created_at': '2026-10-13'})
        with self.client as client:
            self.assertEqual(client.get(self.base).json()['jobs'][0]['status'], 'interrupted')
            retry = client.post(self.base, json=self.request)
            self.assertEqual(retry.json()['status'], 'interrupted')
        self.create.assert_not_awaited()

    def ready_preview(self, review='accepted'):
        import shutil
        target = remix_jobs.job_directory(self.source, self.request['request_id'])
        target.mkdir(parents=True)
        for name in ['bass', 'mix']:
            shutil.copyfile(self.source / 'bass.wav', target / (name + '.wav'))
        identity = remix_render.digest(target / 'mix.wav')
        data = {'id': self.request['request_id'], 'title': 'Approved fixture',
                'request': remix_jobs.RenderRequest(**self.request).model_dump(), 'status': 'ready',
                'stage': 'Ready', 'review': review, 'created_at': '2026-10-13',
                'result': {'target_bpm': 120, 'numerator': 4, 'denominator': 4,
                           'frames': 8 * 44100, 'sample_rate': 44100, 'stems': ['bass'],
                           'files': {name: {'sha256': identity, 'bytes': (target / 'mix.wav').stat().st_size}
                                     for name in ['mix', 'bass']}}}
        remix_jobs.save(target / 'job.json', data)
        return target, self.base + '/' + data['id'], {'set_id': 'b' * 32, 'mix_sha256': identity}

    def import_client(self, response):
        bridge = SimpleNamespace(local_operation=AsyncMock(return_value=response))
        app = FastAPI()
        app.include_router(remix_jobs.router_for(user, self.create, lambda *_: bridge))
        return TestClient(app), bridge

    def wait_placement(self, client, endpoint):
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            result = client.get(endpoint).json()['placement']
            if result['status'] != 'importing':
                return result
            time.sleep(.01)
        self.fail('Placement did not reach a terminal status')

    def test_import_requires_approval_capability_and_unchanged_empty_destination(self):
        target, endpoint, intent = self.ready_preview(review='pending')
        with self.client as client:
            self.assertEqual(client.get(endpoint + '/import-target').status_code, 409)
            self.assertEqual(client.post(endpoint + '/import', json=intent).status_code, 409)
            data = remix_jobs.read(target)
            remix_jobs.save(target / 'job.json', {**data, 'review': 'accepted'})
            self.assertFalse(client.get(endpoint + '/import-target').json()['ready'])
            self.assertEqual(client.post(endpoint + '/import', json=intent).status_code, 409)
        client, bridge = self.import_client({})
        for state in [{'ready': False, 'reason': 'Existing music'}, {'ready': True, 'set_id': 'c' * 32}]:
            with client, patch.object(remix_jobs.arrangement_plan, 'exchange', AsyncMock(return_value=state)):
                self.assertEqual(client.post(endpoint + '/import', json=intent).status_code, 409)
        bridge.local_operation.assert_not_awaited()
        self.assertEqual(reference_imports.status(target)['status'], 'idle')

    def test_verified_import_is_durable_and_not_replayed(self):
        target, endpoint, intent = self.ready_preview()
        client, bridge = self.import_client({'status': 'verified', 'set_id': intent['set_id']})
        with client, patch.object(remix_jobs.arrangement_plan, 'exchange', AsyncMock(return_value={
                'ready': True, 'set_id': intent['set_id']})):
            self.assertEqual(client.post(endpoint + '/import', json=intent).status_code, 202)
            self.assertEqual(self.wait_placement(client, endpoint)['status'], 'verified')
            for retry in [False, True]:
                self.assertEqual(client.post(endpoint + '/import', json={**intent, 'retry': retry}).json()['status'], 'verified')
            self.assertEqual(client.post(endpoint + '/import', json={**intent, 'set_id': 'c' * 32}).status_code, 409)
            self.assertEqual(client.get(endpoint, headers={'x-user': '2'}).status_code, 404)
            review = client.post(endpoint + '/review', json={'mix_sha256': intent['mix_sha256'], 'accepted': True, 'heard': True})
            self.assertEqual(review.json()['placement']['status'], 'verified')
        self.assertEqual(bridge.local_operation.await_count, 1)
        self.assertEqual(reference_imports.status(target)['status'], 'verified')
        sent = bridge.local_operation.call_args.args[1]
        self.assertEqual(sent['files']['bass']['sha256'], intent['mix_sha256'])

    def test_only_confirmed_no_write_failure_can_be_retried(self):
        _, endpoint, intent = self.ready_preview()
        client, bridge = self.import_client({'status': 'failed', 'changes_started': False})
        with client, patch.object(remix_jobs.arrangement_plan, 'exchange', AsyncMock(return_value={
                'ready': True, 'set_id': intent['set_id']})):
            client.post(endpoint + '/import', json=intent)
            self.assertEqual(self.wait_placement(client, endpoint)['status'], 'failed')
            client.post(endpoint + '/import', json=intent)
            self.assertEqual(bridge.local_operation.await_count, 1)
            bridge.local_operation.side_effect = TimeoutError('Response lost')
            client.post(endpoint + '/import', json={**intent, 'retry': True})
            self.assertEqual(self.wait_placement(client, endpoint)['status'], 'needs_inspection')
            client.post(endpoint + '/import', json={**intent, 'retry': True})
            self.assertEqual(bridge.local_operation.await_count, 2)

    def test_download_token_is_bound_to_owner_job_and_unchanged_file(self):
        target, endpoint, _ = self.ready_preview()
        route = endpoint + '/stem-download/bass'
        with self.client as client:
            for token in ['', create_stem_download_token(1, 'c' * 32)]:
                self.assertEqual(client.get(route, params={'token': token}).status_code, 401)
            self.assertEqual(client.get(route, params={'token': create_stem_download_token(2, self.request['request_id'])}).status_code, 404)
            token = create_stem_download_token(1, self.request['request_id'])
            self.assertEqual(client.get(route, params={'token': token}).status_code, 200)
            (target / 'bass.wav').unlink()
            self.assertEqual(client.get(route, params={'token': token}).status_code, 409)
