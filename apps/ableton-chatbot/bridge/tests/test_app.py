import asyncio
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bridge_app
import bridge


class BridgeAppTests(unittest.TestCase):
    def setUp(self):
        with patch.object(bridge_app, 'load_config', return_value={}), \
             patch.object(bridge_app.credentials, 'load', return_value=None), \
             patch.object(bridge_app.updater, 'clean_previous'):
            self.app = bridge_app.BeatMindBridgeApp()
        self.app.closing = False
        for target, name in ((bridge_app, 'save_config'), (bridge_app.credentials, 'save'),
                             (bridge_app.credentials, 'forget'), (bridge_app.updater, 'check')):
            patcher = patch.object(target, name, return_value=None)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.app.root.title('BeatMind Bridge - UI test')
        self.app.root.update()
        self.app.root.focus_force()

    def tearDown(self):
        self.app.closing = True
        self.app.root.destroy()

    def test_idle_and_disabled_contrast(self):
        self.assertEqual(self.app.connect_btn.cget('text'), "Let's make music")
        for states in ((), ('active',), ('pressed',), ('disabled',)):
            foreground = self.app.style.lookup('Music.TButton', 'foreground', states)
            background = self.app.style.lookup('Music.TButton', 'background', states)
            def luminance(color):
                channels = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
                linear = [c / 12.92 if c <= 0.04045 else ((c + .055) / 1.055) ** 2.4 for c in channels]
                return sum(x * y for x, y in zip(linear, (.2126, .7152, .0722)))
            a, b = sorted((luminance(foreground), luminance(background)))
            self.assertGreaterEqual((b + .05) / (a + .05), 4.5)

    def test_success_clears_password_and_focuses_music_button(self):
        self.app.password_var.set('fixture-only')
        self.app.password_entry.focus_set()
        self.app._on_connected()
        self.app.root.update()
        self.assertEqual(self.app.password_var.get(), '')
        self.assertEqual(self.app.root.focus_get(), self.app.connect_btn)
        self.assertEqual(self.app.password_entry.cget('state'), 'disabled')
        self.assertEqual(self.app.status_label.cget('text'), 'Connected to BeatMind')
        self.assertTrue(self.app.disconnect_btn.winfo_ismapped())
        for widget in (self.app.connect_btn, self.app.disconnect_btn):
            self.assertGreater(widget.winfo_width(), 80)
            self.assertLessEqual(widget.winfo_rootx() + widget.winfo_width(),
                                 self.app.root.winfo_rootx() + self.app.root.winfo_width())

    def test_connected_music_button_opens_chat_not_disconnect(self):
        self.app._on_connected()
        with patch.object(bridge_app.webbrowser, 'open') as browser:
            self.app.connect_btn.invoke()
            browser.assert_called_once_with('https://www.beatmind.io/dashboard')
        self.assertTrue(self.app.connected)

    def test_manual_disconnect_keeps_sign_in_for_reconnect(self):
        self.app.bridge_token = 'fixture-token'
        self.app._on_connected()
        self.app._on_disconnected()
        self.app.root.update()
        self.assertEqual(self.app.email_entry.cget('state'), 'disabled')
        self.assertEqual(self.app.password_entry.cget('state'), 'disabled')
        self.assertTrue(self.app.sign_out_btn.winfo_ismapped())
        with patch.object(self.app, '_resume') as resume, patch.object(self.app, '_connect') as login:
            self.app.connect_btn.invoke()
        resume.assert_called_once_with('fixture-token')
        login.assert_not_called()

    def test_signed_out_button_uses_login(self):
        self.app.bridge_token = None
        self.app._on_disconnected()
        with patch.object(self.app, '_resume') as resume, patch.object(self.app, '_connect') as login:
            self.app.connect_btn.invoke()
        login.assert_called_once()
        resume.assert_not_called()
        self.assertEqual(self.app.email_entry.cget('state'), 'normal')

    def test_initial_window_fits_setup_and_footer(self):
        self.assertGreaterEqual(self.app.root.winfo_height(), self.app.root.winfo_reqheight())

    def test_login_is_single_flight_and_preserves_password_spaces(self):
        self.app.email_var.set('fixture@example.invalid')
        self.app.password_var.set(' fixture-only ')
        self.app.remember_var.set(False)
        with patch.object(bridge_app.threading, 'Thread') as thread:
            self.app._connect()
            self.app._connect()
        thread.assert_called_once()
        self.assertEqual(thread.call_args.kwargs['args'][1], ' fixture-only ')
        self.assertTrue(self.app.busy)
        self.assertTrue(self.app.connect_btn.instate(['disabled']))

    def test_failed_login_restores_label_and_focus(self):
        self.app.busy = True
        self.app._login_failed('Email or password incorrect')
        self.app.root.update()
        self.assertFalse(self.app.busy)
        self.assertEqual(self.app.root.focus_get(), self.app.connect_btn)
        self.assertEqual(self.app.connect_btn.cget('text'), bridge_app.START_LABEL)

    def test_reconnect_is_not_shown_as_connected(self):
        self.app._on_connected()
        self.app.bridge = SimpleNamespace(running=True)
        self.app._connection_changed(False)
        self.assertFalse(self.app.connected)
        self.assertTrue(self.app.busy)
        self.assertTrue(self.app.connect_btn.instate(['disabled']))
        self.app._on_disconnected()
        self.app.root.update()
        self.assertEqual(self.app.connect_btn.cget('text'), bridge_app.START_LABEL)
        self.assertEqual(self.app.password_entry.cget('state'), 'normal')
        self.assertFalse(self.app.disconnect_btn.winfo_ismapped())


class ConnectionEventsTests(unittest.IsolatedAsyncioTestCase):
    async def test_connection_is_announced_only_after_socket_hello(self):
        events = []
        socket = Mock()
        socket.send = AsyncMock(side_effect=lambda message: events.append('hello'))
        socket.__aiter__ = Mock(return_value=self.empty_messages())
        connection = AsyncMock()
        connection.__aenter__.return_value = socket
        client = bridge.AbletonBridge('wss://example.invalid/ws', 'fixture', on_connection=events.append)
        with patch.object(bridge.websockets, 'connect', return_value=connection), \
             patch.object(client, '_query_osc', AsyncMock(return_value={'status': 'timeout'})):
            await client._connect_websocket()
        self.assertEqual(events, ['hello', True, False])
        self.assertIsNone(client.ws)
        import json
        self.assertNotIn('verified_view_v1', json.loads(socket.send.call_args.args[0])['capabilities'])

    async def test_new_capabilities_require_live_extension_confirmation(self):
        import json
        socket = Mock(send=AsyncMock())
        socket.__aiter__ = Mock(return_value=self.empty_messages())
        connection = AsyncMock()
        connection.__aenter__.return_value = socket
        client = bridge.AbletonBridge('wss://example.invalid/ws', 'fixture')
        confirmed = ['verified_view_v1', 'arrangement_audition_v1', 'automation_readback_v2']
        with patch.object(bridge.websockets, 'connect', return_value=connection), \
             patch.object(bridge.sys, 'platform', 'darwin'), \
             patch.object(client, '_query_osc', AsyncMock(return_value={'status': 'ok', 'args': confirmed})):
            await client._connect_websocket()
        self.assertTrue(set(confirmed) <= set(json.loads(socket.send.call_args.args[0])['capabilities']))

    async def empty_messages(self):
        if False:
            yield None

    async def test_handshake_failure_never_announces_connected(self):
        events = []
        connection = AsyncMock()
        connection.__aenter__.side_effect = OSError('fixture')
        client = bridge.AbletonBridge('wss://example.invalid/ws', 'fixture', on_connection=events.append)
        with patch.object(bridge.websockets, 'connect', return_value=connection):
            with self.assertRaises(OSError):
                await client._connect_websocket()
        self.assertEqual(events, [])
