import hashlib
import importlib.util
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "bridge"))
from sample_library import SampleLibrary, load_exact


class LibraryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        root = Path(self.directory.name)
        for pack in ("Pack A", "Pack B"):
            (root / pack / "Samples").mkdir(parents=True)
            (root / pack / "Samples/kick.wav").write_bytes(pack.encode())
        (root / "Pack A/Samples/snare.wav").write_bytes(b"snare")
        (root / "Pack A/Ableton Folder Info/Previews").mkdir(parents=True)
        (root / "Pack A/Ableton Folder Info/Previews/demo.ogg").write_bytes(b"not a source sample")
        (root / "Pack A/Samples/external.wav").symlink_to(root / "Pack B/Samples/kick.wav")
        self.library = SampleLibrary([root])
        self.pack = next(key for key, path in self.library.packs().items() if path.name == "Pack A")

    def tearDown(self):
        self.directory.cleanup()

    def test_full_catalog_pagination_and_pack_scoping(self):
        first = self.library.read("search_pack_samples", {"pack_id": self.pack, "limit": 1})
        second = self.library.read("search_pack_samples", {"pack_id": self.pack, "limit": 1, "offset": 1})
        self.assertEqual(first["total_samples"], 2)
        self.assertTrue(first["scan_complete"])
        self.assertEqual(first["next_offset"], 1)
        self.assertIsNone(second["next_offset"])
        self.assertNotEqual(first["samples"][0]["sample_id"], second["samples"][0]["sample_id"])

    def test_identity_is_actual_file_content_not_name(self):
        sample = self.library.read("search_pack_samples", {"pack_id": self.pack, "query": "kick"})["samples"][0]
        with patch("sample_library.subprocess.run", side_effect=OSError):
            info = self.library.inspect(self.pack, sample["sample_id"])
        self.assertEqual(info["sha256"], hashlib.sha256(b"Pack A").hexdigest())
        other_pack = next(key for key in self.library.packs() if key != self.pack)
        with self.assertRaises(ValueError):
            self.library.sample(other_pack, sample["sample_id"])

    def test_unknown_pack_and_traversal_are_rejected(self):
        for invalid in ("../../etc", "unknown"):
            with self.assertRaises(ValueError):
                self.library.catalog(invalid)

    async def test_missing_extension_fails_without_loading_anything(self):
        sample = self.library.read("search_pack_samples", {"pack_id": self.pack})["samples"][0]
        bridge = SimpleNamespace(_query_osc=AsyncMock(return_value={"status": "timeout"}))
        with patch("sample_library.subprocess.run", side_effect=OSError):
            result = await load_exact(bridge, self.library, {"pack_id": self.pack, "sample_id": sample["sample_id"], "track": 0})
        self.assertEqual(result["status"], "failed")
        self.assertEqual(bridge._query_osc.await_count, 1)
        self.assertIn("capabilities", bridge._query_osc.call_args.args[1])

    async def test_same_filename_from_wrong_pack_is_not_verified(self):
        sample = self.library.read("search_pack_samples", {"pack_id": self.pack})["samples"][0]
        async def reply(request, address, args, timeout):
            values = {
                "/live/browser/beatmind_capabilities": ["exact_sample_v1"],
                "/live/song/get/track_names": ["Empty"],
                "/live/track/get/has_midi_input": [0, True],
                "/live/track/get/devices/type": [0],
                "/live/browser/load_sample_exact": ["loaded"],
                "/live/browser/get_loaded_sample": [str(Path(self.directory.name) / "Pack B/Samples/kick.wav")],
            }
            return {"status": "ok", "args": values[address]}
        bridge = SimpleNamespace(_query_osc=AsyncMock(side_effect=reply))
        with patch("sample_library.subprocess.run", side_effect=OSError), patch("sample_library.asyncio.sleep", new=AsyncMock()):
            result = await load_exact(bridge, self.library, {"pack_id": self.pack, "sample_id": sample["sample_id"], "track": 0})
        self.assertEqual(result["status"], "partial")
        self.assertNotIn("source", result)
        self.assertEqual(sum(call.args[1] == "/live/browser/load_sample_exact" for call in bridge._query_osc.call_args_list), 1)


class ExtensionTests(unittest.TestCase):
    def test_exact_path_missing_never_loads_same_named_sample_elsewhere(self):
        path = Path(__file__).resolve().parents[2] / "bridge/abletonosc/beatmind_samples.py"
        import types
        package = types.ModuleType("beatmind_test_extension")
        package.__path__ = [str(path.parent)]
        sys.modules[package.__name__] = package
        spec = importlib.util.spec_from_file_location("beatmind_test_extension.beatmind_samples", path)
        extension = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(extension)
        from unittest.mock import Mock
        callbacks = {}
        track = SimpleNamespace(has_midi_input=True, devices=[])
        browser = SimpleNamespace(packs=SimpleNamespace(children=[]), load_item=Mock())
        handler = SimpleNamespace(song=SimpleNamespace(tracks=[track]),
                                  osc_server=SimpleNamespace(add_handler=lambda name, callback: callbacks.update({name: callback})))
        extension.register(handler, SimpleNamespace(browser=browser))
        with patch.object(extension.Path, "is_file", return_value=True):
            result = callbacks["/live/browser/load_sample_exact"]([0, str(Path.home() / "Music/Ableton/Factory Packs/Missing/Samples/kick.wav")])
        self.assertEqual(result[0], "not_found")
        browser.load_item.assert_not_called()

    def test_imported_pack_uses_exact_user_library_path(self):
        import types
        from unittest.mock import Mock
        path = Path(__file__).resolve().parents[2] / "bridge/abletonosc/beatmind_samples.py"
        package = types.ModuleType("beatmind_import_test")
        package.__path__ = [str(path.parent)]
        sys.modules[package.__name__] = package
        spec = importlib.util.spec_from_file_location("beatmind_import_test.beatmind_samples", path)
        extension = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(extension)
        leaf = SimpleNamespace(name="kick.wav", is_loadable=True)
        folder = SimpleNamespace(name="Peak Bites", children=[leaf])
        imported = SimpleNamespace(name="BeatMind Packs", children=[folder])
        browser = SimpleNamespace(user_library=SimpleNamespace(children=[imported]), load_item=Mock())
        track = SimpleNamespace(has_midi_input=True, devices=[])
        previous = object()
        view = SimpleNamespace(selected_track=previous)
        callbacks = {}
        handler = SimpleNamespace(song=SimpleNamespace(tracks=[track], view=view),
                                  osc_server=SimpleNamespace(add_handler=lambda name, callback: callbacks.update({name: callback})))
        extension.register(handler, SimpleNamespace(browser=browser))
        with patch.object(extension.Path, "is_file", return_value=True):
            result = callbacks["/live/browser/load_sample_exact"]([0, str(Path.home() / "Music/Ableton/User Library/BeatMind Packs/Peak Bites/kick.wav")])
            denied = callbacks["/live/browser/load_sample_exact"]([0, str(Path.home() / "Music/Ableton/User Library/Other/kick.wav")])
        self.assertEqual(result[0], "loaded")
        self.assertEqual(denied[0], "error")
        browser.load_item.assert_called_once_with(leaf)
        self.assertIs(view.selected_track, previous)
