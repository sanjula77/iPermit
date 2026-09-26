# Danger Zones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let both drivers and police mark a circular "danger zone" (center + radius, severity, optional reason) at their current location, visible to everyone on the existing Incidents map, persisting until manually cleared.

**Architecture:** A new `DangerZone` backend resource (model/schema/repository/service/router), fully separate from `RoadIncident` (which stays point-in-time-only per its existing docs), following the exact same layering conventions. Surfaced on the existing Incidents screen/map — no new tab, no new navigation.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL (backend, no new dependency — no PostGIS); Expo, React Native, TypeScript, react-native-maps (mobile, no new dependency).

**Spec:** `docs/superpowers/specs/2026-09-25-danger-zones-design.md`

## Global Constraints

- No PostGIS/GeoAlchemy — plain `lat`/`lng` floats + Python-side haversine distance, matching the existing `RoadIncident` convention.
- Zone shape is a circle only: `radius_m` bounded 50–1000 inclusive, enforced in the Pydantic request schema (422 outside that range).
- No moderation gate — a zone is visible immediately on creation.
- No auto-expiry — a zone persists until `clear`ed.
- No role gating — drivers and police get identical access; no admin involvement.
- No push/in-app proximity notifications.
- Per this project's CLAUDE.md "Working style — commands": every shell command in this plan (pytest, alembic, tsc, eslint, git) is meant to be given to the user to run themselves, with output reviewed before a step is checked off — never execute these directly via a Bash tool in this repo.
- Never add an AI co-author trailer (e.g. `Co-Authored-By: Claude ...`) to any commit message in this repo (CLAUDE.md).
- Any new Ionicons name must be checked against the actual glyph map before use. This plan introduces none — it reuses `alert-circle`, already verified elsewhere in this codebase (`mobile/src/app/(app)/(tabs)/incidents.tsx`'s own `TYPE_ICON.HAZARD` and `police-driver.tsx`'s `VIOLATION_ICON.DRUNK_DRIVING`).

## Review Focus

- **Boundary radius values (50 and 1000 exactly)** — must be accepted, not off-by-one rejected. Test added in Task 5 (`test_mark_accepts_radius_at_boundaries`).
- **Clearing/confirming a zone created by a different user** — spec says no ownership check, so this must succeed, not be silently blocked. Test added in Task 5 (`test_clear_by_different_user_succeeds`).
- **A zone marked with no reason** — the nullable `reason` field must round-trip as `null`, not crash serialization. Test added in Task 5 (`test_mark_without_reason_succeeds`).
- **Listing nearby zones when none exist in range** — must return `[]`, not error. Test added in Task 5 (`test_zone_far_outside_radius_is_excluded`).
- **Pull-to-refresh reloading incidents and zones together** — both must load via the same `Promise.all`, matching the existing pattern, so refresh doesn't race or leave one stale. No automated mobile test suite exists in this project (see spec's Testing section) — verified instead via the explicit device-check instruction in Task 8's final step.

---

## Task 1: Extract shared haversine helper

**Files:**
- Create: `backend/app/core/geo.py`
- Create: `backend/tests/test_geo.py`
- Modify: `backend/app/services/road_incident_service.py:1-33` (remove local `_haversine_km`/`_EARTH_RADIUS_KM`, import the shared one)

**Interfaces:**
- Produces: `haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float` in `app.core.geo` — used by both `road_incident_service` and `danger_zone_service` (Task 4).

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_geo.py`:

```python
from app.core.geo import haversine_km


def test_same_point_distance_is_zero():
    assert haversine_km(6.9271, 79.8612, 6.9271, 79.8612) == 0.0


def test_colombo_to_london_is_thousands_of_km():
    # Colombo, Sri Lanka -> London, UK -- sanity check against a known
    # rough real-world distance (~8600 km great-circle).
    distance = haversine_km(6.9271, 79.8612, 51.5074, -0.1278)
    assert 8000 < distance < 9200
```

- [ ] **Step 2: Give the user the command to verify the test fails**

```bash
cd /data/iPermit/backend
python -m pytest tests/test_geo.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.core.geo'`. Wait for the user to paste the output before continuing.

- [ ] **Step 3: Create `backend/app/core/geo.py`**

```python
import math

_EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two points, in km. Pure function (no
    I/O) -- no PostGIS/new geo dependency needed at this project's scale."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(a))
```

- [ ] **Step 4: Update `backend/app/services/road_incident_service.py` to use the shared helper**

Replace lines 1-33 (imports through the end of the local `_haversine_km` function):

```python
import math
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.road_incident import (
    RoadIncident,
    RoadIncidentSeverity,
    RoadIncidentStatus,
    RoadIncidentType,
)
from app.repositories import road_incident_repository

_EARTH_RADIUS_KM = 6371.0


class NotFoundError(Exception):
    pass


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two points, in km. Pure function (no
    I/O) -- no PostGIS/new geo dependency needed at this project's scale."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(a))
```

with:

```python
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.geo import haversine_km
from app.models.road_incident import (
    RoadIncident,
    RoadIncidentSeverity,
    RoadIncidentStatus,
    RoadIncidentType,
)
from app.repositories import road_incident_repository


class NotFoundError(Exception):
    pass
```

Then in `list_nearby` (the line reading `(incident, _haversine_km(lat, lng, incident.lat, incident.lng))`), change `_haversine_km` to `haversine_km`.

- [ ] **Step 5: Give the user the commands to verify both the new test and the existing suite pass**

```bash
cd /data/iPermit/backend
python -m pytest tests/test_geo.py tests/test_road_incidents.py -v
```

Expected: all tests PASS (the road-incident suite must still pass unchanged — this step is a pure refactor). Wait for pasted output before continuing.

- [ ] **Step 6: Commit**

Give the user:

```bash
cd /data/iPermit
git add backend/app/core/geo.py backend/tests/test_geo.py backend/app/services/road_incident_service.py
git commit -m "Extract shared haversine helper from road_incident_service"
git push
```

---

## Task 2: DangerZone model and migration

**Files:**
- Create: `backend/app/models/danger_zone.py`
- Create: `backend/alembic/versions/<autogenerated>.py` (filename determined by Alembic in Step 2)

**Interfaces:**
- Consumes: `app.core.database.Base` (existing declarative base).
- Produces: `DangerZone`, `DangerZoneSeverity` (`LOW`/`MEDIUM`/`HIGH`), `DangerZoneStatus` (`ACTIVE`/`CLEARED`) in `app.models.danger_zone` — used by Task 3 (schemas), Task 4 (repository/service), Task 5 (router/tests).

- [ ] **Step 1: Create `backend/app/models/danger_zone.py`**

```python
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User  # noqa: F401 -- referenced by relationship


class DangerZoneSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class DangerZoneStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLEARED = "CLEARED"


class DangerZone(Base):
    """Persistent, community-marked circular area. Unlike RoadIncident
    (point-in-time only, see road_incident.py), a zone represents a
    lasting road-condition assessment and stays ACTIVE until someone
    clears it -- no auto-expiry."""

    __tablename__ = "danger_zones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    creator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    radius_m: Mapped[float] = mapped_column(Float)
    severity: Mapped[DangerZoneSeverity] = mapped_column(Enum(DangerZoneSeverity))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DangerZoneStatus] = mapped_column(
        Enum(DangerZoneStatus), default=DangerZoneStatus.ACTIVE
    )
    confirmation_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    cleared_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cleared_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    creator: Mapped["User"] = relationship(foreign_keys=[creator_id])
```

- [ ] **Step 2: Give the user the command to autogenerate the migration**

```bash
cd /data/iPermit/backend
alembic revision --autogenerate -m "add danger zones table"
```

Wait for the user to paste the output, which includes the generated file path under `backend/alembic/versions/`.

- [ ] **Step 3: Review the generated migration**

Read the file the previous step created. Confirm `upgrade()` creates a `danger_zones` table with columns matching the model exactly: `id` (Uuid, PK), `creator_id` (Uuid, FK -> `users.id`, `ondelete='RESTRICT'`), `lat`/`lng`/`radius_m` (Float, not null), `severity` (Enum `danger_zone_severity`... actually Alembic will name it after the lowercased Python class, e.g. `dangerzoneseverity`), `reason` (Text, nullable), `status` (Enum `dangerzonestatus`, not null), `confirmation_count` (Integer, not null), `created_at` (DateTime, not null), `cleared_at` (DateTime, nullable), `cleared_by` (Uuid, nullable, FK -> `users.id`, `ondelete='SET NULL'`). Confirm `downgrade()` drops the table. If any column/constraint is missing or wrong (Alembic autogenerate sometimes misses `ondelete` on FKs), edit the file directly to match the model before proceeding — do not skip this check.

- [ ] **Step 4: Give the user the command to apply the migration**

```bash
cd /data/iPermit/backend
alembic upgrade head
```

Expected: output ends with the new revision id and no errors. Wait for pasted output before continuing.

- [ ] **Step 5: Commit**

Give the user (substituting the actual generated migration filename from Step 2):

```bash
cd /data/iPermit
git add backend/app/models/danger_zone.py backend/alembic/versions/<generated_filename>.py
git commit -m "Add DangerZone model and migration"
git push
```

---

## Task 3: DangerZone schemas

**Files:**
- Create: `backend/app/schemas/danger_zone.py`

**Interfaces:**
- Consumes: `DangerZoneSeverity`, `DangerZoneStatus` from `app.models.danger_zone` (Task 2).
- Produces: `DangerZoneRead`, `MarkDangerZoneRequest` — used by Task 5's router.

- [ ] **Step 1: Create `backend/app/schemas/danger_zone.py`**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.danger_zone import DangerZoneSeverity, DangerZoneStatus


class DangerZoneRead(BaseModel):
    id: uuid.UUID
    lat: float
    lng: float
    radius_m: float
    severity: DangerZoneSeverity
    reason: str | None
    status: DangerZoneStatus
    confirmation_count: int
    created_at: datetime
    cleared_at: datetime | None

    model_config = {"from_attributes": True}


class MarkDangerZoneRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_m: float = Field(ge=50, le=1000)
    severity: DangerZoneSeverity
    reason: str | None = Field(default=None, max_length=500)
```

- [ ] **Step 2: Commit**

```bash
cd /data/iPermit
git add backend/app/schemas/danger_zone.py
git commit -m "Add DangerZone Pydantic schemas"
git push
```

---

## Task 4: DangerZone repository and service

**Files:**
- Create: `backend/app/repositories/danger_zone_repository.py`
- Create: `backend/app/services/danger_zone_service.py`
- Modify: `backend/app/core/config.py` (add `danger_zone_default_radius_km` setting)

**Interfaces:**
- Consumes: `haversine_km` from `app.core.geo` (Task 1); `DangerZone` model (Task 2).
- Produces: `danger_zone_service.mark_zone(db, *, creator_id, lat, lng, radius_m, severity, reason) -> DangerZone`, `danger_zone_service.list_nearby(db, *, lat, lng, radius_km=None) -> list[DangerZone]`, `danger_zone_service.confirm_zone(db, *, zone_id) -> DangerZone`, `danger_zone_service.clear_zone(db, *, zone_id, cleared_by) -> DangerZone`, `danger_zone_service.NotFoundError` — used by Task 5's router.

- [ ] **Step 1: Add the default-radius setting to `backend/app/core/config.py`**

Insert this immediately before the final `settings = Settings()` line (right after the existing `road_incident_default_radius_km` setting):

```python
    # Default search radius for "nearby" active danger zones -- same
    # convention as road_incident_default_radius_km above, no
    # traffic-authority-sourced value to derive this from.
    danger_zone_default_radius_km: float = 5.0
```

- [ ] **Step 2: Create `backend/app/repositories/danger_zone_repository.py`**

```python
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.danger_zone import DangerZone, DangerZoneSeverity, DangerZoneStatus


def add(
    db: Session,
    *,
    creator_id: uuid.UUID,
    lat: float,
    lng: float,
    radius_m: float,
    severity: DangerZoneSeverity,
    reason: str | None,
) -> DangerZone:
    """Adds a DangerZone to the session without committing -- see
    danger_zone_service.mark_zone for the transaction boundary."""
    zone = DangerZone(
        creator_id=creator_id,
        lat=lat,
        lng=lng,
        radius_m=radius_m,
        severity=severity,
        reason=reason,
    )
    db.add(zone)
    return zone


def get_by_id(db: Session, zone_id: uuid.UUID) -> DangerZone | None:
    return db.get(DangerZone, zone_id)


def list_active(db: Session) -> list[DangerZone]:
    stmt = select(DangerZone).where(DangerZone.status == DangerZoneStatus.ACTIVE)
    return list(db.scalars(stmt))
```

- [ ] **Step 3: Create `backend/app/services/danger_zone_service.py`**

```python
import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.geo import haversine_km
from app.models.danger_zone import DangerZone, DangerZoneSeverity, DangerZoneStatus
from app.repositories import danger_zone_repository


class NotFoundError(Exception):
    pass


def mark_zone(
    db: Session,
    *,
    creator_id: uuid.UUID,
    lat: float,
    lng: float,
    radius_m: float,
    severity: DangerZoneSeverity,
    reason: str | None,
) -> DangerZone:
    zone = danger_zone_repository.add(
        db,
        creator_id=creator_id,
        lat=lat,
        lng=lng,
        radius_m=radius_m,
        severity=severity,
        reason=reason,
    )
    db.commit()
    db.refresh(zone)
    return zone


def list_nearby(
    db: Session, *, lat: float, lng: float, radius_km: float | None = None
) -> list[DangerZone]:
    """Active zones within radius_km of (lat, lng), nearest first. A zone
    counts as nearby if the query point is within radius_km of the zone's
    center -- the zone's own radius_m is a display/visual radius, not part
    of this search-distance calculation."""
    radius_km = (
        radius_km if radius_km is not None else settings.danger_zone_default_radius_km
    )
    candidates = danger_zone_repository.list_active(db)

    within_radius = [
        (zone, haversine_km(lat, lng, zone.lat, zone.lng)) for zone in candidates
    ]
    within_radius = [pair for pair in within_radius if pair[1] <= radius_km]
    within_radius.sort(key=lambda pair: pair[1])
    return [zone for zone, _distance in within_radius]


def confirm_zone(db: Session, *, zone_id: uuid.UUID) -> DangerZone:
    """Informational only -- confirming never changes status, mirrors
    road_incident_service.confirm_incident."""
    zone = danger_zone_repository.get_by_id(db, zone_id)
    if zone is None:
        raise NotFoundError("No such danger zone")
    zone.confirmation_count += 1
    db.commit()
    db.refresh(zone)
    return zone


def clear_zone(db: Session, *, zone_id: uuid.UUID, cleared_by: uuid.UUID) -> DangerZone:
    """Any driver or police officer can clear a zone outright -- no
    invented confirmation-threshold logic, mirrors
    road_incident_service.clear_incident. Idempotent: clearing an
    already-CLEARED zone is a no-op."""
    zone = danger_zone_repository.get_by_id(db, zone_id)
    if zone is None:
        raise NotFoundError("No such danger zone")
    if zone.status != DangerZoneStatus.CLEARED:
        zone.status = DangerZoneStatus.CLEARED
        zone.cleared_at = datetime.utcnow()
        zone.cleared_by = cleared_by
        db.commit()
        db.refresh(zone)
    return zone
```

- [ ] **Step 4: Commit**

```bash
cd /data/iPermit
git add backend/app/repositories/danger_zone_repository.py backend/app/services/danger_zone_service.py backend/app/core/config.py
git commit -m "Add DangerZone repository and service layer"
git push
```

---

## Task 5: DangerZone router, registration, and integration tests

**Files:**
- Create: `backend/app/api/routers/danger_zones.py`
- Create: `backend/tests/test_danger_zones.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `danger_zone_service.*` (Task 4), `DangerZoneRead`/`MarkDangerZoneRequest` (Task 3), `get_current_user`/`get_db` from `app.api.deps` (existing).
- Produces: `POST /danger-zones`, `GET /danger-zones`, `POST /danger-zones/{id}/confirm`, `POST /danger-zones/{id}/clear` — used by Task 6's mobile API client.

- [ ] **Step 1: Write the failing integration tests**

Create `backend/tests/test_danger_zones.py`:

```python
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
```

- [ ] **Step 2: Give the user the command to verify the tests fail**

```bash
cd /data/iPermit/backend
python -m pytest tests/test_danger_zones.py -v
```

Expected: FAIL — every test errors with a 404 (route doesn't exist yet) since neither the router nor its registration exist. Wait for pasted output before continuing.

- [ ] **Step 3: Create `backend/app/api/routers/danger_zones.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.danger_zone import DangerZoneRead, MarkDangerZoneRequest
from app.services import danger_zone_service

router = APIRouter(prefix="/danger-zones", tags=["danger-zones"])


@router.post("", response_model=DangerZoneRead, status_code=status.HTTP_201_CREATED)
def mark_danger_zone(
    payload: MarkDangerZoneRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return danger_zone_service.mark_zone(
        db,
        creator_id=current_user.id,
        lat=payload.lat,
        lng=payload.lng,
        radius_m=payload.radius_m,
        severity=payload.severity,
        reason=payload.reason,
    )


@router.get("", response_model=list[DangerZoneRead])
def list_nearby_danger_zones(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return danger_zone_service.list_nearby(db, lat=lat, lng=lng, radius_km=radius_km)


@router.post("/{zone_id}/confirm", response_model=DangerZoneRead)
def confirm_danger_zone(
    zone_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    try:
        return danger_zone_service.confirm_zone(db, zone_id=zone_id)
    except danger_zone_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.post("/{zone_id}/clear", response_model=DangerZoneRead)
def clear_danger_zone(
    zone_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return danger_zone_service.clear_zone(
            db, zone_id=zone_id, cleared_by=current_user.id
        )
    except danger_zone_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
```

- [ ] **Step 4: Register the router in `backend/app/main.py`**

Replace:

```python
from app.api.routers import (
    admin,
    appeals,
    applications,
    auth,
    badges,
    face,
    fines,
    licenses,
    notifications,
    police,
    road_incidents,
)
```

with:

```python
from app.api.routers import (
    admin,
    appeals,
    applications,
    auth,
    badges,
    danger_zones,
    face,
    fines,
    licenses,
    notifications,
    police,
    road_incidents,
)
```

And replace:

```python
app.include_router(road_incidents.router)
```

with:

```python
app.include_router(road_incidents.router)
app.include_router(danger_zones.router)
```

- [ ] **Step 5: Give the user the command to verify the tests pass**

```bash
cd /data/iPermit/backend
python -m pytest tests/test_danger_zones.py tests/test_road_incidents.py -v
```

Expected: all tests PASS. Wait for pasted output before continuing.

- [ ] **Step 6: Commit**

```bash
cd /data/iPermit
git add backend/app/api/routers/danger_zones.py backend/app/main.py backend/tests/test_danger_zones.py
git commit -m "Add DangerZone API endpoints and integration tests"
git push
```

---

## Task 6: Mobile types and API client

**Files:**
- Create: `mobile/src/types/danger-zone.ts`
- Create: `mobile/src/api/danger-zones.ts`

**Interfaces:**
- Consumes: `apiClient` from `@/api/client` (existing).
- Produces: `DangerZone`, `DangerZoneSeverity`, `DangerZoneStatus` types; `listNearbyDangerZones(lat, lng, radiusKm?)`, `markDangerZone(lat, lng, radiusM, severity, reason?)`, `confirmDangerZone(id)`, `clearDangerZone(id)` — used by Task 7 (map) and Task 8 (screen).

- [ ] **Step 1: Create `mobile/src/types/danger-zone.ts`**

```typescript
export type DangerZoneSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type DangerZoneStatus = 'ACTIVE' | 'CLEARED';

export interface DangerZone {
  id: string;
  lat: number;
  lng: number;
  radius_m: number;
  severity: DangerZoneSeverity;
  reason: string | null;
  status: DangerZoneStatus;
  confirmation_count: number;
  created_at: string;
  cleared_at: string | null;
}
```

- [ ] **Step 2: Create `mobile/src/api/danger-zones.ts`**

```typescript
import { apiClient } from '@/api/client';
import type { DangerZone, DangerZoneSeverity } from '@/types/danger-zone';

export async function listNearbyDangerZones(
  lat: number,
  lng: number,
  radiusKm?: number,
): Promise<DangerZone[]> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radiusKm) params.set('radius_km', String(radiusKm));
  return apiClient.get<DangerZone[]>(`/danger-zones?${params.toString()}`);
}

export async function markDangerZone(
  lat: number,
  lng: number,
  radiusM: number,
  severity: DangerZoneSeverity,
  reason?: string,
): Promise<DangerZone> {
  return apiClient.post<DangerZone>('/danger-zones', {
    lat,
    lng,
    radius_m: radiusM,
    severity,
    reason: reason || undefined,
  });
}

export async function confirmDangerZone(id: string): Promise<DangerZone> {
  return apiClient.post<DangerZone>(`/danger-zones/${id}/confirm`);
}

export async function clearDangerZone(id: string): Promise<DangerZone> {
  return apiClient.post<DangerZone>(`/danger-zones/${id}/clear`);
}
```

- [ ] **Step 3: Give the user the command to type-check**

```bash
cd /data/iPermit/mobile
npx tsc --noEmit
```

Expected: no errors. Wait for pasted output before continuing.

- [ ] **Step 4: Commit**

```bash
cd /data/iPermit
git add mobile/src/types/danger-zone.ts mobile/src/api/danger-zones.ts
git commit -m "Add mobile types and API client for danger zones"
git push
```

---

## Task 7: Render zones on the map

**Files:**
- Modify: `mobile/src/components/incidents-map.tsx` (full rewrite)
- Modify: `mobile/src/components/incidents-map.web.tsx` (full rewrite)

**Interfaces:**
- Consumes: `DangerZone` type (Task 6).
- Produces: `IncidentsMap` now accepts an optional `zones?: DangerZone[]` prop — used by Task 8.

- [ ] **Step 1: Replace the full content of `mobile/src/components/incidents-map.tsx`**

```tsx
import MapView, { Circle, Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

import type { DangerZone } from '@/types/danger-zone';
import type { RoadIncident } from '@/types/road-incident';

const SEVERITY_PIN_COLOR: Record<RoadIncident['severity'], string> = {
  HIGH: '#d92d20',
  MEDIUM: '#208AEF',
  LOW: '#60646C',
};

export function IncidentsMap({
  center,
  incidents,
  zones = [],
}: {
  center: { lat: number; lng: number };
  incidents: RoadIncident[];
  zones?: DangerZone[];
}) {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
      testID="incidents-map"
    >
      {zones.map((zone) => (
        <Circle
          key={zone.id}
          center={{ latitude: zone.lat, longitude: zone.lng }}
          radius={zone.radius_m}
          strokeColor={SEVERITY_PIN_COLOR[zone.severity]}
          fillColor={`${SEVERITY_PIN_COLOR[zone.severity]}33`}
          strokeWidth={2}
        />
      ))}
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          coordinate={{ latitude: incident.lat, longitude: incident.lng }}
          title={incident.type.replace('_', ' ')}
          description={`${incident.severity} severity`}
          pinColor={SEVERITY_PIN_COLOR[incident.severity]}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },
});
```

- [ ] **Step 2: Replace the full content of `mobile/src/components/incidents-map.web.tsx`**

```tsx
import type { DangerZone } from '@/types/danger-zone';
import type { RoadIncident } from '@/types/road-incident';

/**
 * react-native-maps has no functional web renderer -- the incidents screen
 * already shows a "map view is only available on the native app" note next
 * to the incident list, so this variant is deliberately a no-op rather
 * than shipping a broken/blank map on web.
 */
export function IncidentsMap(_props: {
  center: { lat: number; lng: number };
  incidents: RoadIncident[];
  zones?: DangerZone[];
}) {
  return null;
}
```

- [ ] **Step 3: Give the user the commands to verify**

```bash
cd /data/iPermit/mobile
npx tsc --noEmit
npx eslint .
```

Expected: no errors from either command. Wait for pasted output before continuing.

- [ ] **Step 4: Commit**

```bash
cd /data/iPermit
git add mobile/src/components/incidents-map.tsx mobile/src/components/incidents-map.web.tsx
git commit -m "Render danger zones as circles on the incidents map"
git push
```

---

## Task 8: Mark/list/clear zones on the Incidents screen

**Files:**
- Modify: `mobile/src/app/(app)/(tabs)/incidents.tsx` (full rewrite)

**Interfaces:**
- Consumes: `listNearbyDangerZones`, `markDangerZone`, `clearDangerZone` (Task 6); `IncidentsMap`'s `zones` prop (Task 7); existing `TextField` component (`@/components/text-field`).

- [ ] **Step 1: Replace the full content of `mobile/src/app/(app)/(tabs)/incidents.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { clearDangerZone, listNearbyDangerZones, markDangerZone } from '@/api/danger-zones';
import {
  clearIncident,
  confirmIncident,
  listNearbyIncidents,
  reportIncident,
} from '@/api/road-incidents';
import { IncidentsMap } from '@/components/incidents-map';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DangerZone } from '@/types/danger-zone';
import type {
  RoadIncident,
  RoadIncidentSeverity,
  RoadIncidentType,
} from '@/types/road-incident';

const INCIDENT_TYPES: RoadIncidentType[] = [
  'ACCIDENT',
  'TRAFFIC',
  'ROAD_BLOCK',
  'FLOOD',
  'CONSTRUCTION',
  'BREAKDOWN',
  'HAZARD',
  'OTHER',
];
const SEVERITIES: RoadIncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH'];
const RADIUS_OPTIONS: { label: string; value: number }[] = [
  { label: '100m', value: 100 },
  { label: '250m', value: 250 },
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
];

// Colombo, Sri Lanka -- fallback only, used when location permission is
// denied or unavailable, so the screen still functions for a demo/preview.
const FALLBACK_LOCATION = { lat: 6.9271, lng: 79.8612 };

const SEVERITY_COLOR: Record<RoadIncidentSeverity, 'danger' | 'warning' | 'textSecondary'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'textSecondary',
};

const TYPE_ICON: Record<RoadIncidentType, keyof typeof Ionicons.glyphMap> = {
  ACCIDENT: 'car-sport',
  TRAFFIC: 'trail-sign',
  ROAD_BLOCK: 'hand-left',
  FLOOD: 'water',
  CONSTRUCTION: 'construct',
  BREAKDOWN: 'build',
  HAZARD: 'alert-circle',
  OTHER: 'ellipsis-horizontal-circle-outline',
};

export default function IncidentsScreen() {
  const theme = useTheme();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<RoadIncident[] | null>(null);
  const [zones, setZones] = useState<DangerZone[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<RoadIncidentType>('HAZARD');
  const [reportSeverity, setReportSeverity] = useState<RoadIncidentSeverity>('MEDIUM');
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [zoneRadius, setZoneRadius] = useState(250);
  const [zoneSeverity, setZoneSeverity] = useState<RoadIncidentSeverity>('MEDIUM');
  const [zoneReason, setZoneReason] = useState('');
  const [isMarkingZone, setIsMarkingZone] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setLocationNote('Location permission denied -- showing incidents near Colombo instead.');
            setLocation(FALLBACK_LOCATION);
          }
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      } catch {
        if (!cancelled) {
          setLocationNote('Could not determine your location -- showing incidents near Colombo instead.');
          setLocation(FALLBACK_LOCATION);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadIncidents = useCallback(async (lat: number, lng: number) => {
    try {
      const [incidentsData, zonesData] = await Promise.all([
        listNearbyIncidents(lat, lng),
        listNearbyDangerZones(lat, lng),
      ]);
      setIncidents(incidentsData);
      setZones(zonesData);
      setLoadError(null);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    // Fetch-on-location-change, not a state sync.
    if (location) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadIncidents(location.lat, location.lng);
    }
  }, [location, loadIncidents]);

  async function handleRefresh() {
    if (!location) return;
    setRefreshing(true);
    await loadIncidents(location.lat, location.lng);
    setRefreshing(false);
  }

  async function handleReport() {
    if (!location) return;
    setReportError(null);
    setActionMessage(null);
    setIsReporting(true);
    try {
      await reportIncident(reportType, reportSeverity, location.lat, location.lng);
      await loadIncidents(location.lat, location.lng);
      setActionMessage('Incident reported.');
    } catch (err) {
      setReportError(extractErrorMessage(err));
    } finally {
      setIsReporting(false);
    }
  }

  async function handleConfirm(id: string) {
    if (!location) return;
    setActionMessage(null);
    await confirmIncident(id);
    await loadIncidents(location.lat, location.lng);
    setActionMessage('Incident confirmed -- thanks for the update.');
  }

  async function handleClear(id: string) {
    if (!location) return;
    setActionMessage(null);
    await clearIncident(id);
    await loadIncidents(location.lat, location.lng);
    setActionMessage('Incident cleared.');
  }

  async function handleMarkZone() {
    if (!location) return;
    setZoneError(null);
    setActionMessage(null);
    setIsMarkingZone(true);
    try {
      await markDangerZone(
        location.lat,
        location.lng,
        zoneRadius,
        zoneSeverity,
        zoneReason.trim() || undefined,
      );
      await loadIncidents(location.lat, location.lng);
      setZoneReason('');
      setActionMessage('Danger zone marked.');
    } catch (err) {
      setZoneError(extractErrorMessage(err));
    } finally {
      setIsMarkingZone(false);
    }
  }

  async function handleClearZone(id: string) {
    if (!location) return;
    setActionMessage(null);
    await clearDangerZone(id);
    await loadIncidents(location.lat, location.lng);
    setActionMessage('Danger zone cleared.');
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <ThemedView style={styles.form}>
        {actionMessage ? (
          <View style={styles.successRow} testID="incident-action-message">
            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
            <ThemedText type="small" themeColor="success">
              {actionMessage}
            </ThemedText>
          </View>
        ) : null}

        {locationNote ? (
          <ThemedText type="small" themeColor="textSecondary" testID="location-note">
            {locationNote}
          </ThemedText>
        ) : null}

        {Platform.OS === 'web' ? (
          <ThemedText type="small" themeColor="textSecondary" testID="map-unavailable-note">
            Map view is only available on the native app -- showing the list below.
          </ThemedText>
        ) : location ? (
          <IncidentsMap center={location} incidents={incidents ?? []} zones={zones ?? []} />
        ) : null}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Report an Incident</ThemedText>
          <View style={styles.chipRow}>
            {INCIDENT_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setReportType(type)}
                style={[
                  styles.chip,
                  { backgroundColor: reportType === type ? theme.primary : theme.background },
                ]}
                testID={`type-${type}`}
              >
                <Ionicons
                  name={TYPE_ICON[type]}
                  size={14}
                  color={reportType === type ? theme.onPrimary : theme.text}
                />
                <ThemedText type="small" themeColor={reportType === type ? 'onPrimary' : 'text'}>
                  {type.replace('_', ' ')}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.chipRow}>
            {SEVERITIES.map((severity) => (
              <Pressable
                key={severity}
                onPress={() => setReportSeverity(severity)}
                style={[
                  styles.chip,
                  { backgroundColor: reportSeverity === severity ? theme.primary : theme.background },
                ]}
                testID={`severity-${severity}`}
              >
                <ThemedText
                  type="small"
                  themeColor={reportSeverity === severity ? 'onPrimary' : 'text'}
                >
                  {severity}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {reportError ? (
            <ThemedText type="small" themeColor="danger" selectable>
              {reportError}
            </ThemedText>
          ) : null}
          <Pressable
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleReport}
            disabled={!location || isReporting}
            testID="report-button"
          >
            <ThemedText type="smallBold" themeColor="onPrimary">
              {isReporting ? 'Reporting…' : 'Report at My Location'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Mark a Danger Zone</ThemedText>
          <View style={styles.chipRow}>
            {RADIUS_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setZoneRadius(option.value)}
                style={[
                  styles.chip,
                  { backgroundColor: zoneRadius === option.value ? theme.primary : theme.background },
                ]}
                testID={`zone-radius-${option.value}`}
              >
                <ThemedText
                  type="small"
                  themeColor={zoneRadius === option.value ? 'onPrimary' : 'text'}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.chipRow}>
            {SEVERITIES.map((severity) => (
              <Pressable
                key={severity}
                onPress={() => setZoneSeverity(severity)}
                style={[
                  styles.chip,
                  { backgroundColor: zoneSeverity === severity ? theme.primary : theme.background },
                ]}
                testID={`zone-severity-${severity}`}
              >
                <ThemedText
                  type="small"
                  themeColor={zoneSeverity === severity ? 'onPrimary' : 'text'}
                >
                  {severity}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <TextField
            label="Reason (optional)"
            value={zoneReason}
            onChangeText={setZoneReason}
            testID="zone-reason-input"
          />
          {zoneError ? (
            <ThemedText type="small" themeColor="danger" selectable>
              {zoneError}
            </ThemedText>
          ) : null}
          <Pressable
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleMarkZone}
            disabled={!location || isMarkingZone}
            testID="mark-zone-button"
          >
            <ThemedText type="smallBold" themeColor="onPrimary">
              {isMarkingZone ? 'Marking…' : 'Mark Danger Zone at My Location'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedText type="subtitle">Nearby Active Incidents</ThemedText>
        {loadError ? (
          <ThemedText type="small" themeColor="danger" selectable testID="incidents-error">
            {loadError}
          </ThemedText>
        ) : incidents === null ? (
          <ActivityIndicator testID="incidents-loading" />
        ) : incidents.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" testID="incidents-empty">
            No active incidents nearby.
          </ThemedText>
        ) : (
          incidents.map((incident) => (
            <ThemedView
              key={incident.id}
              type="backgroundElement"
              style={styles.card}
              testID={`incident-${incident.id}`}
            >
              <View style={styles.typeRow}>
                <Ionicons name={TYPE_ICON[incident.type]} size={16} color={theme.text} />
                <ThemedText type="smallBold">{incident.type.replace('_', ' ')}</ThemedText>
              </View>
              <ThemedText type="small" themeColor={SEVERITY_COLOR[incident.severity]}>
                {incident.severity} severity
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Confirmed by {incident.confirmation_count}{' '}
                {incident.confirmation_count === 1 ? 'driver' : 'drivers'}
              </ThemedText>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.button, styles.flexButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleConfirm(incident.id)}
                  testID={`confirm-${incident.id}`}
                >
                  <ThemedText type="smallBold" themeColor="onPrimary">
                    Confirm
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.flexButton, { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => handleClear(incident.id)}
                  testID={`clear-${incident.id}`}
                >
                  <ThemedText type="smallBold">Clear</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ))
        )}

        <ThemedText type="subtitle">Nearby Danger Zones</ThemedText>
        {zones === null ? (
          <ActivityIndicator testID="zones-loading" />
        ) : zones.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" testID="zones-empty">
            No danger zones marked nearby.
          </ThemedText>
        ) : (
          zones.map((zone) => (
            <ThemedView
              key={zone.id}
              type="backgroundElement"
              style={styles.card}
              testID={`zone-${zone.id}`}
            >
              <View style={styles.typeRow}>
                <Ionicons name="alert-circle" size={16} color={theme[SEVERITY_COLOR[zone.severity]]} />
                <ThemedText type="smallBold" themeColor={SEVERITY_COLOR[zone.severity]}>
                  {zone.severity} risk · {zone.radius_m}m radius
                </ThemedText>
              </View>
              {zone.reason ? (
                <ThemedText type="small" selectable>
                  {zone.reason}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                Confirmed by {zone.confirmation_count}{' '}
                {zone.confirmation_count === 1 ? 'driver' : 'drivers'}
              </ThemedText>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.button, styles.flexButton, { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => handleClearZone(zone.id)}
                  testID={`clear-zone-${zone.id}`}
                >
                  <ThemedText type="smallBold">Clear</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  form: {
    width: '100%',
    maxWidth: 800,
    gap: Spacing.three,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  flexButton: { flex: 1 },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Give the user the commands to verify**

```bash
cd /data/iPermit/mobile
npx tsc --noEmit
npx eslint .
```

Expected: no errors from either command (this task introduces no new Ionicons name — `alert-circle` is already used elsewhere in this exact file). Wait for pasted output before continuing.

- [ ] **Step 3: Device check**

Ask the user to check on-device:
- The "Mark a Danger Zone" card appears below "Report an Incident", with radius chips (100m/250m/500m/1km), severity chips, and an optional reason field.
- Marking a zone shows the green "Danger zone marked." confirmation and the zone appears both in the "Nearby Danger Zones" list and as a colored circle on the map (native only).
- Pulling to refresh reloads both the incidents list and the danger zones list together (confirms Review Focus item on concurrent loading — no stale zones after a refresh).
- Clearing a zone removes it from the list and shows "Danger zone cleared."

- [ ] **Step 4: Commit**

```bash
cd /data/iPermit
git add "mobile/src/app/(app)/(tabs)/incidents.tsx"
git commit -m "Add mark/list/clear UI for danger zones on the Incidents screen"
git push
```
