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


def _expire_if_stale(db: Session, incident: RoadIncident) -> RoadIncident:
    """REQ-13 AC4: lazy expiry -- no scheduler infra exists in this
    project, so staleness is checked (and persisted) whenever an incident
    is read, not via a background job."""
    if (
        incident.status == RoadIncidentStatus.ACTIVE
        and incident.expires_at <= datetime.utcnow()
    ):
        incident.status = RoadIncidentStatus.EXPIRED
        db.commit()
        db.refresh(incident)
    return incident


def report_incident(
    db: Session,
    *,
    reporter_id: uuid.UUID,
    incident_type: RoadIncidentType,
    severity: RoadIncidentSeverity,
    lat: float,
    lng: float,
) -> RoadIncident:
    expires_at = datetime.utcnow() + timedelta(
        hours=settings.road_incident_expiry_hours
    )
    incident = road_incident_repository.add(
        db,
        reporter_id=reporter_id,
        incident_type=incident_type,
        severity=severity,
        lat=lat,
        lng=lng,
        expires_at=expires_at,
    )
    db.commit()
    db.refresh(incident)
    return incident


def list_nearby(
    db: Session, *, lat: float, lng: float, radius_km: float | None = None
) -> list[RoadIncident]:
    """REQ-13 AC2: active incidents within radius_km of (lat, lng), nearest
    first."""
    radius_km = (
        radius_km if radius_km is not None else settings.road_incident_default_radius_km
    )
    candidates = [
        _expire_if_stale(db, incident)
        for incident in road_incident_repository.list_active(db)
    ]

    within_radius = [
        (incident, haversine_km(lat, lng, incident.lat, incident.lng))
        for incident in candidates
        if incident.status == RoadIncidentStatus.ACTIVE
    ]
    within_radius = [pair for pair in within_radius if pair[1] <= radius_km]
    within_radius.sort(key=lambda pair: pair[1])
    return [incident for incident, _distance in within_radius]


def confirm_incident(db: Session, *, incident_id: uuid.UUID) -> RoadIncident:
    """REQ-13 AC3: informational only -- confirming never changes status."""
    incident = road_incident_repository.get_by_id(db, incident_id)
    if incident is None:
        raise NotFoundError("No such incident")
    incident = _expire_if_stale(db, incident)
    incident.confirmation_count += 1
    db.commit()
    db.refresh(incident)
    return incident


def clear_incident(db: Session, *, incident_id: uuid.UUID) -> RoadIncident:
    """REQ-13 AC3: any driver can clear an incident outright -- no
    invented confirmation-threshold logic."""
    incident = road_incident_repository.get_by_id(db, incident_id)
    if incident is None:
        raise NotFoundError("No such incident")
    incident.status = RoadIncidentStatus.CLEARED
    db.commit()
    db.refresh(incident)
    return incident
