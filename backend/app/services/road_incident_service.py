import uuid
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core import file_storage
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


class ForbiddenError(Exception):
    pass


class InvalidStateError(Exception):
    pass


_MEDIA_TYPES = {".jpg": "image/jpeg", ".png": "image/png"}


def _photo_file(photo_path: str) -> Path | None:
    """The stored file, only if it really sits inside the upload directory."""
    base = Path(settings.upload_dir).resolve()
    path = (base / photo_path).resolve()
    if base not in path.parents or not path.is_file():
        return None
    return path


def _drop_photo(db: Session, incident: RoadIncident) -> None:
    """An incident photo only matters while the incident is live (and may show
    people or number plates), so it is deleted when the incident ends. The
    database change commits first; a failed file delete leaves only an
    unreferenced file."""
    if incident.photo_path is None:
        return
    stored = incident.photo_path
    incident.photo_path = None
    db.commit()
    path = _photo_file(stored)
    if path is not None:
        path.unlink(missing_ok=True)


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
        _drop_photo(db, incident)
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
    _drop_photo(db, incident)
    db.refresh(incident)
    return incident


async def add_photo(
    db: Session,
    *,
    incident_id: uuid.UUID,
    reporter_id: uuid.UUID,
    photo: UploadFile,
) -> RoadIncident:
    """One scene photo per incident, added by whoever reported it. The photo is
    re-encoded without its EXIF data (no hidden GPS or device details).
    Raises file_storage.UploadValidationError for a bad image."""
    incident = road_incident_repository.get_by_id(db, incident_id)
    if incident is None:
        raise NotFoundError("No such incident")
    if incident.reporter_id != reporter_id:
        raise ForbiddenError("Only the driver who reported this can add a photo")
    incident = _expire_if_stale(db, incident)
    if incident.status != RoadIncidentStatus.ACTIVE:
        raise InvalidStateError("This incident is no longer active")
    if incident.photo_path is not None:
        raise InvalidStateError("This incident already has a photo")

    incident.photo_path = await file_storage.save_upload(
        photo,
        subdir="incidents",
        allowed_types=file_storage.IMAGE_CONTENT_TYPES,
        require_image=True,
        strip_metadata=True,
    )
    db.commit()
    db.refresh(incident)
    return incident


def get_photo_file(db: Session, *, incident_id: uuid.UUID) -> tuple[Path, str]:
    """The scene photo of an active incident, for any signed-in driver."""
    incident = road_incident_repository.get_by_id(db, incident_id)
    if incident is None:
        raise NotFoundError("No such incident")
    incident = _expire_if_stale(db, incident)
    if incident.status != RoadIncidentStatus.ACTIVE or incident.photo_path is None:
        raise NotFoundError("No photo for this incident")
    path = _photo_file(incident.photo_path)
    if path is None:
        raise NotFoundError("No photo for this incident")
    return path, _MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")
