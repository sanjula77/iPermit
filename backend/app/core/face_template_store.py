"""Dedicated SQLite store for face templates, per REQ-5 AC3 and the NFR that
biometric data stays isolated from the primary Postgres user/PII store.
Plain sqlite3 (not SQLAlchemy) -- one table doesn't warrant a second ORM
metadata universe and migration chain alongside Alembic's Postgres one.

Every embedding is protected by envelope encryption (AES-256-GCM):
  * each template gets its own random 256-bit data key, which encrypts the
    embedding;
  * the data key is then wrapped (encrypted) with the master key, and only the
    wrapped copy is stored, next to the data.
The master key comes from settings.face_template_key (the environment), never
from the database, so a copy of face_templates.db alone reveals nothing.
Because only small wrapped keys depend on the master key, it can be rotated
without re-encrypting every template (rotate_master_key), and deleting a
driver's row destroys their data key with it. The driver id is bound into both
layers as authenticated data, so a value cannot be moved to another driver's
row without failing the integrity check.

Stored value (IPT2): MAGIC + wrap nonce (12) + wrapped data key (32 + 16 tag) +
data nonce (12) + ciphertext and tag. Two older formats are still readable and
are upgraded by encrypt_existing(): IPT1 (encrypted directly with the master
key, no envelope) and plaintext float32 bytes (before encryption existed).
"""

import base64
import binascii
import os
import sqlite3
from datetime import datetime

import numpy as np
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

_MAGIC_ENVELOPE = b"IPT2"
_MAGIC_DIRECT = b"IPT1"
_NONCE_BYTES = 12
_KEY_BYTES = 32
_TAG_BYTES = 16
_WRAPPED_KEY_BYTES = _KEY_BYTES + _TAG_BYTES
_WRAP_END = len(_MAGIC_ENVELOPE) + _NONCE_BYTES + _WRAPPED_KEY_BYTES


class TemplateKeyError(Exception):
    """The encryption key is missing, malformed, or does not match the data."""


def _aead(key_b64: str, name: str = "FACE_TEMPLATE_KEY") -> AESGCM:
    """AES-256-GCM with a master key (32 random bytes, base64-encoded)."""
    if not key_b64:
        raise TemplateKeyError(
            f"{name} is not set. Generate one with "
            '`python -c "import os, base64; '
            'print(base64.b64encode(os.urandom(32)).decode())"` '
            "and put it in the backend settings."
        )
    try:
        key = base64.b64decode(key_b64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise TemplateKeyError(f"{name} is not valid base64") from exc
    if len(key) != _KEY_BYTES:
        raise TemplateKeyError(f"{name} must decode to exactly 32 bytes")
    return AESGCM(key)


def _cipher() -> AESGCM:
    return _aead(settings.face_template_key)


def _wrap(master: AESGCM, driver_id: str, data_key: bytes) -> bytes:
    nonce = os.urandom(_NONCE_BYTES)
    return nonce + master.encrypt(nonce, data_key, driver_id.encode() + b"|key")


def _unwrap(master: AESGCM, driver_id: str, wrapped: bytes) -> bytes:
    return master.decrypt(
        wrapped[:_NONCE_BYTES], wrapped[_NONCE_BYTES:], driver_id.encode() + b"|key"
    )


def _encrypt(driver_id: str, embedding: np.ndarray) -> bytes:
    master = _cipher()
    data_key = AESGCM.generate_key(bit_length=256)
    data_nonce = os.urandom(_NONCE_BYTES)
    ciphertext = AESGCM(data_key).encrypt(
        data_nonce, embedding.astype(np.float32).tobytes(), driver_id.encode()
    )
    return (
        _MAGIC_ENVELOPE + _wrap(master, driver_id, data_key) + data_nonce + ciphertext
    )


def _decrypt(driver_id: str, blob: bytes) -> np.ndarray:
    if blob.startswith(_MAGIC_ENVELOPE):
        try:
            data_key = _unwrap(
                _cipher(), driver_id, blob[len(_MAGIC_ENVELOPE) : _WRAP_END]
            )
            data_nonce = blob[_WRAP_END : _WRAP_END + _NONCE_BYTES]
            raw = AESGCM(data_key).decrypt(
                data_nonce, blob[_WRAP_END + _NONCE_BYTES :], driver_id.encode()
            )
        except InvalidTag as exc:
            raise TemplateKeyError(
                "A stored face template could not be decrypted: wrong key, or the "
                "data was altered"
            ) from exc
        return np.frombuffer(raw, dtype=np.float32)
    if blob.startswith(_MAGIC_DIRECT):
        offset = len(_MAGIC_DIRECT)
        try:
            raw = _cipher().decrypt(
                blob[offset : offset + _NONCE_BYTES],
                blob[offset + _NONCE_BYTES :],
                driver_id.encode(),
            )
        except InvalidTag as exc:
            raise TemplateKeyError(
                "A stored face template could not be decrypted: wrong key, or the "
                "data was altered"
            ) from exc
        return np.frombuffer(raw, dtype=np.float32)
    return np.frombuffer(blob, dtype=np.float32)  # legacy plaintext


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


def save_template(driver_id: str, embedding: np.ndarray) -> tuple[int, list[int]]:
    """Upserts by driver_id (one active template per driver). Returns the new
    sqlite rowid -- used as the integer ID in the FAISS index, since FAISS
    needs int64 IDs and driver_id is a UUID string -- and the rowids it
    replaced, which the index must drop."""
    with _connect() as conn:
        replaced = [
            rowid
            for (rowid,) in conn.execute(
                "SELECT rowid FROM face_templates WHERE driver_id = ?", (driver_id,)
            )
        ]
        conn.execute("DELETE FROM face_templates WHERE driver_id = ?", (driver_id,))
        cursor = conn.execute(
            "INSERT INTO face_templates (driver_id, embedding, created_at) "
            "VALUES (?, ?, ?)",
            (driver_id, _encrypt(driver_id, embedding), datetime.utcnow().isoformat()),
        )
        return cursor.lastrowid, replaced


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
    return _decrypt(driver_id, row[0])


def list_all_templates() -> list[tuple[int, str, np.ndarray]]:
    """(rowid, driver_id, embedding) for every stored template -- used to
    rebuild the FAISS index from scratch (REQ-5 AC3's rebuild procedure)."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT rowid, driver_id, embedding FROM face_templates"
        ).fetchall()
    return [
        (rowid, driver_id, _decrypt(driver_id, blob)) for rowid, driver_id, blob in rows
    ]


def encrypt_existing() -> int:
    """Brings every template up to the envelope format: encrypts legacy
    plaintext ones and re-wraps IPT1 ones. Rowids are kept (they are the FAISS
    ids). Returns how many were converted; safe to re-run."""
    converted = 0
    with _connect() as conn:
        rows = conn.execute(
            "SELECT rowid, driver_id, embedding FROM face_templates"
        ).fetchall()
        for rowid, driver_id, blob in rows:
            if blob.startswith(_MAGIC_ENVELOPE):
                continue
            conn.execute(
                "UPDATE face_templates SET embedding = ? WHERE rowid = ?",
                (_encrypt(driver_id, _decrypt(driver_id, blob)), rowid),
            )
            converted += 1
    return converted


def rotate_master_key() -> int:
    """Re-wraps every template's data key under the current master key
    (settings.face_template_key), reading with the previous one
    (settings.face_template_key_previous). Only the 48-byte wrapped keys change;
    the encrypted embeddings are untouched. A template already under the current
    key is skipped, so a half-finished rotation can be re-run. Returns how many
    were re-wrapped."""
    current = _cipher()
    previous = _aead(settings.face_template_key_previous, "FACE_TEMPLATE_KEY_PREVIOUS")
    rotated = 0
    with _connect() as conn:
        rows = conn.execute(
            "SELECT rowid, driver_id, embedding FROM face_templates"
        ).fetchall()
        for rowid, driver_id, blob in rows:
            if not blob.startswith(_MAGIC_ENVELOPE):
                continue  # not an envelope yet: run encrypt_existing first
            wrapped = blob[len(_MAGIC_ENVELOPE) : _WRAP_END]
            try:
                _unwrap(current, driver_id, wrapped)
                continue  # already under the new key
            except InvalidTag:
                pass
            try:
                data_key = _unwrap(previous, driver_id, wrapped)
            except InvalidTag as exc:
                raise TemplateKeyError(
                    "A data key could not be unwrapped with either master key"
                ) from exc
            rewrapped = _MAGIC_ENVELOPE + _wrap(current, driver_id, data_key)
            conn.execute(
                "UPDATE face_templates SET embedding = ? WHERE rowid = ?",
                (rewrapped + blob[_WRAP_END:], rowid),
            )
            rotated += 1
    return rotated


def delete_template(driver_id: str) -> list[int]:
    """Removes the driver's template (right to erasure for biometric data);
    returns the SQLite rowids removed so the FAISS index can drop them."""
    with _connect() as conn:
        rowids = [
            rowid
            for (rowid,) in conn.execute(
                "SELECT rowid FROM face_templates WHERE driver_id = ?", (driver_id,)
            )
        ]
        conn.execute("DELETE FROM face_templates WHERE driver_id = ?", (driver_id,))
    return rowids


def delete_all_templates() -> list[int]:
    """Removes every template (a full demo reset); returns the SQLite rowids
    removed so the FAISS index can drop them."""
    with _connect() as conn:
        rowids = [
            rowid for (rowid,) in conn.execute("SELECT rowid FROM face_templates")
        ]
        conn.execute("DELETE FROM face_templates")
    return rowids
