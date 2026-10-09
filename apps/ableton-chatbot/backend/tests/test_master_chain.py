import json
import unittest
from unittest.mock import AsyncMock

import master_chain


def curve(low=-24.0, high=6.0, count=101):
    return {"min": low, "max": high, "displays": [f"{low + (high - low) * i / (count - 1):.1f} dB" for i in range(count)]}


class MasterChainTests(unittest.IsolatedAsyncioTestCase):
    async def test_loads_limiter_when_missing_then_sets_ceiling_and_gain(self):
        # apply() queries /live/beatmind/master/devices THREE times when it has to load the Limiter:
        # once at the top, once after load() to refresh the device list, and once more while building
        # the final "master" dict in its return statement — the fake must supply all three replies.
        devices_calls = [[], ["EQ Eight", "Limiter"], ["EQ Eight", "Limiter"]]
        async def query(address, args):
            if address == "/live/beatmind/master/devices":
                return devices_calls.pop(0)
            if address == "/live/beatmind/master/load":
                return ["loaded"]
            if address == "/live/beatmind/master/parameters":
                return [args[0], json.dumps({"parameters": [{"name": "Ceiling"}, {"name": "Gain"}]})]
            if address == "/live/beatmind/master/curve":
                return ["ok", json.dumps(curve())]
            if address == "/live/beatmind/master/set":
                return ["ok", None, "-1.0 dB"]
            raise AssertionError(address)
        send = AsyncMock()
        result = await master_chain.apply(query, send, measured_lufs=-20.0, target_lufs=-14.0, ceiling_dbtp=-1.0)
        self.assertEqual(result["status"], "verified")
        self.assertIn("Loaded Limiter", result["summary"])

    async def test_limiter_not_last_fails(self):
        async def query(address, args):
            if address == "/live/beatmind/master/devices":
                return ["Limiter", "EQ Eight"]
            raise AssertionError(address)
        result = await master_chain.apply(query, AsyncMock(), measured_lufs=-20.0)
        self.assertEqual(result["status"], "failed")
        self.assertIn("must be the last device", result["summary"])

    async def test_gain_clamped_to_zero_when_already_loud_enough(self):
        async def query(address, args):
            if address == "/live/beatmind/master/devices":
                return ["Limiter"]
            if address == "/live/beatmind/master/parameters":
                return [args[0], json.dumps({"parameters": [{"name": "Ceiling"}, {"name": "Gain"}]})]
            if address == "/live/beatmind/master/curve":
                return ["ok", json.dumps(curve())]
            if address == "/live/beatmind/master/set":
                return ["ok", None, "0.0 dB"]
            raise AssertionError(address)
        result = await master_chain.apply(query, AsyncMock(), measured_lufs=-10.0, target_lufs=-14.0)
        self.assertEqual(result["master"]["gain_db"], 0.0)
        self.assertIn("already at or above", result["summary"])
