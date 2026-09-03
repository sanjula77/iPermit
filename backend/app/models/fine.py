import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.violation import (
    Violation,
    ViolationType,
)  # noqa: F401 -- referenced by relationship


class FineStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PAID = "PAID"
    REVERSED = "REVERSED"


# Placeholder LKR amounts, not sourced from an official traffic-fine
# schedule -- see the same caveat on VIOLATION_POINTS in models/violation.py.
VIOLATION_FINE_AMOUNT: dict[ViolationType, int] = {
    ViolationType.WHITE_LINE: 2000,
    ViolationType.SPEEDING: 5000,
    ViolationType.RED_LIGHT: 10000,
    ViolationType.DRUNK_DRIVING: 25000,
}


class Fine(Base):
    __tablename__ = "fines"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    violation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("violations.id", ondelete="RESTRICT"), unique=True
    )
    amount: Mapped[int] = mapped_column(Integer)
    status: Mapped[FineStatus] = mapped_column(
        Enum(FineStatus), default=FineStatus.UNPAID
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)

    violation: Mapped["Violation"] = relationship()
