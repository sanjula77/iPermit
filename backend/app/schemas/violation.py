import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.violation import ViolationType


class ViolationRead(BaseModel):
    id: uuid.UUID
    type: ViolationType
    points_deducted: int
    evidence_ref: str | None
    confirmed_at: datetime

    model_config = {"from_attributes": True}
