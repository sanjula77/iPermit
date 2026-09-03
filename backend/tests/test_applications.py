import io

import pytest
from PIL import Image

from app.core.config import settings


@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path, monkeypatch):
    """Redirect uploads to a temp dir per test so tests never touch real
    storage and never leak files between runs."""
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))


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


def _fake_image_bytes(size=(300, 300)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, color="blue").save(buffer, format="JPEG")
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


def test_submit_application_success(client):
    headers = _register_and_login(client)

    response = client.post("/applications", headers=headers, files=_valid_files())

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "PENDING"
    assert len(body["documents"]) == 7
    doc_types = sorted(d["doc_type"] for d in body["documents"])
    assert doc_types == sorted(
        ["FACE_PHOTO"] * 4 + ["NIC", "MEDICAL_CERT", "BIRTH_CERT"]
    )


def test_submit_application_wrong_photo_count(client):
    headers = _register_and_login(client)
    # Exactly 2 face photos, violating the "exactly 4" rule (REQ-2).
    photo = ("photo.jpg", _fake_image_bytes(), "image/jpeg")
    files = [
        ("face_photos", photo),
        ("face_photos", photo),
        ("nic_document", ("nic.jpg", _fake_image_bytes(), "image/jpeg")),
        ("medical_cert", ("medical.jpg", _fake_image_bytes(), "image/jpeg")),
        ("birth_cert", ("birth.jpg", _fake_image_bytes(), "image/jpeg")),
    ]

    response = client.post("/applications", headers=headers, files=files)

    assert response.status_code == 422
    assert "4 face photos" in response.json()["detail"]


def test_submit_application_rejects_invalid_image(client):
    headers = _register_and_login(client)
    files = _valid_files()
    # Corrupt the first face photo: valid content-type claim, garbage bytes.
    files[0] = ("face_photos", ("photo.jpg", b"not-an-image", "image/jpeg"))

    response = client.post("/applications", headers=headers, files=files)

    assert response.status_code == 422
    assert "not a valid image" in response.json()["detail"]


def test_submit_application_rejects_wrong_content_type(client):
    headers = _register_and_login(client)
    files = _valid_files()
    files[0] = ("face_photos", ("photo.txt", b"hello", "text/plain"))

    response = client.post("/applications", headers=headers, files=files)

    assert response.status_code == 422
    assert "Unsupported file type" in response.json()["detail"]


def test_submit_application_requires_auth(client):
    response = client.post("/applications", files=_valid_files())
    assert response.status_code == 401


def test_no_orphaned_files_on_validation_failure(client, tmp_path):
    headers = _register_and_login(client)
    files = _valid_files()
    files[-1] = ("birth_cert", ("bad.txt", b"nope", "text/plain"))

    response = client.post("/applications", headers=headers, files=files)

    assert response.status_code == 422
    # The 4 valid face photos + nic + medical were saved before the failing
    # birth_cert was hit — they must be cleaned up, not left orphaned on disk.
    leftover = list(tmp_path.rglob("*"))
    leftover_files = [p for p in leftover if p.is_file()]
    assert leftover_files == []


def test_list_applications_returns_only_own(client):
    headers_a = _register_and_login(client, email="a@example.com", nic="111111111V")
    headers_b = _register_and_login(client, email="b@example.com", nic="222222222V")

    client.post("/applications", headers=headers_a, files=_valid_files())

    response_a = client.get("/applications", headers=headers_a)
    response_b = client.get("/applications", headers=headers_b)

    assert len(response_a.json()) == 1
    assert len(response_b.json()) == 0


def test_get_application_forbidden_for_other_driver(client):
    headers_a = _register_and_login(client, email="a@example.com", nic="111111111V")
    headers_b = _register_and_login(client, email="b@example.com", nic="222222222V")

    created = client.post("/applications", headers=headers_a, files=_valid_files())
    application_id = created.json()["id"]

    own_response = client.get(f"/applications/{application_id}", headers=headers_a)
    other_response = client.get(f"/applications/{application_id}", headers=headers_b)

    assert own_response.status_code == 200
    assert other_response.status_code == 403


def test_get_application_not_found(client):
    headers = _register_and_login(client)
    response = client.get(
        "/applications/00000000-0000-0000-0000-000000000000", headers=headers
    )
    assert response.status_code == 404
