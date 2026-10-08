from datetime import datetime, timedelta

from sqlalchemy import select

from app.core.points import active_points, next_expiry
from app.models.notification import Notification, NotificationType
from app.models.violation import Violation
from tests.test_fines import (
    _create_admin_and_login,
    _create_officer_and_login,
    _enroll_driver,
    _record_violation,
    _register_and_login,
)

NOW = datetime(2026, 10, 1, 12, 0)
DAYS = 365


def test_points_count_for_the_validity_period_then_stop():
    entries = [
        (4, NOW - timedelta(days=364), False),
        (6, NOW - timedelta(days=366), False),
    ]

    assert active_points(entries, now=NOW, validity_days=DAYS) == 4


def test_overturned_violations_never_count():
    entries = [
        (4, NOW - timedelta(days=10), True),
        (3, NOW - timedelta(days=10), False),
    ]

    assert active_points(entries, now=NOW, validity_days=DAYS) == 3


def test_next_expiry_is_when_the_oldest_counting_points_drop_off():
    oldest = NOW - timedelta(days=300)
    entries = [(3, NOW - timedelta(days=20), False), (4, oldest, False)]

    assert next_expiry(entries, now=NOW, validity_days=DAYS) == oldest + timedelta(
        days=DAYS
    )
    assert next_expiry([], now=NOW, validity_days=DAYS) is None
    assert (
        next_expiry(
            [(4, NOW - timedelta(days=400), False)], now=NOW, validity_days=DAYS
        )
        is None
    )


def _driver(client, db_session):
    admin = _create_admin_and_login(client, db_session)
    officer = _create_officer_and_login(client, db_session)
    driver = _register_and_login(client)
    _enroll_driver(client, admin, driver)
    driver_id = client.get(
        "/police/lookup", headers=officer, params={"nic": "991234567V"}
    ).json()["driver_id"]
    return officer, driver, driver_id


def test_paying_each_fine_does_not_let_a_driver_start_again(client, db_session):
    officer, driver, driver_id = _driver(client, db_session)

    # SPEEDING = 4 points. Pay after each one, as the old rule rewarded.
    for _ in range(2):
        violation = _record_violation(client, officer, driver_id, "SPEEDING")
        client.post(
            f"/fines/{violation['fine']['id']}/pay",
            headers=driver,
            json={"payment_method": "CARD"},
        )
    assert client.get("/licenses/me", headers=driver).json()["points"] == 8

    third = _record_violation(client, officer, driver_id, "SPEEDING")

    assert third["driver_points"] == 12
    assert third["license_status"] == "SUSPENDED"


def test_points_expire_after_the_period_and_a_suspension_lifts(client, db_session):
    officer, driver, driver_id = _driver(client, db_session)
    violation = _record_violation(client, officer, driver_id, "DRUNK_DRIVING")
    assert violation["license_status"] == "SUSPENDED"

    # Move the violation back past the validity period.
    row = db_session.scalar(select(Violation))
    row.confirmed_at = datetime.utcnow() - timedelta(days=366)
    db_session.commit()

    license_ = client.get("/licenses/me", headers=driver).json()

    assert license_["points"] == 0
    assert license_["status"] == "ACTIVE"
    assert license_["points_expire_at"] is None
    kinds = [n.type for n in db_session.scalars(select(Notification))]
    assert NotificationType.LICENSE_REINSTATED in kinds


def test_licence_shows_when_the_next_points_expire(client, db_session):
    officer, driver, driver_id = _driver(client, db_session)
    _record_violation(client, officer, driver_id, "SPEEDING")

    license_ = client.get("/licenses/me", headers=driver).json()

    expires = datetime.fromisoformat(
        license_["points_expire_at"].replace("Z", "+00:00")
    )
    assert (
        abs(
            (
                expires.replace(tzinfo=None) - (datetime.utcnow() + timedelta(days=365))
            ).total_seconds()
        )
        < 300
    )
