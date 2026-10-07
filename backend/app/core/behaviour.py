"""Rule-based driver behaviour analysis over a driver's violation history.

A deliberately simple, explainable indicator -- not a trained or validated
predictive model (there is no historical Sri Lankan driver data to train or
validate one on). Pure functions with no I/O, so every rule is unit-testable
from synthetic inputs, the same pattern as badge_service.compute_safety_score.

Every window length and threshold below is a starting point drawn from how
demerit-point schemes are commonly built (rolling windows of 2-3 years; Sri
Lanka's pilot uses two), NOT a measured constant -- revisit once the official
scheme is final and there is real data to check the rules against.
"""

import enum
import math
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.models.violation import ViolationType

# Sri Lanka's demerit pilot (from 2026-10-01) counts points over two years.
WINDOW_DAYS = 730
# "Recent" behaviour and the period it is compared against.
RECENT_DAYS = 90
# Share of the suspension threshold at which a driver counts as near it.
HIGH_POINTS_RATIO = 0.7
MEDIUM_POINTS_RATIO = 0.4
# Fewer violations than this in the window and no trend is claimed.
MIN_VIOLATIONS_FOR_TREND = 2


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Trend(str, enum.Enum):
    IMPROVING = "IMPROVING"
    STEADY = "STEADY"
    WORSENING = "WORSENING"
    NOT_ENOUGH_DATA = "NOT_ENOUGH_DATA"


RISK_ORDER = {RiskLevel.HIGH: 0, RiskLevel.MEDIUM: 1, RiskLevel.LOW: 2}

_TYPE_TIP = {
    ViolationType.SPEEDING: (
        "Most of your points come from speeding. Keep to the posted limit, "
        "especially on open roads."
    ),
    ViolationType.WHITE_LINE: (
        "Most of your points come from crossing white lines. Stay within your "
        "lane and avoid overtaking over a solid line."
    ),
    ViolationType.RED_LIGHT: (
        "Most of your points come from red lights. Slow down early at signals "
        "and do not enter on amber."
    ),
    ViolationType.DRUNK_DRIVING: (
        "Never drive after drinking. Arrange another way home in advance."
    ),
}


@dataclass(frozen=True)
class ViolationFact:
    type: ViolationType
    points: int
    confirmed_at: datetime


@dataclass
class BehaviourAnalysis:
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
    oldest_leaves_window_at: datetime | None
    dominant_type: ViolationType | None
    prior_suspensions: int
    unpaid_fines: int
    tips: list[str] = field(default_factory=list)


def _points_between(
    facts: list[ViolationFact], start: datetime, end: datetime
) -> tuple[int, int]:
    """(points, count) for violations with start < confirmed_at <= end."""
    in_range = [f for f in facts if start < f.confirmed_at <= end]
    return sum(f.points for f in in_range), len(in_range)


def _dominant_type(facts: list[ViolationFact]) -> ViolationType | None:
    if not facts:
        return None
    points_by_type: Counter[ViolationType] = Counter()
    latest_by_type: dict[ViolationType, datetime] = {}
    for fact in facts:
        points_by_type[fact.type] += fact.points
        latest_by_type[fact.type] = max(
            latest_by_type.get(fact.type, fact.confirmed_at), fact.confirmed_at
        )
    # Most points wins; ties go to the type seen most recently.
    return max(points_by_type, key=lambda t: (points_by_type[t], latest_by_type[t]))


def analyse(
    violations: list[ViolationFact],
    *,
    current_points: int,
    suspension_threshold: int,
    license_suspended: bool,
    prior_suspensions: int,
    unpaid_fines: int,
    now: datetime,
) -> BehaviourAnalysis:
    """`violations` must already exclude any whose fine was reversed on appeal
    (the violation was found wrong, so it is not part of the driver's
    behaviour). `now` is naive UTC, matching how timestamps are stored."""
    window_start = now - timedelta(days=WINDOW_DAYS)
    recent_start = now - timedelta(days=RECENT_DAYS)
    previous_start = now - timedelta(days=2 * RECENT_DAYS)

    in_window = [v for v in violations if v.confirmed_at > window_start]
    window_points, window_count = _points_between(violations, window_start, now)
    recent_points, recent_count = _points_between(violations, recent_start, now)
    previous_points, _ = _points_between(violations, previous_start, recent_start)

    if window_count < MIN_VIOLATIONS_FOR_TREND:
        trend = Trend.NOT_ENOUGH_DATA
    elif recent_points > previous_points:
        trend = Trend.WORSENING
    elif recent_points < previous_points:
        trend = Trend.IMPROVING
    else:
        trend = Trend.STEADY

    days_since_last = None
    oldest_leaves = None
    if in_window:
        latest = max(f.confirmed_at for f in in_window)
        days_since_last = max(0, (now - latest).days)
        oldest_leaves = min(f.confirmed_at for f in in_window) + timedelta(
            days=WINDOW_DAYS
        )

    projected_days = None
    rate_per_day = recent_points / RECENT_DAYS
    remaining = suspension_threshold - current_points
    if not license_suspended and rate_per_day > 0 and remaining > 0:
        projected_days = math.ceil(remaining / rate_per_day)

    high_points = math.ceil(HIGH_POINTS_RATIO * suspension_threshold)
    medium_points = math.ceil(MEDIUM_POINTS_RATIO * suspension_threshold)
    drunk_in_window = any(f.type == ViolationType.DRUNK_DRIVING for f in in_window)

    high_reasons: list[str] = []
    if license_suspended:
        high_reasons.append("Licence is currently suspended")
    if drunk_in_window:
        high_reasons.append("Drink-driving violation in the last 24 months")
    if recent_count >= 2:
        high_reasons.append(f"{recent_count} violations in the last {RECENT_DAYS} days")
    if current_points >= high_points:
        high_reasons.append(
            f"{current_points} of {suspension_threshold} points, close to suspension"
        )

    medium_reasons: list[str] = []
    if recent_count == 1:
        medium_reasons.append(f"1 violation in the last {RECENT_DAYS} days")
    if window_count >= 2:
        medium_reasons.append("Repeat violations in the last 24 months")
    if prior_suspensions >= 1:
        medium_reasons.append("Licence has been suspended before")
    if trend == Trend.WORSENING:
        medium_reasons.append("Violations are increasing compared with before")
    if current_points >= medium_points and current_points < high_points:
        medium_reasons.append(f"{current_points} of {suspension_threshold} points")

    if high_reasons:
        risk, reasons = RiskLevel.HIGH, high_reasons + medium_reasons
    elif medium_reasons:
        risk, reasons = RiskLevel.MEDIUM, medium_reasons
    elif window_count == 0:
        risk, reasons = RiskLevel.LOW, ["No violations in the last 24 months"]
    else:
        risk, reasons = RiskLevel.LOW, [f"No violations in the last {RECENT_DAYS} days"]

    dominant = _dominant_type(in_window)
    tips: list[str] = []
    if dominant is not None:
        tips.append(_TYPE_TIP[dominant])
    if unpaid_fines > 0:
        tips.append("Pay any unpaid fines: paying a fine restores its points.")
    if risk == RiskLevel.HIGH:
        tips.append("Another violation could lead to suspension. Drive carefully.")
    if not tips:
        tips.append("Keep it up. A clean record keeps your standing high.")

    return BehaviourAnalysis(
        risk_level=risk,
        reasons=reasons,
        trend=trend,
        current_points=current_points,
        suspension_threshold=suspension_threshold,
        window_days=WINDOW_DAYS,
        window_points=window_points,
        window_violations=window_count,
        recent_points=recent_points,
        previous_points=previous_points,
        recent_violations=recent_count,
        days_since_last_violation=days_since_last,
        projected_days_to_suspension=projected_days,
        oldest_leaves_window_at=oldest_leaves,
        dominant_type=dominant,
        prior_suspensions=prior_suspensions,
        unpaid_fines=unpaid_fines,
        tips=tips,
    )
