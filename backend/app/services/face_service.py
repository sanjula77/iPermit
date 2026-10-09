import logging
import sqlite3
from itertools import combinations
from pathlib import Path

import cv2
import numpy as np

from app.core import face_audit, face_index, face_preprocessing, face_template_store
from app.core.config import settings
from app.core.face_engine import cosine_similarity, detect_faces
from app.models.application import Application, DocumentType

logger = logging.getLogger(__name__)

REQUIRED_FACE_PHOTOS = 4


class FaceEnrollmentError(Exception):
    """Expected, business-rule rejections (no face, multiple faces,
    inconsistent identity across photos) -- distinct from FaceEngineError,
    which is for model/infrastructure failures."""


def _read_face_photo_paths(application: Application) -> list[Path]:
    photos = [d for d in application.documents if d.doc_type == DocumentType.FACE_PHOTO]
    if len(photos) != REQUIRED_FACE_PHOTOS:
        raise FaceEnrollmentError(
            f"Expected {REQUIRED_FACE_PHOTOS} face photos on the application, "
            f"found {len(photos)}"
        )
    return [Path(settings.upload_dir) / photo.file_path for photo in photos]


def _extract_single_embedding(path: Path, photo_index: int) -> np.ndarray:
    try:
        image_bytes = path.read_bytes()
    except OSError as exc:
        raise FaceEnrollmentError(
            f"Could not read enrollment photo {photo_index}"
        ) from exc

    # FaceEngineError propagates: a model failure isn't a bad photo.
    detections = detect_faces(image_bytes)

    if len(detections) == 0:
        raise FaceEnrollmentError(f"No face detected in photo {photo_index}")
    if len(detections) > 1:
        raise FaceEnrollmentError(
            f"Multiple faces detected in photo {photo_index} -- "
            "only the driver should be in frame"
        )
    return detections[0].embedding


def assess_enrollment_photo_quality(image_bytes: bytes) -> None:
    """REQ-2 AC2: rejects a face photo at submission time if it fails
    detection or basic quality gates (blur, brightness, size, detection
    confidence) -- gives the driver immediate feedback instead of waiting
    until admin approval to discover a bad photo. Approval-time enrollment
    (build_enrollment_embedding) still re-runs detection and the
    pairwise-consistency check independently; this function only adds an
    earlier, cheaper rejection point.

    A FaceEngineError (model/inference failure) propagates unchanged: it is
    the server's fault, not the photo's, so it must not surface as a
    rejection the driver is told to fix."""
    detections = detect_faces(image_bytes)

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
        raise FaceEnrollmentError(
            "Photo quality is too low: " + "; ".join(quality.reasons)
        )


def check_pairwise_consistency(embeddings: list[np.ndarray], threshold: float) -> None:
    """REQ-5 AC2: every pair of enrollment photos must consistently match
    the same face. Pure function (no I/O) so it's unit-testable with
    synthetic vectors independent of the real ONNX model."""
    for a, b in combinations(embeddings, 2):
        similarity = cosine_similarity(a, b)
        if similarity < threshold:
            raise FaceEnrollmentError(
                "Enrollment photos do not consistently show the same face "
                f"(similarity {similarity:.2f} below threshold {threshold:.2f}) -- "
                "ask the driver to resubmit with clearer, consistent photos"
            )


def build_enrollment_embedding(application: Application) -> np.ndarray:
    """REQ-5 AC1/AC2: extract one embedding per enrollment photo, verify
    they consistently show the same face, and return the averaged,
    re-normalized template embedding. Raises FaceEnrollmentError if any
    photo fails detection or the photos are inconsistent -- callers should
    treat this as blocking approval, not a fire-and-forget side effect."""
    paths = _read_face_photo_paths(application)
    embeddings = [
        _extract_single_embedding(path, index + 1) for index, path in enumerate(paths)
    ]

    check_pairwise_consistency(embeddings, settings.face_match_threshold)

    averaged = np.mean(embeddings, axis=0)
    norm = np.linalg.norm(averaged)
    if norm > 0:
        averaged = averaged / norm
    return averaged.astype(np.float32)


def _record_erasure(
    action: str, actor_id: str | None, subject_id: str | None, detail: str
) -> None:
    """Erasing biometric data is a right, so it is never refused because the
    audit log is unavailable: the data goes first, and a failure to log it is
    reported loudly instead."""
    try:
        face_audit.record(
            action, actor_id=actor_id, subject_id=subject_id, detail=detail
        )
    except (face_audit.AuditError, sqlite3.Error):
        logger.exception("Biometric erasure done but could not be audit-logged")


def store_template(
    driver_id: str, embedding: np.ndarray, *, actor_id: str | None = None
) -> None:
    """Persists to SQLite (source of truth) and the FAISS index (derived
    cache), and writes a signed audit entry. Called only after the
    application's approval has already committed in Postgres -- see
    application_service.approve_application."""
    face_audit.ensure_ready()  # never touch biometric data we could not log
    rowid, replaced_rowids = face_template_store.save_template(driver_id, embedding)
    face_index.add_to_index(rowid, embedding, replaced_rowids)
    face_audit.record(
        face_audit.ENROLL,
        actor_id=actor_id,
        subject_id=driver_id,
        detail=f"replaced={len(replaced_rowids)}",
    )


def delete_all_templates(*, actor_id: str | None = None) -> int:
    """Deletes every biometric template from SQLite and the FAISS index (demo
    reset). Returns how many were removed. The audit log is kept."""
    rowids = face_template_store.delete_all_templates()
    face_index.remove_from_index(rowids)
    _record_erasure(face_audit.DELETE_ALL, actor_id, None, f"removed={len(rowids)}")
    return len(rowids)


def delete_template(driver_id: str, *, actor_id: str | None = None) -> None:
    """Deletes a driver's biometric template from SQLite and the FAISS index.
    The template's wrapped data key goes with the row, so nothing of it can be
    decrypted afterwards."""
    rowids = face_template_store.delete_template(driver_id)
    face_index.remove_from_index(rowids)
    _record_erasure(face_audit.DELETE, actor_id, driver_id, f"removed={len(rowids)}")
