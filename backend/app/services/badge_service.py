import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.badge import Badge, BadgeTier
from app.models.fine import FineStatus
from app.models.license import LicenseStatus
from app.models.notification import NotificationType
from app.repositories import (
    badge_repository,
    fine_repository,
    license_repository,
    violation_repository,
)
from app.services import notification_service

# REQ-11 AC1: a deliberately simple, explainable rule-based formula, not a
# fitted/ML model -- tune by adjusting these constants, not by adding
# branches. Each term maps to one of REQ-11's five named factors:
#   POINTS     -- current unresolved License.points balance (heaviest weight,
#                 since it's the direct suspension-risk proxy)
#   VIOLATIONS
#   + SEVERITY -- lifetime sum of points_deducted across every violation ever
#                 (permanent per REQ-8 AC4, but at a lighter weight than an
#                 unresolved violation's contribution to POINTS above --
#                 paying off a fine mostly, but not fully, restores standing)
#   FINES      -- count of currently unpaid fines (unresolved obligation)
#   TENURE     -- small bonus per full quarter the license has been held
_POINTS_WEIGHT = 5
_VIOLATION_SEVERITY_WEIGHT = 0.5
_UNPAID_FINE_WEIGHT = 5
_TENURE_BONUS_PER_QUARTER = 1
_TENURE_BONUS_CAP = 10
_TENURE_QUARTER_DAYS = 90

# Score thresholds, checked highest-first; SUSPENDED is a hard override in
# tier_for_score() below, not part of this table.
_TIER_THRESHOLDS: list[tuple[int, BadgeTier]] = [
    (90, BadgeTier.PLATINUM),
    (75, BadgeTier.GOLD),
    (60, BadgeTier.SILVER),
    (40, BadgeTier.BRONZE),
]


class NotFoundError(Exception):
    pass


def compute_safety_score(
    *,
    current_points: int,
    violation_severity_sum: int,
    unpaid_fine_count: int,
    tenure_days: int,
) -> int:
    """Pure function (no I/O) so the formula is independently unit-testable
    from synthetic inputs -- same pattern as
    face_service.check_pairwise_consistency."""
    tenure_bonus = min(
        _TENURE_BONUS_CAP,
        (tenure_days // _TENURE_QUARTER_DAYS) * _TENURE_BONUS_PER_QUARTER,
    )
    score = (
        100
        - current_points * _POINTS_WEIGHT
        - violation_severity_sum * _VIOLATION_SEVERITY_WEIGHT
        - unpaid_fine_count * _UNPAID_FINE_WEIGHT
        + tenure_bonus
    )
    return max(0, min(100, round(score)))


def tier_for_score(score: int, license_status: LicenseStatus) -> BadgeTier:
    """REQ-11 AC1: a suspended license is always SUSPENDED regardless of
    score -- this override takes precedence over the score thresholds."""
    if license_status == LicenseStatus.SUSPENDED:
        return BadgeTier.SUSPENDED
    for threshold, tier in _TIER_THRESHOLDS:
        if score >= threshold:
            return tier
    return BadgeTier.AT_RISK


def recompute_badge(db: Session, driver_id: uuid.UUID) -> Badge:
    """REQ-11 AC2: called after every violation/fine/appeal event, and once
    at license approval so every driver has an initial badge from day one.
    Commits on its own -- a best-effort follow-up step after whichever flow
    just changed the driver's record, not part of that flow's own
    transaction (same "known gap if this fails" pattern as Phase 4's
    face-template write: the primary business transaction already
    succeeded and is not rolled back if this step fails)."""
    license_ = license_repository.get_latest_for_driver(db, driver_id)
    if license_ is None:
        raise NotFoundError("This driver has no issued license")

    violations = violation_repository.list_for_driver(db, driver_id)
    violation_severity_sum = sum(v.points_deducted for v in violations)

    fines = fine_repository.list_for_driver(db, driver_id)
    unpaid_fine_count = sum(1 for f in fines if f.status == FineStatus.UNPAID)

    tenure_days = (datetime.utcnow() - license_.issued_at).days

    score = compute_safety_score(
        current_points=license_.points,
        violation_severity_sum=violation_severity_sum,
        unpaid_fine_count=unpaid_fine_count,
        tenure_days=tenure_days,
    )
    tier = tier_for_score(score, license_.status)

    existing = badge_repository.get_by_driver_id(db, driver_id)
    previous_tier = existing.tier if existing is not None else None

    badge = badge_repository.upsert(
        db, driver_id=driver_id, tier=tier, safety_score=score
    )
    db.commit()
    db.refresh(badge)

    # REQ-12 AC1: notify on an actual tier transition only -- not on the
    # very first badge a driver ever gets (that's covered by the
    # LICENSE_APPROVED notification already sent in the same flow).
    if previous_tier is not None and previous_tier != tier:
        notification_service.notify(
            db,
            user_id=driver_id,
            notification_type=NotificationType.BADGE_CHANGED,
            message=f"Your driver standing changed to {tier.value.replace('_', ' ')}.",
        )

    return badge


def get_badge_for_driver(db: Session, driver_id: uuid.UUID) -> Badge:
    badge = badge_repository.get_by_driver_id(db, driver_id)
    if badge is None:
        raise NotFoundError("No badge computed yet for this driver")
    return badge


def get_badge_distribution(db: Session) -> dict:
    """REQ-11 AC3 / REQ-14 AC1: tier distribution counts + the attention
    queue of AT_RISK/SUSPENDED drivers for the admin dashboard."""
    all_badges = badge_repository.list_all(db)
    distribution = {tier.value: 0 for tier in BadgeTier}
    for badge in all_badges:
        distribution[badge.tier.value] += 1

    attention_queue = badge_repository.list_by_tiers(
        db, [BadgeTier.AT_RISK, BadgeTier.SUSPENDED]
    )
    return {"distribution": distribution, "attention_queue": attention_queue}
