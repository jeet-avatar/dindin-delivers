import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import security
from beatmind_auth import create_token
from database import create_user


class BridgeTokenTests(unittest.TestCase):
    def setUp(self):
        security._rate_store.clear()
        self.patch = patch.dict(os.environ, {"JWT_SECRET": "x" * 40})
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def test_token_survives_a_server_restart(self):
        token = security.create_bridge_token(7)
        # A deploy starts a new process: nothing about the token may live in memory.
        security._token_tables_ready.clear()
        self.assertFalse(hasattr(security, '_bridge_tokens'))
        self.assertEqual(security.bridge_token_owner(token), 7)

    def test_revoked_or_tampered_tokens_are_rejected(self):
        token = security.create_bridge_token(8)
        self.assertIsNone(security.bridge_token_owner(token[:-4] + "AAAA"))
        security.revoke_bridge_token(token)
        self.assertIsNone(security.bridge_token_owner(token))
        self.assertFalse(security.validate_bridge_token(token))

    def test_web_login_tokens_cannot_open_the_bridge(self):
        self.assertIsNone(security.bridge_token_owner(create_token(9, "a@b.c")))

    def test_bridge_tokens_cannot_call_the_web_api(self):
        import main
        user = create_user("bridge-only@example.com", "x", "B", "2999-01-01T00:00:00")
        bridge = security.create_bridge_token(user["id"])
        client = TestClient(main.app)
        self.assertEqual(client.get("/api/auth/me", headers={"Authorization": "Bearer " + bridge}).status_code, 401)
        web = create_token(user["id"], user["email"])
        self.assertEqual(client.get("/api/auth/me", headers={"Authorization": "Bearer " + web}).status_code, 200)

    def test_sign_out_revokes_the_bridge(self):
        import main
        token = security.create_bridge_token(10)
        client = TestClient(main.app)
        self.assertEqual(client.post("/api/auth/bridge-token/revoke", json={"bridge_token": token}).json(), {"revoked": True})
        self.assertIsNone(security.bridge_token_owner(token))

    def test_bridge_websocket_accepts_a_persisted_token(self):
        import main
        token = security.create_bridge_token(11)
        security._token_tables_ready.clear()
        with TestClient(main.app).websocket_connect(f"/ws/bridge?token={token}") as ws:
            ws.send_json({"type": "bridge_hello", "version": "1.2.0", "capabilities": []})
        with self.assertRaises(Exception):
            with TestClient(main.app).websocket_connect("/ws/bridge?token=not-a-token"):
                pass


if __name__ == "__main__":
    unittest.main()
