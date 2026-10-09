import base64
import os
import sqlite3

import numpy as np
import pytest

from app.core import face_audit, face_template_store
from app.core.config import settings
from app.services import face_service


def _vector() -> np.ndarray:
    v = np.random.default_rng(0).standard_normal(512).astype(np.float32)
    return v / np.linalg.norm(v)


def _three_entries():
    face_audit.record(face_audit.ENROLL, actor_id="admin-1", subject_id="d1")
    face_audit.record(face_audit.MATCH, actor_id="officer-1", detail="candidates=1")
    face_audit.record(face_audit.DELETE, actor_id="admin-1", subject_id="d1")


def _sql(statement, params=()):
    with sqlite3.connect(settings.face_template_db_path) as conn:
        conn.execute(statement, params)


def test_empty_log_verifies():
    result = face_audit.verify()
    assert result.ok and result.entries == 0


def test_entries_are_chained_and_verify():
    _three_entries()

    result = face_audit.verify()
    assert result.ok
    assert result.entries == 3
    assert [e["action"] for e in face_audit.list_entries()] == [
        "DELETE",
        "MATCH",
        "ENROLL",
    ]


def test_verifies_with_only_the_public_key():
    _three_entries()
    public = face_audit.public_key_b64()

    assert face_audit.verify(public).ok


def test_edited_entry_is_detected():
    _three_entries()
    _sql("UPDATE face_audit_log SET actor_id = 'someone-else' WHERE seq = 2")

    result = face_audit.verify()
    assert not result.ok
    assert result.first_bad_seq == 2
    assert "signature" in result.reason


def test_removed_entry_is_detected():
    _three_entries()
    _sql("DELETE FROM face_audit_log WHERE seq = 2")

    result = face_audit.verify()
    assert not result.ok
    assert result.first_bad_seq == 3


def test_removing_the_first_entry_is_detected():
    _three_entries()
    _sql("DELETE FROM face_audit_log WHERE seq = 1")

    assert not face_audit.verify().ok


def test_swapped_entries_are_detected():
    _three_entries()
    _sql("UPDATE face_audit_log SET seq = 99 WHERE seq = 2")
    _sql("UPDATE face_audit_log SET seq = 2 WHERE seq = 3")
    _sql("UPDATE face_audit_log SET seq = 3 WHERE seq = 99")

    assert not face_audit.verify().ok


def test_forged_entry_fails_verification_with_the_real_public_key(monkeypatch):
    face_audit.record(face_audit.ENROLL, actor_id="admin-1")
    real_public = face_audit.public_key_b64()
    forger_key = base64.b64encode(os.urandom(32)).decode()
    monkeypatch.setattr(settings, "audit_signing_key", forger_key)
    face_audit.record(face_audit.DELETE_ALL, actor_id="forger")

    result = face_audit.verify(real_public)
    assert not result.ok
    assert result.first_bad_seq == 2


def test_missing_key_refuses_to_log(monkeypatch):
    monkeypatch.setattr(settings, "audit_signing_key", "")

    with pytest.raises(face_audit.AuditError, match="not set"):
        face_audit.record(face_audit.ENROLL)
    with pytest.raises(face_audit.AuditError):
        face_audit.ensure_ready()


def test_enrol_and_delete_are_logged_by_the_service():
    face_service.store_template("driver-1", _vector(), actor_id="admin-1")
    face_service.delete_template("driver-1", actor_id="admin-2")

    entries = list(reversed(face_audit.list_entries()))
    assert [(e["action"], e["actor_id"], e["subject_id"]) for e in entries] == [
        ("ENROLL", "admin-1", "driver-1"),
        ("DELETE", "admin-2", "driver-1"),
    ]
    assert face_audit.verify().ok


def test_no_enrolment_without_an_audit_key(monkeypatch):
    monkeypatch.setattr(settings, "audit_signing_key", "")

    with pytest.raises(face_audit.AuditError):
        face_service.store_template("driver-1", _vector())


def test_erasure_still_happens_when_the_audit_key_is_missing(monkeypatch):
    face_service.store_template("driver-1", _vector())
    monkeypatch.setattr(settings, "audit_signing_key", "")

    face_service.delete_template("driver-1")  # must not raise

    assert face_template_store.get_template("driver-1") is None


def test_audit_log_survives_clearing_all_templates():
    face_service.store_template("driver-1", _vector())
    face_service.delete_all_templates(actor_id="admin-1")

    actions = [e["action"] for e in face_audit.list_entries()]
    assert actions == ["DELETE_ALL", "ENROLL"]
    assert face_audit.verify().ok
