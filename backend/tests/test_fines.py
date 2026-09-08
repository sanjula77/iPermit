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


def test_list_fines_requires_driver_role(client, db_session):
    officer_headers = _create_officer_and_login(client, db_session)
    response = client.get("/fines/me", headers=officer_headers)
    assert response.status_code == 403


def test_driver_sees_fine_after_violation_recorded(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]
    _record_violation(client, officer_headers, driver_id, "SPEEDING")

    response = client.get("/fines/me", headers=driver_headers)

    assert response.status_code == 200
    fines = response.json()
    assert len(fines) == 1
    assert fines[0]["status"] == "UNPAID"
    assert fines[0]["amount"] == 5000
    assert fines[0]["violation"]["type"] == "SPEEDING"


def test_pay_fine_marks_paid_and_restores_points(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]
    violation = _record_violation(client, officer_headers, driver_id, "SPEEDING")
    fine_id = violation["fine"]["id"]

    response = client.post(
        f"/fines/{fine_id}/pay", headers=driver_headers, json={"payment_method": "CARD"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["fine"]["status"] == "PAID"
    assert body["fine"]["payment_method"] == "CARD"
    assert body["driver_points"] == 0
    assert body["license_status"] == "ACTIVE"

    license_response = client.get("/licenses/me", headers=driver_headers)
    assert license_response.json()["points"] == 0


def test_pay_fine_reactivates_suspended_license(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]
    # DRUNK_DRIVING=10 points hits the suspension threshold in one violation.
    violation = _record_violation(client, officer_headers, driver_id, "DRUNK_DRIVING")
    assert violation["license_status"] == "SUSPENDED"
    fine_id = violation["fine"]["id"]

    response = client.post(
        f"/fines/{fine_id}/pay",
        headers=driver_headers,
        json={"payment_method": "WALLET"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["driver_points"] == 0
    assert body["license_status"] == "ACTIVE"


def test_cannot_pay_fine_twice(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]
    violation = _record_violation(client, officer_headers, driver_id)
    fine_id = violation["fine"]["id"]
    client.post(
        f"/fines/{fine_id}/pay", headers=driver_headers, json={"payment_method": "CARD"}
    )

    response = client.post(
        f"/fines/{fine_id}/pay", headers=driver_headers, json={"payment_method": "CARD"}
    )

    assert response.status_code == 409


def test_cannot_pay_someone_elses_fine(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_a_headers = _register_and_login(
        client, email="a@example.com", nic="111111111V"
    )
    driver_b_headers = _register_and_login(
        client, email="b@example.com", nic="222222222V"
    )
    _enroll_driver(client, admin_headers, driver_a_headers)
    driver_a_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "111111111V"}
    ).json()["driver_id"]
    violation = _record_violation(client, officer_headers, driver_a_id)
    fine_id = violation["fine"]["id"]

    response = client.post(
        f"/fines/{fine_id}/pay",
        headers=driver_b_headers,
        json={"payment_method": "CARD"},
    )

    assert response.status_code == 404


def test_pay_nonexistent_fine_returns_404(client, db_session):
    driver_headers = _register_and_login(client)
    response = client.post(
        "/fines/00000000-0000-0000-0000-000000000000/pay",
        headers=driver_headers,
        json={"payment_method": "CARD"},
    )
    assert response.status_code == 404
