import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User  # noqa: F401 -- referenced by the driver relationship


class LicenseStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"


class VehicleCategory(str, enum.Enum):
    """The Sri Lankan driving-licence vehicle categories (DMT), in the order they
    are printed on the card."""

    A1 = "A1"  # light motorcycle
    A = "A"  # motorcycle
    B1 = "B1"  # three-wheeler / quadricycle
    B = "B"  # car, van, jeep
    C1 = "C1"  # light lorry
    C = "C"  # lorry
    CE = "CE"  # heavy lorry with trailer
    D1 = "D1"  # light bus
    D = "D"  # bus
    DE = "DE"  # heavy bus with trailer
    G1 = "G1"  # hand tractor
    G = "G"  # land vehicle / tractor
    J = "J"  # special-purpose vehicle


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
    # REQ-8 AC2: cumulative demerit points; license suspends at the
    # configured threshold (see app.services.violation_service).
    points: Mapped[int] = mapped_column(Integer, default=0)
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expiry_at: Mapped[datetime] = mapped_column(DateTime)

    driver: Mapped["User"] = relationship()
    categories: Mapped[list["LicenseCategory"]] = relationship(
        back_populates="license", cascade="all, delete-orphan"
    )


class LicenseCategory(Base):
    """One vehicle category a licence allows, with its own validity window."""

    __tablename__ = "license_categories"
    __table_args__ = (UniqueConstraint("license_id", "category"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    license_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("licenses.id", ondelete="CASCADE"), index=True
    )
    category: Mapped[VehicleCategory] = mapped_column(Enum(VehicleCategory))
    issued_at: Mapped[datetime] = mapped_column(DateTime)
    expiry_at: Mapped[datetime] = mapped_column(DateTime)

    license: Mapped["License"] = relationship(back_populates="categories")
