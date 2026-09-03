import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User, UserRole
from app.schemas.fine import FineWithViolationRead, PayFineRequest, PayFineResponse
from app.services import fine_service

router = APIRouter(prefix="/fines", tags=["fines"])


@router.get("/me", response_model=list[FineWithViolationRead])
def list_my_fines(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    return fine_service.list_fines_for_driver(db, driver_id=current_user.id)


@router.post("/{fine_id}/pay", response_model=PayFineResponse)
def pay_fine(
    fine_id: uuid.UUID,
    payload: PayFineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    try:
        return fine_service.pay_fine(
            db,
            driver_id=current_user.id,
            fine_id=fine_id,
            payment_method=payload.payment_method,
        )
    except fine_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except fine_service.InvalidStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
