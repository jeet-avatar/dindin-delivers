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
        for name in ("samples", "view", "arrangement_preview", "automation", "mixer", "master", "sidechain", "stems"):
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

    def stock(self):
        (self.target / "browser.py").unlink()
        (self.target / "handler.py").write_text("class AbletonOSCHandler: pass\n")
        manager = self.target.parent / "manager.py"
        manager.write_text("class Manager:\n    def init_api(self):\n        with self.component_guard():\n            self.handlers = [abletonosc.SongHandler(self)]\n")
        (self.source / "beatmind_bootstrap.py").write_text("def attach(manager): pass\n")
        return manager

    def test_stock_registration_is_backed_up_and_idempotent(self):
        manager = self.stock()
        original = manager.read_bytes()
        result = self.install()
        self.assertTrue(result["first_setup"])
        self.assertEqual((Path(result["backup"]) / "manager.py").read_bytes(), original)
        self.assertIn("attach_beatmind(self)", manager.read_text())
        updated = manager.read_bytes()
        self.assertFalse(self.install()["first_setup"])
        self.assertEqual(manager.read_bytes(), updated)

    def test_manager_write_failure_rolls_back_modules(self):
        manager = self.stock()
        before = manager.read_bytes()
        replace = extension_installer.os.replace
        def fail(source, target):
            if Path(target) == manager: raise OSError("fixture registration failure")
            return replace(source, target)
        with patch.object(extension_installer.os, "replace", side_effect=fail), self.assertRaises(OSError):
            self.install()
        self.assertEqual(manager.read_bytes(), before)
        self.assertFalse((self.target / "beatmind_bootstrap.py").exists())
        self.assertEqual((self.target / "beatmind_view.py").read_text(), "VERSION = 1\n")

    def test_stock_without_final_newline(self):
        manager = self.stock()
        manager.write_text(manager.read_text().rstrip())
        self.assertTrue(self.install()["first_setup"])
        self.assertFalse(self.install()["first_setup"])

    def test_stock_update_still_requires_bootstrap(self):
        manager = self.stock()
        self.install()
        before = manager.read_bytes()
        (self.source / "beatmind_bootstrap.py").unlink()
        with self.assertRaises(RuntimeError): self.install()
        self.assertEqual(manager.read_bytes(), before)

    def test_partial_import_does_not_count_as_registered(self):
        manager = self.stock()
        self.install()
        manager.write_text(manager.read_text().replace("attach as attach_beatmind", "attach"))
        with self.assertRaises(RuntimeError): self.install()

    def test_missing_dependency_rejected_before_changes(self):
        (self.source / "beatmind_sidechain.py").unlink()
        with self.assertRaises(RuntimeError): self.install()
        self.assertEqual((self.target / "beatmind_view.py").read_text(), "VERSION = 1\n")

    def test_unrecognized_manager_is_not_rewritten(self):
        manager = self.stock()
        manager.write_text("class Manager:\n    def init_api(self):\n        self.handlers = make_handlers()\n")
        before = manager.read_bytes()
        with self.assertRaises(RuntimeError): self.install()
        self.assertEqual(manager.read_bytes(), before)

    def test_registration_symlink_is_not_followed(self):
        manager = self.stock()
        other = self.root / "unrelated.py"
        manager.rename(other)
        manager.symlink_to(other)
        with self.assertRaises(RuntimeError): self.install()
        self.assertNotIn("attach_beatmind", other.read_text())
