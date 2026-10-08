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


def _approved_driver(client, db_session, categories):
    admin = _create_admin_and_login(client, db_session)
    headers = _register_and_login(client)
    application = _apply(client, headers, categories).json()
    client.post(f"/admin/applications/{application['id']}/approve", headers=admin)
    license_ = client.get("/licenses/me", headers=headers).json()
    return admin, headers, license_


def test_admin_can_replace_a_licences_categories(client, db_session):
    admin, headers, license_ = _approved_driver(client, db_session, ["B", "A"])

    response = client.put(
        f"/admin/licenses/{license_['id']}/categories",
        headers=admin,
        json={"categories": ["B", "C1", "D1"]},
    )

    assert response.status_code == 200
    assert [c["category"] for c in response.json()["categories"]] == ["B", "C1", "D1"]
    assert "qr_token" not in response.json()
    mine = client.get("/licenses/me", headers=headers).json()
    assert [c["category"] for c in mine["categories"]] == ["B", "C1", "D1"]


def test_categories_that_stay_keep_their_start_date(client, db_session):
    admin, headers, license_ = _approved_driver(client, db_session, ["B"])
    original = license_["categories"][0]["issued_at"]

    client.put(
        f"/admin/licenses/{license_['id']}/categories",
        headers=admin,
        json={"categories": ["B", "A"]},
    )

    categories = {
        c["category"]: c
        for c in client.get("/licenses/me", headers=headers).json()["categories"]
    }
    assert categories["B"]["issued_at"] == original
    # New ones run to the licence's expiry, like the ones granted at approval.
    assert categories["A"]["expiry_at"] == license_["expiry_at"]


def test_a_licence_must_keep_at_least_one_category(client, db_session):
    admin, _headers, license_ = _approved_driver(client, db_session, ["B"])

    response = client.put(
        f"/admin/licenses/{license_['id']}/categories",
        headers=admin,
        json={"categories": []},
    )

    assert response.status_code == 422


def test_unknown_category_or_licence_is_rejected(client, db_session):
    admin, _headers, license_ = _approved_driver(client, db_session, ["B"])

    bad_category = client.put(
        f"/admin/licenses/{license_['id']}/categories",
        headers=admin,
        json={"categories": ["ZZ"]},
    )
    missing = client.put(
        "/admin/licenses/00000000-0000-0000-0000-000000000000/categories",
        headers=admin,
        json={"categories": ["B"]},
    )

    assert bad_category.status_code == 422
    assert missing.status_code == 404


def test_only_an_admin_can_edit_categories(client, db_session):
    _admin, headers, license_ = _approved_driver(client, db_session, ["B"])
    officer = _create_officer_and_login(client, db_session)

    for who in (headers, officer):
        response = client.put(
            f"/admin/licenses/{license_['id']}/categories",
            headers=who,
            json={"categories": ["A"]},
        )
        assert response.status_code == 403
    assert (
        client.put(
            f"/admin/licenses/{license_['id']}/categories", json={"categories": ["A"]}
        ).status_code
        == 401
    )


def test_admin_user_detail_lists_the_licence_and_its_categories(client, db_session):
    admin, headers, license_ = _approved_driver(client, db_session, ["G1", "B"])
    users = client.get("/admin/users", headers=admin).json()
    driver_id = next(u["id"] for u in users if u["email"] == "driver@example.com")

    detail = client.get(f"/admin/users/{driver_id}", headers=admin).json()

    assert detail["license"]["id"] == license_["id"]
    assert [c["category"] for c in detail["license"]["categories"]] == ["B", "G1"]
    assert "qr_token" not in detail["license"]
