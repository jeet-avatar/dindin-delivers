import json
import shutil
import time
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

import references
import reference_timing as timing
import test_references
from security import DoSProtectionMiddleware

DETAILED = ['drums', 'bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals']
REPORT = {'stems': [{'name': n, 'rms_dbfs': -20} for n in DETAILED], 'duration_seconds': 40.0,
          'tempo': {'bpm': 123}, 'stem_health': {'checks_passed': True, 'stems': {}}, 'key_candidates': []}
USER = {'x-user': '1'}


class FakeBridge:
    def __init__(self, reply):
        self.reply, self.calls = reply, []

    async def local_operation(self, operation, payload, timeout=55):
        self.calls.append((operation, payload, timeout))
        return self.reply(operation, payload) if callable(self.reply) else self.reply


class LocalReferenceTests(unittest.TestCase):
    seed = test_references.ReferenceTests.seed

    def setUp(self):
        test_references.ReferenceTests.setUp(self)
        self.bridge = None
        app = FastAPI()
        app.include_router(references.router_for(test_references.user, test_references.user,
                                                 lambda user_id, capability: self.bridge if user_id == 1 else None))
        app.add_middleware(DoSProtectionMiddleware)
        # A persistent client keeps background file-choice tasks running between requests.
        self.client = TestClient(app)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)

    def start(self, reply={'status': 'started', 'name': 'Track.mp3', 'bytes': 1000, 'folder': '/Users/x/Music/BeatMind Stems/Track - 1'}):
        """Start a local separation and wait until the file choice resolves. Returns the reference id or None."""
        self.bridge = FakeBridge(reply)
        response = self.client.post('/api/references/local', headers=USER)
        self.assertEqual(response.status_code, 202, response.text)
        self.assertEqual(response.json()['status'], 'choosing')
        reference_id = response.json()['id']
        for _ in range(200):
            items = {i['id']: i for i in self.client.get('/api/references', headers=USER).json()['references']}
            if items.get(reference_id, {}).get('status') != 'choosing':
                return reference_id if reference_id in items else None
            time.sleep(0.01)
        self.fail('file choice did not resolve')

    def only_reference(self):
        items = self.client.get('/api/references', headers=USER).json()['references']
        self.assertEqual(len(items), 1)
        return items[0]

    def test_requires_a_bridge_with_local_separation(self):
        response = self.client.post('/api/references/local', headers=USER)
        self.assertEqual(response.status_code, 409)
        self.assertIn('BeatMind Bridge', response.json()['detail'])
        self.assertFalse(self.client.get('/api/references', headers=USER).json()['local_separation']['available'])

    def test_started_separation_waits_for_the_file_picker_and_records_local_storage(self):
        self.assertIsNotNone(self.start())
        operation, payload, timeout = self.bridge.calls[0]
        self.assertEqual(operation, 'local_reference')
        self.assertGreaterEqual(timeout, 300)
        item = self.only_reference()
        self.assertEqual((item['status'], item['storage'], item['name']), ('processing', 'local', 'Track.mp3'))
        self.assertNotIn('user_id', item)
        self.assertTrue(self.client.get('/api/references', headers=USER).json()['local_separation']['available'])

    def test_cancelled_choice_leaves_nothing_and_busy_reports_why(self):
        self.assertIsNone(self.start({'status': 'cancelled'}))
        self.assertEqual([p for p in self.root.iterdir() if p.is_dir()], [])
        self.start({'status': 'busy', 'error': 'Another track is separating.'})
        item = self.only_reference()
        self.assertEqual((item['status'], item['error']), ('failed', 'Another track is separating.'))

    def test_only_one_file_window_at_a_time(self):
        import asyncio
        waiting = asyncio.Event()

        class Blocked(FakeBridge):
            async def local_operation(self, operation, payload, timeout=55):
                await waiting.wait()
                return {'status': 'cancelled'}
        self.bridge = Blocked(None)
        self.assertEqual(self.client.post('/api/references/local', headers=USER).status_code, 202)
        second = self.client.post('/api/references/local', headers=USER)
        self.assertEqual(second.status_code, 409)
        self.assertIn('already open', second.json()['detail'])
        self.client.portal.call(waiting.set)

    def test_progress_then_result_from_the_bridge(self):
        reference_id = self.start()
        references.local_event(1, {'reference_id': reference_id, 'status': 'processing', 'stage': 'Splitting drums into kick, snare, toms and cymbals'})
        self.assertEqual(self.only_reference()['stage'], 'Splitting drums into kick, snare, toms and cymbals')
        references.local_event(2, {'reference_id': reference_id, 'status': 'ready', 'report': REPORT})
        self.assertEqual(self.only_reference()['status'], 'processing', 'another user cannot complete it')
        references.local_event(1, {'reference_id': reference_id, 'status': 'ready', 'report': REPORT, 'folder': '/f'})
        item = self.only_reference()
        self.assertEqual(item['status'], 'ready')
        self.assertEqual([s['name'] for s in item['report']['stems']], DETAILED)
        self.assertEqual(item['stem_review']['status'], 'pending')
        references.local_event(1, {'reference_id': reference_id, 'status': 'failed', 'error': 'late'})
        self.assertEqual(self.only_reference()['status'], 'ready', 'late events are ignored')

    def test_malformed_reports_fail_instead_of_being_stored(self):
        for bad in ({**REPORT, 'stems': [{'name': 'piano'}]}, {**REPORT, 'duration_seconds': 9999}, 'report', {}):
            with self.subTest(bad=str(bad)[:40]):
                for path in [p for p in self.root.iterdir() if p.is_dir()]:
                    shutil.rmtree(path)
                reference_id = self.start()
                references.local_event(1, {'reference_id': reference_id, 'status': 'ready', 'report': bad})
                item = self.only_reference()
                self.assertEqual(item['status'], 'failed')
                self.assertFalse((self.root / reference_id / 'report.json').exists())

    def ready_local(self):
        reference_id = self.start()
        references.local_event(1, {'reference_id': reference_id, 'status': 'ready', 'report': REPORT})
        return reference_id

    def test_local_audio_is_never_served_or_sent_for_listening(self):
        reference_id = self.ready_local()
        base = '/api/references/' + reference_id
        self.assertEqual(self.client.get(base + '/audio/kick', headers=USER).status_code, 404)
        response = self.client.post(base + '/listen', json={'intent': 'groove', 'consent': True, 'layer': 'kick'}, headers=USER)
        self.assertEqual(response.status_code, 409)
        self.assertIn('stays on your computer', response.json()['detail'])
        self.assertEqual(self.client.post(base + '/refresh-analysis', headers=USER).status_code, 409)

    def test_stem_review_and_context_work_from_the_report_alone(self):
        reference_id = self.ready_local()
        directory = self.root / reference_id
        choices = {name: 'keep' for name in DETAILED if name != 'drums'}
        response = self.client.post(f'/api/references/{reference_id}/stem-review', headers=USER,
                                    json={'analysis_id': timing.fingerprint(directory), 'heard': True, 'decisions': choices})
        self.assertEqual(response.status_code, 200)
        self.assertIn('REFERENCE AUDIO MEASUREMENTS', references.reference_context(reference_id, 1))

    def test_open_in_finder_or_ableton_goes_to_the_bridge(self):
        reference_id = self.ready_local()
        self.bridge = FakeBridge(lambda operation, payload: {'status': 'verified' if payload['action'] == 'ableton' else 'opened'})
        for action in ('finder', 'ableton'):
            response = self.client.post(f'/api/references/{reference_id}/local-open', json={'action': action}, headers=USER)
            self.assertEqual(response.status_code, 200)
        self.assertEqual([c[1]['action'] for c in self.bridge.calls], ['finder', 'ableton'])
        self.bridge = FakeBridge({'status': 'failed', 'error': 'Placing stems needs Ableton Live 12.'})
        response = self.client.post(f'/api/references/{reference_id}/local-open', json={'action': 'ableton'}, headers=USER)
        self.assertEqual((response.status_code, response.json()['detail']), (409, 'Placing stems needs Ableton Live 12.'))
        self.assertEqual(self.client.post(f'/api/references/{reference_id}/local-open', json={'action': 'shell'}, headers=USER).status_code, 422)

    def test_local_references_can_be_deleted_while_separating_and_keep_user_files(self):
        reference_id = self.start()
        response = self.client.delete('/api/references/' + reference_id, headers=USER)
        self.assertEqual(response.json(), {'deleted': reference_id, 'local_files_kept': True})
        references.local_event(1, {'reference_id': reference_id, 'status': 'ready', 'report': REPORT})
        self.assertFalse((self.root / reference_id).exists())

    def test_local_references_do_not_count_toward_the_upload_limit(self):
        for _ in range(5):
            self.ready_local()
        with patch.object(references, 'capability', return_value={'available': True}):
            response = self.client.post('/api/references', content=b'', headers={**USER, 'X-Rights-Confirmed': 'true', 'X-Reference-Name': 'a.wav'})
        self.assertEqual(response.status_code, 400, 'reached the empty-file check, not the five-upload limit')

    def test_restart_keeps_local_jobs_and_fails_abandoned_file_choices(self):
        processing = self.start()
        choosing = 'c' * 32
        (self.root / choosing).mkdir()
        references.write_json(self.root / choosing / 'meta.json', {'id': choosing, 'user_id': 1, 'storage': 'local',
                              'status': 'choosing', 'name': 'x', 'created_at': '2026-09-27'})
        references._recover_interrupted()
        self.assertEqual(json.loads((self.root / processing / 'meta.json').read_text())['status'], 'processing')
        self.assertEqual(json.loads((self.root / choosing / 'meta.json').read_text())['status'], 'failed')

    def test_track_allowance_is_charged_on_start_and_refunded_on_failure(self):
        import os
        import billing
        from database import db
        with db() as conn:
            conn.execute("DELETE FROM separations WHERE user_id=1")
            conn.execute("DELETE FROM credit_ledger WHERE user_id=1")  # Other tests may have bought tracks for user 1.
            # A subscriber from before plans existed: BEATMIND_INCLUDED_TRACKS is their monthly allowance.
            conn.execute("INSERT INTO users (id, email, password_hash, name) VALUES (1, 'user1@example.com', 'x', 'One') "
                        "ON CONFLICT (id) DO NOTHING")
            conn.execute("UPDATE users SET subscription_status='active', included_tracks=NULL, plan_tier=NULL WHERE id=1")
        with patch.dict(os.environ, {'BEATMIND_INCLUDED_TRACKS': '1', 'BEATMIND_PACKS': ''}):
            first = self.start()
            self.bridge = FakeBridge({'status': 'started', 'name': 'b.mp3', 'bytes': 1, 'folder': '/f'})
            response = self.client.post('/api/references/local', headers=USER)
            self.assertEqual(response.status_code, 402)
            self.assertIn('track pack', response.json()['detail'])
            references.local_event(1, {'reference_id': first, 'status': 'failed', 'error': 'Out of memory'})
            self.assertEqual(billing.summary(1)['allowance_left'], 1)
            self.assertIsNotNone(self.start())


if __name__ == '__main__':
    unittest.main()
