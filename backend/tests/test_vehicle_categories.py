import pytest

from app.core.config import settings
from app.models.user import UserRole
from tests.test_licenses import (
    _create_admin_and_login,
    _register_and_login,
    _valid_files,
)
from tests.test_police import _create_officer_and_login


@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))


def _apply(client, headers, categories):
    return client.post(
        "/applications",
        headers=headers,
        files=_valid_files(),
        data={"categories": categories},
    )


def test_application_records_the_requested_categories(client):
    headers = _register_and_login(client)

    response = _apply(client, headers, ["B", "A", "B"])

    assert response.status_code == 201
    assert response.json()["requested_categories"] == ["B", "A"]  # repeats dropped


def test_unknown_category_is_rejected(client):
    headers = _register_and_login(client)

    response = _apply(client, headers, ["Z9"])

    assert response.status_code == 422


def test_approval_grants_the_requested_categories(client, db_session):
    admin = _create_admin_and_login(client, db_session)
    headers = _register_and_login(client)
    application = _apply(client, headers, ["G1", "B", "A1"]).json()

    client.post(f"/admin/applications/{application['id']}/approve", headers=admin)

    license_ = client.get("/licenses/me", headers=headers).json()
    # In the order printed on the card, not the order requested.
    assert [c["category"] for c in license_["categories"]] == ["A1", "B", "G1"]
    assert all(c["expiry_at"] == license_["expiry_at"] for c in license_["categories"])
    assert all(c["issued_at"] == license_["issued_at"] for c in license_["categories"])


def test_admin_can_grant_different_categories(client, db_session):
    admin = _create_admin_and_login(client, db_session)
    headers = _register_and_login(client)
    application = _apply(client, headers, ["B", "C"]).json()

    approve = client.post(
        f"/admin/applications/{application['id']}/approve",
        headers=admin,
        json={"categories": ["B", "A"]},
    )

    assert approve.status_code == 200
    license_ = client.get("/licenses/me", headers=headers).json()
    assert [c["category"] for c in license_["categories"]] == ["A", "B"]


def test_admin_cannot_grant_an_unknown_category(client, db_session):
    admin = _create_admin_and_login(client, db_session)
    headers = _register_and_login(client)
    application = _apply(client, headers, ["B"]).json()

    response = client.post(
        f"/admin/applications/{application['id']}/approve",
        headers=admin,
        json={"categories": ["ZZ"]},
    )

    assert response.status_code == 422
    assert client.get("/licenses/me", headers=headers).status_code == 404


def test_no_categories_means_an_empty_list_not_an_error(client, db_session):
    admin = _create_admin_and_login(client, db_session)
    headers = _register_and_login(client)
    application = client.post(
        "/applications", headers=headers, files=_valid_files()
    ).json()

    client.post(f"/admin/applications/{application['id']}/approve", headers=admin)

    assert client.get("/licenses/me", headers=headers).json()["categories"] == []


def test_officer_lookup_shows_what_the_driver_may_drive(client, db_session):
    admin = _create_admin_and_login(client, db_session)
    officer = _create_officer_and_login(client, db_session)
    headers = _register_and_login(client)
    application = _apply(client, headers, ["B", "A"]).json()
    client.post(f"/admin/applications/{application['id']}/approve", headers=admin)

    response = client.get(
        "/police/lookup", headers=officer, params={"nic": "991234567V"}
    )

    assert response.status_code == 200
    assert [c["category"] for c in response.json()["categories"]] == ["A", "B"]


def test_deleting_a_driver_removes_their_categories(client, db_session):
    from sqlalchemy import func, select

    from app.models.license import LicenseCategory
    from app.repositories import user_repository
    from app.services import admin_user_service

    admin = _create_admin_and_login(client, db_session)
    headers = _register_and_login(client)
    application = _apply(client, headers, ["B", "A"]).json()
    client.post(f"/admin/applications/{application['id']}/approve", headers=admin)
    driver = user_repository.get_by_email(db_session, "driver@example.com")
    assert driver.role == UserRole.DRIVER

    # A driver with no violations can be deleted; their category rows go too.
    admin_user = user_repository.get_by_email(db_session, "admin@example.com")
    admin_user_service.delete_user(
        db_session, user_id=driver.id, acting_admin_id=admin_user.id
    )

    assert db_session.scalar(select(func.count()).select_from(LicenseCategory)) == 0
