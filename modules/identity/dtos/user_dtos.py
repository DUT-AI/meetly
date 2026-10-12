from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class UserOptionDTO(BaseModel):
    """Lightweight user projection for selector inputs and dropdowns."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: int | str
    name: str
    email: str
    avatar_url: str | None = None


class UserProfileDetailDTO(BaseModel):
    """Full user profile details returned by Manage Service."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: int
    name: str
    email: str
    phone_number: str | None = None
    status: str = "ACTIVE"
    role_ids: list[int | str] = Field(default_factory=list)
    discord_id: str | None = None
    avatar_url: str | None = None
    zalo_bot_id: str | None = None
    role_names: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    check_in_card_code_configured: bool = False

    @property
    def user_id(self) -> int:
        return self.id


class UserProfileEnvelopeDTO(BaseModel):
    """Standardized response envelope for user profile detail."""

    model_config = ConfigDict(from_attributes=True)

    is_success: bool = True
    status_code: int = 200
    data: UserProfileDetailDTO | None = None
    message: str = "Fetched user profile"
    pagination: Any | None = None
