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


def _submit_application(client, driver_headers):
    return client.post(
        "/applications",
        headers=driver_headers,
        files=_files_with_face_photos([_single_face_bytes()] * 4),
    )


def _enroll_driver(client, admin_headers, driver_headers) -> dict:
    application = _submit_application(client, driver_headers).json()
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


def _notification_types(client, driver_headers) -> list[str]:
    return [
        n["type"]
        for n in client.get("/notifications/me", headers=driver_headers).json()
    ]


def test_notifications_require_auth(client):
    response = client.get("/notifications/me")
    assert response.status_code == 401


def test_notification_on_license_approval(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)

    assert "LICENSE_APPROVED" in _notification_types(client, driver_headers)


def test_notification_on_license_rejection(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    application = _submit_application(client, driver_headers).json()

    client.post(
        f"/admin/applications/{application['id']}/reject",
        headers=admin_headers,
        json={"reason": "Blurry photos"},
    )

    types = _notification_types(client, driver_headers)
    assert "LICENSE_REJECTED" in types


def test_notification_on_violation_and_suspension(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]

    _record_violation(client, officer_headers, driver_id, "DRUNK_DRIVING")

    types = _notification_types(client, driver_headers)
    assert "FINE_ISSUED" in types
    assert "LICENSE_SUSPENDED" in types
    assert "BADGE_CHANGED" in types  # PLATINUM -> SUSPENDED is a real transition


def test_no_suspension_notification_for_minor_violation(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]

    _record_violation(client, officer_headers, driver_id, "WHITE_LINE")

    types = _notification_types(client, driver_headers)
    assert "FINE_ISSUED" in types
    assert "LICENSE_SUSPENDED" not in types


def test_notification_on_payment(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]
    violation = _record_violation(client, officer_headers, driver_id, "SPEEDING")

    client.post(
        f"/fines/{violation['fine']['id']}/pay",
        headers=driver_headers,
        json={"payment_method": "CARD"},
    )

    assert "PAYMENT_CONFIRMED" in _notification_types(client, driver_headers)


def test_notification_on_appeal_upheld_and_overturned(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)

    # Driver A: appeal upheld.
    driver_a_headers = _register_and_login(
        client, email="a@example.com", nic="111111111V"
    )
    _enroll_driver(client, admin_headers, driver_a_headers)
    driver_a_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "111111111V"}
    ).json()["driver_id"]
    violation_a = _record_violation(client, officer_headers, driver_a_id)
    appeal_a = client.post(
        "/appeals",
        headers=driver_a_headers,
        json={"fine_id": violation_a["fine"]["id"], "reason": "x"},
    ).json()
    client.post(
        f"/admin/appeals/{appeal_a['id']}/resolve",
        headers=admin_headers,
        json={"resolution": "UPHELD"},
    )
    assert "APPEAL_UPHELD" in _notification_types(client, driver_a_headers)

    # Driver B: appeal overturned.
    driver_b_headers = _register_and_login(
        client, email="b@example.com", nic="222222222V"
    )
    _enroll_driver(client, admin_headers, driver_b_headers)
    driver_b_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "222222222V"}
    ).json()["driver_id"]
    violation_b = _record_violation(client, officer_headers, driver_b_id)
    appeal_b = client.post(
        "/appeals",
        headers=driver_b_headers,
        json={"fine_id": violation_b["fine"]["id"], "reason": "x"},
    ).json()
    client.post(
        f"/admin/appeals/{appeal_b['id']}/resolve",
        headers=admin_headers,
        json={"resolution": "OVERTURNED"},
    )
    assert "APPEAL_OVERTURNED" in _notification_types(client, driver_b_headers)


def test_mark_notification_read(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    _enroll_driver(client, admin_headers, driver_headers)
    notification = client.get("/notifications/me", headers=driver_headers).json()[0]
    assert notification["read_at"] is None

    response = client.post(
        f"/notifications/{notification['id']}/read", headers=driver_headers
    )

    assert response.status_code == 200
    assert response.json()["read_at"] is not None


def test_cannot_mark_someone_elses_notification_read(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_a_headers = _register_and_login(
        client, email="a@example.com", nic="111111111V"
    )
    driver_b_headers = _register_and_login(
        client, email="b@example.com", nic="222222222V"
    )
    _enroll_driver(client, admin_headers, driver_a_headers)
    notification = client.get("/notifications/me", headers=driver_a_headers).json()[0]

    response = client.post(
        f"/notifications/{notification['id']}/read", headers=driver_b_headers
    )

    assert response.status_code == 403


def test_register_push_token_triggers_push_on_next_notification(
    client, db_session, monkeypatch
):
    admin_headers = _create_admin_and_login(client, db_session)
    driver_headers = _register_and_login(client)

    calls = []
    monkeypatch.setattr(
        "app.services.notification_service.push_service.send_push_notification",
        lambda token, *, title, body: calls.append((token, title, body)),
    )

    register_response = client.post(
        "/notifications/register-push-token",
        headers=driver_headers,
        json={"token": "ExponentPushToken[test]"},
    )
    assert register_response.status_code == 204

    application = _submit_application(client, driver_headers).json()
    client.post(
        f"/admin/applications/{application['id']}/reject",
        headers=admin_headers,
        json={"reason": "test"},
    )

    assert len(calls) == 1
    assert calls[0][0] == "ExponentPushToken[test]"
