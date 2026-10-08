import logging
import sqlite3
import uuid
from collections import defaultdict
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.application import Application
from app.models.user import User, UserRole
from app.repositories import (
    appeal_repository,
    application_repository,
    badge_repository,
    danger_zone_repository,
    license_repository,
    notification_repository,
    road_incident_repository,
    user_repository,
    violation_repository,
)
from app.services import behaviour_service, face_service, points_service

logger = logging.getLogger(__name__)

_MANAGED_ROLES = [UserRole.DRIVER, UserRole.POLICE]
_OFFICER_RECENT_LIMIT = 10


class NotFoundError(Exception):
    pass


class ProtectedAccountError(Exception):
    """The account may not be deleted at all (an admin, or yourself)."""


class HasRecordsError(Exception):
    """Enforcement records reference the account and must be kept."""


def _latest_application_status(applications: list[Application]):
    if not applications:
        return None
    return max(applications, key=lambda a: a.created_at).status


def list_users(db: Session, *, role: UserRole | None = None) -> list[dict]:
    """Drivers and officers, newest first, with the figures the admin list
    shows. Admin accounts are not listed: they are not managed here."""
    roles = [role] if role in _MANAGED_ROLES else _MANAGED_ROLES
    users = user_repository.list_by_roles(db, roles)
    points_service.refresh_all(db)  # points expire with time

    licenses = {lic.driver_id: lic for lic in license_repository.list_all(db)}
    applications_by_driver: dict[uuid.UUID, list[Application]] = defaultdict(list)
    for application in application_repository.list_all(db):
        applications_by_driver[application.driver_id].append(application)
    against = violation_repository.count_per_driver(db)
    recorded = violation_repository.count_per_officer(db)

    items = []
    for user in users:
        license_ = licenses.get(user.id)
        items.append(
            {
                "id": user.id,
                "email": user.email,
                "nic": user.nic,
                "role": user.role,
                "created_at": user.created_at,
                "license_status": license_.status if license_ else None,
                "points": license_.points if license_ else None,
                "latest_application_status": _latest_application_status(
                    applications_by_driver.get(user.id, [])
                ),
                "violation_count": (
                    recorded.get(user.id, 0)
                    if user.role == UserRole.POLICE
                    else against.get(user.id, 0)
                ),
            }
        )
    return items


def _delete_blockers(db: Session, user: User) -> list[str]:
    if user.role == UserRole.ADMIN:
        return ["Administrator accounts cannot be deleted here"]
    blockers: list[str] = []
    if user.role == UserRole.DRIVER:
        count = violation_repository.count_for_driver(db, user.id)
        if count:
            blockers.append(f"{count} violation record(s) on file, which must be kept")
        if appeal_repository.count_for_driver(db, user.id):
            blockers.append("Fine appeal records on file, which must be kept")
    else:
        count = violation_repository.count_for_officer(db, user.id)
        if count:
            blockers.append(
                f"Recorded {count} violation(s), and those records must be kept"
            )
    return blockers


def _get_managed_user(db: Session, user_id: uuid.UUID) -> User:
    user = user_repository.get_by_id(db, user_id)
    if user is None or user.role not in _MANAGED_ROLES:
        raise NotFoundError("User not found")
    return user


def get_user_detail(db: Session, user_id: uuid.UUID) -> dict:
    user = _get_managed_user(db, user_id)
    blockers = _delete_blockers(db, user)

    license_ = badge = risk = None
    applications: list[dict] = []
    violations: list[dict] = []
    if user.role == UserRole.DRIVER:
        license_ = license_repository.get_latest_for_driver(db, user.id)
        if license_ is not None:
            points_service.refresh(db, license_)
        badge = badge_repository.get_by_driver_id(db, user.id)
        if license_ is not None:
            risk = behaviour_service.get_behaviour_for_driver(db, user.id)["risk_level"]
        applications = [
            {
                "id": a.id,
                "status": a.status,
                "created_at": a.created_at,
                "document_count": len(a.documents),
            }
            for a in application_repository.list_by_driver(db, user.id)
        ]
        violations = [
            {
                "type": v.type,
                "description": v.description,
                "points_deducted": v.points_deducted,
                "confirmed_at": v.confirmed_at,
                "fine_status": status,
            }
            for v, status in violation_repository.list_with_fine_status_for_driver(
                db, user.id
            )
        ]
        violation_count = len(violations)
    else:
        violation_count = violation_repository.count_for_officer(db, user.id)
        violations = [
            {
                "type": v.type,
                "description": v.description,
                "points_deducted": v.points_deducted,
                "confirmed_at": v.confirmed_at,
                "driver_email": v.driver.email,
            }
            for v, _amount in violation_repository.list_recent_for_officer(
                db, user.id, limit=_OFFICER_RECENT_LIMIT
            )
        ]

    return {
        "id": user.id,
        "email": user.email,
        "nic": user.nic,
        "role": user.role,
        "created_at": user.created_at,
        "license": license_,
        "badge": badge,
        "behaviour_risk": risk,
        "applications": applications,
        "violations": violations,
        "violation_count": violation_count,
        "can_delete": not blockers,
        "delete_blockers": blockers,
    }


def _remove_files(paths: list[str]) -> None:
    base = Path(settings.upload_dir)
    folders = set()
    for relative in paths:
        target = base / relative
        target.unlink(missing_ok=True)
        folders.add(target.parent)
    for folder in folders:
        try:
            folder.rmdir()
        except OSError:
            pass  # not empty, or already gone


def delete_user(db: Session, *, user_id: uuid.UUID, acting_admin_id: uuid.UUID) -> None:
    """Permanently deletes a driver or officer and the data that belongs only
    to them. Refuses accounts that enforcement records point at (violations,
    fines, appeals are immutable history), administrators, and yourself.

    The database changes commit as one transaction first. The biometric
    template and uploaded files are removed after that commit: if that step
    fails, the leftover template can no longer be matched to any account (search
    skips templates with no driver), and the failure is logged."""
    if user_id == acting_admin_id:
        raise ProtectedAccountError("You cannot delete your own account")
    user = user_repository.get_by_id(db, user_id)
    if user is None:
        raise NotFoundError("User not found")
    if user.role == UserRole.ADMIN:
        raise ProtectedAccountError("Administrator accounts cannot be deleted here")
    blockers = _delete_blockers(db, user)
    if blockers:
        raise HasRecordsError("; ".join(blockers))

    file_paths: list[str] = []
    notification_repository.delete_for_user(db, user.id)
    road_incident_repository.delete_by_reporter(db, user.id)
    danger_zone_repository.delete_by_creator(db, user.id)
    if user.role == UserRole.DRIVER:
        badge_repository.delete_for_driver(db, user.id)
        license_repository.delete_for_driver(db, user.id)
        db.flush()
        file_paths = application_repository.delete_for_driver(db, user.id)
    db.flush()
    user_repository.delete(db, user)
    db.commit()

    if user.role == UserRole.DRIVER:
        try:
            face_service.delete_template(str(user_id))
        except sqlite3.Error:
            logger.exception("Could not delete the face template for a deleted driver")
    _remove_files(file_paths)
