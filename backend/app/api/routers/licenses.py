from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User, UserRole
from app.schemas.license import LicenseRead
from app.services import application_service, license_service, points_service

router = APIRouter(prefix="/licenses", tags=["licenses"])


@router.get("/me", response_model=LicenseRead)
def get_my_license(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    try:
        license_ = license_service.get_current_license_for_driver(
            db, driver_id=current_user.id
        )
        result = LicenseRead.model_validate(license_)
        result.points_expire_at = points_service.points_expire_at(db, license_)
        return result
    except license_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.get("/me/photo", response_class=FileResponse)
def get_my_license_photo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    """The face photo from the driver's registration, shown on their card."""
    try:
        path, media_type = application_service.get_license_photo_file(
            db, driver_id=current_user.id
        )
    except application_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    # A face photo: never cached by browsers or proxies.
    return FileResponse(
        path, media_type=media_type, headers={"Cache-Control": "private, no-store"}
    )
