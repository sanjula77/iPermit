import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.core.rate_limit import limiter
from app.models.user import User, UserRole
from app.schemas.application import ApplicationRead
from app.services import application_service

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def submit_application(
    request: Request,  # noqa: ARG001 -- required by slowapi's limiter decorator
    face_photos: list[UploadFile] = File(..., description="Exactly 4 face photos"),
    nic_document: UploadFile = File(...),
    medical_cert: UploadFile = File(...),
    birth_cert: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    try:
        return await application_service.submit_application(
            db,
            driver_id=current_user.id,
            face_photos=face_photos,
            nic_document=nic_document,
            medical_cert=medical_cert,
            birth_cert=birth_cert,
        )
    except application_service.ApplicationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.get("", response_model=list[ApplicationRead])
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    return application_service.list_applications_for_driver(
        db, driver_id=current_user.id
    )


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    try:
        return application_service.get_application_for_driver(
            db, application_id=application_id, driver_id=current_user.id
        )
    except application_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except application_service.ForbiddenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc
