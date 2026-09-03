import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.violation import Violation, ViolationType


def add(
    db: Session,
    *,
    driver_id: uuid.UUID,
    officer_id: uuid.UUID,
    violation_type: ViolationType,
    points_deducted: int,
    evidence_ref: str | None,
) -> Violation:
    """Adds a Violation to the session without committing -- the caller
    controls the transaction boundary (see violation_service.record_violation,
    which commits this together with the fine and the license point update)."""
    violation = Violation(
        driver_id=driver_id,
        officer_id=officer_id,
        type=violation_type,
        points_deducted=points_deducted,
        evidence_ref=evidence_ref,
    )
    db.add(violation)
    return violation


def list_for_driver(db: Session, driver_id: uuid.UUID) -> list[Violation]:
    stmt = (
        select(Violation)
        .where(Violation.driver_id == driver_id)
        .order_by(Violation.confirmed_at.desc())
    )
    return list(db.scalars(stmt))
