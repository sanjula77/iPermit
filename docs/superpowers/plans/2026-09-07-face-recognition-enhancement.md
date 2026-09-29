# Face Recognition Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close two concrete, evidence-backed gaps in iPermit's existing Phase 4 face recognition module (CLAHE preprocessing that `docs/design.md` already claims exists but doesn't; enrollment-photo quality gating that `docs/requirements.md` REQ-2 AC2 explicitly defers to this module) and build the FAR/FRR/EER evaluation harness `docs/tasks.md` Task 9.1 needs — all informed by a full analysis of the user's two prior face-recognition prototypes, added to this repo under `face/`.

**Architecture:** Two new pure-function modules (`face_preprocessing.py` for CLAHE + quality scoring, `face_evaluation.py` for FAR/FRR/EER math) slot into the existing `face_engine.py` → `face_service.py` → `application_service.py` layering with no restructuring. Quality gating moves enrollment-photo rejection from approval-time (today) to submission-time, per REQ-2 AC2's "before accepting the application" wording.

**Tech Stack:** Same as the rest of the backend — Python, OpenCV (`cv2`), NumPy, pytest. No new dependencies.

**Spec:** This document's own "Research Summary" section below (no separate spec file — the brainstorming skill's bounded-path was used for scope classification, not a full architectural spec, since this extends an already-running, already-tested module rather than introducing a new subsystem).

## Global Constraints

- Every new numeric threshold (detection confidence, face size, sharpness, brightness) must be a named `Settings` field in `backend/app/core/config.py` with a docstring/comment stating it is a **commonly-cited starting point, not independently validated on iPermit's own data** — the exact honesty pattern already established for `face_match_threshold` (config.py:33) and `road_incident_expiry_hours`. Never hardcode a threshold inline in a function body.
- No new third-party dependencies. `cv2`/`numpy` are already in `backend/requirements.txt`; the evaluation harness uses only the standard library plus those two.
- Every new pure function (no I/O) gets synthetic-data unit tests with no real ONNX model or fixture image required to run — same pattern as `face_service.check_pairwise_consistency` (tested in `tests/test_face_consistency.py`).
- Do not change `settings.face_match_threshold`'s value (0.42) in this plan. Neither prior project's threshold (0.6, 0.7) is any better validated than iPermit's own — see Research Summary. Threshold re-tuning is explicitly out of scope until Task 9.1's harness has real data to run against.
- Follow existing exception conventions: `FaceEngineError` for infrastructure/model failures, `FaceEnrollmentError` for expected business-rule rejections (both already defined in `face_engine.py` / `face_service.py`).

---

## Research Summary

Two prior projects were added under `/data/iPermit/face/` and fully analyzed (see the full research transcript for exhaustive detail; condensed here):

- **`facial-recognition-system`** (5 commits, single-author) is the traced source of `docs/requirements.md`'s cited "100% train / 60% test accuracy on a 6-person/68-image dataset" overfitting finding — confirmed by reading `Facial_Recognition_Research_Paper.md` in full. Its shipped pipeline uses **Haar cascade detection + 130-dim grayscale HOG-like features + linear SVM** (a completely different, cruder pipeline than the ArcFace approach its own paper/README describe — the "real" ArcFace path exists as code but its output artifacts were never committed). It is a **closed-set classifier** hardcoded to 6 fixed identities — cannot express "unknown person" at all. **Nothing here is reusable for iPermit** beyond the cautionary lesson already captured in requirements.md.
- **`face-recognition-pipeline`** (34 commits, longer/messier history) uses real InsightFace `buffalo_l` detection + 512-d ArcFace embeddings, with both a closed-set classifier path and an open-set one-shot matching path (`src/one_shot_recognition/`). Its matching is **brute-force NumPy** (`np.argsort` over a flat `.npy` file) — no FAISS, no ANN index at all, confirming iPermit's FAISS choice is already a strict improvement, not something to reconsider. Its similarity threshold (0.6, repeated as a hardcoded default in multiple files) has **no FAR/FRR/EER validation behind it** — no better-sourced than iPermit's own 0.42. Neither project has any liveness/anti-spoofing code, any dataset actually checked into the repo, or any FAR/FRR/EER evaluation code (both projects' "evaluation" is closed-set accuracy/F1/confusion-matrix, the wrong shape for an open-set cosine-matching system like iPermit's).

**Two genuinely portable, concrete gaps were identified** (detailed in the Tasks below):
1. `face-recognition-pipeline/src/preprocessing/detect_align.py` applies **CLAHE contrast enhancement** (LAB L-channel, clip=2.0, tile=8×8) before detection. iPermit's `docs/design.md` line 163 already describes the pipeline as "RetinaFace detection → **CLAHE preprocessing** → ArcFace embedding," but `backend/app/core/face_engine.py` has never actually implemented it — a real design-vs-implementation gap, now being closed.
2. `face-recognition-pipeline/src/preprocessing/face_quality.py`'s `FaceQualityAssessor` (sharpness/brightness/face-size/detection-confidence, combined into a pass/fail gate) is exactly the "blur, face-visibility" check that `backend/app/core/file_storage.py`'s own docstring (`_validate_image_quality`, line 32-39) says explicitly is deferred to "the face recognition module (Phase 4, REQ-5)" — a tracked, named gap from Phase 3.1, now being closed.

**Explicitly NOT ported, with reasons:**
- The prior project's **explicit 5-point landmark affine alignment** (`detect_align.py`'s `ref_landmarks` + `cv2.getAffineTransform`) — iPermit's insightface `FaceAnalysis.get()` call already performs equivalent landmark-based alignment internally as part of producing the ArcFace embedding. This is directly confirmed by this project's own test output: the `FutureWarning` seen in every face-related test run (`insightface/utils/face_align.py:23: FutureWarning: 'estimate' is deprecated...`) comes from insightface's **own** internal alignment code. Porting a second, redundant alignment step would be wasted work.
- **Closed-set classifiers** (SVM/RandomForest/KNN) from either project — iPermit needs open-set "is this the same person, or someone we've never seen" matching (REQ-6), which a fixed-identity classifier cannot express.
- **Brute-force matching** — already superseded by iPermit's FAISS `IndexIDMap(IndexFlatIP)`.
- **The 0.6 / 0.7 thresholds** from either project — no more validated than iPermit's existing 0.42; adopting either would be swapping one unvalidated number for another.
- **`face-recognition-pipeline`'s CLI test scripts** (`tests/test_*.py`) — none use pytest/assertions, they're manual demo scripts. iPermit's existing pytest suite (`test_face_consistency.py`, `test_face_enrollment.py`) is already more rigorous; only the *idea* of filename-encoded identity ground truth (`gihan_1.jpg` → identity `gihan`) was borrowed, for the new evaluation CLI script in Task 3.

---

## File Structure

- **Create:** `backend/app/core/face_preprocessing.py` — CLAHE + quality-gate pure functions, zero dependency on `face_engine.py` (deliberately, to avoid a circular import — see Task 1).
- **Create:** `backend/tests/test_face_preprocessing.py` — synthetic-image unit tests for the above.
- **Modify:** `backend/app/core/face_engine.py` — call `face_preprocessing.apply_clahe()` inside `detect_faces()`, gated by a new config flag.
- **Modify:** `backend/app/core/config.py` — new settings for CLAHE toggle + quality-gate thresholds.
- **Modify:** `backend/app/services/face_service.py` — new `assess_enrollment_photo_quality()` function.
- **Modify:** `backend/app/services/application_service.py` — call the above during `submit_application()`, moving quality rejection from approval-time to submission-time (REQ-2 AC2).
- **Modify:** `backend/tests/test_applications.py` — new test covering submission-time rejection of a low-quality face photo.
- **Create:** `backend/app/core/face_evaluation.py` — FAR/FRR/EER pure functions (Task 9.1).
- **Create:** `backend/tests/test_face_evaluation.py` — synthetic-distribution unit tests for the above.
- **Create:** `backend/scripts/evaluate_face_threshold.py` — CLI harness; produces real numbers once a labeled dataset exists (see "Open Decision" section at the end — this is the one piece of Task 9.1 that cannot be completed by code alone).
- **Modify:** `docs/tasks.md` — completion notes for this enhancement once implemented, and an explicit note on the still-open dataset decision.

---

## Task 1: CLAHE preprocessing

**Files:**
- Create: `backend/app/core/face_preprocessing.py`
- Test: `backend/tests/test_face_preprocessing.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/core/face_engine.py`

**Interfaces:**
- Produces: `face_preprocessing.apply_clahe(image: np.ndarray) -> np.ndarray` — takes/returns a BGR `uint8` image of any shape, same shape and dtype out.
- Produces: `settings.face_clahe_enabled: bool` (default `True`).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_face_preprocessing.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec backend pytest tests/test_face_preprocessing.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.core.face_preprocessing'`

- [ ] **Step 3: Implement `face_preprocessing.py`**

Create `backend/app/core/face_preprocessing.py`:

```python
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
```

- [ ] **Step 4: Add config settings**

In `backend/app/core/config.py`, add after the existing `liveness_check_enabled: bool = False` line:

```python
    # REQ-5: CLAHE contrast enhancement before face detection, closing the
    # gap between design.md's documented pipeline and what Phase 4 actually
    # shipped. Toggle-able in case real evaluation data (Task 9.1) later
    # shows it hurts rather than helps accuracy.
    face_clahe_enabled: bool = True
    # Enrollment-photo quality gate thresholds (REQ-2 AC2). Commonly-cited
    # starting points (detection score, blur/brightness heuristics), NOT
    # independently validated on iPermit's own data -- same honesty
    # pattern as face_match_threshold above; revisit once Task 9.1 has
    # real data to test against.
    face_min_detection_score: float = 0.7
    face_min_face_size_px: int = 80
    face_min_sharpness: float = 100.0  # Laplacian variance
    face_min_brightness: int = 30
    face_max_brightness: int = 220
```

- [ ] **Step 5: Run the Step-1 tests again to verify they pass**

Run: `docker compose exec backend pytest tests/test_face_preprocessing.py -v`
Expected: PASS (2 passed)

- [ ] **Step 6: Wire CLAHE into `detect_faces()`**

In `backend/app/core/face_engine.py`, add two imports near the top (after the existing `import requests`):

```python
from app.core import face_preprocessing
from app.core.config import settings
```

Then in `detect_faces()`, insert the CLAHE call right after the existing decode-failure check:

```python
def detect_faces(image_bytes: bytes) -> list[FaceDetection]:
    """Runs RetinaFace detection + ArcFace embedding extraction on an image.
    Returns one FaceDetection per detected face (usually 0 or 1 for an
    enrollment photo; >1 means multiple people are in frame)."""
    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise FaceEngineError("Could not decode image for face detection")

    if settings.face_clahe_enabled:
        image = face_preprocessing.apply_clahe(image)

    app = _get_face_app()
    faces = app.get(image)
    ...  # rest unchanged
```

- [ ] **Step 7: Run the full face test suite to confirm nothing broke**

Run: `docker compose exec backend pytest tests/test_face_consistency.py tests/test_face_enrollment.py tests/test_badges.py tests/test_police.py -v`
Expected: all previously-passing tests still PASS. (CLAHE changes pixel values but not whether a face is detected in the existing fixtures, so no assertions should need updating.)

- [ ] **Step 8: Commit**

```bash
git add backend/app/core/face_preprocessing.py backend/tests/test_face_preprocessing.py backend/app/core/config.py backend/app/core/face_engine.py
git commit -m "Add CLAHE preprocessing to the face detection pipeline"
```

---

## Task 2: Enrollment photo quality gate at submission time (REQ-2 AC2)

**Files:**
- Modify: `backend/app/services/face_service.py`
- Modify: `backend/app/services/application_service.py`
- Modify: `backend/tests/test_applications.py`

**Interfaces:**
- Consumes: `face_preprocessing.assess_photo_quality(image, bbox=..., det_score=...) -> QualityAssessment` (Task 1). `face_engine.detect_faces(image_bytes) -> list[FaceDetection]`, `FaceDetection.bbox: tuple[float,float,float,float]`, `FaceDetection.det_score: float` (both already exist).
- Produces: `face_service.assess_enrollment_photo_quality(image_bytes: bytes) -> None`, raising `face_service.FaceEnrollmentError` (already defined) on any failure.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_applications.py` (reuse the file's existing `_register_and_login`, `client`, `db_session` fixtures already defined there):

```python
def test_submit_application_rejects_blurry_face_photo(client):
    driver_headers = _register_and_login(client)

    blurry = io.BytesIO()
    Image.new("RGB", (300, 300), color=(128, 128, 128)).save(blurry, format="JPEG")
    blurry_bytes = blurry.getvalue()

    files = [
        ("face_photos", ("photo0.jpg", blurry_bytes, "image/jpeg")),
        ("face_photos", ("photo1.jpg", blurry_bytes, "image/jpeg")),
        ("face_photos", ("photo2.jpg", blurry_bytes, "image/jpeg")),
        ("face_photos", ("photo3.jpg", blurry_bytes, "image/jpeg")),
        ("nic_document", ("nic.jpg", _fake_image_bytes(), "image/jpeg")),
        ("medical_cert", ("medical.jpg", _fake_image_bytes(), "image/jpeg")),
        ("birth_cert", ("birth.jpg", _fake_image_bytes(), "image/jpeg")),
    ]

    response = client.post("/applications", headers=driver_headers, files=files)

    assert response.status_code == 422
    assert "No face detected" in response.json()["detail"] or "blurry" in response.json()["detail"]
```

(Note: a flat gray 300×300 image has no detectable face at all, so this test exercises the "No face detected" branch of `assess_enrollment_photo_quality` — the important behavioral change under test is that this rejection now happens at **submission** with a 422, not silently accepted and only caught later at approval time. `test_face_enrollment.py`'s existing approval-time tests already cover the blurry-but-has-a-real-face case at the embedding level; this test's job is specifically to prove the check has moved earlier in the flow.)

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend pytest tests/test_applications.py::test_submit_application_rejects_blurry_face_photo -v`
Expected: FAIL — currently `submit_application` accepts any decodable image regardless of face content, so this returns 201, not 422.

- [ ] **Step 3: Add `assess_enrollment_photo_quality` to `face_service.py`**

In `backend/app/services/face_service.py`, add `cv2` to the existing imports (it already imports `numpy as np`) and a new module import:

```python
import cv2
import numpy as np

from app.core import face_preprocessing
```

Then add this function (anywhere after `_extract_single_embedding`, before `check_pairwise_consistency` is a natural spot):

```python
def assess_enrollment_photo_quality(image_bytes: bytes) -> None:
    """REQ-2 AC2: rejects a face photo at submission time if it fails
    detection or basic quality gates (blur, brightness, size, detection
    confidence) -- gives the driver immediate feedback instead of waiting
    until admin approval to discover a bad photo. Approval-time enrollment
    (build_enrollment_embedding) still re-runs detection and the
    pairwise-consistency check independently; this function only adds an
    earlier, cheaper rejection point."""
    try:
        detections = detect_faces(image_bytes)
    except FaceEngineError as exc:
        raise FaceEnrollmentError(f"Face detection failed: {exc}") from exc

    if len(detections) == 0:
        raise FaceEnrollmentError("No face detected in this photo")
    if len(detections) > 1:
        raise FaceEnrollmentError(
            "Multiple faces detected -- only the driver should be in frame"
        )

    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    detection = detections[0]
    quality = face_preprocessing.assess_photo_quality(
        image, bbox=detection.bbox, det_score=detection.det_score
    )
    if not quality.passes:
        raise FaceEnrollmentError("Photo quality is too low: " + "; ".join(quality.reasons))
```

- [ ] **Step 4: Call it from `submit_application`**

In `backend/app/services/application_service.py`, change the face-photos loop inside `submit_application` from:

```python
        for photo in face_photos:
            path = await save_upload(
                photo,
                subdir=subdir,
                allowed_types=IMAGE_CONTENT_TYPES,
                require_image=True,
            )
            saved.append((DocumentType.FACE_PHOTO, path))
```

to:

```python
        for photo in face_photos:
            raw = await photo.read()
            face_service.assess_enrollment_photo_quality(raw)
            await photo.seek(0)
            path = await save_upload(
                photo,
                subdir=subdir,
                allowed_types=IMAGE_CONTENT_TYPES,
                require_image=True,
            )
            saved.append((DocumentType.FACE_PHOTO, path))
```

and change the `except UploadValidationError` clause immediately below (still inside `submit_application`) from:

```python
    except UploadValidationError as exc:
        _delete_saved_files(saved)
        raise ApplicationError(str(exc)) from exc
```

to:

```python
    except (UploadValidationError, face_service.FaceEnrollmentError) as exc:
        _delete_saved_files(saved)
        raise ApplicationError(str(exc)) from exc
```

(`face_service` is already imported in this file for the badge/notification wiring from Phases 4/7/8 — no new import statement needed.)

- [ ] **Step 5: Run the Step-1 test again to verify it passes**

Run: `docker compose exec backend pytest tests/test_applications.py::test_submit_application_rejects_blurry_face_photo -v`
Expected: PASS

- [ ] **Step 6: Run the full backend suite**

Run: `docker compose exec backend pytest -q`
Expected: all tests pass, including every existing `test_applications.py`/`test_face_enrollment.py` test — none of them submit low-quality face photos today, so none should be affected by the new gate. If any existing test fails here, it means a currently-passing test was relying on the old "accept anything decodable" behavior for a face photo that wouldn't actually pass detection+quality now — inspect it and fix the fixture, don't weaken the new check.

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/face_service.py backend/app/services/application_service.py backend/tests/test_applications.py
git commit -m "Reject low-quality enrollment photos at submission time (REQ-2 AC2)"
```

---

## Task 3: FAR/FRR/EER evaluation harness (Task 9.1)

**Files:**
- Create: `backend/app/core/face_evaluation.py`
- Test: `backend/tests/test_face_evaluation.py`
- Create: `backend/scripts/evaluate_face_threshold.py`

**Interfaces:**
- Produces: `ThresholdMetrics(threshold: float, far: float, frr: float)`, `compute_far_frr(genuine_scores: list[float], impostor_scores: list[float], threshold: float) -> ThresholdMetrics`, `sweep_thresholds(genuine_scores, impostor_scores, steps: int = 100) -> list[ThresholdMetrics]`, `find_equal_error_rate(genuine_scores, impostor_scores, steps: int = 1000) -> ThresholdMetrics`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_face_evaluation.py`:

```python
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

    assert eer_point.far == pytest.approx(eer_point.frr, abs=0.05)
    assert eer_point.far > 0.3
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec backend pytest tests/test_face_evaluation.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.core.face_evaluation'`

- [ ] **Step 3: Implement `face_evaluation.py`**

Create `backend/app/core/face_evaluation.py`:

```python
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
```

- [ ] **Step 4: Run tests again to verify they pass**

Run: `docker compose exec backend pytest tests/test_face_evaluation.py -v`
Expected: PASS (6 passed)

- [ ] **Step 5: Write the CLI harness**

Create `backend/scripts/evaluate_face_threshold.py`:

```python
"""CLI harness for docs/tasks.md Task 9.1: computes Accuracy/FAR/FRR/EER
for the current face-match pipeline against a labeled image directory.

REQUIRES REAL DATA THIS PROJECT DOES NOT YET HAVE -- see the "Open
Decision: Evaluation Dataset" section of
docs/superpowers/plans/2026-09-07-face-recognition-enhancement.md.

Images must be named `<identity>_<n>.<ext>` (e.g. gihan_1.jpg,
gihan_2.jpg, sanjula_1.jpg) -- the ground-truth convention borrowed from
face-recognition-pipeline's test scripts (see the research summary in the
plan doc above). Point --dataset-dir at a directory of such images; every
same-identity pair becomes a genuine-match score, every cross-identity
pair becomes an impostor score.

Usage (inside the backend container):
    python -m scripts.evaluate_face_threshold --dataset-dir /path/to/labeled/images
"""

import argparse
import itertools
from pathlib import Path

from app.core.config import settings
from app.core.face_engine import cosine_similarity, detect_faces
from app.core.face_evaluation import compute_far_frr, find_equal_error_rate


def _identity_from_filename(path: Path) -> str:
    return path.stem.rsplit("_", 1)[0]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-dir", required=True, type=Path)
    args = parser.parse_args()

    image_paths = sorted(
        p for p in args.dataset_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    if len(image_paths) < 2:
        raise SystemExit(f"Need at least 2 images in {args.dataset_dir}, found {len(image_paths)}")

    embeddings = {}
    for path in image_paths:
        detections = detect_faces(path.read_bytes())
        if len(detections) != 1:
            print(f"Skipping {path.name}: expected 1 face, found {len(detections)}")
            continue
        embeddings[path] = detections[0].embedding

    genuine_scores = []
    impostor_scores = []
    for path_a, path_b in itertools.combinations(embeddings, 2):
        similarity = cosine_similarity(embeddings[path_a], embeddings[path_b])
        if _identity_from_filename(path_a) == _identity_from_filename(path_b):
            genuine_scores.append(similarity)
        else:
            impostor_scores.append(similarity)

    print(
        f"{len(embeddings)} usable images, {len(genuine_scores)} genuine pairs, "
        f"{len(impostor_scores)} impostor pairs"
    )

    current = compute_far_frr(genuine_scores, impostor_scores, settings.face_match_threshold)
    print(f"\nAt current threshold ({settings.face_match_threshold}):")
    print(f"  FAR: {current.far:.2%}   FRR: {current.frr:.2%}")

    eer = find_equal_error_rate(genuine_scores, impostor_scores)
    print("\nEqual Error Rate operating point:")
    print(f"  threshold: {eer.threshold:.3f}   FAR: {eer.far:.2%}   FRR: {eer.frr:.2%}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Smoke-test the CLI's argument handling and error path (no real dataset needed for this step)**

Run inside the backend container against an empty temp directory to confirm the "need at least 2 images" guard fires correctly:

```bash
docker compose exec backend sh -c "mkdir -p /tmp/empty_eval_test && python -m scripts.evaluate_face_threshold --dataset-dir /tmp/empty_eval_test"
```

Expected: exits with `SystemExit: Need at least 2 images in /tmp/empty_eval_test, found 0` — confirms the script is importable and its argument/guard logic works, without needing real data yet.

- [ ] **Step 7: Commit**

```bash
git add backend/app/core/face_evaluation.py backend/tests/test_face_evaluation.py backend/scripts/evaluate_face_threshold.py
git commit -m "Add FAR/FRR/EER evaluation harness for Task 9.1"
```

---

## Task 4: Documentation

**Files:**
- Modify: `docs/tasks.md`

**Interfaces:**
- None (documentation only).

- [ ] **Step 1: Update `docs/tasks.md`**

Under Phase 4 (Facial Recognition Module), add a note after the existing 4.4 entry recording this enhancement (mirroring the completion-note style already used throughout the file), and update Task 9.1's entry to reference the new harness and the still-open dataset decision. Since the exact surrounding text will have shifted by the time this task executes, read the current file first and insert consistently with the established pattern: what was built, what was verified, and what remains open (the dataset — see below).

- [ ] **Step 2: Commit**

```bash
git add docs/tasks.md
git commit -m "Document the CLAHE/quality-gate enhancement and Task 9.1 harness status"
```

---

## Open Decision: Evaluation Dataset (not a code task — needs your input)

Task 3 builds the **harness**; it cannot produce real Accuracy/FAR/FRR/EER numbers without a **held-out, properly-sized, diverse dataset** — which neither prior project provides (both explicitly gitignore their `data/` directories; `facial-recognition-system`'s only documented dataset is the 6-person/68-image set that produced the overfitting result requirements.md already warns against repeating). This mirrors the Phase 5.4 YOLO-dataset situation: a real decision only you can make, not something to silently fabricate or fake with synthetic faces.

Options, for discussion once this plan's code tasks are done:
1. **Source a public face-verification dataset** (e.g., a subset of LFW) purely for threshold calibration — not likely representative of Sri Lankan drivers specifically, but far larger/more diverse than 68 images, and immediately available.
2. **Collect real data over time** from actual driver enrollments as the system gets used (with consent, per the Privacy/Ethics NFR) — the most representative option, but only available after real usage accumulates, which doesn't fit an academic submission timeline.
3. **Build a small but properly-designed dataset now** — more people than 6, multiple photos per person under varied lighting/angle, with a genuine held-out test split — deliberately avoiding the repeat of the cited overfitting mistake, but requires real photography effort before Task 9.1 can close.

This decision should happen before Task 9.1 is marked complete in `docs/tasks.md`, but does not block Tasks 1–3 above, which are fully implementable and testable today.

**Resolution (2026-09-26/27): option 1 was taken.** The pipeline was evaluated on LFW
(96 identities) plus the Kaggle "100 Bollywood Celebrity Faces" set (100 South Asian
identities) in Google Colab — `docs/evaluation/face_evaluation.ipynb`, results in
`docs/evaluation/results/`. The CLI harness from Task 3 was not used for this: the
notebook reimplements the same metrics and adds a DET curve, identity-bootstrap CIs and
label-noise checks. At 0.42: FAR 0.0013% / 0.0025% (all false accepts were mislabelled
dataset photos), FRR 2.91% / 9.89%, EER 0.32% / 1.13%. Two findings affect this plan's
Task 1: an ablation on LFW (`docs/evaluation/results/clahe_ablation.md`) found the CLAHE
step more than doubles FRR (2.95% vs 1.37%) with no FAR/EER benefit, so porting it from
`face-recognition-pipeline` was a net negative; and Task 2's `face_min_sharpness = 100`
rejects real phone selfies (see `docs/tasks.md` 9.1). Option 2/3 data (Sri Lankan
drivers) is still needed before claiming field performance.

---

## Self-Review

**Spec coverage:** Both concrete portable gaps from the research (CLAHE, quality gating) → Tasks 1–2. Task 9.1's evaluation harness → Task 3. The explicitly-rejected items (alignment, classifiers, brute-force matching, the 0.6/0.7 thresholds) are documented as deliberate non-tasks in the Research Summary, not silently dropped. The one item research surfaced that genuinely cannot become a code task (the dataset) is called out as an open decision, not hidden.

**Placeholder scan:** No TBD/TODO markers; every step has real, complete code, not a description of code.

**Type consistency:** `face_preprocessing.assess_photo_quality` takes `bbox`/`det_score` as plain values (not a `FaceDetection` object) specifically to avoid importing `face_engine` into `face_preprocessing` — checked against `face_engine.py`'s own `FaceDetection.bbox: tuple[float, float, float, float]` and `.det_score: float` field types, which match exactly what `face_service.py`'s Task 2 call site passes through. `ThresholdMetrics`/`compute_far_frr`/`sweep_thresholds`/`find_equal_error_rate` names and signatures are used identically across Task 3's implementation, its tests, and the CLI script.

---

**Plan complete and saved to `docs/superpowers/plans/2026-09-07-face-recognition-enhancement.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
