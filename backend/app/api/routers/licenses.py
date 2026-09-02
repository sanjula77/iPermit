from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User, UserRole
from app.schemas.license import LicenseRead
from app.services import license_service

router = APIRouter(prefix="/licenses", tags=["licenses"])


@router.get("/me", response_model=LicenseRead)
def get_my_license(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    try:
        return license_service.get_current_license_for_driver(
            db, driver_id=current_user.id
        )
    except license_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
