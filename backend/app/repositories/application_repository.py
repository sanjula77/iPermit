import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.application import Application, ApplicationDocument, DocumentType


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
    return application


def get_by_id(db: Session, application_id: uuid.UUID) -> Application | None:
    stmt = (
        select(Application)
        .where(Application.id == application_id)
        .options(selectinload(Application.documents))
    )
    return db.scalar(stmt)


def list_by_driver(db: Session, driver_id: uuid.UUID) -> list[Application]:
    stmt = (
        select(Application)
        .where(Application.driver_id == driver_id)
        .options(selectinload(Application.documents))
        .order_by(Application.created_at.desc())
    )
    return list(db.scalars(stmt))
