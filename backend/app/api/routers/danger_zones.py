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
