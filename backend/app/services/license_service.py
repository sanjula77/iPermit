import secrets
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.application import Application
from app.models.license import License, LicenseCategory, VehicleCategory
from app.repositories import license_repository
from app.services import points_service


class NotFoundError(Exception):
    pass


def issue_license(
    db: Session,
    application: Application,
    categories: list[VehicleCategory] | None = None,
) -> License:
    """REQ-4: generate a license number, QR token, and expiry for a
    just-approved application. Does NOT commit -- see
    application_service.approve_application, which commits this together
    with the application status change in one transaction."""
    license_no = f"DL-{uuid.uuid4().hex[:10].upper()}"
    qr_token = secrets.token_urlsafe(32)
    issued_at = datetime.utcnow()
    expiry_at = issued_at + timedelta(days=365 * settings.license_validity_years)

    return license_repository.add(
        db,
        driver_id=application.driver_id,
        application_id=application.id,
        license_no=license_no,
        qr_token=qr_token,
        issued_at=issued_at,
        expiry_at=expiry_at,
        categories=categories,
    )


def get_current_license_for_driver(db: Session, *, driver_id: uuid.UUID) -> License:
    """REQ-4: the driver's virtual license card data."""
    license_ = license_repository.get_latest_for_driver(db, driver_id)
    if license_ is None:
        raise NotFoundError("No license issued yet")
    # Points expire with time, so bring the licence up to date before showing it.
    return points_service.refresh(db, license_)


def set_categories(
    db: Session, *, license_id: uuid.UUID, categories: list[VehicleCategory]
) -> License:
    """Replaces the vehicle categories on an issued licence with `categories`.
    Categories that stay keep their original start date; new ones start now and
    run to the licence's expiry; the rest are removed."""
    license_ = license_repository.get_by_id(db, license_id)
    if license_ is None:
        raise NotFoundError("License not found")

    wanted = list(dict.fromkeys(categories))
    now = datetime.utcnow()
    kept = [item for item in license_.categories if item.category in wanted]
    held = {item.category for item in kept}
    license_.categories = kept + [
        LicenseCategory(category=category, issued_at=now, expiry_at=license_.expiry_at)
        for category in wanted
        if category not in held
    ]
    db.commit()
    db.refresh(license_)
    return license_
