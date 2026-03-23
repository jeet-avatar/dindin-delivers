"""
Local state database for MixMind.
Stored at ~/Library/Application Support/MixMind/state.db
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Set

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session


_DEFAULT_PATH = (
    Path.home()
    / "Library"
    / "Application Support"
    / "MixMind"
    / "state.db"
)


@dataclass
class LibraryCacheTrack:
    content_id: str
    source: str          # 'db' or 'xml'
    title: str
    artist: str
    bpm: float
    key_musical: str
    camelot: str
    rating: int          # 0-5
    duration_sec: int
    cue_count: int
    cue_colors: str      # JSON array string


@dataclass
class HiddenTrack:
    content_id: str
    source: str
    reason: str


class StateDB:
    def __init__(self, db_path: Path = _DEFAULT_PATH):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._engine = create_engine(f"sqlite:///{db_path}")
        self._create_tables()

    def _create_tables(self) -> None:
        with self._engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS hidden_tracks (
                    content_id TEXT NOT NULL,
                    source     TEXT NOT NULL,
                    hidden_at  TEXT DEFAULT (datetime('now')),
                    reason     TEXT,
                    PRIMARY KEY (content_id, source)
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS library_cache (
                    content_id   TEXT NOT NULL,
                    source       TEXT NOT NULL,
                    title        TEXT,
                    artist       TEXT,
                    bpm          REAL,
                    key_musical  TEXT,
                    camelot      TEXT,
                    rating       INTEGER DEFAULT 0,
                    duration_sec INTEGER,
                    cue_count    INTEGER DEFAULT 0,
                    cue_colors   TEXT DEFAULT '[]',
                    updated_at   TEXT DEFAULT (datetime('now')),
                    PRIMARY KEY (content_id, source)
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS preferences (
                    key   TEXT PRIMARY KEY,
                    value TEXT
                )
            """))
            conn.commit()

    def hide_track(self, content_id: str, source: str, reason: str) -> None:
        with self._engine.connect() as conn:
            conn.execute(text(
                "INSERT OR REPLACE INTO hidden_tracks (content_id, source, reason) "
                "VALUES (:cid, :src, :reason)"
            ), {"cid": content_id, "src": source, "reason": reason})
            conn.commit()

    def unhide_track(self, content_id: str, source: str) -> None:
        with self._engine.connect() as conn:
            conn.execute(text(
                "DELETE FROM hidden_tracks WHERE content_id=:cid AND source=:src"
            ), {"cid": content_id, "src": source})
            conn.commit()

    def is_hidden(self, content_id: str, source: str) -> bool:
        with self._engine.connect() as conn:
            row = conn.execute(text(
                "SELECT 1 FROM hidden_tracks WHERE content_id=:cid AND source=:src"
            ), {"cid": content_id, "src": source}).fetchone()
            return row is not None

    def hidden_ids(self, source: str) -> Set[str]:
        with self._engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT content_id FROM hidden_tracks WHERE source=:src"
            ), {"src": source}).fetchall()
            return {r[0] for r in rows}

    def upsert_track(self, track: LibraryCacheTrack) -> None:
        with self._engine.connect() as conn:
            conn.execute(text("""
                INSERT OR REPLACE INTO library_cache
                (content_id, source, title, artist, bpm, key_musical, camelot,
                 rating, duration_sec, cue_count, cue_colors, updated_at)
                VALUES (:cid, :src, :title, :artist, :bpm, :key, :cam,
                        :rating, :dur, :cues, :colors, datetime('now'))
            """), {
                "cid": track.content_id, "src": track.source,
                "title": track.title, "artist": track.artist,
                "bpm": track.bpm, "key": track.key_musical,
                "cam": track.camelot, "rating": track.rating,
                "dur": track.duration_sec, "cues": track.cue_count,
                "colors": track.cue_colors,
            })
            conn.commit()

    def get_track(self, content_id: str, source: str) -> Optional[LibraryCacheTrack]:
        with self._engine.connect() as conn:
            row = conn.execute(text(
                "SELECT * FROM library_cache WHERE content_id=:cid AND source=:src"
            ), {"cid": content_id, "src": source}).fetchone()
            if not row:
                return None
            return LibraryCacheTrack(
                content_id=row[0], source=row[1], title=row[2],
                artist=row[3], bpm=row[4], key_musical=row[5],
                camelot=row[6], rating=row[7], duration_sec=row[8],
                cue_count=row[9], cue_colors=row[10],
            )

    def all_tracks(self, source: str) -> list[LibraryCacheTrack]:
        with self._engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT * FROM library_cache WHERE source=:src"
            ), {"src": source}).fetchall()
            return [LibraryCacheTrack(
                content_id=r[0], source=r[1], title=r[2], artist=r[3],
                bpm=r[4], key_musical=r[5], camelot=r[6], rating=r[7],
                duration_sec=r[8], cue_count=r[9], cue_colors=r[10],
            ) for r in rows]

    def set_pref(self, key: str, value: str) -> None:
        with self._engine.connect() as conn:
            conn.execute(text(
                "INSERT OR REPLACE INTO preferences (key, value) VALUES (:k, :v)"
            ), {"k": key, "v": value})
            conn.commit()

    def get_pref(self, key: str, default: str = "") -> str:
        with self._engine.connect() as conn:
            row = conn.execute(text(
                "SELECT value FROM preferences WHERE key=:k"
            ), {"k": key}).fetchone()
            return row[0] if row else default

    def close(self) -> None:
        self._engine.dispose()
