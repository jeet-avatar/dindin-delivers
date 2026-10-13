import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import WebSocketDisconnect
import main


class BridgeDisconnectTests(unittest.IsolatedAsyncioTestCase):
    def connection(self, error=None):
        socket = AsyncMock()
        socket.send_json.side_effect = error
        return main.BridgeConnection(socket, 'disconnect-test', 42)

    async def test_closed_socket_is_unverified_for_every_request_type(self):
        for error in [WebSocketDisconnect(1006), OSError('connection lost'),
                      RuntimeError("Unexpected ASGI message 'websocket.send', after sending 'websocket.close' or response already completed.")]:
            for kind in ('command', 'batch', 'local'):
                with self.subTest(error=type(error).__name__, kind=kind):
                    bridge = self.connection(error)
                    with patch.dict(main.bridges, {bridge.session_id: bridge}, clear=True):
                        if kind == 'command':
                            result = await bridge.send_command('/live/clip/fire', [0, 0])
                        elif kind == 'batch':
                            result = (await bridge.send_batch([]))[0]
                        else:
                            result = await bridge.local_operation('capture_part', {})
                        self.assertEqual(result['status'], 'unverified')
                        self.assertIn('No commands were replayed', result['summary'])
                        self.assertNotIn(bridge.session_id, main.bridges)
                        self.assertEqual(bridge.pending, {})
                        await bridge.send_command('/live/clip/fire', [0, 0])
                        bridge.ws.send_json.assert_awaited_once()

    async def test_disconnect_resolves_inflight_requests_and_preserves_new_connection(self):
        bridge = self.connection()
        tasks = [asyncio.create_task(bridge.send_command('/live/song/get/tempo', [], True)),
                 asyncio.create_task(bridge.local_operation('capture_part', {})),
                 asyncio.create_task(bridge.send_batch([]))]
        await asyncio.sleep(0)
        replacement = self.connection()
        with patch.dict(main.bridges, {bridge.session_id: replacement}, clear=True):
            bridge.disconnect()
            self.assertIs(main.bridges[bridge.session_id], replacement)
        results = await asyncio.wait_for(asyncio.gather(*tasks), 1)
        self.assertEqual([r[0]['status'] if isinstance(r, list) else r['status'] for r in results],
                         ['unverified'] * 3)
        self.assertFalse(bridge.pending)

    async def test_batch_cancellation_cleans_pending_request(self):
        bridge = self.connection()
        task = asyncio.create_task(bridge.send_batch([]))
        await asyncio.sleep(0)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertFalse(bridge.pending)

    async def test_unrelated_programming_error_is_not_hidden(self):
        bridge = self.connection(RuntimeError('unexpected application bug'))
        with self.assertRaisesRegex(RuntimeError, 'application bug'):
            await bridge.send_command('/live/song/get/tempo', [], True)
        self.assertFalse(bridge.disconnected)
        self.assertFalse(bridge.pending)

    async def test_batch_completion_cleans_pending_request(self):
        bridge = self.connection()
        async def reply(message):
            bridge.handle_response({'request_id': message['request_id'], 'results': [{'status': 'ok'}]})
        bridge.ws.send_json.side_effect = reply
        self.assertEqual(await bridge.send_batch([]), [{'status': 'ok'}])
        self.assertFalse(bridge.pending)

    async def test_background_inspection_cannot_overlap_music_command(self):
        bridge = self.connection()
        first = asyncio.create_task(bridge.local_operation('live_set', {'operation': 'inspect'}))
        await asyncio.sleep(0)
        second = asyncio.create_task(bridge.send_command('/live/clip/fire', [0, 0]))
        await asyncio.sleep(0)
        bridge.ws.send_json.assert_awaited_once()
        request = bridge.ws.send_json.call_args.args[0]
        bridge.handle_response({'request_id': request['request_id'], 'status': 'observed'})
        await first
        await asyncio.sleep(0)
        self.assertEqual(bridge.ws.send_json.await_count, 2)
        request = bridge.ws.send_json.call_args.args[0]
        bridge.handle_response({'request_id': request['request_id'], 'status': 'sent'})
        self.assertEqual((await second)['status'], 'sent')

    async def test_cancelled_waiting_request_is_never_sent_later(self):
        bridge = self.connection()
        async with bridge.operation_lock:
            task = asyncio.create_task(bridge.send_command('/live/clip/fire', [0, 0]))
            await asyncio.sleep(0)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
        bridge.ws.send_json.assert_not_awaited()
        self.assertFalse(bridge.pending)
