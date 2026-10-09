import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import main


class DiscussionTests(unittest.IsolatedAsyncioTestCase):
    async def run_tool(self, name):
        session = main.ChatSession("discussion", 123)
        session.planning_only = True
        session.messages = [{"role": "user", "content": "What should we do next?"}]
        call = SimpleNamespace(type="tool_use", name=name, id="test", input={})
        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(side_effect=[
            SimpleNamespace(stop_reason="tool_use", content=[call]),
            SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text="Which part next?")]),
        ])))
        with patch.object(main, "claude_client", client), patch.object(main, "_execute_tool", AsyncMock(return_value={"status": "observed"})) as execute:
            _, actions = await main._run_claude_loop(session, None)
        offered = {tool['name'] for tool in client.messages.create.call_args.kwargs['tools']}
        self.assertNotIn('audition_part', offered)
        self.assertNotIn('create_audio_track', offered)
        self.assertNotIn('fire_scene', offered)
        return execute, actions

    async def test_discussion_blocks_model_playback_even_if_requested_by_model(self):
        for name in ('audition_part', 'fire_scene', 'start_playback', 'load_effect', 'set_device_control', 'create_audio_track', 'create_production_plan'):
            with self.subTest(name=name):
                execute, actions = await self.run_tool(name)
                execute.assert_not_awaited()
                self.assertEqual(actions[0]['result']['status'], 'failed')
                self.assertIn('Discussion only', actions[0]['result']['summary'])

    async def test_discussion_allows_read_only_inspection(self):
        execute, actions = await self.run_tool('get_session_state')
        execute.assert_awaited_once_with('get_session_state', {}, None)
        self.assertEqual(actions[0]['result']['status'], 'observed')

    def test_ordinary_requests_are_not_silently_changed_to_discussion(self):
        self.assertFalse(main.ChatRequest(message='Add a hat').planning_only)
        self.assertTrue(main.ChatRequest(message='Which hat?', planning_only=True).planning_only)
