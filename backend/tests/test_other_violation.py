import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.notification import Notification
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


def _setup(client, db_session):
    admin = _create_admin_and_login(client, db_session)
    officer = _create_officer_and_login(client, db_session)
    driver = _register_and_login(client)
    _enroll_driver(client, admin, driver)
    driver_id = client.get(
        "/police/lookup", headers=officer, params={"nic": "991234567V"}
    ).json()["driver_id"]
    return officer, driver, driver_id


def _record_other(client, officer, driver_id, **fields):
    body = {"driver_id": driver_id, "type": "OTHER", **fields}
    return client.post("/police/violations", headers=officer, json=body)


def test_listed_violations_use_the_new_points(client, db_session):
    officer, _driver, driver_id = _setup(client, db_session)
    expected = {"WHITE_LINE": 1, "SPEEDING": 3, "RED_LIGHT": 4, "DRUNK_DRIVING": 6}

    for violation_type, points in expected.items():
        result = _record_violation(client, officer, driver_id, violation_type)
        assert result["violation"]["points_deducted"] == points


def test_other_violation_uses_the_officers_description_and_points(client, db_session):
    officer, driver, driver_id = _setup(client, db_session)

    response = _record_other(
        client,
        officer,
        driver_id,
        description="  Parked on a footpath  ",
        points=3,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["violation"]["type"] == "OTHER"
    assert body["violation"]["description"] == "Parked on a footpath"
    assert body["violation"]["points_deducted"] == 3
    assert body["fine"]["amount"] == 3000  # LKR 1,000 per point
    assert body["driver_points"] == 3
    # The driver sees the officer's words on their fine and in a notification.
    fines = client.get("/fines/me", headers=driver).json()
    assert fines[0]["violation"]["description"] == "Parked on a footpath"
    messages = [n.message for n in db_session.scalars(select(Notification))]
    assert any("Parked on a footpath" in m for m in messages)


@pytest.mark.parametrize(
    "fields",
    [
        {"points": 2},  # no description
        {"description": "x" * 4, "points": 2},  # too short
        {"description": "x" * 101, "points": 2},  # too long
        {"description": "Parked on a footpath"},  # no points
        {"description": "Parked on a footpath", "points": 0},
        {"description": "Parked on a footpath", "points": 6},
    ],
)
def test_other_violation_is_checked(client, db_session, fields):
    officer, _driver, driver_id = _setup(client, db_session)

    response = _record_other(client, officer, driver_id, **fields)

    assert response.status_code == 422
    assert client.get("/fines/me", headers=_driver).json() == []


def test_description_and_points_are_only_for_other(client, db_session):
    officer, _driver, driver_id = _setup(client, db_session)

    response = client.post(
        "/police/violations",
        headers=officer,
        json={
            "driver_id": driver_id,
            "type": "SPEEDING",
            "description": "faster than that",
            "points": 5,
        },
    )

    assert response.status_code == 422


def test_one_other_violation_cannot_suspend_a_licence(client, db_session):
    officer, _driver, driver_id = _setup(client, db_session)

    response = _record_other(
        client, officer, driver_id, description="Driving on the pavement", points=5
    )

    assert response.json()["driver_points"] == 5
    assert response.json()["license_status"] == "ACTIVE"


def test_other_violation_appears_in_the_behaviour_timeline(client, db_session):
    officer, driver, driver_id = _setup(client, db_session)
    _record_other(client, officer, driver_id, description="No seat belt", points=1)

    behaviour = client.get("/behaviour/me", headers=driver).json()

    item = behaviour["timeline"][0]
    assert item["type"] == "OTHER"
    assert item["description"] == "No seat belt"
