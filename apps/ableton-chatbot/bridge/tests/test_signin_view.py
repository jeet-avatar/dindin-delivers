"""Exercise sign-in transitions without opening a desktop window."""
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bridge_app


class SignInViewTests(unittest.TestCase):
    def make_app(self):
        app = bridge_app.BeatMindBridgeApp.__new__(bridge_app.BeatMindBridgeApp)
        for name in ("password_var", "email_entry", "password_entry", "sign_in_label",
                     "connect_btn", "disconnect_btn", "sign_out_btn", "_set_status"):
            setattr(app, name, Mock())
        app.bridge_token = "fixture-token"
        return app

    def test_connected_replaces_empty_password_with_signed_in_message(self):
        app = self.make_app()
        app._on_connected()
        app.password_var.set.assert_called_once_with("")
        app.password_entry.pack_forget.assert_called_once()
        app.sign_in_label.pack.assert_called_once()
        self.assertTrue(app.connected)
        app._set_status.assert_called_once_with("Connected to BeatMind", bridge_app.SUCCESS)

    def test_disconnect_restores_password_entry_and_reconnect_guidance(self):
        app = self.make_app()
        app._on_disconnected()
        app.sign_in_label.pack_forget.assert_called_once()
        app.password_entry.pack.assert_called_once()
        app.password_entry.config.assert_called_once_with(state="normal")
        self.assertIn("sign-in is saved", app._set_status.call_args.args[0])
        self.assertFalse(app.connected)
