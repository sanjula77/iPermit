import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.core import push_service
from app.models.notification import Notification, NotificationType
from app.repositories import notification_repository, user_repository


class NotFoundError(Exception):
    pass


class ForbiddenError(Exception):
    pass


def notify(
    db: Session,
    *,
    user_id: uuid.UUID,
    notification_type: NotificationType,
    message: str,
) -> Notification:
    """REQ-12 AC1: creates the in-app notification (source of truth for
    AC2's history) and best-effort fans out an Expo push if the driver has
    registered a device token. Commits on its own -- same "known gap if
    this fails" follow-up pattern as badge recompute; the flow that
    triggered this notification has already succeeded and is not rolled
    back if notifying fails."""
    notification = notification_repository.add(
        db, user_id=user_id, notification_type=notification_type, message=message
    )
    db.commit()
    db.refresh(notification)

    user = user_repository.get_by_id(db, user_id)
    if user is not None and user.push_token:
        push_service.send_push_notification(
            user.push_token, title="iPermit", body=message
        )

    return notification


def list_for_user(db: Session, user_id: uuid.UUID) -> list[Notification]:
    return notification_repository.list_for_user(db, user_id)


def mark_read(
    db: Session, *, user_id: uuid.UUID, notification_id: uuid.UUID
) -> Notification:
    notification = notification_repository.get_by_id(db, notification_id)
    if notification is None:
        raise NotFoundError("No such notification")
    if notification.user_id != user_id:
        raise ForbiddenError("Not your notification")
    if notification.read_at is None:
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)
    return notification


def register_push_token(db: Session, *, user_id: uuid.UUID, token: str) -> None:
    user = user_repository.get_by_id(db, user_id)
    if user is None:
        raise NotFoundError("No such user")
    user.push_token = token
    db.commit()
