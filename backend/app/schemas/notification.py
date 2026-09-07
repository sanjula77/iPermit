import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.notification import NotificationType


class NotificationRead(BaseModel):
    id: uuid.UUID
    type: NotificationType
    message: str
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterPushTokenRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)
