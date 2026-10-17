import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.license import LicenseStatus
from app.models.violation import (
    OTHER_DESCRIPTION_MAX_LENGTH,
    OTHER_DESCRIPTION_MIN_LENGTH,
    OTHER_MAX_POINTS,
    OTHER_MIN_POINTS,
    ViolationType,
)
from app.schemas.common import UtcDateTime
from app.schemas.fine import FineRead
from app.schemas.license import LicenseCategoryRead
from app.schemas.violation import ViolationRead


class DriverSummary(BaseModel):
    """REQ-6 AC5: what an officer sees once a driver's identity is confirmed
    -- current points, license status, and violation history. license_no/
    license_status/points are None when the driver has no issued license yet."""

    driver_id: uuid.UUID
    email: str
    nic: str
    license_no: str | None
    license_status: LicenseStatus | None
    # What the driver may drive; empty when there is no licence yet.
    categories: list[LicenseCategoryRead] = []
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
    # Only for type OTHER: what the officer saw, and the points (1-5).
    description: str | None = Field(
        default=None, max_length=OTHER_DESCRIPTION_MAX_LENGTH
    )
    points: int | None = Field(default=None, ge=OTHER_MIN_POINTS, le=OTHER_MAX_POINTS)
    # Set by the officer's app so a retried upload cannot create a second violation
    # and fine, and so a violation recorded offline keeps the time it happened.
    client_id: uuid.UUID | None = None
    occurred_at: datetime | None = None

    @model_validator(mode="after")
    def _other_needs_details(self):
        if self.type == ViolationType.OTHER:
            if len((self.description or "").strip()) < OTHER_DESCRIPTION_MIN_LENGTH:
                raise ValueError(
                    "Describe the violation (at least "
                    f"{OTHER_DESCRIPTION_MIN_LENGTH} characters)."
                )
            if self.points is None:
                raise ValueError("Points are required for an other violation.")
        elif self.description is not None or self.points is not None:
            raise ValueError("Description and points are only for an other violation.")
        return self


class RecordViolationResponse(BaseModel):
    violation: ViolationRead
    fine: FineRead
    driver_points: int
    license_status: LicenseStatus


class RecentViolation(BaseModel):
    id: uuid.UUID
    type: ViolationType
    description: str | None = None
    points_deducted: int
    confirmed_at: UtcDateTime
    driver_email: str
    driver_nic: str
    fine_amount: int | None


class OfficerSummary(BaseModel):
    """Police Home: the signed-in officer's own recording activity."""

    recorded_today: int
    recorded_this_week: int
    recorded_total: int
    recent: list[RecentViolation]
