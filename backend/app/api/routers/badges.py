from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User, UserRole
from app.schemas.badge import BadgeRead
from app.services import badge_service

router = APIRouter(prefix="/badges", tags=["badges"])


@router.get("/me", response_model=BadgeRead)
def get_my_badge(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    try:
        return badge_service.get_badge_for_driver(db, current_user.id)
    except badge_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
