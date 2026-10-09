import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.file_storage import UploadValidationError
from app.core.rate_limit import limiter
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


@router.post("/{incident_id}/photo", response_model=RoadIncidentRead)
@limiter.limit("30/hour")
async def add_incident_photo(
    request: Request,  # noqa: ARG001 -- required by slowapi's limiter decorator
    incident_id: uuid.UUID,
    photo: UploadFile = File(..., description="One JPEG or PNG photo of the scene"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await road_incident_service.add_photo(
            db, incident_id=incident_id, reporter_id=current_user.id, photo=photo
        )
    except road_incident_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except road_incident_service.ForbiddenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc
    except road_incident_service.InvalidStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    except UploadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.get("/{incident_id}/photo", response_class=FileResponse)
def get_incident_photo(
    incident_id: uuid.UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    try:
        path, media_type = road_incident_service.get_photo_file(
            db, incident_id=incident_id
        )
    except road_incident_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    return FileResponse(
        path, media_type=media_type, headers={"Cache-Control": "private, no-store"}
    )
