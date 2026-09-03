import secrets
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.application import Application
from app.models.license import License
from app.repositories import license_repository


class NotFoundError(Exception):
    pass


def issue_license(db: Session, application: Application) -> License:
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
    )


def get_current_license_for_driver(db: Session, *, driver_id: uuid.UUID) -> License:
    """REQ-4: the driver's virtual license card data."""
    license_ = license_repository.get_latest_for_driver(db, driver_id)
    if license_ is None:
        raise NotFoundError("No license issued yet")
    return license_
