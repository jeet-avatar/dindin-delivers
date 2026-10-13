import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import integration_update as updater


class IntegrationUpdateTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.home = Path(self.temporary.name)
        self.source = self.home / "bundle"
        self.source.mkdir()
        (self.source / "beatmind_automation.py").write_text("VERSION = 2\n")
        (self.source / "beatmind_samples.py").write_text("VERSION = 2\n")
        self.folder = self.home / "Music/Ableton/User Library/Remote Scripts/AbletonOSC/abletonosc"
        self.folder.mkdir(parents=True)
        (self.folder / "browser.py").write_text("class BrowserHandler:\n    def init_api(self):\n        from .beatmind_samples import register\n        register(self, None)\n")
        (self.folder / "beatmind_automation.py").write_text("VERSION = 1\n")
        (self.folder / "custom.py").write_text("CUSTOM = True\n")

    def update(self):
        return updater.update_existing(self.source, self.home)

    def test_backed_up_verified_update_is_idempotent(self):
        result = self.update()
        self.assertEqual(result["status"], "updated")
        backup = Path(result["backups"][0])
        self.assertEqual((backup / "beatmind_automation.py").read_text(), "VERSION = 1\n")
        self.assertEqual((self.folder / "beatmind_automation.py").read_text(), "VERSION = 2\n")
        self.assertEqual((self.folder / "custom.py").read_text(), "CUSTOM = True\n")
        self.assertEqual(json.loads((backup / "manifest.json").read_text())["new_files"], ["beatmind_samples.py"])
        self.assertEqual(self.update()["status"], "current")

    def test_does_not_modify_an_unregistered_installation(self):
        (self.folder / "browser.py").write_text("class BrowserHandler:\n    def init_api(self): pass\n")
        self.assertEqual(self.update()["status"], "not_found")
        self.assertEqual((self.folder / "beatmind_automation.py").read_text(), "VERSION = 1\n")

    def test_invalid_bundle_does_not_touch_installed_files(self):
        (self.source / "beatmind_samples.py").write_text("def broken(\n")
        with self.assertRaises(SyntaxError):
            self.update()
        self.assertEqual((self.folder / "beatmind_automation.py").read_text(), "VERSION = 1\n")

    def test_partial_replace_rolls_back(self):
        replace = updater.os.replace
        def fail_second(source, destination):
            if Path(destination).name == "beatmind_samples.py":
                raise OSError("test disk error")
            return replace(source, destination)
        with patch.object(updater.os, "replace", side_effect=fail_second), self.assertRaises(OSError):
            self.update()
        self.assertEqual((self.folder / "beatmind_automation.py").read_text(), "VERSION = 1\n")
        self.assertFalse((self.folder / "beatmind_samples.py").exists())

    def test_reads_custom_library_from_live_preferences(self):
        custom = self.home / "External/My Library"
        custom.parent.mkdir()
        (self.home / "Music/Ableton/User Library").rename(custom)
        preferences = self.home / "Library/Preferences/Ableton/Live 12.3"
        preferences.mkdir(parents=True)
        (preferences / "Library.cfg").write_text(f'<Ableton><UserLibrary><LibraryProject><ProjectPath Value="{custom.parent}"/><ProjectName Value="My Library"/></LibraryProject></UserLibrary></Ableton>')
        result = self.update()
        self.assertEqual(result["updated"], [str(custom / "Remote Scripts/AbletonOSC/abletonosc")])

    def test_refuses_symlinked_modules(self):
        module = self.folder / "beatmind_automation.py"
        module.unlink()
        module.symlink_to(self.source / module.name)
        with self.assertRaisesRegex(ValueError, "linked"):
            self.update()


if __name__ == "__main__":
    unittest.main()
