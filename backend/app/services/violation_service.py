import uuid

from sqlalchemy.orm import Session

from app.core.points import SUSPENSION_POINTS_THRESHOLD
from app.models.fine import fine_amount_for
from app.models.license import LicenseStatus
from app.models.notification import NotificationType
from app.models.violation import (
    OTHER_DESCRIPTION_MAX_LENGTH,
    OTHER_DESCRIPTION_MIN_LENGTH,
    OTHER_MAX_POINTS,
    OTHER_MIN_POINTS,
    VIOLATION_POINTS,
    ViolationType,
)
from app.repositories import fine_repository, license_repository, violation_repository
from app.services import badge_service, notification_service, points_service

# Re-exported: other modules read the suspension limit from here.
__all__ = [
    "SUSPENSION_POINTS_THRESHOLD",
    "InvalidViolationError",
    "NotFoundError",
    "record_violation",
]


class NotFoundError(Exception):
    pass


class InvalidViolationError(Exception):
    """The violation details are not acceptable (an OTHER violation without a
    usable description or with points outside the allowed range)."""


def _points_and_description(
    violation_type: ViolationType, points: int | None, description: str | None
) -> tuple[int, str | None]:
    """The points and description to store. Listed types have fixed points and no
    description; an OTHER violation needs the officer's description and points,
    within the allowed range (checked again here, not only in the request schema)."""
    if violation_type != ViolationType.OTHER:
        return VIOLATION_POINTS[violation_type], None
    text = (description or "").strip()
    if not (OTHER_DESCRIPTION_MIN_LENGTH <= len(text) <= OTHER_DESCRIPTION_MAX_LENGTH):
        raise InvalidViolationError(
            f"Describe the violation in {OTHER_DESCRIPTION_MIN_LENGTH}"
            f"-{OTHER_DESCRIPTION_MAX_LENGTH} characters."
        )
    if points is None or not OTHER_MIN_POINTS <= points <= OTHER_MAX_POINTS:
        raise InvalidViolationError(
            f"Points must be between {OTHER_MIN_POINTS} and {OTHER_MAX_POINTS}."
        )
    return points, text


def _describe(violation_type: ViolationType, description: str | None) -> str:
    if violation_type == ViolationType.OTHER and description:
        return f'A violation ("{description}")'
    return f"A {violation_type.value} violation"


def record_violation(
    db: Session,
    *,
    officer_id: uuid.UUID,
    driver_id: uuid.UUID,
    violation_type: ViolationType,
    evidence_ref: str | None,
    description: str | None = None,
    points: int | None = None,
):
    """REQ-8/REQ-9: records a confirmed violation, counts its points, generates
    a fine, and suspends the license at the threshold -- all in one
    transaction (design.md's Error Handling: "no partial point deduction
    without a fine record"). A driver needs an issued license for this to
    make sense (there's nowhere to record points against otherwise), so a
    driver with no license raises NotFoundError rather than silently
    creating an orphaned violation."""
    license_ = license_repository.get_latest_for_driver(db, driver_id)
    if license_ is None:
        raise NotFoundError("This driver has no issued license")

    points, description = _points_and_description(violation_type, points, description)
    violation = violation_repository.add(
        db,
        driver_id=driver_id,
        officer_id=officer_id,
        violation_type=violation_type,
        points_deducted=points,
        evidence_ref=evidence_ref,
        description=description,
    )
    db.flush()  # assigns violation.id, needed for the fine's FK

    fine = fine_repository.add(
        db, violation_id=violation.id, amount=fine_amount_for(violation_type, points)
    )

    # Points are worked out from the violations that count (this one included);
    # the licence is suspended if they reach the limit.
    points_service.recompute(db, license_)

    db.commit()
    db.refresh(violation)
    db.refresh(fine)
    db.refresh(license_)

    badge_service.recompute_badge(db, driver_id)  # REQ-11 AC2

    notification_service.notify(
        db,
        user_id=driver_id,
        notification_type=NotificationType.FINE_ISSUED,
        message=f"{_describe(violation_type, description)} was recorded against you. "
        f"Fine: LKR {fine.amount}.",
    )
    if license_.status == LicenseStatus.SUSPENDED:
        notification_service.notify(
            db,
            user_id=driver_id,
            notification_type=NotificationType.LICENSE_SUSPENDED,
            message="Your license has been suspended due to accumulated points.",
        )

    return {
        "violation": violation,
        "fine": fine,
        "driver_points": license_.points,
        "license_status": license_.status,
    }
