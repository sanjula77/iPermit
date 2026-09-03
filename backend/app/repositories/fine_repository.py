import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.fine import Fine
from app.models.violation import Violation


def add(db: Session, *, violation_id: uuid.UUID, amount: int) -> Fine:
    """Adds a Fine to the session without committing -- see
    violation_service.record_violation for the transaction boundary."""
    fine = Fine(violation_id=violation_id, amount=amount)
    db.add(fine)
    return fine


def get_by_id(db: Session, fine_id: uuid.UUID) -> Fine | None:
    return db.get(Fine, fine_id)


def list_for_driver(db: Session, driver_id: uuid.UUID) -> list[Fine]:
    """Fine has no driver_id of its own (design.md: Fine -> Violation ->
    driver) -- join through Violation to scope to one driver's fines."""
    stmt = (
        select(Fine)
        .join(Violation, Fine.violation_id == Violation.id)
        .where(Violation.driver_id == driver_id)
        .options(joinedload(Fine.violation))
        .order_by(Fine.created_at.desc())
    )
    return list(db.scalars(stmt))
