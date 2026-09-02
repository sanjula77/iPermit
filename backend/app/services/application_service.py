import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.file_storage import (
    DOCUMENT_CONTENT_TYPES,
    IMAGE_CONTENT_TYPES,
    UploadValidationError,
    save_upload,
)
from app.models.application import Application, ApplicationStatus, DocumentType
from app.repositories import application_repository

REQUIRED_FACE_PHOTOS = 4


class ApplicationError(Exception):
    pass


class NotFoundError(Exception):
    pass


class ForbiddenError(Exception):
    pass


class InvalidStateError(Exception):
    """Raised when an action doesn't make sense for the application's current
    status -- e.g. approving an application that's already been decided."""


async def submit_application(
    db: Session,
    *,
    driver_id: uuid.UUID,
    face_photos: list[UploadFile],
    nic_document: UploadFile,
    medical_cert: UploadFile,
    birth_cert: UploadFile,
) -> Application:
    """REQ-2: accepts 4 face photos + NIC + medical cert + birth cert, validates
    each, persists them, and creates a PENDING application in one DB transaction.
    Any already-saved files are cleaned up if a later file fails validation, so a
    failed submission never leaves orphaned uploads on disk."""
    if len(face_photos) != REQUIRED_FACE_PHOTOS:
        raise ApplicationError(
            f"Exactly {REQUIRED_FACE_PHOTOS} face photos are required, "
            f"got {len(face_photos)}"
        )

    subdir = f"applications/{uuid.uuid4()}"
    saved: list[tuple[DocumentType, str]] = []

    try:
        for photo in face_photos:
            path = await save_upload(
                photo,
                subdir=subdir,
                allowed_types=IMAGE_CONTENT_TYPES,
                require_image=True,
            )
            saved.append((DocumentType.FACE_PHOTO, path))

        for doc_type, upload in (
            (DocumentType.NIC, nic_document),
            (DocumentType.MEDICAL_CERT, medical_cert),
            (DocumentType.BIRTH_CERT, birth_cert),
        ):
            path = await save_upload(
                upload,
                subdir=subdir,
                allowed_types=DOCUMENT_CONTENT_TYPES,
                require_image=False,
            )
            saved.append((doc_type, path))
    except UploadValidationError as exc:
        _delete_saved_files(saved)
        raise ApplicationError(str(exc)) from exc

    try:
        return application_repository.create(db, driver_id=driver_id, documents=saved)
    except Exception:
        _delete_saved_files(saved)
        raise


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


def approve_application(db: Session, *, application_id: uuid.UUID) -> Application:
    """REQ-3 AC2: approve a pending application.

    License/face-template generation happens in Phase 3.4/4 — this only
    flips the status. See docs/tasks.md for the follow-up dependency.
    """
    application = _get_pending_or_raise(db, application_id)
    return application_repository.update_status(
        db, application, status=ApplicationStatus.APPROVED, reason=None
    )


def reject_application(
    db: Session, *, application_id: uuid.UUID, reason: str
) -> Application:
    """REQ-3 AC3: reject a pending application with a required reason."""
    if not reason or not reason.strip():
        raise ApplicationError("A rejection reason is required")
    application = _get_pending_or_raise(db, application_id)
    return application_repository.update_status(
        db, application, status=ApplicationStatus.REJECTED, reason=reason.strip()
    )
