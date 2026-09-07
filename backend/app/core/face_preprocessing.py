"""CLAHE contrast enhancement and enrollment-photo quality gating.

Both were ported and adapted (not copied verbatim) from a prior
face-recognition prototype after a full research pass -- see
docs/superpowers/plans/2026-09-07-face-recognition-enhancement.md.
Explicit 5-point landmark alignment from that prototype was deliberately
NOT ported: insightface's own FaceAnalysis.get() (used in face_engine.py)
already performs equivalent alignment internally as part of producing the
ArcFace embedding -- confirmed by the `insightface/utils/face_align.py`
deprecation warning already visible in this project's test output.

This module has zero dependency on face_engine.py by design, to avoid a
circular import (face_engine calls apply_clahe(); if this module needed
FaceDetection from face_engine, the import would cycle). Quality gating
therefore takes bbox/det_score as plain values, not a FaceDetection object.
"""

from dataclasses import dataclass, field

import cv2
import numpy as np

from app.core.config import settings


def apply_clahe(image: np.ndarray) -> np.ndarray:
    """Contrast-enhances the L channel of a BGR image in LAB space, before
    face detection. docs/design.md described this step from the start;
    it was never actually implemented until now (Phase 4 shipped without
    it)."""
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_channel)
    enhanced_lab = cv2.merge((l_enhanced, a_channel, b_channel))
    return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)


@dataclass
class QualityAssessment:
    sharpness: float
    brightness: float
    passes: bool
    reasons: list[str] = field(default_factory=list)


def assess_photo_quality(
    image: np.ndarray, *, bbox: tuple[float, float, float, float], det_score: float
) -> QualityAssessment:
    """REQ-2 AC2: rejects a face photo for blur, poor lighting, a
    too-small face, or low detection confidence. Every threshold below is
    a commonly-cited starting point, NOT independently validated on
    iPermit's own data -- same honesty pattern as
    settings.face_match_threshold; revisit once Task 9.1's evaluation
    harness has real data to test against."""
    x1, y1, x2, y2 = (int(v) for v in bbox)
    x1, y1 = max(0, x1), max(0, y1)
    face_crop = image[y1:y2, x1:x2]

    reasons: list[str] = []
    if det_score < settings.face_min_detection_score:
        reasons.append(
            f"low detection confidence ({det_score:.2f} < "
            f"{settings.face_min_detection_score})"
        )

    face_width, face_height = x2 - x1, y2 - y1
    if min(face_width, face_height) < settings.face_min_face_size_px:
        reasons.append(
            f"face too small ({min(face_width, face_height)}px < "
            f"{settings.face_min_face_size_px}px)"
        )

    if face_crop.size == 0:
        # Degenerate bbox -- treat as maximally blurry/dark rather than
        # crashing on an empty array below.
        sharpness, brightness = 0.0, 0.0
    else:
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(gray.mean())

    if sharpness < settings.face_min_sharpness:
        reasons.append(
            f"image too blurry (sharpness {sharpness:.1f} < {settings.face_min_sharpness})"
        )
    if not (settings.face_min_brightness <= brightness <= settings.face_max_brightness):
        reasons.append(
            f"poor lighting (brightness {brightness:.1f} outside "
            f"[{settings.face_min_brightness}, {settings.face_max_brightness}])"
        )

    return QualityAssessment(
        sharpness=sharpness, brightness=brightness, passes=not reasons, reasons=reasons
    )
