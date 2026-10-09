import os
import tempfile
from pathlib import Path

import pytest

import database

# Token signing needs a key; tests never use the production secret.
os.environ.setdefault("JWT_SECRET", "test-only-signing-key-" + "x" * 24)

# Backend is read from DB_BACKEND/DATABASE_URL — database.py's own real env vars — so it's settled
# before this process even imports a test module, the same as production. That matters here:
# a few tests are @unittest.skipIf(database.is_postgres(), ...) for genuinely SQLite-only behavior
# (journal mode, a raw sqlite3 migration fixture), and unittest evaluates skipIf at class-body
# (import) time, which runs before any fixture does. Run the whole suite twice, once per backend,
# to prove billing.py/security.py/stripe_routes.py's dialect-specific code (see database.py's
# docstring) behaves the same on both — not just on the one SQLite already runs in production:
#   DB_BACKEND=postgres DATABASE_URL=postgresql://... pytest tests/
# A fixture *parametrized* per-backend would do this in one invocation instead of two, but pytest
# can't inject a parametrized fixture into this suite's many unittest.TestCase-based tests.


@pytest.fixture(autouse=True, scope="session")
def isolated_database():
    """Every test run uses a throwaway database with the production schema, never a file in the repo."""
    import security
    security._token_tables_ready.clear()  # security.py's own "already issued CREATE TABLE" cache
    if database.is_postgres():
        _reset_postgres_schema(database.DATABASE_URL)
        database.init_db()
        yield
        database._pg_pool and database._pg_pool.closeall()
        database._pg_pool = None
    else:
        original_path = database.DB_PATH
        with tempfile.TemporaryDirectory() as folder:
            database.DB_PATH = str(Path(folder) / "test.db")
            database.init_db()
            yield
        database.DB_PATH = original_path


def _reset_postgres_schema(url: str) -> None:
    """A clean slate for this run, matching SQLite's brand-new-file guarantee above."""
    import psycopg2
    conn = psycopg2.connect(url)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    conn.close()
