import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.danger_zone import DangerZoneSeverity, DangerZoneStatus


class DangerZoneRead(BaseModel):
    id: uuid.UUID
    lat: float
    lng: float
    radius_m: float
    severity: DangerZoneSeverity
    reason: str | None
    status: DangerZoneStatus
    confirmation_count: int
    created_at: datetime
    cleared_at: datetime | None

    model_config = {"from_attributes": True}


class MarkDangerZoneRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_m: float = Field(ge=50, le=1000)
    severity: DangerZoneSeverity
    reason: str | None = Field(default=None, max_length=500)
