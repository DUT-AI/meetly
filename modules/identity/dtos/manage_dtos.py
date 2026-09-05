from pydantic import BaseModel, ConfigDict, Field


class ManageUserDTO(BaseModel):
    """Data transfer object representing a user returned by Manage Service."""

    model_config = ConfigDict(extra="ignore", from_attributes=True)

    id: int | str
    name: str
    email: str
    status: str = "ACTIVE"
    avatar_url: str | None = None
    role_names: list[str] = Field(default_factory=list)


class ManageUsersResponseDTO(BaseModel):
    """Paginated list response from Manage Service users endpoint."""

    model_config = ConfigDict(extra="ignore")

    items: list[ManageUserDTO] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20
