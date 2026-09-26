import uuid

from pydantic import BaseModel

from app.models.violation import ViolationType
from app.schemas.common import UtcDateTime


class ViolationRead(BaseModel):
    id: uuid.UUID
    type: ViolationType
    points_deducted: int
    evidence_ref: str | None
    confirmed_at: UtcDateTime

    model_config = {"from_attributes": True}
