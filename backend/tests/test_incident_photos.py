import io
from pathlib import Path

import pytest
from PIL import Image

from app.core.config import settings
from app.models.road_incident import RoadIncident
from tests.test_road_incidents import _register_and_login, _report


@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))


def _jpeg(size=(300, 300), exif_gps=False) -> bytes:
    image = Image.new("RGB", size, color="blue")
    buffer = io.BytesIO()
    if exif_gps:
        exif = Image.Exif()
        exif[0x010F] = "SecretPhoneMaker"  # camera make, stands in for EXIF data
        image.save(buffer, format="JPEG", exif=exif)
    else:
        image.save(buffer, format="JPEG")
    return buffer.getvalue()


def _upload(client, headers, incident_id, content=None, content_type="image/jpeg"):
    return client.post(
        f"/road-incidents/{incident_id}/photo",
        headers=headers,
        files={"photo": ("scene.jpg", content or _jpeg(), content_type)},
    )


def _incident_with_photo(client):
    owner = _register_and_login(client)
    incident_id = _report(client, owner).json()["id"]
    assert _upload(client, owner, incident_id).status_code == 200
    return owner, incident_id


def test_a_new_incident_has_no_photo(client):
    headers = _register_and_login(client)
    body = _report(client, headers).json()
    assert body["has_photo"] is False
    assert "photo_path" not in body


def test_reporter_adds_a_photo_and_another_driver_can_see_it(client):
    owner, incident_id = _incident_with_photo(client)
    other = _register_and_login(client, "other@example.com", "881234567V")

    listed = client.get(
        "/road-incidents", headers=other, params={"lat": 6.9271, "lng": 79.8612}
    ).json()
    assert listed[0]["has_photo"] is True
    assert "photo_path" not in listed[0]

    response = client.get(f"/road-incidents/{incident_id}/photo", headers=other)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "private, no-store"
    assert Image.open(io.BytesIO(response.content)).size == (300, 300)


def test_only_the_reporter_can_add_a_photo(client):
    owner = _register_and_login(client)
    incident_id = _report(client, owner).json()["id"]
    other = _register_and_login(client, "other@example.com", "881234567V")

    assert _upload(client, other, incident_id).status_code == 403


def test_second_photo_is_rejected(client):
    owner, incident_id = _incident_with_photo(client)
    assert _upload(client, owner, incident_id).status_code == 409


def test_photo_for_unknown_incident_is_404(client):
    headers = _register_and_login(client)
    missing = "00000000-0000-0000-0000-000000000000"
    assert _upload(client, headers, missing).status_code == 404
    assert (
        client.get(f"/road-incidents/{missing}/photo", headers=headers).status_code
        == 404
    )


def test_photo_requires_login(client):
    _owner, incident_id = _incident_with_photo(client)
    assert client.get(f"/road-incidents/{incident_id}/photo").status_code == 401


def test_incident_without_photo_returns_404(client):
    headers = _register_and_login(client)
    incident_id = _report(client, headers).json()["id"]
    assert (
        client.get(f"/road-incidents/{incident_id}/photo", headers=headers).status_code
        == 404
    )


def test_non_image_and_tiny_images_are_rejected(client):
    headers = _register_and_login(client)
    incident_id = _report(client, headers).json()["id"]

    wrong_type = _upload(client, headers, incident_id, b"hello", "text/plain")
    assert wrong_type.status_code == 422

    fake_image = _upload(client, headers, incident_id, b"not really a jpeg")
    assert fake_image.status_code == 422

    tiny = _upload(client, headers, incident_id, _jpeg(size=(50, 50)))
    assert tiny.status_code == 422


def test_stored_photo_has_its_exif_removed(client, tmp_path):
    headers = _register_and_login(client)
    incident_id = _report(client, headers).json()["id"]
    assert (
        _upload(client, headers, incident_id, _jpeg(exif_gps=True)).status_code == 200
    )

    stored = next(Path(tmp_path, "incidents").iterdir())
    assert len(Image.open(stored).getexif()) == 0


def test_clearing_the_incident_deletes_the_photo(client, tmp_path):
    owner, incident_id = _incident_with_photo(client)
    assert any(Path(tmp_path, "incidents").iterdir())

    assert (
        client.post(f"/road-incidents/{incident_id}/clear", headers=owner).status_code
        == 200
    )

    assert not any(Path(tmp_path, "incidents").iterdir())
    assert (
        client.get(f"/road-incidents/{incident_id}/photo", headers=owner).status_code
        == 404
    )
    assert _upload(client, owner, incident_id).status_code == 409


def test_expired_incident_loses_its_photo(client, db_session, tmp_path):
    from datetime import datetime, timedelta

    owner, incident_id = _incident_with_photo(client)
    incident = db_session.query(RoadIncident).one()
    incident.expires_at = datetime.utcnow() - timedelta(minutes=1)
    db_session.commit()

    listed = client.get(
        "/road-incidents", headers=owner, params={"lat": 6.9271, "lng": 79.8612}
    ).json()
    assert listed == []
    assert not any(Path(tmp_path, "incidents").iterdir())
    assert db_session.query(RoadIncident).one().photo_path is None
