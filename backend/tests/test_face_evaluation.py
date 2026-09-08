import pytest

from app.core.face_evaluation import compute_far_frr, find_equal_error_rate, sweep_thresholds


def test_compute_far_frr_perfect_separation():
    genuine = [0.9, 0.95, 0.92]
    impostor = [0.1, 0.05, 0.15]

    metrics = compute_far_frr(genuine, impostor, threshold=0.5)

    assert metrics.far == 0.0
    assert metrics.frr == 0.0


def test_compute_far_frr_counts_errors_correctly():
    genuine = [0.9, 0.3, 0.8]  # 0.3 is wrongly rejected at threshold 0.5
    impostor = [0.1, 0.6, 0.2]  # 0.6 is wrongly accepted at threshold 0.5

    metrics = compute_far_frr(genuine, impostor, threshold=0.5)

    assert metrics.frr == pytest.approx(1 / 3)
    assert metrics.far == pytest.approx(1 / 3)


def test_compute_far_frr_rejects_empty_input():
    with pytest.raises(ValueError):
        compute_far_frr([], [0.1], threshold=0.5)
    with pytest.raises(ValueError):
        compute_far_frr([0.9], [], threshold=0.5)


def test_sweep_thresholds_covers_full_range():
    sweep = sweep_thresholds([0.9], [0.1], steps=10)

    assert len(sweep) == 11
    assert sweep[0].threshold == 0.0
    assert sweep[-1].threshold == 1.0


def test_find_equal_error_rate_on_separable_distributions():
    genuine = [0.8, 0.85, 0.9, 0.82, 0.88]
    impostor = [0.1, 0.15, 0.2, 0.12, 0.18]

    eer_point = find_equal_error_rate(genuine, impostor, steps=100)

    assert eer_point.far == pytest.approx(0.0, abs=0.01)
    assert eer_point.frr == pytest.approx(0.0, abs=0.01)
    assert 0.2 < eer_point.threshold < 0.8


def test_find_equal_error_rate_on_overlapping_distributions():
    genuine = [0.5, 0.6, 0.4, 0.55, 0.45]
    impostor = [0.5, 0.4, 0.6, 0.45, 0.55]

    eer_point = find_equal_error_rate(genuine, impostor, steps=100)

    assert eer_point.far == pytest.approx(eer_point.frr, abs=0.2)
    assert eer_point.far > 0.3
