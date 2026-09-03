import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.appeal import Appeal, AppealStatus
from app.models.fine import FineStatus
from app.repositories import appeal_repository, fine_repository
from app.schemas.appeal import AppealResolution
from app.services.violation_service import restore_points_for_violation


class NotFoundError(Exception):
    pass


class InvalidStateError(Exception):
    pass


def list_appeals_for_driver(db: Session, *, driver_id: uuid.UUID) -> list[Appeal]:
    return appeal_repository.list_for_driver(db, driver_id)


def list_all_appeals(
    db: Session, *, status_filter: AppealStatus | None
) -> list[Appeal]:
    return appeal_repository.list_all(db, status_filter=status_filter)


def submit_appeal(
    db: Session, *, driver_id: uuid.UUID, fine_id: uuid.UUID, reason: str
) -> Appeal:
    """REQ-10 AC1: only an UNPAID fine can be appealed -- once PAID or
    REVERSED there is nothing left to contest in this mock system, and the
    unique constraint on Appeal.fine_id means at most one appeal per fine
    ever exists."""
    fine = fine_repository.get_by_id(db, fine_id)
    if fine is None or fine.violation.driver_id != driver_id:
        raise NotFoundError("No such fine")
    if fine.status != FineStatus.UNPAID:
        raise InvalidStateError(
            f"This fine is already {fine.status.value.lower()} and cannot be appealed"
        )
    if appeal_repository.get_by_fine_id(db, fine_id) is not None:
        raise InvalidStateError("This fine has already been appealed")

    appeal = appeal_repository.add(
        db, fine_id=fine_id, driver_id=driver_id, reason=reason
    )
    db.commit()
    db.refresh(appeal)
    return appeal


def resolve_appeal(
    db: Session,
    *,
    appeal_id: uuid.UUID,
    admin_id: uuid.UUID,
    resolution: AppealResolution,
) -> Appeal:
    """REQ-10 AC2/AC3: an admin resolves a PENDING appeal as UPHELD (the
    fine stands, driver still owes it) or OVERTURNED (reverse the fine and
    restore the points tied to it, same restoration rule as paying)."""
    appeal = appeal_repository.get_by_id(db, appeal_id)
    if appeal is None:
        raise NotFoundError("No such appeal")
    if appeal.status != AppealStatus.PENDING:
        raise InvalidStateError(f"This appeal is already {appeal.status.value.lower()}")

    appeal.status = AppealStatus(resolution.value)
    appeal.resolved_by = admin_id
    appeal.resolved_at = datetime.utcnow()

    if resolution == AppealResolution.OVERTURNED:
        fine = appeal.fine
        fine.status = FineStatus.REVERSED
        restore_points_for_violation(db, fine.violation)

    db.commit()
    db.refresh(appeal)
    return appeal
