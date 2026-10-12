import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import main


class BridgeStatusTests(unittest.IsolatedAsyncioTestCase):
    async def test_connection_check_does_not_wait_for_ableton(self):
        bridge = SimpleNamespace(user_id=7, version="fixture", local_operation=AsyncMock())
        with patch.dict(main.bridges, {"mine": bridge}, clear=True):
            result = await main.bridge_status({"id": 7}, include_live_set=False)
        self.assertTrue(result["bridge_connected"])
        bridge.local_operation.assert_not_awaited()

    async def test_live_set_inspection_remains_available(self):
        bridge = SimpleNamespace(user_id=7, version="fixture", local_operation=AsyncMock(
            return_value={"status": "observed", "title": "Current Song"}))
        with patch.dict(main.bridges, {"mine": bridge}, clear=True):
            result = await main.bridge_status({"id": 7})
        self.assertEqual(result["live_set"], "Current Song")
        bridge.local_operation.assert_awaited_once()

    async def test_other_accounts_bridge_is_not_reported(self):
        bridge = SimpleNamespace(user_id=8, local_operation=AsyncMock())
        with patch.dict(main.bridges, {"other": bridge}, clear=True):
            result = await main.bridge_status({"id": 7}, include_live_set=False)
        self.assertFalse(result["bridge_connected"])
        bridge.local_operation.assert_not_awaited()
