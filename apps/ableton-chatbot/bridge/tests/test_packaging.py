import builtins
from pathlib import Path
import plistlib
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

BRIDGE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BRIDGE))
import bundle_metadata
from launch_link import URL_TYPES


class PackagingTests(unittest.TestCase):
    def test_version_matches_runtime_and_preserves_bundle_identity(self):
        source = (BRIDGE / "bridge.py").read_text()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Info.plist"
            path.write_bytes(plistlib.dumps({"CFBundleIdentifier": "com.zietra.beatmind-bridge",
                                            "CFBundleShortVersionString": "0.0.0"}))
            version = bundle_metadata.configure(path, source)
            info = plistlib.loads(path.read_bytes())
        self.assertEqual(info["CFBundleShortVersionString"], version)
        self.assertEqual(info["CFBundleVersion"], version)
        self.assertEqual(info["CFBundleIdentifier"], "com.zietra.beatmind-bridge")
        self.assertEqual(info["CFBundleURLTypes"], URL_TYPES)
        self.assertEqual(info["LSMinimumSystemVersion"], "14.0")

    def test_missing_placeholder_or_ambiguous_version_is_rejected(self):
        for source in ("", 'BRIDGE_VERSION="0.0.0"', 'BRIDGE_VERSION="1.3.7-beta"',
                       'BRIDGE_VERSION="1.3.7"\nBRIDGE_VERSION="1.3.8"'):
            with self.subTest(source=source), self.assertRaises(ValueError):
                bundle_metadata.source_version(source)

    def test_frozen_worker_dispatch_precedes_gui_and_bridge_imports(self):
        freeze = Mock(side_effect=SystemExit(0))
        original_import = builtins.__import__

        def guarded_import(name, *args, **kwargs):
            if name in {"tkinter", "bridge", "reference_worker"}:
                self.fail("Worker imported application code before freeze_support")
            return original_import(name, *args, **kwargs)

        code = compile((BRIDGE / "bridge_app.py").read_text(), "bridge_app.py", "exec")
        with patch.dict(sys.modules, {"multiprocessing": SimpleNamespace(freeze_support=freeze)}), \
                patch("builtins.__import__", side_effect=guarded_import), self.assertRaises(SystemExit):
            exec(code, {"__name__": "__main__"})
        freeze.assert_called_once_with()
