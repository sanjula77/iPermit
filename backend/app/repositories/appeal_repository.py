import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.appeal import Appeal, AppealStatus
from app.models.fine import Fine


def add(
    db: Session, *, fine_id: uuid.UUID, driver_id: uuid.UUID, reason: str
) -> Appeal:
    """Adds an Appeal to the session without committing -- see
    appeal_service.submit_appeal for the transaction boundary."""
    appeal = Appeal(fine_id=fine_id, driver_id=driver_id, reason=reason)
    db.add(appeal)
    return appeal


def get_by_id(db: Session, appeal_id: uuid.UUID) -> Appeal | None:
    return db.get(Appeal, appeal_id)


def get_by_fine_id(db: Session, fine_id: uuid.UUID) -> Appeal | None:
    return db.scalar(select(Appeal).where(Appeal.fine_id == fine_id))


def list_for_driver(db: Session, driver_id: uuid.UUID) -> list[Appeal]:
    stmt = (
        select(Appeal)
        .where(Appeal.driver_id == driver_id)
        .options(
            joinedload(Appeal.fine).joinedload(Fine.violation),
            joinedload(Appeal.driver),
        )
        .order_by(Appeal.created_at.desc())
    )
    return list(db.scalars(stmt))


def list_all(db: Session, *, status_filter: AppealStatus | None = None) -> list[Appeal]:
    stmt = (
        select(Appeal)
        .options(
            joinedload(Appeal.fine).joinedload(Fine.violation),
            joinedload(Appeal.driver),
        )
        .order_by(Appeal.created_at.desc())
    )
    if status_filter is not None:
        stmt = stmt.where(Appeal.status == status_filter)
    return list(db.scalars(stmt))
