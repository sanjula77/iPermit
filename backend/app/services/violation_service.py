import uuid

from sqlalchemy.orm import Session

from app.models.fine import VIOLATION_FINE_AMOUNT
from app.models.license import License, LicenseStatus
from app.models.violation import VIOLATION_POINTS, Violation, ViolationType
from app.repositories import fine_repository, license_repository, violation_repository

# REQ-8 AC2: license suspends once cumulative points reach this threshold.
SUSPENSION_POINTS_THRESHOLD = 10


class NotFoundError(Exception):
    pass


def restore_points_for_violation(db: Session, violation: Violation) -> License:
    """REQ-8 AC3's "defined restoration rule": paying a fine, or having it
    overturned on appeal, undoes just that violation's point deduction
    (floored at 0) and reactivates a SUSPENDED license if the balance drops
    back below the threshold. Shared by fine_service.pay_fine and
    appeal_service.resolve_appeal -- both are the only two ways a fine
    leaves UNPAID, and each violation can only be resolved once (fine
    status is terminal after PAID/REVERSED), so there's no double-restore
    risk between them."""
    license_ = license_repository.get_latest_for_driver(db, violation.driver_id)
    if license_ is None:
        raise NotFoundError("This driver has no issued license")

    license_.points = max(0, license_.points - violation.points_deducted)
    if (
        license_.status == LicenseStatus.SUSPENDED
        and license_.points < SUSPENSION_POINTS_THRESHOLD
    ):
        license_.status = LicenseStatus.ACTIVE
    return license_


def record_violation(
    db: Session,
    *,
    officer_id: uuid.UUID,
    driver_id: uuid.UUID,
    violation_type: ViolationType,
    evidence_ref: str | None,
):
    """REQ-8/REQ-9: records a confirmed violation, deducts points, generates
    a fine, and suspends the license at the threshold -- all in one
    transaction (design.md's Error Handling: "no partial point deduction
    without a fine record"). A driver needs an issued license for this to
    make sense (there's nowhere to record points against otherwise), so a
    driver with no license raises NotFoundError rather than silently
    creating an orphaned violation."""
    license_ = license_repository.get_latest_for_driver(db, driver_id)
    if license_ is None:
        raise NotFoundError("This driver has no issued license")

    points = VIOLATION_POINTS[violation_type]
    violation = violation_repository.add(
        db,
        driver_id=driver_id,
        officer_id=officer_id,
        violation_type=violation_type,
        points_deducted=points,
        evidence_ref=evidence_ref,
    )
    db.flush()  # assigns violation.id, needed for the fine's FK

    fine = fine_repository.add(
        db, violation_id=violation.id, amount=VIOLATION_FINE_AMOUNT[violation_type]
    )

    license_.points += points
    if license_.points >= SUSPENSION_POINTS_THRESHOLD:
        license_.status = LicenseStatus.SUSPENDED

    db.commit()
    db.refresh(violation)
    db.refresh(fine)
    db.refresh(license_)

    return {
        "violation": violation,
        "fine": fine,
        "driver_points": license_.points,
        "license_status": license_.status,
    }
