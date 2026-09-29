"""GET /police/me/summary: the officer's own recorded-violation activity for
Police Home (counts today / last 7 days / all time, and the most recent)."""

from datetime import datetime, timedelta

from app.core.security import hash_password
from app.models.user import UserRole
from app.models.violation import ViolationType
from app.repositories import fine_repository, user_repository, violation_repository


def _login(client, email, password="userpass123"):
    token = client.post(
        "/auth/login", json={"identifier": email, "password": password}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _user(db_session, role, email, nic):
    return user_repository.create(
        db_session,
        email=email,
        nic=nic,
        password_hash=hash_password("userpass123"),
        role=role,
    )


def _violation(db_session, *, officer, driver, days_ago, vtype=ViolationType.SPEEDING):
    violation = violation_repository.add(
        db_session,
        driver_id=driver.id,
        officer_id=officer.id,
        violation_type=vtype,
        points_deducted=4,
        evidence_ref=None,
    )
    db_session.flush()
    violation.confirmed_at = datetime.utcnow() - timedelta(days=days_ago)
    fine_repository.add(db_session, violation_id=violation.id, amount=5000)
    db_session.commit()
    return violation


def test_summary_requires_police_role(client, db_session):
    _user(db_session, UserRole.DRIVER, "driver@example.com", "991234567V")
    headers = _login(client, "driver@example.com")

    response = client.get("/police/me/summary", headers=headers)

    assert response.status_code == 403


def test_summary_counts_only_this_officers_violations(client, db_session):
    officer = _user(db_session, UserRole.POLICE, "officer@example.com", "OFFICER01")
    other = _user(db_session, UserRole.POLICE, "other@example.com", "OFFICER02")
    driver = _user(db_session, UserRole.DRIVER, "driver@example.com", "991234567V")

    _violation(db_session, officer=officer, driver=driver, days_ago=0)
    _violation(db_session, officer=officer, driver=driver, days_ago=0)
    _violation(db_session, officer=officer, driver=driver, days_ago=3)
    _violation(db_session, officer=officer, driver=driver, days_ago=10)
    _violation(db_session, officer=other, driver=driver, days_ago=0)

    response = client.get(
        "/police/me/summary", headers=_login(client, "officer@example.com")
    )

    assert response.status_code == 200
    body = response.json()
    assert body["recorded_today"] == 2
    assert body["recorded_this_week"] == 3
    assert body["recorded_total"] == 4


def test_summary_lists_the_five_most_recent_with_driver_and_fine(client, db_session):
    officer = _user(db_session, UserRole.POLICE, "officer@example.com", "OFFICER01")
    driver = _user(db_session, UserRole.DRIVER, "driver@example.com", "991234567V")
    for days_ago in (6, 5, 4, 3, 2, 1):
        _violation(db_session, officer=officer, driver=driver, days_ago=days_ago)
    newest = _violation(
        db_session,
        officer=officer,
        driver=driver,
        days_ago=0,
        vtype=ViolationType.RED_LIGHT,
    )

    body = client.get(
        "/police/me/summary", headers=_login(client, "officer@example.com")
    ).json()

    recent = body["recent"]
    assert len(recent) == 5
    assert recent[0]["id"] == str(newest.id)
    assert recent[0]["type"] == "RED_LIGHT"
    assert recent[0]["driver_email"] == "driver@example.com"
    assert recent[0]["driver_nic"] == "991234567V"
    assert recent[0]["fine_amount"] == 5000
    times = [item["confirmed_at"] for item in recent]
    assert times == sorted(times, reverse=True)


def test_summary_for_an_officer_with_no_violations(client, db_session):
    _user(db_session, UserRole.POLICE, "officer@example.com", "OFFICER01")

    body = client.get(
        "/police/me/summary", headers=_login(client, "officer@example.com")
    ).json()

    assert body == {
        "recorded_today": 0,
        "recorded_this_week": 0,
        "recorded_total": 0,
        "recent": [],
    }
