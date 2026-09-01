import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    nic: str = Field(min_length=5, max_length=20)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    identifier: str  # email or NIC
    password: str


class UserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    nic: str
    role: UserRole

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
