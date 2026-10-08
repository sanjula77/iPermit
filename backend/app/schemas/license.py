import uuid

from pydantic import BaseModel, Field, field_validator

from app.models.license import LicenseStatus, VehicleCategory
from app.schemas.common import UtcDateTime

_ORDER = {category: index for index, category in enumerate(VehicleCategory)}


class LicenseCategoryRead(BaseModel):
    category: VehicleCategory
    issued_at: UtcDateTime
    expiry_at: UtcDateTime

    model_config = {"from_attributes": True}


def sort_categories(items: list) -> list:
    """Categories in the order they are printed on the card (A1 ... J)."""
    return sorted(items, key=lambda item: _ORDER[item.category])


class LicenseRead(BaseModel):
    id: uuid.UUID
    license_no: str
    qr_token: str
    status: LicenseStatus
    points: int
    issued_at: UtcDateTime
    expiry_at: UtcDateTime
    categories: list[LicenseCategoryRead] = []
    # When the earliest points still counting drop off; None if none count.
    points_expire_at: UtcDateTime | None = None

    model_config = {"from_attributes": True}

    @field_validator("categories", mode="before")
    @classmethod
    def _in_card_order(cls, value):
        return sort_categories(list(value))


class UpdateLicenseCategoriesRequest(BaseModel):
    """The full set of categories the licence should hold afterwards."""

    categories: list[VehicleCategory] = Field(min_length=1)
