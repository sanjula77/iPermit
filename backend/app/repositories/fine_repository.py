import uuid

from sqlalchemy.orm import Session

from app.models.fine import Fine


def add(db: Session, *, violation_id: uuid.UUID, amount: int) -> Fine:
    """Adds a Fine to the session without committing -- see
    violation_service.record_violation for the transaction boundary."""
    fine = Fine(violation_id=violation_id, amount=amount)
    db.add(fine)
    return fine
