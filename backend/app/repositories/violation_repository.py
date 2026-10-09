import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.fine import Fine, FineStatus
from app.models.violation import Violation, ViolationType


def add(
    db: Session,
    *,
    driver_id: uuid.UUID,
    officer_id: uuid.UUID,
    violation_type: ViolationType,
    points_deducted: int,
    evidence_ref: str | None,
    description: str | None = None,
    confirmed_at: datetime | None = None,
    client_id: uuid.UUID | None = None,
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
        description=description,
        client_id=client_id,
    )
    now = datetime.utcnow()
    violation.confirmed_at = confirmed_at or now
    violation.received_at = now
    db.add(violation)
    return violation


def get_by_client_id(db: Session, client_id: uuid.UUID) -> Violation | None:
    return db.scalar(select(Violation).where(Violation.client_id == client_id))


def list_for_driver(db: Session, driver_id: uuid.UUID) -> list[Violation]:
    stmt = (
        select(Violation)
        .where(Violation.driver_id == driver_id)
        .order_by(Violation.confirmed_at.desc())
    )
    return list(db.scalars(stmt))


def count_for_officer(
    db: Session, officer_id: uuid.UUID, *, since: datetime | None = None
) -> int:
    """Violations this officer recorded, optionally only since a naive-UTC
    moment (confirmed_at is stored as naive UTC)."""
    stmt = select(func.count(Violation.id)).where(Violation.officer_id == officer_id)
    if since is not None:
        stmt = stmt.where(Violation.confirmed_at >= since)
    return db.scalar(stmt) or 0


def list_recent_for_officer(
    db: Session, officer_id: uuid.UUID, *, limit: int
) -> list[tuple[Violation, int | None]]:
    """The officer's most recent violations, newest first, each with its fine
    amount (None if no fine row exists) and the driver loaded."""
    stmt = (
        select(Violation, Fine.amount)
        .outerjoin(Fine, Fine.violation_id == Violation.id)
        .where(Violation.officer_id == officer_id)
        .options(joinedload(Violation.driver))
        .order_by(Violation.confirmed_at.desc())
        .limit(limit)
    )
    return [(violation, amount) for violation, amount in db.execute(stmt)]


def list_with_fine_status_for_driver(
    db: Session, driver_id: uuid.UUID
) -> list[tuple[Violation, FineStatus | None]]:
    """One driver's violations, newest first, each with its fine's status
    (None if no fine row exists)."""
    stmt = (
        select(Violation, Fine.status)
        .outerjoin(Fine, Fine.violation_id == Violation.id)
        .where(Violation.driver_id == driver_id)
        .order_by(Violation.confirmed_at.desc())
    )
    return [(violation, status) for violation, status in db.execute(stmt)]


def list_with_fine_status_all(
    db: Session,
) -> list[tuple[Violation, FineStatus | None]]:
    """Every violation with its fine's status, for the admin overview, which
    groups them per driver in one query instead of one query per driver."""
    stmt = (
        select(Violation, Fine.status)
        .outerjoin(Fine, Fine.violation_id == Violation.id)
        .order_by(Violation.confirmed_at.desc())
    )
    return [(violation, status) for violation, status in db.execute(stmt)]


def count_for_driver(db: Session, driver_id: uuid.UUID) -> int:
    stmt = select(func.count(Violation.id)).where(Violation.driver_id == driver_id)
    return db.scalar(stmt) or 0


def count_per_driver(db: Session) -> dict[uuid.UUID, int]:
    stmt = select(Violation.driver_id, func.count(Violation.id)).group_by(
        Violation.driver_id
    )
    return {driver_id: count for driver_id, count in db.execute(stmt)}


def count_per_officer(db: Session) -> dict[uuid.UUID, int]:
    stmt = select(Violation.officer_id, func.count(Violation.id)).group_by(
        Violation.officer_id
    )
    return {officer_id: count for officer_id, count in db.execute(stmt)}
