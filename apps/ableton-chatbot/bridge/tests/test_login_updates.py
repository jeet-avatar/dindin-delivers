import hashlib
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bridge
import bridge_app
import credentials
import updater
from urllib.error import HTTPError


def make_app(saved=None):
    with patch.object(bridge_app, 'load_config', return_value={}), \
         patch.object(bridge_app.credentials, 'load', return_value=saved), \
         patch.object(bridge_app.updater, 'clean_previous'), \
         patch.object(bridge_app.BeatMindBridgeApp, '_resume') as resume:
        app = bridge_app.BeatMindBridgeApp()
    return app, resume


class SavedSignInTests(unittest.TestCase):
    def tearDown(self):
        self.app.closing = True
        self.app.root.destroy()

    def test_saved_token_reconnects_without_password(self):
        with patch.object(bridge_app.credentials, 'load', return_value='saved-token'), \
             patch.object(bridge_app, 'load_config', return_value={}), \
             patch.object(bridge_app.updater, 'clean_previous'), \
             patch.object(bridge_app.threading, 'Thread') as thread:
            self.app = bridge_app.BeatMindBridgeApp()
            self.app._resume('saved-token')
        self.assertEqual(thread.call_args.kwargs['args'], ('saved-token',))
        self.assertEqual(thread.call_args.kwargs['target'], self.app._run_bridge)
        self.assertTrue(self.app.connect_btn.instate(['disabled']))

    def test_no_saved_token_shows_login(self):
        self.app, resume = make_app(None)
        self.app.root.update()
        resume.assert_not_called()
        self.assertEqual(self.app.email_entry.cget('state'), 'normal')

    def test_rejected_sign_in_forgets_token(self):
        self.app, _ = make_app(None)
        fake = MagicMock()
        async def stop():
            return None
        fake.stop = stop
        async def fail():
            raise bridge.SignInRejected('again')
        fake.start = fail
        with patch.object(bridge_app, 'AbletonBridge', return_value=fake), \
             patch.object(bridge_app.credentials, 'forget') as forget:
            self.app._run_bridge('old-token')
            self.app.root.update()
        forget.assert_called_once()
        self.assertEqual(self.app.status_label.cget('text'), 'Please sign in to BeatMind again.')

    def test_sign_out_revokes_and_forgets(self):
        self.app, _ = make_app(None)
        self.app.bridge_token = 'live-token'
        with patch.object(bridge_app.credentials, 'forget') as forget, \
             patch.object(bridge_app.threading, 'Thread') as thread:
            self.app._sign_out()
        forget.assert_called_once()
        self.assertEqual(thread.call_args.kwargs['args'], ('live-token',))
        self.assertIsNone(self.app.bridge_token)

    def test_update_row_is_fully_visible_when_connected(self):
        self.app, _ = make_app(None)
        self.app._on_connected()
        self.app._show_update({'version': '9.9.9', 'url': 'https://www.beatmind.io/x.dmg', 'sha256': '0' * 64})
        self.app.root.update()
        frame = self.app.update_frame
        self.assertLessEqual(frame.winfo_y() + frame.winfo_height(), self.app.root.winfo_height())
        self.assertGreaterEqual(self.app.root.winfo_height(), self.app.root.winfo_reqheight())

    def test_update_waits_for_running_separation(self):
        self.app, _ = make_app(None)
        self.app._show_update({'version': '9.9.9', 'url': 'https://www.beatmind.io/x.dmg', 'sha256': '0' * 64})
        self.app.bridge = MagicMock()
        self.app.bridge.local.jobs = {'abc': object()}
        with patch.object(bridge_app.threading, 'Thread') as thread:
            self.app._install_update()
        thread.assert_not_called()
        self.assertIn('separating', self.app.update_label.cget('text'))

    def test_update_shows_whats_new_when_the_manifest_has_notes(self):
        self.app, _ = make_app(None)
        self.app._show_update({'version': '9.9.9', 'url': 'https://www.beatmind.io/x.dmg', 'sha256': '0' * 64,
                               'notes': 'longer transition previews'})
        text = self.app.update_label.cget('text')
        self.assertIn('9.9.9', text)
        self.assertIn('longer transition previews', text)

    def test_update_falls_back_cleanly_when_the_manifest_has_no_notes(self):
        self.app, _ = make_app(None)
        self.app._show_update({'version': '9.9.9', 'url': 'https://www.beatmind.io/x.dmg', 'sha256': '0' * 64})
        text = self.app.update_label.cget('text')
        self.assertIn('9.9.9', text)
        self.assertNotIn('What\'s new', text)

    def test_changelog_link_opens_the_website_changelog(self):
        self.app, _ = make_app(None)
        with patch.object(bridge_app.webbrowser, 'open') as opened:
            self.app._open_changelog()
        opened.assert_called_once_with('https://www.beatmind.io/changelog')


class RejectionTests(unittest.TestCase):
    def test_only_auth_failures_sign_out(self):
        from websockets.exceptions import InvalidStatus
        rejected = InvalidStatus(MagicMock(status_code=401))
        self.assertTrue(bridge.rejected_sign_in(rejected))
        self.assertFalse(bridge.rejected_sign_in(InvalidStatus(MagicMock(status_code=503))))
        self.assertFalse(bridge.rejected_sign_in(ConnectionResetError()))


class UpdaterTests(unittest.TestCase):
    def fetch(self, body):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps(body).encode()
        return patch.object(updater, 'urlopen', return_value=response)

    def test_newer_version_is_offered(self):
        with self.fetch({'version': '1.3.0', 'url': 'https://www.beatmind.io/b.dmg', 'sha256': 'a' * 64}):
            self.assertEqual(updater.check('1.2.0')['version'], '1.3.0')
        with self.fetch({'version': '1.2.0', 'url': 'https://www.beatmind.io/b.dmg', 'sha256': 'a' * 64}):
            self.assertIsNone(updater.check('1.2.0'))

    def test_foreign_or_incomplete_release_is_refused(self):
        with self.fetch({'version': '9.0.0', 'url': 'https://evil.example/b.dmg', 'sha256': 'a' * 64}):
            with self.assertRaises(ValueError):
                updater.check('1.2.0')
        with self.fetch({'version': '9.0.0', 'url': 'https://www.beatmind.io/b.dmg'}):
            with self.assertRaises(ValueError):
                updater.check('1.2.0')

    def test_checksum_mismatch_installs_nothing(self):
        response = MagicMock()
        response.__enter__.return_value = io.BytesIO(b'not the release')
        with patch.object(updater, 'running_app', return_value=Path('/Applications/BeatMind Bridge.app')), \
             patch.object(updater, 'urlopen', return_value=response), \
             patch.object(updater.subprocess, 'run') as run:
            with self.assertRaisesRegex(RuntimeError, 'checksum'):
                updater.install({'url': 'https://www.beatmind.io/b.dmg',
                                 'sha256': hashlib.sha256(b'real').hexdigest()})
        run.assert_not_called()

    def test_unpackaged_copy_cannot_self_update(self):
        with patch.object(updater, 'running_app', return_value=None):
            with self.assertRaises(RuntimeError):
                updater.install({'url': 'https://www.beatmind.io/b.dmg', 'sha256': 'a' * 64})


class CredentialFallbackTests(unittest.TestCase):
    def test_file_store_is_private(self):
        import tempfile
        with tempfile.TemporaryDirectory() as folder, \
             patch.object(credentials.sys, 'platform', 'linux'), \
             patch.object(credentials, 'FALLBACK', Path(folder) / 'token'):
            credentials.save('abc')
            self.assertEqual(credentials.load(), 'abc')
            self.assertEqual(oct(credentials.FALLBACK.stat().st_mode & 0o777), '0o600')
            credentials.forget()
            self.assertIsNone(credentials.load())


if __name__ == '__main__':
    unittest.main()
