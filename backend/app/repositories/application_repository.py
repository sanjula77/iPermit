import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.application import (
    Application,
    ApplicationDocument,
    ApplicationStatus,
    DocumentType,
)

_EAGER_LOAD = (selectinload(Application.documents), selectinload(Application.driver))


def create(
    db: Session, *, driver_id: uuid.UUID, documents: list[tuple[DocumentType, str]]
) -> Application:
    application = Application(driver_id=driver_id)
    application.documents = [
        ApplicationDocument(doc_type=doc_type, file_path=file_path)
        for doc_type, file_path in documents
    ]
    db.add(application)
    db.commit()
    db.refresh(application)
    return get_by_id(db, application.id)  # reload with driver/documents eager-loaded


def get_by_id(db: Session, application_id: uuid.UUID) -> Application | None:
    stmt = (
        select(Application)
        .where(Application.id == application_id)
        .options(*_EAGER_LOAD)
    )
    return db.scalar(stmt)


def list_by_driver(db: Session, driver_id: uuid.UUID) -> list[Application]:
    stmt = (
        select(Application)
        .where(Application.driver_id == driver_id)
        .options(*_EAGER_LOAD)
        .order_by(Application.created_at.desc())
    )
    return list(db.scalars(stmt))


def list_all(
    db: Session, *, status: ApplicationStatus | None = None
) -> list[Application]:
    stmt = select(Application).options(*_EAGER_LOAD)
    if status is not None:
        stmt = stmt.where(Application.status == status)
    stmt = stmt.order_by(Application.created_at.desc())
    return list(db.scalars(stmt))


def set_status(
    application: Application, *, status: ApplicationStatus, reason: str | None
) -> None:
    """Mutates in-memory only -- no commit. Use when the status change must
    commit atomically with another write (see
    application_service.approve_application, which also issues a License in
    the same transaction). For a standalone status change, use update_status."""
    application.status = status
    application.reason = reason


def update_status(
    db: Session,
    application: Application,
    *,
    status: ApplicationStatus,
    reason: str | None,
) -> Application:
    set_status(application, status=status, reason=reason)
    db.commit()
    db.refresh(application)
    return application
