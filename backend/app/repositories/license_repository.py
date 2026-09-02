import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.license import License, LicenseStatus


def add(
    db: Session,
    *,
    driver_id: uuid.UUID,
    application_id: uuid.UUID,
    license_no: str,
    qr_token: str,
    issued_at: datetime,
    expiry_at: datetime,
) -> License:
    """Adds a License to the session without committing -- the caller
    controls the transaction boundary (see application_service.approve_application,
    which commits this together with the application status change)."""
    license_ = License(
        driver_id=driver_id,
        application_id=application_id,
        license_no=license_no,
        qr_token=qr_token,
        status=LicenseStatus.ACTIVE,
        issued_at=issued_at,
        expiry_at=expiry_at,
    )
    db.add(license_)
    return license_


def get_latest_for_driver(db: Session, driver_id: uuid.UUID) -> License | None:
    stmt = (
        select(License)
        .where(License.driver_id == driver_id)
        .order_by(License.issued_at.desc())
        .limit(1)
    )
    return db.scalar(stmt)
