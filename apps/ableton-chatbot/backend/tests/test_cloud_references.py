import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

import cloud_job
import cloud_separation
import references
import test_references
from security import DoSProtectionMiddleware

USER = {'x-user': '1'}
DETAILED = ['drums', 'bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals']
REPORT = {'stems': [{'name': n} for n in DETAILED], 'duration_seconds': 40.0, 'tempo': {'bpm': 123},
          'stem_health': {'checks_passed': True, 'stems': {}}, 'key_candidates': []}


class FakeCloud:
    """Stands in for S3 and AWS Batch."""

    def __init__(self):
        self.uploaded, self.jobs, self.deleted, self.cancelled = {}, {}, [], []

    def upload_form(self, reference_id, suffix, max_bytes):
        return {'url': 'https://bucket.s3.amazonaws.com/', 'fields': {'key': f'{reference_id}/source{suffix}', 'max': str(max_bytes)}}

    def uploaded_bytes(self, reference_id, suffix):
        return self.uploaded.get(reference_id)

    def submit(self, reference_id, suffix):
        self.jobs[reference_id] = ['RUNNABLE', '']
        return 'job-' + reference_id

    def job_state(self, job_id):
        return tuple(self.jobs[job_id.removeprefix('job-')])

    def failure_message(self, reference_id, reason):
        return 'Reference must be between 5 seconds and 10 minutes.'

    def import_results(self, reference_id, directory):
        (Path(directory) / 'report.json').write_text(json.dumps(REPORT))
        for name in ('mix', *DETAILED):
            (Path(directory) / f'{name}.wav').write_bytes(name.encode())
        return DETAILED

    def delete_objects(self, reference_id):
        self.deleted.append(reference_id)

    def cancel(self, job_id):
        self.cancelled.append(job_id)


class CloudReferenceTests(unittest.TestCase):
    seed = test_references.ReferenceTests.seed

    def setUp(self):
        test_references.ReferenceTests.setUp(self)
        self.cloud = FakeCloud()
        for name in ('upload_form', 'uploaded_bytes', 'submit', 'job_state', 'failure_message',
                     'import_results', 'delete_objects', 'cancel'):
            patcher = patch.object(cloud_separation, name, getattr(self.cloud, name))
            patcher.start()
            self.addCleanup(patcher.stop)
        available = patch.object(cloud_separation, 'available', return_value=True)
        available.start()
        self.addCleanup(available.stop)
        references._cloud_checked.clear()
        app = FastAPI()
        app.include_router(references.router_for(test_references.user, test_references.user))
        app.add_middleware(DoSProtectionMiddleware)
        self.client = TestClient(app)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)

    def create(self, **body):
        return self.client.post('/api/references/cloud', json={'name': 'Track.mp3', 'bytes': 1000, 'rights': True, **body}, headers=USER)

    def item(self, reference_id):
        return next(i for i in self.client.get('/api/references', headers=USER).json()['references'] if i['id'] == reference_id)

    def test_upload_form_needs_rights_a_supported_file_and_the_size_limit(self):
        self.assertEqual(self.create(rights=False).status_code, 400)
        self.assertEqual(self.create(name='notes.txt').status_code, 400)
        self.assertEqual(self.create(bytes=references.MAX_BYTES + 1).status_code, 413)
        response = self.create()
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body['reference']['status'], 'awaiting_upload')
        self.assertEqual(body['upload']['fields']['max'], str(references.MAX_BYTES))
        self.assertTrue(self.client.get('/api/references', headers=USER).json()['cloud_separation']['available'])

    def test_unavailable_cloud_is_reported(self):
        with patch.object(cloud_separation, 'available', return_value=False):
            self.assertEqual(self.create().status_code, 503)

    def test_job_starts_only_after_the_file_reaches_s3(self):
        reference_id = self.create().json()['reference']['id']
        start = f'/api/references/{reference_id}/cloud-start'
        self.assertEqual(self.client.post(start, headers=USER).status_code, 409)
        self.cloud.uploaded[reference_id] = 1000
        response = self.client.post(start, headers=USER)
        self.assertEqual((response.status_code, response.json()['status']), (200, 'processing'))
        self.assertEqual(self.client.post(start, headers=USER).status_code, 409, 'no second job')
        self.assertEqual(self.client.post(start, headers={'x-user': '2'}).status_code, 404)

    def started(self):
        reference_id = self.create().json()['reference']['id']
        self.cloud.uploaded[reference_id] = 1000
        self.client.post(f'/api/references/{reference_id}/cloud-start', headers=USER)
        return reference_id

    def advance(self, reference_id, status):
        self.cloud.jobs[reference_id] = [status, '']
        references._cloud_checked.clear()
        return self.item(reference_id)

    def test_gpu_stages_then_background_import_of_detailed_stems(self):
        reference_id = self.started()
        self.assertIn('Starting a BeatMind GPU', self.advance(reference_id, 'RUNNABLE')['stage'])
        self.assertIn('Separating on a BeatMind GPU', self.advance(reference_id, 'RUNNING')['stage'])
        self.advance(reference_id, 'SUCCEEDED')
        for _ in range(200):
            item = self.item(reference_id)
            if item['status'] == 'ready':
                break
            time.sleep(0.01)
        self.assertEqual(item['status'], 'ready')
        self.assertEqual([s['name'] for s in item['report']['stems']], DETAILED)
        self.assertEqual(self.client.get(f'/api/references/{reference_id}/audio/kick', headers=USER).content, b'kick')

    def test_status_checks_are_throttled(self):
        reference_id = self.started()
        calls = []
        with patch.object(cloud_separation, 'job_state', lambda job: calls.append(job) or ('RUNNING', '')):
            for _ in range(5):
                self.item(reference_id)
        self.assertEqual(len(calls), 1)

    def test_failed_job_shows_its_reason(self):
        reference_id = self.started()
        item = self.advance(reference_id, 'FAILED')
        self.assertEqual((item['status'], item['error']), ('failed', 'Reference must be between 5 seconds and 10 minutes.'))

    def test_delete_stops_the_job_and_removes_cloud_files(self):
        reference_id = self.started()
        self.assertEqual(self.client.delete('/api/references/' + reference_id, headers=USER).status_code, 200)
        self.assertEqual((self.cloud.cancelled, self.cloud.deleted), (['job-' + reference_id], [reference_id]))

    def test_restart_keeps_cloud_jobs_and_retries_imports(self):
        reference_id = self.started()
        meta = self.root / reference_id / 'meta.json'
        references.write_json(meta, {**json.loads(meta.read_text()), 'status': 'importing'})
        references._recover_interrupted()
        self.assertEqual(json.loads(meta.read_text())['status'], 'processing')


class CloudJobTests(unittest.TestCase):
    def test_job_uploads_every_stem_and_report_then_marks_ready(self):
        class S3:
            def __init__(self):
                self.objects = {}

            def download_file(self, bucket, key, path):
                Path(path).write_bytes(b'source')

            def upload_file(self, path, bucket, key, ExtraArgs=None):
                self.objects[key] = Path(path).read_bytes()

            def put_object(self, Bucket, Key, Body, ContentType):
                self.objects[Key] = Body

        def analyze(directory):
            assert json.loads((directory / 'meta.json').read_text())['source_file'] == 'source.mp3'
            (directory / 'separation.json').write_text(json.dumps({'stems': DETAILED}))
            (directory / 'report.json').write_text(json.dumps(REPORT))
            for name in ('mix', *DETAILED):
                (directory / f'{name}.wav').write_bytes(name.encode())
        s3 = S3()
        with patch.object(cloud_job.reference_worker, 'analyze', analyze):
            cloud_job.run('bucket', 'r' * 32, 'r' * 32 + '/source.mp3', s3)
        prefix = 'r' * 32 + '/'
        self.assertEqual(json.loads(s3.objects[prefix + 'status.json']), {'status': 'ready', 'stems': DETAILED})
        for name in ('mix', *DETAILED):
            self.assertEqual(s3.objects[f'{prefix}out/{name}.wav'], name.encode())
        self.assertIn(prefix + 'out/report.json', s3.objects)

    def test_job_records_a_readable_failure(self):
        written = {}

        class S3:
            def download_file(self, bucket, key, path):
                Path(path).write_bytes(b'source')

            def put_object(self, Bucket, Key, Body, ContentType):
                written[Key] = json.loads(Body)

        def analyze(directory):
            raise ValueError('Reference must be between 5 seconds and 10 minutes.')
        with patch.object(cloud_job.reference_worker, 'analyze', analyze), self.assertRaises(ValueError):
            cloud_job.run('bucket', 'r' * 32, 'r' * 32 + '/source.wav', S3())
        self.assertEqual(written['r' * 32 + '/status.json']['error'], 'Reference must be between 5 seconds and 10 minutes.')


if __name__ == '__main__':
    unittest.main()
