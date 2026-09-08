import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType


def add(
    db: Session,
    *,
    user_id: uuid.UUID,
    notification_type: NotificationType,
    message: str,
) -> Notification:
    """Adds a Notification to the session without committing -- see
    notification_service.notify for the transaction boundary."""
    notification = Notification(
        user_id=user_id, type=notification_type, message=message
    )
    db.add(notification)
    return notification


def get_by_id(db: Session, notification_id: uuid.UUID) -> Notification | None:
    return db.get(Notification, notification_id)


def list_for_user(db: Session, user_id: uuid.UUID) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
    )
    return list(db.scalars(stmt))
