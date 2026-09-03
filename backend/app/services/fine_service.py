import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.appeal import AppealStatus
from app.models.fine import Fine, FineStatus, PaymentMethod
from app.repositories import appeal_repository, fine_repository
from app.services.violation_service import restore_points_for_violation


class NotFoundError(Exception):
    pass


class InvalidStateError(Exception):
    pass


def list_fines_for_driver(db: Session, *, driver_id: uuid.UUID) -> list[Fine]:
    """REQ-9 AC2: a driver's fine history and (via each Fine.status) their
    outstanding balance."""
    return fine_repository.list_for_driver(db, driver_id)


def pay_fine(
    db: Session,
    *,
    driver_id: uuid.UUID,
    fine_id: uuid.UUID,
    payment_method: PaymentMethod,
):
    """REQ-9 AC3/AC4: a mock payment -- no real processor is involved, only
    the UX selection of card/bank/wallet. Marks the fine PAID and restores
    the associated violation's points in the same transaction (design.md:
    "no partial updates")."""
    fine = fine_repository.get_by_id(db, fine_id)
    if fine is None or fine.violation.driver_id != driver_id:
        raise NotFoundError("No such fine")
    if fine.status != FineStatus.UNPAID:
        raise InvalidStateError(f"This fine is already {fine.status.value.lower()}")
    appeal = appeal_repository.get_by_fine_id(db, fine_id)
    if appeal is not None and appeal.status == AppealStatus.PENDING:
        raise InvalidStateError(
            "This fine has a pending appeal -- cannot pay it until resolved"
        )

    fine.status = FineStatus.PAID
    fine.paid_at = datetime.utcnow()
    fine.payment_method = payment_method

    license_ = restore_points_for_violation(db, fine.violation)

    db.commit()
    db.refresh(fine)
    db.refresh(license_)

    return {
        "fine": fine,
        "driver_points": license_.points,
        "license_status": license_.status,
    }
