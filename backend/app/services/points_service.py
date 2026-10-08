import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.points import (
    SUSPENSION_POINTS_THRESHOLD,
    Entry,
    active_points,
    next_expiry,
    suspension_ends_at,
)
from app.models.fine import FineStatus
from app.models.license import License, LicenseStatus
from app.models.notification import NotificationType
from app.models.violation import Violation
from app.repositories import license_repository, violation_repository
from app.services import notification_service

Rows = list[tuple[Violation, FineStatus | None]]


def _entries(rows: Rows) -> list[Entry]:
    return [
        (v.points_deducted, v.confirmed_at, status == FineStatus.REVERSED)
        for v, status in rows
    ]


def recompute(
    db: Session,
    license_: License,
    *,
    rows: Rows | None = None,
    now: datetime | None = None,
) -> License:
    """Sets the licence's points and status from the violations that count today.
    Does not commit, so a caller can fold it into its own transaction. Points
    never go up or down by paying a fine: they change only when a violation is
    recorded, overturned, or ages past the validity period."""
    now = now or datetime.utcnow()
    if rows is None:
        db.flush()
        rows = violation_repository.list_with_fine_status_for_driver(
            db, license_.driver_id
        )
    points = active_points(
        _entries(rows), now=now, validity_days=settings.points_validity_days
    )
    # Shown points stop at the suspension limit (10 / 10); the full total still
    # decides the status and when a suspension lifts.
    license_.points = min(points, SUSPENSION_POINTS_THRESHOLD)
    license_.status = (
        LicenseStatus.SUSPENDED
        if points >= SUSPENSION_POINTS_THRESHOLD
        else LicenseStatus.ACTIVE
    )
    return license_


def notify_reinstated(db: Session, driver_id: uuid.UUID) -> None:
    notification_service.notify(
        db,
        user_id=driver_id,
        notification_type=NotificationType.LICENSE_REINSTATED,
        message="Your license has been reinstated: your points are back "
        "below the limit.",
    )


def _badge_follows(db: Session, driver_id: uuid.UUID) -> None:
    """A driver's safety badge depends on their points, so it is recomputed when
    points change for any reason, including expiry. Imported here because the
    badge service itself uses this module."""
    from app.services import badge_service

    badge_service.recompute_badge(db, driver_id)


def refresh(db: Session, license_: License, *, now: datetime | None = None) -> License:
    """recompute() for read paths: brings a licence up to date (old points may
    have expired since it was last touched), saves it if anything changed, and
    tells the driver when a suspension has lifted."""
    before = (license_.points, license_.status)
    recompute(db, license_, now=now)
    if (license_.points, license_.status) == before:
        return license_
    reinstated = (
        before[1] == LicenseStatus.SUSPENDED and license_.status == LicenseStatus.ACTIVE
    )
    db.commit()
    db.refresh(license_)
    _badge_follows(db, license_.driver_id)
    if reinstated:
        notify_reinstated(db, license_.driver_id)
    return license_


def refresh_all(db: Session, *, now: datetime | None = None) -> None:
    """refresh() for every licence, using one query for all violations; for the
    admin lists and overview."""
    by_driver: dict[uuid.UUID, Rows] = {}
    for violation, status in violation_repository.list_with_fine_status_all(db):
        by_driver.setdefault(violation.driver_id, []).append((violation, status))

    reinstated: list[uuid.UUID] = []
    changed_drivers: list[uuid.UUID] = []
    for license_ in license_repository.list_all(db):
        before = (license_.points, license_.status)
        recompute(db, license_, rows=by_driver.get(license_.driver_id, []), now=now)
        if (license_.points, license_.status) != before:
            changed_drivers.append(license_.driver_id)
            if (
                before[1] == LicenseStatus.SUSPENDED
                and license_.status == LicenseStatus.ACTIVE
            ):
                reinstated.append(license_.driver_id)
    if changed_drivers:
        db.commit()
    for driver_id in changed_drivers:
        _badge_follows(db, driver_id)
    for driver_id in reinstated:
        notify_reinstated(db, driver_id)


def points_expire_at(
    db: Session, license_: License, *, now: datetime | None = None
) -> datetime | None:
    """When the driver's earliest counting points drop off, for the card."""
    rows = violation_repository.list_with_fine_status_for_driver(db, license_.driver_id)
    return next_expiry(
        _entries(rows),
        now=now or datetime.utcnow(),
        validity_days=settings.points_validity_days,
    )


def suspension_lifts_at(
    db: Session, license_: License, *, now: datetime | None = None
) -> datetime | None:
    """When a suspended licence's points fall below the limit, for the card."""
    rows = violation_repository.list_with_fine_status_for_driver(db, license_.driver_id)
    return suspension_ends_at(
        _entries(rows),
        now=now or datetime.utcnow(),
        validity_days=settings.points_validity_days,
        threshold=SUSPENSION_POINTS_THRESHOLD,
    )
