from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User, UserRole
from app.schemas.behaviour import BehaviourRead
from app.services import behaviour_service

router = APIRouter(prefix="/behaviour", tags=["behaviour"])


@router.get("/me", response_model=BehaviourRead)
def get_my_behaviour(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DRIVER)),
):
    try:
        return behaviour_service.get_behaviour_for_driver(db, current_user.id)
    except behaviour_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
