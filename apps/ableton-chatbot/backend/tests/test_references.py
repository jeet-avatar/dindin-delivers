import asyncio
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, AsyncMock

from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

import references
from reference_worker import has_tonal_evidence
from security import DoSProtectionMiddleware, _rate_store


def user(x_user: str | None = Header(default=None)):
    if not x_user:
        raise HTTPException(401)
    return {'id': int(x_user)}


class ReferenceTests(unittest.TestCase):
    def test_listening_consent_owner_persistence_and_busy_delete(self):
        self.seed()
        path = '/api/references/' + self.id
        payload = {'intent': 'Borrow the groove', 'consent': True}
        self.assertEqual(self.client.post(path + '/listen', json=payload, headers={'x-user': '2'}).status_code, 404)
        self.assertEqual(self.client.post(path + '/listen', json={**payload, 'consent': False}, headers={'x-user': '1'}).status_code, 400)
        result = {'notes': 'Sparse percussion', 'start_seconds': 0, 'end_seconds': 10, 'model': 'test'}
        with patch.object(references.audio_listener, 'capability', return_value={'available': True}), \
             patch.object(references.audio_listener, 'listen', AsyncMock(return_value=result)) as listen:
            response = self.client.post(path + '/listen', json=payload, headers={'x-user': '1'})
            self.assertEqual(response.status_code, 200)
            listen.assert_awaited_once()
        self.assertIn('AUDIO MODEL IMPRESSIONS', references.reference_context(self.id, 1))
        self.assertFalse(references.LISTENING)
        references.LISTENING.add(self.id)
        try:
            self.assertEqual(self.client.delete(path, headers={'x-user': '1'}).status_code, 409)
        finally:
            references.LISTENING.clear()

    def test_percussion_only_does_not_imply_a_key(self):
        self.assertFalse(has_tonal_evidence([{'name': 'drums', 'rms_dbfs': -20},
                                            {'name': 'bass', 'rms_dbfs': -60},
                                            {'name': 'other', 'rms_dbfs': -60}]))
        self.assertTrue(has_tonal_evidence([{'name': 'drums', 'rms_dbfs': -20},
                                           {'name': 'bass', 'rms_dbfs': -22}]))

    def test_browser_upload_and_delete_preflight(self):
        import main
        client = TestClient(main.app)
        origin = main.ALLOWED_ORIGINS[0]
        for method in ('POST', 'DELETE'):
            response = client.options('/api/references', headers={
                'Origin': origin, 'Access-Control-Request-Method': method,
                'Access-Control-Request-Headers': 'authorization,content-type,x-reference-name,x-rights-confirmed'})
            self.assertEqual(response.status_code, 200)

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.patch = patch.object(references, 'ROOT', self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        _rate_store.clear()
        references.ACTIVE = asyncio.Lock()
        app = FastAPI()
        app.include_router(references.router_for(user, user))
        app.add_middleware(DoSProtectionMiddleware)
        self.client = TestClient(app)
        self.id = 'a' * 32

    def seed(self, status='ready'):
        directory = self.root / self.id
        directory.mkdir()
        references.write_json(directory / 'meta.json', {'id': self.id, 'name': 'Reference.wav',
                              'user_id': 1, 'status': status, 'created_at': '2026-09-25'})
        references.write_json(directory / 'report.json', {'stems': [], 'tempo': {'bpm': 124}, 'duration_seconds': 10})
        (directory / 'mix.wav').write_bytes(b'audio')
        return directory

    def test_private_listing_audio_and_delete(self):
        self.seed()
        self.assertEqual(self.client.get('/api/references').status_code, 401)
        self.assertEqual(self.client.get('/api/references', headers={'x-user': '2'}).json()['references'], [])
        path = '/api/references/' + self.id
        self.assertEqual(self.client.get(path + '/audio/mix', headers={'x-user': '2'}).status_code, 404)
        response = self.client.get(path + '/audio/mix', headers={'x-user': '1'})
        self.assertEqual(response.content, b'audio')
        self.assertIn('no-store', response.headers['cache-control'])
        self.assertEqual(self.client.get(path + '/audio/worker.log', headers={'x-user': '1'}).status_code, 404)
        self.assertEqual(self.client.delete(path, headers={'x-user': '2'}).status_code, 404)
        self.assertEqual(self.client.delete(path, headers={'x-user': '1'}).status_code, 200)
        self.assertFalse((self.root / self.id).exists())

    def test_processing_is_not_ready_or_deletable(self):
        self.seed('processing')
        with self.assertRaises(HTTPException) as error:
            references.reference_context(self.id, 1)
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(self.client.delete('/api/references/' + self.id, headers={'x-user': '1'}).status_code, 409)
        references.recover_interrupted()
        self.assertEqual(references.owned(self.id, 1)[1]['status'], 'failed')

    def test_reference_context_is_owner_scoped_and_cautious(self):
        self.seed()
        with self.assertRaises(HTTPException):
            references.reference_context(self.id, 2)
        note = references.reference_context(self.id, 1)
        self.assertIn('Do not change Ableton until the user approves a plan', note)
        self.assertIn('Stem separation is approximate', note)
        with self.assertRaises(HTTPException):
            references.owned('../anything', 1)

    def test_upload_requires_available_worker_rights_and_audio_extension(self):
        headers = {'x-user': '1', 'x-reference-name': 'test.wav'}
        with patch.object(references, 'capability', return_value={'available': False, 'reason': 'Disabled'}):
            self.assertEqual(self.client.post('/api/references', headers=headers, content=b'test').status_code, 503)
        with patch.object(references, 'capability', return_value={'available': True}):
            self.assertEqual(self.client.post('/api/references', headers=headers, content=b'test').status_code, 400)
            headers.update({'x-rights-confirmed': 'true', 'x-reference-name': 'test.exe'})
            self.assertEqual(self.client.post('/api/references', headers=headers, content=b'test').status_code, 400)

    def test_upload_stream_limit_and_empty_upload_cleanup(self):
        headers = {'x-user': '1', 'x-reference-name': 'test.wav', 'x-rights-confirmed': 'true'}
        with patch.object(references, 'capability', return_value={'available': True}), patch.object(references, 'MAX_BYTES', 4):
            self.assertEqual(self.client.post('/api/references', headers=headers, content=b'12345').status_code, 413)
            self.assertFalse([p for p in self.root.iterdir() if p.name != '.operations.lock'])
            self.assertFalse(references.ACTIVE.locked())
            self.assertEqual(self.client.post('/api/references', headers=headers, content=b'').status_code, 400)
            self.assertFalse([p for p in self.root.iterdir() if p.name != '.operations.lock'])
            self.assertFalse(references.ACTIVE.locked())

    def test_reference_body_limit_does_not_relax_chat_limit(self):
        self.assertEqual(self.client.post('/api/chat', content=b'x' * 65537).status_code, 413)
        self.assertEqual(self.client.post('/api/references', headers={'content-length': str(51*1024*1024)}).status_code, 413)


if __name__ == '__main__':
    unittest.main()
