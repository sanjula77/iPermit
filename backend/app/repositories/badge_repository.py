import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.badge import Badge, BadgeTier


def upsert(
    db: Session, *, driver_id: uuid.UUID, tier: BadgeTier, safety_score: int
) -> Badge:
    """Creates or updates the driver's single Badge row -- does not commit,
    caller controls the transaction boundary (see badge_service.recompute_badge)."""
    badge = db.get(Badge, driver_id)
    if badge is None:
        badge = Badge(driver_id=driver_id, tier=tier, safety_score=safety_score)
        db.add(badge)
    else:
        badge.tier = tier
        badge.safety_score = safety_score
    return badge


def get_by_driver_id(db: Session, driver_id: uuid.UUID) -> Badge | None:
    return db.get(Badge, driver_id)


def list_all(db: Session) -> list[Badge]:
    stmt = (
        select(Badge)
        .options(joinedload(Badge.driver))
        .order_by(Badge.safety_score.asc())
    )
    return list(db.scalars(stmt))


def list_by_tiers(db: Session, tiers: list[BadgeTier]) -> list[Badge]:
    stmt = (
        select(Badge)
        .where(Badge.tier.in_(tiers))
        .options(joinedload(Badge.driver))
        .order_by(Badge.safety_score.asc())
    )
    return list(db.scalars(stmt))
