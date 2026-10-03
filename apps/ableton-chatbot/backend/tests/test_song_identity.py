import copy
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import main
import production
import song_identity as identity
from song_projects import new_project


class SongIdentityTests(unittest.TestCase):
    def test_partial_details_and_tempo_changes_keep_auto_title_current(self):
        project = new_project()
        self.assertEqual(identity.refresh(project)['title'], 'New song')
        identity.update(project, {'genre': 'deep minimal', 'evidence': 'make deep minimal'}, 'make deep minimal')
        self.assertEqual(project['title'], 'Deep minimal')
        identity.update(project, {'bpm': 124, 'evidence': 'at 124bpm'}, 'at 124bpm')
        self.assertEqual(project['title'], 'Deep minimal - 124 BPM')
        identity.update(project, {'bpm': 122.5, 'evidence': 'change to 122.5 BPM'}, 'change to 122.5 BPM')
        self.assertEqual(project['title'], 'Deep minimal - 122.5 BPM')

    def test_user_named_song_wins_over_genre_bpm_and_plan_titles(self):
        project = new_project()
        identity.update(project, {'title': 'Night Circuit', 'evidence': 'call it Night Circuit'}, 'call it Night Circuit')
        identity.update(project, {'genre': 'dub techno', 'bpm': 126, 'evidence': 'dub techno at 126'}, 'dub techno at 126')
        self.assertEqual(identity.refresh(project, {'title': 'Invented plan title', 'genre': 'house', 'bpm': 120})['title'], 'Night Circuit')
        self.assertEqual(project['title_source'], 'user')

    def test_legacy_named_songs_and_explicit_new_song_name_are_preserved(self):
        for project in ({'title': 'My existing song'}, {'title': 'New song', 'title_source': 'user'}):
            self.assertEqual(identity.refresh(project, {'genre': 'house', 'bpm': 120})['title'], project['title'])

    def test_legacy_placeholder_uses_known_plan_not_generated_plan_title(self):
        project = new_project()
        named = identity.refresh(project, {'title': 'Invented', 'genre': 'progressive house', 'bpm': 123})
        self.assertEqual(named['title'], 'Progressive house - 123 BPM')
        self.assertEqual(project['title'], 'New song', 'Read-side migration must not mutate its input')
        self.assertEqual(identity.refresh(new_project(), {'bpm': 120})['title'], '120 BPM')

    def test_invalid_or_invented_details_do_not_mutate_project(self):
        cases = [
            {'title': 'Invented', 'evidence': 'make a kick'},
            {'genre': 'techno', 'evidence': 'make a kick'},
            {'bpm': 124, 'evidence': 'make a kick'},
            {'title': 'kick', 'evidence': 'a different message'},
            {'title': '  ', 'evidence': 'make a kick'},
            {'bpm': float('nan'), 'evidence': 'make a kick'},
            {'bpm': True, 'evidence': 'make a kick'},
            {'evidence': 'make a kick'},
        ]
        for data in cases:
            project = new_project()
            before = copy.deepcopy(project)
            result = identity.update(project, data, 'make a kick')
            self.assertEqual(result['status'], 'failed', data)
            self.assertEqual(project, before)


class SongIdentityChatTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        for target, key, value in [(main.chat_store, 'ROOT', Path(self.temp.name) / 'chats'),
                                   (production, 'ROOT', Path(self.temp.name) / 'plans')]:
            patcher = patch.object(target, key, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    async def test_metadata_works_while_planning_and_survives_stream_reload_and_listing(self):
        session = main.ChatSession('identity-fixture', 321)
        session.project = new_project()
        call = SimpleNamespace(type='tool_use', name=identity.TOOL['name'], id='identity',
                               input={'genre': 'deep minimal', 'bpm': 124, 'evidence': 'deep minimal at 124 BPM'})
        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(side_effect=[
            SimpleNamespace(stop_reason='tool_use', content=[call]),
            SimpleNamespace(stop_reason='end_turn', content=[SimpleNamespace(type='text', text='Ready.')]),
        ])))
        events = []

        async def emit(event):
            events.append(copy.deepcopy(event))

        with patch.object(main, 'claude_client', client), patch.object(main, '_execute_tool', AsyncMock()) as music:
            result = await main.produce_chat(main.ChatRequest(message='make deep minimal at 124 BPM'), session, None, emit)
        music.assert_not_awaited()
        self.assertTrue(session.planning_only)
        self.assertEqual(result['project']['title'], 'Deep minimal - 124 BPM')
        completed = next(e for e in events if e['type'] == 'action_completed')
        self.assertEqual(completed['project']['title'], 'Deep minimal - 124 BPM')
        self.assertEqual(main.chat_store.load(321, session.session_id)['project']['title'], 'Deep minimal - 124 BPM')
        self.assertEqual(main.chat_store.listing(321)[0]['title'], 'Deep minimal - 124 BPM')
        self.assertIn(identity.TOOL['name'], {t['name'] for t in client.messages.create.call_args.kwargs['tools']})

    async def test_manual_rename_is_protected_from_later_tempo_changes(self):
        session = main.ChatSession('manual-fixture', 322)
        session.project = new_project()
        main.chat_store.save(session, 'complete')
        result = await main.update_song_project(session.session_id, main.SongProjectRequest(title='My Track'), {'id': 322})
        updated = identity.refresh({**result['project'], 'genre': 'house', 'bpm': 120})
        self.assertEqual(updated['title'], 'My Track')
        self.assertEqual(updated['title_source'], 'user')

    async def test_read_only_legacy_backfill_is_owner_scoped_and_does_not_rewrite_files(self):
        session = main.ChatSession('legacy-title', 323)
        session.project = new_project()
        main.chat_store.save(session, 'complete')
        directory = main.chat_store.directory(323, session.session_id)
        before = (directory / 'state.json').read_bytes()
        production.save({'user_id': 323, 'session_id': session.session_id, 'genre': 'house', 'bpm': 122})
        self.assertEqual(main.chat_store.listing(323)[0]['title'], 'House - 122 BPM')
        self.assertEqual(main.chat_store.listing(324), [])
        self.assertEqual((directory / 'state.json').read_bytes(), before)
