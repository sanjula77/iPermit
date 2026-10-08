from pydantic import BaseModel, Field

from app.core.behaviour import RiskLevel, Trend
from app.core.config import settings
from app.models.fine import FineStatus
from app.models.violation import ViolationType
from app.schemas.application import DriverSummary
from app.schemas.common import UtcDateTime


class BehaviourMetrics(BaseModel):
    risk_level: RiskLevel
    reasons: list[str]
    trend: Trend
    current_points: int
    suspension_threshold: int
    window_days: int
    window_points: int
    window_violations: int
    recent_points: int
    previous_points: int
    recent_violations: int
    days_since_last_violation: int | None
    projected_days_to_suspension: int | None
    oldest_leaves_window_at: UtcDateTime | None
    dominant_type: ViolationType | None
    prior_suspensions: int
    unpaid_fines: int
    # How long each violation's points count (see app.core.points).
    points_validity_days: int = Field(
        default_factory=lambda: settings.points_validity_days
    )

    model_config = {"from_attributes": True}


class BehaviourTimelineItem(BaseModel):
    type: ViolationType
    points: int
    confirmed_at: UtcDateTime
    # When this violation's points stop counting.
    points_expire_at: UtcDateTime
    fine_status: FineStatus | None


class BehaviourRead(BehaviourMetrics):
    tips: list[str]
    timeline: list[BehaviourTimelineItem]


class AdminBehaviourRead(BehaviourMetrics):
    driver: DriverSummary


class BehaviourSummary(BaseModel):
    high: int
    medium: int
    low: int
    worsening: int
    near_threshold: int


class MonthlyViolations(BaseModel):
    month: str  # "2026-09"
    count: int
    points: int


class AdminBehaviourOverview(BaseModel):
    summary: BehaviourSummary
    drivers: list[AdminBehaviourRead]
    monthly: list[MonthlyViolations]
    by_type: dict[str, int]
