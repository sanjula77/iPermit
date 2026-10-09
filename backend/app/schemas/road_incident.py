import uuid

from pydantic import BaseModel, ConfigDict, Field, computed_field

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
    # The path itself stays server-side; clients only learn whether a photo exists.
    photo_path: str | None = Field(default=None, exclude=True)

    model_config = ConfigDict(from_attributes=True)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def has_photo(self) -> bool:
        return self.photo_path is not None


class ReportIncidentRequest(BaseModel):
    type: RoadIncidentType
    severity: RoadIncidentSeverity
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
