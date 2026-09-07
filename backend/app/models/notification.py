import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User  # noqa: F401 -- referenced by relationship


class NotificationType(str, enum.Enum):
    LICENSE_APPROVED = "LICENSE_APPROVED"
    LICENSE_REJECTED = "LICENSE_REJECTED"
    FINE_ISSUED = "FINE_ISSUED"
    LICENSE_SUSPENDED = "LICENSE_SUSPENDED"
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED"
    APPEAL_UPHELD = "APPEAL_UPHELD"
    APPEAL_OVERTURNED = "APPEAL_OVERTURNED"
    BADGE_CHANGED = "BADGE_CHANGED"
    NEARBY_INCIDENT = "NEARBY_INCIDENT"


class Notification(Base):
    """REQ-12: in-app notification history (AC2). `message` is a
    pre-rendered string rather than design.md's generic `payload` JSON
    blob -- simpler and sufficient here, same pragmatic-deviation pattern
    as License.points."""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType))
    message: Mapped[str] = mapped_column(Text)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship()
