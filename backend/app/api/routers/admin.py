import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.application import ApplicationStatus
from app.models.user import User, UserRole
from app.schemas.application import ApplicationRead, RejectApplicationRequest
from app.services import application_service

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_only(current_user: User = Depends(require_role(UserRole.ADMIN))) -> User:
    return current_user


@router.get("/applications", response_model=list[ApplicationRead])
def list_applications(
    status_filter: ApplicationStatus | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    return application_service.list_applications_for_admin(db, status=status_filter)


@router.post("/applications/{application_id}/approve", response_model=ApplicationRead)
def approve_application(
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    try:
        return application_service.approve_application(
            db, application_id=application_id
        )
    except application_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except application_service.InvalidStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc


@router.post("/applications/{application_id}/reject", response_model=ApplicationRead)
def reject_application(
    application_id: uuid.UUID,
    payload: RejectApplicationRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    try:
        return application_service.reject_application(
            db, application_id=application_id, reason=payload.reason
        )
    except application_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except application_service.InvalidStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    except application_service.ApplicationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
