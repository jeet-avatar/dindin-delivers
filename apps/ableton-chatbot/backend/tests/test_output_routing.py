import unittest

from claude_tools import SYSTEM_PROMPT
from execution import execute_verified
from test_execution import LiveDouble


class OutputRoutingTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.live = LiveDouble()
        self.live.values.update({
            '/live/track/get/available_output_routing_types': ['Main', 'Group'],
            '/live/track/get/output_routing_type': ['No Output'],
            '/live/track/get/available_output_routing_channels': ['1/2', '3/4'],
            '/live/track/get/output_routing_channel': ['1/2'],
        })

    async def run_tool(self, **data):
        return await execute_verified('set_track_output_routing', {'track': 0, **data}, self.live.send)

    async def test_read_only_choices_and_verified_destination_channel(self):
        result = await execute_verified('get_track_output_routing', {'track': 0}, self.live.send)
        self.assertEqual(result['status'], 'observed')
        self.assertTrue(all(call[2] for call in self.live.calls))
        result = await self.run_tool(destination='Main', channel='3/4')
        self.assertEqual(result['status'], 'verified', result)
        self.assertEqual(result['channel'], '3/4')
        self.assertEqual(sum(not call[2] for call in self.live.calls), 2)

    async def test_missing_or_ambiguous_destination_never_writes(self):
        for choices in (['Group'], ['Main', 'Main']):
            self.live.values['/live/track/get/available_output_routing_types'] = choices
            result = await self.run_tool(destination='Main')
            self.assertEqual(result['status'], 'failed')
        self.assertTrue(all(call[2] for call in self.live.calls))

    async def test_same_route_is_idempotent(self):
        self.live.values['/live/track/get/output_routing_type'] = ['Main']
        result = await self.run_tool(destination='Main', channel='1/2')
        self.assertEqual(result['status'], 'verified')
        self.assertTrue(all(call[2] for call in self.live.calls))

    async def test_invalid_channel_after_destination_change_is_partial(self):
        result = await self.run_tool(destination='Main', channel='Unavailable')
        self.assertEqual(result['status'], 'partial')
        writes = [c[0] for c in self.live.calls if not c[2]]
        self.assertEqual(writes, ['/live/track/set/output_routing_type'])

    async def test_lost_readback_does_not_repeat_write(self):
        send = self.live.send

        async def lose_readback(address, args, query=False, timeout=5):
            result = await send(address, args, query, timeout)
            if address == '/live/track/set/output_routing_type':
                self.live.fail_address = '/live/track/get/output_routing_type'
            return result

        result = await execute_verified('set_track_output_routing', {'track': 0, 'destination': 'Main'}, lose_readback)
        self.assertEqual(result['status'], 'partial')
        self.assertEqual(sum(not c[2] for c in self.live.calls), 1)

    async def test_stale_track_is_rejected_before_routing(self):
        result = await execute_verified('set_track_output_routing', {'track': 12, 'destination': 'Main'}, self.live.send)
        self.assertEqual(result['status'], 'failed')
        self.assertEqual(len(self.live.calls), 1)

    def test_production_instructions_use_tools_and_do_not_assume_empty_midi_is_broken(self):
        self.assertIn('Do not tell them to drag a kit', SYSTEM_PROMPT)
        self.assertIn('Load its instrument first', SYSTEM_PROMPT)
        self.assertIn("THIS turn's tool definitions", SYSTEM_PROMPT)
