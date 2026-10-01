#!/usr/bin/env python3
"""One-time data migration: copy every row from the live SQLite file into Postgres.

Read-only against the SQLite file (never writes to it) and append-only against Postgres (refuses
to run against a database that already has rows, so it can't double-migrate or clobber anything).
Preserves every row's existing id, then advances each table's identity sequence past the highest
migrated id, so the next normal (auto-generated) insert doesn't collide with migrated data.

Usage:
    python3 migrate_sqlite_to_postgres.py /path/to/musai.db postgresql://user:pass@host:5432/beatmind [--apply]

Without --apply: a dry run. Connects to both databases, prints the row count it would copy per
table, and verifies the Postgres schema already has every table (via database.init_db()). Nothing
is written. Run this first, read its output, and only pass --apply once it looks right.
"""
import argparse
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg2
import psycopg2.extras

# Dependency order: a table with a foreign key (user_id, etc.) migrates after the table it points to.
TABLES = ["users", "stripe_events", "credit_ledger", "separations", "ai_usage",
         "email_preferences", "email_sends", "bridge_tokens", "mixmind_tokens"]
# Only these use database.autoincrement_pk() (a real identity sequence on Postgres). stripe_events'
# "id" is a TEXT (Stripe event id) primary key, not a sequence; the rest have no "id" column at all.
IDENTITY_TABLES = {"users", "credit_ledger", "separations", "ai_usage"}


def _columns(sqlite_conn, table: str) -> list[str]:
    return [row[1] for row in sqlite_conn.execute(f"PRAGMA table_info({table})")]


def _existing_tables(sqlite_conn) -> set[str]:
    return {row[0] for row in sqlite_conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}


def migrate(sqlite_path: str, database_url: str, apply: bool) -> None:
    import database
    database.DB_BACKEND = "postgres"
    database.DATABASE_URL = database_url
    database.init_db()  # users, stripe_events, credit_ledger, separations, ai_usage.
    import product_updates
    import security
    with database.db() as conn:
        product_updates.init(conn)             # email_preferences, email_sends.
        security._token_table(conn, "bridge")   # bridge_tokens, mixmind_tokens — these two are
        security._token_table(conn, "mixmind")  # otherwise created lazily on first real use.

    sqlite_conn = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
    sqlite_conn.row_factory = sqlite3.Row
    pg_conn = psycopg2.connect(database_url)
    pg_cur = pg_conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    present = _existing_tables(sqlite_conn)
    print(f"SQLite tables present: {sorted(present)}")

    pg_cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    pg_tables = {row[0] for row in pg_cur.fetchall()}
    missing = set(TABLES) & present - pg_tables
    if missing:
        raise RuntimeError(f"Postgres is missing tables that SQLite has data for: {missing}")

    if not apply:
        for table in [t for t in TABLES if t in present]:
            count = sqlite_conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"  {table}: {count} rows would be copied")
        print("Dry run only — nothing written. Re-run with --apply to actually migrate.")
        return

    for table in [t for t in TABLES if t in present]:
        pg_cur.execute(f"SELECT COUNT(*) FROM {table}")
        existing = pg_cur.fetchone()[0]
        if existing:
            raise RuntimeError(f"Refusing to migrate into {table}: it already has {existing} row(s). "
                               "This script only runs against an empty database.")

    for table in [t for t in TABLES if t in present]:
        columns = _columns(sqlite_conn, table)
        rows = sqlite_conn.execute(f"SELECT {', '.join(columns)} FROM {table}").fetchall()
        if not rows:
            print(f"{table}: 0 rows, skipping")
            continue
        placeholders = ", ".join(["%s"] * len(columns))
        psycopg2.extras.execute_batch(
            pg_cur, f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})",
            [tuple(row) for row in rows])
        print(f"{table}: copied {len(rows)} rows")
        if table in IDENTITY_TABLES:
            # Postgres's own identity sequence doesn't know about explicitly-inserted ids; move it
            # past the highest one migrated, or the next normal insert could collide.
            pg_cur.execute(f"""SELECT setval(pg_get_serial_sequence('{table}', 'id'),
                              GREATEST((SELECT MAX(id) FROM {table}), 1))""")

    pg_conn.commit()

    print("\nVerifying row counts match...")
    ok = True
    for table in [t for t in TABLES if t in present]:
        sqlite_count = sqlite_conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        pg_cur.execute(f"SELECT COUNT(*) FROM {table}")
        pg_count = pg_cur.fetchone()[0]
        status = "OK" if sqlite_count == pg_count else "MISMATCH"
        if status == "MISMATCH":
            ok = False
        print(f"  {table}: sqlite={sqlite_count} postgres={pg_count} {status}")
    pg_conn.close()
    sqlite_conn.close()
    if not ok:
        raise RuntimeError("Row count mismatch after migration — see above. Do not cut over.")
    print("\nAll row counts match. Migration complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("sqlite_path", help="Path to a local copy of the production musai.db (read-only)")
    parser.add_argument("database_url", help="postgresql://user:pass@host:5432/beatmind")
    parser.add_argument("--apply", action="store_true", help="Actually write. Omit for a dry run.")
    args = parser.parse_args()
    migrate(args.sqlite_path, args.database_url, args.apply)
