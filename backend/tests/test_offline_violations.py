import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.models.fine import Fine
from app.models.violation import Violation
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


def _send(client, officer, driver_id, *, client_id=None, hours_ago=None, **extra):
    body = {"driver_id": driver_id, "type": "SPEEDING", **extra}
    if client_id is not None:
        body["client_id"] = str(client_id)
    if hours_ago is not None:
        when = datetime.now(UTC) - timedelta(hours=hours_ago)
        body["occurred_at"] = when.isoformat()
    return client.post("/police/violations", headers=officer, json=body)


def _count(db_session, model):
    return db_session.scalar(select(func.count()).select_from(model))


def test_without_a_client_id_it_behaves_as_before(client, db_session):
    officer, _driver, driver_id = _setup(client, db_session)

    response = _send(client, officer, driver_id)

    assert response.status_code == 201
    violation = db_session.scalar(select(Violation))
    assert violation.client_id is None
    assert violation.received_at is not None


def test_offline_violation_keeps_the_time_it_happened(client, db_session):
    officer, _driver, driver_id = _setup(client, db_session)

    response = _send(client, officer, driver_id, client_id=uuid.uuid4(), hours_ago=5)

    assert response.status_code == 201
    violation = db_session.scalar(select(Violation))
    gap = violation.received_at - violation.confirmed_at
    assert timedelta(hours=4, minutes=55) < gap < timedelta(hours=5, minutes=5)


def test_a_retried_upload_does_not_create_a_second_violation_or_fine(
    client, db_session
):
    officer, _driver, driver_id = _setup(client, db_session)
    client_id = uuid.uuid4()

    first = _send(client, officer, driver_id, client_id=client_id, hours_ago=1)
    again = _send(client, officer, driver_id, client_id=client_id, hours_ago=1)

    assert first.status_code == again.status_code == 201
    assert again.json()["violation"]["id"] == first.json()["violation"]["id"]
    assert again.json()["fine"]["id"] == first.json()["fine"]["id"]
    assert again.json()["driver_points"] == first.json()["driver_points"] == 3
    assert _count(db_session, Violation) == 1
    assert _count(db_session, Fine) == 1


def test_the_same_id_from_another_officer_is_refused(client, db_session):
    officer, _driver, driver_id = _setup(client, db_session)
    client_id = uuid.uuid4()
    assert _send(client, officer, driver_id, client_id=client_id).status_code == 201
    other = _create_officer_and_login(
        client, db_session, email="other.officer@example.com", nic="OFFICER02"
    )

    response = _send(client, other, driver_id, client_id=client_id)

    assert response.status_code == 409
    assert _count(db_session, Violation) == 1


def test_a_time_in_the_future_is_refused(client, db_session):
    officer, _driver, driver_id = _setup(client, db_session)

    response = _send(client, officer, driver_id, client_id=uuid.uuid4(), hours_ago=-2)

    assert response.status_code == 422
    assert "future" in response.json()["detail"]
    assert _count(db_session, Violation) == 0


def test_a_violation_older_than_the_limit_is_refused(client, db_session):
    officer, _driver, driver_id = _setup(client, db_session)

    old = _send(client, officer, driver_id, client_id=uuid.uuid4(), hours_ago=24 * 8)
    fresh = _send(client, officer, driver_id, client_id=uuid.uuid4(), hours_ago=24 * 6)

    assert old.status_code == 422
    assert "Too old" in old.json()["detail"]
    assert fresh.status_code == 201


def test_a_late_sync_can_still_suspend_and_points_use_the_offence_time(
    client, db_session
):
    officer, driver, driver_id = _setup(client, db_session)
    # Two serious offences recorded offline on different days, synced out of order.
    _send(
        client,
        officer,
        driver_id,
        client_id=uuid.uuid4(),
        hours_ago=48,
        type="RED_LIGHT",
    )
    result = _send(
        client,
        officer,
        driver_id,
        client_id=uuid.uuid4(),
        hours_ago=72,
        type="DRUNK_DRIVING",
    ).json()

    assert result["driver_points"] == 10  # 4 + 6
    assert result["license_status"] == "SUSPENDED"
