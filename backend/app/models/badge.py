import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User  # noqa: F401 -- referenced by relationship


class BadgeTier(str, enum.Enum):
    PLATINUM = "PLATINUM"
    GOLD = "GOLD"
    SILVER = "SILVER"
    BRONZE = "BRONZE"
    AT_RISK = "AT_RISK"
    SUSPENDED = "SUSPENDED"


class Badge(Base):
    """REQ-11: one row per driver, recomputed whenever their violation/fine/
    point state changes (see app.services.badge_service). driver_id is the
    primary key -- this is inherently a 1:1 extension of a driver, not an
    independent entity, so no separate surrogate id is needed."""

    __tablename__ = "badges"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True
    )
    tier: Mapped[BadgeTier] = mapped_column(Enum(BadgeTier))
    safety_score: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    driver: Mapped["User"] = relationship()
