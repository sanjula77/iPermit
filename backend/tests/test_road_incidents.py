import uuid
from datetime import datetime, timedelta

from app.models.road_incident import RoadIncident


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


def _report(
    client, headers, lat=6.9271, lng=79.8612, incident_type="ACCIDENT", severity="HIGH"
):
    return client.post(
        "/road-incidents",
        headers=headers,
        json={"type": incident_type, "severity": severity, "lat": lat, "lng": lng},
    )


def test_road_incidents_require_auth(client):
    response = client.get("/road-incidents", params={"lat": 6.9271, "lng": 79.8612})
    assert response.status_code == 401


def test_report_and_list_nearby(client, db_session):
    headers = _register_and_login(client)
    report_response = _report(client, headers)
    assert report_response.status_code == 201
    body = report_response.json()
    assert body["status"] == "ACTIVE"
    assert body["confirmation_count"] == 0

    response = client.get(
        "/road-incidents", headers=headers, params={"lat": 6.9271, "lng": 79.8612}
    )

    assert response.status_code == 200
    incidents = response.json()
    assert len(incidents) == 1
    assert incidents[0]["type"] == "ACCIDENT"


def test_incident_far_outside_radius_is_excluded(client, db_session):
    headers = _register_and_login(client)
    # Colombo, Sri Lanka
    _report(client, headers, lat=6.9271, lng=79.8612)

    # London, UK -- thousands of km away, well outside any reasonable radius.
    response = client.get(
        "/road-incidents",
        headers=headers,
        params={"lat": 51.5074, "lng": -0.1278, "radius_km": 5},
    )

    assert response.status_code == 200
    assert response.json() == []


def test_confirm_increments_count_without_changing_status(client, db_session):
    headers = _register_and_login(client)
    incident = _report(client, headers).json()

    response = client.post(f"/road-incidents/{incident['id']}/confirm", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["confirmation_count"] == 1
    assert body["status"] == "ACTIVE"


def test_clear_removes_incident_from_nearby_list(client, db_session):
    headers = _register_and_login(client)
    incident = _report(client, headers).json()

    clear_response = client.post(
        f"/road-incidents/{incident['id']}/clear", headers=headers
    )
    assert clear_response.status_code == 200
    assert clear_response.json()["status"] == "CLEARED"

    nearby = client.get(
        "/road-incidents", headers=headers, params={"lat": 6.9271, "lng": 79.8612}
    ).json()
    assert nearby == []


def test_expired_incident_is_excluded_and_marked_expired(client, db_session):
    headers = _register_and_login(client)
    incident = _report(client, headers).json()

    # Simulate time passing past the expiry window directly on the row --
    # no scheduler exists, expiry is lazy-checked on the next read.
    row = db_session.get(RoadIncident, uuid.UUID(incident["id"]))
    row.expires_at = datetime.utcnow() - timedelta(minutes=1)
    db_session.commit()

    nearby = client.get(
        "/road-incidents", headers=headers, params={"lat": 6.9271, "lng": 79.8612}
    ).json()
    assert nearby == []

    db_session.refresh(row)
    assert row.status.value == "EXPIRED"


def test_confirm_nonexistent_incident_returns_404(client, db_session):
    headers = _register_and_login(client)
    response = client.post(
        "/road-incidents/00000000-0000-0000-0000-000000000000/confirm", headers=headers
    )
    assert response.status_code == 404


def test_report_rejects_invalid_latitude(client, db_session):
    headers = _register_and_login(client)
    response = client.post(
        "/road-incidents",
        headers=headers,
        json={"type": "ACCIDENT", "severity": "HIGH", "lat": 999, "lng": 79.8612},
    )
    assert response.status_code == 422
