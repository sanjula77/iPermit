import pytest

from app.models.badge import BadgeTier
from app.models.license import LicenseStatus
from app.services.badge_service import compute_safety_score, tier_for_score


def test_perfect_record_scores_100():
    score = compute_safety_score(
        current_points=0, violation_severity_sum=0, unpaid_fine_count=0, tenure_days=0
    )
    assert score == 100


def test_current_points_weighted_heavily():
    score = compute_safety_score(
        current_points=10, violation_severity_sum=0, unpaid_fine_count=0, tenure_days=0
    )
    assert score == 50  # 100 - 10*5


def test_lifetime_violation_severity_weighted_lightly():
    score = compute_safety_score(
        current_points=0, violation_severity_sum=10, unpaid_fine_count=0, tenure_days=0
    )
    assert score == 95  # 100 - 10*0.5


def test_unpaid_fines_weighted_heavily():
    score = compute_safety_score(
        current_points=0, violation_severity_sum=0, unpaid_fine_count=2, tenure_days=0
    )
    assert score == 90  # 100 - 2*5


def test_tenure_bonus_accrues_per_quarter():
    score = compute_safety_score(
        current_points=0, violation_severity_sum=0, unpaid_fine_count=0, tenure_days=180
    )
    assert score == 100  # clamped -- 100 + 2 bonus would exceed 100


def test_tenure_bonus_is_capped():
    score = compute_safety_score(
        current_points=20,  # drags score well below 100 so the cap is visible
        violation_severity_sum=0,
        unpaid_fine_count=0,
        tenure_days=100_000,  # far more than the 10-quarter cap
    )
    assert score == 10  # 100 - 100 + 10 (capped bonus)


def test_score_clamped_at_zero():
    score = compute_safety_score(
        current_points=100, violation_severity_sum=0, unpaid_fine_count=0, tenure_days=0
    )
    assert score == 0


@pytest.mark.parametrize(
    "score,expected_tier",
    [
        (100, BadgeTier.PLATINUM),
        (90, BadgeTier.PLATINUM),
        (89, BadgeTier.GOLD),
        (75, BadgeTier.GOLD),
        (74, BadgeTier.SILVER),
        (60, BadgeTier.SILVER),
        (59, BadgeTier.BRONZE),
        (40, BadgeTier.BRONZE),
        (39, BadgeTier.AT_RISK),
        (0, BadgeTier.AT_RISK),
    ],
)
def test_tier_thresholds(score, expected_tier):
    assert tier_for_score(score, LicenseStatus.ACTIVE) == expected_tier


def test_suspended_license_always_suspended_tier_regardless_of_score():
    assert tier_for_score(100, LicenseStatus.SUSPENDED) == BadgeTier.SUSPENDED
    assert tier_for_score(0, LicenseStatus.SUSPENDED) == BadgeTier.SUSPENDED
