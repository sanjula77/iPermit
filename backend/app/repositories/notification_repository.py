import uuid

from sqlalchemy import func, select
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


def count_for_user_by_type(
    db: Session, user_id: uuid.UUID, notification_type: NotificationType
) -> int:
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user_id, Notification.type == notification_type
    )
    return db.scalar(stmt) or 0


def count_per_user_by_type(
    db: Session, notification_type: NotificationType
) -> dict[uuid.UUID, int]:
    """How many notifications of one type each user has received."""
    stmt = (
        select(Notification.user_id, func.count(Notification.id))
        .where(Notification.type == notification_type)
        .group_by(Notification.user_id)
    )
    return {user_id: count for user_id, count in db.execute(stmt)}
