from datetime import datetime, timedelta, timezone

from pydantic import BaseModel

from app.schemas.common import UtcDateTime


class _Model(BaseModel):
    at: UtcDateTime
    maybe: UtcDateTime | None = None


def test_naive_datetime_is_serialized_as_utc():
    """Timestamps are stored naive in UTC (datetime.utcnow). Without an offset,
    clients parse them as *local* time (e.g. 5h30m off in Sri Lanka), so they
    must go out explicitly marked as UTC."""
    body = _Model(at=datetime(2026, 9, 26, 4, 30, 0)).model_dump(mode="json")
    assert body["at"] == "2026-09-26T04:30:00+00:00"


def test_aware_datetime_is_converted_to_utc():
    colombo = timezone(timedelta(hours=5, minutes=30))
    body = _Model(at=datetime(2026, 9, 26, 10, 0, 0, tzinfo=colombo)).model_dump(
        mode="json"
    )
    assert body["at"] == "2026-09-26T04:30:00+00:00"


def test_optional_none_stays_none():
    body = _Model(at=datetime(2026, 9, 26, 4, 30)).model_dump(mode="json")
    assert body["maybe"] is None


def test_api_timestamps_carry_utc_offset(client):
    client.post(
        "/auth/register",
        json={
            "email": "tz@example.com",
            "nic": "991234560V",
            "password": "supersecret",
        },
    )
    token = client.post(
        "/auth/login", json={"identifier": "tz@example.com", "password": "supersecret"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    incident = client.post(
        "/road-incidents",
        headers=headers,
        json={"type": "HAZARD", "severity": "LOW", "lat": 6.9, "lng": 79.8},
    ).json()

    assert incident["created_at"].endswith("+00:00")
    assert incident["expires_at"].endswith("+00:00")
