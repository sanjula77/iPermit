import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.license import License, LicenseCategory, LicenseStatus, VehicleCategory


def add(
    db: Session,
    *,
    driver_id: uuid.UUID,
    application_id: uuid.UUID,
    license_no: str,
    qr_token: str,
    issued_at: datetime,
    expiry_at: datetime,
    categories: list[VehicleCategory] | None = None,
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
        # Every category starts when the licence does and ends with it.
        categories=[
            LicenseCategory(category=category, issued_at=issued_at, expiry_at=expiry_at)
            for category in categories or []
        ],
    )
    db.add(license_)
    return license_


def get_by_id(db: Session, license_id: uuid.UUID) -> License | None:
    return db.get(License, license_id)


def get_latest_for_driver(db: Session, driver_id: uuid.UUID) -> License | None:
    stmt = (
        select(License)
        .where(License.driver_id == driver_id)
        .order_by(License.issued_at.desc())
        .limit(1)
    )
    return db.scalar(stmt)


def get_by_qr_token(db: Session, qr_token: str) -> License | None:
    return db.scalar(select(License).where(License.qr_token == qr_token))


def get_by_license_no(db: Session, license_no: str) -> License | None:
    return db.scalar(select(License).where(License.license_no == license_no))


def list_all(db: Session) -> list[License]:
    """Every issued licence with its driver loaded (one licence per driver)."""
    stmt = select(License).options(joinedload(License.driver))
    return list(db.scalars(stmt))


def delete_for_driver(db: Session, driver_id: uuid.UUID) -> None:
    for license_ in db.scalars(select(License).where(License.driver_id == driver_id)):
        db.delete(license_)
