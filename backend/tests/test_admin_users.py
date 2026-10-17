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


def _setup(client, db_session):
    admin_headers = _create_admin_and_login(client, db_session)
    officer_headers = _create_officer_and_login(client, db_session)
    driver_headers = _register_and_login(client)
    application = _enroll_driver(client, admin_headers, driver_headers)
    driver_id = client.get(
        "/police/lookup", headers=officer_headers, params={"nic": "991234567V"}
    ).json()["driver_id"]
    return {
        "admin_headers": admin_headers,
        "officer_headers": officer_headers,
        "driver_headers": driver_headers,
        "application": application,
        "driver_id": driver_id,
    }


def _officer_id(client, ctx):
    users = client.get(
        "/admin/users", headers=ctx["admin_headers"], params={"role": "POLICE"}
    )
    return users.json()[0]["id"]


def test_document_file_served_to_admin_with_no_store(client, db_session):
    ctx = _setup(client, db_session)
    application = ctx["application"]
    photo = next(d for d in application["documents"] if d["doc_type"] == "FACE_PHOTO")

    response = client.get(
        f"/admin/applications/{application['id']}/documents/{photo['id']}",
        headers=ctx["admin_headers"],
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "private, no-store"
    assert len(response.content) > 0


def test_document_file_requires_admin(client, db_session):
    ctx = _setup(client, db_session)
    application = ctx["application"]
    doc = application["documents"][0]
    url = f"/admin/applications/{application['id']}/documents/{doc['id']}"

    assert client.get(url).status_code == 401
    assert client.get(url, headers=ctx["driver_headers"]).status_code == 403
    assert client.get(url, headers=ctx["officer_headers"]).status_code == 403


def test_document_file_unknown_or_foreign_document_is_404(client, db_session):
    ctx = _setup(client, db_session)
    application = ctx["application"]
    doc = application["documents"][0]
    missing = "00000000-0000-0000-0000-000000000000"

    assert (
        client.get(
            f"/admin/applications/{application['id']}/documents/{missing}",
            headers=ctx["admin_headers"],
        ).status_code
        == 404
    )
    # A real document id under a different application id must not resolve.
    assert (
        client.get(
            f"/admin/applications/{missing}/documents/{doc['id']}",
            headers=ctx["admin_headers"],
        ).status_code
        == 404
    )


def test_users_list_requires_admin(client, db_session):
    driver_headers = _register_and_login(client)
    assert client.get("/admin/users").status_code == 401
    assert client.get("/admin/users", headers=driver_headers).status_code == 403


def test_users_list_shows_drivers_and_officers_but_not_admins(client, db_session):
    ctx = _setup(client, db_session)
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "SPEEDING")

    everyone = client.get("/admin/users", headers=ctx["admin_headers"]).json()
    roles = sorted(u["role"] for u in everyone)
    drivers = client.get(
        "/admin/users", headers=ctx["admin_headers"], params={"role": "DRIVER"}
    ).json()
    officers = client.get(
        "/admin/users", headers=ctx["admin_headers"], params={"role": "POLICE"}
    ).json()

    assert roles == ["DRIVER", "POLICE"]
    assert len(drivers) == 1 and len(officers) == 1
    assert drivers[0]["license_status"] == "ACTIVE"
    assert drivers[0]["points"] == 3
    assert drivers[0]["latest_application_status"] == "APPROVED"
    assert drivers[0]["violation_count"] == 1
    assert officers[0]["violation_count"] == 1


def test_driver_detail_has_licence_applications_and_violations(client, db_session):
    ctx = _setup(client, db_session)
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "SPEEDING")

    body = client.get(
        f"/admin/users/{ctx['driver_id']}", headers=ctx["admin_headers"]
    ).json()

    assert body["role"] == "DRIVER"
    assert body["license"]["status"] == "ACTIVE"
    assert body["license"]["points"] == 3
    assert "qr_token" not in body["license"]
    assert body["badge"]["tier"] in {"PLATINUM", "GOLD", "SILVER", "BRONZE"}
    assert body["behaviour_risk"] == "MEDIUM"
    assert len(body["applications"]) == 1
    assert body["applications"][0]["document_count"] == 7
    assert body["violations"][0]["type"] == "SPEEDING"
    assert body["violations"][0]["fine_status"] == "UNPAID"
    assert body["can_delete"] is False
    assert body["delete_blockers"]


def test_detail_of_unknown_user_or_admin_is_404(client, db_session):
    from app.repositories import user_repository

    ctx = _setup(client, db_session)
    admin = user_repository.get_by_email(db_session, "admin@example.com")
    missing = "00000000-0000-0000-0000-000000000000"
    assert (
        client.get(f"/admin/users/{missing}", headers=ctx["admin_headers"]).status_code
        == 404
    )
    assert (
        client.get(f"/admin/users/{admin.id}", headers=ctx["admin_headers"]).status_code
        == 404
    )


def test_delete_driver_without_records_removes_account_files_and_face(
    client, db_session
):
    from app.core import face_template_store

    ctx = _setup(client, db_session)
    folder = Path(settings.upload_dir) / "applications"
    assert any(folder.rglob("*.jpg"))
    assert face_template_store.get_template(ctx["driver_id"]) is not None
    # The driver also reports an incident and marks a danger zone.
    assert (
        client.post(
            "/road-incidents",
            headers=ctx["driver_headers"],
            json={"type": "ACCIDENT", "severity": "HIGH", "lat": 6.92, "lng": 79.86},
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/danger-zones",
            headers=ctx["driver_headers"],
            json={"lat": 6.92, "lng": 79.86, "radius_m": 200, "severity": "HIGH"},
        ).status_code
        == 201
    )

    response = client.delete(
        f"/admin/users/{ctx['driver_id']}", headers=ctx["admin_headers"]
    )

    assert response.status_code == 204
    assert (
        client.get(
            f"/admin/users/{ctx['driver_id']}", headers=ctx["admin_headers"]
        ).status_code
        == 404
    )
    assert not any(folder.rglob("*.jpg"))
    assert face_template_store.get_template(ctx["driver_id"]) is None
    assert (
        client.post(
            "/auth/login",
            json={"identifier": "991234567V", "password": "supersecret"},
        ).status_code
        == 401
    )


def test_delete_driver_with_violations_is_refused(client, db_session):
    ctx = _setup(client, db_session)
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "SPEEDING")

    response = client.delete(
        f"/admin/users/{ctx['driver_id']}", headers=ctx["admin_headers"]
    )

    assert response.status_code == 409
    assert "violation" in response.json()["detail"]
    assert (
        client.get(
            f"/admin/users/{ctx['driver_id']}", headers=ctx["admin_headers"]
        ).status_code
        == 200
    )


def test_delete_officer_rules(client, db_session):
    ctx = _setup(client, db_session)
    officer_id = _officer_id(client, ctx)
    _record_violation(client, ctx["officer_headers"], ctx["driver_id"], "SPEEDING")

    refused = client.delete(f"/admin/users/{officer_id}", headers=ctx["admin_headers"])
    assert refused.status_code == 409

    _create_officer_and_login(
        client, db_session, email="idle@example.com", nic="OFFICER02"
    )
    idle_id = next(
        u["id"]
        for u in client.get(
            "/admin/users", headers=ctx["admin_headers"], params={"role": "POLICE"}
        ).json()
        if u["email"] == "idle@example.com"
    )
    assert (
        client.delete(
            f"/admin/users/{idle_id}", headers=ctx["admin_headers"]
        ).status_code
        == 204
    )


def test_admin_cannot_delete_self_or_other_admins(client, db_session):
    ctx = _setup(client, db_session)
    _create_admin_and_login(
        client, db_session, email="admin2@example.com", nic="ADMIN0002"
    )
    from app.models.user import UserRole
    from app.repositories import user_repository

    own = user_repository.get_by_email(db_session, "admin@example.com")
    second = user_repository.get_by_email(db_session, "admin2@example.com")
    assert own.role == UserRole.ADMIN

    assert (
        client.delete(
            f"/admin/users/{own.id}", headers=ctx["admin_headers"]
        ).status_code
        == 403
    )
    assert (
        client.delete(
            f"/admin/users/{second.id}", headers=ctx["admin_headers"]
        ).status_code
        == 403
    )


def test_delete_requires_admin(client, db_session):
    ctx = _setup(client, db_session)
    assert (
        client.delete(
            f"/admin/users/{ctx['driver_id']}", headers=ctx["driver_headers"]
        ).status_code
        == 403
    )
    assert (
        client.delete(
            f"/admin/users/{ctx['driver_id']}", headers=ctx["officer_headers"]
        ).status_code
        == 403
    )


def test_delete_unknown_user_is_404(client, db_session):
    ctx = _setup(client, db_session)
    assert (
        client.delete(
            "/admin/users/00000000-0000-0000-0000-000000000000",
            headers=ctx["admin_headers"],
        ).status_code
        == 404
    )


def test_admin_can_open_a_single_application(client, db_session):
    ctx = _setup(client, db_session)
    application = ctx["application"]

    ok = client.get(
        f"/admin/applications/{application['id']}", headers=ctx["admin_headers"]
    )
    assert ok.status_code == 200
    assert ok.json()["id"] == application["id"]
    assert len(ok.json()["documents"]) == 7

    assert (
        client.get(
            f"/admin/applications/{application['id']}", headers=ctx["driver_headers"]
        ).status_code
        == 403
    )
    assert (
        client.get(
            "/admin/applications/00000000-0000-0000-0000-000000000000",
            headers=ctx["admin_headers"],
        ).status_code
        == 404
    )
