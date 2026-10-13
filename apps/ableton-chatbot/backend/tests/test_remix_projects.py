import json
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

import billing
import main
import references
import remix_projects
import test_song_projects


class RemixProjectTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await test_song_projects.SongProjectTests.asyncSetUp(self)
        self.root = Path(self.temp.name) / 'references'
        patcher = patch.object(references, 'ROOT', self.root)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.reference_id = 'c' * 32
        self.directory = self.root / self.reference_id
        self.directory.mkdir(parents=True)
        references.write_json(self.directory / 'meta.json', {
            'id': self.reference_id, 'user_id': 42, 'name': 'Synthetic reference.wav',
            'status': 'ready', 'created_at': '2026-10-13', 'storage': 'local'})
        references.write_json(self.directory / 'report.json', {
            'stems': [{'name': name} for name in ['drums', 'bass', 'vocals', 'other']],
            'duration_seconds': 8, 'tempo': {'bpm': 124}})
        self.payload = {'request_id': uuid.uuid4().hex, 'reference_id': self.reference_id,
                        'title': 'My minimal remix', 'style': 'Deep minimal', 'target_bpm': 124,
                        'layers': {'drums': 'replace', 'bass': 'retain', 'vocals': 'omit', 'other': 'retain'},
                        'source_use': {'rights_confirmed': True, 'intended_use': 'private'}}

    async def create(self, **changes):
        return await main.create_remix_project(remix_projects.RemixRequest(**{**self.payload, **changes}), self.user)

    async def test_plan_is_saved_separately_with_source_bound_permission(self):
        result = await self.create()
        self.assertNotEqual(result['sessionId'], self.id)
        self.assertEqual(result['project']['mode'], 'remix')
        self.assertEqual(result['referenceId'], self.reference_id)
        self.assertEqual(result['project']['remix']['execution_status'], 'unavailable')
        self.assertIsNone(result['project']['live_set'])
        main.sessions.clear()
        restored = await main.chat_details(result['sessionId'], self.user)
        self.assertEqual(restored['project'], result['project'])
        original = await main.chat_details(self.id, self.user)
        self.assertNotIn('remix', original['project'])
        self.assertEqual(restored['messages'], [])
        receipt = json.loads(next((self.directory / 'source-use').glob('*.json')).read_text())
        self.assertEqual(receipt['action'], 'remix-plan')
        self.assertEqual(receipt['stems'], ['bass', 'other'])
        self.assertFalse(receipt['legal_clearance_verified'])

    async def test_retry_creates_one_chat_and_consumes_one_song(self):
        before = billing.songs_this_month(42)
        first = await self.create()
        second = await self.create()
        self.assertEqual(first, second)
        self.assertEqual(billing.songs_this_month(42), before + 1)
        self.assertEqual(len(list((self.directory / 'source-use').glob('*.json'))), 1)
        with self.assertRaises(HTTPException) as error:
            await self.create(style='Changed request')
        self.assertEqual(error.exception.status_code, 409)

    async def test_automatic_preview_revisions_share_one_song_credit_and_source(self):
        before = billing.songs_this_month(42)
        req = remix_projects.RemixRequest(**self.payload)
        first = await main.save_automatic_remix_project(req, self.user)
        revision = req.model_copy(update={'request_id': uuid.uuid4().hex, 'title': 'Revised preview'})
        revised = await main.save_automatic_remix_project(revision, self.user, first['sessionId'])
        self.assertEqual(first['sessionId'], revised['sessionId'])
        self.assertEqual(revised['project']['remix']['automatic_preview_id'], revision.request_id)
        self.assertEqual(billing.songs_this_month(42), before + 1)
        with self.assertRaises(HTTPException):
            await main.save_automatic_remix_project(revision, {**self.user, 'id': 43}, first['sessionId'])
        with self.assertRaises(HTTPException):
            await main.save_automatic_remix_project(revision.model_copy(update={'reference_id': 'e' * 32}), self.user, first['sessionId'])
        with self.assertRaises(HTTPException):
            await main.save_automatic_remix_project(revision, self.user, self.id)

    async def test_foreign_reference_and_missing_permission_are_rejected(self):
        with self.assertRaises(HTTPException) as error:
            await main.create_remix_project(remix_projects.RemixRequest(**self.payload), {**self.user, 'id': 43})
        self.assertEqual(error.exception.status_code, 404)
        with self.assertRaises(HTTPException) as error:
            await self.create(source_use={'rights_confirmed': False, 'intended_use': 'private'})
        self.assertEqual(error.exception.status_code, 400)
        self.assertFalse((self.directory / 'source-use').exists())

    async def test_each_available_stem_needs_a_valid_choice_and_one_retained_layer(self):
        for layers in ({'bass': 'retain'}, {**self.payload['layers'], 'kick': 'retain'},
                       {name: 'replace' for name in self.payload['layers']}):
            with self.assertRaises(HTTPException):
                await self.create(layers=layers)
        self.assertFalse((self.directory / 'source-use').exists())

    async def test_song_limit_is_not_bypassed(self):
        with patch.object(billing, 'enforce_song_limit', side_effect=HTTPException(429, 'Song limit reached')):
            with self.assertRaises(HTTPException) as error:
                await self.create()
        self.assertEqual(error.exception.status_code, 429)
        self.assertIsNone(main.chat_store.load(42, 'remix_' + self.payload['request_id']))

    async def test_source_cannot_be_switched_or_removed_by_chat_or_project_patch(self):
        result = await self.create()
        with self.assertRaises(HTTPException):
            await main.update_song_project(result['sessionId'], main.SongProjectRequest(starting_point='idea'), self.user)
        with patch.object(main, 'claude_client', SimpleNamespace()):
            for reference_id in (None, 'e' * 32):
                with self.assertRaises(HTTPException) as error:
                    main.prepare_chat(main.ChatRequest(message='Build it', session_id=result['sessionId'], reference_id=reference_id), self.user)
                self.assertEqual(error.exception.status_code, 409)

    async def test_model_cannot_bypass_planning_gate_by_requesting_music_tool(self):
        result = await self.create()
        tool = SimpleNamespace(type='tool_use', name='create_midi_track', id='write', input={'index': -1})
        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(side_effect=[
            SimpleNamespace(stop_reason='tool_use', content=[tool]),
            SimpleNamespace(stop_reason='end_turn', content=[SimpleNamespace(type='text', text='Let us review your remix plan.')]),
        ])))
        request = main.ChatRequest(message='Build the remix now', session_id=result['sessionId'], planning_only=False)
        with patch.object(main, 'claude_client', client), patch.object(main, '_execute_tool', AsyncMock()) as execute:
            session, bridge = main.prepare_chat(request, self.user)
            response = await main.produce_chat(request, session, bridge)
        execute.assert_not_awaited()
        self.assertTrue(session.planning_only)
        self.assertEqual(response['tool_calls'][0]['result']['status'], 'failed')
        self.assertNotIn('create_midi_track', {t['name'] for t in client.messages.create.call_args.kwargs['tools']})
