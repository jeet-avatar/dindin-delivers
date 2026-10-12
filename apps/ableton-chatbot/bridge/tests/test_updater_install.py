"""Updater filesystem tests; never open an app or access the network."""
import hashlib
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import updater

class InstallTests(unittest.TestCase):
    def run_install(self, folder, target, fail_swap=False):
        response = MagicMock()
        response.__enter__.return_value = io.BytesIO(b'release')
        original_rename = Path.rename
        def rename(path, destination):
            if fail_swap and path.name.endswith('.new'):
                raise OSError('simulated interrupted replacement')
            return original_rename(path, destination)
        def run(args, **kwargs):
            if args[0] == '/usr/bin/ditto':
                Path(args[-1]).mkdir(parents=True)
                (Path(args[-1]) / 'version').write_text('new')
            return MagicMock()
        with patch.object(updater, 'running_app', return_value=target), \
             patch.object(updater.Path, 'home', return_value=Path(folder)), \
             patch.object(updater, 'urlopen', return_value=response), \
             patch.object(updater, '_verify'), \
             patch.object(updater.subprocess, 'run', side_effect=run), \
             patch.object(Path, 'rename', rename):
            return updater.install({'url':'https://www.beatmind.io/b.dmg', 'sha256':hashlib.sha256(b'release').hexdigest()})
    def test_installer_volume_uses_writable_user_applications(self):
        with tempfile.TemporaryDirectory() as folder:
            target=self.run_install(folder,Path('/Volumes/BeatMind/BeatMind Bridge.app'))
            self.assertEqual(target,Path(folder)/'Applications'/'BeatMind Bridge.app')
            self.assertEqual((target/'version').read_text(),'new')
    def test_non_writable_app_folder_uses_user_applications(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(updater.os,'access',return_value=False):
            target=self.run_install(folder,Path('/Applications/BeatMind Bridge.app'))
            self.assertEqual(target,Path(folder)/'Applications'/'BeatMind Bridge.app')
            self.assertEqual((target/'version').read_text(),'new')
    def test_failed_swap_restores_previous_app(self):
        with tempfile.TemporaryDirectory() as folder:
            target=Path(folder)/'BeatMind Bridge.app'
            target.mkdir();(target/'version').write_text('old')
            with self.assertRaisesRegex(OSError,'interrupted'):
                self.run_install(folder,target,fail_swap=True)
            self.assertEqual((target/'version').read_text(),'old')
    def test_successful_swap_retains_backup(self):
        with tempfile.TemporaryDirectory() as folder:
            target=Path(folder)/'BeatMind Bridge.app'
            target.mkdir();(target/'version').write_text('old')
            self.run_install(folder,target)
            self.assertEqual((target/'version').read_text(),'new')
            self.assertEqual((target.with_name(target.name+'.old')/'version').read_text(),'old')

class AutomaticUpdateTests(unittest.TestCase):
    def make_app(self):
        import bridge_app
        app=object.__new__(bridge_app.BeatMindBridgeApp)
        app.closing=False;app.updating=False;app.busy=False
        app.latest={'version':'1.3.18'};app.update_attempted=None
        app.bridge=None;app.root=MagicMock();app._separating=MagicMock(return_value=False)
        app._install_update=MagicMock()
        return app
    def test_separation_defers_installation_until_idle(self):
        app=self.make_app();app._separating.return_value=True
        app._automatic_update();app._install_update.assert_not_called()
        app.root.after.assert_called_once_with(5000,app._automatic_update)
        app._separating.return_value=False;app._automatic_update()
        app._install_update.assert_called_once()
    def test_failed_automatic_attempt_does_not_loop(self):
        app=self.make_app();app.update_attempted='1.3.18'
        app._automatic_update();app._install_update.assert_not_called()
    def test_installation_immediately_clears_connected_state(self):
        import bridge_app
        app=self.make_app();app.connected=True
        for name in ('connect_btn','disconnect_btn','sign_out_btn','update_btn','_set_status'):
            setattr(app,name,MagicMock())
        with patch.object(bridge_app.threading,'Thread') as worker:
            bridge_app.BeatMindBridgeApp._install_update(app)
        self.assertFalse(app.connected);self.assertTrue(app.updating)
        self.assertIn('Updating Bridge',app._set_status.call_args.args[0])
        worker.assert_called_once()
    def test_late_connection_callback_cannot_restore_connected_while_updating(self):
        app=self.make_app();app.updating=True;app.connected=False
        app._on_connected=MagicMock()
        app._connection_changed(True);app._on_connected.assert_not_called()
        self.assertFalse(app.connected)

class CommandIdleTests(unittest.IsolatedAsyncioTestCase):
    def make_bridge(self):
        import bridge
        connection=bridge.AbletonBridge(server_url='wss://example.invalid/ws',token='fixture')
        connection.last_mutation_at=0
        return connection
    async def test_running_recording_blocks_automatic_update(self):
        import asyncio
        from unittest.mock import AsyncMock
        connection=self.make_bridge();started=asyncio.Event();finish=asyncio.Event()
        async def recording(raw):
            started.set();await finish.wait()
        connection._execute_ws_message=recording
        task=asyncio.create_task(connection._handle_ws_message('{}'))
        await started.wait();self.assertTrue(connection.update_is_busy())
        finish.set();await task;self.assertEqual(connection.active_commands,0)
    async def test_mutation_defers_update_but_ping_does_not(self):
        from unittest.mock import AsyncMock
        connection=self.make_bridge();connection._reply=AsyncMock();connection._send_osc=MagicMock()
        await connection._handle_ws_message('{"type":"ping"}')
        self.assertFalse(connection.update_is_busy())
        await connection._handle_ws_message('{"type":"osc_send","address":"/live/test"}')
        self.assertTrue(connection.update_is_busy())
    async def test_background_import_blocks_update(self):
        import bridge
        connection=self.make_bridge()
        with patch.object(bridge,'BACKGROUND_TASKS',{object()}):
            self.assertTrue(connection.update_is_busy())
