from pydantic import BaseModel

from app.models.badge import BadgeTier
from app.schemas.application import DriverSummary
from app.schemas.common import UtcDateTime


class BadgeRead(BaseModel):
    tier: BadgeTier
    safety_score: int
    updated_at: UtcDateTime

    model_config = {"from_attributes": True}


class AdminBadgeRead(BaseModel):
    driver: DriverSummary
    tier: BadgeTier
    safety_score: int
    updated_at: UtcDateTime

    model_config = {"from_attributes": True}


class BadgeDistributionResponse(BaseModel):
    distribution: dict[str, int]
    attention_queue: list[AdminBadgeRead]
