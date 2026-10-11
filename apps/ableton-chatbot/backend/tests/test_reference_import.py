import asyncio
import time
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

import references
import test_references


class FakeBridge:
    def __init__(self, result):
        self.result = result
        self.calls = []

    async def local_operation(self, operation, payload, timeout=55):
        self.calls.append((operation, timeout))
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
            started = client.post(path + '/import-to-ableton', headers={'x-user': '1'})
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

    def test_bridge_failure_is_reported_through_status(self):
        status = self.run_import(FakeBridge({'status': 'failed', 'error': 'Ableton did not confirm.'}))
        self.assertEqual(status, {'status': 'failed', 'error': 'Ableton did not confirm.'})

    def test_no_bridge_is_rejected_up_front(self):
        self.seed()
        app = FastAPI()
        app.include_router(references.router_for(test_references.user, test_references.user))
        with TestClient(app) as client:
            response = client.post('/api/references/' + self.id + '/import-to-ableton', headers={'x-user': '1'})
        self.assertEqual(response.status_code, 409)


if __name__ == '__main__':
    unittest.main()
