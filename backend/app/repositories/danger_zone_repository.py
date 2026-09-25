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
