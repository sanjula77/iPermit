"""Tamper-evident audit log of every action on biometric data.

Each entry records when, what, who and which driver (never the biometric data
or the probe image itself). Entries form a chain: every entry carries the hash
of the one before it and is signed with an Ed25519 private key held only by
the server (settings.audit_signing_key). Changing, removing or reordering an
entry, or inserting a forged one, breaks either the chain or a signature, and
verify() reports where. Verification needs only the public key, so an auditor
can check the log without being able to forge entries.

Known limit: deleting entries from the very end of the log leaves a valid
chain. To detect that, note the head hash that verify() returns somewhere
outside this database (for example in the audit report) and compare it later.

Lives in the same SQLite file as the templates, in its own table. Clearing the
templates (demo reset) never touches it.
"""

import base64
import binascii
import hashlib
import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from app.core.config import settings

ENROLL = "ENROLL"
MATCH = "MATCH"
DELETE = "DELETE"
DELETE_ALL = "DELETE_ALL"
UPGRADE = "UPGRADE"
KEY_ROTATE = "KEY_ROTATE"

SYSTEM = "system"
_GENESIS_HASH = "0" * 64

_SCHEMA = """
CREATE TABLE IF NOT EXISTS face_audit_log (
    seq INTEGER PRIMARY KEY,
    at TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    subject_id TEXT,
    detail TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    signature TEXT NOT NULL
)
"""


class AuditError(Exception):
    """The audit log cannot be written (missing or malformed signing key)."""


@dataclass
class Verification:
    ok: bool
    entries: int
    head_hash: str
    first_bad_seq: int | None = None
    reason: str | None = None


def _private_key() -> Ed25519PrivateKey:
    if not settings.audit_signing_key:
        raise AuditError(
            "AUDIT_SIGNING_KEY is not set. Generate one with "
            '`python -c "import os, base64; '
            'print(base64.b64encode(os.urandom(32)).decode())"` '
            "and put it in the backend settings."
        )
    try:
        seed = base64.b64decode(settings.audit_signing_key, validate=True)
        return Ed25519PrivateKey.from_private_bytes(seed)
    except (binascii.Error, ValueError) as exc:
        raise AuditError(
            "AUDIT_SIGNING_KEY must be 32 random bytes, base64-encoded"
        ) from exc


def ensure_ready() -> None:
    """Raises AuditError now if entries could not be signed, so a caller can
    refuse to touch biometric data it would not be able to log."""
    _private_key()


def public_key_b64() -> str:
    """The public half of the signing key, for an auditor to verify with."""
    raw = _private_key().public_key().public_bytes_raw()
    return base64.b64encode(raw).decode()


def _payload(
    seq: int,
    at: str,
    action: str,
    actor_id: str,
    subject_id: str | None,
    detail: str,
    prev_hash: str,
) -> bytes:
    return json.dumps(
        {
            "seq": seq,
            "at": at,
            "action": action,
            "actor_id": actor_id,
            "subject_id": subject_id,
            "detail": detail,
            "prev_hash": prev_hash,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()


def _entry_hash(payload: bytes, signature: str) -> str:
    return hashlib.sha256(payload + signature.encode()).hexdigest()


def _connect() -> sqlite3.Connection:
    # Autocommit mode: transactions are opened explicitly in record().
    conn = sqlite3.connect(settings.face_template_db_path, isolation_level=None)
    conn.execute(_SCHEMA)
    return conn


def record(
    action: str,
    *,
    actor_id: str | None = None,
    subject_id: str | None = None,
    detail: str = "",
) -> int:
    """Appends one signed entry and returns its sequence number. The read of the
    previous entry and the insert happen in one write transaction, so two
    simultaneous actions cannot both chain onto the same predecessor."""
    key = _private_key()
    actor = actor_id or SYSTEM
    at = datetime.utcnow().isoformat()
    conn = _connect()
    try:
        conn.execute("BEGIN IMMEDIATE")
        last = conn.execute(
            "SELECT seq, at, action, actor_id, subject_id, detail, prev_hash, "
            "signature FROM face_audit_log ORDER BY seq DESC LIMIT 1"
        ).fetchone()
        if last is None:
            seq, prev_hash = 1, _GENESIS_HASH
        else:
            seq = last[0] + 1
            prev_hash = _entry_hash(_payload(*last[:7]), last[7])
        signature = base64.b64encode(
            key.sign(_payload(seq, at, action, actor, subject_id, detail, prev_hash))
        ).decode()
        conn.execute(
            "INSERT INTO face_audit_log VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (seq, at, action, actor, subject_id, detail, prev_hash, signature),
        )
        conn.execute("COMMIT")
        return seq
    except BaseException:
        if conn.in_transaction:
            conn.execute("ROLLBACK")
        raise
    finally:
        conn.close()


def list_entries(limit: int = 100) -> list[dict]:
    """The newest `limit` entries, newest first (signatures left out)."""
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT seq, at, action, actor_id, subject_id, detail "
            "FROM face_audit_log ORDER BY seq DESC LIMIT ?",
            (limit,),
        ).fetchall()
    finally:
        conn.close()
    names = ("seq", "at", "action", "actor_id", "subject_id", "detail")
    return [dict(zip(names, row, strict=True)) for row in rows]


def verify(public_key: str | None = None) -> Verification:
    """Walks the whole log: sequence numbers are 1, 2, 3 ... with no gap, every
    entry names the hash of the one before it, and every signature checks out
    against the public key (default: the one derived from the server's key)."""
    try:
        verifier = (
            Ed25519PublicKey.from_public_bytes(base64.b64decode(public_key))
            if public_key
            else _private_key().public_key()
        )
    except (binascii.Error, ValueError) as exc:
        raise AuditError("The public key is not valid base64 Ed25519") from exc

    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT seq, at, action, actor_id, subject_id, detail, prev_hash, "
            "signature FROM face_audit_log ORDER BY seq"
        ).fetchall()
    finally:
        conn.close()

    head = _GENESIS_HASH
    for index, row in enumerate(rows, start=1):
        seq, prev_hash, signature = row[0], row[6], row[7]
        if seq != index:
            return Verification(
                False, len(rows), head, seq, "an entry is missing or out of order"
            )
        if prev_hash != head:
            return Verification(
                False,
                len(rows),
                head,
                seq,
                "the chain link to the previous entry broke",
            )
        payload = _payload(*row[:7])
        try:
            verifier.verify(base64.b64decode(signature), payload)
        except (InvalidSignature, binascii.Error, ValueError):
            return Verification(
                False, len(rows), head, seq, "the signature does not match the entry"
            )
        head = _entry_hash(payload, signature)
    return Verification(True, len(rows), head)
