import io
from pathlib import Path

import pytest
from PIL import Image

from app.core import face_index, face_template_store
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


def _multi_face_bytes() -> bytes:
    return (FIXTURES_DIR / "two_faces_fixture.jpg").read_bytes()


def _files_with_face_photos(face_photo_bytes_list: list[bytes]) -> list:
    """Builds the multipart form for /applications. Only face_photos content
    matters for enrollment -- nic/medical/birth just need to be valid images."""
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


def test_approve_with_consistent_face_photos_enrolls_face(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)

    application = client.post(
        "/applications",
        headers=driver_headers,
        files=_files_with_face_photos([_single_face_bytes()] * 4),
    ).json()

    response = client.post(
        f"/admin/applications/{application['id']}/approve", headers=admin_headers
    )

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"

    driver_id = application["driver_id"]
    stored = face_template_store.get_template(driver_id)
    assert stored is not None
    assert stored.shape == (512,)

    loaded = face_index.rebuild_index()
    assert loaded == 1
    matches = face_index.search(stored, k=1)
    assert len(matches) == 1
    similarity, _rowid = matches[0]
    assert similarity == pytest.approx(1.0, abs=1e-4)

    license_response = client.get("/licenses/me", headers=driver_headers)
    assert license_response.status_code == 200


def test_approve_fails_when_a_photo_has_no_face(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)

    photos = [_single_face_bytes()] * 3 + [_solid_color_bytes()]
    application = client.post(
        "/applications", headers=driver_headers, files=_files_with_face_photos(photos)
    ).json()

    response = client.post(
        f"/admin/applications/{application['id']}/approve", headers=admin_headers
    )

    assert response.status_code == 422
    assert "No face detected" in response.json()["detail"]

    driver_view = client.get(
        f"/applications/{application['id']}", headers=driver_headers
    )
    assert driver_view.json()["status"] == "PENDING"

    license_response = client.get("/licenses/me", headers=driver_headers)
    assert license_response.status_code == 404

    assert face_template_store.get_template(application["driver_id"]) is None


def test_approve_fails_when_a_photo_has_multiple_faces(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)

    photos = [_single_face_bytes()] * 3 + [_multi_face_bytes()]
    application = client.post(
        "/applications", headers=driver_headers, files=_files_with_face_photos(photos)
    ).json()

    response = client.post(
        f"/admin/applications/{application['id']}/approve", headers=admin_headers
    )

    assert response.status_code == 422
    assert "Multiple faces detected" in response.json()["detail"]

    driver_view = client.get(
        f"/applications/{application['id']}", headers=driver_headers
    )
    assert driver_view.json()["status"] == "PENDING"

    license_response = client.get("/licenses/me", headers=driver_headers)
    assert license_response.status_code == 404

    assert face_template_store.get_template(application["driver_id"]) is None


def test_face_status_endpoint_discloses_liveness_is_disabled(client):
    response = client.get("/face/status")

    assert response.status_code == 200
    body = response.json()
    assert body["liveness_check_enabled"] is False
    assert "not implemented" in body["note"]
