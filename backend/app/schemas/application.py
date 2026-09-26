import uuid

from pydantic import BaseModel, Field

from app.models.application import ApplicationStatus, DocumentType
from app.schemas.common import UtcDateTime


class ApplicationDocumentRead(BaseModel):
    id: uuid.UUID
    doc_type: DocumentType
    created_at: UtcDateTime

    model_config = {"from_attributes": True}


class DriverSummary(BaseModel):
    email: str
    nic: str

    model_config = {"from_attributes": True}


class ApplicationRead(BaseModel):
    id: uuid.UUID
    driver_id: uuid.UUID
    driver: DriverSummary
    status: ApplicationStatus
    reason: str | None
    created_at: UtcDateTime
    updated_at: UtcDateTime
    documents: list[ApplicationDocumentRead]

    model_config = {"from_attributes": True}


class RejectApplicationRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)
