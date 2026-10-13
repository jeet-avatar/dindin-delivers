import asyncio
import json
import time
import unittest
import uuid

from fastapi import FastAPI
from fastapi.testclient import TestClient

import references
import reference_imports
import test_references

SOURCE_USE = {'rights_confirmed': True, 'intended_use': 'private'}


class FakeBridge:
    def __init__(self, result):
        self.result = result
        self.calls = []
        self.payloads = []
        self.capabilities = {'selected_stem_import_v1'}

    async def local_operation(self, operation, payload, timeout=55):
        self.calls.append((operation, timeout))
        self.payloads.append(payload)
        if operation == 'live_set':
            return {'status': 'observed', 'title': 'Untitled'}
        await asyncio.sleep(0.2)
        return self.result


class ImportToAbletonTests(unittest.TestCase):
    setUp = test_references.ReferenceTests.setUp
    seed = test_references.ReferenceTests.seed

    def run_import(self, bridge):
        self.seed()
        app = FastAPI()
        app.include_router(references.router_for(test_references.user, test_references.user,
                                                 bridge_for=lambda user_id, capability: bridge))
        path = '/api/references/' + self.id
        with TestClient(app) as client:
            started = client.post(path + '/import-to-ableton', headers={'x-user': '1'}, json={'source_use': SOURCE_USE})
            self.assertEqual(started.status_code, 202)
            self.assertEqual(started.json()['status'], 'importing')
            self.assertEqual(client.get(path + '/import-status', headers={'x-user': '2'}).status_code, 404)
            deadline = time.time() + 5
            status = started.json()
            while status['status'] == 'importing' and time.time() < deadline:
                time.sleep(0.05)
                status = client.get(path + '/import-status', headers={'x-user': '1'}).json()
            return status

    def test_import_returns_immediately_and_reports_success(self):
        bridge = FakeBridge({'status': 'verified', 'summary': 'Placed 4 reference stems.', 'tracks': ['Ref drums']})
        status = self.run_import(bridge)
        self.assertEqual(status['status'], 'verified')
        self.assertEqual(status['summary'], 'Placed 4 reference stems.')
        self.assertEqual(status['live_set'], 'Untitled')
        self.assertEqual(bridge.calls, [('cloud_stem_import', 600), ('live_set', 20)])
        directory, _ = references.owned(self.id, 1)
        placed = references.placement(directory)
        self.assertEqual((placed['title'], placed['tracks']), ('Untitled', ['Ref drums']))
        self.assertIn('REFERENCE STEMS IN ABLETON', references.reference_context(self.id, 1))
        receipts = list((directory / 'source-use').glob('*.json'))
        self.assertEqual(len(receipts), 1)
        receipt = json.loads(receipts[0].read_text())
        self.assertEqual(receipt['reference_id'], self.id)
        self.assertEqual(receipt['user_id'], 1)
        self.assertEqual(receipt['intended_use'], 'private')
        self.assertFalse(receipt['legal_clearance_verified'])
        self.assertTrue(receipt['confirmed_at'])

    def test_bridge_failure_is_reported_through_status(self):
        status = self.run_import(FakeBridge({'status': 'failed', 'error': 'Ableton did not confirm.'}))
        self.assertEqual(status['status'], 'needs_inspection')
        self.assertEqual(status['details'], 'Ableton did not confirm.')
        self.assertIn('no automatic retry', status['error'])

    def test_preflight_failure_allows_a_fresh_attempt(self):
        status = self.run_import(FakeBridge({'status': 'failed', 'error': 'Missing audio.', 'changes_started': False}))
        self.assertEqual(status['status'], 'failed')
        self.assertEqual(status['error'], 'Missing audio.')

    def app(self, bridge):
        app = FastAPI()
        app.include_router(references.router_for(test_references.user, test_references.user,
                                                 bridge_for=lambda user_id, capability: bridge))
        return app

    def test_restart_keeps_receipts_and_same_operation_never_reimports(self):
        bridge = FakeBridge({'status': 'verified', 'tracks': ['Ref drums']})
        final = self.run_import(bridge)
        path = '/api/references/' + self.id
        payload = {'source_use': SOURCE_USE, 'operation_id': final['operation_id']}
        with TestClient(self.app(bridge)) as client:
            self.assertEqual(client.get(path + '/import-status', headers={'x-user': '1'}).json(), final)
            before = len(bridge.calls)
            response = client.post(path + '/import-to-ableton', headers={'x-user': '1'}, json=payload)
            self.assertEqual(response.json(), final)
            self.assertEqual(len(bridge.calls), before)
            mismatch = client.post(path + '/import-to-ableton', headers={'x-user': '1'}, json={**payload, 'stems': ['bass']})
            self.assertEqual(mismatch.status_code, 409)
            self.assertEqual(len(bridge.calls), before)

    def test_dead_worker_is_interrupted_not_idle_and_retry_is_blocked(self):
        directory = self.seed()
        operation_id = uuid.uuid4().hex
        reference_imports.save(directory, {'operation_id': operation_id, 'status': 'importing'})
        bridge = FakeBridge({'status': 'verified'})
        path = '/api/references/' + self.id
        with TestClient(self.app(bridge)) as client:
            status = client.get(path + '/import-status', headers={'x-user': '1'}).json()
            self.assertEqual(status['status'], 'needs_inspection')
            response = client.post(path + '/import-to-ableton', headers={'x-user': '1'}, json={'source_use': SOURCE_USE})
            self.assertEqual(response.status_code, 409)
            self.assertEqual(client.delete(path, headers={'x-user': '1'}).status_code, 409)
        self.assertEqual(bridge.calls, [])
        self.assertTrue((directory / 'imports' / (operation_id + '.json')).exists())

    def test_concurrent_worker_does_not_repeat_import_or_delete_source(self):
        self.seed()
        bridge = FakeBridge({'status': 'verified'})
        operation_id = uuid.uuid4().hex
        path = '/api/references/' + self.id
        payload = {'source_use': SOURCE_USE, 'operation_id': operation_id}
        with TestClient(self.app(bridge)) as first, TestClient(self.app(bridge)) as second:
            response = first.post(path + '/import-to-ableton', headers={'x-user': '1'}, json=payload)
            self.assertEqual(response.status_code, 202)
            repeated = second.post(path + '/import-to-ableton', headers={'x-user': '1'}, json=payload)
            self.assertEqual(repeated.json()['operation_id'], operation_id)
            conflict = second.post(path + '/import-to-ableton', headers={'x-user': '1'}, json={**payload, 'stems': ['bass']})
            self.assertEqual(conflict.status_code, 409)
            self.assertEqual(second.delete(path, headers={'x-user': '1'}).status_code, 409)
            time.sleep(0.3)
        self.assertEqual(sum(operation == 'cloud_stem_import' for operation, _ in bridge.calls), 1)

    def test_empty_duplicate_and_invalid_stem_choices_do_not_import_all(self):
        self.seed()
        bridge = FakeBridge({'status': 'verified'})
        with TestClient(self.app(bridge)) as client:
            for stems in ([], ['bass', 'bass'], ['unknown']):
                response = client.post('/api/references/' + self.id + '/import-to-ableton', headers={'x-user': '1'},
                                       json={'source_use': SOURCE_USE, 'stems': stems})
                self.assertEqual(response.status_code, 400)
        self.assertEqual(bridge.calls, [])

    def test_older_local_bridge_cannot_silently_ignore_selected_stems(self):
        directory = self.seed()
        item = json.loads((directory / 'meta.json').read_text())
        references.write_json(directory / 'meta.json', {**item, 'storage': 'local'})
        bridge = FakeBridge({'status': 'verified'})
        bridge.capabilities = set()
        with TestClient(self.app(bridge)) as client:
            response = client.post('/api/references/' + self.id + '/import-to-ableton', headers={'x-user': '1'},
                                   json={'source_use': SOURCE_USE, 'stems': ['vocals']})
            self.assertEqual(response.status_code, 409)
            self.assertIn('Update BeatMind Bridge', response.json()['detail'])
        self.assertEqual(bridge.calls, [])

    def test_no_bridge_is_rejected_up_front(self):
        self.seed()
        app = FastAPI()
        app.include_router(references.router_for(test_references.user, test_references.user))
        with TestClient(app) as client:
            response = client.post('/api/references/' + self.id + '/import-to-ableton', headers={'x-user': '1'}, json={'source_use': SOURCE_USE})
        self.assertEqual(response.status_code, 409)

    def test_missing_false_coerced_or_invalid_consent_never_calls_bridge(self):
        self.seed()
        bridge = FakeBridge({'status': 'verified'})
        app = FastAPI()
        app.include_router(references.router_for(test_references.user, test_references.user,
                                                 bridge_for=lambda user_id, capability: bridge))
        path = '/api/references/' + self.id + '/import-to-ableton'
        with TestClient(app) as client:
            for payload, status in ((None, 400), ({}, 400),
                    ({'source_use': {**SOURCE_USE, 'rights_confirmed': False}}, 400),
                    ({'source_use': {**SOURCE_USE, 'rights_confirmed': 'true'}}, 422),
                    ({'source_use': {**SOURCE_USE, 'rights_confirmed': 1}}, 422),
                    ({'source_use': {**SOURCE_USE, 'intended_use': 'cleared'}}, 422)):
                response = client.post(path, headers={'x-user': '1'}, json=payload)
                self.assertEqual(response.status_code, status, response.text)
            self.assertEqual(client.post(path, headers={'x-user': '2'}, json={'source_use': SOURCE_USE}).status_code, 404)
        self.assertEqual(bridge.calls, [])
        self.assertFalse((self.root / self.id / 'source-use').exists())

    def test_previous_permission_is_not_silently_reused(self):
        bridge = FakeBridge({'status': 'verified'})
        self.run_import(bridge)
        app = FastAPI()
        app.include_router(references.router_for(test_references.user, test_references.user,
                                                 bridge_for=lambda user_id, capability: bridge))
        calls_before = len(bridge.calls)
        with TestClient(app) as client:
            response = client.post('/api/references/' + self.id + '/import-to-ableton', headers={'x-user': '1'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(bridge.calls), calls_before)


if __name__ == '__main__':
    unittest.main()
