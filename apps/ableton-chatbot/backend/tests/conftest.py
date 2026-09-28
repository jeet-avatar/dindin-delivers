import os
import tempfile
from pathlib import Path

import pytest

import database

# Token signing needs a key; tests never use the production secret.
os.environ.setdefault("JWT_SECRET", "test-only-signing-key-" + "x" * 24)


@pytest.fixture(autouse=True, scope="session")
def isolated_database():
    """Every test run uses a throwaway database with the production schema, never a file in the repo."""
    with tempfile.TemporaryDirectory() as folder:
        original = database.DB_PATH
        database.DB_PATH = str(Path(folder) / "test.db")
        database.init_db()
        yield
        database.DB_PATH = original
