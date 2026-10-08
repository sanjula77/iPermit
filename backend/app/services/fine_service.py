import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.appeal import AppealStatus
from app.models.fine import Fine, FineStatus, PaymentMethod
from app.models.notification import NotificationType
from app.repositories import appeal_repository, fine_repository, license_repository
from app.services import badge_service, notification_service, points_service


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
    the UX selection of card/bank/wallet. Marks the fine PAID. Paying does NOT
    give the violation's points back: they count for the full validity period
    (see app.core.points), otherwise a driver could offend, pay, and start again."""
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

    # No change to points; this only brings the licence up to date (old points
    # may have expired since it was last read) and fetches it for the response.
    license_ = license_repository.get_latest_for_driver(db, driver_id)
    points_service.recompute(db, license_)

    db.commit()
    db.refresh(fine)
    db.refresh(license_)

    badge_service.recompute_badge(db, driver_id)  # REQ-11 AC2

    notification_service.notify(
        db,
        user_id=driver_id,
        notification_type=NotificationType.PAYMENT_CONFIRMED,
        message=f"Your payment of LKR {fine.amount} was received.",
    )

    return {
        "fine": fine,
        "driver_points": license_.points,
        "license_status": license_.status,
    }
