import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.road_incident import ReportIncidentRequest, RoadIncidentRead
from app.services import road_incident_service

router = APIRouter(prefix="/road-incidents", tags=["road-incidents"])


@router.post("", response_model=RoadIncidentRead, status_code=status.HTTP_201_CREATED)
def report_incident(
    payload: ReportIncidentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return road_incident_service.report_incident(
        db,
        reporter_id=current_user.id,
        incident_type=payload.type,
        severity=payload.severity,
        lat=payload.lat,
        lng=payload.lng,
    )


@router.get("", response_model=list[RoadIncidentRead])
def list_nearby_incidents(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return road_incident_service.list_nearby(db, lat=lat, lng=lng, radius_km=radius_km)


@router.post("/{incident_id}/confirm", response_model=RoadIncidentRead)
def confirm_incident(
    incident_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    try:
        return road_incident_service.confirm_incident(db, incident_id=incident_id)
    except road_incident_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.post("/{incident_id}/clear", response_model=RoadIncidentRead)
def clear_incident(
    incident_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    try:
        return road_incident_service.clear_incident(db, incident_id=incident_id)
    except road_incident_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
