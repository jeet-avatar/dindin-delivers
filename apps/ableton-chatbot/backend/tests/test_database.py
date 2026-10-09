import os
import sqlite3
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import database


class DatabaseTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = str(Path(self.directory.name) / "accounts.db")
        self.patch = patch.object(database, "DB_PATH", self.path)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def journal(self):
        connection = sqlite3.connect(self.path)
        try:
            return connection.execute("PRAGMA journal_mode").fetchone()[0]
        finally:
            connection.close()

    @unittest.skipIf(database.is_postgres(), "SQLite-only: journal-mode/PRAGMA behavior")
    def test_production_uses_rollback_journal_and_preserves_existing_accounts(self):
        with patch.dict(os.environ, {"ENV": "development", "DB_JOURNAL_MODE": "WAL"}):
            database.init_db()
        user = database.create_user("test@example.invalid", "test-hash", "Test", "2027-01-01")
        self.assertEqual(self.journal(), "wal")
        with patch.dict(os.environ, {"ENV": "production"}, clear=True):
            database.init_db()
        self.assertEqual(self.journal(), "delete")
        self.assertEqual(database.get_user_by_id(user["id"])["email"], user["email"])

    @unittest.skipIf(database.is_postgres(), "SQLite-only: journal-mode/PRAGMA behavior")
    def test_account_reads_do_not_reconfigure_journaling(self):
        with patch.dict(os.environ, {"ENV": "production"}, clear=True):
            database.init_db()
        statements = []
        connect = sqlite3.connect

        def traced(*args, **kwargs):
            connection = connect(*args, **kwargs)
            connection.set_trace_callback(statements.append)
            return connection

        with patch.object(database.sqlite3, "connect", side_effect=traced):
            self.assertIsNone(database.get_user_by_id(1))
        self.assertFalse(any("journal_mode" in query.lower() for query in statements))

    @unittest.skipIf(database.is_postgres(), "SQLite-only: journal-mode/PRAGMA behavior")
    def test_concurrent_account_reads_and_updates(self):
        with patch.dict(os.environ, {"ENV": "production"}, clear=True):
            database.init_db()
        user = database.create_user("test@example.invalid", "initial", "Test", "2027-01-01")

        def operation(index):
            if index % 5 == 0:
                database.update_user_password(user["id"], "updated")
            return database.get_user_by_id(user["id"])["email"]

        with ThreadPoolExecutor(max_workers=16) as pool:
            self.assertEqual(list(pool.map(operation, range(80))), [user["email"]] * 80)
        self.assertEqual(database.get_user_by_id(user["id"])["password_hash"], "updated")

    def test_transaction_failure_rolls_back(self):
        with patch.dict(os.environ, {"ENV": "production"}, clear=True):
            database.init_db()
        with self.assertRaises(RuntimeError):
            with database.db() as connection:
                connection.execute("INSERT INTO users(email,password_hash,name) VALUES('rollback@example.invalid','hash','Test')")
                raise RuntimeError("rollback")
        self.assertIsNone(database.get_user_by_email("rollback@example.invalid"))

    @unittest.skipIf(database.is_postgres(), "SQLite-only: journal-mode/PRAGMA behavior")
    def test_rejects_invalid_journal_configuration(self):
        with patch.dict(os.environ, {"DB_JOURNAL_MODE": "OFF"}):
            with self.assertRaises(ValueError):
                database.init_db()


if __name__ == "__main__":
    unittest.main()
