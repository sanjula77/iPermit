import uuid
from pathlib import Path

from fastapi import UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.face_engine import FaceEngineError
from app.core.file_storage import (
    DOCUMENT_CONTENT_TYPES,
    IMAGE_CONTENT_TYPES,
    UploadValidationError,
    save_upload,
)
from app.models.application import Application, ApplicationStatus, DocumentType
from app.models.license import VehicleCategory
from app.models.notification import NotificationType
from app.repositories import application_repository, license_repository
from app.services import (
    badge_service,
    face_service,
    license_service,
    notification_service,
)

REQUIRED_FACE_PHOTOS = 4


class ApplicationError(Exception):
    """A problem the client must fix. `field` names the offending form field and
    `index` the position within a multi-file field (face_photos), so clients can
    highlight the exact input to redo instead of parsing the message."""

    def __init__(
        self, message: str, *, field: str | None = None, index: int | None = None
    ) -> None:
        super().__init__(message)
        self.field = field
        self.index = index


class NotFoundError(Exception):
    pass


class ServiceUnavailableError(Exception):
    """A dependency (the face engine) failed -- the submission itself may be
    fine, so the client should retry later rather than change its input."""


class ForbiddenError(Exception):
    pass


class InvalidStateError(Exception):
    """Raised when an action doesn't make sense for the application's current
    status -- e.g. approving an application that's already been decided."""


def _ensure_license_not_issued(db: Session, driver_id: uuid.UUID) -> None:
    # One license per driver: approving again would issue a second license
    # and replace the enrolled face without comparing it to the old one.
    if license_repository.get_latest_for_driver(db, driver_id) is not None:
        raise InvalidStateError("Driver already has a license")


def _ensure_can_apply(db: Session, driver_id: uuid.UUID) -> None:
    """Re-applying is only for drivers whose earlier applications were all
    rejected -- matches the app, which offers "Apply again" only then."""
    _ensure_license_not_issued(db, driver_id)
    applications = application_repository.list_by_driver(db, driver_id)
    if any(a.status == ApplicationStatus.PENDING for a in applications):
        raise InvalidStateError("An application is already under review")


async def submit_application(
    db: Session,
    *,
    driver_id: uuid.UUID,
    face_photos: list[UploadFile],
    nic_document: UploadFile,
    medical_cert: UploadFile,
    birth_cert: UploadFile,
    categories: list[VehicleCategory] | None = None,
) -> Application:
    """REQ-2: accepts 4 face photos + NIC + medical cert + birth cert, validates
    each, persists them, and creates a PENDING application in one DB transaction.
    Any already-saved files are cleaned up if a later file fails validation, so a
    failed submission never leaves orphaned uploads on disk."""
    _ensure_can_apply(db, driver_id)
    if len(face_photos) != REQUIRED_FACE_PHOTOS:
        raise ApplicationError(
            f"Exactly {REQUIRED_FACE_PHOTOS} face photos are required, "
            f"got {len(face_photos)}",
            field="face_photos",
        )

    subdir = f"applications/{uuid.uuid4()}"
    saved: list[tuple[DocumentType, str]] = []
    # Which input is being processed, so a failure can name it.
    current_field, current_index = "face_photos", None

    try:
        for index, photo in enumerate(face_photos):
            current_field, current_index = "face_photos", index
            # First validate the file format (mime type, is valid image)
            path = await save_upload(
                photo,
                subdir=subdir,
                allowed_types=IMAGE_CONTENT_TYPES,
                require_image=True,
            )
            saved.append((DocumentType.FACE_PHOTO, path))
            saved_path = Path(settings.upload_dir) / path
            # Then assess photo quality (face detection, blur, brightness, etc.)
            raw_photo = saved_path.read_bytes()
            # Inference is CPU-bound and blocking; off the event loop so
            # other requests aren't stalled while it runs.
            await run_in_threadpool(
                face_service.assess_enrollment_photo_quality, raw_photo
            )

        for field, doc_type, upload in (
            ("nic_document", DocumentType.NIC, nic_document),
            ("medical_cert", DocumentType.MEDICAL_CERT, medical_cert),
            ("birth_cert", DocumentType.BIRTH_CERT, birth_cert),
        ):
            current_field, current_index = field, None
            path = await save_upload(
                upload,
                subdir=subdir,
                allowed_types=DOCUMENT_CONTENT_TYPES,
                require_image=False,
            )
            saved.append((doc_type, path))
    except (UploadValidationError, face_service.FaceEnrollmentError) as exc:
        _delete_saved_files(saved)
        message = str(exc)
        if current_index is not None:
            message = f"Photo {current_index + 1}: {message}"
        raise ApplicationError(
            message, field=current_field, index=current_index
        ) from exc
    except FaceEngineError as exc:
        _delete_saved_files(saved)
        raise ServiceUnavailableError(
            "Photo checks are temporarily unavailable. Please try again later."
        ) from exc

    try:
        return application_repository.create(
            db,
            driver_id=driver_id,
            documents=saved,
            requested_categories=[c.value for c in _unique(categories or [])],
        )
    except Exception:
        _delete_saved_files(saved)
        raise


def _unique(categories: list[VehicleCategory]) -> list[VehicleCategory]:
    """Drops repeats, keeping the order given."""
    return list(dict.fromkeys(categories))


def _delete_saved_files(saved: list[tuple[DocumentType, str]]) -> None:
    for _, relative_path in saved:
        (Path(settings.upload_dir) / relative_path).unlink(missing_ok=True)


def get_application_for_driver(
    db: Session, *, application_id: uuid.UUID, driver_id: uuid.UUID
) -> Application:
    """REQ-2 AC4: a driver may only view their own application(s)."""
    application = application_repository.get_by_id(db, application_id)
    if application is None:
        raise NotFoundError("Application not found")
    if application.driver_id != driver_id:
        raise ForbiddenError("You do not have access to this application")
    return application


def list_applications_for_driver(
    db: Session, *, driver_id: uuid.UUID
) -> list[Application]:
    return application_repository.list_by_driver(db, driver_id)


def get_application_for_admin(db: Session, *, application_id: uuid.UUID) -> Application:
    application = application_repository.get_by_id(db, application_id)
    if application is None:
        raise NotFoundError("Application not found")
    return application


def list_applications_for_admin(
    db: Session, *, status: ApplicationStatus | None = None
) -> list[Application]:
    """REQ-3 AC1: admin can list applications, optionally filtered by status."""
    return application_repository.list_all(db, status=status)


def _get_pending_or_raise(db: Session, application_id: uuid.UUID) -> Application:
    application = application_repository.get_by_id(db, application_id)
    if application is None:
        raise NotFoundError("Application not found")
    if application.status != ApplicationStatus.PENDING:
        raise InvalidStateError(
            f"Application is already {application.status.value}, cannot re-decide it"
        )
    return application


def approve_application(
    db: Session,
    *,
    application_id: uuid.UUID,
    categories: list[VehicleCategory] | None = None,
    reviewer_id: uuid.UUID | None = None,
) -> Application:
    """REQ-3 AC2 + REQ-4 + REQ-5: approve a pending application, issue its
    digital license, and enroll its face template.

    Ordering matters here across two storage systems that can't share one
    transaction (Postgres for the application/license, SQLite+FAISS for
    biometric data, kept separate per REQ-5 AC3 / the NFR isolating
    biometric data from primary PII):

    1. Build the face embedding FIRST, before touching Postgres at all. If
       the enrollment photos don't consistently show one face,
       FaceEnrollmentError propagates and the application stays PENDING --
       nothing was written anywhere.
    2. Only once that succeeds: approve + issue the license in one Postgres
       transaction (existing behavior, unchanged).
    3. Only once THAT commits: persist the face template to SQLite/FAISS.
       If this last step fails, the approval and license already succeeded
       and are not rolled back -- a known gap (see docs/tasks.md Phase 4)
       rather than building cross-database two-phase commit for an
       academic-scope project.
    4. Compute the driver's initial Badge (REQ-11 AC2) now that a License
       exists -- every driver gets a badge from day one instead of needing
       lazy compute-on-read in the badge endpoints.

    `categories` is what the admin grants; None grants what the driver asked for.
    """
    application = _get_pending_or_raise(db, application_id)
    _ensure_license_not_issued(db, application.driver_id)

    try:
        face_embedding = face_service.build_enrollment_embedding(application)
    except FaceEngineError as exc:
        raise ServiceUnavailableError(
            "Face enrollment is temporarily unavailable. Please try again later."
        ) from exc

    application_repository.set_status(
        application, status=ApplicationStatus.APPROVED, reason=None
    )
    granted = (
        _unique(categories)
        if categories is not None
        else [VehicleCategory(code) for code in application.requested_categories]
    )
    license_service.issue_license(db, application, categories=granted)
    db.commit()
    db.refresh(application)

    face_service.store_template(
        str(application.driver_id),
        face_embedding,
        actor_id=str(reviewer_id) if reviewer_id else None,
    )
    badge_service.recompute_badge(db, application.driver_id)
    notification_service.notify(
        db,
        user_id=application.driver_id,
        notification_type=NotificationType.LICENSE_APPROVED,
        message="Your license application has been approved.",
    )

    return application


def reject_application(
    db: Session, *, application_id: uuid.UUID, reason: str
) -> Application:
    """REQ-3 AC3: reject a pending application with a required reason."""
    if not reason or not reason.strip():
        raise ApplicationError("A rejection reason is required")
    application = _get_pending_or_raise(db, application_id)
    application = application_repository.update_status(
        db, application, status=ApplicationStatus.REJECTED, reason=reason.strip()
    )
    notification_service.notify(
        db,
        user_id=application.driver_id,
        notification_type=NotificationType.LICENSE_REJECTED,
        message=f"Your license application was rejected: {reason.strip()}",
    )
    return application


_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".pdf": "application/pdf",
}


def get_document_file(
    db: Session, *, application_id: uuid.UUID, document_id: uuid.UUID
) -> tuple[Path, str]:
    """The stored file for one application document, for an administrator to
    review. The path is resolved and must stay inside the upload directory."""
    document = application_repository.get_document(db, application_id, document_id)
    if document is None:
        raise NotFoundError("Document not found")
    base = Path(settings.upload_dir).resolve()
    path = (base / document.file_path).resolve()
    if base not in path.parents or not path.is_file():
        raise NotFoundError("Document file not found")
    return path, _MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")


def get_license_photo_file(db: Session, *, driver_id: uuid.UUID) -> tuple[Path, str]:
    """The driver's own registration photo for their licence card: the first
    face photo of the application their licence was issued from. Scoped to the
    caller's own licence, so one driver can never read another's photo."""
    license_ = license_repository.get_latest_for_driver(db, driver_id)
    if license_ is None:
        raise NotFoundError("No license issued yet")
    photo = application_repository.get_first_face_photo(db, license_.application_id)
    if photo is None:
        raise NotFoundError("No photo on file")
    return get_document_file(
        db, application_id=license_.application_id, document_id=photo.id
    )
