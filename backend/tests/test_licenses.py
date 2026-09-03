import io
from datetime import datetime
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


def _fake_image_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (300, 300), color="blue").save(buffer, format="JPEG")
    return buffer.getvalue()


def _face_photo_bytes() -> bytes:
    # Approval now runs real face detection (Phase 4) -- these tests exercise
    # license issuance, not face enrollment itself, so a real single-face
    # fixture is used here purely to let approval succeed.
    return (FIXTURES_DIR / "face_fixture.jpg").read_bytes()


def _valid_files():
    photo = ("photo.jpg", _face_photo_bytes(), "image/jpeg")
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


def test_no_license_before_approval(client):
    driver_headers = _register_and_login(client)
    response = client.get("/licenses/me", headers=driver_headers)
    assert response.status_code == 404


def test_license_requires_auth(client):
    response = client.get("/licenses/me")
    assert response.status_code == 401


def test_approving_application_issues_license(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    application = client.post(
        "/applications", headers=driver_headers, files=_valid_files()
    ).json()

    approve_response = client.post(
        f"/admin/applications/{application['id']}/approve", headers=admin_headers
    )
    assert approve_response.status_code == 200

    license_response = client.get("/licenses/me", headers=driver_headers)
    assert license_response.status_code == 200
    body = license_response.json()
    assert body["status"] == "ACTIVE"
    assert body["license_no"].startswith("DL-")
    assert len(body["qr_token"]) > 20

    issued_at = datetime.fromisoformat(body["issued_at"])
    expiry_at = datetime.fromisoformat(body["expiry_at"])
    assert (expiry_at - issued_at).days == pytest.approx(365 * 5, abs=1)


def test_rejecting_application_does_not_issue_license(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    application = client.post(
        "/applications", headers=driver_headers, files=_valid_files()
    ).json()

    client.post(
        f"/admin/applications/{application['id']}/reject",
        headers=admin_headers,
        json={"reason": "Incomplete documents"},
    )

    license_response = client.get("/licenses/me", headers=driver_headers)
    assert license_response.status_code == 404


def test_each_driver_gets_a_distinct_license(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_a = _register_and_login(client, email="a@example.com", nic="111111111V")
    driver_b = _register_and_login(client, email="b@example.com", nic="222222222V")

    app_a = client.post("/applications", headers=driver_a, files=_valid_files()).json()
    app_b = client.post("/applications", headers=driver_b, files=_valid_files()).json()
    client.post(f"/admin/applications/{app_a['id']}/approve", headers=admin_headers)
    client.post(f"/admin/applications/{app_b['id']}/approve", headers=admin_headers)

    license_a = client.get("/licenses/me", headers=driver_a).json()
    license_b = client.get("/licenses/me", headers=driver_b).json()

    assert license_a["license_no"] != license_b["license_no"]
    assert license_a["qr_token"] != license_b["qr_token"]


def test_other_driver_cannot_see_someone_elses_license(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_a = _register_and_login(client, email="a@example.com", nic="111111111V")
    driver_b = _register_and_login(client, email="b@example.com", nic="222222222V")

    app_a = client.post("/applications", headers=driver_a, files=_valid_files()).json()
    client.post(f"/admin/applications/{app_a['id']}/approve", headers=admin_headers)

    # driver_b has no license of their own -- /me is scoped to the caller,
    # so this must 404, never return driver_a's license.
    response = client.get("/licenses/me", headers=driver_b)
    assert response.status_code == 404
