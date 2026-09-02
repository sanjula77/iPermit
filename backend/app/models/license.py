import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User  # noqa: F401 -- referenced by the driver relationship


class LicenseStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"


class License(Base):
    __tablename__ = "licenses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    driver_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("applications.id", ondelete="RESTRICT"), unique=True
    )
    license_no: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    qr_token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    status: Mapped[LicenseStatus] = mapped_column(
        Enum(LicenseStatus), default=LicenseStatus.ACTIVE
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expiry_at: Mapped[datetime] = mapped_column(DateTime)

    driver: Mapped["User"] = relationship()
