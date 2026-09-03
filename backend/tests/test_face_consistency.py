import numpy as np
import pytest

from app.services.face_service import FaceEnrollmentError, check_pairwise_consistency


def _unit_vector(seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    v = rng.normal(size=512).astype(np.float32)
    return v / np.linalg.norm(v)


def test_identical_embeddings_are_consistent():
    v = _unit_vector(1)
    check_pairwise_consistency([v, v, v, v], threshold=0.42)  # must not raise


def test_nearly_identical_embeddings_pass_threshold():
    base = _unit_vector(2)
    # Small perturbation, then re-normalize -- simulates natural variation
    # across 4 real photos of the same person.
    noisy = base + np.random.default_rng(3).normal(scale=0.05, size=512).astype(
        np.float32
    )
    noisy = noisy / np.linalg.norm(noisy)
    check_pairwise_consistency(
        [base, base, base, noisy], threshold=0.42
    )  # must not raise


def test_orthogonal_embeddings_are_rejected():
    a = np.zeros(512, dtype=np.float32)
    a[0] = 1.0
    b = np.zeros(512, dtype=np.float32)
    b[1] = 1.0  # cosine similarity 0.0 -- clearly different "identities"

    with pytest.raises(
        FaceEnrollmentError, match="do not consistently show the same face"
    ):
        check_pairwise_consistency([a, a, a, b], threshold=0.42)


def test_opposite_embeddings_are_rejected():
    a = _unit_vector(4)
    b = -a  # cosine similarity -1.0

    with pytest.raises(FaceEnrollmentError):
        check_pairwise_consistency([a, b], threshold=0.42)


def test_threshold_is_respected_at_the_boundary():
    a = np.zeros(512, dtype=np.float32)
    a[0] = 1.0
    b = np.zeros(512, dtype=np.float32)
    # Construct b at a known angle from a: cos(60deg) = 0.5
    b[0] = 0.5
    b[1] = (1 - 0.5**2) ** 0.5

    check_pairwise_consistency([a, b], threshold=0.4)  # 0.5 >= 0.4, passes
    with pytest.raises(FaceEnrollmentError):
        check_pairwise_consistency([a, b], threshold=0.6)  # 0.5 < 0.6, fails
