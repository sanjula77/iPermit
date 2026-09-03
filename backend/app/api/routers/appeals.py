from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User, UserRole
from app.schemas.appeal import AppealRead, SubmitAppealRequest
from app.services import appeal_service

router = APIRouter(prefix="/appeals", tags=["appeals"])


@router.post("", response_model=AppealRead, status_code=status.HTTP_201_CREATED)
def submit_appeal(
    payload: SubmitAppealRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    try:
        return appeal_service.submit_appeal(
            db,
            driver_id=current_user.id,
            fine_id=payload.fine_id,
            reason=payload.reason,
        )
    except appeal_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except appeal_service.InvalidStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc


@router.get("/me", response_model=list[AppealRead])
def list_my_appeals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    return appeal_service.list_appeals_for_driver(db, driver_id=current_user.id)
