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
