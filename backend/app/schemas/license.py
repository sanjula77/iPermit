import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.license import LicenseStatus


class LicenseRead(BaseModel):
    id: uuid.UUID
    license_no: str
    qr_token: str
    status: LicenseStatus
    points: int
    issued_at: datetime
    expiry_at: datetime

    model_config = {"from_attributes": True}
