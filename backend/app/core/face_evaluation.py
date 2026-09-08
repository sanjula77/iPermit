"""FAR/FRR/EER computation for REQ-5's face-match threshold, per
docs/tasks.md Task 9.1. Pure functions over precomputed cosine-similarity
scores -- no I/O, fully unit-testable with synthetic distributions before
any real evaluation dataset exists. Neither prior face-recognition
prototype analyzed for this project had equivalent open-set verification
metrics (both only computed closed-set classification accuracy/F1), so
this is new, not ported."""

from dataclasses import dataclass


@dataclass
class ThresholdMetrics:
    threshold: float
    far: float  # false accept rate: fraction of impostor pairs scored >= threshold
    frr: float  # false reject rate: fraction of genuine pairs scored < threshold


def compute_far_frr(
    genuine_scores: list[float], impostor_scores: list[float], threshold: float
) -> ThresholdMetrics:
    if not genuine_scores or not impostor_scores:
        raise ValueError("Both genuine_scores and impostor_scores must be non-empty")
    false_rejects = sum(1 for s in genuine_scores if s < threshold)
    false_accepts = sum(1 for s in impostor_scores if s >= threshold)
    return ThresholdMetrics(
        threshold=threshold,
        far=false_accepts / len(impostor_scores),
        frr=false_rejects / len(genuine_scores),
    )


def sweep_thresholds(
    genuine_scores: list[float], impostor_scores: list[float], steps: int = 100
) -> list[ThresholdMetrics]:
    return [
        compute_far_frr(genuine_scores, impostor_scores, i / steps) for i in range(steps + 1)
    ]


def find_equal_error_rate(
    genuine_scores: list[float], impostor_scores: list[float], steps: int = 1000
) -> ThresholdMetrics:
    """Returns the ThresholdMetrics whose FAR and FRR are closest together
    -- the standard Equal Error Rate operating point."""
    sweep = sweep_thresholds(genuine_scores, impostor_scores, steps)
    return min(sweep, key=lambda m: abs(m.far - m.frr))
