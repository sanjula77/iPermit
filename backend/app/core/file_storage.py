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

    if width < MIN_PHOTO_DIMENSION_PX or height < MIN_PHOTO_DIMENSION_PX:
        raise UploadValidationError(
            f"{filename} is too small ({width}x{height}px) — minimum is "
            f"{MIN_PHOTO_DIMENSION_PX}x{MIN_PHOTO_DIMENSION_PX}px"
        )


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
    if not raw:
        raise UploadValidationError(f"{file.filename} is empty")
    if len(raw) > settings.max_upload_size_bytes:
        raise UploadValidationError(
            f"{file.filename} exceeds the {settings.max_upload_size_bytes} byte limit"
        )

    if require_image:
        _validate_image_quality(raw, file.filename or "upload")

    extension = _EXTENSION_BY_CONTENT_TYPE.get(file.content_type or "", "")
    relative_path = f"{subdir}/{uuid.uuid4()}{extension}"

    target_path = Path(settings.upload_dir) / relative_path
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(raw)

    return relative_path
