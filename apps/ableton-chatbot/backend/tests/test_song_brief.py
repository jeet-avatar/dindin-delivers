import json
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from song_brief import brief_context
from model_history import HistoryBudgetError
import production


class SongBriefTests(unittest.TestCase):
    def test_all_pieces_preserve_exact_full_brief_and_order(self):
        text = 'Intro 1-16; kick dry; ' * 350 + 'Outro 113-128; no vocals.'
        note = brief_context([{'role': 'user', 'content': text}])
        data = json.loads(note.split('\n', 3)[3].split('\nRead every piece', 1)[0])
        self.assertEqual(''.join(piece['text'] for piece in data[0]['pieces']), text)
        self.assertGreater(len(data[0]['pieces']), 1)
        self.assertIn('not separate commands', note)
        self.assertIn('Later user corrections', note)

    def test_assistant_guesses_and_tool_data_are_not_user_briefs(self):
        note = brief_context([{'role': 'user', 'content': 'Minimal techno'},
                              {'role': 'assistant', 'content': 'Invented plan ' * 1000},
                              {'role': 'user', 'content': [{'type': 'tool_result', 'content': 'x' * 3000}]}])
        self.assertNotIn('Invented plan', note)
        self.assertNotIn('tool_result', note)

    def test_budget_fails_explicitly_instead_of_truncating(self):
        with self.assertRaises(HistoryBudgetError):
            brief_context([{'role': 'user', 'content': '\u4e00' * 4000}], max_bytes=3000)

    def test_short_corrections_and_repeated_changes_keep_chronology(self):
        requests = ['Use vocals in the breakdown. ' * 50, 'No vocals', 'Use vocals in the breakdown. ' * 50]
        note = brief_context([{'role': 'user', 'content': text} for text in requests])
        data = json.loads(note.split('\n', 3)[3].split('\nRead every piece', 1)[0])
        self.assertEqual([''.join(piece['text'] for piece in brief['pieces']) for brief in data], requests)

    def test_structure_effects_saved_without_claiming_execution(self):
        data = dict(title='Minimal', genre='minimal techno', bpm=124, key='A minor',
                    scope='session_sections', assumptions=[],
                    parts=[dict(role='Kick', source_kind='instrument', source='Discovered Kick',
                                sound='Dry and clean', bars=4, effects_intent='No reverb',
                                automation_intent='Filter opens only during build')],
                    sections=[dict(name='Intro', start_bar=1, bars=16, intent='Sparse kick'),
                              dict(name='Build', start_bar=17, bars=16, intent='Introduce hats')])
        with tempfile.TemporaryDirectory() as root, patch.object(production, 'ROOT', __import__('pathlib').Path(root)):
            result = production.create_plan(1, 'song', data)
            self.assertEqual(result['status'], 'observed')
            saved = production.get_plan(1, 'song')
            self.assertEqual(saved['sections'], data['sections'])
            self.assertEqual(saved['parts'][0]['status'], 'planned')
            data['sections'][1]['start_bar'] = 16
            self.assertEqual(production.create_plan(1, 'other', data)['status'], 'failed')


class BriefModelTests(unittest.IsolatedAsyncioTestCase):
    async def test_full_original_brief_reaches_model_after_history_trimming(self):
        import main
        session = main.ChatSession('brief-test', 1)
        text = 'Intro then rolling bass and dry kick. ' * 150 + 'Outro: remove bass at bar 113.'
        session.messages = [{'role': 'user', 'content': text},
                            {'role': 'assistant', 'content': 'Old details ' * 2000},
                            {'role': 'user', 'content': 'Continue with hats, not another kick'}]
        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(return_value=SimpleNamespace(
            content=[SimpleNamespace(type='text', text='Next: hats; bass out at bar 113.')], stop_reason='end_turn'))))
        with patch.object(main, 'claude_client', client), patch.dict('os.environ', {'BEATMIND_HISTORY_MAX_BYTES': '2000'}):
            await main._run_claude_loop(session, None)
        sent = client.messages.create.call_args.kwargs
        self.assertIn('Outro: remove bass at bar 113.', sent['system'][0]['text'])
        self.assertIn('Continue with hats', json.dumps(sent['messages']))
