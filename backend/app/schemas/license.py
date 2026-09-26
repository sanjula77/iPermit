import uuid

from pydantic import BaseModel

from app.models.license import LicenseStatus
from app.schemas.common import UtcDateTime


class LicenseRead(BaseModel):
    id: uuid.UUID
    license_no: str
    qr_token: str
    status: LicenseStatus
    points: int
    issued_at: UtcDateTime
    expiry_at: UtcDateTime

    model_config = {"from_attributes": True}
