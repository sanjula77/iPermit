"""Dedicated SQLite store for face templates, per REQ-5 AC3 and the NFR that
biometric data stays isolated from the primary Postgres user/PII store.
Plain sqlite3 (not SQLAlchemy) -- one table doesn't warrant a second ORM
metadata universe and migration chain alongside Alembic's Postgres one.
"""

import sqlite3
from datetime import datetime

import numpy as np

from app.core.config import settings

_SCHEMA = """
CREATE TABLE IF NOT EXISTS face_templates (
    rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id TEXT NOT NULL UNIQUE,
    embedding BLOB NOT NULL,
    created_at TEXT NOT NULL
)
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.face_template_db_path)
    conn.execute(_SCHEMA)
    return conn


def save_template(driver_id: str, embedding: np.ndarray) -> int:
    """Upserts by driver_id (one active template per driver) and returns the
    sqlite rowid -- used as the integer ID in the FAISS index, since FAISS
    needs int64 IDs and driver_id is a UUID string."""
    with _connect() as conn:
        conn.execute("DELETE FROM face_templates WHERE driver_id = ?", (driver_id,))
        cursor = conn.execute(
            "INSERT INTO face_templates (driver_id, embedding, created_at) "
            "VALUES (?, ?, ?)",
            (
                driver_id,
                embedding.astype(np.float32).tobytes(),
                datetime.utcnow().isoformat(),
            ),
        )
        return cursor.lastrowid


def get_driver_id_by_rowid(rowid: int) -> str | None:
    """Reverse lookup for FAISS search results, which only carry rowids
    (FAISS needs int64 IDs; driver_id is a UUID string) -- used to resolve a
    match back to a driver for police verification (REQ-6 AC1)."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT driver_id FROM face_templates WHERE rowid = ?", (rowid,)
        ).fetchone()
    return row[0] if row is not None else None


def get_template(driver_id: str) -> np.ndarray | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT embedding FROM face_templates WHERE driver_id = ?", (driver_id,)
        ).fetchone()
    if row is None:
        return None
    return np.frombuffer(row[0], dtype=np.float32)


def list_all_templates() -> list[tuple[int, str, np.ndarray]]:
    """(rowid, driver_id, embedding) for every stored template -- used to
    rebuild the FAISS index from scratch (REQ-5 AC3's rebuild procedure)."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT rowid, driver_id, embedding FROM face_templates"
        ).fetchall()
    return [
        (rowid, driver_id, np.frombuffer(blob, dtype=np.float32))
        for rowid, driver_id, blob in rows
    ]
