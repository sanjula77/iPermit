import enum
import uuid

from pydantic import BaseModel, Field

from app.models.appeal import AppealStatus
from app.schemas.application import DriverSummary
from app.schemas.common import UtcDateTime
from app.schemas.fine import FineWithViolationRead


class AppealResolution(str, enum.Enum):
    """Only these two are valid outcomes an admin can choose -- PENDING is
    the initial state, not something an admin resolves an appeal *to*."""

    UPHELD = "UPHELD"
    OVERTURNED = "OVERTURNED"


class AppealRead(BaseModel):
    id: uuid.UUID
    driver: DriverSummary
    fine: FineWithViolationRead
    reason: str
    status: AppealStatus
    created_at: UtcDateTime
    resolved_at: UtcDateTime | None

    model_config = {"from_attributes": True}


class SubmitAppealRequest(BaseModel):
    fine_id: uuid.UUID
    reason: str = Field(min_length=1, max_length=1000)


class ResolveAppealRequest(BaseModel):
    resolution: AppealResolution
