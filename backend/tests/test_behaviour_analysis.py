from datetime import datetime, timedelta

from app.core.behaviour import (
    RECENT_DAYS,
    WINDOW_DAYS,
    RiskLevel,
    Trend,
    ViolationFact,
    analyse,
)
from app.models.violation import ViolationType

NOW = datetime(2026, 10, 1, 12, 0, 0)
THRESHOLD = 10


def _v(days_ago: float, vtype=ViolationType.SPEEDING, points=4) -> ViolationFact:
    return ViolationFact(
        type=vtype, points=points, confirmed_at=NOW - timedelta(days=days_ago)
    )


def _analyse(violations, **overrides):
    params = dict(
        current_points=sum(v.points for v in violations),
        suspension_threshold=THRESHOLD,
        license_suspended=False,
        prior_suspensions=0,
        unpaid_fines=0,
        now=NOW,
    )
    params.update(overrides)
    return analyse(violations, **params)


def test_no_history_is_low_risk_with_no_trend():
    result = _analyse([])

    assert result.risk_level == RiskLevel.LOW
    assert result.trend == Trend.NOT_ENOUGH_DATA
    assert result.window_points == 0
    assert result.days_since_last_violation is None
    assert result.projected_days_to_suspension is None
    assert result.oldest_leaves_window_at is None
    assert result.dominant_type is None
    assert result.reasons == ["No violations in the last 24 months"]


def test_old_single_violation_is_low_risk():
    result = _analyse([_v(400, points=3)], current_points=0)

    assert result.risk_level == RiskLevel.LOW
    assert result.window_violations == 1
    assert result.trend == Trend.NOT_ENOUGH_DATA
    assert result.days_since_last_violation == 400


def test_violation_outside_window_is_ignored():
    result = _analyse([_v(WINDOW_DAYS + 1)], current_points=0)

    assert result.window_violations == 0
    assert result.window_points == 0
    assert result.risk_level == RiskLevel.LOW


def test_violation_exactly_on_window_edge_is_excluded():
    result = _analyse([_v(WINDOW_DAYS)], current_points=0)

    assert result.window_violations == 0


def test_one_recent_violation_is_medium():
    result = _analyse([_v(10, points=3)], current_points=3)

    assert result.risk_level == RiskLevel.MEDIUM
    assert "1 violation in the last 90 days" in result.reasons
    assert result.recent_violations == 1


def test_two_recent_violations_is_high():
    result = _analyse([_v(10, points=3), _v(40, points=3)], current_points=6)

    assert result.risk_level == RiskLevel.HIGH
    assert "2 violations in the last 90 days" in result.reasons


def test_points_near_threshold_is_high_even_without_recent_violations():
    result = _analyse([_v(300, points=4), _v(350, points=4)], current_points=8)

    assert result.risk_level == RiskLevel.HIGH
    assert any("close to suspension" in r for r in result.reasons)


def test_suspended_license_is_high():
    result = _analyse([_v(5, points=10)], current_points=10, license_suspended=True)

    assert result.risk_level == RiskLevel.HIGH
    assert "Licence is currently suspended" in result.reasons
    assert result.projected_days_to_suspension is None


def test_drink_driving_in_window_is_high():
    result = _analyse(
        [_v(200, ViolationType.DRUNK_DRIVING, points=10)], current_points=0
    )

    assert result.risk_level == RiskLevel.HIGH
    assert result.dominant_type == ViolationType.DRUNK_DRIVING


def test_prior_suspension_alone_is_medium():
    result = _analyse([], prior_suspensions=1, current_points=0)

    assert result.risk_level == RiskLevel.MEDIUM
    assert "Licence has been suspended before" in result.reasons


def test_trend_worsening_when_recent_points_exceed_previous():
    result = _analyse(
        [_v(20, points=4), _v(150, points=3), _v(300, points=3)], current_points=4
    )

    assert result.recent_points == 4
    assert result.previous_points == 3
    assert result.trend == Trend.WORSENING


def test_trend_improving_when_recent_points_fall():
    result = _analyse(
        [_v(120, points=4), _v(150, points=4), _v(300, points=3)], current_points=0
    )

    assert result.recent_points == 0
    assert result.previous_points == 8
    assert result.trend == Trend.IMPROVING


def test_trend_steady_when_equal():
    result = _analyse([_v(20, points=3), _v(120, points=3)], current_points=0)

    assert result.trend == Trend.STEADY


def test_projection_uses_recent_rate():
    # 4 points in the last 90 days -> 4/90 per day; 6 points remaining.
    result = _analyse([_v(10, points=4)], current_points=4)

    assert result.projected_days_to_suspension == 135  # ceil(6 / (4/90))


def test_no_projection_without_recent_points():
    result = _analyse([_v(200, points=4)], current_points=4)

    assert result.projected_days_to_suspension is None


def test_oldest_violation_leaves_window_date():
    result = _analyse([_v(10), _v(300)], current_points=8)

    assert result.oldest_leaves_window_at == NOW - timedelta(days=300) + timedelta(
        days=WINDOW_DAYS
    )


def test_dominant_type_is_the_one_with_most_points():
    result = _analyse(
        [
            _v(10, ViolationType.WHITE_LINE, points=3),
            _v(20, ViolationType.SPEEDING, points=4),
            _v(30, ViolationType.SPEEDING, points=4),
        ]
    )

    assert result.dominant_type == ViolationType.SPEEDING
    assert any("speeding" in tip for tip in result.tips)


def test_dominant_type_tie_goes_to_most_recent():
    result = _analyse(
        [
            _v(10, ViolationType.WHITE_LINE, points=3),
            _v(50, ViolationType.RED_LIGHT, points=3),
        ]
    )

    assert result.dominant_type == ViolationType.WHITE_LINE


def test_unpaid_fines_add_a_tip():
    result = _analyse([_v(10)], unpaid_fines=1)

    assert any("unpaid fines" in tip for tip in result.tips)


def test_recent_constant_is_ninety_days():
    assert RECENT_DAYS == 90
