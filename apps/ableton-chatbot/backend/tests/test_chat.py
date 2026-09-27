import asyncio
import json
import tempfile
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

import main
from security import bridge_token_owner, register_bridge_token, revoke_bridge_token


def response(*blocks):
    return SimpleNamespace(content=list(blocks), stop_reason="tool_use" if any(b.type == "tool_use" for b in blocks) else "end_turn")


def tool(name, identifier="action-1"):
    return SimpleNamespace(type="tool_use", name=name, id=identifier, input={})


class ChatTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        main.sessions.clear()
        main.bridges.clear()
        self.client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock()))
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.patches = [patch.object(main.chat_store, 'ROOT', Path(self.temp.name)), patch.object(main, "claude_client", self.client), patch.object(main, "rate_limit"), patch.object(main, "check_prompt_injection")]
        for p in self.patches:
            p.start()

    async def asyncTearDown(self):
        for p in reversed(self.patches):
            p.stop()
        main.sessions.clear()
        main.bridges.clear()

    async def test_never_select_another_users_bridge(self):
        main.bridges["other"] = main.BridgeConnection(Mock(), "other", 2)
        session, bridge = main.prepare_chat(main.ChatRequest(message="Inspect"), {"id": 1})
        self.assertIsNone(bridge)
        self.assertEqual(session.user_id, 1)

    async def test_session_owner_is_enforced(self):
        main.sessions["private"] = main.ChatSession("private", 2)
        with self.assertRaises(main.HTTPException) as context:
            main.prepare_chat(main.ChatRequest(message="Inspect", session_id="private"), {"id": 1})
        self.assertEqual(context.exception.status_code, 404)

    async def test_ambiguous_bridge_is_not_guessed(self):
        for name in ("a", "b"):
            main.bridges[name] = main.BridgeConnection(Mock(), name, 1)
        with self.assertRaises(main.HTTPException) as context:
            main.prepare_chat(main.ChatRequest(message="Inspect"), {"id": 1})
        self.assertEqual(context.exception.status_code, 409)

    async def test_busy_bridge_rejects_overlapping_production(self):
        bridge = main.BridgeConnection(Mock(), "b", 1)
        main.bridges["b"] = bridge
        async with bridge.lock:
            with self.assertRaises(main.HTTPException) as context:
                main.prepare_chat(main.ChatRequest(message="Inspect"), {"id": 1})
        self.assertEqual(context.exception.status_code, 409)

    async def test_failure_stops_dependent_batch_and_retains_evidence(self):
        session = main.ChatSession("s", 1)
        self.client.messages.create.side_effect = [response(tool("create_clip"), tool("add_notes", "action-2")),
                                                 response(SimpleNamespace(type="text", text="The clip could not be created."))]
        emit = AsyncMock()
        with patch.object(main, "_execute_tool", AsyncMock(return_value={"status": "failed", "error": "Occupied", "steps": []})) as execute:
            text, actions = await main._run_claude_loop(session, None, emit)
        self.assertEqual(execute.await_count, 1)
        self.assertEqual(len(actions), 2)
        self.assertIn("Skipped", actions[1]["result"]["summary"])
        self.assertTrue(session.messages[-1]["content"][0]["is_error"])
        self.assertEqual([call.args[0]["type"] for call in emit.await_args_list], ["action_started", "action_completed", "action_started", "action_completed"])

    async def test_cancelled_action_leaves_valid_tool_history(self):
        session = main.ChatSession("s", 1)
        self.client.messages.create.return_value = response(tool("add_notes"), tool("fire_clip", "action-2"))
        with patch.object(main, "_execute_tool", AsyncMock(side_effect=asyncio.CancelledError)):
            with self.assertRaises(asyncio.CancelledError):
                await main._run_claude_loop(session, None)
        results = session.messages[-1]["content"]
        self.assertEqual([r["tool_use_id"] for r in results], ["action-1", "action-2"])
        self.assertTrue(all(r["is_error"] for r in results))

    async def test_stream_emits_session_actions_then_complete(self):
        self.client.messages.create.side_effect = [response(tool("get_session_state")), response(SimpleNamespace(type="text", text="Inspected."))]
        with patch.object(main, "_execute_tool", AsyncMock(return_value={"status": "observed", "steps": []})):
            stream = await main.chat_stream(main.ChatRequest(message="Inspect"), {"id": 1})
            events = [json.loads(chunk) async for chunk in stream.body_iterator]
        self.assertEqual([e["type"] for e in events], ["session", "action_started", "action_completed", "complete"])
        self.assertEqual(events[-1]["response"], "Inspected.")

    async def test_stream_error_does_not_emit_completion(self):
        self.client.messages.create.side_effect = RuntimeError("test failure")
        with patch.object(main.log, "exception"):
            stream = await main.chat_stream(main.ChatRequest(message="Inspect"), {"id": 1})
            events = [json.loads(chunk) async for chunk in stream.body_iterator]
        self.assertEqual([e["type"] for e in events], ["session", "error"])
        self.assertFalse(next(iter(main.sessions.values())).lock.locked())

    async def test_bridge_pending_request_cleaned_on_disconnect(self):
        ws = SimpleNamespace(send_json=AsyncMock(side_effect=RuntimeError("disconnected")))
        bridge = main.BridgeConnection(ws, "b", 1)
        with self.assertRaises(RuntimeError):
            await bridge.send_command("/live/song/get/tempo", [], True)
        self.assertEqual(bridge.pending, {})

    async def test_bridge_token_has_owner(self):
        register_bridge_token("test-token", 42)
        self.assertEqual(bridge_token_owner("test-token"), 42)
        revoke_bridge_token("test-token")
        self.assertIsNone(bridge_token_owner("test-token"))

    async def test_restore_retains_every_turns_actions_and_timestamps(self):
        self.client.messages.create.side_effect = [
            response(tool('get_session_state', 'first')),
            response(SimpleNamespace(type='text', text='First inspection.')),
            response(tool('get_session_state', 'second')),
            response(SimpleNamespace(type='text', text='Second inspection.')),
        ]
        with patch.object(main, '_execute_tool', AsyncMock(return_value={'status': 'observed', 'steps': []})):
            first = await main.chat(main.ChatRequest(message='Inspect first'), None, user={'id': 1})
            main.sessions.clear()
            await main.chat(main.ChatRequest(message='Inspect again', session_id=first['session_id']), None, user={'id': 1})
        main.sessions.clear()
        saved = await main.chat_details(first['session_id'], {'id': 1})
        self.assertEqual(len(saved['messages']), 4)
        for index, action_id in [(1, 'first'), (3, 'second')]:
            self.assertEqual(saved['messages'][index]['toolCalls'][0]['id'], action_id)
            self.assertTrue(saved['messages'][index]['createdAt'])
        with self.assertRaises(main.HTTPException) as error:
            await main.chat_details(first['session_id'], {'id': 2})
        self.assertEqual(error.exception.status_code, 404)
        self.assertFalse((await main.chats_list({'id': 2}))['chats'])

    async def test_interrupted_turn_restores_without_replaying_action(self):
        # Resume a real pre-project conversation; new conversations cannot write yet.
        legacy = main.ChatSession('recover', 1)
        legacy.messages = [{'role': 'user', 'content': 'Continue my existing song'},
                           {'role': 'assistant', 'content': 'Ready to edit the existing part.'}]
        main.chat_store.save(legacy, 'complete')
        self.client.messages.create.return_value = response(tool('add_notes', 'interrupted'))
        with patch.object(main, '_execute_tool', AsyncMock(side_effect=asyncio.CancelledError)) as execute:
            with self.assertRaises(asyncio.CancelledError):
                await main.chat(main.ChatRequest(message='Add notes', session_id='recover'), None, user={'id': 1})
            saved = await main.chat_details('recover', {'id': 1})
            self.assertEqual(execute.await_count, 1)
        self.assertEqual(saved['status'], 'interrupted')
        self.assertEqual(saved['messages'][-1]['requestStatus'], 'interrupted')
        self.assertIn('no confirmed completion', saved['messages'][-1]['content'])
        self.assertEqual(saved['messages'][-1]['toolCalls'][0]['result']['status'], 'unverified')

    async def test_cross_chat_producer_lease_blocks_writes(self):
        with main.chat_store.acquire(1, '_production'):
            with self.assertRaises(main.HTTPException) as error:
                await main.chat(main.ChatRequest(message='Inspect', session_id='busy'), None, user={'id': 1})
        self.assertEqual(error.exception.status_code, 409)
        self.client.messages.create.assert_not_awaited()

    async def test_comparison_is_server_tool_and_stops_following_writes(self):
        session = main.ChatSession('compare', 1)
        self.client.messages.create.return_value = response(tool('compare_reference_sound'), tool('create_midi_track', 'write'))
        with patch.object(main.chat_tools, 'execute', AsyncMock(return_value={
            'status': 'observed', 'comparison': {'id': 'c', 'reference_id': 'r'},
        })) as compare, patch.object(main, '_execute_tool', AsyncMock()) as execute:
            _, actions = await main._run_claude_loop(session, None)
        compare.assert_awaited_once()
        execute.assert_not_awaited()
        self.assertEqual(actions[0]['result']['comparison']['id'], 'c')


if __name__ == "__main__":
    unittest.main()
