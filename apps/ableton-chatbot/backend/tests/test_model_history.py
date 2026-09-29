import unittest
from types import SimpleNamespace
from model_history import bounded_history, encoded_size, HistoryBudgetError
from ai_provider import failure_message
import anthropic
import httpx
import json
from unittest.mock import AsyncMock, patch


class ModelHistoryTests(unittest.TestCase):
    def test_large_current_tool_result_is_compacted_without_mutating_audit(self):
        result = {"status": "partial", "summary": "Notes may already be applied", "steps": [{"args": "x" * 1000}] * 1000,
                  "notes": [{"pitch": 36, "start": i} for i in range(1000)]}
        history = [{"role": "user", "content": "Continue the arrangement without recreating parts"},
                   {"role": "assistant", "content": [{"type": "tool_use", "id": "notes", "name": "add_notes", "input": {"track": 1, "scene": 0}}]},
                   {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "notes", "is_error": True, "content": json.dumps(result)}]}]
        compact = bounded_history(history, 4000)
        self.assertLess(encoded_size(compact), 4000)
        saved = json.loads(compact[-1]["content"][0]["content"])
        self.assertEqual(saved["status"], "partial")
        self.assertTrue(compact[-1]["content"][0]["is_error"])
        self.assertTrue(saved["notes"]["truncated"])
        self.assertEqual(len(json.loads(history[-1]["content"][0]["content"])["steps"]), 1000)

    def test_checkpoint_keeps_all_action_ids_and_latest_complete_pair(self):
        history = [{"role": "user", "content": "Finish the arrangement"}]
        for i in range(12):
            history.extend([{"role": "assistant", "content": [{"type": "tool_use", "id": str(i), "name": "create_scene", "input": {"index": -1, "fixture": "x" * 2000}}]},
                            {"role": "user", "content": [{"type": "tool_result", "tool_use_id": str(i), "content": json.dumps({"status": "verified", "summary": "Created scene"})}]}])
        compact = bounded_history(history, 8000)
        self.assertLessEqual(encoded_size(compact), 8000)
        ledger = json.loads(compact[1]["content"].split("\n", 1)[1])
        self.assertEqual([entry["id"] for entry in ledger], [str(i) for i in range(12)])
        self.assertTrue(all(entry["status"] == "verified" for entry in ledger))
        self.assertEqual(compact[2]["content"][0]["type"], "tool_use")
        self.assertEqual(compact[-1]["content"][0]["tool_use_id"], "11")
    def test_small_history_is_unchanged(self):
        messages = [{"role": "user", "content": "Inspect"}]
        self.assertIs(bounded_history(messages), messages)

    def test_long_history_keeps_latest_request_and_complete_tool_pairs(self):
        old = [{"role": "user", "content": "Old request"}, {"role": "assistant", "content": "Large prior log " * 20000}]
        current = [{"role": "user", "content": "Create the requested arrangement"},
                   {"role": "assistant", "content": [SimpleNamespace(type="tool_use", id="check", name="get_session_state", input={})]},
                   {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "check", "content": "Observed"}]}]
        messages = old + current
        bounded = bounded_history(messages, 2000)
        self.assertEqual(bounded[1:], current[1:])
        self.assertTrue(bounded[0]["content"].endswith("\n\nCreate the requested arrangement"))
        self.assertIn("[user] Old request", bounded[0]["content"])  # words kept, the huge log is not
        self.assertNotIn("Large prior log", bounded[0]["content"])
        self.assertEqual(len(messages), 5)

    def test_approved_plan_text_survives_when_its_turn_is_dropped(self):
        plan = "Plan: T1 drums EQ low cut 30 to 350 Hz over bars 3-4. Shall I build this plan exactly as written?"
        def turn(request, i):
            return [{"role": "user", "content": request},
                    {"role": "assistant", "content": [SimpleNamespace(type="text", text=f"Working on step {i}"),
                                                      SimpleNamespace(type="tool_use", id=f"t{i}", name="write_clip_automation", input={"track": i})]},
                    {"role": "user", "content": [{"type": "tool_result", "tool_use_id": f"t{i}", "content": json.dumps({"status": "verified", "data": "z" * 3000})}]},
                    {"role": "assistant", "content": f"Step {i} done. " + "Details of the move. " * 20}]
        messages = [{"role": "user", "content": "Make the arrangement"}, {"role": "assistant", "content": plan}]
        for i in range(40):
            messages += turn("Yes, build this plan exactly as written." if i == 0 else "Yes, continue." if i == 30 else f"Continue {i}", i)
        bounded = bounded_history(messages, 20000)
        self.assertLessEqual(encoded_size(bounded), 20000)
        self.assertNotEqual(bounded[1].get("content"), plan)  # the plan's own turn was dropped
        self.assertTrue(bounded[-1]["content"].startswith("Step 39 done."))
        self.assertIn(plan, bounded[0]["content"])
        self.assertIn("[user] Yes, build this plan exactly as written.", bounded[0]["content"])
        self.assertNotIn("zzzz", bounded[0]["content"])
        self.assertTrue(bounded[0]["content"].endswith("\n\nContinue %d" % next(i for i in range(40) if f"Continue {i}" == bounded[0]["content"].split("\n\n")[-1])))

    def test_recent_complete_turns_survive(self):
        recent = [{"role": "user", "content": "Use my selected pack"}, {"role": "assistant", "content": "Inspected"}, {"role": "user", "content": "Continue"}]
        self.assertEqual(bounded_history([{"role": "user", "content": "x" * 10000}] + recent, 1000), recent)

    def test_oversized_current_turn_preserves_evidence_and_fails(self):
        with self.assertRaises(HistoryBudgetError):
            bounded_history([{"role": "user", "content": "Current"}, {"role": "assistant", "content": "x" * 5000}], 1000)

    def test_utf8_budget_and_invalid_configuration(self):
        self.assertGreater(encoded_size([{"role": "user", "content": "\u4e00" * 20}]), 60)
        with self.assertRaises(HistoryBudgetError):
            bounded_history([], 0)

    def test_context_error_is_not_configuration_error(self):
        error = anthropic.BadRequestError("too long", response=httpx.Response(400, request=httpx.Request("POST", "https://example.com")), body={"message": "prompt is too long: 200636 tokens > 200000 maximum"})
        self.assertIn("context limit", failure_message(error, False))
        self.assertNotIn("configuration", failure_message(error, False))
        self.assertIn("No Ableton actions", failure_message(error, False))
        self.assertIn("Some actions may already", failure_message(HistoryBudgetError(), True))


class HistoryContinuationTests(unittest.IsolatedAsyncioTestCase):
    async def test_compaction_does_not_reexecute_a_completed_action(self):
        import main
        session = main.ChatSession("test-history", 1)
        session.messages = [{"role": "user", "content": "Inspect once"}]
        tool = SimpleNamespace(type="tool_use", id="inspection", name="get_session_state", input={})
        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(side_effect=[
            SimpleNamespace(content=[tool], stop_reason="tool_use"),
            SimpleNamespace(content=[SimpleNamespace(type="text", text="Inspection complete")], stop_reason="end_turn") ])))
        result = {"status": "observed", "steps": [{"args": "x" * 1000}] * 1000}
        with patch.object(main, "claude_client", client), patch.object(main, "_execute_tool", AsyncMock(return_value=result)) as execute, patch.dict("os.environ", {"BEATMIND_HISTORY_MAX_BYTES": "4000"}):
            text, actions = await main._run_claude_loop(session, None)
        execute.assert_awaited_once()
        self.assertEqual(text, "Inspection complete")
        self.assertEqual(len(actions[0]["result"]["steps"]), 1000)
        self.assertLess(encoded_size(client.messages.create.call_args.kwargs["messages"]), 4000)
