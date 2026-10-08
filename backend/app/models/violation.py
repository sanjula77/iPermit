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
    OTHER = "OTHER"  # an offence not on the list; the officer describes it


# REQ-8 AC1's example schedule. Placeholder point/fine values, not sourced
# from an official Sri Lankan traffic-fine schedule -- flagged here the same
# way requirements.md flags unverified accuracy figures. Revisit before
# citing in the final report (see VIOLATION_FINE_AMOUNT in models/fine.py).
# OTHER is not listed: its points are set by the officer within the range below.
VIOLATION_POINTS: dict[ViolationType, int] = {
    ViolationType.WHITE_LINE: 1,
    ViolationType.SPEEDING: 3,
    ViolationType.RED_LIGHT: 4,
    ViolationType.DRUNK_DRIVING: 6,
}

# An "other" violation: the officer writes what happened and picks the points. The
# cap stays below the suspension limit so one free-text entry can never suspend a
# licence by itself.
OTHER_MIN_POINTS = 1
OTHER_MAX_POINTS = 5
OTHER_DESCRIPTION_MIN_LENGTH = 5
OTHER_DESCRIPTION_MAX_LENGTH = 100


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
    # What the officer wrote, for an OTHER violation; None for the listed types.
    description: Mapped[str | None] = mapped_column(Text, default=None)
    confirmed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    driver: Mapped["User"] = relationship(foreign_keys=[driver_id])
    officer: Mapped["User"] = relationship(foreign_keys=[officer_id])
