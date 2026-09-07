import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.road_incident import (
    RoadIncident,
    RoadIncidentSeverity,
    RoadIncidentStatus,
    RoadIncidentType,
)


def add(
    db: Session,
    *,
    reporter_id: uuid.UUID,
    incident_type: RoadIncidentType,
    severity: RoadIncidentSeverity,
    lat: float,
    lng: float,
    expires_at: datetime,
) -> RoadIncident:
    """Adds a RoadIncident to the session without committing -- see
    road_incident_service.report_incident for the transaction boundary."""
    incident = RoadIncident(
        reporter_id=reporter_id,
        type=incident_type,
        severity=severity,
        lat=lat,
        lng=lng,
        expires_at=expires_at,
    )
    db.add(incident)
    return incident


def get_by_id(db: Session, incident_id: uuid.UUID) -> RoadIncident | None:
    return db.get(RoadIncident, incident_id)


def list_active(db: Session) -> list[RoadIncident]:
    stmt = select(RoadIncident).where(RoadIncident.status == RoadIncidentStatus.ACTIVE)
    return list(db.scalars(stmt))
