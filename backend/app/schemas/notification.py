import uuid

from pydantic import BaseModel, Field

from app.models.notification import NotificationType
from app.schemas.common import UtcDateTime


class NotificationRead(BaseModel):
    id: uuid.UUID
    type: NotificationType
    message: str
    read_at: UtcDateTime | None
    created_at: UtcDateTime

    model_config = {"from_attributes": True}


class RegisterPushTokenRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)
