from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User, UserRole
from app.schemas.police import (
    DriverSummary,
    RecordViolationRequest,
    RecordViolationResponse,
    VerifyFaceResponse,
)
from app.services import police_service, violation_service

router = APIRouter(prefix="/police", tags=["police"])


def _police_only(current_user: User = Depends(require_role(UserRole.POLICE))) -> User:
    return current_user


@router.post("/verify-face", response_model=VerifyFaceResponse)
async def verify_face(
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _officer: User = Depends(_police_only),
):
    try:
        return police_service.verify_face(db, image_bytes=await photo.read())
    except police_service.FaceVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.get("/verify-qr/{qr_token}", response_model=DriverSummary)
def verify_qr(
    qr_token: str,
    db: Session = Depends(get_db),
    _officer: User = Depends(_police_only),
):
    try:
        return police_service.verify_qr(db, qr_token=qr_token)
    except police_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.get("/lookup", response_model=DriverSummary)
def lookup_driver(
    nic: str | None = None,
    license_no: str | None = None,
    db: Session = Depends(get_db),
    _officer: User = Depends(_police_only),
):
    try:
        return police_service.lookup_driver(db, nic=nic, license_no=license_no)
    except police_service.LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except police_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.post(
    "/violations",
    response_model=RecordViolationResponse,
    status_code=status.HTTP_201_CREATED,
)
def record_violation(
    payload: RecordViolationRequest,
    db: Session = Depends(get_db),
    officer: User = Depends(_police_only),
):
    try:
        return violation_service.record_violation(
            db,
            officer_id=officer.id,
            driver_id=payload.driver_id,
            violation_type=payload.type,
            evidence_ref=payload.evidence_ref,
        )
    except violation_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
