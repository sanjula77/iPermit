import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User  # noqa: F401 -- referenced by relationship


class DangerZoneSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class DangerZoneStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLEARED = "CLEARED"


class DangerZone(Base):
    """Persistent, community-marked circular area. Unlike RoadIncident
    (point-in-time only, see road_incident.py), a zone represents a
    lasting road-condition assessment and stays ACTIVE until someone
    clears it -- no auto-expiry."""

    __tablename__ = "danger_zones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    creator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    radius_m: Mapped[float] = mapped_column(Float)
    severity: Mapped[DangerZoneSeverity] = mapped_column(Enum(DangerZoneSeverity))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DangerZoneStatus] = mapped_column(
        Enum(DangerZoneStatus), default=DangerZoneStatus.ACTIVE
    )
    confirmation_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    cleared_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cleared_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    creator: Mapped["User"] = relationship(foreign_keys=[creator_id])
