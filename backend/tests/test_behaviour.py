import io
from pathlib import Path

import pytest
from PIL import Image

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import UserRole
from app.repositories import user_repository

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))


def _solid_color_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (300, 300), color="blue").save(buffer, format="JPEG")
    return buffer.getvalue()


def _single_face_bytes() -> bytes:
    return (FIXTURES_DIR / "face_fixture.jpg").read_bytes()


def _files_with_face_photos(face_photo_bytes_list: list[bytes]) -> list:
    photos = [
        ("face_photos", (f"photo{i}.jpg", data, "image/jpeg"))
        for i, data in enumerate(face_photo_bytes_list)
    ]
    filler = _solid_color_bytes()
    return photos + [
        ("nic_document", ("nic.jpg", filler, "image/jpeg")),
        ("medical_cert", ("medical.jpg", filler, "image/jpeg")),
        ("birth_cert", ("birth.jpg", filler, "image/jpeg")),
    ]


def _register_and_login(client, email="driver@example.com", nic="991234567V"):
    client.post(
        "/auth/register",
        json={"email": email, "nic": nic, "password": "supersecret"},
    )
    response = client.post(
        "/auth/login", json={"identifier": email, "password": "supersecret"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_user_and_login(
    client, db_session, role, email="user@example.com", nic="USER0001"
):
    user_repository.create(
        db_session,
        email=email,
        nic=nic,
        password_hash=hash_password("userpass123"),
        role=role,
    )
    response = client.post(
        "/auth/login", json={"identifier": email, "password": "userpass123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_admin_and_login(
    client, db_session, email="admin@example.com", nic="ADMIN0001"
):
    return _create_user_and_login(client, db_session, UserRole.ADMIN, email, nic)


def _create_officer_and_login(
    client, db_session, email="officer@example.com", nic="OFFICER01"
):
    return _create_user_and_login(client, db_session, UserRole.POLICE, email, nic)


def _enroll_driver(client, admin_headers, driver_headers) -> dict:
    application = client.post(
        "/applications",
        headers=driver_headers,
        files=_files_with_face_photos([_single_face_bytes()] * 4),
    ).json()
    client.post(
        f"/admin/applications/{application['id']}/approve", headers=admin_headers
    )
    return application


def _record_violation(
    client, officer_headers, driver_id, violation_type="SPEEDING"
) -> dict:
    response = client.post(
        "/police/violations",
        headers=officer_headers,
        json={"driver_id": driver_id, "type": violation_type},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _setup_driver_with_fine(client, db_session, violation_type="SPEEDING"):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]
    violation = _record_violation(client, officer_headers, driver_id, violation_type)
    return {
        "admin_headers": admin_headers,
        "officer_headers": officer_headers,
        "driver_headers": driver_headers,
        "fine_id": violation["fine"]["id"],
    }


def _setup_clean_driver(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]
    return {
        "admin_headers": admin_headers,
        "officer_headers": officer_headers,
        "driver_headers": driver_headers,
        "driver_id": driver_id,
    }


def test_behaviour_requires_driver_role(client, db_session):
    officer_headers = _create_officer_and_login(client, db_session)
    assert client.get("/behaviour/me", headers=officer_headers).status_code == 403


def test_behaviour_requires_login(client):
    assert client.get("/behaviour/me").status_code == 401


def test_behaviour_not_found_before_any_license(client, db_session):
    driver_headers = _register_and_login(client)
    assert client.get("/behaviour/me", headers=driver_headers).status_code == 404


def test_clean_driver_is_low_risk(client, db_session):
    ctx = _setup_clean_driver(client, db_session)

    body = client.get("/behaviour/me", headers=ctx["driver_headers"]).json()

    assert body["risk_level"] == "LOW"
    assert body["trend"] == "NOT_ENOUGH_DATA"
    assert body["window_points"] == 0
    assert body["timeline"] == []
    assert body["dominant_type"] is None
    assert body["tips"]


def test_one_violation_makes_medium_risk_with_timeline(client, db_session):
    ctx = _setup_clean_driver(client, db_session)
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "SPEEDING")

    body = client.get("/behaviour/me", headers=ctx["driver_headers"]).json()

    assert body["risk_level"] == "MEDIUM"
    assert body["window_points"] == 3
    assert body["current_points"] == 3
    assert body["recent_violations"] == 1
    assert body["dominant_type"] == "SPEEDING"
    assert body["unpaid_fines"] == 1
    assert body["projected_days_to_suspension"] is not None
    assert len(body["timeline"]) == 1
    assert body["timeline"][0]["type"] == "SPEEDING"
    assert body["timeline"][0]["fine_status"] == "UNPAID"
    assert body["suspension_threshold"] == 10


def test_two_violations_make_high_risk(client, db_session):
    ctx = _setup_clean_driver(client, db_session)
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "SPEEDING")
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "WHITE_LINE")

    body = client.get("/behaviour/me", headers=ctx["driver_headers"]).json()

    assert body["risk_level"] == "HIGH"
    assert body["window_violations"] == 2
    assert body["window_points"] == 4


def test_overturned_appeal_is_excluded_from_behaviour(client, db_session):
    ctx = _setup_driver_with_fine(client, db_session)
    appeal = client.post(
        "/appeals",
        headers=ctx["driver_headers"],
        json={"fine_id": ctx["fine_id"], "reason": "x"},
    ).json()
    client.post(
        f"/admin/appeals/{appeal['id']}/resolve",
        headers=ctx["admin_headers"],
        json={"resolution": "OVERTURNED"},
    )

    body = client.get("/behaviour/me", headers=ctx["driver_headers"]).json()

    assert body["window_violations"] == 0
    assert body["window_points"] == 0
    assert body["timeline"] == []
    assert body["risk_level"] == "LOW"


def test_suspension_is_counted_as_prior_suspension(client, db_session):
    ctx = _setup_clean_driver(client, db_session)
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "DRUNK_DRIVING")
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "RED_LIGHT")

    body = client.get("/behaviour/me", headers=ctx["driver_headers"]).json()

    assert body["risk_level"] == "HIGH"
    assert body["prior_suspensions"] == 1
    assert "Licence is currently suspended" in body["reasons"]
    assert body["projected_days_to_suspension"] is None


def test_admin_behaviour_requires_admin(client, db_session):
    driver_headers = _register_and_login(client)
    assert client.get("/admin/behaviour", headers=driver_headers).status_code == 403


def test_admin_behaviour_overview(client, db_session):
    ctx = _setup_clean_driver(client, db_session)
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "SPEEDING")
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "WHITE_LINE")

    body = client.get("/admin/behaviour", headers=ctx["admin_headers"]).json()

    assert body["summary"]["high"] == 1
    assert body["summary"]["medium"] == 0
    assert len(body["drivers"]) == 1
    entry = body["drivers"][0]
    assert entry["driver"]["nic"] == "991234567V"
    assert entry["risk_level"] == "HIGH"
    assert entry["window_points"] == 4
    assert len(body["monthly"]) == 12
    assert body["monthly"][-1]["count"] == 2
    assert body["monthly"][-1]["points"] == 4
    assert body["by_type"] == {"SPEEDING": 1, "WHITE_LINE": 1}
