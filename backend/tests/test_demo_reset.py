import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.models.application import Application, ApplicationDocument
from app.models.fine import Fine
from app.models.license import License
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.models.violation import Violation
from tests.test_fines import _record_violation
from tests.test_police import (
    _create_admin_and_login,
    _create_officer_and_login,
    _enroll_driver,
    _register_and_login,
)


@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))


def _count(db, model) -> int:
    return db.scalar(select(func.count()).select_from(model))


def _templates() -> int:
    with sqlite3.connect(settings.face_template_db_path) as conn:
        return conn.execute("SELECT count(*) FROM face_templates").fetchone()[0]


def _populated(client, db_session):
    admin = _create_admin_and_login(client, db_session)
    officer = _create_officer_and_login(client, db_session)
    driver = _register_and_login(client)
    _enroll_driver(client, admin, driver)
    driver_id = client.get(
        "/police/lookup", headers=officer, params={"nic": "991234567V"}
    ).json()["driver_id"]
    _record_violation(client, officer, driver_id, "SPEEDING")
    return admin, officer, driver


def test_reset_is_off_unless_the_server_enables_it(client, db_session, monkeypatch):
    # Whatever a developer's local .env says, the built-in default is off.
    monkeypatch.setattr(settings, "allow_demo_reset", False)
    admin, _officer, _driver = _populated(client, db_session)

    status = client.get("/admin/demo-reset/status", headers=admin).json()
    response = client.post(
        "/admin/demo-reset", headers=admin, json={"confirm": "CLEAR"}
    )

    assert status == {"enabled": False}
    assert response.status_code == 403
    assert _count(db_session, License) == 1  # nothing was touched


def test_reset_needs_the_exact_confirmation_word(client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "allow_demo_reset", True)
    admin, _officer, _driver = _populated(client, db_session)

    for wrong in ("", "clear", "yes", "CLEAR "):
        response = client.post(
            "/admin/demo-reset", headers=admin, json={"confirm": wrong}
        )
        assert response.status_code == 422

    assert _count(db_session, License) == 1


def test_reset_clears_everything_but_admin_and_police(client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "allow_demo_reset", True)
    admin, _officer, _driver = _populated(client, db_session)
    assert _count(db_session, ApplicationDocument) == 7
    assert _templates() == 1
    uploads = Path(settings.upload_dir)
    assert any(uploads.rglob("*.jpg"))

    response = client.post(
        "/admin/demo-reset", headers=admin, json={"confirm": "CLEAR"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["removed"]["drivers"] == 1
    assert body["removed"]["violations"] == 1
    assert body["removed"]["face_templates"] == 1
    assert body["kept"] == {"ADMIN": 1, "POLICE": 1}

    db_session.expire_all()
    for model in (License, Application, ApplicationDocument, Violation, Fine):
        assert _count(db_session, model) == 0
    assert _count(db_session, Notification) == 0
    roles = {u.role for u in db_session.scalars(select(User))}
    assert roles == {UserRole.ADMIN, UserRole.POLICE}
    assert _templates() == 0
    assert not any(uploads.rglob("*.jpg"))


def test_police_and_admin_can_still_sign_in_after_a_reset(
    client, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "allow_demo_reset", True)
    admin, _officer, _driver = _populated(client, db_session)
    client.post("/admin/demo-reset", headers=admin, json={"confirm": "CLEAR"})

    officer_login = client.post(
        "/auth/login",
        json={"identifier": "officer@example.com", "password": "userpass123"},
    )
    driver_login = client.post(
        "/auth/login",
        json={"identifier": "driver@example.com", "password": "supersecret"},
    )

    assert officer_login.status_code == 200
    assert driver_login.status_code == 401


def test_only_an_admin_can_reset(client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "allow_demo_reset", True)
    _admin, officer, driver = _populated(client, db_session)

    for who in (officer, driver):
        response = client.post(
            "/admin/demo-reset", headers=who, json={"confirm": "CLEAR"}
        )
        assert response.status_code == 403
    assert (
        client.post("/admin/demo-reset", json={"confirm": "CLEAR"}).status_code == 401
    )
    assert _count(db_session, License) == 1
