import uuid

from sqlalchemy.orm import Session

from app.core import face_index, face_template_store
from app.core.config import settings
from app.core.face_engine import FaceEngineError, detect_faces
from app.models.user import User
from app.repositories import license_repository, user_repository, violation_repository
from app.schemas.police import DriverSummary, FaceMatchCandidate, VerifyFaceResponse

# REQ-6 AC1: how many alternate candidates to surface alongside the best
# match, so an officer has something to manually pick between under AC4
# rather than a single unverifiable score.
_CANDIDATE_COUNT = 3


class FaceVerificationError(Exception):
    """Expected, business-rule rejections (no face / multiple faces in the
    live photo) -- distinct from FaceEngineError, which is an infrastructure
    failure."""


class NotFoundError(Exception):
    pass


class LookupError(Exception):
    """Caller error: neither nic nor license_no was supplied to lookup_driver."""


def _driver_summary(db: Session, driver: User) -> DriverSummary:
    license_ = license_repository.get_latest_for_driver(db, driver.id)
    violations = violation_repository.list_for_driver(db, driver.id)
    return DriverSummary(
        driver_id=driver.id,
        email=driver.email,
        nic=driver.nic,
        license_no=license_.license_no if license_ else None,
        license_status=license_.status if license_ else None,
        points=license_.points if license_ else None,
        violations=violations,
    )


def verify_face(db: Session, *, image_bytes: bytes) -> VerifyFaceResponse:
    """REQ-6 AC1/AC4: match a live officer-submitted photo against the FAISS
    index. Never auto-confirms -- requires_manual_confirmation is set
    whenever the best match's similarity is below the configured threshold,
    or there is no enrolled match at all, and the officer must fall back to
    QR/NIC lookup or manual judgment (verify_qr/lookup_driver)."""
    try:
        detections = detect_faces(image_bytes)
    except FaceEngineError as exc:
        raise FaceVerificationError(f"Face detection failed: {exc}") from exc

    if len(detections) == 0:
        raise FaceVerificationError("No face detected in the submitted photo")
    if len(detections) > 1:
        raise FaceVerificationError(
            "Multiple faces detected in the submitted photo -- only the "
            "stopped driver should be in frame"
        )

    matches = face_index.search(detections[0].embedding, k=_CANDIDATE_COUNT)
    candidates: list[FaceMatchCandidate] = []
    for similarity, rowid in matches:
        driver_id = face_template_store.get_driver_id_by_rowid(rowid)
        if driver_id is None:
            continue
        driver = user_repository.get_by_id(db, uuid.UUID(driver_id))
        if driver is None:
            continue
        candidates.append(
            FaceMatchCandidate(
                driver=_driver_summary(db, driver), similarity=similarity
            )
        )

    best_match = candidates[0] if candidates else None
    requires_manual_confirmation = (
        best_match is None or best_match.similarity < settings.face_match_threshold
    )
    return VerifyFaceResponse(
        requires_manual_confirmation=requires_manual_confirmation,
        best_match=best_match,
        candidates=candidates,
    )


def verify_qr(db: Session, *, qr_token: str) -> DriverSummary:
    """REQ-6 AC2: a QR scan is a direct token lookup, not a biometric
    similarity match -- there is no ambiguity to flag here, unlike verify_face."""
    license_ = license_repository.get_by_qr_token(db, qr_token)
    if license_ is None:
        raise NotFoundError("No license matches this QR code")
    driver = user_repository.get_by_id(db, license_.driver_id)
    if driver is None:
        raise NotFoundError("No license matches this QR code")
    return _driver_summary(db, driver)


def lookup_driver(
    db: Session, *, nic: str | None, license_no: str | None
) -> DriverSummary:
    """REQ-6 AC3: officer lookup by NIC or license number."""
    if not nic and not license_no:
        raise LookupError("Provide either nic or license_no")

    driver: User | None = None
    if nic:
        driver = user_repository.get_by_nic(db, nic)
    elif license_no:
        license_ = license_repository.get_by_license_no(db, license_no)
        if license_ is not None:
            driver = user_repository.get_by_id(db, license_.driver_id)

    if driver is None:
        raise NotFoundError("No driver matches the given NIC or license number")
    return _driver_summary(db, driver)
