from itertools import combinations
from pathlib import Path

import numpy as np

from app.core import face_index, face_template_store
from app.core.config import settings
from app.core.face_engine import FaceEngineError, cosine_similarity, detect_faces
from app.models.application import Application, DocumentType

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

    try:
        detections = detect_faces(image_bytes)
    except FaceEngineError as exc:
        raise FaceEnrollmentError(
            f"Face detection failed on photo {photo_index}: {exc}"
        ) from exc

    if len(detections) == 0:
        raise FaceEnrollmentError(f"No face detected in photo {photo_index}")
    if len(detections) > 1:
        raise FaceEnrollmentError(
            f"Multiple faces detected in photo {photo_index} -- "
            "only the driver should be in frame"
        )
    return detections[0].embedding


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


def store_template(driver_id: str, embedding: np.ndarray) -> None:
    """Persists to SQLite (source of truth) and the FAISS index (derived
    cache). Called only after the application's approval has already
    committed in Postgres -- see application_service.approve_application."""
    rowid = face_template_store.save_template(driver_id, embedding)
    face_index.add_to_index(rowid, embedding)
