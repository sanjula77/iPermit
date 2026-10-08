import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.appeal import AppealStatus
from app.models.application import ApplicationStatus
from app.models.user import User, UserRole
from app.schemas.admin_user import (
    AdminLicenseSummary,
    AdminUserDetail,
    AdminUserListItem,
)
from app.schemas.appeal import AppealRead, ResolveAppealRequest
from app.schemas.application import (
    ApplicationRead,
    ApproveApplicationRequest,
    RejectApplicationRequest,
)
from app.schemas.badge import BadgeDistributionResponse
from app.schemas.behaviour import AdminBehaviourOverview
from app.schemas.license import UpdateLicenseCategoriesRequest
from app.services import (
    admin_user_service,
    appeal_service,
    application_service,
    badge_service,
    behaviour_service,
    license_service,
)
from app.services.face_service import FaceEnrollmentError

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_only(current_user: User = Depends(require_role(UserRole.ADMIN))) -> User:
    return current_user


@router.get("/applications", response_model=list[ApplicationRead])
def list_applications(
    status_filter: ApplicationStatus | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    return application_service.list_applications_for_admin(db, status=status_filter)


@router.get("/applications/{application_id}", response_model=ApplicationRead)
def get_application(
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    try:
        return application_service.get_application_for_admin(
            db, application_id=application_id
        )
    except application_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.post("/applications/{application_id}/approve", response_model=ApplicationRead)
def approve_application(
    application_id: uuid.UUID,
    body: ApproveApplicationRequest | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    try:
        return application_service.approve_application(
            db,
            application_id=application_id,
            categories=body.categories if body else None,
        )
    except application_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except application_service.InvalidStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    except FaceEnrollmentError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except application_service.ServiceUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc


@router.post("/applications/{application_id}/reject", response_model=ApplicationRead)
def reject_application(
    application_id: uuid.UUID,
    payload: RejectApplicationRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    try:
        return application_service.reject_application(
            db, application_id=application_id, reason=payload.reason
        )
    except application_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except application_service.InvalidStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    except application_service.ApplicationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.get("/appeals", response_model=list[AppealRead])
def list_appeals(
    status_filter: AppealStatus | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    return appeal_service.list_all_appeals(db, status_filter=status_filter)


@router.post("/appeals/{appeal_id}/resolve", response_model=AppealRead)
def resolve_appeal(
    appeal_id: uuid.UUID,
    payload: ResolveAppealRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(_admin_only),
):
    try:
        return appeal_service.resolve_appeal(
            db, appeal_id=appeal_id, admin_id=admin.id, resolution=payload.resolution
        )
    except appeal_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except appeal_service.InvalidStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc


@router.get("/badges", response_model=BadgeDistributionResponse)
def get_badge_distribution(
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    return badge_service.get_badge_distribution(db)


@router.get("/behaviour", response_model=AdminBehaviourOverview)
def get_behaviour_overview(
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    return behaviour_service.get_admin_overview(db)


@router.get(
    "/applications/{application_id}/documents/{document_id}",
    response_class=FileResponse,
)
def get_application_document(
    application_id: uuid.UUID,
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    try:
        path, media_type = application_service.get_document_file(
            db, application_id=application_id, document_id=document_id
        )
    except application_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    # Identity documents and face photos: never cached by browsers or proxies.
    return FileResponse(
        path,
        media_type=media_type,
        headers={"Cache-Control": "private, no-store"},
    )


@router.put("/licenses/{license_id}/categories", response_model=AdminLicenseSummary)
def update_license_categories(
    license_id: uuid.UUID,
    body: UpdateLicenseCategoriesRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    """Sets the vehicle categories an issued licence holds (for example to correct
    or complete the categories after approval)."""
    try:
        return license_service.set_categories(
            db, license_id=license_id, categories=body.categories
        )
    except license_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.get("/users", response_model=list[AdminUserListItem])
def list_users(
    role: UserRole | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    return admin_user_service.list_users(db, role=role)


@router.get("/users/{user_id}", response_model=AdminUserDetail)
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(_admin_only),
):
    try:
        return admin_user_service.get_user_detail(db, user_id)
    except admin_user_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(_admin_only),
):
    try:
        admin_user_service.delete_user(db, user_id=user_id, acting_admin_id=admin.id)
    except admin_user_service.NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except admin_user_service.ProtectedAccountError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc
    except admin_user_service.HasRecordsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
