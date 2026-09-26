import io
import uuid
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png"}
DOCUMENT_CONTENT_TYPES = IMAGE_CONTENT_TYPES | {"application/pdf"}
MIN_PHOTO_DIMENSION_PX = 200

_EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
}


class UploadValidationError(Exception):
    """Raised for any rejected upload; the router maps this to a 422 response."""


def _validate_content_type(file: UploadFile, allowed: set[str]) -> None:
    if file.content_type not in allowed:
        raise UploadValidationError(
            f"Unsupported file type for {file.filename}: {file.content_type}"
        )


def _validate_image_quality(raw: bytes, filename: str) -> None:
    """Structural quality check: must be a decodable image of plausible size.

    Deeper checks (blur, face-visibility) belong to the face recognition
    module (Phase 4, REQ-5) which runs its own quality gate during
    enrollment — see docs/requirements.md. This is a cheap upload-time gate,
    not a substitute for that.
    """
    try:
        with Image.open(io.BytesIO(raw)) as image:
            image.verify()
        with Image.open(io.BytesIO(raw)) as image:
            width, height = image.size
    except UnidentifiedImageError as exc:
        raise UploadValidationError(f"{filename} is not a valid image") from exc

    if width * height > settings.max_image_pixels:
        raise UploadValidationError(
            f"{filename} is too large ({width}x{height}px) -- maximum is "
            f"{settings.max_image_pixels} pixels"
        )
    if width < MIN_PHOTO_DIMENSION_PX or height < MIN_PHOTO_DIMENSION_PX:
        raise UploadValidationError(
            f"{filename} is too small ({width}x{height}px) — minimum is "
            f"{MIN_PHOTO_DIMENSION_PX}x{MIN_PHOTO_DIMENSION_PX}px"
        )


def _validate_size(raw: bytes, filename: str | None) -> None:
    if not raw:
        raise UploadValidationError(f"{filename} is empty")
    if len(raw) > settings.max_upload_size_bytes:
        raise UploadValidationError(
            f"{filename} exceeds the {settings.max_upload_size_bytes} byte limit"
        )


def read_image_upload(file: UploadFile) -> bytes:
    """Validates an uploaded photo that's used and discarded rather than
    stored (police face verification). Sync, for sync route handlers; reads
    at most one byte past the limit so an oversized upload is never loaded
    whole."""
    _validate_content_type(file, IMAGE_CONTENT_TYPES)
    raw = file.file.read(settings.max_upload_size_bytes + 1)
    _validate_size(raw, file.filename)
    _validate_image_quality(raw, file.filename or "upload")
    return raw


async def save_upload(
    file: UploadFile,
    *,
    subdir: str,
    allowed_types: set[str],
    require_image: bool,
) -> str:
    """Validates and persists an uploaded file under settings.upload_dir.

    Returns the path relative to settings.upload_dir — store *that* in the
    DB, never an absolute filesystem path.
    """
    _validate_content_type(file, allowed_types)

    raw = await file.read()
    _validate_size(raw, file.filename)

    if require_image:
        _validate_image_quality(raw, file.filename or "upload")

    extension = _EXTENSION_BY_CONTENT_TYPE.get(file.content_type or "", "")
    relative_path = f"{subdir}/{uuid.uuid4()}{extension}"

    target_path = Path(settings.upload_dir) / relative_path
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(raw)

    return relative_path
