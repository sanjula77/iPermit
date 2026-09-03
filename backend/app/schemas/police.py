import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.fine import FineStatus
from app.models.license import LicenseStatus
from app.models.violation import ViolationType


class ViolationRead(BaseModel):
    id: uuid.UUID
    type: ViolationType
    points_deducted: int
    evidence_ref: str | None
    confirmed_at: datetime

    model_config = {"from_attributes": True}


class FineRead(BaseModel):
    id: uuid.UUID
    amount: int
    status: FineStatus
    created_at: datetime
    paid_at: datetime | None

    model_config = {"from_attributes": True}


class DriverSummary(BaseModel):
    """REQ-6 AC5: what an officer sees once a driver's identity is confirmed
    -- current points, license status, and violation history. license_no/
    license_status/points are None when the driver has no issued license yet."""

    driver_id: uuid.UUID
    email: str
    nic: str
    license_no: str | None
    license_status: LicenseStatus | None
    points: int | None
    violations: list[ViolationRead]


class FaceMatchCandidate(BaseModel):
    driver: DriverSummary
    similarity: float


class VerifyFaceResponse(BaseModel):
    """REQ-6 AC1/AC4: best FAISS match with a confidence score; the officer
    must manually confirm identity when requires_manual_confirmation is true
    -- this field is advisory only, the API never auto-confirms a match."""

    requires_manual_confirmation: bool
    best_match: FaceMatchCandidate | None
    candidates: list[FaceMatchCandidate]


class RecordViolationRequest(BaseModel):
    driver_id: uuid.UUID
    type: ViolationType
    evidence_ref: str | None = Field(default=None, max_length=512)


class RecordViolationResponse(BaseModel):
    violation: ViolationRead
    fine: FineRead
    driver_points: int
    license_status: LicenseStatus
