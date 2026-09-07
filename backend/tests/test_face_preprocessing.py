import numpy as np

from app.core.face_preprocessing import apply_clahe


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
