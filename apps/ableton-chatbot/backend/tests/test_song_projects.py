import asyncio
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import main
import recordings
import song_projects


class SongProjectTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        for target, name, value in [(main.chat_store, 'ROOT', Path(self.temp.name) / 'chats'),
                                    (recordings, 'ROOT', Path(self.temp.name) / 'recordings'),
                                    (main, 'rate_limit', lambda *a, **k: None)]:
            patcher = patch.object(target, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        main.sessions.clear()
        main.bridges.clear()
        self.addCleanup(main.sessions.clear)
        self.addCleanup(main.bridges.clear)
        self.user = {'id': 42}
        self.song = await main.create_song_project(self.user)
        self.id = self.song['sessionId']

    async def test_empty_song_and_choices_survive_restart_without_touching_old_song(self):
        await main.update_song_project(self.id, main.SongProjectRequest(title='Original minimal', starting_point='idea'), self.user)
        newer = await main.create_song_project(self.user)
        self.assertNotEqual(newer['sessionId'], self.id)
        main.sessions.clear()
        old = await main.chat_details(self.id, self.user)
        self.assertEqual(old['project']['title'], 'Original minimal')
        self.assertEqual(old['project']['starting_point'], 'idea')
        self.assertEqual(old['messages'], [])
        self.assertIsNone(newer['referenceId'])
        self.assertIsNone(newer['project']['live_set'])
        self.assertEqual(len((await main.chats_list(self.user))['chats']), 2)

    async def test_project_access_is_owner_scoped(self):
        for action in (main.chat_details(self.id, {'id': 43}),
                       main.update_song_project(self.id, main.SongProjectRequest(title='No'), {'id': 43})):
            with self.assertRaises(main.HTTPException) as error:
                await action
            self.assertEqual(error.exception.status_code, 404)

    async def test_foreign_reference_cannot_be_attached_and_idea_clears_reference(self):
        with patch.object(main.references, 'owned', side_effect=main.HTTPException(404, 'Reference not found')):
            with self.assertRaises(main.HTTPException):
                await main.update_song_project(self.id, main.SongProjectRequest(reference_id='a' * 32), self.user)
        with patch.object(main.references, 'owned', return_value=(None, {})):
            await main.update_song_project(self.id, main.SongProjectRequest(reference_id='b' * 32), self.user)
        restored = await main.chat_details(self.id, self.user)
        self.assertEqual(restored['referenceId'], 'b' * 32)
        self.assertEqual(restored['project']['starting_point'], 'reference')
        changed = await main.update_song_project(self.id, main.SongProjectRequest(starting_point='idea'), self.user)
        self.assertIsNone(changed['referenceId'])

    async def test_project_update_respects_production_lease(self):
        with main.chat_store.acquire(42, self.id):
            with self.assertRaises(main.HTTPException) as error:
                await main.update_song_project(self.id, main.SongProjectRequest(title='Busy'), self.user)
        self.assertEqual(error.exception.status_code, 409)

    async def test_new_song_forces_discussion_even_when_client_requests_production(self):
        tool = SimpleNamespace(type='tool_use', name='create_midi_track', id='write', input={'index': -1})
        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(side_effect=[
            SimpleNamespace(stop_reason='tool_use', content=[tool]),
            SimpleNamespace(stop_reason='end_turn', content=[SimpleNamespace(type='text', text='Reference or idea?')]),
        ])))
        req = main.ChatRequest(message='Make a kick', session_id=self.id, planning_only=False)
        with patch.object(main, 'claude_client', client), patch.object(main, '_execute_tool', AsyncMock()) as execute:
            session, bridge = main.prepare_chat(req, self.user)
            result = await main.produce_chat(req, session, bridge)
        execute.assert_not_awaited()
        self.assertTrue(session.planning_only)
        self.assertEqual(result['tool_calls'][0]['result']['status'], 'failed')
        self.assertNotIn('create_midi_track', {t['name'] for t in client.messages.create.call_args.kwargs['tools']})

    def bridge(self, title='My Song', ready=True):
        bridge = SimpleNamespace(user_id=42, lock=asyncio.Lock(),
            local_operation=AsyncMock(return_value={'status': 'observed', 'title': title, 'new_set_ready': ready, 'tracks': []}),
            send_command=AsyncMock(return_value={'status': 'ok', 'args': []}))
        main.bridges['test'] = bridge
        return bridge

    async def test_confirmation_only_inspects_and_never_sends_music(self):
        bridge = self.bridge()
        result = await main.live_set_action(main.LiveSetRequest(operation='confirm_current', session_id=self.id), self.user)
        bridge.local_operation.assert_awaited_once_with('live_set', {'operation': 'inspect'})
        bridge.send_command.assert_not_awaited()
        self.assertEqual(result['project']['live_set']['title'], 'My Song')
        self.assertEqual((await main.chat_details(self.id, self.user))['project'], result['project'])

    async def test_unverified_new_set_never_becomes_bound(self):
        self.bridge(ready=False)
        with self.assertRaises(main.HTTPException) as error:
            await main.live_set_action(main.LiveSetRequest(operation='confirm_new', session_id=self.id), self.user)
        self.assertEqual(error.exception.status_code, 409)
        self.assertIsNone((await main.chat_details(self.id, self.user))['project']['live_set'])

    async def test_changed_set_stops_before_model_or_music(self):
        bridge = self.bridge()
        await main.update_song_project(self.id, main.SongProjectRequest(starting_point='idea'), self.user)
        await main.live_set_action(main.LiveSetRequest(operation='confirm_current', session_id=self.id), self.user)
        bridge.local_operation.return_value = {'status': 'observed', 'title': 'Different Song'}
        with patch.object(main, 'claude_client', SimpleNamespace()), patch.object(main, '_run_claude_loop', AsyncMock()) as model:
            req = main.ChatRequest(message='Add a kick', session_id=self.id)
            session, bridge = main.prepare_chat(req, self.user)
            with self.assertRaises(main.HTTPException) as error:
                await main.produce_chat(req, session, bridge)
        self.assertEqual(error.exception.status_code, 409)
        model.assert_not_awaited()
        bridge.send_command.assert_not_awaited()

    async def test_reference_workflow_gates_do_not_accept_partial_listening(self):
        project = {'starting_point': 'reference', 'live_set': {'title': 'Test'}}
        data = {'status': 'ready'}
        with patch.object(song_projects.references, 'owned', return_value=(None, {})), patch.object(song_projects.references, 'public', return_value=data):
            self.assertIn('upload', song_projects.planning_reason(project, None, 42))
            self.assertIn('consent', song_projects.planning_reason(project, 'ref', 42))
            data['listening'] = {'coverage': {'full_coverage': False, 'coverage_percent': 99}}
            self.assertIn('consent', song_projects.planning_reason(project, 'ref', 42))
            data['listening']['coverage']['full_coverage'] = True
            self.assertIn('one question', song_projects.planning_reason(project, 'ref', 42))
            data['stem_review'] = {'status': 'accepted'}
            self.assertIn('timing', song_projects.planning_reason(project, 'ref', 42))
            data['timing'] = {'status': 'confirmed'}
            self.assertIn('template', song_projects.planning_reason(project, 'ref', 42))
            data['template'] = {'status': 'approved'}
            self.assertEqual(song_projects.planning_reason(project, 'ref', 42), '')
            data['template']['status'] = 'needs_review'
            self.assertIn('template', song_projects.planning_reason(project, 'ref', 42))

    async def test_recording_memory_is_song_scoped_without_changing_old_approvals(self):
        recordings.ROOT.mkdir()
        for identifier, session_id in [('a' * 32, 'old'), ('b' * 32, self.id)]:
            (recordings.ROOT / f'{identifier}.json').write_text(json.dumps({
                'id': identifier, 'user_id': 42, 'session_id': session_id,
                'created_at': '2026-09-26', 'decision': 'accepted', 'track_name': 'Kick'}))
        selected = recordings.list_recordings(42, self.id)
        self.assertEqual([item['id'] for item in selected], ['b' * 32])
        self.assertEqual(recordings.owned_recording('a' * 32, 42)['decision'], 'accepted')

    def test_legacy_conversations_have_no_new_project_gate(self):
        self.assertEqual(song_projects.planning_reason(None, None, 42), '')
