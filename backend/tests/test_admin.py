import io

import pytest
from PIL import Image

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import UserRole
from app.repositories import user_repository


@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))


def _fake_image_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (300, 300), color="blue").save(buffer, format="JPEG")
    return buffer.getvalue()


def _valid_files():
    photo = ("photo.jpg", _fake_image_bytes(), "image/jpeg")
    return [
        ("face_photos", photo),
        ("face_photos", photo),
        ("face_photos", photo),
        ("face_photos", photo),
        ("nic_document", ("nic.jpg", _fake_image_bytes(), "image/jpeg")),
        ("medical_cert", ("medical.jpg", _fake_image_bytes(), "image/jpeg")),
        ("birth_cert", ("birth.jpg", _fake_image_bytes(), "image/jpeg")),
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


def _create_admin_and_login(
    client, db_session, email="admin@example.com", nic="ADMIN0001"
):
    # Admins are never self-registered over HTTP (REQ-1 AC4) -- create directly
    # via the repository, the same path app/scripts/create_admin.py uses.
    user_repository.create(
        db_session,
        email=email,
        nic=nic,
        password_hash=hash_password("adminpass123"),
        role=UserRole.ADMIN,
    )
    response = client.post(
        "/auth/login", json={"identifier": email, "password": "adminpass123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _submit_application(client, driver_headers):
    return client.post("/applications", headers=driver_headers, files=_valid_files())


def test_non_admin_cannot_list_applications(client):
    driver_headers = _register_and_login(client)
    response = client.get("/admin/applications", headers=driver_headers)
    assert response.status_code == 403


def test_admin_can_list_all_applications_across_drivers(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_a = _register_and_login(client, email="a@example.com", nic="111111111V")
    driver_b = _register_and_login(client, email="b@example.com", nic="222222222V")
    _submit_application(client, driver_a)
    _submit_application(client, driver_b)

    response = client.get("/admin/applications", headers=admin_headers)

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_admin_can_filter_by_status(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver = _register_and_login(client)
    created = _submit_application(client, driver).json()
    client.post(f"/admin/applications/{created['id']}/approve", headers=admin_headers)

    pending = client.get(
        "/admin/applications?status_filter=PENDING", headers=admin_headers
    )
    approved = client.get(
        "/admin/applications?status_filter=APPROVED", headers=admin_headers
    )

    assert pending.json() == []
    assert len(approved.json()) == 1
    assert approved.json()[0]["status"] == "APPROVED"


def test_approve_application(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver = _register_and_login(client)
    created = _submit_application(client, driver).json()

    response = client.post(
        f"/admin/applications/{created['id']}/approve", headers=admin_headers
    )

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"


def test_cannot_approve_twice(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver = _register_and_login(client)
    created = _submit_application(client, driver).json()
    client.post(f"/admin/applications/{created['id']}/approve", headers=admin_headers)

    response = client.post(
        f"/admin/applications/{created['id']}/approve", headers=admin_headers
    )

    assert response.status_code == 409


def test_reject_application_requires_reason(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver = _register_and_login(client)
    created = _submit_application(client, driver).json()

    response = client.post(
        f"/admin/applications/{created['id']}/reject",
        headers=admin_headers,
        json={"reason": ""},
    )

    assert response.status_code == 422


def test_reject_application_success(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver = _register_and_login(client)
    created = _submit_application(client, driver).json()

    response = client.post(
        f"/admin/applications/{created['id']}/reject",
        headers=admin_headers,
        json={"reason": "Photos are blurry"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "REJECTED"
    assert body["reason"] == "Photos are blurry"


def test_approve_nonexistent_application(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    response = client.post(
        "/admin/applications/00000000-0000-0000-0000-000000000000/approve",
        headers=admin_headers,
    )
    assert response.status_code == 404


def test_driver_sees_updated_status_after_admin_decision(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    created = _submit_application(client, driver_headers).json()

    client.post(
        f"/admin/applications/{created['id']}/reject",
        headers=admin_headers,
        json={"reason": "Missing document"},
    )

    driver_view = client.get(f"/applications/{created['id']}", headers=driver_headers)
    assert driver_view.json()["status"] == "REJECTED"
    assert driver_view.json()["reason"] == "Missing document"
