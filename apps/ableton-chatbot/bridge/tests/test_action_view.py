import asyncio
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bridge
import live_set


class ViewQueryTests(unittest.IsolatedAsyncioTestCase):
    async def test_locked_or_ambiguous_document_does_not_send_osc(self):
        target = SimpleNamespace(_send_osc=Mock(), pending_queries={})
        with patch.object(bridge.sys, "platform", "darwin"), \
             patch.object(live_set, "window_title", AsyncMock(side_effect=RuntimeError("Your Mac is locked."))):
            result = await bridge.AbletonBridge._query_osc(target, "test", "/live/beatmind/focus_view", [], 1)
        self.assertEqual(result["status"], "failed")
        self.assertIn("locked", result["summary"])
        target._send_osc.assert_not_called()
        self.assertEqual(target.pending_queries, {})

    async def test_visible_document_is_attested_only_after_osc_response(self):
        target = SimpleNamespace(pending_queries={})
        def send(address, args):
            asyncio.get_running_loop().call_soon(target.pending_queries[address].future.set_result, (address, ['{}']))
        target._send_osc = send
        with patch.object(bridge.sys, "platform", "darwin"), \
             patch.object(live_set, "window_title", AsyncMock(return_value="Fixture Set")):
            result = await bridge.AbletonBridge._query_osc(target, "test", "/live/beatmind/inspect_view", [], 1)
        self.assertTrue(result["display_window_checked"])
        self.assertEqual(result["status"], "ok")
        self.assertEqual(target.pending_queries, {})
