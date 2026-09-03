import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.fine import Fine  # noqa: F401 -- referenced by relationship
from app.models.user import (
    User,
)  # noqa: F401 -- referenced by driver/resolver relationships


class AppealStatus(str, enum.Enum):
    PENDING = "PENDING"
    UPHELD = "UPHELD"
    OVERTURNED = "OVERTURNED"


class Appeal(Base):
    __tablename__ = "appeals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # One appeal per fine -- submit_appeal only allows appealing an UNPAID
    # fine, and a fine's status is terminal after PAID/REVERSED, so there is
    # never a reason for a second appeal against the same fine.
    fine_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fines.id", ondelete="RESTRICT"), unique=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[AppealStatus] = mapped_column(
        Enum(AppealStatus), default=AppealStatus.PENDING
    )
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), default=None
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)

    fine: Mapped["Fine"] = relationship()
    driver: Mapped["User"] = relationship(foreign_keys=[driver_id])
    resolver: Mapped["User | None"] = relationship(foreign_keys=[resolved_by])
