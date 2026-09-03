import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import (
    User,
)  # noqa: F401 -- referenced by driver/officer relationships


class ViolationType(str, enum.Enum):
    WHITE_LINE = "WHITE_LINE"
    SPEEDING = "SPEEDING"
    RED_LIGHT = "RED_LIGHT"
    DRUNK_DRIVING = "DRUNK_DRIVING"


# REQ-8 AC1's example schedule. Placeholder point/fine values, not sourced
# from an official Sri Lankan traffic-fine schedule -- flagged here the same
# way requirements.md flags unverified accuracy figures. Revisit before
# citing in the final report (see VIOLATION_FINE_AMOUNT in models/fine.py).
VIOLATION_POINTS: dict[ViolationType, int] = {
    ViolationType.WHITE_LINE: 3,
    ViolationType.SPEEDING: 4,
    ViolationType.RED_LIGHT: 6,
    ViolationType.DRUNK_DRIVING: 10,
}


class Violation(Base):
    __tablename__ = "violations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    driver_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    officer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    type: Mapped[ViolationType] = mapped_column(Enum(ViolationType))
    points_deducted: Mapped[int] = mapped_column(Integer)
    # Reference to supporting evidence (e.g. an uploaded frame's file path)
    # once 5.4/5.5's AI-assisted flow exists -- optional because an officer
    # can also record a violation manually without an evidence image.
    evidence_ref: Mapped[str | None] = mapped_column(Text, default=None)
    confirmed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    driver: Mapped["User"] = relationship(foreign_keys=[driver_id])
    officer: Mapped["User"] = relationship(foreign_keys=[officer_id])
