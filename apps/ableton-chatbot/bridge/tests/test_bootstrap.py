import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import Mock, patch


class BootstrapTests(unittest.TestCase):
    def setUp(self):
        package = ModuleType("bootstrap_fixture")
        package.__path__ = []
        base = ModuleType("bootstrap_fixture.handler")
        base.AbletonOSCHandler = type("AbletonOSCHandler", (), {})
        self.modules = {"Live": ModuleType("Live"), "bootstrap_fixture": package,
                        "bootstrap_fixture.handler": base}
        self.patcher = patch.dict(sys.modules, self.modules)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        path = Path(__file__).resolve().parents[1] / "abletonosc/beatmind_bootstrap.py"
        spec = importlib.util.spec_from_file_location("bootstrap_fixture.beatmind_bootstrap", path)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        self.routes = {}
        self.handler = SimpleNamespace(
            osc_server=SimpleNamespace(add_handler=lambda name, fn: self.routes.update({name: fn})),
            song=SimpleNamespace(return_tracks=[SimpleNamespace(name="Reverb")]))
        self.app = SimpleNamespace(browser=SimpleNamespace(load_item=Mock()))
        self.module.browser_handlers(self.handler, self.app)

    @staticmethod
    def item(name, children=(), loadable=False):
        return SimpleNamespace(name=name, children=children, is_loadable=loadable, is_folder=not loadable)

    def call(self, name, *args):
        return self.routes["/live/browser/" + name](args)

    def test_exact_device_and_path(self):
        device = self.item("Operator", loadable=True)
        self.app.browser.instruments = self.item("Instruments", [device])
        self.assertEqual(self.call("list", "instruments"), ("Operator",))
        self.assertEqual(self.call("load_device", "operator"), ("loaded", "Operator"))
        self.app.browser.load_item.assert_called_once_with(device)
        self.assertEqual(self.call("load_path", "instruments", "Operator"), ("loaded", "Operator"))

    def test_no_folder_or_partial_name_fallback(self):
        preset = self.item("Deep Kick.adg", loadable=True)
        self.app.browser.drums = self.item("Drums", [self.item("Kicks", [preset])])
        self.assertEqual(self.call("load_device", "Kick"), ("not_found", "Kick"))
        self.assertEqual(self.call("load_path", "drums", "Kicks")[0], "error")
        self.app.browser.load_item.assert_not_called()
        self.assertEqual(self.call("load_device", "Deep Kick"), ("loaded", "Deep Kick.adg"))

    def test_ambiguous_names_and_paths_fail_without_loading(self):
        self.app.browser.samples = self.item("Samples", [self.item("kick.wav", loadable=True),
                                                         self.item("kick.wav", loadable=True)])
        self.assertEqual(self.call("load_sample", "kick.wav")[0], "error")
        self.assertEqual(self.call("load_path", "samples", "kick.wav")[0], "error")
        self.app.browser.load_item.assert_not_called()

    def test_bad_parameters_and_missing_categories(self):
        for name, params in (("list", ()), ("load_device", ()), ("list", ("unknown",)),
                             ("list", ("instruments",))):
            self.assertEqual(self.call(name, *params)[0], "error")
        self.app.browser.load_item.assert_not_called()

    def test_return_track_names(self):
        self.assertEqual(self.routes["/live/song/get/return_track_names"](()), ("Reverb",))

    def test_real_extension_modules_register_through_stock_bootstrap(self):
        sys.modules["bootstrap_fixture"].__path__ = [str(
            Path(__file__).resolve().parents[1] / "abletonosc")]
        self.modules["Live"].Application = SimpleNamespace(get_application=lambda: self.app)
        self.module.BeatMindHandler.init_api(self.handler)
        for route in ("/live/browser/load_sample_exact", "/live/browser/get_loaded_sample",
                      "/live/beatmind/mixer", "/live/beatmind/master/devices", "/live/beatmind/sidechain",
                      "/live/song/beatmind_import_stems", "/live/beatmind/get/arrangement_start"):
            self.assertIn(route, self.routes)
        self.assertIn("automation_readback_v2", self.routes["/live/browser/beatmind_capabilities"](()))

    def test_all_extension_registrars_and_attach_once(self):
        registrars = []
        for name in ("samples", "mixer", "master", "sidechain"):
            module = ModuleType("bootstrap_fixture.beatmind_" + name)
            module.register = Mock()
            sys.modules[module.__name__] = module
            registrars.append(module.register)
        self.modules["Live"].Application = SimpleNamespace(get_application=lambda: self.app)
        self.module.BeatMindHandler.init_api(self.handler)
        for register in registrars:
            register.assert_called_once_with(self.handler, self.app)
        manager = SimpleNamespace(handlers=[])
        with patch.object(self.module.BeatMindHandler, "__init__", return_value=None) as constructor:
            self.module.attach(manager)
            self.module.attach(manager)
        constructor.assert_called_once_with(manager)
        self.assertEqual(len(manager.handlers), 1)
