# Danger Zones — Design Spec

Date: 2026-09-25
Status: Approved (conversational design, brainstorming skill — architectural path)

## Summary

Add a "high-risk zone" marking feature: any driver or police officer can mark
a circular area (center + radius) around their current location as
dangerous, with a severity and optional reason. Zones are visible to all
users on the existing Incidents map and persist until manually cleared. No
admin involvement, no moderation gate, no push notifications — this is a
map-visibility feature layered on the existing road-incidents screen, not a
new subsystem with its own navigation.

## Relationship to REQ-13 (Road Incident Reporting & Map)

`RoadIncident` (REQ-13) is explicitly documented as a point-in-time
snapshot — "never updated or tracked afterward" — tied to the Privacy/Ethics
NFR against continuous driver tracking (see
`backend/app/models/road_incident.py:36-39`). A high-risk zone is a
different concept: a persistent area assessment, not a transient event. This
spec introduces a new, separate `DangerZone` resource rather than extending
`RoadIncident`, to avoid contradicting that existing documented intent and
REQ-13's acceptance criteria. Both resources are surfaced together on the
same Incidents screen/map for a single unified driver experience.

This is new scope — it is not covered by any existing REQ-1..REQ-14 in
`docs/requirements.md`, and is not the "danger-area / accident-blackspot
prediction" item explicitly listed out-of-scope in `docs/tasks.md:25` (that
item refers to automated/predictive blackspot detection from historical
data; this feature is direct user marking, no prediction).

## Decisions (from brainstorming Q&A)

- **Who can mark zones:** both drivers and police, no role gating, no admin
  involvement.
- **Shape:** circle (center lat/lng + radius), not polygon — simpler to draw
  and query, no new spatial DB dependency.
- **Moderation:** none — a zone is visible immediately on creation, same as
  incident reporting today.
- **Lifetime:** persists until manually cleared (no auto-expiry) — a zone
  represents a lasting road condition, not a transient event.
- **Zone data:** severity (LOW/MEDIUM/HIGH) + optional free-text reason,
  reusing the existing incident severity convention.
- **Alerts:** map-only visibility, no push/in-app notification on approach.

## Data Model

New file `backend/app/models/danger_zone.py`, following the exact layering
`backend/app/models/road_incident.py` already uses (model / schema /
repository / service / router).

```python
class DangerZoneSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class DangerZoneStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLEARED = "CLEARED"


class DangerZone(Base):
    __tablename__ = "danger_zones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    creator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    radius_m: Mapped[float] = mapped_column(Float)  # bounded 50-1000, enforced in schema
    severity: Mapped[DangerZoneSeverity] = mapped_column(Enum(DangerZoneSeverity))
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
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

No PostGIS/GeoAlchemy — this backend has no spatial DB dependency today
(`RoadIncident` uses plain float lat/lng with Python-side haversine
filtering); `DangerZone` follows the same convention rather than
introducing one for a circle, which needs none.

Alembic migration: new `danger_zones` table, standard autogenerate against
this model.

## Backend API

New router `backend/app/api/routers/danger_zones.py`, mirroring
`road_incidents.py`'s structure and auth (same `get_current_user` dependency
used across driver/police endpoints — no role restriction, per the "both,
no admin" decision):

- `GET /danger-zones?lat={float}&lng={float}&radius_km={float}` — list
  zones near a point. Same Python-side haversine distance filtering already
  used in `road_incident_service.py`, comparing query point to zone center.
  Returns `status=ACTIVE` zones only.
- `POST /danger-zones` — create a zone. Body: `lat, lng, radius_m, severity,
  reason?`. `creator_id` from the authenticated user. `radius_m` validated
  in the Pydantic schema to the 50–1000 range (422 on violation).
- `POST /danger-zones/{id}/confirm` — increments `confirmation_count`.
  Informational only, does not affect `status`. No ownership check (mirrors
  incident `confirm`).
- `POST /danger-zones/{id}/clear` — sets `status=CLEARED`, `cleared_at=now`,
  `cleared_by=current_user`. Idempotent: a no-op (200, unchanged) if already
  `CLEARED`. No ownership check (mirrors incident `clear`).

Schemas in `backend/app/schemas/danger_zone.py`: `DangerZoneCreate`,
`DangerZoneRead`, following the existing `road_incident` schema shapes.

Repository (`danger_zone_repository.py`) and service
(`danger_zone_service.py`) split the same way as `road_incident`'s: repository
does plain SQLAlchemy CRUD, service does the nearby-distance filtering and
business rules (radius bounds, clear idempotency).

## Mobile

New client files mirroring the existing incident ones exactly:

- `mobile/src/types/danger-zone.ts` — `DangerZoneSeverity`,
  `DangerZoneStatus`, `DangerZone` interface (fields matching the API
  response 1:1, same pattern as `road-incident.ts`).
- `mobile/src/api/danger-zones.ts` — `listNearbyDangerZones(lat, lng,
  radiusKm?)`, `createDangerZone(lat, lng, radiusM, severity, reason?)`,
  `confirmDangerZone(id)`, `clearDangerZone(id)`. Same request/error
  handling conventions as `road-incidents.ts` (uses the shared API client,
  `extractErrorMessage` on failure).

Changes to existing screens (no new tab, no new navigation entry):

- `mobile/src/components/incidents-map.tsx` — new optional prop `zones:
  DangerZone[]`, rendered as `<Circle center={...} radius={zone.radius_m}
  strokeColor strokeWidth fillColor />` per zone, colored by severity
  reusing the existing `SEVERITY_PIN_COLOR` map (shared, not duplicated —
  it's keyed by the same LOW/MEDIUM/HIGH union both types share).
- `mobile/src/app/(app)/(tabs)/incidents.tsx`:
  - Loads zones alongside incidents (`loadZones`, `useCallback`, included in
    the existing `handleRefresh` pull-to-refresh `Promise.all`).
  - New button "Mark Danger Zone at My Location" next to the existing
    "Report at My Location" button — same disabled-until-`location` guard.
  - New inline form (shown when marking): radius chip row (100m / 250m /
    500m / 1km presets, `Pressable` chips matching the existing
    type/severity chip pattern), severity chips (reusing `SEVERITY_COLOR`),
    optional reason `TextField`.
  - New "Nearby Danger Zones" list section below the incidents list,
    zone cards with a "Clear" action button — same card/action-row pattern
    already used for incident cards.
  - Success confirmation for mark/clear reuses the existing `actionMessage`
    state already added in this screen (Batch 3 work), not a new mechanism.

## Error Handling

- `radius_m` outside 50–1000: 422 from the schema validator, surfaced via
  the existing `extractErrorMessage` → inline error text, same as every
  other form on this screen.
- "Mark Danger Zone" button disabled until `location` is resolved — same
  guard as the existing "Report at My Location" button.
- `confirm` on any zone (any status): always increments the tally, no
  status check — matches incident `confirm` semantics.
- `clear` on an already-`CLEARED` zone: idempotent no-op, no error.
- No overlap/duplicate detection between zones — explicitly out of scope.

## Testing

- Backend: pytest service-layer unit tests (radius validation, nearby
  haversine filtering, clear idempotency) and router integration tests for
  the 4 endpoints, structured the same way as the existing
  `test_road_incident*` suite (exact file to mirror found at
  implementation time under `backend/tests/`).
- Mobile: no per-screen test suite exists in this project yet; verification
  stays consistent with the established pattern for this codebase —
  `tsc --noEmit`, `eslint .`, an Ionicons glyph-existence check for any new
  icon name, then manual on-device verification.

## Out of Scope

- Polygon/arbitrary-shape zones.
- Admin creation, moderation, or dashboard visibility (admin-web is
  untouched by this feature).
- Push/in-app proximity notifications when entering a zone.
- Automated/predictive blackspot detection (the item already excluded in
  `docs/tasks.md:25` — unrelated to this direct-marking feature).
