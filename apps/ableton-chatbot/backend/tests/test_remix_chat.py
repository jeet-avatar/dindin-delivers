import asyncio
import copy
import json
import time
import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import chat_store
import references
import remix_chat
import remix_jobs
import remix_render
import test_remix_jobs as fixtures


class RemixChatTests(unittest.TestCase):
    def setUp(self):
        fixtures.RemixJobTests.setUp(self)
        patcher = patch.object(chat_store, 'ROOT', self.root / 'chats')
        patcher.start()
        self.addCleanup(patcher.stop)
        self.session = SimpleNamespace(user_id=1, session_id='remix_' + 'c' * 32,
            reference_id=self.id, messages=[], actions=[], ui_messages=[], project={
                'mode': 'remix', 'title': 'My remix', 'remix': {'reference_id': self.id, 'target_bpm': 120,
                    'layers': {'bass': 'retain', 'drums': 'retain', 'other': 'omit'}}})
        chat_store.save(self.session, 'complete')

        async def create(req, owner, session_id=None):
            self.assertEqual(session_id, self.session.session_id)
            self.session.project['title'] = req.title
            self.session.project['remix']['automatic_preview_id'] = req.request_id
            chat_store.save(self.session, 'complete')
            return {'sessionId': session_id, 'referenceId': req.reference_id, 'project': self.session.project}

        self.create.side_effect = create
        app = FastAPI()
        app.include_router(remix_jobs.router_for(fixtures.user, self.create))
        app.include_router(remix_chat.router_for(fixtures.user))
        self.client = TestClient(app)
        self.edit_url = f'/api/chats/{self.session.session_id}/remix-edit-state'

    def current(self):
        return remix_chat.state(1, self.session.session_id)

    def proposal(self):
        current = self.current()
        recipe = copy.deepcopy(current['recipe'])
        recipe['target_bpm'] = 125
        recipe['segments'].reverse()
        recipe['segments'][0]['levels']['bass'] = -9
        recipe['segments'][1]['repeats'] = 2
        del recipe['segments'][1]['levels']['bass']
        return {'expected_version': current['version'], 'title': 'My revised remix', 'recipe': recipe}

    def save_proposal(self):
        return remix_chat.propose(1, self.session.session_id, self.proposal())

    def render_request(self):
        draft = self.current()['draft']
        return {**self.request, 'session_id': self.session.session_id, 'draft_id': draft['id'],
                'recipe': draft['recipe'], 'title': draft['title']}

    def test_owned_versioned_draft_changes_every_supported_recipe_field_without_audio_writes(self):
        hashes = {name: remix_render.digest(self.source / f'{name}.wav') for name in self.names}
        before = self.current()
        result = self.save_proposal()
        after = self.current()
        self.assertEqual(result['status'], 'observed')
        self.assertNotEqual(before['version'], after['version'])
        self.assertEqual(after['recipe']['target_bpm'], 125)
        self.assertEqual(after['recipe']['segments'][0]['section'], 1)
        self.assertEqual(after['recipe']['segments'][0]['levels']['bass'], -9)
        self.assertNotIn('bass', after['recipe']['segments'][1]['levels'])
        self.assertEqual(after['draft']['duration_seconds'], 11.52)
        self.assertEqual(len(after['draft']['changes']), 4)
        self.assertFalse((self.source / 'automatic-remixes').exists())
        self.assertEqual(hashes, {name: remix_render.digest(self.source / f'{name}.wav') for name in self.names})
        with self.client as client:
            self.assertEqual(client.get(self.edit_url).json()['draft'], after['draft'])
            self.assertEqual(client.get(self.edit_url, headers={'x-user': '2'}).status_code, 404)
        self.create.assert_not_awaited()

    def test_stale_versions_and_unsupported_or_invalid_changes_do_not_overwrite_draft(self):
        request = self.proposal()
        remix_chat.propose(1, self.session.session_id, request)
        before = self.current()
        with self.assertRaises(HTTPException):
            remix_chat.propose(1, self.session.session_id, request)
        for change in ({'effects': ['reverb']}, {'target_bpm': 190},
                       {'segments': [{'section': 0, 'levels': {'invented_kick': -3}}]},
                       {'segments': [{'section': 0, 'levels': {'bass': 3}}]}):
            invalid = {**request, 'expected_version': before['version'], 'recipe': {**request['recipe'], **change}}
            result = remix_chat.execute('propose_remix_changes', invalid, 1, self.session.session_id)
            self.assertEqual(result['status'], 'failed', result)
            self.assertEqual(self.current()['draft'], before['draft'])

    def test_follow_up_preserves_pending_choices_and_discard_restores_original_recipe(self):
        baseline = self.current()['recipe']
        self.save_proposal()
        current = self.current()
        recipe = copy.deepcopy(current['recipe'])
        recipe['target_bpm'] = 126
        remix_chat.propose(1, self.session.session_id, {'expected_version': current['version'],
            'title': current['title'], 'recipe': recipe})
        current = self.current()
        self.assertEqual(current['recipe']['segments'], recipe['segments'])
        result = remix_chat.discard(1, self.session.session_id, {'expected_version': current['version']})
        self.assertEqual(result['status'], 'observed')
        self.assertEqual(self.current()['recipe'], baseline)
        self.assertIsNone(self.current()['draft'])

    def test_changed_timing_and_tampered_confirmation_do_not_render(self):
        self.save_proposal()
        request = self.render_request()
        with self.client as client:
            tampered = {**request, 'recipe': {**request['recipe'], 'target_bpm': 126}}
            self.assertEqual(client.post(self.base, json=tampered).status_code, 409)
            references.write_json(self.source / 'timing.json', {**self.timing, 'revision': 2})
            self.assertTrue(client.get(self.edit_url).json()['stale_draft'])
            self.assertEqual(client.post(self.base, json=request).status_code, 422)
        self.create.assert_not_awaited()

    def test_confirmed_chat_draft_renders_real_audio_once_and_stays_in_same_song(self):
        self.save_proposal()
        request = self.render_request()
        with self.client as client:
            unconfirmed = {**request, 'source_use': {'rights_confirmed': False, 'intended_use': 'private'}}
            self.assertEqual(client.post(self.base, json=unconfirmed).status_code, 400)
            self.assertEqual(client.post(self.base, headers={'x-user': '2'}, json=request).status_code, 404)
            response = client.post(self.base, json=request)
            self.assertEqual(response.status_code, 202, response.text)
            endpoint = self.base + '/' + response.json()['id']
            self.assertEqual(client.post(self.base, json=request).json()['id'], response.json()['id'])
            deadline = time.monotonic() + 120
            result = client.get(endpoint).json()
            while result['status'] == 'rendering' and time.monotonic() < deadline:
                time.sleep(.1)
                result = client.get(endpoint).json()
            self.assertEqual(result['status'], 'ready', result)
            self.assertEqual(result['review'], 'pending')
            self.assertEqual(result['project']['sessionId'], self.session.session_id)
            self.assertEqual(result['result']['frames'], round(11.52 * 44100))
            self.assertEqual(result['result']['target_bpm'], 125)
            self.assertLessEqual(result['result']['true_peak_dbtp'], -1)
            self.assertIsNone(client.get(self.edit_url).json()['draft'])
            self.assertEqual(client.post(self.base, json=request).json()['id'], result['id'])
        self.assertEqual(self.create.await_count, 1)
        self.assertEqual(len(list((self.source / 'automatic-remixes').glob('*/job.json'))), 1)

    def test_no_op_does_not_create_draft_and_other_chat_cannot_confirm_it(self):
        current = self.current()
        result = remix_chat.propose(1, self.session.session_id, {
            'expected_version': current['version'], 'title': current['title'], 'recipe': current['recipe']})
        self.assertNotIn('remix_draft', result)
        self.save_proposal()
        request = self.render_request()
        with self.client as client:
            result = client.post(self.base, json={**request, 'session_id': 'remix_' + 'd' * 32})
            self.assertEqual(result.status_code, 404)
        self.create.assert_not_awaited()

    def test_return_to_original_clears_draft_without_wasting_a_render(self):
        baseline = self.current()
        self.save_proposal()
        current = self.current()
        result = remix_chat.propose(1, self.session.session_id, {'expected_version': current['version'],
            'title': baseline['title'], 'recipe': baseline['recipe']})
        self.assertNotIn('remix_draft', result)
        self.assertIsNone(self.current()['draft'])
        self.assertFalse((self.source / 'automatic-remixes').exists())

    def test_chat_model_tools_save_a_draft_without_bridge_or_rendering(self):
        import main
        import billing
        from jsonschema import Draft202012Validator
        for tool in remix_chat.TOOLS:
            Draft202012Validator.check_schema(tool['input_schema'])
        self.session.planning_only = True
        self.session.messages = [{'role': 'user', 'content': 'Set 125 BPM, repeat the intro twice and reduce the bass.'}]
        calls = []

        async def model(**kwargs):
            calls.append(kwargs)
            name = 'get_remix_edit_state' if len(calls) == 1 else 'propose_remix_changes'
            inputs = {} if len(calls) == 1 else self.proposal()
            return SimpleNamespace(stop_reason='tool_use', content=[SimpleNamespace(
                type='tool_use', id=f'call-{len(calls)}', name=name, input=inputs)])

        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(side_effect=model)))
        with patch.object(main, 'claude_client', client), patch.object(billing, 'max_rounds', return_value=4), \
                patch.object(main.ai_usage, 'record'), patch.object(main, '_execute_tool', AsyncMock()) as ableton:
            text, actions = asyncio.run(main._run_claude_loop(self.session, None))
        self.assertEqual(len(calls), 2)
        self.assertIn('saved for review', text)
        self.assertIn('remix_draft', actions[-1]['result'])
        self.assertNotIn('create_midi_track', {tool['name'] for tool in calls[0]['tools']})
        self.assertIn('propose_remix_changes', {tool['name'] for tool in calls[0]['tools']})
        self.assertFalse((self.source / 'automatic-remixes').exists())
        ableton.assert_not_awaited()
