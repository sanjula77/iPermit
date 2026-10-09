import logging
import sqlite3
import uuid
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.appeal import Appeal
from app.models.application import Application, ApplicationDocument
from app.models.badge import Badge
from app.models.danger_zone import DangerZone
from app.models.fine import Fine
from app.models.license import License, LicenseCategory
from app.models.notification import Notification
from app.models.road_incident import RoadIncident
from app.models.user import User, UserRole
from app.models.violation import Violation
from app.services import face_service

logger = logging.getLogger(__name__)

CONFIRMATION_WORD = "CLEAR"


class ResetDisabledError(Exception):
    pass


class ConfirmationError(Exception):
    pass


def is_enabled() -> bool:
    return settings.allow_demo_reset


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


def clear_demo_data(db: Session, *, acting_admin_id: uuid.UUID, confirm: str) -> dict:
    """Wipes every driver and all enforcement and activity data, for a clean
    demonstration. Administrator and police accounts are kept (so the panel and
    the officers' logins still work); everything else goes: driver accounts,
    applications and their uploaded documents, licences and categories, badges,
    violations, fines, appeals, notifications, road incidents, danger zones, and
    the face templates.

    Refuses unless the server enables it and the exact confirmation word is given.
    The database changes commit as one transaction, in an order that respects the
    RESTRICT foreign keys; the face templates and uploaded files are removed after
    that commit (a failure there is logged and leaves only unreferenced leftovers)."""
    if not is_enabled():
        raise ResetDisabledError(
            "Clearing data is disabled on this server. Set ALLOW_DEMO_RESET=true "
            "in the backend settings to enable it."
        )
    if confirm != CONFIRMATION_WORD:
        raise ConfirmationError(f'Type "{CONFIRMATION_WORD}" to confirm.')

    document_paths = list(db.scalars(select(ApplicationDocument.file_path)))
    document_paths += [
        path for path in db.scalars(select(RoadIncident.photo_path)) if path is not None
    ]
    counts: dict[str, int] = {}
    # Children before parents: enforcement records reference users RESTRICT.
    for label, model in (
        ("appeals", Appeal),
        ("fines", Fine),
        ("violations", Violation),
        ("notifications", Notification),
        ("road_incidents", RoadIncident),
        ("danger_zones", DangerZone),
        ("badges", Badge),
        ("license_categories", LicenseCategory),
        ("licenses", License),
        ("application_documents", ApplicationDocument),
        ("applications", Application),
    ):
        counts[label] = db.execute(delete(model)).rowcount
    counts["drivers"] = db.execute(
        delete(User).where(User.role == UserRole.DRIVER)
    ).rowcount
    db.commit()

    try:
        counts["face_templates"] = face_service.delete_all_templates(
            actor_id=str(acting_admin_id)
        )
    except sqlite3.Error:
        counts["face_templates"] = 0
        logger.exception("Demo reset: could not clear the face template store")
    _remove_files(document_paths)

    kept = {
        role.value: db.scalar(select(func.count(User.id)).where(User.role == role))
        for role in (UserRole.ADMIN, UserRole.POLICE)
    }
    logger.warning("Demo reset by admin %s: removed %s", acting_admin_id, counts)
    return {"removed": counts, "kept": kept}
