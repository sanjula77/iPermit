import uuid

from pydantic import BaseModel, Field

from app.models.road_incident import (
    RoadIncidentSeverity,
    RoadIncidentStatus,
    RoadIncidentType,
)
from app.schemas.common import UtcDateTime


class RoadIncidentRead(BaseModel):
    id: uuid.UUID
    type: RoadIncidentType
    severity: RoadIncidentSeverity
    lat: float
    lng: float
    status: RoadIncidentStatus
    confirmation_count: int
    created_at: UtcDateTime
    expires_at: UtcDateTime

    model_config = {"from_attributes": True}


class ReportIncidentRequest(BaseModel):
    type: RoadIncidentType
    severity: RoadIncidentSeverity
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
