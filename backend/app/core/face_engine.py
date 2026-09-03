"""RetinaFace (detection) + ArcFace (512-dim embedding) via ONNX Runtime,
per REQ-5 AC1. Uses the insightface `buffalo_l` model pack.

Model loading is lazy (first real use, not app startup) so that uvicorn's
--reload doesn't reinitialize a ~275MB model on every file save during
development. The model cache directory is a persistent Docker volume (see
docker-compose.yml) so it only downloads once, not on every rebuild.
"""

import os
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import requests

_BUFFALO_L_URL = (
    "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip"
)
_MODEL_FILES = [
    "det_10g.onnx",
    "w600k_r50.onnx",
    "1k3d68.onnx",
    "2d106det.onnx",
    "genderage.onnx",
]

_face_app = None  # lazy singleton, see _get_face_app()


@dataclass
class FaceDetection:
    bbox: tuple[float, float, float, float]
    det_score: float
    embedding: np.ndarray  # 512-dim, L2-normalized


class FaceEngineError(Exception):
    """Raised for model-loading or inference infrastructure failures --
    distinct from FaceEnrollmentError (app/services/face_service.py), which
    is for expected business-rule rejections (no face, multiple faces)."""


def _model_dir() -> Path:
    return Path(os.path.expanduser("~/.insightface/models/buffalo_l"))


def _models_present() -> bool:
    d = _model_dir()
    return all((d / name).exists() for name in _MODEL_FILES)


def _download_with_retry(url: str, dest: Path, attempts: int = 8) -> None:
    """A resumable, retrying downloader. insightface's own downloader has no
    resume support and failed outright on a flaky connection during
    development -- this is deliberately more defensive."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    last_error: Exception | None = None
    for attempt in range(attempts):
        resume_pos = dest.stat().st_size if dest.exists() else 0
        headers = {"Range": f"bytes={resume_pos}-"} if resume_pos else {}
        try:
            with requests.get(
                url, headers=headers, stream=True, timeout=30
            ) as response:
                response.raise_for_status()
                mode = "ab" if resume_pos else "wb"
                with open(dest, mode) as f:
                    for chunk in response.iter_content(chunk_size=65536):
                        if chunk:
                            f.write(chunk)
            return
        except requests.RequestException as exc:
            last_error = exc
            time.sleep(min(2**attempt, 30))
    raise FaceEngineError(
        f"Failed to download {url} after {attempts} attempts"
    ) from last_error


def _ensure_models_downloaded() -> None:
    if _models_present():
        return
    zip_path = Path(os.path.expanduser("~/.insightface/models/buffalo_l.zip"))
    _download_with_retry(_BUFFALO_L_URL, zip_path)
    with zipfile.ZipFile(zip_path) as z:
        if z.testzip() is not None:
            zip_path.unlink(missing_ok=True)
            raise FaceEngineError("Downloaded model archive is corrupt")
        z.extractall(_model_dir())
    if not _models_present():
        raise FaceEngineError("Model extraction did not produce the expected files")


def _get_face_app():
    global _face_app
    if _face_app is None:
        _ensure_models_downloaded()
        from insightface.app import FaceAnalysis

        app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=0, det_size=(640, 640))
        _face_app = app
    return _face_app


def detect_faces(image_bytes: bytes) -> list[FaceDetection]:
    """Runs RetinaFace detection + ArcFace embedding extraction on an image.
    Returns one FaceDetection per detected face (usually 0 or 1 for an
    enrollment photo; >1 means multiple people are in frame)."""
    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise FaceEngineError("Could not decode image for face detection")

    app = _get_face_app()
    faces = app.get(image)

    results = []
    for face in faces:
        embedding = face.embedding.astype(np.float32)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        results.append(
            FaceDetection(
                bbox=tuple(float(x) for x in face.bbox),
                det_score=float(face.det_score),
                embedding=embedding,
            )
        )
    return results


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Assumes both vectors are already L2-normalized (detect_faces always
    returns normalized embeddings) -- this is then just the dot product."""
    return float(np.dot(a, b))
