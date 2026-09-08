import numpy as np

from app.core.face_preprocessing import apply_clahe, assess_photo_quality


def test_apply_clahe_increases_low_contrast_image_variance():
    low_contrast = np.full((200, 200, 3), 128, dtype=np.uint8)
    low_contrast[80:120, 80:120] = 135  # a faint, low-contrast square

    enhanced = apply_clahe(low_contrast)

    assert enhanced.shape == low_contrast.shape
    assert enhanced.dtype == low_contrast.dtype
    assert enhanced.std() > low_contrast.std()


def test_apply_clahe_preserves_a_uniform_image():
    uniform = np.full((100, 100, 3), 50, dtype=np.uint8)

    enhanced = apply_clahe(uniform)

    assert enhanced.shape == uniform.shape
    assert enhanced.dtype == uniform.dtype


def _checkerboard(size: int, dark: int, light: int, block: int = 10) -> np.ndarray:
    """A synthetic high-frequency pattern (sharp edges -> high Laplacian
    variance) at a controllable brightness level, so tests can isolate
    "blurry" vs "poor lighting" independently of each other."""
    img = np.zeros((size, size, 3), dtype=np.uint8)
    for i in range(0, size, block):
        for j in range(0, size, block):
            value = light if (i // block + j // block) % 2 == 0 else dark
            img[i : i + block, j : j + block] = value
    return img


def test_assess_photo_quality_passes_a_sharp_well_lit_adequately_sized_face():
    image = _checkerboard(size=120, dark=60, light=200)

    result = assess_photo_quality(image, bbox=(0, 0, 120, 120), det_score=0.95)

    assert result.passes is True
    assert result.reasons == []


def test_assess_photo_quality_rejects_low_detection_confidence():
    image = _checkerboard(size=120, dark=60, light=200)

    result = assess_photo_quality(image, bbox=(0, 0, 120, 120), det_score=0.5)

    assert result.passes is False
    assert any("detection confidence" in reason for reason in result.reasons)


def test_assess_photo_quality_rejects_a_too_small_face():
    image = _checkerboard(size=120, dark=60, light=200)

    result = assess_photo_quality(image, bbox=(0, 0, 60, 60), det_score=0.95)

    assert result.passes is False
    assert any("too small" in reason for reason in result.reasons)


def test_assess_photo_quality_rejects_a_blurry_face():
    # A flat, uniform-color crop has zero edge content -> zero Laplacian
    # variance, i.e. maximally "blurry" by this heuristic.
    image = np.full((120, 120, 3), 128, dtype=np.uint8)

    result = assess_photo_quality(image, bbox=(0, 0, 120, 120), det_score=0.95)

    assert result.passes is False
    assert any("blurry" in reason for reason in result.reasons)


def test_assess_photo_quality_rejects_poor_lighting():
    # Sharp edges (passes the blur check) but shifted dark enough that
    # mean brightness falls below face_min_brightness.
    image = _checkerboard(size=120, dark=0, light=20)

    result = assess_photo_quality(image, bbox=(0, 0, 120, 120), det_score=0.95)

    assert result.passes is False
    assert any("lighting" in reason for reason in result.reasons)
