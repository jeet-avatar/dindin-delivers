import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import main


class PendingEditTests(unittest.IsolatedAsyncioTestCase):
    async def test_pending_preview_does_not_lock_an_explicit_edit(self):
        session = main.ChatSession("edit", 42)
        session.pending_review = True
        session.messages = [{"role": "user", "content": "Change the hat panning"}]
        tool = SimpleNamespace(type="tool_use", name="set_track_pan", id="pan", input={"track": 1, "pan": 0.2})
        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(side_effect=[
            SimpleNamespace(stop_reason="tool_use", content=[tool]),
            SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text="Updated.")]),
        ])))
        with patch.object(main, "claude_client", client), patch.object(main, "_execute_tool", AsyncMock(return_value={"status": "verified"})) as execute, patch.object(main, "decide_recording") as decide:
            text, actions = await main._run_claude_loop(session, None)
        execute.assert_awaited_once_with("set_track_pan", {"track": 1, "pan": 0.2}, None)
        decide.assert_not_called()
        self.assertEqual(text, "Updated.")
        self.assertEqual(actions[0]["result"]["status"], "verified")
        self.assertIn("not a lock", client.messages.create.call_args.kwargs["system"][0]["text"])

    async def test_pending_edit_still_stops_after_failed_write(self):
        session = main.ChatSession("edit", 42)
        session.pending_review = True
        tools = [SimpleNamespace(type="tool_use", name="set_track_pan", id=str(i), input={"track": 1, "pan": 0.2}) for i in range(2)]
        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(side_effect=[
            SimpleNamespace(stop_reason="tool_use", content=tools),
            SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text="Stopped.")]),
        ])))
        with patch.object(main, "claude_client", client), patch.object(main, "_execute_tool", AsyncMock(return_value={"status": "failed", "summary": "Readback failed"})) as execute:
            _, actions = await main._run_claude_loop(session, None)
        self.assertEqual(execute.await_count, 1)
        self.assertIn("Skipped", actions[1]["result"]["summary"])
