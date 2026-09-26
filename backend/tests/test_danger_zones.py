import uuid

from app.models.danger_zone import DangerZone


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


def _mark(
    client, headers, lat=6.9271, lng=79.8612, radius_m=200, severity="HIGH", reason=None
):
    payload = {"lat": lat, "lng": lng, "radius_m": radius_m, "severity": severity}
    if reason is not None:
        payload["reason"] = reason
    return client.post("/danger-zones", headers=headers, json=payload)


def test_danger_zones_require_auth(client):
    response = client.get("/danger-zones", params={"lat": 6.9271, "lng": 79.8612})
    assert response.status_code == 401


def test_mark_and_list_nearby(client, db_session):
    headers = _register_and_login(client)
    mark_response = _mark(client, headers, reason="Blind curve, frequent accidents")
    assert mark_response.status_code == 201
    body = mark_response.json()
    assert body["status"] == "ACTIVE"
    assert body["confirmation_count"] == 0
    assert body["reason"] == "Blind curve, frequent accidents"

    response = client.get(
        "/danger-zones", headers=headers, params={"lat": 6.9271, "lng": 79.8612}
    )

    assert response.status_code == 200
    zones = response.json()
    assert len(zones) == 1
    assert zones[0]["severity"] == "HIGH"


def test_zone_far_outside_radius_is_excluded(client, db_session):
    headers = _register_and_login(client)
    # Colombo, Sri Lanka
    _mark(client, headers, lat=6.9271, lng=79.8612)

    # London, UK -- thousands of km away, well outside any reasonable radius.
    response = client.get(
        "/danger-zones",
        headers=headers,
        params={"lat": 51.5074, "lng": -0.1278, "radius_km": 5},
    )

    assert response.status_code == 200
    assert response.json() == []


def test_confirm_increments_count_without_changing_status(client, db_session):
    headers = _register_and_login(client)
    zone = _mark(client, headers).json()

    response = client.post(f"/danger-zones/{zone['id']}/confirm", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["confirmation_count"] == 1
    assert body["status"] == "ACTIVE"


def test_clear_removes_zone_from_nearby_list(client, db_session):
    headers = _register_and_login(client)
    zone = _mark(client, headers).json()

    clear_response = client.post(f"/danger-zones/{zone['id']}/clear", headers=headers)
    assert clear_response.status_code == 200
    assert clear_response.json()["status"] == "CLEARED"

    nearby = client.get(
        "/danger-zones", headers=headers, params={"lat": 6.9271, "lng": 79.8612}
    ).json()
    assert nearby == []


def test_clear_is_idempotent(client, db_session):
    headers = _register_and_login(client)
    zone = _mark(client, headers).json()

    first = client.post(f"/danger-zones/{zone['id']}/clear", headers=headers)
    second = client.post(f"/danger-zones/{zone['id']}/clear", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["status"] == "CLEARED"
    assert second.json()["cleared_at"] == first.json()["cleared_at"]


def test_clear_by_different_user_succeeds(client, db_session):
    """No ownership check -- any authenticated user can clear any zone,
    matching the incident-clear convention (spec decision: no moderation)."""
    creator_headers = _register_and_login(
        client, email="driver1@example.com", nic="991234567V"
    )
    zone = _mark(client, creator_headers).json()

    other_headers = _register_and_login(
        client, email="driver2@example.com", nic="992345678V"
    )
    response = client.post(f"/danger-zones/{zone['id']}/clear", headers=other_headers)

    assert response.status_code == 200
    assert response.json()["status"] == "CLEARED"


def test_confirm_nonexistent_zone_returns_404(client, db_session):
    headers = _register_and_login(client)
    response = client.post(
        "/danger-zones/00000000-0000-0000-0000-000000000000/confirm", headers=headers
    )
    assert response.status_code == 404


def test_mark_rejects_radius_below_minimum(client, db_session):
    headers = _register_and_login(client)
    response = _mark(client, headers, radius_m=10)
    assert response.status_code == 422


def test_mark_rejects_radius_above_maximum(client, db_session):
    headers = _register_and_login(client)
    response = _mark(client, headers, radius_m=5000)
    assert response.status_code == 422


def test_mark_accepts_radius_at_boundaries(client, db_session):
    headers = _register_and_login(client)
    low = _mark(client, headers, radius_m=50)
    high = _mark(client, headers, radius_m=1000)
    assert low.status_code == 201
    assert high.status_code == 201


def test_mark_without_reason_succeeds(client, db_session):
    headers = _register_and_login(client)
    response = _mark(client, headers, reason=None)
    assert response.status_code == 201
    assert response.json()["reason"] is None
