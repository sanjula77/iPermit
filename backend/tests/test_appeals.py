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


def test_submit_appeal_success(client, db_session):
    ctx = _setup_driver_with_fine(client, db_session)

    response = client.post(
        "/appeals",
        headers=ctx["driver_headers"],
        json={"fine_id": ctx["fine_id"], "reason": "I was not speeding"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "PENDING"
    assert body["fine"]["id"] == ctx["fine_id"]


def test_cannot_appeal_twice(client, db_session):
    ctx = _setup_driver_with_fine(client, db_session)
    client.post(
        "/appeals",
        headers=ctx["driver_headers"],
        json={"fine_id": ctx["fine_id"], "reason": "x"},
    )

    response = client.post(
        "/appeals",
        headers=ctx["driver_headers"],
        json={"fine_id": ctx["fine_id"], "reason": "y"},
    )

    assert response.status_code == 409


def test_cannot_appeal_a_paid_fine(client, db_session):
    ctx = _setup_driver_with_fine(client, db_session)
    client.post(
        f"/fines/{ctx['fine_id']}/pay",
        headers=ctx["driver_headers"],
        json={"payment_method": "CARD"},
    )

    response = client.post(
        "/appeals",
        headers=ctx["driver_headers"],
        json={"fine_id": ctx["fine_id"], "reason": "x"},
    )

    assert response.status_code == 409


def test_cannot_pay_fine_with_pending_appeal(client, db_session):
    ctx = _setup_driver_with_fine(client, db_session)
    client.post(
        "/appeals",
        headers=ctx["driver_headers"],
        json={"fine_id": ctx["fine_id"], "reason": "x"},
    )

    response = client.post(
        f"/fines/{ctx['fine_id']}/pay",
        headers=ctx["driver_headers"],
        json={"payment_method": "CARD"},
    )

    assert response.status_code == 409


def test_non_admin_cannot_list_appeals(client, db_session):
    ctx = _setup_driver_with_fine(client, db_session)
    response = client.get("/admin/appeals", headers=ctx["driver_headers"])
    assert response.status_code == 403


def test_admin_lists_pending_appeals(client, db_session):
    ctx = _setup_driver_with_fine(client, db_session)
    client.post(
        "/appeals",
        headers=ctx["driver_headers"],
        json={"fine_id": ctx["fine_id"], "reason": "x"},
    )

    response = client.get(
        "/admin/appeals",
        headers=ctx["admin_headers"],
        params={"status_filter": "PENDING"},
    )

    assert response.status_code == 200
    assert response.json()[0]["driver"]["nic"] == "991234567V"
    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "PENDING"


def test_admin_upholds_appeal_leaves_fine_unpaid_and_points_unchanged(
    client, db_session
):
    ctx = _setup_driver_with_fine(client, db_session)
    appeal = client.post(
        "/appeals",
        headers=ctx["driver_headers"],
        json={"fine_id": ctx["fine_id"], "reason": "x"},
    ).json()

    response = client.post(
        f"/admin/appeals/{appeal['id']}/resolve",
        headers=ctx["admin_headers"],
        json={"resolution": "UPHELD"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "UPHELD"

    license_response = client.get("/licenses/me", headers=ctx["driver_headers"])
    assert license_response.json()["points"] == 4  # SPEEDING points, untouched

    fines_response = client.get("/fines/me", headers=ctx["driver_headers"])
    assert fines_response.json()[0]["status"] == "UNPAID"

    # An upheld appeal doesn't block later payment.
    pay_response = client.post(
        f"/fines/{ctx['fine_id']}/pay",
        headers=ctx["driver_headers"],
        json={"payment_method": "BANK"},
    )
    assert pay_response.status_code == 200


def test_admin_overturns_appeal_reverses_fine_and_restores_points(client, db_session):
    ctx = _setup_driver_with_fine(client, db_session)
    appeal = client.post(
        "/appeals",
        headers=ctx["driver_headers"],
        json={"fine_id": ctx["fine_id"], "reason": "x"},
    ).json()

    response = client.post(
        f"/admin/appeals/{appeal['id']}/resolve",
        headers=ctx["admin_headers"],
        json={"resolution": "OVERTURNED"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "OVERTURNED"

    license_response = client.get("/licenses/me", headers=ctx["driver_headers"])
    assert license_response.json()["points"] == 0

    fines_response = client.get("/fines/me", headers=ctx["driver_headers"])
    assert fines_response.json()[0]["status"] == "REVERSED"

    # A reversed fine can no longer be paid.
    pay_response = client.post(
        f"/fines/{ctx['fine_id']}/pay",
        headers=ctx["driver_headers"],
        json={"payment_method": "CARD"},
    )
    assert pay_response.status_code == 409


def test_cannot_resolve_appeal_twice(client, db_session):
    ctx = _setup_driver_with_fine(client, db_session)
    appeal = client.post(
        "/appeals",
        headers=ctx["driver_headers"],
        json={"fine_id": ctx["fine_id"], "reason": "x"},
    ).json()
    client.post(
        f"/admin/appeals/{appeal['id']}/resolve",
        headers=ctx["admin_headers"],
        json={"resolution": "UPHELD"},
    )

    response = client.post(
        f"/admin/appeals/{appeal['id']}/resolve",
        headers=ctx["admin_headers"],
        json={"resolution": "OVERTURNED"},
    )

    assert response.status_code == 409
