from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import extension_installer


class ExtensionInstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source, self.target = self.root / "bundle", self.root / "installed"
        self.source.mkdir(); self.target.mkdir()
        (self.target / "browser.py").write_text("from .beatmind_samples import register\n")
        for name in ("samples", "view", "arrangement_preview", "automation"):
            (self.source / f"beatmind_{name}.py").write_text("VERSION = 2\n")
            (self.target / f"beatmind_{name}.py").write_text("VERSION = 1\n")

    def install(self):
        return extension_installer.install(self.source, self.target, self.root / "backups")

    def test_updates_owned_files_with_backups_without_changing_registration(self):
        result = self.install()
        self.assertTrue(result["restart_required"])
        self.assertEqual((self.target / "beatmind_view.py").read_text(), "VERSION = 2\n")
        self.assertEqual((Path(result["backup"]) / "beatmind_view.py").read_text(), "VERSION = 1\n")
        self.assertEqual((self.target / "browser.py").read_text(), "from .beatmind_samples import register\n")

    def test_missing_registration_or_bundle_rejected_before_changes(self):
        (self.target / "browser.py").write_text("pass\n")
        with self.assertRaises(RuntimeError): self.install()
        self.assertEqual((self.target / "beatmind_view.py").read_text(), "VERSION = 1\n")

    def test_replacement_failure_restores_prior_files(self):
        original = extension_installer.os.replace
        calls = 0
        def fail(source, target):
            nonlocal calls
            calls += 1
            if calls == 2: raise OSError("fixture write failure")
            return original(source, target)
        with patch.object(extension_installer.os, "replace", side_effect=fail), self.assertRaises(OSError):
            self.install()
        for path in self.target.glob("beatmind_*.py"):
            self.assertEqual(path.read_text(), "VERSION = 1\n")
