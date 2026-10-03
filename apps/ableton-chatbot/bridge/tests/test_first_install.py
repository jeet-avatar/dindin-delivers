import hashlib
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import abletonosc_bundle
import extension_installer


class FirstInstallTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.target = self.root / 'Custom Library/Remote Scripts/AbletonOSC/abletonosc'
        self.source = Path(extension_installer.__file__).parent / 'abletonosc'
        self.bundle = self.root / 'AbletonOSC.zip'
        self.files = {
            '__init__.py': '', 'LICENSE.md': 'fixture license',
            'pythonosc/osc_server.py': '', 'abletonosc/handler.py': '',
            'manager.py': 'class Manager:\n    def init_api(self):\n        self.handlers = []\n',
        }
        self.archive()

    def archive(self, extra=None):
        with zipfile.ZipFile(self.bundle, 'w') as archive:
            for name, text in {**self.files, **(extra or {})}.items():
                archive.writestr(f'AbletonOSC-{abletonosc_bundle.COMMIT}/{name}', text)
        patcher = patch.object(abletonosc_bundle, 'SHA256', hashlib.sha256(self.bundle.read_bytes()).hexdigest())
        patcher.start()
        self.addCleanup(patcher.stop)

    def install(self):
        return extension_installer.install(self.source, self.target, self.root / 'backups', self.bundle)

    def test_fresh_library_gets_complete_registered_runtime_and_repeated_setup(self):
        first = self.install()
        self.assertTrue(first['base_installed'])
        self.assertTrue((self.target.parent / 'pythonosc/osc_server.py').is_file())
        self.assertEqual((self.target.parent / 'LICENSE.md').read_text(), 'fixture license')
        self.assertIn('attach_beatmind(self)', (self.target.parent / 'manager.py').read_text())
        self.assertTrue((self.target / 'beatmind_samples.py').is_file())
        second = self.install()
        self.assertFalse(second['first_setup'])

    def test_partial_existing_install_is_not_replaced(self):
        self.target.parent.mkdir(parents=True)
        owned = self.target.parent / 'custom.txt'
        owned.write_text('keep')
        with self.assertRaisesRegex(RuntimeError, 'incomplete'):
            self.install()
        self.assertEqual(owned.read_text(), 'keep')
        self.assertFalse(self.target.exists())

    def test_corrupt_bundle_does_not_create_destination(self):
        self.bundle.write_bytes(b'corrupt')
        with self.assertRaisesRegex(RuntimeError, 'checksum'):
            self.install()
        self.assertFalse(self.target.parent.exists())

    def test_missing_bundle_is_actionable(self):
        self.bundle.unlink()
        with self.assertRaisesRegex(RuntimeError, 'latest BeatMind Bridge'):
            self.install()
        self.assertFalse(self.target.parent.exists())

    def test_failed_publish_removes_staging_and_leaves_destination_absent(self):
        with patch.object(extension_installer.os, 'rename', side_effect=OSError('fixture denied')):
            with self.assertRaises(OSError):
                self.install()
        self.assertFalse(self.target.parent.exists())
        self.assertEqual(list(self.target.parent.parent.glob('.beatmind-setup-*')), [])

    def test_traversal_archive_rejected_without_writes(self):
        self.archive({'../../escape.py': 'bad'})
        with self.assertRaisesRegex(RuntimeError, 'Unsafe'):
            self.install()
        self.assertFalse(self.target.parent.exists())

    def test_missing_extension_leaves_no_partial_control_surface(self):
        self.source = self.root / 'empty-extensions'
        self.source.mkdir()
        with self.assertRaises(RuntimeError):
            self.install()
        self.assertFalse(self.target.parent.exists())

    def test_symlink_target_is_not_followed(self):
        external = self.root / 'external'
        external.mkdir()
        self.target.parent.parent.mkdir(parents=True)
        self.target.parent.symlink_to(external, target_is_directory=True)
        with self.assertRaisesRegex(RuntimeError, 'symbolic link'):
            self.install()
        self.assertEqual(list(external.iterdir()), [])
