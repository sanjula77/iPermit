import base64
import os
import sqlite3

import numpy as np
import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core import face_template_store
from app.core.config import settings


def _vector(seed=0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    v = rng.standard_normal(512).astype(np.float32)
    return v / np.linalg.norm(v)


def _raw(driver_id: str) -> bytes:
    with sqlite3.connect(settings.face_template_db_path) as conn:
        return conn.execute(
            "SELECT embedding FROM face_templates WHERE driver_id = ?", (driver_id,)
        ).fetchone()[0]


def test_template_round_trips_through_encryption():
    vector = _vector()
    face_template_store.save_template("driver-1", vector)

    assert np.allclose(face_template_store.get_template("driver-1"), vector)


def test_stored_bytes_are_ciphertext_not_the_vector():
    vector = _vector()
    face_template_store.save_template("driver-1", vector)

    raw = _raw("driver-1")
    assert raw.startswith(b"IPT2")
    assert vector.tobytes() not in raw
    # magic + (nonce + wrapped data key + tag) + (nonce + data + tag)
    assert len(raw) == 4 + (12 + 32 + 16) + (12 + 512 * 4 + 16)


def test_same_vector_encrypts_differently_each_time():
    vector = _vector()
    face_template_store.save_template("driver-1", vector)
    first = _raw("driver-1")
    face_template_store.save_template("driver-1", vector)

    assert _raw("driver-1") != first


def test_listing_for_the_index_rebuild_decrypts():
    vector = _vector()
    face_template_store.save_template("driver-1", vector)

    ((_rowid, driver_id, listed),) = face_template_store.list_all_templates()
    assert driver_id == "driver-1"
    assert np.allclose(listed, vector)


def test_saving_without_a_key_is_refused(monkeypatch):
    monkeypatch.setattr(settings, "face_template_key", "")

    with pytest.raises(face_template_store.TemplateKeyError, match="not set"):
        face_template_store.save_template("driver-1", _vector())


@pytest.mark.parametrize(
    "bad_key", ["not base64 !!", base64.b64encode(b"too short").decode()]
)
def test_malformed_key_is_refused(monkeypatch, bad_key):
    monkeypatch.setattr(settings, "face_template_key", bad_key)

    with pytest.raises(face_template_store.TemplateKeyError):
        face_template_store.save_template("driver-1", _vector())


def test_wrong_key_cannot_read_a_template(monkeypatch):
    face_template_store.save_template("driver-1", _vector())
    monkeypatch.setattr(
        settings, "face_template_key", base64.b64encode(os.urandom(32)).decode()
    )

    with pytest.raises(face_template_store.TemplateKeyError, match="decrypted"):
        face_template_store.get_template("driver-1")


def test_tampered_template_is_detected():
    face_template_store.save_template("driver-1", _vector())
    raw = bytearray(_raw("driver-1"))
    raw[-1] ^= 0x01
    with sqlite3.connect(settings.face_template_db_path) as conn:
        conn.execute("UPDATE face_templates SET embedding = ?", (bytes(raw),))

    with pytest.raises(face_template_store.TemplateKeyError):
        face_template_store.get_template("driver-1")


def test_a_template_cannot_be_moved_to_another_driver():
    face_template_store.save_template("driver-1", _vector(1))
    face_template_store.save_template("driver-2", _vector(2))
    with sqlite3.connect(settings.face_template_db_path) as conn:
        conn.execute(
            "UPDATE face_templates SET embedding = ? WHERE driver_id = 'driver-2'",
            (_raw("driver-1"),),
        )

    with pytest.raises(face_template_store.TemplateKeyError):
        face_template_store.get_template("driver-2")


def test_legacy_plaintext_template_still_reads_then_gets_encrypted():
    vector = _vector()
    face_template_store.save_template("driver-1", vector)  # creates the table
    with sqlite3.connect(settings.face_template_db_path) as conn:
        conn.execute("UPDATE face_templates SET embedding = ?", (vector.tobytes(),))
    assert not _raw("driver-1").startswith(b"IPT1")
    assert np.allclose(face_template_store.get_template("driver-1"), vector)

    assert face_template_store.encrypt_existing() == 1

    assert _raw("driver-1").startswith(b"IPT2")
    assert np.allclose(face_template_store.get_template("driver-1"), vector)
    assert face_template_store.encrypt_existing() == 0  # nothing left to convert


def _wrapped_key(driver_id: str) -> bytes:
    return _raw(driver_id)[4 : 4 + 12 + 32 + 16]


def test_every_template_has_its_own_data_key():
    vector = _vector()
    face_template_store.save_template("driver-1", vector)
    face_template_store.save_template("driver-2", vector)

    assert _wrapped_key("driver-1") != _wrapped_key("driver-2")


def test_direct_ipt1_template_is_upgraded_to_the_envelope():
    vector = _vector()
    face_template_store.save_template("driver-1", vector)  # creates the table
    master = AESGCM(base64.b64decode(settings.face_template_key))
    nonce = os.urandom(12)
    ipt1 = b"IPT1" + nonce + master.encrypt(nonce, vector.tobytes(), b"driver-1")
    with sqlite3.connect(settings.face_template_db_path) as conn:
        conn.execute("UPDATE face_templates SET embedding = ?", (ipt1,))
    assert np.allclose(face_template_store.get_template("driver-1"), vector)

    assert face_template_store.encrypt_existing() == 1

    assert _raw("driver-1").startswith(b"IPT2")
    assert np.allclose(face_template_store.get_template("driver-1"), vector)


def test_master_key_rotation_rewraps_keys_without_touching_the_data(monkeypatch):
    vector = _vector()
    face_template_store.save_template("driver-1", vector)
    face_template_store.save_template("driver-2", _vector(2))
    old_key = settings.face_template_key
    before = _raw("driver-1")
    new_key = base64.b64encode(os.urandom(32)).decode()
    monkeypatch.setattr(settings, "face_template_key", new_key)
    monkeypatch.setattr(settings, "face_template_key_previous", old_key)

    assert face_template_store.rotate_master_key() == 2

    after = _raw("driver-1")
    assert after[:4] == before[:4]
    assert after[4 : 4 + 60] != before[4 : 4 + 60]  # wrapped key changed
    assert after[4 + 60 :] == before[4 + 60 :]  # encrypted embedding untouched
    assert np.allclose(face_template_store.get_template("driver-1"), vector)
    assert face_template_store.rotate_master_key() == 0  # safe to re-run

    monkeypatch.setattr(settings, "face_template_key", old_key)
    with pytest.raises(face_template_store.TemplateKeyError):
        face_template_store.get_template("driver-1")  # old key no longer works


def test_rotation_needs_the_previous_key(monkeypatch):
    face_template_store.save_template("driver-1", _vector())
    monkeypatch.setattr(
        settings, "face_template_key", base64.b64encode(os.urandom(32)).decode()
    )
    monkeypatch.setattr(settings, "face_template_key_previous", "")

    with pytest.raises(face_template_store.TemplateKeyError, match="PREVIOUS"):
        face_template_store.rotate_master_key()


def test_deleting_a_template_removes_its_data_key_too():
    face_template_store.save_template("driver-1", _vector())
    face_template_store.delete_template("driver-1")

    with sqlite3.connect(settings.face_template_db_path) as conn:
        assert conn.execute("SELECT COUNT(*) FROM face_templates").fetchone()[0] == 0
