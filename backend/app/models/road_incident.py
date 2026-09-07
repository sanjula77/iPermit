import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User  # noqa: F401 -- referenced by relationship


class RoadIncidentType(str, enum.Enum):
    ACCIDENT = "ACCIDENT"
    TRAFFIC = "TRAFFIC"
    ROAD_BLOCK = "ROAD_BLOCK"
    FLOOD = "FLOOD"
    CONSTRUCTION = "CONSTRUCTION"
    BREAKDOWN = "BREAKDOWN"
    HAZARD = "HAZARD"
    OTHER = "OTHER"


class RoadIncidentSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class RoadIncidentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLEARED = "CLEARED"
    EXPIRED = "EXPIRED"


class RoadIncident(Base):
    """REQ-13. Location is a point-in-time snapshot captured at report
    time -- never updated or tracked afterward, per the Privacy/Ethics NFR
    ("incident location is point-in-time only, not continuous tracking of
    a driver")."""

    __tablename__ = "road_incidents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    type: Mapped[RoadIncidentType] = mapped_column(Enum(RoadIncidentType))
    severity: Mapped[RoadIncidentSeverity] = mapped_column(Enum(RoadIncidentSeverity))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    status: Mapped[RoadIncidentStatus] = mapped_column(
        Enum(RoadIncidentStatus), default=RoadIncidentStatus.ACTIVE
    )
    # REQ-13 AC3: informational tally only -- confirming never changes status.
    confirmation_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)

    reporter: Mapped["User"] = relationship()
