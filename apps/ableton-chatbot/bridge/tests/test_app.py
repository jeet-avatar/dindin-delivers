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

    def test_update_check_is_always_visible_including_after_connect(self):
        self.assertTrue(self.app.check_update_btn.winfo_ismapped())
        self.app._on_connected()
        self.app.root.update()
        self.assertTrue(self.app.check_update_btn.winfo_ismapped())

    def test_manual_check_disables_duplicate_requests(self):
        with patch.object(bridge_app.threading, 'Thread') as thread:
            self.app.check_update_btn.invoke()
            self.app._check_updates()
        thread.assert_called_once()
        self.assertTrue(self.app.update_checking)
        self.assertTrue(self.app.check_update_btn.instate(['disabled']))
        self.assertIn('Checking', self.app.update_label.cget('text'))

    def test_update_worker_failure_is_reported_to_ui(self):
        with patch.object(bridge_app.updater, 'check', side_effect=OSError('offline')), \
             patch.object(self.app, '_post') as post:
            self.app._fetch_update()
        self.assertEqual(post.call_args.args[0], self.app._update_checked)
        self.assertIsNone(post.call_args.args[1])
        self.assertIn('Could not check', post.call_args.args[2])

    def test_failed_check_shows_download_and_retries_in_one_minute(self):
        with patch.object(self.app.root, 'after', return_value='fixture') as schedule:
            self.app._update_checked(None, 'Could not check for updates.')
        schedule.assert_called_once_with(bridge_app.UPDATE_RETRY_MS, self.app._check_updates)
        self.app.root.update()
        self.assertTrue(self.app.download_update_btn.winfo_ismapped())
        self.assertFalse(self.app.check_update_btn.instate(['disabled']))

    def test_successful_check_shows_install_then_clears_withdrawn_update(self):
        latest = {'version': '9.9.9', 'notes': 'Fixture only'}
        self.app._update_checked(latest, None)
        self.app.root.update()
        self.assertTrue(self.app.update_btn.winfo_ismapped())
        self.assertFalse(self.app.update_btn.instate(['disabled']))
        self.assertIn('9.9.9', self.app.update_label.cget('text'))
        self.app._update_checked(None, None)
        self.app.root.update()
        self.assertIsNone(self.app.latest)
        self.assertFalse(self.app.update_btn.winfo_ismapped())
        self.assertIn("up to date", self.app.update_label.cget('text'))

    def test_install_and_check_cannot_run_twice_or_overlap(self):
        self.app._show_update({'version': '9.9.9'})
        with patch.object(bridge_app.threading, 'Thread') as thread:
            self.app._install_update()
            self.app._install_update()
            self.app._check_updates()
        thread.assert_called_once()
        self.assertTrue(self.app.update_installing)
        self.assertTrue(self.app.check_update_btn.instate(['disabled']))

    def test_failed_install_restores_retry_and_official_download(self):
        self.app.update_installing = True
        self.app._update_failed('Fixture failure: nothing installed.')
        self.app.root.update()
        self.assertFalse(self.app.update_installing)
        self.assertFalse(self.app.update_btn.instate(['disabled']))
        self.assertFalse(self.app.check_update_btn.instate(['disabled']))
        with patch.object(bridge_app.webbrowser, 'open') as browser:
            self.app.download_update_btn.invoke()
        browser.assert_called_once_with('https://www.beatmind.io/BeatMind-Bridge.dmg')

    def test_integration_and_app_replacement_do_not_overlap(self):
        self.app._show_update({'version': '9.9.9'})
        self.app.integration_running = True
        with patch.object(bridge_app.threading, 'Thread') as thread:
            self.app._install_update()
        thread.assert_not_called()
        self.assertIn('Integration setup is running', self.app.update_label.cget('text'))
        self.app.integration_running = False
        self.app.update_installing = True
        with patch.object(bridge_app.threading, 'Thread') as thread:
            self.app._install_integration()
        thread.assert_not_called()
        self.assertIn('updating', self.app.integration_status.cget('text'))

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

    def test_signed_in_account_replaces_login_even_when_disconnected(self):
        self.app.email_var.set('listener@example.invalid')
        self.app.bridge_token = 'fixture-token'
        self.app._on_connected()
        self.app.root.update()
        self.assertFalse(self.app.password_entry.winfo_ismapped())
        self.assertTrue(self.app.account_fields.winfo_ismapped())
        self.assertEqual(self.app.account_email_var.get(), 'listener@example.invalid')
        self.app._on_disconnected()
        self.app.root.update()
        self.assertFalse(self.app.login_fields.winfo_ismapped())
        self.assertTrue(self.app.account_fields.winfo_ismapped())
        self.assertTrue(self.app.sign_out_btn.winfo_ismapped())

    def test_sign_out_restores_editable_fields(self):
        self.app.bridge_token = 'fixture-token'
        self.app._on_connected()
        with patch.object(bridge_app.threading, 'Thread'):
            self.app._sign_out()
        self.app.root.update()
        self.assertFalse(self.app.account_fields.winfo_ismapped())
        self.assertTrue(self.app.password_entry.winfo_ismapped())
        self.app.password_entry.insert(0, 'fixture-new-password')
        self.assertEqual(self.app.password_var.get(), 'fixture-new-password')
        self.assertEqual(self.app.email_entry.cget('state'), 'normal')
        self.assertGreaterEqual(self.app.root.winfo_height(), self.app.root.winfo_reqheight())

    def test_rejected_saved_sign_in_restores_form(self):
        self.app._show_identity(True)
        self.app.bridge_token = None
        self.app._on_disconnected('Please sign in to BeatMind again.')
        self.app.root.update()
        self.assertTrue(self.app.password_entry.winfo_ismapped())
        self.assertFalse(self.app.account_fields.winfo_ismapped())
        self.assertEqual(self.app.password_entry.cget('state'), 'normal')

    def test_long_account_email_stays_inside_window(self):
        self.app.email_var.set('a' * 64 + '@' + 'b' * 63 + '.example.invalid')
        self.app._on_connected()
        self.app.root.update()
        self.assertLessEqual(self.app.account_fields.winfo_width(), self.app.root.winfo_width() - 48)
        self.assertGreaterEqual(self.app.root.winfo_height(), self.app.root.winfo_reqheight())

    def test_initial_window_fits_setup_and_footer(self):
        self.assertGreaterEqual(self.app.root.winfo_height(), self.app.root.winfo_reqheight())

    def test_integration_click_shows_progress_and_rejects_duplicate_clicks(self):
        self.app.busy = True  # Cloud reconnecting must not block local setup.
        with patch.object(bridge_app.threading, 'Thread') as worker:
            self.app._install_integration()
            self.app._install_integration()
        self.app.root.update()
        worker.assert_called_once()
        self.assertTrue(self.app.integration_running)
        self.assertTrue(self.app.integration_btn.instate(['disabled']))
        self.assertIn('Installing into', self.app.integration_status.cget('text'))
        self.assertGreaterEqual(self.app.root.winfo_height(), self.app.root.winfo_reqheight())

    def test_integration_error_is_visible_and_retry_enabled(self):
        self.app.integration_running = True
        self.app._integration_finished('Permission denied. Choose your User Library folder.')
        self.assertFalse(self.app.integration_running)
        self.assertFalse(self.app.integration_btn.instate(['disabled']))
        self.assertIn('Permission denied', self.app.integration_status.cget('text'))
        self.assertGreaterEqual(self.app.root.winfo_height(), self.app.root.winfo_reqheight())

    def test_integration_separation_notice_fits_window(self):
        self.app.bridge = SimpleNamespace(local=SimpleNamespace(jobs={'active': object()}))
        with patch.object(bridge_app.threading, 'Thread') as worker:
            self.app._install_integration()
        worker.assert_not_called()
        self.assertIn('separating', self.app.integration_status.cget('text'))
        self.assertGreaterEqual(self.app.root.winfo_height(), self.app.root.winfo_reqheight())

    def test_integration_success_requires_restart_not_fake_connection(self):
        self.app._integration_finished(None)
        self.assertIn('Live has not been checked yet', self.app.integration_status.cget('text'))
        self.assertIn('Control Surface', self.app.integration_status.cget('text'))
        self.assertFalse(self.app.connected)

    def test_choose_library_persists_folder(self):
        with patch.object(bridge_app.filedialog, 'askdirectory', return_value='/tmp/Custom User Library'), \
             patch.object(bridge_app, 'load_config', return_value={'email': 'fixture@example.invalid'}), \
             patch.object(bridge_app, 'save_config') as save:
            self.app._choose_user_library()
        self.assertEqual(str(self.app.user_library), '/tmp/Custom User Library')
        self.assertEqual(save.call_args.args[0]['email'], 'fixture@example.invalid')
        self.assertEqual(save.call_args.args[0]['user_library'], '/tmp/Custom User Library')

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
