import io
from pathlib import Path

import pytest
from PIL import Image

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import UserRole
from app.repositories import user_repository

FIXTURES_DIR = Path(__file__).parent / "fixtures"


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


def test_badge_requires_driver_role(client, db_session):
    officer_headers = _create_officer_and_login(client, db_session)
    response = client.get("/badges/me", headers=officer_headers)
    assert response.status_code == 403


def test_badge_not_found_before_any_license(client, db_session):
    driver_headers = _register_and_login(client)
    response = client.get("/badges/me", headers=driver_headers)
    assert response.status_code == 404


def test_badge_created_on_approval_is_platinum(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)

    response = client.get("/badges/me", headers=driver_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["tier"] == "PLATINUM"
    assert body["safety_score"] == 100


def test_badge_drops_after_violation_recorded(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]

    _record_violation(client, officer_headers, driver_id, "SPEEDING")

    response = client.get("/badges/me", headers=driver_headers)
    assert response.status_code == 200
    body = response.json()
    # 100 - points(4)*5 - severity(4)*0.5 - unpaid_fines(1)*5 = 73
    assert body["safety_score"] == 73
    assert body["tier"] == "SILVER"


def test_badge_recovers_after_fine_paid(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]
    violation = _record_violation(client, officer_headers, driver_id, "SPEEDING")
    fine_id = violation["fine"]["id"]

    client.post(
        f"/fines/{fine_id}/pay", headers=driver_headers, json={"payment_method": "CARD"}
    )

    response = client.get("/badges/me", headers=driver_headers)
    assert response.status_code == 200
    body = response.json()
    # points restored to 0, but the lifetime severity scar (4*0.5=2) remains.
    assert body["safety_score"] == 98
    assert body["tier"] == "PLATINUM"


def test_badge_is_suspended_when_license_suspended_regardless_of_score(
    client, db_session
):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]

    violation = _record_violation(client, officer_headers, driver_id, "DRUNK_DRIVING")
    assert violation["license_status"] == "SUSPENDED"

    response = client.get("/badges/me", headers=driver_headers)
    assert response.status_code == 200
    assert response.json()["tier"] == "SUSPENDED"


def test_badge_recovers_after_overturned_appeal(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]
    violation = _record_violation(client, officer_headers, driver_id, "SPEEDING")
    fine_id = violation["fine"]["id"]

    appeal = client.post(
        "/appeals",
        headers=driver_headers,
        json={"fine_id": fine_id, "reason": "not me"},
    ).json()
    client.post(
        f"/admin/appeals/{appeal['id']}/resolve",
        headers=admin_headers,
        json={"resolution": "OVERTURNED"},
    )

    response = client.get("/badges/me", headers=driver_headers)
    assert response.status_code == 200
    assert response.json()["safety_score"] == 98
    assert response.json()["tier"] == "PLATINUM"


def test_non_admin_cannot_view_badge_distribution(client, db_session):
    driver_headers = _register_and_login(client)
    response = client.get("/admin/badges", headers=driver_headers)
    assert response.status_code == 403


def test_admin_badge_distribution_and_attention_queue(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)

    clean_driver_headers = _register_and_login(
        client, email="clean@example.com", nic="111111111V"
    )
    _enroll_driver(client, admin_headers, clean_driver_headers)

    risky_driver_headers = _register_and_login(
        client, email="risky@example.com", nic="222222222V"
    )
    _enroll_driver(client, admin_headers, risky_driver_headers)
    risky_driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "222222222V"}
    ).json()["driver_id"]
    _record_violation(client, officer_headers, risky_driver_id, "DRUNK_DRIVING")

    response = client.get("/admin/badges", headers=admin_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["distribution"]["PLATINUM"] == 1
    assert body["distribution"]["SUSPENDED"] == 1
    attention_nics = {entry["driver"]["nic"] for entry in body["attention_queue"]}
    assert attention_nics == {"222222222V"}
