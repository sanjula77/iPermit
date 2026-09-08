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


def _multi_face_bytes() -> bytes:
    return (FIXTURES_DIR / "two_faces_fixture.jpg").read_bytes()


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
    """Submits and approves an application with 4 consistent real face
    photos, so the driver ends up with a license + a searchable face
    template -- the setup every police-verification test needs."""
    application = client.post(
        "/applications",
        headers=driver_headers,
        files=_files_with_face_photos([_single_face_bytes()] * 4),
    ).json()
    client.post(
        f"/admin/applications/{application['id']}/approve", headers=admin_headers
    )
    return application


def test_non_officer_cannot_verify_face(client, db_session):
    driver_headers = _register_and_login(client)
    response = client.post(
        "/police/verify-face",
        headers=driver_headers,
        files={"photo": ("photo.jpg", _single_face_bytes(), "image/jpeg")},
    )
    assert response.status_code == 403


def test_verify_face_confident_match_does_not_require_manual_confirmation(
    client, db_session
):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)

    response = client.post(
        "/police/verify-face",
        headers=officer_headers,
        files={"photo": ("photo.jpg", _single_face_bytes(), "image/jpeg")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["requires_manual_confirmation"] is False
    assert body["best_match"]["similarity"] == pytest.approx(1.0, abs=1e-4)
    assert body["best_match"]["driver"]["nic"] == "991234567V"
    assert body["best_match"]["driver"]["license_status"] == "ACTIVE"
    assert body["best_match"]["driver"]["points"] == 0


def test_verify_face_with_no_enrolled_drivers_requires_manual_confirmation(
    client, db_session
):
    officer_headers = _create_officer_and_login(client, db_session)

    response = client.post(
        "/police/verify-face",
        headers=officer_headers,
        files={"photo": ("photo.jpg", _single_face_bytes(), "image/jpeg")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["requires_manual_confirmation"] is True
    assert body["best_match"] is None
    assert body["candidates"] == []


def test_verify_face_rejects_photo_with_no_face(client, db_session):
    officer_headers = _create_officer_and_login(client, db_session)

    response = client.post(
        "/police/verify-face",
        headers=officer_headers,
        files={"photo": ("photo.jpg", _solid_color_bytes(), "image/jpeg")},
    )

    assert response.status_code == 422
    assert "No face detected" in response.json()["detail"]


def test_verify_face_rejects_photo_with_multiple_faces(client, db_session):
    officer_headers = _create_officer_and_login(client, db_session)

    response = client.post(
        "/police/verify-face",
        headers=officer_headers,
        files={"photo": ("photo.jpg", _multi_face_bytes(), "image/jpeg")},
    )

    assert response.status_code == 422
    assert "Multiple faces detected" in response.json()["detail"]


def test_verify_qr_returns_driver_summary(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)

    license_response = client.get("/licenses/me", headers=driver_headers)
    qr_token = license_response.json()["qr_token"]

    response = client.get(f"/police/verify-qr/{qr_token}", headers=officer_headers)

    assert response.status_code == 200
    assert response.json()["nic"] == "991234567V"


def test_verify_qr_unknown_token_returns_404(client, db_session):
    officer_headers = _create_officer_and_login(client, db_session)

    response = client.get("/police/verify-qr/not-a-real-token", headers=officer_headers)

    assert response.status_code == 404


def test_lookup_by_nic(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)

    response = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    )

    assert response.status_code == 200
    assert response.json()["license_status"] == "ACTIVE"


def test_lookup_by_license_no(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    license_no = client.get("/licenses/me", headers=driver_headers).json()["license_no"]

    response = client.get(
        "/police/lookup", headers=officer_headers, params={"license_no": license_no}
    )

    assert response.status_code == 200
    assert response.json()["nic"] == "991234567V"


def test_lookup_without_params_is_rejected(client, db_session):
    officer_headers = _create_officer_and_login(client, db_session)

    response = client.get("/police/lookup", headers=officer_headers)

    assert response.status_code == 422


def test_lookup_unknown_nic_returns_404(client, db_session):
    officer_headers = _create_officer_and_login(client, db_session)

    response = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "000000000V"}
    )

    assert response.status_code == 404


def test_record_violation_deducts_points_and_creates_fine(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get("/licenses/me", headers=driver_headers).json()

    lookup = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()

    response = client.post(
        "/police/violations",
        headers=officer_headers,
        json={"driver_id": lookup["driver_id"], "type": "SPEEDING"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["violation"]["type"] == "SPEEDING"
    assert body["violation"]["points_deducted"] == 4
    assert body["fine"]["status"] == "UNPAID"
    assert body["fine"]["amount"] == 5000
    assert body["driver_points"] == 4
    assert body["license_status"] == "ACTIVE"
    assert driver_id  # sanity: license existed before recording the violation


def test_repeated_violations_suspend_license_at_threshold(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]

    # DRUNK_DRIVING=10 points meets the 10-point suspension threshold in one shot.
    response = client.post(
        "/police/violations",
        headers=officer_headers,
        json={"driver_id": driver_id, "type": "DRUNK_DRIVING"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["driver_points"] == 10
    assert body["license_status"] == "SUSPENDED"

    license_response = client.get("/licenses/me", headers=driver_headers)
    assert license_response.json()["status"] == "SUSPENDED"
    assert license_response.json()["points"] == 10


def test_record_violation_for_driver_without_license_returns_404(client, db_session):
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    me_response = client.get("/applications", headers=driver_headers)
    assert me_response.status_code == 200  # driver exists, just no license yet

    # Look up the driver's id via a lookup that only needs the user to exist
    # -- but lookup requires a license/nic match on our summary endpoint, so
    # fetch the id straight from the DB for this negative test.
    from app.repositories import user_repository as _user_repo

    driver = _user_repo.get_by_nic(db_session, "991234567V")

    response = client.post(
        "/police/violations",
        headers=officer_headers,
        json={"driver_id": str(driver.id), "type": "WHITE_LINE"},
    )

    assert response.status_code == 404
