import importlib.util
from pathlib import Path
import unittest
from unittest.mock import Mock

spec = importlib.util.spec_from_file_location('launch_link', Path(__file__).resolve().parents[2] / 'bridge' / 'launch_link.py')
launch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launch)


class BridgeLaunchTests(unittest.TestCase):
    def test_valid_link_only_reveals_window(self):
        root = Mock()
        self.assertTrue(launch.handle_launch(root, 'beatmind-bridge://open'))
        self.assertEqual([call[0] for call in root.method_calls], ['deiconify', 'lift', 'focus_force'])

    def test_unsafe_or_unknown_links_cannot_change_anything(self):
        for url in ('https://example.com', 'beatmind-bridge://open?token=secret',
                    'beatmind-bridge://open#command', 'beatmind-bridge://delete',
                    'beatmind-bridge://open;exec', 'beatmind-bridge://user@open',
                    'beatmind-bridge://open\n', '', None):
            with self.subTest(url=url):
                root = Mock()
                self.assertFalse(launch.handle_launch(root, url))
                self.assertEqual(root.method_calls, [])

    def test_mac_event_registration_and_multiple_urls(self):
        root = Mock()
        launch.register_mac_launch(root)
        name, handler = root.createcommand.call_args.args
        self.assertEqual(name, '::tk::mac::LaunchURL')
        self.assertFalse(handler(launch.OPEN_URL, launch.OPEN_URL))
        self.assertTrue(handler(launch.OPEN_URL))
