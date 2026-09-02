import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.application import ApplicationStatus, DocumentType


class ApplicationDocumentRead(BaseModel):
    id: uuid.UUID
    doc_type: DocumentType
    created_at: datetime

    model_config = {"from_attributes": True}


class ApplicationRead(BaseModel):
    id: uuid.UUID
    driver_id: uuid.UUID
    status: ApplicationStatus
    reason: str | None
    created_at: datetime
    updated_at: datetime
    documents: list[ApplicationDocumentRead]

    model_config = {"from_attributes": True}
