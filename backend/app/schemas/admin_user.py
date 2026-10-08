import uuid

from pydantic import BaseModel, field_validator

from app.core.behaviour import RiskLevel
from app.models.application import ApplicationStatus
from app.models.badge import BadgeTier
from app.models.fine import FineStatus
from app.models.license import LicenseStatus
from app.models.user import UserRole
from app.models.violation import ViolationType
from app.schemas.common import UtcDateTime
from app.schemas.license import LicenseCategoryRead, sort_categories


class AdminUserListItem(BaseModel):
    id: uuid.UUID
    email: str
    nic: str
    role: UserRole
    created_at: UtcDateTime
    license_status: LicenseStatus | None
    points: int | None
    latest_application_status: ApplicationStatus | None
    # Violations recorded against a driver, or recorded by an officer.
    violation_count: int


class AdminLicenseSummary(BaseModel):
    id: uuid.UUID
    license_no: str
    status: LicenseStatus
    points: int
    issued_at: UtcDateTime
    expiry_at: UtcDateTime
    categories: list[LicenseCategoryRead] = []

    model_config = {"from_attributes": True}

    @field_validator("categories", mode="before")
    @classmethod
    def _in_card_order(cls, value):
        return sort_categories(list(value))


class AdminBadgeSummary(BaseModel):
    tier: BadgeTier
    safety_score: int


class AdminApplicationSummary(BaseModel):
    id: uuid.UUID
    status: ApplicationStatus
    created_at: UtcDateTime
    document_count: int


class AdminViolationItem(BaseModel):
    type: ViolationType
    points_deducted: int
    confirmed_at: UtcDateTime
    fine_status: FineStatus | None = None
    driver_email: str | None = None


class AdminUserDetail(BaseModel):
    id: uuid.UUID
    email: str
    nic: str
    role: UserRole
    created_at: UtcDateTime
    license: AdminLicenseSummary | None
    badge: AdminBadgeSummary | None
    behaviour_risk: RiskLevel | None
    applications: list[AdminApplicationSummary]
    violations: list[AdminViolationItem]
    violation_count: int
    can_delete: bool
    delete_blockers: list[str]
