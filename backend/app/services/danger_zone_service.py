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
