import asyncio
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import AsyncMock, Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bridge


class ConnectionRecoveryTests(unittest.IsolatedAsyncioTestCase):
    def client(self):
        return bridge.AbletonBridge('ws://127.0.0.1:1', 'test-only')

    async def test_arrangement_query_writes_delay_update_but_inspection_does_not(self):
        client = self.client()
        client.last_mutation_at = 0
        with patch.object(client, '_query_osc', AsyncMock(return_value={'status': 'ok'})), \
             patch.object(client, '_reply', AsyncMock()):
            for action in ('inspect', 'state', 'verify_section'):
                await client._execute_ws_message(json.dumps({'type': 'osc_query',
                    'address': '/live/beatmind/arrangement', 'args': [json.dumps({'action': action})]}))
                self.assertEqual(client.last_mutation_at, 0)
            await client._execute_ws_message(json.dumps({'type': 'osc_query',
                'address': '/live/beatmind/arrangement', 'args': [json.dumps({'action': 'place_clip'})]}))
            self.assertGreater(client.last_mutation_at, 0)
            self.assertTrue(client.update_is_busy())

    async def test_failed_hello_clears_socket_and_reports_disconnected(self):
        client = self.client()
        client.on_connection = Mock()
        ws = Mock(send=AsyncMock(side_effect=OSError('lost during hello')))
        manager = AsyncMock()
        manager.__aenter__.return_value = ws
        with patch.object(bridge.websockets, 'connect', return_value=manager):
            with self.assertRaises(OSError):
                await client._connect_websocket()
        self.assertIsNone(client.ws)
        client.on_connection.assert_called_once_with(False)

    async def test_command_failure_does_not_tear_down_connection(self):
        client = self.client()
        client.ws = Mock(send=AsyncMock())
        with patch.object(client, '_execute_ws_message', AsyncMock(side_effect=ValueError('bad command'))):
            await client._handle_ws_message(json.dumps({'type': 'batch', 'request_id': 'bad'}))
        response = json.loads(client.ws.send.call_args.args[0])
        self.assertEqual(response['request_id'], 'bad')
        self.assertEqual(response['status'], 'unverified')
        self.assertEqual(client.active_commands, 0)

    async def test_real_socket_stays_responsive_during_long_command(self):
        client = self.client()
        started, finish = asyncio.Event(), asyncio.Event()
        performed = []
        async def command(raw):
            message = json.loads(raw)
            performed.append(message['request_id'])
            started.set()
            await finish.wait()
            await client._reply(message['request_id'], {'status': 'verified'})
        result = asyncio.get_running_loop().create_future()
        async def server(ws):
            try:
                self.assertEqual(json.loads(await ws.recv())['type'], 'bridge_hello')
                await ws.send(json.dumps({'type': 'capture_part', 'request_id': 'record'}))
                await started.wait()
                for i in range(40):
                    await ws.send(json.dumps({'type': 'osc_send', 'request_id': str(i)}))
                await ws.send(json.dumps({'type': 'ping', 'request_id': 'health'}))
                replies = [json.loads(await asyncio.wait_for(ws.recv(), 2)) for _ in range(41)]
                self.assertEqual(sum(r.get('status') == 'unverified' for r in replies), 40)
                self.assertIn({'request_id': 'health', 'status': 'pong'}, replies)
                pong = await ws.ping()
                await asyncio.wait_for(pong, 1)
                finish.set()
                self.assertEqual(json.loads(await ws.recv())['status'], 'verified')
                await ws.close()
                result.set_result(True)
            except BaseException as error:
                result.set_exception(error)
        with patch.object(client, '_handle_ws_message', side_effect=command), \
             patch('local_separation.available', return_value=False):
            async with bridge.websockets.serve(server, '127.0.0.1', 0) as serving:
                client.server_url = f'ws://127.0.0.1:{serving.sockets[0].getsockname()[1]}'
                await asyncio.wait_for(client._connect_websocket(), 5)
                await result
        self.assertEqual(performed, ['record'], 'Busy writes must not be queued or replayed')

    async def test_disconnect_waits_for_operation_cleanup(self):
        client = self.client()
        started, restored = asyncio.Event(), asyncio.Event()
        async def command(raw):
            try:
                started.set()
                await asyncio.Event().wait()
            finally:
                await asyncio.sleep(0)
                restored.set()
        async def messages():
            yield json.dumps({'type': 'capture_part', 'request_id': 'one'})
            await started.wait()
        ws = Mock()
        ws.__aiter__ = Mock(return_value=messages())
        with patch.object(client, '_handle_ws_message', side_effect=command):
            await asyncio.wait_for(client._receive_commands(ws), 1)
        self.assertTrue(restored.is_set())

    async def test_audio_payload_above_old_one_megabyte_limit_keeps_connection(self):
        client = self.client()
        result = asyncio.get_running_loop().create_future()
        async def command(raw):
            message = json.loads(raw)
            self.assertEqual(len(message['wav_b64']), 2 * 1024 * 1024)
            await client._reply(message['request_id'], {'status': 'verified'})
        async def server(ws):
            try:
                await ws.recv()
                await ws.send(json.dumps({'type': 'import_audio', 'request_id': 'audio',
                                          'wav_b64': 'A' * (2 * 1024 * 1024)}))
                self.assertEqual(json.loads(await asyncio.wait_for(ws.recv(), 2))['status'], 'verified')
                result.set_result(True)
            except BaseException as error:
                result.set_exception(error)
        with patch.object(client, '_handle_ws_message', side_effect=command), \
             patch('local_separation.available', return_value=False):
            async with bridge.websockets.serve(server, '127.0.0.1', 0) as serving:
                client.server_url = f'ws://127.0.0.1:{serving.sockets[0].getsockname()[1]}'
                await asyncio.wait_for(client._connect_websocket(), 5)
                await result

    async def test_abrupt_disconnect_reconnects_without_replaying_command(self):
        client = self.client()
        performed, connections = [], []
        restored, reconnected = asyncio.Event(), asyncio.Event()
        async def command(raw):
            performed.append(json.loads(raw)['request_id'])
            try:
                await client._reply('started', {'status': 'observed'})
                await asyncio.Event().wait()
            finally:
                self.assertIsNone(client.ws)
                await asyncio.sleep(0.01)
                restored.set()
        async def server(ws):
            await ws.recv()
            connections.append(ws)
            if len(connections) == 1:
                await ws.send(json.dumps({'type': 'capture_part', 'request_id': 'only-once'}))
                await ws.recv()
                ws.transport.abort()
            else:
                self.assertTrue(restored.is_set())
                reconnected.set()
                await ws.wait_closed()
        transport = Mock()
        loop = asyncio.get_running_loop()
        with patch.object(loop, 'create_datagram_endpoint', AsyncMock(return_value=(transport, None))), \
             patch.object(client, '_handle_ws_message', side_effect=command), \
             patch('local_separation.available', return_value=False):
            async with bridge.websockets.serve(server, '127.0.0.1', 0) as serving:
                client.server_url = f'ws://127.0.0.1:{serving.sockets[0].getsockname()[1]}'
                task = asyncio.create_task(client.start())
                try:
                    await asyncio.wait_for(reconnected.wait(), 5)
                finally:
                    await client.stop()
                    await asyncio.wait_for(task, 2)
        self.assertEqual(performed, ['only-once'])

    async def test_clean_close_backs_off_and_stop_interrupts_wait(self):
        client = self.client()
        connected = asyncio.Event()
        async def connect():
            connected.set()
        transport = Mock()
        loop = asyncio.get_running_loop()
        with patch.object(loop, 'create_datagram_endpoint', AsyncMock(return_value=(transport, None))), \
             patch.object(client, '_connect_websocket', AsyncMock(side_effect=connect)) as connect_mock:
            task = asyncio.create_task(client.start())
            await connected.wait()
            await asyncio.sleep(0.01)
            self.assertEqual(connect_mock.await_count, 1)
            await client.stop()
            await asyncio.wait_for(task, 0.2)
        self.assertFalse(client.running)
        transport.close.assert_called()
