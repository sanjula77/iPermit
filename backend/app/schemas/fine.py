import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.fine import FineStatus, PaymentMethod
from app.models.license import LicenseStatus
from app.schemas.violation import ViolationRead


class FineRead(BaseModel):
    id: uuid.UUID
    amount: int
    status: FineStatus
    created_at: datetime
    paid_at: datetime | None
    payment_method: PaymentMethod | None

    model_config = {"from_attributes": True}


class FineWithViolationRead(FineRead):
    """REQ-9 AC2: a driver's own fine history needs to show what the fine
    was for, not just the amount/status."""

    violation: ViolationRead


class PayFineRequest(BaseModel):
    payment_method: PaymentMethod


class PayFineResponse(BaseModel):
    fine: FineRead
    driver_points: int
    license_status: LicenseStatus
