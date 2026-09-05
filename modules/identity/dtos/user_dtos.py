from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserReadDTO(BaseModel):
    """Meetly User representation combining Manage User info with local Last Login timestamp."""

    model_config = ConfigDict(from_attributes=True)

    id: int | str
    name: str
    email: str
    status: str = "ACTIVE"
    avatar_url: str | None = None
    role_names: list[str] = Field(default_factory=list)
    last_login_at: datetime | None = None


class UsersListResponseDTO(BaseModel):
    """Paginated response containing Meetly users and total count."""

    model_config = ConfigDict(from_attributes=True)

    items: list[UserReadDTO] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20
